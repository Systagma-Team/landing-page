const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("pt-BR");

export function formatBRL(value: number | string | null | undefined, opts: { compact?: boolean } = {}): string {
  if (value == null || value === "") return "Não informado";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n) || n <= 0) return "Não informado / sigiloso";
  return opts.compact ? brlCompact.format(n) : brl.format(n);
}

export function formatInt(n: number | null | undefined): string {
  return n == null ? "—" : integer.format(n);
}

export function formatCnpj(value: string | null | undefined): string {
  const d = (value ?? "").replace(/\D/g, "");
  if (d.length !== 14) return value ?? "—";
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function pluralize(n: number, singular: string, plural: string): string {
  return `${formatInt(n)} ${n === 1 ? singular : plural}`;
}
