import { and, eq, gte, isNull, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { loadCurrentSnapshots } from "@/server/profiles/service";
import { matchOpportunities } from "./run";

/** Re-evaluates open opportunities (after profile changes, or daily for time-dependent dimensions). */
export async function rematchOpen(organizationId?: string, log: (m: string) => void = () => undefined, limit = Number.POSITIVE_INFINITY): Promise<number> {
  const db = getDb();
  const snapshots = await loadCurrentSnapshots(organizationId, db);
  const now = new Date();
  let lastId: string | null = null;
  let total = 0;
  let seen = 0;
  while (seen < limit) {
    const rows: { id: string }[] = await db
      .select({ id: schema.opportunities.id })
      .from(schema.opportunities)
      .where(
        and(
          or(isNull(schema.opportunities.proposalDeadline), gte(schema.opportunities.proposalDeadline, now), eq(schema.opportunities.kind, "FUTURE_PROCUREMENT")),
          sql`${schema.opportunities.status} <> 'CANCELLED'`,
          lastId ? sql`${schema.opportunities.id} > ${lastId}` : undefined,
        ),
      )
      .orderBy(schema.opportunities.id)
      .limit(500);
    if (rows.length === 0) break;
    const outcomes = await matchOpportunities(db, rows.map((r) => r.id), { snapshots, now });
    total += outcomes.length;
    seen += rows.length;
    lastId = rows[rows.length - 1].id;
  }
  log(`${total} matches recalculados`);
  return total;
}
