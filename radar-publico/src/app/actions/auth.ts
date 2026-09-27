"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth/dal";
import { hashPassword, passwordProblems, verifyPassword } from "@/server/auth/password";
import { createSession, invalidateCurrentSession, invalidateUserSessions, isLoginThrottled, recordLoginAttempt, requestMeta } from "@/server/auth/session";
import type { ActionState } from "./types";

const LoginSchema = z.object({
  email: z.email().max(254).transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1).max(200),
});

// Equalises timing when the e-mail does not exist.
const DUMMY_HASH = "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==";

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = LoginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, message: "Informe e-mail e senha válidos." };
  const { email, password } = parsed.data;
  const { ip } = await requestMeta();

  if (await isLoginThrottled(email, ip)) {
    return { ok: false, message: "Muitas tentativas sem sucesso. Aguarde 15 minutos e tente novamente." };
  }
  const db = getDb();
  const [user] = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = ${email}`);
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid || !user.active) {
    await recordLoginAttempt(email, ip, false);
    return { ok: false, message: "E-mail ou senha inválidos." };
  }
  await recordLoginAttempt(email, ip, true);
  await createSession(user.id);
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));
  await audit({ organizationId: user.organizationId, userId: user.id, action: "auth.login", entityType: "user", entityId: user.id, ip });
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout(): Promise<void> {
  await invalidateCurrentSession();
  redirect("/login");
}

export async function changeOwnPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next !== confirm) return { ok: false, message: "A confirmação não confere." };
  const problems = passwordProblems(next);
  if (problems.length > 0) return { ok: false, message: `Senha fraca: ${problems.join(", ")}.` };
  const db = getDb();
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
  if (!row || !(await verifyPassword(current, row.passwordHash))) return { ok: false, message: "Senha atual incorreta." };
  await db.update(schema.users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(schema.users.id, user.id));
  await invalidateUserSessions(user.id);
  await createSession(user.id);
  await audit({ organizationId: user.organizationId, userId: user.id, action: "auth.password_changed", entityType: "user", entityId: user.id });
  return { ok: true, message: "Senha alterada. Outras sessões foram encerradas." };
}
