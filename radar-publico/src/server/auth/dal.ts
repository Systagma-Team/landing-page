import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasRole, type Role } from "./roles";
import { SESSION_COOKIE, validateSessionToken, type SessionUser } from "./session";

export type CurrentUser = SessionUser;

export class ForbiddenError extends Error {
  constructor(message = "Sem permissão para esta ação") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Secure check: validates the session against the database once per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;
  return validateSessionToken(token);
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Use in every Server Action / Route Handler that mutates or exposes restricted data. */
export async function requireRole(role: Role): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasRole(user.role, role)) throw new ForbiddenError();
  return user;
}
