import type { Database } from "@/db";
import { analyzeOpportunityRules } from "@/server/analysis/rules";
import { alertsForChanges, alertsForMatches } from "@/server/alerts/rules";
import { matchOpportunities } from "@/server/matching/run";
import { loadCurrentSnapshots } from "@/server/profiles/service";
import type { DetectedChange } from "./upsert";

/**
 * After ingestion: classification (rule-based requirements) → matching per profile → alerts.
 * Every step is idempotent and cached, so reprocessing the same ids is safe.
 */
export async function processOpportunities(
  db: Database,
  opportunityIds: string[],
  changes: { opportunityId: string; changes: DetectedChange[] }[] = [],
  opts: { now?: Date; log?: (msg: string) => void } = {},
): Promise<{ analyzed: number; matched: number; alerts: number }> {
  const log = opts.log ?? (() => undefined);
  let analyzed = 0;
  for (const id of opportunityIds) {
    try {
      const r = await analyzeOpportunityRules(db, id);
      if (!r.cached) analyzed++;
    } catch (err) {
      log(`análise por regras falhou para ${id}: ${(err as Error).message}`);
    }
  }
  const snapshots = await loadCurrentSnapshots(undefined, db);
  let matched = 0;
  let alerts = 0;
  const CHUNK = 100;
  for (let i = 0; i < opportunityIds.length; i += CHUNK) {
    const ids = opportunityIds.slice(i, i + CHUNK);
    const outcomes = await matchOpportunities(db, ids, { now: opts.now, snapshots });
    matched += outcomes.length;
    alerts += await alertsForMatches(db, outcomes, opts.now);
  }
  for (const c of changes) {
    alerts += await alertsForChanges(db, c.opportunityId, c.changes);
  }
  return { analyzed, matched, alerts };
}

