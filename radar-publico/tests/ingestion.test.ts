import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { closeDb, schema, type Database } from "@/db";
import { runCollector } from "@/server/ingestion/collect";
import { ingestRecord } from "@/server/ingestion/upsert";
import { processOpportunities } from "@/server/ingestion/pipeline";
import { matchOpportunities } from "@/server/matching/run";
import { commitProfileVersion } from "@/server/profiles/service";
import { setAdapter } from "@/server/sources/registry";
import { PncpAdapter } from "@/server/sources/pncp";
import { ComprasGovAdapter, normalizeComprasGovContratacao } from "@/server/sources/comprasgov";
import { effectiveAssessment, overrideMatch, setWorkflowStatus, toggleWatchlist, WorkflowError, type Actor } from "@/server/opportunities/workflow";
import { hashPassword } from "@/server/auth/password";
import { contratacao, fakeFetch, licensing, page, photography } from "./fixtures/pncp";
import { resetDatabase } from "./helpers/db";

const noSleep = async () => undefined;
const NOW = new Date("2026-09-27T12:00:00-03:00");

let db: Database;
let organizationId: string;
let analyst: Actor;

function usePncp(handler: Parameters<typeof fakeFetch>[0]) {
  const f = fakeFetch(handler);
  setAdapter("pncp", new PncpAdapter({ fetchImpl: f.impl, sleep: noSleep, minIntervalMs: 0 }));
  return f;
}

function standardPncp(overridesFor45: Record<string, unknown> = {}) {
  return usePncp((url) => {
    if (!url.pathname.endsWith("/contratacoes/publicacao")) return { status: 404 };
    const modality = url.searchParams.get("codigoModalidadeContratacao");
    if (modality === "6") return { json: page([contratacao(overridesFor45), licensing]) };
    if (modality === "8") return { json: page([photography]) };
    return { status: 204 };
  });
}

async function profileId(slug: string) {
  const [p] = await db.select().from(schema.procurementProfiles).where(eq(schema.procurementProfiles.slug, slug));
  return p.id;
}

beforeEach(async () => {
  ({ db, organizationId } = await resetDatabase());
  await db.update(schema.sources).set({ config: { modalities: [6, 8], initialLookbackDays: 0, maxPagesPerModality: 3 } }).where(eq(schema.sources.key, "pncp"));
  const [user] = await db
    .insert(schema.users)
    .values({ organizationId, email: "analista@example.com", name: "Analista", role: "ANALYST", passwordHash: await hashPassword("senha-de-teste-123") })
    .returning();
  await db.insert(schema.users).values({ organizationId, email: "admin@example.com", name: "Admin", role: "ADMIN", passwordHash: await hashPassword("senha-de-teste-123") });
  analyst = { id: user.id, organizationId, role: "ANALYST" };
});

afterAll(async () => {
  await closeDb();
});

describe("ingestion", () => {
  it("scenario 1: the same PNCP opportunity collected twice yields one normalized opportunity", async () => {
    standardPncp();
    const first = await runCollector(db, "pncp", "publicacao", { now: NOW, log: () => undefined });
    expect(first.created).toBe(3);
    const second = await runCollector(db, "pncp", "publicacao", { now: NOW, log: () => undefined });
    // the overlap window re-reads records already stored: all unchanged, none created
    expect(second.created).toBe(0);
    expect(second.fetched).toBeGreaterThanOrEqual(3);
    expect(second.unchanged).toBe(second.fetched);

    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.opportunities);
    expect(n).toBe(3);
    const [{ raw }] = await db.select({ raw: sql<number>`count(*)::int` }).from(schema.rawRecords);
    expect(raw).toBe(3);
    const [opp] = await db.select().from(schema.opportunities).where(eq(schema.opportunities.pncpControlNumber, "12345678000190-1-000045/2026"));
    expect(opp.primarySource).toBe("pncp");
    expect(opp.sourceUrl).toBe("https://pncp.gov.br/app/editais/12345678000190/2026/45");
    expect(opp.state).toBe("PE");
    expect(opp.estimatedValue).toBe("850000.00");
    expect(opp.proposalDeadline?.toISOString()).toBe("2026-10-20T12:00:00.000Z");
  });

  it("a mirrored record from Compras.gov.br merges into the PNCP opportunity instead of duplicating", async () => {
    standardPncp();
    await runCollector(db, "pncp", "publicacao", { now: NOW, log: () => undefined });
    const mirror = {
      numeroControlePNCP: "12345678000190-1-000045/2026",
      codigoModalidade: 6,
      objetoCompra: "CONTRATAÇÃO DE EMPRESA ESPECIALIZADA PARA DESENVOLVIMENTO DE SISTEMAS WEB",
      orgaoEntidadeCnpj: "12345678000190",
      anoCompraPncp: 2026,
      sequencialCompraPncp: 45,
      numeroCompra: "00045/2026",
      valorTotalEstimado: 850000,
      dataEncerramentoPropostaPncp: "2026-10-20T09:00:00",
    };
    const f = fakeFetch(() => ({ json: { resultado: [mirror], totalPaginas: 1 } }));
    setAdapter("comprasgov", new ComprasGovAdapter({ fetchImpl: f.impl, sleep: noSleep, minIntervalMs: 0 }));
    await db.update(schema.sources).set({ enabled: true, config: { modalities: [6], initialLookbackDays: 0 } }).where(eq(schema.sources.key, "comprasgov"));
    const r = await runCollector(db, "comprasgov", "publicacao", { now: NOW, log: () => undefined });
    expect(r.created).toBe(0);
    expect(r.unchanged).toBe(1);
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.opportunities);
    expect(n).toBe(3);
    const links = await db.select().from(schema.opportunitySources).where(eq(schema.opportunitySources.sourceRecordId, "12345678000190-1-000045/2026"));
    expect(links.map((l) => l.sourceKey).sort()).toEqual(["comprasgov", "pncp"]);
    expect(normalizeComprasGovContratacao({ objetoCompra: "sem número de controle" })).toBeNull();
  });

  it("scenario 7: a deadline change is stored in history and alerts organisations following the opportunity", async () => {
    standardPncp();
    const r1 = await runCollector(db, "pncp", "publicacao", { now: NOW, log: () => undefined });
    await processOpportunities(db, r1.touchedOpportunityIds, r1.changes, { now: NOW });
    const [opp] = await db.select().from(schema.opportunities).where(eq(schema.opportunities.pncpControlNumber, "12345678000190-1-000045/2026"));
    await toggleWatchlist(db, analyst, opp.id);

    standardPncp({ dataEncerramentoProposta: "2026-10-30T09:00:00", dataAtualizacaoGlobal: "2026-09-27T09:00:00" });
    const r2 = await runCollector(db, "pncp", "publicacao", { now: NOW, log: () => undefined });
    expect(r2.updated).toBe(1);
    const history = await db.select().from(schema.opportunityChanges).where(eq(schema.opportunityChanges.opportunityId, opp.id));
    expect(history).toHaveLength(1);
    expect(history[0].type).toBe("DEADLINE_CHANGED");
    expect(history[0].oldValue).toBe("2026-10-20T12:00:00.000Z");
    expect(history[0].newValue).toBe("2026-10-30T12:00:00.000Z");

    await processOpportunities(db, r2.touchedOpportunityIds, r2.changes, { now: NOW });
    const alerts = await db.select().from(schema.alerts).where(and(eq(schema.alerts.opportunityId, opp.id), eq(schema.alerts.type, "DEADLINE_CHANGED")));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].body).toContain("30/10/2026");

    // reprocessing the same change does not duplicate alerts
    await processOpportunities(db, r2.touchedOpportunityIds, r2.changes, { now: NOW });
    const again = await db.select().from(schema.alerts).where(eq(schema.alerts.type, "DEADLINE_CHANGED"));
    expect(again).toHaveLength(1);
  });

  it("scenario 8: an unavailable source is retried, fails on its own and does not stop other sources", async () => {
    const down = usePncp(() => ({ status: 503, text: "Service Unavailable" }));
    await expect(runCollector(db, "pncp", "publicacao", { now: NOW, log: () => undefined })).rejects.toThrow(/503/);
    expect(down.calls.length).toBe(5); // 1 attempt + 4 retries
    const [src] = await db.select().from(schema.sources).where(eq(schema.sources.key, "pncp"));
    expect(src.lastStatus).toBe("FAILED");
    expect(src.consecutiveFailures).toBe(1);
    expect(src.cursors.publicacao).toBeUndefined();
    const [run] = await db.select().from(schema.sourceRuns).where(eq(schema.sourceRuns.sourceKey, "pncp"));
    expect(run.status).toBe("FAILED");

    // Another source keeps working.
    const f = fakeFetch(() => ({ json: { resultado: [], totalPaginas: 0 } }));
    setAdapter("comprasgov", new ComprasGovAdapter({ fetchImpl: f.impl, sleep: noSleep, minIntervalMs: 0 }));
    await db.update(schema.sources).set({ enabled: true, config: { modalities: [6], initialLookbackDays: 0 } }).where(eq(schema.sources.key, "comprasgov"));
    const ok = await runCollector(db, "comprasgov", "publicacao", { now: NOW, log: () => undefined });
    expect(ok.status).toBe("SUCCESS");

    // WAF/HTML responses are treated as failures, not parsed.
    usePncp(() => ({ status: 200, text: "<html>captcha</html>", contentType: "text/html" }));
    await expect(runCollector(db, "pncp", "publicacao", { now: NOW, log: () => undefined })).rejects.toThrow(/HTML/);
    await expect(runCollector(db, "pncp", "publicacao", { now: NOW, log: () => undefined })).rejects.toThrow();
    const alerts = await db.select().from(schema.alerts).where(eq(schema.alerts.type, "SOURCE_FAILURE"));
    expect(alerts).toHaveLength(1);
    const deliveries = await db.select().from(schema.alertDeliveries).where(eq(schema.alertDeliveries.alertId, alerts[0].id));
    expect(deliveries).toHaveLength(1); // admins only

    // Recovery resets the failure counter and advances the cursor.
    standardPncp();
    await runCollector(db, "pncp", "publicacao", { now: NOW, log: () => undefined });
    const [recovered] = await db.select().from(schema.sources).where(eq(schema.sources.key, "pncp"));
    expect(recovered.consecutiveFailures).toBe(0);
    expect(recovered.cursors.publicacao).toBe("2026-09-27");
  });
});

describe("matching pipeline, overrides and human gate", () => {
  async function collectAndProcess() {
    standardPncp();
    const r = await runCollector(db, "pncp", "publicacao", { now: NOW, log: () => undefined });
    await processOpportunities(db, r.touchedOpportunityIds, r.changes, { now: NOW });
    const [strong] = await db.select().from(schema.opportunities).where(eq(schema.opportunities.pncpControlNumber, "12345678000190-1-000045/2026"));
    return strong;
  }

  it("runs Systagma and MEI matching separately on the same catalogue", async () => {
    const strong = await collectAndProcess();
    const systagma = await profileId("systagma");
    const mei = await profileId("mei");
    const matches = await db.select().from(schema.opportunityMatches).where(eq(schema.opportunityMatches.isCurrent, true));
    const sysMatch = matches.find((m) => m.opportunityId === strong.id && m.profileId === systagma)!;
    expect(sysMatch.score).toBeGreaterThanOrEqual(55);
    expect(sysMatch.serviceMatches.map((s) => s.name)).toEqual(expect.arrayContaining(["Software sob medida", "Integração de sistemas e APIs"]));
    expect(sysMatch.gaps.map((g) => g.code)).toContain("POTENTIAL_TECHNICAL_QUALIFICATION_GAP");
    // licensing opportunity: not stored as a Systagma match
    expect(matches.filter((m) => m.profileId === systagma)).toHaveLength(1);
    // MEI has no real data yet: nothing is inferred
    expect(matches.filter((m) => m.profileId === mei)).toHaveLength(0);

    // Requirements carry verbatim supporting text and a source reference
    const reqs = await db.select().from(schema.opportunityRequirements).where(eq(schema.opportunityRequirements.opportunityId, strong.id));
    const atestado = reqs.find((r) => r.ruleId === "atestado-capacidade-tecnica")!;
    expect(atestado.sourceRef).toBe("field:complementaryInfo");
    expect(atestado.supportingText).toContain("atestado de capacidade técnica");

    // Automation never writes human workflow decisions
    const flows = await db.select().from(schema.opportunityWorkflows);
    expect(flows).toHaveLength(0);
  });

  it("profile data is versioned: new MEI activities create a new version and old analyses stay traceable", async () => {
    await collectAndProcess();
    const mei = await profileId("mei");
    await db.insert(schema.profileActivities).values({
      organizationId,
      profileId: mei,
      type: "MEI_OCCUPATION",
      code: "7420-0/01",
      description: "Fotógrafo(a) independente",
      keywords: ["fotografia", "cobertura fotográfica"],
    });
    await db.update(schema.procurementProfiles).set({ preferredStates: ["PE"], maxProjectValue: "13000" }).where(eq(schema.procurementProfiles.id, mei));
    const v = await commitProfileVersion(db, mei, analyst.id, "Ocupação MEI adicionada");
    expect(v).toBe(2);

    const all = await db.select({ id: schema.opportunities.id }).from(schema.opportunities);
    await matchOpportunities(db, all.map((o) => o.id), { now: NOW });
    const meiMatches = await db.select().from(schema.opportunityMatches).where(and(eq(schema.opportunityMatches.profileId, mei), eq(schema.opportunityMatches.isCurrent, true)));
    expect(meiMatches).toHaveLength(1);
    expect(meiMatches[0].profileVersion).toBe(2);
    expect(["HIGH_COMPATIBILITY", "MEDIUM_COMPATIBILITY"]).toContain(meiMatches[0].status);

    const versions = await db.select().from(schema.profileVersions).where(eq(schema.profileVersions.profileId, mei));
    expect(versions.map((x) => x.version).sort()).toEqual([1, 2]);
    expect(versions.find((x) => x.version === 1)!.snapshot.activities).toHaveLength(0);
  });

  it("scenario 9: a manual score override preserves the automatic result", async () => {
    const strong = await collectAndProcess();
    const systagma = await profileId("systagma");
    const [before] = await db.select().from(schema.opportunityMatches).where(and(eq(schema.opportunityMatches.opportunityId, strong.id), eq(schema.opportunityMatches.profileId, systagma)));
    await overrideMatch(db, analyst, { opportunityId: strong.id, profileId: systagma, field: "SCORE", manualValue: 40, reason: "Escopo exige equipe local que não temos" });
    const eff = await effectiveAssessment(db, organizationId, strong.id, systagma);
    expect(eff.score).toBe(40);
    expect(eff.automatic.score).toBe(before.score);
    expect(eff.manual.score?.reason).toContain("equipe local");
    const [after] = await db.select().from(schema.opportunityMatches).where(eq(schema.opportunityMatches.id, before.id));
    expect(after.score).toBe(before.score);
    const [ov] = await db.select().from(schema.matchOverrides);
    expect(ov.automaticValue).toBe(before.score);
    expect(ov.manualValue).toBe(40);
    expect(ov.userId).toBe(analyst.id);
    const logs = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.action, "match.overridden"));
    expect(logs).toHaveLength(1);
    await expect(overrideMatch(db, analyst, { opportunityId: strong.id, profileId: systagma, field: "SCORE", manualValue: 40, reason: "" })).rejects.toThrow(WorkflowError);
  });

  it("scenario 10: the platform stops at the human submission gate", async () => {
    const strong = await collectAndProcess();
    const systagma = await profileId("systagma");
    const base = { opportunityId: strong.id, profileId: systagma };
    await setWorkflowStatus(db, analyst, { ...base, to: "INTERESTED", reasonCode: "STRONG_FIT" });
    await setWorkflowStatus(db, analyst, { ...base, to: "READY_FOR_HUMAN_SUBMISSION" });
    await expect(setWorkflowStatus(db, analyst, { ...base, to: "SUBMITTED_EXTERNALLY" })).rejects.toThrow(/fora do Radar Público/);
    await expect(setWorkflowStatus(db, analyst, { ...base, to: "WON" })).rejects.toThrow(WorkflowError);
    await expect(setWorkflowStatus(db, { ...analyst, role: "VIEWER" }, { ...base, to: "SUBMITTED_EXTERNALLY", confirmManualSubmission: true })).rejects.toThrow(/permissão/);
    await expect(setWorkflowStatus(db, analyst, { ...base, to: "AUTOMATICALLY_ANALYZED" as never })).rejects.toThrow(WorkflowError);
    await setWorkflowStatus(db, analyst, { ...base, to: "SUBMITTED_EXTERNALLY", confirmManualSubmission: true });
    const decisions = await db.select().from(schema.opportunityDecisions).where(eq(schema.opportunityDecisions.opportunityId, strong.id));
    expect(decisions.map((d) => d.toStatus)).toEqual(["INTERESTED", "READY_FOR_HUMAN_SUBMISSION", "SUBMITTED_EXTERNALLY"]);
    expect(decisions.every((d) => d.userId === analyst.id)).toBe(true);
    const [audit] = await db.select().from(schema.auditLogs).where(sql`${schema.auditLogs.metadata} ->> 'manualSubmissionConfirmed' = 'true'`);
    expect(audit.userId).toBe(analyst.id);
  });

  it("raises a single NEW_HIGH_MATCH alert per profile and opportunity", async () => {
    const systagma = await profileId("systagma");
    await db.insert(schema.profileActivities).values({
      organizationId,
      profileId: systagma,
      type: "CNAE_PRIMARY",
      code: "6201-5/01",
      description: "Desenvolvimento de programas de computador sob encomenda",
      keywords: ["desenvolvimento de sistemas", "sistemas web"],
    });
    await db.update(schema.procurementProfiles).set({ minProjectValue: "50000", maxProjectValue: "3000000" }).where(eq(schema.procurementProfiles.id, systagma));
    await db.insert(schema.technicalEvidence).values({
      organizationId,
      profileId: systagma,
      type: "ATESTADO_CAPACIDADE_TECNICA",
      title: "Atestado — Portal de serviços",
      capabilities: ["sistemas web", "integração de APIs", "Power BI"],
    });
    await commitProfileVersion(db, systagma, analyst.id, "Dados reais");

    const strong = await collectAndProcess();
    const [m] = await db.select().from(schema.opportunityMatches).where(and(eq(schema.opportunityMatches.opportunityId, strong.id), eq(schema.opportunityMatches.isCurrent, true)));
    expect(m.status).toBe("HIGH_COMPATIBILITY");
    expect(m.evidenceMatches).toHaveLength(1);
    const alerts = await db.select().from(schema.alerts).where(eq(schema.alerts.type, "NEW_HIGH_MATCH"));
    expect(alerts).toHaveLength(1);
    const deliveries = await db.select().from(schema.alertDeliveries).where(eq(schema.alertDeliveries.alertId, alerts[0].id));
    expect(deliveries.every((d) => d.channel === "IN_APP")).toBe(true);
    expect(deliveries).toHaveLength(2);

    // Next day: time-dependent re-match, still a single alert.
    await matchOpportunities(db, [strong.id], { now: new Date("2026-09-28T12:00:00-03:00") });
    await processOpportunities(db, [strong.id], [], { now: new Date("2026-09-28T12:00:00-03:00") });
    expect(await db.select().from(schema.alerts).where(eq(schema.alerts.type, "NEW_HIGH_MATCH"))).toHaveLength(1);
    const history = await db.select().from(schema.opportunityMatches).where(eq(schema.opportunityMatches.opportunityId, strong.id));
    expect(history.filter((h) => h.isCurrent)).toHaveLength(1);
    expect(history.length).toBeGreaterThanOrEqual(2);
  });
});
