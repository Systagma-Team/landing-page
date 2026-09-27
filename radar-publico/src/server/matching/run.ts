import { and, eq, inArray } from "drizzle-orm";
import { schema, type Database } from "@/db";
import { localDateString } from "@/lib/dates";
import { hashObject } from "@/lib/hash";
import { currentRequirements } from "@/server/analysis/rules";
import { loadCurrentSnapshots } from "@/server/profiles/service";
import { ENGINE_VERSION, matchOpportunity } from "./engine";
import type { MatchResult, OpportunityInput, ProfileSnapshot, RequirementInput } from "./types";

type OpportunityRow = typeof schema.opportunities.$inferSelect;
type MatchRow = typeof schema.opportunityMatches.$inferSelect;

export function toOpportunityInput(opp: OpportunityRow, requirements: RequirementInput[]): OpportunityInput {
  return {
    id: opp.id,
    kind: opp.kind,
    status: opp.status,
    title: opp.title,
    objectDescription: opp.objectDescription,
    complementaryInfo: opp.complementaryInfo,
    modalityCode: opp.modalityCode,
    state: opp.state,
    city: opp.city,
    estimatedValue: opp.estimatedValue == null ? null : Number(opp.estimatedValue),
    proposalDeadline: opp.proposalDeadline,
    expectedDate: opp.expectedDate,
    exclusiveMeEpp: opp.exclusiveMeEpp,
    innovationClass: opp.innovationClass,
    requirements,
  };
}

export interface MatchOutcome {
  opportunity: OpportunityRow;
  profile: ProfileSnapshot;
  previous: MatchRow | null;
  current: MatchRow | null;
  result: MatchResult;
  changed: boolean;
}

/**
 * Runs MEI and Systagma (and any other profile) matching separately for each opportunity.
 * A new match row is written only when inputs changed; the previous one is kept (is_current=false)
 * so past analyses stay traceable. Irrelevant opportunities are not persisted.
 */
export async function matchOpportunities(
  db: Database,
  opportunityIds: string[],
  opts: { now?: Date; snapshots?: (ProfileSnapshot & { snapshotHash: string })[]; organizationId?: string } = {},
): Promise<MatchOutcome[]> {
  if (opportunityIds.length === 0) return [];
  const now = opts.now ?? new Date();
  const snapshots = opts.snapshots ?? (await loadCurrentSnapshots(opts.organizationId, db));
  if (snapshots.length === 0) return [];
  const opportunities = await db.select().from(schema.opportunities).where(inArray(schema.opportunities.id, opportunityIds));
  const requirements = await currentRequirements(db, opportunityIds);
  const existing = await db
    .select()
    .from(schema.opportunityMatches)
    .where(and(inArray(schema.opportunityMatches.opportunityId, opportunityIds), eq(schema.opportunityMatches.isCurrent, true)));

  const outcomes: MatchOutcome[] = [];
  for (const opp of opportunities) {
    const reqs = requirements.get(opp.id) ?? [];
    const input = toOpportunityInput(opp, reqs);
    for (const profile of snapshots) {
      const previous = existing.find((m) => m.opportunityId === opp.id && m.profileId === profile.profileId) ?? null;
      const inputHash = hashObject({
        engine: ENGINE_VERSION,
        profile: profile.snapshotHash,
        opportunity: opp.contentHash,
        requirements: reqs.map((r) => r.id).sort(),
        // time-dependent dimensions (deadline, document validity) are re-evaluated daily
        day: localDateString(now),
      });
      if (previous && previous.inputHash === inputHash) continue;
      const result = matchOpportunity(input, profile, now);
      if (!result.relevant && !previous) continue;

      const current = await db.transaction(async (tx) => {
        if (previous) {
          await tx.update(schema.opportunityMatches).set({ isCurrent: false }).where(eq(schema.opportunityMatches.id, previous.id));
        }
        const [row] = await tx
          .insert(schema.opportunityMatches)
          .values({
            organizationId: profile.organizationId,
            opportunityId: opp.id,
            profileId: profile.profileId,
            profileVersion: profile.version,
            engineVersion: ENGINE_VERSION,
            inputHash,
            isCurrent: true,
            status: result.status,
            score: result.score,
            confidence: result.confidence,
            breakdown: result.breakdown,
            serviceMatches: result.serviceMatches,
            activityMatches: result.activityMatches,
            evidenceMatches: result.evidenceMatches,
            attention: result.attention,
            blockers: result.blockers,
            gaps: result.gaps,
            missingInformation: result.missingInformation,
            riskFlags: result.riskFlags,
            explanation: result.explanation,
            computedAt: now,
          })
          .returning();
        return row;
      });
      const changed = !previous || previous.status !== result.status || previous.score !== result.score;
      outcomes.push({ opportunity: opp, profile, previous, current, result, changed });
    }
  }
  return outcomes;
}

/** Live evaluation for display when no stored match exists (e.g. opportunity irrelevant to a profile). */
export async function evaluateLive(db: Database, opp: OpportunityRow, profile: ProfileSnapshot, now = new Date()): Promise<MatchResult> {
  const reqs = (await currentRequirements(db, [opp.id])).get(opp.id) ?? [];
  return matchOpportunity(toOpportunityInput(opp, reqs), profile, now);
}
