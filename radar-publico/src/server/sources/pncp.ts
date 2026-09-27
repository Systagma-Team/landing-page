import { z } from "zod";
import { addDays, localDateString, parseSourceDate, toSourceDateParam } from "@/lib/dates";
import { normalizeText, onlyDigits } from "@/lib/text";
import { classifyInnovation, detectExclusiveMeEpp, kindFromModality, PNCP_MODALITIES, statusFromSituation } from "@/server/matching/classify";
import { sourceDefinition } from "./definitions";
import { createHttpClient, type HttpClient } from "./http";
import type {
  CollectContext,
  CollectWindow,
  NormalizedOpportunity,
  OpportunityRef,
  ProcurementSourceAdapter,
  SourceDocument,
  SourceRecord,
} from "./types";

/*
 * PNCP adapter — https://pncp.gov.br/api/consulta/swagger-ui/index.html
 * Field names follow the "Manual das APIs de Consultas PNCP" and are validated tolerantly:
 * unknown/missing fields never break ingestion, and the raw payload is always preserved.
 */

const str = z
  .preprocess((v) => (v === null || v === undefined || v === "" ? null : typeof v === "number" ? String(v) : v), z.string().nullable())
  .catch(null);
const num = z
  .preprocess((v) => (v === null || v === undefined || v === "" ? null : Number(v)), z.number().nullable())
  .catch(null)
  .transform((v) => (v == null || Number.isNaN(v) ? null : v));
const bool = z.boolean().nullable().optional().catch(null);

export const pncpContratacaoSchema = z.looseObject({
  numeroControlePNCP: str.optional(),
  numeroCompra: str.optional(),
  anoCompra: num.optional(),
  sequencialCompra: num.optional(),
  processo: str.optional(),
  modalidadeId: num.optional(),
  modalidadeNome: str.optional(),
  modoDisputaNome: str.optional(),
  situacaoCompraId: num.optional(),
  situacaoCompraNome: str.optional(),
  tipoInstrumentoConvocatorioNome: str.optional(),
  objetoCompra: str.optional(),
  informacaoComplementar: str.optional(),
  srp: bool,
  amparoLegal: z
    .looseObject({ codigo: z.union([z.number(), z.string()]).nullish(), nome: str.optional(), descricao: str.optional() })
    .nullish()
    .catch(null),
  valorTotalEstimado: num.optional(),
  valorTotalHomologado: num.optional(),
  dataAberturaProposta: str.optional(),
  dataEncerramentoProposta: str.optional(),
  dataPublicacaoPncp: str.optional(),
  dataInclusao: str.optional(),
  dataAtualizacao: str.optional(),
  dataAtualizacaoGlobal: str.optional(),
  orgaoEntidade: z
    .looseObject({ cnpj: str.optional(), razaoSocial: str.optional(), razaosocial: str.optional(), poderId: str.optional(), esferaId: str.optional() })
    .nullish()
    .catch(null),
  unidadeOrgao: z
    .looseObject({
      codigoUnidade: str.optional(),
      nomeUnidade: str.optional(),
      codigoIbge: str.optional(),
      municipioNome: str.optional(),
      ufSigla: str.optional(),
    })
    .nullish()
    .catch(null),
  linkSistemaOrigem: str.optional(),
});

const pageSchema = z.looseObject({
  data: z.array(z.unknown()).nullish().catch([]),
  totalRegistros: num.optional(),
  totalPaginas: num.optional(),
  numeroPagina: num.optional(),
  paginasRestantes: num.optional(),
});

const arquivoSchema = z.looseObject({
  sequencialDocumento: num.optional(),
  url: str.optional(),
  uri: str.optional(),
  titulo: str.optional(),
  tipoDocumentoId: num.optional(),
  tipoDocumentoNome: str.optional(),
  dataPublicacaoPncp: str.optional(),
  statusAtivo: bool,
});

const pcaItemSchema = z.looseObject({
  numeroItem: num.optional(),
  categoriaItemPcaNome: str.optional(),
  descricaoItem: str.optional(),
  valorTotal: num.optional(),
  dataDesejada: str.optional(),
  classificacaoSuperiorNome: str.optional(),
  grupoContratacaoNome: str.optional(),
  // Some responses carry the unit at item level.
  codigoUnidade: str.optional(),
  nomeUnidade: str.optional(),
});
// Field names differ between the manual (orgaoEntidadeCnpj, lista) and current clients (orgaoCnpj, itens).
const pcaPlanSchema = z.looseObject({
  orgaoEntidadeCnpj: str.optional(),
  orgaoCnpj: str.optional(),
  orgaoEntidadeRazaoSocial: str.optional(),
  orgaoRazaoSocial: str.optional(),
  codigoUnidade: str.optional(),
  nomeUnidade: str.optional(),
  anoPca: num.optional(),
  sequencialPca: num.optional(),
  idPcaPncp: str.optional(),
  dataPublicacaoPncp: str.optional(),
  dataAtualizacao: str.optional(),
  itens: z.array(z.unknown()).nullish().catch(null),
  lista: z.array(z.unknown()).nullish().catch(null),
});

/** "07424905000138-1-000212/2026" → { cnpj, sequencial, ano } */
export function parseControlNumber(control: string | null | undefined): { cnpj: string; sequence: number; year: number } | null {
  if (!control) return null;
  const m = /^(\d{14})-(\d+)-(\d+)\/(\d{4})/.exec(control.trim());
  if (!m) return null;
  return { cnpj: m[1], sequence: Number(m[3]), year: Number(m[4]) };
}

export function canonicalControlNumber(control: string): string {
  const parsed = parseControlNumber(control);
  if (!parsed) return control.trim();
  const tipo = /^(\d{14})-(\d+)-/.exec(control.trim())?.[2] ?? "1";
  return `${parsed.cnpj}-${Number(tipo)}-${String(parsed.sequence).padStart(6, "0")}/${parsed.year}`;
}

export function pncpPublicUrl(cnpj: string, year: number, sequence: number): string {
  return `https://pncp.gov.br/app/editais/${cnpj}/${year}/${sequence}`;
}

function daysInWindow(window: CollectWindow): Date[] {
  const days: Date[] = [];
  const last = localDateString(window.to);
  let cursor = window.from;
  for (let i = 0; i < 400; i++) {
    days.push(cursor);
    if (localDateString(cursor) >= last) break;
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function normalizePncpContratacao(payload: unknown, sourceKey = "pncp", endpoint = "contratacoes"): NormalizedOpportunity | null {
  const parsed = pncpContratacaoSchema.safeParse(payload);
  if (!parsed.success) return null;
  const c = parsed.data;
  const cnpj = onlyDigits(c.orgaoEntidade?.cnpj) || null;
  const control = c.numeroControlePNCP ?? (cnpj && c.anoCompra && c.sequencialCompra ? `${cnpj}-1-${String(c.sequencialCompra).padStart(6, "0")}/${c.anoCompra}` : null);
  if (!control) return null;
  const parsedControl = parseControlNumber(control);
  const year = c.anoCompra ?? parsedControl?.year ?? null;
  const sequence = c.sequencialCompra ?? parsedControl?.sequence ?? null;
  const orgCnpj = cnpj ?? parsedControl?.cnpj ?? null;
  const object = (c.objetoCompra ?? "").trim();
  const modalityName = c.modalidadeNome ?? (c.modalidadeId ? PNCP_MODALITIES[c.modalidadeId] ?? null : null);
  const legalText = [c.amparoLegal?.nome, c.amparoLegal?.descricao].filter(Boolean).join(" — ");
  const innovation = classifyInnovation({
    objectDescription: object,
    complementaryInfo: c.informacaoComplementar,
    legalBasisText: legalText,
    modalityCode: c.modalidadeId,
  });
  const meEpp = detectExclusiveMeEpp([object, c.informacaoComplementar]);

  return {
    sourceKey,
    sourceRecordId: canonicalControlNumber(control),
    sourceUrl: orgCnpj && year && sequence ? pncpPublicUrl(orgCnpj, year, sequence) : null,
    sourceUpdatedAt: parseSourceDate(c.dataAtualizacaoGlobal ?? c.dataAtualizacao ?? c.dataInclusao ?? c.dataPublicacaoPncp),
    pncpControlNumber: canonicalControlNumber(control),
    kind: kindFromModality(c.modalidadeId),
    status: statusFromSituation(c.situacaoCompraId),
    sourceStatusName: c.situacaoCompraNome ?? null,
    title: `${modalityName ?? "Contratação"}${c.numeroCompra ? ` nº ${c.numeroCompra}` : ""}${year ? `/${year}` : ""}`,
    objectDescription: object || "(objeto não informado pela fonte)",
    complementaryInfo: c.informacaoComplementar?.trim() || null,
    modalityCode: c.modalidadeId ?? null,
    modalityName,
    disputeModeName: c.modoDisputaNome ?? null,
    instrumentName: c.tipoInstrumentoConvocatorioNome ?? null,
    processNumber: c.processo ?? null,
    purchaseNumber: c.numeroCompra ?? null,
    purchaseYear: year,
    purchaseSequence: sequence,
    srp: c.srp ?? null,
    legalBasis: c.amparoLegal
      ? { code: c.amparoLegal.codigo ?? undefined, name: c.amparoLegal.nome ?? undefined, description: c.amparoLegal.descricao ?? undefined }
      : null,
    organizationName: c.orgaoEntidade?.razaoSocial ?? c.orgaoEntidade?.razaosocial ?? null,
    organizationCnpj: orgCnpj,
    governmentSphere: c.orgaoEntidade?.esferaId ?? null,
    governmentPower: c.orgaoEntidade?.poderId ?? null,
    unitCode: c.unidadeOrgao?.codigoUnidade ?? null,
    unitName: c.unidadeOrgao?.nomeUnidade ?? null,
    state: c.unidadeOrgao?.ufSigla?.toUpperCase() ?? null,
    city: c.unidadeOrgao?.municipioNome ?? null,
    cityIbge: c.unidadeOrgao?.codigoIbge ?? null,
    estimatedValue: c.valorTotalEstimado ?? null,
    awardedValue: c.valorTotalHomologado ?? null,
    publicationDate: parseSourceDate(c.dataPublicacaoPncp),
    proposalStart: parseSourceDate(c.dataAberturaProposta),
    proposalDeadline: parseSourceDate(c.dataEncerramentoProposta),
    expectedDate: null,
    originSystemUrl: c.linkSistemaOrigem ?? null,
    exclusiveMeEpp: meEpp.value,
    innovationClass: innovation.innovationClass,
    innovationEvidence: innovation.evidence,
    raw: { endpoint, ...(payload as object) },
  };
}

export function normalizePncpPcaItem(payload: unknown, sourceKey = "pncp"): NormalizedOpportunity | null {
  const p = payload as { plan?: unknown; item?: unknown };
  const plan = pcaPlanSchema.safeParse(p?.plan);
  const item = pcaItemSchema.safeParse(p?.item);
  if (!plan.success || !item.success) return null;
  const pl = plan.data;
  const it = item.data;
  const cnpj = onlyDigits(pl.orgaoEntidadeCnpj ?? pl.orgaoCnpj) || null;
  const description = (it.descricaoItem ?? "").trim();
  if (!cnpj || !pl.anoPca || it.numeroItem == null || !description) return null;
  const unitCode = it.codigoUnidade ?? pl.codigoUnidade ?? null;
  const planId = pcaPlanId(pl);
  const innovation = classifyInnovation({ objectDescription: description });
  return {
    sourceKey,
    sourceRecordId: `pca:${planId}:${it.numeroItem}`,
    sourceUrl: `https://pncp.gov.br/app/pca/${cnpj}/${pl.anoPca}`,
    sourceUpdatedAt: parseSourceDate(pl.dataAtualizacao ?? pl.dataPublicacaoPncp),
    pncpControlNumber: null,
    kind: "FUTURE_PROCUREMENT",
    status: "PUBLISHED",
    sourceStatusName: "Planejada (PCA)",
    title: `PCA ${pl.anoPca} · ${it.categoriaItemPcaNome ?? "Item"} · item ${it.numeroItem}`,
    objectDescription: description,
    complementaryInfo: [it.classificacaoSuperiorNome, it.grupoContratacaoNome].filter(Boolean).join(" · ") || null,
    modalityCode: null,
    modalityName: null,
    disputeModeName: null,
    instrumentName: "Plano de Contratações Anual",
    processNumber: null,
    purchaseNumber: null,
    purchaseYear: pl.anoPca,
    purchaseSequence: pl.sequencialPca ?? null,
    srp: null,
    legalBasis: null,
    organizationName: pl.orgaoEntidadeRazaoSocial ?? pl.orgaoRazaoSocial ?? null,
    organizationCnpj: cnpj,
    governmentSphere: null,
    governmentPower: null,
    unitCode,
    unitName: it.nomeUnidade ?? pl.nomeUnidade ?? null,
    state: null,
    city: null,
    cityIbge: null,
    estimatedValue: it.valorTotal ?? null,
    awardedValue: null,
    publicationDate: parseSourceDate(pl.dataPublicacaoPncp),
    proposalStart: null,
    proposalDeadline: null,
    expectedDate: it.dataDesejada ? (() => { const d = parseSourceDate(it.dataDesejada); return d ? localDateString(d) : null; })() : null,
    originSystemUrl: null,
    exclusiveMeEpp: null,
    innovationClass: innovation.innovationClass,
    innovationEvidence: innovation.evidence,
    extraKeys: [`pca:${cnpj}:${pl.anoPca}:${unitCode ?? "0"}:${it.numeroItem}`],
    raw: payload,
  };
}

function pcaPlanId(pl: z.infer<typeof pcaPlanSchema>): string {
  const cnpj = onlyDigits(pl.orgaoEntidadeCnpj ?? pl.orgaoCnpj);
  return pl.idPcaPncp ?? `${cnpj}-${pl.anoPca}-${pl.sequencialPca ?? pl.codigoUnidade ?? "0"}`;
}

interface PncpConfig {
  baseUrl: string;
  modalities: number[];
  pageSize: number;
  maxPagesPerModality: number;
  proposalHorizonDays: number;
  pcaDateParams: [string, string];
  pcaRelevantCategories: string[];
  pcaPageSize: number;
  /** Optional codigoClassificacaoSuperior filters for pca/atualizacao (empty = no filter). */
  pcaClassificationCodes: string[];
}

function readConfig(raw: Record<string, unknown>): PncpConfig {
  const d = sourceDefinition("pncp")!.defaultConfig as Record<string, unknown>;
  const c = { ...d, ...raw };
  return {
    baseUrl: String(c.baseUrl),
    modalities: (c.modalities as number[]).map(Number),
    pageSize: Math.min(50, Number(c.pageSize) || 50),
    maxPagesPerModality: Number(c.maxPagesPerModality) || 40,
    proposalHorizonDays: Number(c.proposalHorizonDays) || 60,
    pcaDateParams: (c.pcaDateParams as [string, string]) ?? ["dataInicio", "dataFim"],
    pcaRelevantCategories: ((c.pcaRelevantCategories as string[]) ?? []).map(normalizeText),
    pcaPageSize: Math.min(500, Number(c.pcaPageSize) || 100),
    pcaClassificationCodes: ((c.pcaClassificationCodes as string[] | undefined) ?? []).map(String),
  };
}

export class PncpAdapter implements ProcurementSourceAdapter {
  readonly key = "pncp";
  readonly name = "PNCP";
  readonly collectors = sourceDefinition("pncp")!.collectors;
  private clients = new Map<string, HttpClient>();

  constructor(private readonly deps: { fetchImpl?: typeof fetch; sleep?: (ms: number) => Promise<void>; minIntervalMs?: number } = {}) {}

  private client(cfg: PncpConfig, ctx: CollectContext): HttpClient {
    let client = this.clients.get(cfg.baseUrl);
    if (!client) {
      client = createHttpClient({
        baseUrl: cfg.baseUrl,
        userAgent: process.env.SOURCE_USER_AGENT ?? "RadarPublico/0.1",
        minIntervalMs: this.deps.minIntervalMs ?? Number(process.env.PNCP_MIN_INTERVAL_MS ?? 1000),
        fetchImpl: this.deps.fetchImpl,
        sleep: this.deps.sleep,
        log: ctx.log,
      });
      this.clients.set(cfg.baseUrl, client);
    }
    return client;
  }

  async *fetchOpportunities(mode: "publicacao" | "atualizacao" | "proposta", window: CollectWindow, ctx: CollectContext): AsyncIterable<SourceRecord> {
    const cfg = readConfig(ctx.config);
    const http = this.client(cfg, ctx);
    const path = `/api/consulta/v1/contratacoes/${mode}`;
    const days = mode === "proposta" ? [window.to] : daysInWindow(window);
    for (const day of days) {
      for (const modality of cfg.modalities) {
        for (let page = 1; page <= cfg.maxPagesPerModality; page++) {
          const params: Record<string, string | number> =
            mode === "proposta"
              ? { dataFinal: toSourceDateParam(day), codigoModalidadeContratacao: modality, pagina: page, tamanhoPagina: cfg.pageSize }
              : { dataInicial: toSourceDateParam(day), dataFinal: toSourceDateParam(day), codigoModalidadeContratacao: modality, pagina: page, tamanhoPagina: cfg.pageSize };
          const body = await http.getJson(path, params);
          if (!body) break;
          const parsed = pageSchema.safeParse(body);
          if (!parsed.success) throw new Error(`Resposta de paginação inesperada em ${path}`);
          const data = parsed.data.data ?? [];
          for (const item of data) {
            const control = (item as { numeroControlePNCP?: string }).numeroControlePNCP;
            yield { endpoint: `contratacoes/${mode}`, sourceRecordId: control ? canonicalControlNumber(control) : "", payload: item };
          }
          const totalPages = parsed.data.totalPaginas ?? 0;
          if (data.length === 0 || page >= totalPages) break;
          if (page === cfg.maxPagesPerModality) {
            ctx.log(`[pncp] limite de ${cfg.maxPagesPerModality} páginas atingido (modalidade ${modality}, ${localDateString(day)}): ${totalPages} páginas disponíveis`);
          }
        }
      }
    }
  }

  async fetchOpportunityDetails(ref: OpportunityRef, ctx: CollectContext): Promise<SourceRecord | null> {
    const cfg = readConfig(ctx.config);
    const parsed = parseControlNumber(ref.pncpControlNumber);
    const cnpj = ref.organizationCnpj ?? parsed?.cnpj;
    const year = ref.purchaseYear ?? parsed?.year;
    const seq = ref.purchaseSequence ?? parsed?.sequence;
    if (!cnpj || !year || !seq) return null;
    const body = await this.client(cfg, ctx).getJson(`/api/consulta/v1/orgaos/${cnpj}/compras/${year}/${seq}`);
    if (!body) return null;
    return { endpoint: "orgaos/compras", sourceRecordId: ref.pncpControlNumber ?? ref.sourceRecordId, payload: body };
  }

  async fetchDocuments(ref: OpportunityRef, ctx: CollectContext): Promise<SourceDocument[]> {
    const cfg = readConfig(ctx.config);
    const parsed = parseControlNumber(ref.pncpControlNumber);
    const cnpj = ref.organizationCnpj ?? parsed?.cnpj;
    const year = ref.purchaseYear ?? parsed?.year;
    const seq = ref.purchaseSequence ?? parsed?.sequence;
    if (!cnpj || !year || !seq) return [];
    const body = await this.client(cfg, ctx).getJson<unknown[]>(`/api/pncp/v1/orgaos/${cnpj}/compras/${year}/${seq}/arquivos`);
    if (!Array.isArray(body)) return [];
    const docs: SourceDocument[] = [];
    for (const raw of body) {
      const a = arquivoSchema.safeParse(raw);
      if (!a.success) continue;
      const url = a.data.url ?? a.data.uri;
      if (!url) continue;
      docs.push({
        sourceSequence: a.data.sequencialDocumento ?? null,
        title: a.data.titulo ?? a.data.tipoDocumentoNome ?? "Documento",
        docTypeCode: a.data.tipoDocumentoId ?? null,
        docTypeName: a.data.tipoDocumentoNome ?? null,
        url,
        publishedAt: parseSourceDate(a.data.dataPublicacaoPncp),
        active: a.data.statusAtivo ?? true,
      });
    }
    return docs;
  }

  async *fetchProcurementPlans(window: CollectWindow, ctx: CollectContext): AsyncIterable<SourceRecord> {
    const cfg = readConfig(ctx.config);
    const http = this.client(cfg, ctx);
    const [fromParam, toParam] = cfg.pcaDateParams;
    const classifications = cfg.pcaClassificationCodes.length > 0 ? cfg.pcaClassificationCodes : [undefined];
    for (const classification of classifications) {
      for (let page = 1; page <= cfg.maxPagesPerModality; page++) {
        const body = await http.getJson("/api/consulta/v1/pca/atualizacao", {
          [fromParam]: toSourceDateParam(window.from),
          [toParam]: toSourceDateParam(window.to),
          codigoClassificacaoSuperior: classification,
          pagina: page,
          tamanhoPagina: cfg.pcaPageSize,
        });
        if (!body) break;
        const parsed = pageSchema.safeParse(body);
        if (!parsed.success) throw new Error("Resposta de paginação inesperada em pca/atualizacao");
        const plans = parsed.data.data ?? [];
        for (const rawPlan of plans) {
          const plan = pcaPlanSchema.safeParse(rawPlan);
          if (!plan.success) continue;
          let items: unknown[] = plan.data.itens ?? plan.data.lista ?? [];
          const cnpj = onlyDigits(plan.data.orgaoEntidadeCnpj ?? plan.data.orgaoCnpj);
          if (items.length === 0 && cnpj && plan.data.anoPca && plan.data.sequencialPca) {
            items = await this.fetchPcaItems(http, cnpj, plan.data.anoPca, plan.data.sequencialPca);
          }
          const { itens: _i, lista: _l, ...planHeader } = plan.data;
          void _i;
          void _l;
          for (const rawItem of items) {
            const item = pcaItemSchema.safeParse(rawItem);
            if (!item.success) continue;
            const category = normalizeText(item.data.categoriaItemPcaNome);
            if (cfg.pcaRelevantCategories.length > 0 && !cfg.pcaRelevantCategories.some((c) => category.includes(c))) continue;
            yield { endpoint: "pca/atualizacao", sourceRecordId: `pca:${pcaPlanId(plan.data)}:${item.data.numeroItem}`, payload: { plan: planHeader, item: rawItem } };
          }
        }
        const totalPages = parsed.data.totalPaginas ?? 0;
        if (plans.length === 0 || page >= totalPages) break;
      }
    }
  }

  /** `/api/pncp/v1/orgaos/{cnpj}/pca/{ano}/{sequencial}/itens` — array or paginated wrapper. */
  private async fetchPcaItems(http: HttpClient, cnpj: string, year: number, sequence: number): Promise<unknown[]> {
    const items: unknown[] = [];
    for (let page = 1; page <= 20; page++) {
      const body = await http.getJson<unknown>(`/api/pncp/v1/orgaos/${cnpj}/pca/${year}/${sequence}/itens`, { pagina: page, tamanhoPagina: 100 });
      if (!body) break;
      if (Array.isArray(body)) {
        items.push(...body);
        break;
      }
      const parsed = pageSchema.safeParse(body);
      if (!parsed.success) break;
      const data = parsed.data.data ?? [];
      items.push(...data);
      if (data.length === 0 || page >= (parsed.data.totalPaginas ?? 0)) break;
    }
    return items;
  }

  normalize(record: SourceRecord): NormalizedOpportunity | null {
    if (record.endpoint.startsWith("pca")) return normalizePncpPcaItem(record.payload, this.key);
    return normalizePncpContratacao(record.payload, this.key, record.endpoint);
  }

  async healthCheck(ctx: CollectContext) {
    const cfg = readConfig(ctx.config);
    const started = Date.now();
    try {
      const today = toSourceDateParam(new Date());
      await this.client(cfg, ctx).getJson("/api/consulta/v1/contratacoes/publicacao", {
        dataInicial: today,
        dataFinal: today,
        codigoModalidadeContratacao: 6,
        pagina: 1,
        tamanhoPagina: 10,
      });
      return { status: "OK" as const, message: "API de Consultas respondeu", latencyMs: Date.now() - started };
    } catch (err) {
      return { status: "DOWN" as const, message: (err as Error).message, latencyMs: Date.now() - started };
    }
  }
}
