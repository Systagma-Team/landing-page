/**
 * Resilient JSON client for public procurement APIs.
 * - conservative client-side rate limit (min interval between requests)
 * - retries with exponential backoff for 5xx, network errors and timeouts
 * - honours 429 Retry-After
 * - treats HTML on a 200 as a WAF/interstitial page (retry, never parse)
 * - 204/404 on collection endpoints mean "empty"
 * Never attempts to bypass CAPTCHA, authentication or anti-bot protection.
 */

export class SourceHttpError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly url: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "SourceHttpError";
  }
}

export interface HttpClientOptions {
  baseUrl: string;
  userAgent: string;
  minIntervalMs?: number;
  maxRetries?: number;
  timeoutMs?: number;
  /** Minimum wait after a 429 without Retry-After. */
  rateLimitWaitMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  log?: (msg: string) => void;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface HttpClient {
  getJson<T = unknown>(path: string, params?: Record<string, string | number | undefined | null>, opts?: { emptyOn404?: boolean }): Promise<T | null>;
  readonly requestCount: number;
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const minInterval = options.minIntervalMs ?? 1000;
  const maxRetries = options.maxRetries ?? 4;
  const timeoutMs = options.timeoutMs ?? 60_000;
  const rateLimitWait = options.rateLimitWaitMs ?? 45_000;
  let lastRequestAt = 0;
  let requestCount = 0;

  async function throttle() {
    const wait = lastRequestAt + minInterval - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
  }

  function buildUrl(path: string, params?: Record<string, string | number | undefined | null>) {
    const url = new URL(path, options.baseUrl);
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
    return url.toString();
  }

  async function getJson<T>(path: string, params?: Record<string, string | number | undefined | null>, opts: { emptyOn404?: boolean } = {}): Promise<T | null> {
    const url = buildUrl(path, params);
    let lastError: SourceHttpError | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const backoff = Math.min(60_000, 1500 * 2 ** (attempt - 1));
        await sleep(lastError?.status === 429 ? Math.max(backoff, rateLimitWait) : backoff);
      }
      await throttle();
      requestCount++;
      let res: Response;
      try {
        res = await fetchImpl(url, {
          headers: { Accept: "application/json", "User-Agent": options.userAgent },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        lastError = new SourceHttpError(`Falha de rede: ${(err as Error).message}`, null, url, true);
        options.log?.(`[http] ${lastError.message} (tentativa ${attempt + 1})`);
        continue;
      }

      if (res.status === 204) return null;
      if (res.status === 404 && opts.emptyOn404 !== false) return null;
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after"));
        if (Number.isFinite(retryAfter) && retryAfter > 0) await sleep(Math.min(retryAfter * 1000, 300_000));
        lastError = new SourceHttpError("Limite de requisições (429)", 429, url, true);
        options.log?.(`[http] 429 em ${url}`);
        continue;
      }
      if (res.status >= 500) {
        lastError = new SourceHttpError(`Erro do servidor (${res.status})`, res.status, url, true);
        options.log?.(`[http] ${res.status} em ${url} (tentativa ${attempt + 1})`);
        continue;
      }
      if (res.status >= 400) {
        const body = (await res.text().catch(() => "")).slice(0, 300);
        throw new SourceHttpError(`Requisição rejeitada (${res.status}): ${body}`, res.status, url, false);
      }
      const contentType = res.headers.get("content-type") ?? "";
      const text = await res.text();
      if (!contentType.includes("json") && /^\s*</.test(text)) {
        lastError = new SourceHttpError("Resposta HTML inesperada (possível WAF/página intermediária)", res.status, url, true);
        options.log?.(`[http] HTML em ${url}`);
        continue;
      }
      if (!text.trim()) return null;
      try {
        return JSON.parse(text) as T;
      } catch {
        lastError = new SourceHttpError("JSON inválido", res.status, url, true);
        continue;
      }
    }
    throw lastError ?? new SourceHttpError("Falha desconhecida", null, url, true);
  }

  return {
    getJson,
    get requestCount() {
      return requestCount;
    },
  };
}
