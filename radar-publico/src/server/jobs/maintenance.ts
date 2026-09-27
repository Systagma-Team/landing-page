import { lt } from "drizzle-orm";
import { getDb, schema } from "@/db";

export async function purgeExpiredSessionsWorker(): Promise<void> {
  const db = getDb();
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
  // Login attempts older than 30 days carry no value for throttling.
  await db.delete(schema.loginAttempts).where(lt(schema.loginAttempts.createdAt, new Date(Date.now() - 30 * 86_400_000)));
}
