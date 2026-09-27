import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { evaluateLive } from "@/server/matching/run";
import { loadCurrentSnapshots } from "@/server/profiles/service";
import type { MatchResult } from "@/server/matching/types";
import { orgProfiles } from "./queries";

export type MatchRow = typeof schema.opportunityMatches.$inferSelect;

export interface ProfileAssessment {
  profile: { id: string; slug: string; displayName: string; kind: string };
  stored: MatchRow | null;
  /** Computed on the fly when nothing was stored (not relevant for this profile). */
  live: MatchResult | null;
  overrides: (typeof schema.matchOverrides.$inferSelect & { userName: string | null })[];
  workflow: typeof schema.opportunityWorkflows.$inferSelect | null;
  history: MatchRow[];
}

export async function getOpportunityDetail(organizationId: string, opportunityId: string) {
  const db = getDb();
  const [opp] = await db.select().from(schema.opportunities).where(eq(schema.opportunities.id, opportunityId));
  if (!opp) return null;

  const profiles = await orgProfiles(organizationId);
  const snapshots = await loadCurrentSnapshots(organizationId, db);

  const [sources, documents, changes, analyses, matches, overrides, workflows, decisions, notes, watch, auditRows] = await Promise.all([
    db.select().from(schema.opportunitySources).where(eq(schema.opportunitySources.opportunityId, opportunityId)),
    db.select().from(schema.opportunityDocuments).where(eq(schema.opportunityDocuments.opportunityId, opportunityId)).orderBy(asc(schema.opportunityDocuments.sourceSequence)),
    db.select().from(schema.opportunityChanges).where(eq(schema.opportunityChanges.opportunityId, opportunityId)).orderBy(desc(schema.opportunityChanges.detectedAt)),
    db.select().from(schema.opportunityAnalyses).where(eq(schema.opportunityAnalyses.opportunityId, opportunityId)).orderBy(desc(schema.opportunityAnalyses.createdAt)),
    db
      .select()
      .from(schema.opportunityMatches)
      .where(and(eq(schema.opportunityMatches.opportunityId, opportunityId), eq(schema.opportunityMatches.organizationId, organizationId)))
      .orderBy(desc(schema.opportunityMatches.computedAt)),
    db
      .select({ o: schema.matchOverrides, userName: schema.users.name })
      .from(schema.matchOverrides)
      .leftJoin(schema.users, eq(schema.users.id, schema.matchOverrides.userId))
      .where(and(eq(schema.matchOverrides.opportunityId, opportunityId), eq(schema.matchOverrides.organizationId, organizationId)))
      .orderBy(desc(schema.matchOverrides.createdAt)),
    db.select().from(schema.opportunityWorkflows).where(and(eq(schema.opportunityWorkflows.opportunityId, opportunityId), eq(schema.opportunityWorkflows.organizationId, organizationId))),
    db
      .select({ d: schema.opportunityDecisions, userName: schema.users.name })
      .from(schema.opportunityDecisions)
      .leftJoin(schema.users, eq(schema.users.id, schema.opportunityDecisions.userId))
      .where(and(eq(schema.opportunityDecisions.opportunityId, opportunityId), eq(schema.opportunityDecisions.organizationId, organizationId)))
      .orderBy(desc(schema.opportunityDecisions.createdAt)),
    db
      .select({ n: schema.opportunityNotes, userName: schema.users.name })
      .from(schema.opportunityNotes)
      .leftJoin(schema.users, eq(schema.users.id, schema.opportunityNotes.userId))
      .where(and(eq(schema.opportunityNotes.opportunityId, opportunityId), eq(schema.opportunityNotes.organizationId, organizationId)))
      .orderBy(desc(schema.opportunityNotes.createdAt)),
    db.select().from(schema.watchlist).where(and(eq(schema.watchlist.opportunityId, opportunityId), eq(schema.watchlist.organizationId, organizationId))),
    db
      .select({ a: schema.auditLogs, userName: schema.users.name })
      .from(schema.auditLogs)
      .leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.userId))
      .where(and(eq(schema.auditLogs.entityType, "opportunity"), eq(schema.auditLogs.entityId, opportunityId), eq(schema.auditLogs.organizationId, organizationId)))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(50),
  ]);

  // Requirements of the latest analysis per analyzer.
  const latestByAnalyzer = new Map<string, (typeof analyses)[number]>();
  for (const a of analyses) if (a.status === "OK" && !latestByAnalyzer.has(a.analyzer)) latestByAnalyzer.set(a.analyzer, a);
  const currentAnalysisIds = Array.from(latestByAnalyzer.values()).map((a) => a.id);
  const requirements = currentAnalysisIds.length
    ? await db.select().from(schema.opportunityRequirements).where(inArray(schema.opportunityRequirements.analysisId, currentAnalysisIds))
    : [];

  const assessments: ProfileAssessment[] = [];
  for (const p of profiles) {
    const stored = matches.find((m) => m.profileId === p.id && m.isCurrent) ?? null;
    const snapshot = snapshots.find((s) => s.profileId === p.id);
    const live = !stored && snapshot ? await evaluateLive(db, opp, snapshot) : null;
    assessments.push({
      profile: p,
      stored,
      live,
      overrides: overrides.filter((o) => o.o.profileId === p.id).map((o) => ({ ...o.o, userName: o.userName })),
      workflow: workflows.find((w) => w.profileId === p.id) ?? null,
      history: matches.filter((m) => m.profileId === p.id),
    });
  }

  // Most relevant profile first: stored matches by score, then live-only evaluations.
  assessments.sort((x, y) => {
    const sx = x.stored ? 1000 + x.stored.score : x.live?.score ?? 0;
    const sy = y.stored ? 1000 + y.stored.score : y.live?.score ?? 0;
    return sy - sx;
  });

  // Vault documents referenced by evidence suggestions.
  const evidenceDocIds = Array.from(
    new Set(
      assessments.flatMap((a) => (a.stored?.evidenceMatches ?? a.live?.evidenceMatches ?? []).map((e) => e.documentId).filter((x): x is string => !!x)),
    ),
  );
  const evidenceDocs = evidenceDocIds.length
    ? await db
        .select({ id: schema.profileDocuments.id, title: schema.profileDocuments.title })
        .from(schema.profileDocuments)
        .where(and(inArray(schema.profileDocuments.id, evidenceDocIds), eq(schema.profileDocuments.organizationId, organizationId)))
    : [];

  const [{ n: rawCount }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.rawRecords).where(eq(schema.rawRecords.opportunityId, opportunityId));

  return {
    opp,
    sources,
    documents,
    changes,
    analyses,
    currentAnalysisIds,
    requirements,
    assessments,
    decisions: decisions.map((d) => ({ ...d.d, userName: d.userName })),
    notes: notes.map((n) => ({ ...n.n, userName: n.userName })),
    watchlisted: watch.length > 0,
    audit: auditRows.map((r) => ({ ...r.a, userName: r.userName })),
    evidenceDocs,
    rawCount,
  };
}

export type OpportunityDetail = NonNullable<Awaited<ReturnType<typeof getOpportunityDetail>>>;
