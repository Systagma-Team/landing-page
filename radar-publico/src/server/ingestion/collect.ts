import { eq, sql } from "drizzle-orm";
import { schema, type Database } from "@/db";
import { addDays, localDateString, parseSourceDate } from "@/lib/dates";
import { compileTerms, findHits, prepareTexts } from "@/server/matching/text-match";
import { loadCurrentSnapshots } from "@/server/profiles/service";
import { sourceDefinition } from "@/server/sources/definitions";
import { getAdapter } from "@/server/sources/registry";
import type { CollectorMode, NormalizedOpportunity, SourceRecord } from "@/server/sources/types";
import { ingestRecord, type DetectedChange } from "./upsert";
import { sourceFailureAlert } from "@/server/alerts/rules";

export interface CollectorRunResult {
  runId: string | null;
  sourceKey: string;
  mode: CollectorMode;
  status: "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED";
  fetched: number;
  created: number;
  updated: number;
  unchanged: number;
  filtered: number;
  failedRecords: number;
  /** created or updated → need analysis + matching */
  touchedOpportunityIds: string[];
  changes: { opportunityId: string; changes: DetectedChange[] }[];
  error?: string;
}

const MAX_WINDOW_DAYS = 30;
const MAX_STORED_ERRORS = 50;
const FAILURE_ALERT_THRESHOLD = 3;

/** Cheap relevance filter (for high-volume PCA items): any positive term of any profile. */
export async function buildRelevancePrefilter(db: Database): Promise<(n: NormalizedOpportunity) => boolean> {
  const snapshots = await loadCurrentSnapshots(undefined, db);
  const terms = compileTerms(
    snapshots.flatMap((s) => [
      ...s.capabilities.flatMap((c) => c.terms),
      ...s.activities.flatMap((a) => a.keywords.map((k) => ({ term: k, weight: 1, caseSensitive: false }))),
    ]),
  );
  if (terms.length === 0) return () => false;
  return (n) => findHits(terms, prepareTexts({ object: n.objectDescription, complementary: n.complementaryInfo })).length > 0;
}

export function computeWindow(mode: CollectorMode, cursor: string | undefined, config: Record<string, unknown>, now: Date): { from: Date; to: Date } {
  if (mode === "proposta") {
    return { from: now, to: addDays(now, Number(config.proposalHorizonDays ?? 60)) };
  }
  const lookback = Number(config.initialLookbackDays ?? 3);
  const overlap = Number(config.overlapDays ?? 1);
  const cursorDate = cursor ? parseSourceDate(cursor) : null;
  let from = cursorDate ? addDays(cursorDate, -overlap) : addDays(now, -lookback);
  if (from > now) from = now;
  let to = now;
  // Catch up progressively instead of issuing one gigantic window.
  if (to.getTime() - from.getTime() > MAX_WINDOW_DAYS * 86_400_000) to = addDays(from, MAX_WINDOW_DAYS);
  return { from, to };
}

/**
 * Runs one collector of one source. Failures are recorded on the source and the run, and never
 * affect other sources (each collector is its own job). The cursor only advances on success.
 */
export async function runCollector(
  db: Database,
  sourceKey: string,
  mode: CollectorMode,
  opts: { now?: Date; log?: (msg: string) => void; force?: boolean } = {},
): Promise<CollectorRunResult> {
  const now = opts.now ?? new Date();
  const log = opts.log ?? ((m: string) => console.log(`[${sourceKey}:${mode}] ${m}`));
  const [source] = await db.select().from(schema.sources).where(eq(schema.sources.key, sourceKey));
  const empty: CollectorRunResult = {
    runId: null, sourceKey, mode, status: "SKIPPED", fetched: 0, created: 0, updated: 0, unchanged: 0, filtered: 0, failedRecords: 0, touchedOpportunityIds: [], changes: [],
  };
  if (!source || (!source.enabled && !opts.force)) return empty;

  const config = { ...(sourceDefinition(sourceKey)?.defaultConfig ?? {}), ...source.config };
  const window = computeWindow(mode, source.cursors[mode], config, now);
  const [run] = await db
    .insert(schema.sourceRuns)
    .values({ sourceKey, collector: mode, windowFrom: localDateString(window.from), windowTo: localDateString(window.to), startedAt: now })
    .returning({ id: schema.sourceRuns.id });
  await db.update(schema.sources).set({ lastRunAt: now }).where(eq(schema.sources.key, sourceKey));

  const result: CollectorRunResult = { ...empty, runId: run.id, status: "SUCCESS" };
  const errors: { at: string; message: string }[] = [];
  const touched = new Set<string>();
  const adapter = getAdapter(sourceKey);
  const prefilter = mode === "pca" ? await buildRelevancePrefilter(db) : null;
  const ctx = {
    config,
    log: (msg: string) => {
      log(msg);
      if (msg.includes("limite de")) {
        result.status = "PARTIAL";
        if (errors.length < MAX_STORED_ERRORS) errors.push({ at: new Date().toISOString(), message: msg });
      }
    },
  };

  let fatal: Error | null = null;
  try {
    const records: AsyncIterable<SourceRecord> = mode === "pca" ? adapter.fetchProcurementPlans(window, ctx) : adapter.fetchOpportunities(mode, window, ctx);
    for await (const record of records) {
      result.fetched++;
      try {
        const normalized = adapter.normalize(record);
        if (!normalized) {
          result.failedRecords++;
          if (errors.length < MAX_STORED_ERRORS) errors.push({ at: new Date().toISOString(), message: `Registro não normalizável (${record.endpoint} ${record.sourceRecordId || "sem id"})` });
          continue;
        }
        if (prefilter && !prefilter(normalized)) {
          result.filtered++;
          continue;
        }
        const r = await ingestRecord(db, record, normalized, now);
        result[r.outcome]++;
        if (r.outcome !== "unchanged") touched.add(r.opportunityId);
        if (r.changes.length > 0) result.changes.push({ opportunityId: r.opportunityId, changes: r.changes });
      } catch (err) {
        result.failedRecords++;
        if (errors.length < MAX_STORED_ERRORS) errors.push({ at: new Date().toISOString(), message: `Falha ao processar ${record.sourceRecordId}: ${(err as Error).message}` });
      }
    }
  } catch (err) {
    fatal = err as Error;
    errors.push({ at: new Date().toISOString(), message: fatal.message });
    result.status = result.fetched > 0 ? "PARTIAL" : "FAILED";
    result.error = fatal.message;
  }

  result.touchedOpportunityIds = Array.from(touched);
  const finishedAt = new Date();
  await db
    .update(schema.sourceRuns)
    .set({
      status: result.status === "SKIPPED" ? "SUCCESS" : result.status,
      fetched: result.fetched,
      created: result.created,
      updated: result.updated,
      unchanged: result.unchanged,
      failedRecords: result.failedRecords,
      errors,
      finishedAt,
    })
    .where(eq(schema.sourceRuns.id, run.id));

  if (fatal) {
    const [updated] = await db
      .update(schema.sources)
      .set({
        lastStatus: result.status === "PARTIAL" ? "PARTIAL" : "FAILED",
        lastError: fatal.message.slice(0, 1000),
        consecutiveFailures: sql`${schema.sources.consecutiveFailures} + 1`,
        updatedAt: finishedAt,
      })
      .where(eq(schema.sources.key, sourceKey))
      .returning({ consecutiveFailures: schema.sources.consecutiveFailures });
    if ((updated?.consecutiveFailures ?? 0) >= FAILURE_ALERT_THRESHOLD) {
      await sourceFailureAlert(db, sourceKey, source.name, fatal.message, now).catch(() => undefined);
    }
  } else {
    const cursors = { ...source.cursors };
    if (mode !== "proposta") cursors[mode] = localDateString(window.to);
    await db
      .update(schema.sources)
      .set({
        cursors,
        lastStatus: result.status === "PARTIAL" ? "PARTIAL" : "SUCCESS",
        lastSuccessAt: finishedAt,
        lastError: null,
        lastRecordsCollected: result.fetched,
        consecutiveFailures: 0,
        updatedAt: finishedAt,
      })
      .where(eq(schema.sources.key, sourceKey));
  }
  log(`${result.status}: ${result.fetched} lidos, ${result.created} novos, ${result.updated} atualizados, ${result.unchanged} sem mudança, ${result.filtered} filtrados, ${result.failedRecords} falhas`);
  if (fatal) throw Object.assign(fatal, { collectorResult: result });
  return result;
}
