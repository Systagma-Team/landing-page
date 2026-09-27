import { onlyDigits } from "./text";

export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (base: string, weights: number[]) => {
    const sum = base.split("").reduce((acc, n, i) => acc + Number(n) * weights[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(d.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d.endsWith(`${d1}${d2}`);
}

/** CNAE subclass: 7 digits, displayed as 0000-0/00. */
export function normalizeCnae(value: string): string | null {
  const d = onlyDigits(value);
  if (d.length !== 7) return null;
  return `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5)}`;
}

export function splitList(value: string, max = 40): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 2 && s.length <= 80),
    ),
  ).slice(0, max);
}
