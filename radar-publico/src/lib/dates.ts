export const APP_TIME_ZONE = "America/Sao_Paulo";
/** Brasília has had no daylight saving time since 2019. */
const BRT_OFFSET = "-03:00";

/**
 * Parses source datetimes. PNCP returns local times without offset ("2026-10-05T09:00:00");
 * those are interpreted as Brasília time. Values with an explicit offset/Z are respected.
 */
export function parseSourceDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  if (!s) return null;
  let iso = s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) iso = `${s}T00:00:00${BRT_OFFSET}`;
  else if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) iso = `${s.replace(" ", "T")}${BRT_OFFSET}`;
  else if (/^\d{8}$/.test(s)) iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00${BRT_OFFSET}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Calendar date (yyyy-mm-dd) in Brasília time. */
export function localDateString(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return parts;
}

export function toSourceDateParam(d: Date): string {
  return localDateString(d).replace(/-/g, "");
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

/** Whole calendar days (Brasília) from `now` until `target`; negative when past. */
export function daysUntil(target: Date, now: Date = new Date()): number {
  if (target.getTime() < now.getTime()) {
    // Deadline already passed today counts as -1 or lower.
    const diff = Math.floor((target.getTime() - now.getTime()) / 86_400_000);
    return Math.min(-1, diff);
  }
  const a = new Date(`${localDateString(now)}T00:00:00${BRT_OFFSET}`);
  const b = new Date(`${localDateString(target)}T00:00:00${BRT_OFFSET}`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? parseSourceDate(d) : d;
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? parseSourceDate(d) : d;
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function quarterLabel(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = parseSourceDate(dateStr);
  if (!d) return null;
  const [y, m] = localDateString(d).split("-").map(Number);
  return `T${Math.floor((m - 1) / 3) + 1} / ${y}`;
}
