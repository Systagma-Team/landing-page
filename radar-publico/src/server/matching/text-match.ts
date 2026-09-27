import { escapeRegExp, excerpt, normalizeText, normalizeWithMap, type MappedText } from "@/lib/text";
import type { TermHit, TermSpec, TextField } from "./types";

/**
 * Deterministic phrase matching over accent-free text.
 * Terms are discovery signals: whole-word phrase matches with light Portuguese plural tolerance,
 * never substring matches ("ia" must not match "materia").
 */

const FIELD_WEIGHT: Record<TextField, number> = {
  object: 1,
  title: 0.8,
  complementary: 0.6,
  extra: 0.5,
};

/** Reduces a Portuguese plural token to its singular so both forms match symmetrically. */
function singularize(token: string): string {
  if (token.length < 5) return token;
  if (/(oes|aes|aos)$/.test(token)) return `${token.slice(0, -3)}ao`;
  if (token.endsWith("ns")) return `${token.slice(0, -2)}m`;
  if (token.length >= 6 && /[aeo]is$/.test(token)) return `${token.slice(0, -2)}l`;
  if (/[rz]es$/.test(token)) return token.slice(0, -2);
  if (/[aeiou]s$/.test(token)) return token.slice(0, -1);
  // loanwords: notebooks → notebook, desktops → desktop
  if (/[^s]s$/.test(token)) return token.slice(0, -1);
  return token;
}

function tokenPattern(raw: string): string {
  if (raw.length < 4 || /^\d+$/.test(raw)) return escapeRegExp(raw);
  const token = singularize(raw);
  // integracao ↔ integracoes, gestao ↔ gestoes
  if (token.endsWith("ao")) return `${escapeRegExp(token.slice(0, -2))}(?:ao|oes|aes|aos)`;
  // gerencial ↔ gerenciais, painel ↔ paineis
  if (token.endsWith("l")) return `${escapeRegExp(token.slice(0, -1))}(?:l|is)`;
  // nuvem ↔ nuvens
  if (token.endsWith("m")) return `${escapeRegExp(token.slice(0, -1))}(?:m|ns)`;
  // sistema ↔ sistemas, licenca ↔ licencas
  if (/[aeiou]$/.test(token)) return `${escapeRegExp(token)}s?`;
  // servidor ↔ servidores
  if (/[rz]$/.test(token)) return `${escapeRegExp(token)}(?:es)?`;
  return `${escapeRegExp(token)}s?`;
}

export interface CompiledTerm extends TermSpec {
  regex: RegExp;
}

export function compileTerm(spec: TermSpec): CompiledTerm | null {
  const base = normalizeWithMap(spec.term, spec.caseSensitive).text;
  const tokens = base.split(" ").filter(Boolean);
  if (tokens.length === 0) return null;
  const body = spec.caseSensitive ? tokens.map(escapeRegExp).join(" ") : tokens.map(tokenPattern).join(" ");
  const boundary = spec.caseSensitive ? "A-Za-z0-9" : "a-z0-9";
  return { ...spec, regex: new RegExp(`(?<![${boundary}])${body}(?![${boundary}])`) };
}

export function compileTerms(specs: TermSpec[]): CompiledTerm[] {
  return specs.map(compileTerm).filter((t): t is CompiledTerm => t !== null);
}

export interface MatchableText {
  field: TextField;
  original: string;
  lower: MappedText;
  cased: MappedText;
}

export function prepareTexts(fields: Partial<Record<TextField, string | null | undefined>>): MatchableText[] {
  return (Object.entries(fields) as [TextField, string | null | undefined][])
    .filter(([, v]) => !!v && v.trim().length > 0)
    .map(([field, v]) => ({
      field,
      original: v as string,
      lower: normalizeWithMap(v as string, false),
      cased: normalizeWithMap(v as string, true),
    }));
}

/** Locates a term in a text and returns the verbatim original excerpt around it. */
export function locate(term: CompiledTerm, text: MatchableText): { start: number; end: number } | null {
  const mapped = term.caseSensitive ? text.cased : text.lower;
  const m = term.regex.exec(mapped.text);
  if (!m) return null;
  const start = mapped.map[m.index] ?? 0;
  const lastIdx = m.index + m[0].length - 1;
  const end = (mapped.map[lastIdx] ?? start) + 1;
  return { start, end };
}

/**
 * One hit per (term, field): repeated mentions in the same field do not inflate scores.
 * A match fully contained in a longer term's match ("BI" inside "Power BI") is not counted twice.
 */
export function findHits(terms: CompiledTerm[], texts: MatchableText[]): TermHit[] {
  const hits: TermHit[] = [];
  const ordered = [...terms].sort((a, b) => b.term.length - a.term.length);
  for (const text of texts) {
    const spans: { start: number; end: number }[] = [];
    for (const term of ordered) {
      const pos = locate(term, text);
      if (!pos) continue;
      if (spans.some((s) => pos.start >= s.start && pos.end <= s.end)) continue;
      spans.push(pos);
      hits.push({
        term: term.term,
        field: text.field,
        weight: term.weight * FIELD_WEIGHT[text.field],
        snippet: excerpt(text.original, pos.start, pos.end, 70),
      });
    }
  }
  return hits;
}

/** Saturating strength: one solid hit ≈ 0.57, two ≈ 0.81, three ≈ 0.92. Each term counts once (best field). */
export function strengthFromHits(hits: TermHit[]): number {
  const bestPerTerm = new Map<string, number>();
  for (const h of hits) bestPerTerm.set(h.term, Math.max(bestPerTerm.get(h.term) ?? 0, h.weight));
  const total = Array.from(bestPerTerm.values()).reduce((a, b) => a + b, 0);
  return total <= 0 ? 0 : 1 - Math.exp(-total / 1.2);
}

export function totalWeight(hits: TermHit[]): number {
  const bestPerTerm = new Map<string, number>();
  for (const h of hits) bestPerTerm.set(h.term, Math.max(bestPerTerm.get(h.term) ?? 0, h.weight));
  return Array.from(bestPerTerm.values()).reduce((a, b) => a + b, 0);
}

/** Probabilistic OR of independent strengths. */
export function combineStrengths(values: number[]): number {
  return 1 - values.reduce((acc, v) => acc * (1 - Math.max(0, Math.min(1, v))), 1);
}

/** Whole-word keyword overlap used for evidence ↔ capability suggestions. */
export function keywordOverlap(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  if (shorter.length < 3) return false;
  return new RegExp(`(?<![a-z0-9])${escapeRegExp(shorter)}(?![a-z0-9])`).test(longer);
}
