import { and, eq, inArray, sql } from "drizzle-orm";
import { schema, type Database } from "@/db";
import { hashObject } from "@/lib/hash";
import { normalizeText } from "@/lib/text";
import type { NormalizedOpportunity, SourceRecord } from "@/server/sources/types";
import { computeDedupKeys, sourcePriority } from "./dedup";

export type ChangeType = (typeof schema.changeType.enumValues)[number];

export interface DetectedChange {
  id?: string;
  type: ChangeType;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  significant: boolean;
}

export interface IngestResult {
  opportunityId: string;
  outcome: "created" | "updated" | "unchanged";
  changes: DetectedChange[];
  /** true when the record was linked to an opportunity first seen from another source/key. */
  merged: boolean;
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

const numStr = (v: number | null) => (v == null ? null : v.toFixed(2));

function contentFields(n: NormalizedOpportunity) {
  return {
    kind: n.kind,
    status: n.status,
    sourceStatusName: n.sourceStatusName,
    title: n.title,
    objectDescription: n.objectDescription,
    complementaryInfo: n.complementaryInfo,
    modalityCode: n.modalityCode,
    modalityName: n.modalityName,
    disputeModeName: n.disputeModeName,
    instrumentName: n.instrumentName,
    processNumber: n.processNumber,
    purchaseNumber: n.purchaseNumber,
    purchaseYear: n.purchaseYear,
    purchaseSequence: n.purchaseSequence,
    srp: n.srp,
    legalBasis: n.legalBasis,
    organizationName: n.organizationName,
    organizationCnpj: n.organizationCnpj,
    governmentSphere: n.governmentSphere,
    governmentPower: n.governmentPower,
    unitCode: n.unitCode,
    unitName: n.unitName,
    state: n.state,
    city: n.city,
    cityIbge: n.cityIbge,
    estimatedValue: numStr(n.estimatedValue),
    awardedValue: numStr(n.awardedValue),
    publicationDate: n.publicationDate,
    proposalStart: n.proposalStart,
    proposalDeadline: n.proposalDeadline,
    expectedDate: n.expectedDate,
    originSystemUrl: n.originSystemUrl,
    exclusiveMeEpp: n.exclusiveMeEpp,
    innovationClass: n.innovationClass,
    innovationEvidence: n.innovationEvidence,
  };
}

export function baseSearchText(n: {
  title: string;
  objectDescription: string;
  complementaryInfo: string | null;
  organizationName: string | null;
  unitName: string | null;
  city: string | null;
  state: string | null;
  processNumber: string | null;
  purchaseNumber: string | null;
  pncpControlNumber: string | null;
}): string {
  return normalizeText(
    [n.title, n.objectDescription, n.complementaryInfo, n.organizationName, n.unitName, n.city, n.state, n.processNumber, n.purchaseNumber, n.pncpControlNumber]
      .filter(Boolean)
      .join(" "),
  );
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** Field-level diff for meaningful procurement changes (deadline extension, value, status, object). */
export function diffOpportunity(
  existing: typeof schema.opportunities.$inferSelect,
  incoming: ReturnType<typeof contentFields>,
): DetectedChange[] {
  const changes: DetectedChange[] = [];
  if (iso(existing.proposalDeadline) !== iso(incoming.proposalDeadline)) {
    changes.push({ type: "DEADLINE_CHANGED", field: "proposalDeadline", oldValue: iso(existing.proposalDeadline), newValue: iso(incoming.proposalDeadline), significant: true });
  }
  if (iso(existing.proposalStart) !== iso(incoming.proposalStart)) {
    changes.push({ type: "PROPOSAL_START_CHANGED", field: "proposalStart", oldValue: iso(existing.proposalStart), newValue: iso(incoming.proposalStart), significant: true });
  }
  if ((existing.estimatedValue ?? null) !== (incoming.estimatedValue ?? null)) {
    changes.push({ type: "VALUE_CHANGED", field: "estimatedValue", oldValue: existing.estimatedValue, newValue: incoming.estimatedValue, significant: true });
  }
  if (existing.status !== incoming.status) {
    changes.push({ type: "STATUS_CHANGED", field: "status", oldValue: existing.status, newValue: incoming.status, significant: true });
  }
  if (normalizeText(existing.objectDescription) !== normalizeText(incoming.objectDescription)) {
    changes.push({ type: "OBJECT_CHANGED", field: "objectDescription", oldValue: existing.objectDescription, newValue: incoming.objectDescription, significant: true });
  }
  if (normalizeText(existing.complementaryInfo) !== normalizeText(incoming.complementaryInfo)) {
    changes.push({ type: "OBJECT_CHANGED", field: "complementaryInfo", oldValue: existing.complementaryInfo, newValue: incoming.complementaryInfo, significant: false });
  }
  if ((existing.awardedValue ?? null) !== (incoming.awardedValue ?? null)) {
    changes.push({ type: "OTHER", field: "awardedValue", oldValue: existing.awardedValue, newValue: incoming.awardedValue, significant: false });
  }
  return changes;
}

/**
 * Idempotent ingestion of one source record:
 * raw storage (by payload hash) → dedup by keys → create or update → change history.
 * Running the same collector twice yields the same single opportunity and no spurious changes.
 */
export async function ingestRecord(db: Database, record: SourceRecord, n: NormalizedOpportunity, now = new Date()): Promise<IngestResult> {
  const keys = computeDedupKeys(n);
  const fields = contentFields(n);
  const contentHash = hashObject(fields);
  const payloadHash = hashObject(record.payload);

  return db.transaction(async (tx: Tx) => {
    // Serialise concurrent ingestion of the same procurement across collectors.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${keys[0]}))`);

    const owners = await tx
      .select({ opportunityId: schema.opportunityKeys.opportunityId, key: schema.opportunityKeys.key })
      .from(schema.opportunityKeys)
      .where(inArray(schema.opportunityKeys.key, keys));
    const ownerIds = Array.from(new Set(owners.map((o) => o.opportunityId)));
    // Prefer the owner of the strongest key (the order of `keys`).
    const primaryOwner = keys.map((k) => owners.find((o) => o.key === k)?.opportunityId).find(Boolean) ?? null;

    let opportunityId: string;
    let outcome: IngestResult["outcome"];
    let changes: DetectedChange[] = [];
    let merged = false;

    if (!primaryOwner) {
      const [created] = await tx
        .insert(schema.opportunities)
        .values({
          ...fields,
          primarySource: n.sourceKey,
          sourceUrl: n.sourceUrl,
          pncpControlNumber: n.pncpControlNumber,
          sourceUpdatedAt: n.sourceUpdatedAt,
          contentHash,
          rawPayload: n.raw,
          searchText: baseSearchText({ ...n }),
          firstSeenAt: now,
          lastCollectedAt: now,
        })
        .returning({ id: schema.opportunities.id });
      opportunityId = created.id;
      outcome = "created";
    } else {
      opportunityId = primaryOwner;
      merged = ownerIds.length > 1 || !owners.some((o) => o.key === keys[0]);
      const [existing] = await tx.select().from(schema.opportunities).where(eq(schema.opportunities.id, opportunityId));
      const lowerPriority = sourcePriority(n.sourceKey) < sourcePriority(existing.primarySource);
      const stale = !!(n.sourceUpdatedAt && existing.sourceUpdatedAt && n.sourceUpdatedAt < existing.sourceUpdatedAt);

      if (existing.contentHash === contentHash || lowerPriority || stale) {
        outcome = "unchanged";
        await tx.update(schema.opportunities).set({ lastCollectedAt: now }).where(eq(schema.opportunities.id, opportunityId));
      } else {
        changes = diffOpportunity(existing, fields);
        await tx
          .update(schema.opportunities)
          .set({
            ...fields,
            primarySource: n.sourceKey,
            sourceUrl: n.sourceUrl ?? existing.sourceUrl,
            pncpControlNumber: n.pncpControlNumber ?? existing.pncpControlNumber,
            sourceUpdatedAt: n.sourceUpdatedAt ?? existing.sourceUpdatedAt,
            contentHash,
            rawPayload: n.raw,
            searchText: baseSearchText({ ...n, pncpControlNumber: n.pncpControlNumber ?? existing.pncpControlNumber }),
            lastCollectedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.opportunities.id, opportunityId));
        if (changes.length > 0) {
          const inserted = await tx
            .insert(schema.opportunityChanges)
            .values(changes.map((c) => ({ opportunityId, type: c.type, field: c.field, oldValue: c.oldValue, newValue: c.newValue, significant: c.significant, sourceKey: n.sourceKey, detectedAt: now })))
            .returning({ id: schema.opportunityChanges.id });
          changes = changes.map((c, i) => ({ ...c, id: inserted[i]?.id }));
        }
        outcome = "updated";
      }
    }

    await tx
      .insert(schema.opportunityKeys)
      .values(keys.map((key) => ({ key, opportunityId })))
      .onConflictDoNothing();

    await tx
      .insert(schema.opportunitySources)
      .values({ opportunityId, sourceKey: n.sourceKey, sourceRecordId: n.sourceRecordId, sourceUrl: n.sourceUrl, collectedAt: now, lastUpdatedAt: n.sourceUpdatedAt, lastPayloadHash: payloadHash })
      .onConflictDoUpdate({
        target: [schema.opportunitySources.sourceKey, schema.opportunitySources.sourceRecordId],
        set: { opportunityId, sourceUrl: n.sourceUrl, lastUpdatedAt: n.sourceUpdatedAt, lastPayloadHash: payloadHash },
      });

    await tx
      .insert(schema.rawRecords)
      .values({ sourceKey: n.sourceKey, endpoint: record.endpoint, sourceRecordId: n.sourceRecordId, payloadHash, payload: record.payload, opportunityId, fetchedAt: now })
      .onConflictDoNothing();

    return { opportunityId, outcome, changes, merged };
  });
}

/** Records a DOCUMENT_ADDED change (used by document discovery). */
export async function recordDocumentAdded(db: Database, opportunityId: string, title: string, url: string, sourceKey: string): Promise<DetectedChange> {
  const [row] = await db
    .insert(schema.opportunityChanges)
    .values({ opportunityId, type: "DOCUMENT_ADDED", field: "documents", oldValue: null, newValue: { title, url }, significant: true, sourceKey })
    .returning({ id: schema.opportunityChanges.id });
  return { id: row.id, type: "DOCUMENT_ADDED", field: "documents", oldValue: null, newValue: { title, url }, significant: true };
}

export async function opportunitiesByIds(db: Database, ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(schema.opportunities).where(and(inArray(schema.opportunities.id, ids)));
}
