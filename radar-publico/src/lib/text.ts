/** Remove diacritics (ç → c, ã → a) keeping case. */
export function stripAccents(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Lowercase, accent-free, punctuation collapsed to single spaces. Used for matching and search. */
export function normalizeText(input: string | null | undefined): string {
  if (!input) return "";
  return stripAccents(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Same as normalizeText but preserving letter case (for acronym terms such as "IA", "BI"). */
export function normalizeKeepCase(input: string | null | undefined): string {
  if (!input) return "";
  return stripAccents(input)
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim();
}

export function onlyDigits(input: string | null | undefined): string {
  return (input ?? "").replace(/\D+/g, "");
}

export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Split text into sentence-like fragments to use as supporting quotes. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.;:!?])\s+|\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0);
}

/** Returns a short excerpt of `text` around [start, end). */
export function excerpt(text: string, start: number, end: number, radius = 80): string {
  const from = Math.max(0, start - radius);
  const to = Math.min(text.length, end + radius);
  return `${from > 0 ? "…" : ""}${text.slice(from, to).replace(/\s+/g, " ").trim()}${to < text.length ? "…" : ""}`;
}

const STOPWORDS = new Set(
  [
    "a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas", "para", "por",
    "com", "sem", "um", "uma", "ao", "aos", "a", "que", "se", "ou", "outros", "outras", "sob", "sobre",
    "atividades", "atividade", "servicos", "servico", "exceto", "nao", "especificados", "anteriormente",
  ],
);

/** Suggest discovery keywords from a free-text activity description (user confirms before use). */
export function suggestKeywords(description: string): string[] {
  const tokens = normalizeText(description)
    .split(" ")
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
  return Array.from(new Set(tokens)).slice(0, 12);
}

export interface MappedText {
  text: string;
  /** map[i] = index in the original string of normalized character i */
  map: number[];
}

/**
 * Normalises like normalizeText/normalizeKeepCase while keeping a map back to the original string,
 * so a match found in normalised text can be quoted verbatim from the source.
 */
export function normalizeWithMap(input: string, keepCase = false): MappedText {
  const out: string[] = [];
  const map: number[] = [];
  let lastWasSpace = true;
  for (let i = 0; i < input.length; i++) {
    const decomposed = input[i].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const chars = keepCase ? decomposed : decomposed.toLowerCase();
    let appended = false;
    for (const ch of chars) {
      if (/[A-Za-z0-9]/.test(ch)) {
        out.push(ch);
        map.push(i);
        appended = true;
        lastWasSpace = false;
      }
    }
    if (!appended && !lastWasSpace) {
      out.push(" ");
      map.push(i);
      lastWasSpace = true;
    }
  }
  while (out.length > 0 && out[out.length - 1] === " ") {
    out.pop();
    map.pop();
  }
  return { text: out.join(""), map };
}
