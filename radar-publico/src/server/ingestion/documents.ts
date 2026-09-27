import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { schema, type Database } from "@/db";
import { addDays } from "@/lib/dates";
import { getAdapter } from "@/server/sources/registry";
import { sourceDefinition } from "@/server/sources/definitions";
import { recordDocumentAdded, type DetectedChange } from "./upsert";

/**
 * Document discovery (MVP: metadata + official link). Only for opportunities that matter —
 * relevant matches, watchlist or active human workflow — to keep API usage proportional.
 * V2 adds download (hash-deduplicated in file_blobs) and text extraction.
 */
export async function discoverDocuments(
  db: Database,
  opts: { now?: Date; limit?: number; opportunityIds?: string[]; log?: (m: string) => void } = {},
): Promise<{ checked: number; added: number; changes: { opportunityId: string; changes: DetectedChange[] }[] }> {
  const now = opts.now ?? new Date();
  const log = opts.log ?? (() => undefined);
  const staleBefore = addDays(now, -1);

  const candidates = opts.opportunityIds?.length
    ? await db.select().from(schema.opportunities).where(inArray(schema.opportunities.id, opts.opportunityIds))
    : await db
        .select()
        .from(schema.opportunities)
        .where(
          and(
            or(isNull(schema.opportunities.documentsCheckedAt), lt(schema.opportunities.documentsCheckedAt, staleBefore)),
            sql`${schema.opportunities.kind} <> 'FUTURE_PROCUREMENT'`,
            sql`(${schema.opportunities.proposalDeadline} is null or ${schema.opportunities.proposalDeadline} > ${now})`,
            sql`(
              exists (select 1 from ${schema.opportunityMatches} m where m.opportunity_id = ${schema.opportunities.id} and m.is_current and m.status in ('HIGH_COMPATIBILITY','MEDIUM_COMPATIBILITY','REQUIRES_REVIEW'))
              or exists (select 1 from ${schema.watchlist} w where w.opportunity_id = ${schema.opportunities.id})
              or exists (select 1 from ${schema.opportunityWorkflows} f where f.opportunity_id = ${schema.opportunities.id} and f.status not in ('DISCARDED','CANCELLED','LOST','WON'))
            )`,
          ),
        )
        .limit(opts.limit ?? 50);

  let added = 0;
  const changes: { opportunityId: string; changes: DetectedChange[] }[] = [];
  for (const opp of candidates) {
    if (!opp.pncpControlNumber) continue;
    const adapter = getAdapter("pncp");
    const [source] = await db.select().from(schema.sources).where(eq(schema.sources.key, "pncp"));
    const config = { ...(sourceDefinition("pncp")?.defaultConfig ?? {}), ...(source?.config ?? {}) };
    try {
      const docs = await adapter.fetchDocuments(
        {
          sourceRecordId: opp.pncpControlNumber,
          pncpControlNumber: opp.pncpControlNumber,
          organizationCnpj: opp.organizationCnpj,
          purchaseYear: opp.purchaseYear,
          purchaseSequence: opp.purchaseSequence,
        },
        { config, log },
      );
      const hadDocuments = opp.documentsCheckedAt != null;
      const oppChanges: DetectedChange[] = [];
      for (const d of docs) {
        const [inserted] = await db
          .insert(schema.opportunityDocuments)
          .values({
            opportunityId: opp.id,
            sourceKey: "pncp",
            sourceSequence: d.sourceSequence,
            title: d.title,
            docTypeCode: d.docTypeCode,
            docTypeName: d.docTypeName,
            url: d.url,
            publishedAt: d.publishedAt,
            active: d.active,
          })
          .onConflictDoUpdate({
            target: [schema.opportunityDocuments.opportunityId, schema.opportunityDocuments.url],
            set: { title: d.title, docTypeName: d.docTypeName, active: d.active },
          })
          // xmax = 0 only for freshly inserted rows (not for the ON CONFLICT update path)
          .returning({ id: schema.opportunityDocuments.id, inserted: sql<boolean>`(xmax = 0)` });
        const isNew = inserted?.inserted === true;
        if (isNew) {
          added++;
          // The first discovery is the baseline; later additions are meaningful updates.
          if (hadDocuments) oppChanges.push(await recordDocumentAdded(db, opp.id, d.title, d.url, "pncp"));
        }
      }
      if (oppChanges.length > 0) changes.push({ opportunityId: opp.id, changes: oppChanges });
      await db.update(schema.opportunities).set({ documentsCheckedAt: now }).where(eq(schema.opportunities.id, opp.id));
    } catch (err) {
      log(`documentos de ${opp.pncpControlNumber}: ${(err as Error).message}`);
    }
  }
  return { checked: candidates.length, added, changes };
}
