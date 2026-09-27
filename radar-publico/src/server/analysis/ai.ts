import { and, eq, sql } from "drizzle-orm";
import { schema, type Database } from "@/db";
import { hashObject, sha256 } from "@/lib/hash";
import { getAIProvider } from "@/server/ai";
import { AI_PROMPT_VERSION, AI_SCHEMA_VERSION, type AIProvider, type AISource } from "@/server/ai/types";
import { audit } from "@/server/audit";
import { detectCertificationLabel, extractCnaeCodes, validateRequirementEvidence } from "@/server/matching/requirements";

/** Upper bound of source text sent in one analysis (~75k tokens). Sources beyond it are recorded, not silently dropped. */
export const AI_MAX_SOURCE_CHARS = 300_000;

export interface AIAnalysisOutcome {
  status: "DISABLED" | "CACHED" | "OK" | "REFUSED" | "TRUNCATED" | "INVALID_OUTPUT" | "ERROR";
  analysisId?: string;
  verified?: number;
  unverified?: number;
  notAnalyzed?: string[];
}

/**
 * AI requirement extraction for one opportunity, after deterministic extraction.
 * Every item is checked against the source text: only VERIFIED items feed matching; UNVERIFIED items
 * are stored and shown as "não confirmado na fonte", never as fact.
 */
export async function analyzeOpportunityWithAI(db: Database, opportunityId: string, opts: { provider?: AIProvider | null } = {}): Promise<AIAnalysisOutcome> {
  const provider = opts.provider === undefined ? getAIProvider() : opts.provider;
  if (!provider) return { status: "DISABLED" };

  const [opp] = await db.select().from(schema.opportunities).where(eq(schema.opportunities.id, opportunityId));
  if (!opp) throw new Error("Oportunidade não encontrada");
  const docs = await db
    .select({ id: schema.opportunityDocuments.id, title: schema.opportunityDocuments.title, text: schema.opportunityDocuments.extractedText })
    .from(schema.opportunityDocuments)
    .where(and(eq(schema.opportunityDocuments.opportunityId, opportunityId), eq(schema.opportunityDocuments.active, true)));

  const candidates: AISource[] = [
    { ref: "field:objectDescription", label: "Objeto da contratação", text: opp.objectDescription },
    ...(opp.complementaryInfo ? [{ ref: "field:complementaryInfo", label: "Informações complementares", text: opp.complementaryInfo }] : []),
    ...docs.filter((d) => d.text?.trim()).map((d) => ({ ref: `document:${d.id}`, label: d.title, text: d.text as string })),
  ];
  const sources: AISource[] = [];
  const notAnalyzed: string[] = [];
  let budget = AI_MAX_SOURCE_CHARS;
  for (const s of candidates) {
    if (s.text.length <= budget) {
      sources.push(s);
      budget -= s.text.length;
    } else {
      notAnalyzed.push(`${s.label} (${s.text.length} caracteres — acima do limite por análise)`);
    }
  }

  const inputHash = hashObject({ schema: AI_SCHEMA_VERSION, prompt: AI_PROMPT_VERSION, model: provider.model, sources: sources.map((s) => [s.ref, sha256(s.text)]) });
  const [cached] = await db
    .select({ id: schema.opportunityAnalyses.id })
    .from(schema.opportunityAnalyses)
    .where(
      and(
        eq(schema.opportunityAnalyses.opportunityId, opportunityId),
        eq(schema.opportunityAnalyses.analyzer, "AI"),
        eq(schema.opportunityAnalyses.schemaVersion, AI_SCHEMA_VERSION),
        eq(schema.opportunityAnalyses.inputHash, inputHash),
      ),
    );
  if (cached) return { status: "CACHED", analysisId: cached.id };

  const result = await provider.extractRequirements({ title: opp.title, sources });
  const base = {
    opportunityId,
    analyzer: "AI" as const,
    provider: provider.name,
    model: result.model,
    promptVersion: AI_PROMPT_VERSION,
    schemaVersion: AI_SCHEMA_VERSION,
    inputHash,
    sourceDocumentIds: sources.filter((s) => s.ref.startsWith("document:")).map((s) => s.ref.slice(9)),
  };

  if (result.status !== "OK") {
    const [row] = await db
      .insert(schema.opportunityAnalyses)
      .values({ ...base, status: result.status, error: result.error, output: { notAnalyzed } })
      .onConflictDoNothing()
      .returning({ id: schema.opportunityAnalyses.id });
    await audit({ organizationId: null, userId: null, action: "ai.analysis_failed", entityType: "opportunity", entityId: opportunityId, metadata: { status: result.status, error: result.error, model: result.model } });
    return { status: result.status, analysisId: row?.id, notAnalyzed };
  }

  const sourceMap = new Map(sources.map((s) => [s.ref, s.text]));
  const check = (item: { description?: string; name?: string; text?: string; supporting_quote: string; source_ref: string }) =>
    validateRequirementEvidence({ description: item.description ?? item.name ?? item.text ?? "", supportingText: item.supporting_quote, sourceRef: item.source_ref }, sourceMap);

  const out = result.output;
  const annotated = {
    objective: out.objective.map((i) => ({ ...i, ...check(i) })),
    required_services: out.required_services.map((i) => ({ ...i, ...check(i) })),
    technologies: out.technologies.map((i) => ({ ...i, ...check(i) })),
    deliverables: out.deliverables.map((i) => ({ ...i, ...check(i) })),
    risks: out.risks.map((i) => ({ ...i, ...check(i) })),
  };
  const requirements = out.requirements.map((r) => {
    const v = check(r);
    const attributes: Record<string, unknown> = { page: r.page > 0 ? r.page : null, validationReason: v.reason };
    if (r.category === "CERTIFICATE") attributes.certification = detectCertificationLabel(`${r.description} ${r.supporting_quote}`) ?? r.description;
    if (r.category === "CNAE") attributes.codes = extractCnaeCodes(r.supporting_quote);
    return { r, v, attributes };
  });

  const analysisId = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.opportunityAnalyses)
      .values({ ...base, status: "OK", output: { ...annotated, notAnalyzed, usage: result.usage ?? null } })
      .onConflictDoNothing()
      .returning({ id: schema.opportunityAnalyses.id });
    if (!row) return null;
    if (requirements.length > 0) {
      await tx.insert(schema.opportunityRequirements).values(
        requirements.map(({ r, v, attributes }) => ({
          opportunityId,
          analysisId: row.id,
          category: r.category,
          ruleId: "ai",
          description: r.description.slice(0, 500),
          supportingText: r.supporting_quote.slice(0, 2000),
          sourceRef: r.source_ref.slice(0, 200),
          page: r.page > 0 ? r.page : null,
          verification: v.verification,
          confidence: null,
          attributes,
        })),
      );
    }
    return row.id;
  });

  const verified = requirements.filter((x) => x.v.verification === "VERIFIED").length;
  await audit({
    organizationId: null,
    userId: null,
    action: "ai.analysis",
    entityType: "opportunity",
    entityId: opportunityId,
    metadata: { provider: provider.name, model: result.model, schemaVersion: AI_SCHEMA_VERSION, verified, unverified: requirements.length - verified, notAnalyzed },
  });
  return { status: "OK", analysisId: analysisId ?? undefined, verified, unverified: requirements.length - verified, notAnalyzed };
}

/** Cost control: only opportunities that already matter (relevant match, watchlist, active workflow). */
export async function aiCandidates(db: Database, limit = 20): Promise<string[]> {
  const now = new Date();
  const rows = await db.execute<{ id: string }>(sql`
    select o.id from ${schema.opportunities} o
    where o.status <> 'CANCELLED' and (o.proposal_deadline is null or o.proposal_deadline > ${now})
      and (
        exists (select 1 from ${schema.opportunityMatches} m where m.opportunity_id = o.id and m.is_current and m.score >= 55)
        or exists (select 1 from ${schema.watchlist} w where w.opportunity_id = o.id)
        or exists (select 1 from ${schema.opportunityWorkflows} f where f.opportunity_id = o.id and f.status in ('INTERESTED','ANALYZING_DOCUMENTS','PREPARING_PROPOSAL'))
      )
      and not exists (
        select 1 from ${schema.opportunityAnalyses} a where a.opportunity_id = o.id and a.analyzer = 'AI' and a.created_at > o.updated_at
      )
    order by o.proposal_deadline asc nulls last
    limit ${limit}`);
  return rows.rows.map((r) => r.id);
}
