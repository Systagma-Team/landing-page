import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema, type Database } from "@/db";
import { hashObject } from "@/lib/hash";
import type { ProfileSnapshot } from "@/server/matching/types";

type Db = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

const num = (v: string | null): number | null => (v == null ? null : Number(v));

/** Reads the live profile configuration (only active records) into an immutable snapshot shape. */
export async function buildProfileSnapshot(db: Db, profileId: string, version: number): Promise<ProfileSnapshot> {
  const [p] = await db.select().from(schema.procurementProfiles).where(eq(schema.procurementProfiles.id, profileId));
  if (!p) throw new Error(`Perfil ${profileId} não encontrado`);
  // Sequential on purpose: this often runs inside a transaction (single connection).
  const activities = await db.select().from(schema.profileActivities).where(and(eq(schema.profileActivities.profileId, profileId), eq(schema.profileActivities.active, true))).orderBy(asc(schema.profileActivities.createdAt));
  const capabilities = await db.select().from(schema.serviceCapabilities).where(and(eq(schema.serviceCapabilities.profileId, profileId), eq(schema.serviceCapabilities.active, true))).orderBy(asc(schema.serviceCapabilities.createdAt));
  const terms = await db.select().from(schema.taxonomyTerms).where(and(eq(schema.taxonomyTerms.profileId, profileId), eq(schema.taxonomyTerms.active, true))).orderBy(asc(schema.taxonomyTerms.createdAt));
  const evidence = await db.select().from(schema.technicalEvidence).where(and(eq(schema.technicalEvidence.profileId, profileId), eq(schema.technicalEvidence.active, true)));
  const documents = await db.select().from(schema.profileDocuments).where(and(eq(schema.profileDocuments.profileId, profileId), eq(schema.profileDocuments.archived, false)));

  return {
    profileId: p.id,
    organizationId: p.organizationId,
    version,
    kind: p.kind,
    slug: p.slug,
    displayName: p.displayName,
    legalName: p.legalName,
    cnpj: p.cnpj,
    isMeEpp: p.isMeEpp,
    sicafStatus: p.sicafStatus,
    nationwide: p.nationwide,
    preferredStates: p.preferredStates,
    restrictToPreferredStates: p.restrictToPreferredStates,
    minProjectValue: num(p.minProjectValue),
    maxProjectValue: num(p.maxProjectValue),
    scoring: p.scoring,
    activities: activities.map((a) => ({ id: a.id, type: a.type, code: a.code, description: a.description, keywords: a.keywords })),
    capabilities: capabilities.map((c) => ({
      id: c.id,
      category: c.category,
      name: c.name,
      level: c.level,
      strategic: c.strategic,
      terms: terms
        .filter((t) => t.polarity === "POSITIVE" && t.capabilityId === c.id)
        .map((t) => ({ id: t.id, term: t.term, weight: t.weight, caseSensitive: t.caseSensitive })),
    })),
    negativeTerms: terms
      .filter((t) => t.polarity === "NEGATIVE")
      .map((t) => ({ id: t.id, term: t.term, weight: t.weight, caseSensitive: t.caseSensitive, effect: t.effect ?? "PENALIZE", note: t.note })),
    evidence: evidence.map((e) => ({ id: e.id, type: e.type, title: e.title, issuer: e.issuer, capabilities: e.capabilities, documentId: e.documentId })),
    documents: documents.map((d) => ({ id: d.id, category: d.category, title: d.title, expiresOn: d.expiresOn })),
  };
}

/**
 * Records a new immutable profile version when the effective configuration changed.
 * Past matches keep pointing at the version they were computed with.
 */
export async function commitProfileVersion(db: Db, profileId: string, userId: string | null, changeSummary: string): Promise<number> {
  const [p] = await db.select({ currentVersion: schema.procurementProfiles.currentVersion }).from(schema.procurementProfiles).where(eq(schema.procurementProfiles.id, profileId));
  if (!p) throw new Error("Perfil não encontrado");
  const [latest] = await db
    .select()
    .from(schema.profileVersions)
    .where(eq(schema.profileVersions.profileId, profileId))
    .orderBy(desc(schema.profileVersions.version))
    .limit(1);
  const nextVersion = latest ? latest.version + 1 : 1;
  const snapshot = await buildProfileSnapshot(db, profileId, nextVersion);
  const hash = hashObject({ ...snapshot, version: 0 });
  if (latest && latest.snapshotHash === hash) return latest.version;
  await db.insert(schema.profileVersions).values({
    organizationId: snapshot.organizationId,
    profileId,
    version: nextVersion,
    snapshot,
    snapshotHash: hash,
    changeSummary,
    createdBy: userId,
  });
  await db
    .update(schema.procurementProfiles)
    .set({ currentVersion: nextVersion, updatedAt: new Date() })
    .where(eq(schema.procurementProfiles.id, profileId));
  return nextVersion;
}

/** Current immutable snapshots for matching (all organisations, or one). */
export async function loadCurrentSnapshots(organizationId?: string, db: Db = getDb()): Promise<(ProfileSnapshot & { snapshotHash: string })[]> {
  const profiles = await db
    .select({ id: schema.procurementProfiles.id, currentVersion: schema.procurementProfiles.currentVersion })
    .from(schema.procurementProfiles)
    .where(organizationId ? eq(schema.procurementProfiles.organizationId, organizationId) : undefined);
  if (profiles.length === 0) return [];
  const versions = await db
    .select()
    .from(schema.profileVersions)
    .where(inArray(schema.profileVersions.profileId, profiles.map((p) => p.id)));
  return profiles
    .map((p) => versions.find((v) => v.profileId === p.id && v.version === p.currentVersion))
    .filter((v): v is NonNullable<typeof v> => !!v)
    .map((v) => ({ ...v.snapshot, snapshotHash: v.snapshotHash }));
}
