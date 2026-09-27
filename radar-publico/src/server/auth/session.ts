import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { getDb, schema } from "@/db";

export const SESSION_COOKIE = "rp_session";
const IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_THRESHOLD_MS = 6 * 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return { ip: forwarded || h.get("x-real-ip") || null, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const { ip, userAgent } = await requestMeta();
  await getDb()
    .insert(schema.sessions)
    .values({ id: hashToken(token), userId, expiresAt: new Date(Date.now() + IDLE_TIMEOUT_MS), ip, userAgent });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ABSOLUTE_TIMEOUT_MS / 1000,
  });
}

export interface SessionUser {
  sessionId: string;
  id: string;
  organizationId: string;
  organizationName: string;
  name: string;
  email: string;
  role: "ADMIN" | "ANALYST" | "VIEWER";
}

export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  const db = getDb();
  const id = hashToken(token);
  const rows = await db
    .select({
      sessionId: schema.sessions.id,
      expiresAt: schema.sessions.expiresAt,
      createdAt: schema.sessions.createdAt,
      id: schema.users.id,
      organizationId: schema.users.organizationId,
      organizationName: schema.organizations.name,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      active: schema.users.active,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.users.organizationId))
    .where(eq(schema.sessions.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const now = Date.now();
  if (!row.active || row.expiresAt.getTime() <= now || row.createdAt.getTime() + ABSOLUTE_TIMEOUT_MS <= now) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return null;
  }
  if (row.expiresAt.getTime() - now < REFRESH_THRESHOLD_MS) {
    const next = Math.min(now + IDLE_TIMEOUT_MS, row.createdAt.getTime() + ABSOLUTE_TIMEOUT_MS);
    await db.update(schema.sessions).set({ expiresAt: new Date(next) }).where(eq(schema.sessions.id, id));
  }
  return {
    sessionId: row.sessionId,
    id: row.id,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    name: row.name,
    email: row.email,
    role: row.role,
  };
}

export async function invalidateCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token)));
  store.delete(SESSION_COOKIE);
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  await getDb().delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

export async function purgeExpiredSessions(): Promise<void> {
  await getDb().delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
}

// ---------------------------------------------------------------- login throttling

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;

export async function isLoginThrottled(email: string, ip: string | null): Promise<boolean> {
  const db = getDb();
  const since = new Date(Date.now() - WINDOW_MS);
  const [byEmail] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.email, email), eq(schema.loginAttempts.success, false), gt(schema.loginAttempts.createdAt, since)));
  if ((byEmail?.n ?? 0) >= MAX_FAILURES_PER_EMAIL) return true;
  if (ip) {
    const [byIp] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.loginAttempts)
      .where(and(eq(schema.loginAttempts.ip, ip), eq(schema.loginAttempts.success, false), gt(schema.loginAttempts.createdAt, since)));
    if ((byIp?.n ?? 0) >= MAX_FAILURES_PER_IP) return true;
  }
  return false;
}

export async function recordLoginAttempt(email: string, ip: string | null, success: boolean): Promise<void> {
  await getDb().insert(schema.loginAttempts).values({ email, ip, success });
}
