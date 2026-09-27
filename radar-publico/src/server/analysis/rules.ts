import { and, desc, eq, inArray } from "drizzle-orm";
import { schema, type Database } from "@/db";
import { hashObject, sha256 } from "@/lib/hash";
import { normalizeText } from "@/lib/text";
import { extractRequirementsByRules, RULES_SCHEMA_VERSION, type TextSource } from "@/server/matching/requirements";
import type { RequirementInput } from "@/server/matching/types";
import { baseSearchText } from "@/server/ingestion/upsert";

/**
 * Deterministic requirement analysis for one opportunity. Cached by input hash: when neither the
 * opportunity text nor its extracted documents changed, the previous analysis is reused.
 */
export async function analyzeOpportunityRules(db: Database, opportunityId: string): Promise<{ analysisId: string; cached: boolean; count: number }> {
  const [opp] = await db.select().from(schema.opportunities).where(eq(schema.opportunities.id, opportunityId));
  if (!opp) throw new Error("Oportunidade não encontrada");
  const docs = await db
    .select({ id: schema.opportunityDocuments.id, text: schema.opportunityDocuments.extractedText })
    .from(schema.opportunityDocuments)
    .where(and(eq(schema.opportunityDocuments.opportunityId, opportunityId), eq(schema.opportunityDocuments.active, true)));

  const sources: TextSource[] = [
    { ref: "field:objectDescription", text: opp.objectDescription },
    ...(opp.complementaryInfo ? [{ ref: "field:complementaryInfo", text: opp.complementaryInfo }] : []),
    ...docs.filter((d) => d.text && d.text.trim().length > 0).map((d) => ({ ref: `document:${d.id}`, text: d.text as string })),
  ];
  const inputHash = hashObject(sources.map((s) => [s.ref, sha256(s.text)]));

  const [cached] = await db
    .select({ id: schema.opportunityAnalyses.id })
    .from(schema.opportunityAnalyses)
    .where(
      and(
        eq(schema.opportunityAnalyses.opportunityId, opportunityId),
        eq(schema.opportunityAnalyses.analyzer, "RULES"),
        eq(schema.opportunityAnalyses.schemaVersion, RULES_SCHEMA_VERSION),
        eq(schema.opportunityAnalyses.inputHash, inputHash),
      ),
    );
  if (cached) return { analysisId: cached.id, cached: true, count: 0 };

  const requirements = extractRequirementsByRules(sources);
  return db.transaction(async (tx) => {
    const [analysis] = await tx
      .insert(schema.opportunityAnalyses)
      .values({
        opportunityId,
        analyzer: "RULES",
        provider: "deterministic",
        schemaVersion: RULES_SCHEMA_VERSION,
        inputHash,
        sourceDocumentIds: docs.map((d) => d.id),
        output: { requirementCount: requirements.length },
        status: "OK",
      })
      .onConflictDoNothing()
      .returning({ id: schema.opportunityAnalyses.id });
    if (!analysis) {
      // A concurrent run stored the same analysis.
      const [existing] = await tx
        .select({ id: schema.opportunityAnalyses.id })
        .from(schema.opportunityAnalyses)
        .where(and(eq(schema.opportunityAnalyses.opportunityId, opportunityId), eq(schema.opportunityAnalyses.inputHash, inputHash)));
      return { analysisId: existing.id, cached: true, count: 0 };
    }
    if (requirements.length > 0) {
      await tx.insert(schema.opportunityRequirements).values(
        requirements.map((r) => ({
          opportunityId,
          analysisId: analysis.id,
          category: r.category,
          ruleId: r.ruleId,
          description: r.description,
          supportingText: r.supportingText,
          sourceRef: r.sourceRef,
          page: (r.attributes.page as number | null) ?? null,
          verification: r.verification,
          confidence: (r.attributes.confidence as number | undefined) ?? null,
          attributes: r.attributes,
        })),
      );
    }
    // Requirements become searchable.
    const searchText = `${baseSearchText(opp)} ${normalizeText(requirements.map((r) => r.description).join(" "))}`.trim();
    await tx.update(schema.opportunities).set({ searchText }).where(eq(schema.opportunities.id, opportunityId));
    return { analysisId: analysis.id, cached: false, count: requirements.length };
  });
}

/** Requirements of the latest analysis per analyzer (rules and, when present, AI). */
export async function currentRequirements(db: Database, opportunityIds: string[]): Promise<Map<string, (RequirementInput & { id: string; analyzer: string })[]>> {
  const result = new Map<string, (RequirementInput & { id: string; analyzer: string })[]>();
  if (opportunityIds.length === 0) return result;
  const analyses = await db
    .select({ id: schema.opportunityAnalyses.id, opportunityId: schema.opportunityAnalyses.opportunityId, analyzer: schema.opportunityAnalyses.analyzer, createdAt: schema.opportunityAnalyses.createdAt })
    .from(schema.opportunityAnalyses)
    .where(and(inArray(schema.opportunityAnalyses.opportunityId, opportunityIds), eq(schema.opportunityAnalyses.status, "OK")))
    .orderBy(desc(schema.opportunityAnalyses.createdAt));
  const latest = new Map<string, { id: string; analyzer: string }>();
  for (const a of analyses) {
    const k = `${a.opportunityId}:${a.analyzer}`;
    if (!latest.has(k)) latest.set(k, { id: a.id, analyzer: a.analyzer });
  }
  const analysisIds = Array.from(latest.values()).map((a) => a.id);
  if (analysisIds.length === 0) return result;
  const rows = await db.select().from(schema.opportunityRequirements).where(inArray(schema.opportunityRequirements.analysisId, analysisIds));
  const analyzerOf = new Map(Array.from(latest.values()).map((a) => [a.id, a.analyzer]));
  for (const r of rows) {
    const list = result.get(r.opportunityId) ?? [];
    list.push({
      id: r.id,
      analyzer: analyzerOf.get(r.analysisId) ?? "RULES",
      category: r.category,
      ruleId: r.ruleId,
      description: r.description,
      supportingText: r.supportingText,
      sourceRef: r.sourceRef,
      attributes: r.attributes,
      verification: r.verification,
    });
    result.set(r.opportunityId, list);
  }
  return result;
}
