/**
 * Background worker (run with `npm run worker`). Collectors never depend on a browser tab.
 * Each collector is an independent queue, so one failing source never blocks another.
 */
import { PgBoss, type Job } from "pg-boss";
import { closeDb, getDb } from "@/db";
import { deadlineAlerts, documentExpiryAlerts } from "@/server/alerts/rules";
import { dispatchPending } from "@/server/alerts/dispatch";
import { discoverDocuments } from "@/server/ingestion/documents";
import { runCollector, type CollectorRunResult } from "@/server/ingestion/collect";
import { processOpportunities } from "@/server/ingestion/pipeline";
import { rematchOpen } from "@/server/matching/rematch";
import { getAIProvider } from "@/server/ai";
import { aiCandidates, analyzeOpportunityWithAI } from "@/server/analysis/ai";
import { purgeExpiredSessionsWorker } from "./maintenance";
import { QUEUES, queueSpecs, TZ } from "./queues";
import type { CollectorMode } from "@/server/sources/types";
import type { DetectedChange } from "@/server/ingestion/upsert";

const log = (scope: string) => (msg: string) => console.log(`${new Date().toISOString()} [${scope}] ${msg}`);

interface ProcessJob {
  ids: string[];
  changes?: { opportunityId: string; changes: DetectedChange[] }[];
}

async function enqueueProcessing(boss: PgBoss, result: CollectorRunResult) {
  const CHUNK = 200;
  for (let i = 0; i < result.touchedOpportunityIds.length; i += CHUNK) {
    const ids = result.touchedOpportunityIds.slice(i, i + CHUNK);
    const idSet = new Set(ids);
    await boss.send(QUEUES.process, { ids, changes: result.changes.filter((c) => idSet.has(c.opportunityId)) } satisfies ProcessJob);
  }
  // Changes on opportunities that were otherwise unchanged cannot exist (a change implies an update).
}

async function main() {
  const boss = new PgBoss({ connectionString: process.env.DATABASE_URL!, schedule: true, supervise: true, migrate: true });
  boss.on("error", (e) => console.error("[pg-boss]", e));
  await boss.start();

  for (const spec of queueSpecs()) {
    await boss.createQueue(spec.name, spec.options).catch(() => undefined);
    if (spec.cron) await boss.schedule(spec.name, spec.cron, {}, { tz: TZ });
  }

  const db = getDb();

  // collectors
  for (const spec of queueSpecs().filter((s) => s.name.startsWith("collect-"))) {
    const [, sourceKey, mode] = spec.name.split("-") as [string, string, CollectorMode];
    await boss.work(spec.name, async ([job]: Job[]) => {
      const l = log(`${sourceKey}:${mode}`);
      l(`início (job ${job.id})`);
      try {
        const result = await runCollector(db, sourceKey, mode, { log: l, force: (job.data as { force?: boolean })?.force === true });
        await enqueueProcessing(boss, result);
      } catch (err) {
        const partial = (err as { collectorResult?: CollectorRunResult }).collectorResult;
        if (partial) await enqueueProcessing(boss, partial);
        throw err; // pg-boss retries with backoff; failure is already recorded on the source
      }
    });
  }

  await boss.work(QUEUES.process, async ([job]: Job[]) => {
    const data = job.data as ProcessJob;
    const r = await processOpportunities(db, data.ids ?? [], data.changes ?? [], { log: log("process") });
    log("process")(`${data.ids.length} oportunidades: ${r.analyzed} analisadas, ${r.matched} matches, ${r.alerts} alertas`);
  });

  await boss.work(QUEUES.documents, async () => {
    const l = log("documentos");
    const r = await discoverDocuments(db, { log: l });
    if (r.changes.length > 0) {
      await boss.send(QUEUES.process, { ids: r.changes.map((c) => c.opportunityId), changes: r.changes } satisfies ProcessJob);
    }
    l(`${r.checked} verificadas, ${r.added} documentos novos`);
  });

  await boss.work(QUEUES.daily, async () => {
    const l = log("diário");
    await rematchOpen(undefined, l);
    const d = await deadlineAlerts(db);
    const e = await documentExpiryAlerts(db);
    await purgeExpiredSessionsWorker();
    l(`${d} alertas de prazo, ${e} alertas de documentos`);
  });

  await boss.work(QUEUES.ai, async () => {
    const l = log("ia");
    if (!getAIProvider()) return; // AI_PROVIDER=disabled: deterministic rules only
    const ids = await aiCandidates(db, 20);
    const analyzed: string[] = [];
    for (const id of ids) {
      const r = await analyzeOpportunityWithAI(db, id);
      l(`${id}: ${r.status}${r.verified != null ? ` (${r.verified} verificados, ${r.unverified} não confirmados)` : ""}`);
      if (r.status === "OK") analyzed.push(id);
    }
    if (analyzed.length > 0) await processOpportunities(db, analyzed, [], { log: l });
  });

  await boss.work(QUEUES.rematch, async ([job]: Job[]) => {
    await rematchOpen((job.data as { organizationId?: string }).organizationId, log("rematch"));
  });

  await boss.work(QUEUES.dispatch, async () => {
    const r = await dispatchPending(db, "IMMEDIATE");
    if (r.sent + r.failed + r.skipped > 0) log("alertas")(`imediatos: ${r.sent} enviados, ${r.failed} falhas, ${r.skipped} ignorados`);
  });
  await boss.work(QUEUES.digestDaily, async () => {
    const r = await dispatchPending(db, "DAILY");
    log("alertas")(`resumo diário: ${r.sent} enviados, ${r.failed} falhas`);
  });
  await boss.work(QUEUES.digestWeekly, async () => {
    const r = await dispatchPending(db, "WEEKLY");
    log("alertas")(`resumo semanal: ${r.sent} enviados, ${r.failed} falhas`);
  });

  log("worker")("pronto");

  const shutdown = async () => {
    log("worker")("encerrando…");
    await boss.stop({ graceful: true, timeout: 30_000 }).catch(() => undefined);
    await closeDb();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (process.argv[1]?.endsWith("worker.ts") || process.argv[1]?.endsWith("worker.js")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
