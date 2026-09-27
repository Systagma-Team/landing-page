import "server-only";
import { ForbiddenError, requireRole } from "@/server/auth/dal";
import { requestMeta } from "@/server/auth/session";
import type { Role } from "@/server/auth/roles";
import { WorkflowError, type Actor } from "@/server/opportunities/workflow";
import type { ActionState } from "./types";

/** Resolves the acting user (server-side session check + role) for a Server Action. */
export async function actorWithRole(role: Role): Promise<Actor> {
  const user = await requireRole(role);
  const { ip } = await requestMeta();
  return { id: user.id, organizationId: user.organizationId, role: user.role, ip };
}

export class UserInputError extends Error {}

/** Maps expected failures to messages; unexpected errors are logged and hidden. */
export async function runAction(fn: () => Promise<string | void>): Promise<ActionState> {
  try {
    const message = await fn();
    return { ok: true, message: message ?? "Salvo." };
  } catch (err) {
    if (err instanceof ForbiddenError) return { ok: false, message: "Sem permissão para esta ação." };
    if (err instanceof WorkflowError || err instanceof UserInputError) return { ok: false, message: err.message };
    if (err && typeof err === "object" && "digest" in err) throw err; // redirect()/notFound()
    console.error("[action]", err);
    return { ok: false, message: "Não foi possível concluir a ação. Tente novamente." };
  }
}

export function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v === "" ? null : v;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function uuid(formData: FormData, key: string): string {
  const v = str(formData, key);
  if (!UUID.test(v)) throw new UserInputError("Identificador inválido.");
  return v;
}

export function optNumber(formData: FormData, key: string): number | null {
  const input = str(formData, key).replace(/\s|R\$/g, "");
  // "1.234,56" (pt-BR) or "1234.56"
  const raw = input.includes(",") ? input.replace(/\./g, "").replace(",", ".") : input;
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new UserInputError(`Valor numérico inválido em "${key}".`);
  return n;
}
