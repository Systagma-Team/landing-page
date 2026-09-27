import { normalizeText, onlyDigits } from "@/lib/text";
import type { NormalizedOpportunity } from "@/server/sources/types";

/**
 * Every key an incoming record can be identified by. Deduplication never relies on titles:
 *  - pncp:<numeroControlePNCP>                      official PNCP identifier (strongest)
 *  - cmp:<cnpj>:<unit>:<modality>:<year>:<number>   purchase number within the buying unit
 *  - proc:<cnpj>:<modality>:<year>:<process>        administrative process number
 *  - extra keys from the adapter (e.g. PCA items)
 */
export function computeDedupKeys(n: NormalizedOpportunity): string[] {
  const keys: string[] = [];
  if (n.pncpControlNumber) keys.push(`pncp:${n.pncpControlNumber}`);
  const cnpj = onlyDigits(n.organizationCnpj);
  const number = normalizePurchaseNumber(n.purchaseNumber);
  if (cnpj && n.unitCode && n.modalityCode && n.purchaseYear && number) {
    keys.push(`cmp:${cnpj}:${normalizeText(n.unitCode)}:${n.modalityCode}:${n.purchaseYear}:${number}`);
  }
  const process = normalizeText(n.processNumber).replace(/ /g, "");
  if (cnpj && n.modalityCode && n.purchaseYear && process.length >= 5) {
    keys.push(`proc:${cnpj}:${n.modalityCode}:${n.purchaseYear}:${process}`);
  }
  for (const k of n.extraKeys ?? []) keys.push(k);
  if (keys.length === 0) keys.push(`src:${n.sourceKey}:${n.sourceRecordId}`);
  return Array.from(new Set(keys));
}

/** "00012/2026" → "12", "PE 12-2026" → "12" (year suffix removed, leading zeros stripped). */
export function normalizePurchaseNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const base = value.split("/")[0];
  const digits = normalizeText(base).replace(/ /g, "").replace(/^[a-z]+/, "").replace(/^0+/, "");
  return digits || null;
}

export const SOURCE_PRIORITY: Record<string, number> = { pncp: 100, comprasgov: 50 };

export function sourcePriority(key: string): number {
  return SOURCE_PRIORITY[key] ?? 10;
}
