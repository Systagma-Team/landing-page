import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, schema, type Database } from "@/db";
import { analyzeOpportunityWithAI } from "@/server/analysis/ai";
import { processOpportunities } from "@/server/ingestion/pipeline";
import { ingestRecord } from "@/server/ingestion/upsert";
import { normalizePncpContratacao } from "@/server/sources/pncp";
import type { AIProvider, Extraction } from "@/server/ai/types";
import { contratacao } from "./fixtures/pncp";
import { resetDatabase } from "./helpers/db";

let db: Database;

/** Provider double: one genuine requirement, one invented (quote not in the source), one wrong number. */
function fakeProvider(calls: { n: number }): AIProvider {
  return {
    name: "fake",
    model: "fake-model",
    async extractRequirements({ sources }) {
      calls.n++;
      const info = sources.find((s) => s.ref === "field:complementaryInfo")!;
      const output: Extraction = {
        objective: [{ text: "Sistema web", supporting_quote: "desenvolvimento de sistemas web", source_ref: "field:objectDescription", page: 0 }],
        required_services: [],
        technologies: [{ name: "Power BI", supporting_quote: "painel gerencial em Power BI", source_ref: "field:objectDescription", page: 0 }],
        deliverables: [],
        risks: [],
        requirements: [
          { category: "TECHNICAL_QUALIFICATION", description: "Exige atestado de capacidade técnica", supporting_quote: info.text.slice(0, 80), source_ref: "field:complementaryInfo", page: 0 },
          { category: "CERTIFICATE", description: "Exige certificação ISO 9001", supporting_quote: "A licitante deverá possuir certificação ISO 9001 vigente.", source_ref: "field:complementaryInfo", page: 0 },
          { category: "EXECUTION_TIMEFRAME", description: "Prazo de execução de 24 meses", supporting_quote: "atestado de capacidade técnica compatível com o objeto", source_ref: "field:complementaryInfo", page: 0 },
        ],
      };
      return { status: "OK", output, model: "fake-model" };
    },
  };
}

beforeEach(async () => {
  ({ db } = await resetDatabase());
});
afterAll(async () => {
  await closeDb();
});

describe("AI analysis with hallucination protection", () => {
  it("scenario 6 (pipeline): invented requirements are stored as unverified and do not affect matching", async () => {
    const payload = contratacao();
    const n = normalizePncpContratacao(payload)!;
    const { opportunityId } = await ingestRecord(db, { endpoint: "t", sourceRecordId: n.sourceRecordId, payload }, n);
    await processOpportunities(db, [opportunityId]);

    const calls = { n: 0 };
    const r = await analyzeOpportunityWithAI(db, opportunityId, { provider: fakeProvider(calls) });
    expect(r.status).toBe("OK");
    expect(r.verified).toBe(1);
    expect(r.unverified).toBe(2);

    const aiReqs = await db.select().from(schema.opportunityRequirements).where(and(eq(schema.opportunityRequirements.opportunityId, opportunityId), eq(schema.opportunityRequirements.ruleId, "ai")));
    const iso = aiReqs.find((x) => x.category === "CERTIFICATE")!;
    expect(iso.verification).toBe("UNVERIFIED");
    expect(aiReqs.find((x) => x.category === "EXECUTION_TIMEFRAME")!.verification).toBe("UNVERIFIED");

    await processOpportunities(db, [opportunityId]);
    const [match] = await db.select().from(schema.opportunityMatches).where(and(eq(schema.opportunityMatches.opportunityId, opportunityId), eq(schema.opportunityMatches.isCurrent, true)));
    // The invented ISO 9001 requirement must not create a certification gap/blocker.
    expect(match.gaps.map((g) => g.required)).not.toContain("ISO 9001");
    expect(match.blockers.some((b) => b.message.includes("ISO 9001"))).toBe(false);

    const [analysis] = await db.select().from(schema.opportunityAnalyses).where(eq(schema.opportunityAnalyses.id, r.analysisId!));
    expect(analysis.provider).toBe("fake");
    expect(analysis.model).toBe("fake-model");
    expect(analysis.schemaVersion).toBe("ai-extract-v1");
    expect(analysis.promptVersion).toBeTruthy();

    // Unchanged input: cached, no second model call.
    const again = await analyzeOpportunityWithAI(db, opportunityId, { provider: fakeProvider(calls) });
    expect(again.status).toBe("CACHED");
    expect(calls.n).toBe(1);
  });

  it("does nothing when AI is disabled", async () => {
    const payload = contratacao();
    const n = normalizePncpContratacao(payload)!;
    const { opportunityId } = await ingestRecord(db, { endpoint: "t", sourceRecordId: n.sourceRecordId, payload }, n);
    expect((await analyzeOpportunityWithAI(db, opportunityId, { provider: null })).status).toBe("DISABLED");
  });
});
