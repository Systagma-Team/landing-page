import { getDb, schema } from "@/db";
import type { Database } from "@/db";

export interface AuditEntry {
  organizationId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

type Executor = Pick<Database, "insert">;

/** Append-only audit trail. Procurement decisions must be traceable. */
export async function audit(entry: AuditEntry, tx?: Executor): Promise<void> {
  const db = tx ?? getDb();
  await db.insert(schema.auditLogs).values({
    organizationId: entry.organizationId,
    userId: entry.userId,
    actorType: entry.userId ? "USER" : "SYSTEM",
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    metadata: entry.metadata ?? {},
    ip: entry.ip ?? null,
  });
}
