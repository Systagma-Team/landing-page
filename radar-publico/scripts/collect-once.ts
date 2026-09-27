import { parseArgs } from "node:util";
import { closeDb, getDb } from "@/db";
import { runCollector } from "@/server/ingestion/collect";
import { discoverDocuments } from "@/server/ingestion/documents";
import { processOpportunities } from "@/server/ingestion/pipeline";
import type { CollectorMode } from "@/server/sources/types";

/** Manual run without the queue: npm run collect:once -- --source pncp --mode publicacao */
async function main() {
  const { values } = parseArgs({
    options: { source: { type: "string", default: "pncp" }, mode: { type: "string", default: "publicacao" }, force: { type: "boolean", default: false } },
  });
  const db = getDb();
  const result = await runCollector(db, values.source!, values.mode as CollectorMode, { force: values.force });
  const processed = await processOpportunities(db, result.touchedOpportunityIds, result.changes, { log: console.log });
  console.log(processed);
  const docs = await discoverDocuments(db, { log: console.log, limit: 20 });
  console.log(`Documentos: ${docs.checked} verificadas, ${docs.added} novos`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
