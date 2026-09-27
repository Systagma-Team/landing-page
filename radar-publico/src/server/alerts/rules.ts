import { and, eq, gte, inArray, isNotNull, lte, notInArray, sql } from "drizzle-orm";
import { schema, type Database } from "@/db";
import { addDays, daysUntil, formatDate, formatDateTime, localDateString } from "@/lib/dates";
import { formatBRL } from "@/lib/format";
import type { MatchOutcome } from "@/server/matching/run";
import type { DetectedChange } from "@/server/ingestion/upsert";
import { createAlert } from "./generate";

const HUMAN_ACTIVE_STATUSES = ["INTERESTED", "ANALYZING_DOCUMENTS", "PREPARING_PROPOSAL", "READY_FOR_HUMAN_SUBMISSION", "SUBMITTED_EXTERNALLY"] as const;

function isOpen(opp: { status: string; proposalDeadline: Date | null; kind: string }, now: Date): boolean {
  if (opp.status === "CANCELLED") return false;
  if (opp.kind === "FUTURE_PROCUREMENT") return true;
  return !opp.proposalDeadline || opp.proposalDeadline.getTime() > now.getTime();
}

/** NEW_HIGH_MATCH, NEW_PCA_MATCH and NEW_INNOVATION alerts from fresh match results. */
export async function alertsForMatches(db: Database, outcomes: MatchOutcome[], now = new Date()): Promise<number> {
  let created = 0;
  for (const o of outcomes) {
    if (!o.changed) continue;
    const { opportunity: opp, profile, result } = o;
    if (!isOpen(opp, now)) continue;
    const strong = result.status === "HIGH_COMPATIBILITY" || (result.score >= profile.scoring.alertMinScore && result.status === "REQUIRES_REVIEW");
    const where = [opp.organizationName, [opp.city, opp.state].filter(Boolean).join("/")].filter(Boolean).join(" · ");

    if (opp.kind === "FUTURE_PROCUREMENT") {
      if (["HIGH_COMPATIBILITY", "MEDIUM_COMPATIBILITY", "REQUIRES_REVIEW"].includes(result.status)) {
        const id = await createAlert(db, {
          organizationId: profile.organizationId,
          profileId: profile.profileId,
          type: "NEW_PCA_MATCH",
          severity: "INFO",
          title: `Radar futuro · ${profile.displayName}: ${result.serviceMatches[0]?.name ?? "possível demanda"} (${result.score}/100)`,
          body: `${opp.objectDescription.slice(0, 280)}\n${where}\nPrevisão: ${opp.expectedDate ? formatDate(opp.expectedDate) : "não informada"} · Sem edital publicado.`,
          opportunityId: opp.id,
          dedupKey: `pca:${profile.profileId}:${opp.id}`,
          score: result.score,
        });
        if (id) created++;
      }
      continue;
    }

    if (strong) {
      const deadline = opp.proposalDeadline ? `Prazo: ${formatDateTime(opp.proposalDeadline)} (${daysUntil(opp.proposalDeadline, now)} dias)` : "Prazo não informado";
      const id = await createAlert(db, {
        organizationId: profile.organizationId,
        profileId: profile.profileId,
        type: "NEW_HIGH_MATCH",
        severity: "ATTENTION",
        title: `${profile.displayName} ${result.score}/100 · ${opp.title}`,
        body: `${opp.objectDescription.slice(0, 280)}\n${where}\nValor estimado: ${formatBRL(opp.estimatedValue)} · ${deadline}\n${result.serviceMatches.slice(0, 4).map((m) => `✓ ${m.name}`).join("  ")}\nAnálise automática — revisão humana necessária.`,
        opportunityId: opp.id,
        dedupKey: `high:${profile.profileId}:${opp.id}`,
        score: result.score,
      });
      if (id) created++;
    }

    if (["CPSI", "ETEC", "COMPETITIVE_DIALOGUE"].includes(opp.innovationClass) && result.relevant) {
      const id = await createAlert(db, {
        organizationId: profile.organizationId,
        profileId: profile.profileId,
        type: "NEW_INNOVATION",
        severity: "INFO",
        title: `Radar de inovação · ${opp.title}`,
        body: `${opp.objectDescription.slice(0, 280)}\nEvidência: ${opp.innovationEvidence ?? "—"}`,
        opportunityId: opp.id,
        dedupKey: `innov:${profile.profileId}:${opp.id}`,
        score: result.score,
      });
      if (id) created++;
    }
  }
  return created;
}

/** Organisations following an opportunity: watchlist or an active human workflow. */
async function followers(db: Database, opportunityId: string): Promise<{ organizationId: string; profileId: string | null }[]> {
  const watch = await db.select({ organizationId: schema.watchlist.organizationId }).from(schema.watchlist).where(eq(schema.watchlist.opportunityId, opportunityId));
  const flows = await db
    .select({ organizationId: schema.opportunityWorkflows.organizationId, profileId: schema.opportunityWorkflows.profileId })
    .from(schema.opportunityWorkflows)
    .where(and(eq(schema.opportunityWorkflows.opportunityId, opportunityId), inArray(schema.opportunityWorkflows.status, [...HUMAN_ACTIVE_STATUSES])));
  const out = new Map<string, { organizationId: string; profileId: string | null }>();
  for (const w of watch) out.set(`${w.organizationId}:`, { organizationId: w.organizationId, profileId: null });
  for (const f of flows) out.set(`${f.organizationId}:${f.profileId}`, f);
  return Array.from(out.values());
}

const CHANGE_LABEL: Record<string, string> = {
  DEADLINE_CHANGED: "Prazo de proposta alterado",
  PROPOSAL_START_CHANGED: "Abertura de propostas alterada",
  VALUE_CHANGED: "Valor estimado alterado",
  STATUS_CHANGED: "Situação alterada",
  OBJECT_CHANGED: "Objeto alterado",
  DOCUMENT_ADDED: "Novo documento publicado",
};

function describeValue(field: string, v: unknown): string {
  if (v == null) return "—";
  if (field === "proposalDeadline" || field === "proposalStart") return formatDateTime(String(v));
  if (field === "estimatedValue") return formatBRL(String(v));
  if (field === "documents") return (v as { title?: string }).title ?? "documento";
  return String(v).slice(0, 160);
}

/** Change history → alerts for organisations that follow the opportunity. */
export async function alertsForChanges(db: Database, opportunityId: string, changes: DetectedChange[]): Promise<number> {
  const significant = changes.filter((c) => c.significant && c.id);
  if (significant.length === 0) return 0;
  const [opp] = await db.select().from(schema.opportunities).where(eq(schema.opportunities.id, opportunityId));
  if (!opp) return 0;
  const orgs = await followers(db, opportunityId);
  let created = 0;
  for (const f of orgs) {
    for (const c of significant) {
      const id = await createAlert(db, {
        organizationId: f.organizationId,
        profileId: f.profileId,
        type: c.type === "DEADLINE_CHANGED" ? "DEADLINE_CHANGED" : "OPPORTUNITY_UPDATED",
        severity: c.type === "STATUS_CHANGED" || c.type === "DEADLINE_CHANGED" ? "CRITICAL" : "ATTENTION",
        title: `${CHANGE_LABEL[c.type] ?? "Oportunidade atualizada"} · ${opp.title}`,
        body: `${opp.organizationName ?? ""}\nAntes: ${describeValue(c.field, c.oldValue)}\nAgora: ${describeValue(c.field, c.newValue)}`,
        opportunityId,
        dedupKey: `change:${c.id}:${f.profileId ?? "org"}`,
      });
      if (id) created++;
    }
  }
  return created;
}

/** Daily: DEADLINE_SOON (≤ 7 days) for followed or well-matched open opportunities. */
export async function deadlineAlerts(db: Database, now = new Date()): Promise<number> {
  const until = addDays(now, 7);
  const matches = await db
    .select({
      organizationId: schema.opportunityMatches.organizationId,
      profileId: schema.opportunityMatches.profileId,
      opportunityId: schema.opportunityMatches.opportunityId,
      score: schema.opportunityMatches.score,
      title: schema.opportunities.title,
      organizationName: schema.opportunities.organizationName,
      deadline: schema.opportunities.proposalDeadline,
    })
    .from(schema.opportunityMatches)
    .innerJoin(schema.opportunities, eq(schema.opportunities.id, schema.opportunityMatches.opportunityId))
    .where(
      and(
        eq(schema.opportunityMatches.isCurrent, true),
        inArray(schema.opportunityMatches.status, ["HIGH_COMPATIBILITY", "MEDIUM_COMPATIBILITY", "REQUIRES_REVIEW"]),
        isNotNull(schema.opportunities.proposalDeadline),
        gte(schema.opportunities.proposalDeadline, now),
        lte(schema.opportunities.proposalDeadline, until),
        notInArray(schema.opportunities.status, ["CANCELLED"]),
        // discarded opportunities do not produce reminders
        sql`not exists (select 1 from ${schema.opportunityWorkflows} w where w.opportunity_id = ${schema.opportunityMatches.opportunityId} and w.profile_id = ${schema.opportunityMatches.profileId} and w.status in ('DISCARDED','CANCELLED','LOST'))`,
      ),
    );
  const watched = await db
    .select({
      organizationId: schema.watchlist.organizationId,
      opportunityId: schema.watchlist.opportunityId,
      title: schema.opportunities.title,
      organizationName: schema.opportunities.organizationName,
      deadline: schema.opportunities.proposalDeadline,
    })
    .from(schema.watchlist)
    .innerJoin(schema.opportunities, eq(schema.opportunities.id, schema.watchlist.opportunityId))
    .where(and(isNotNull(schema.opportunities.proposalDeadline), gte(schema.opportunities.proposalDeadline, now), lte(schema.opportunities.proposalDeadline, until)));

  let created = 0;
  const all = [...matches.map((m) => ({ ...m, profileId: m.profileId as string | null })), ...watched.map((w) => ({ ...w, profileId: null, score: null }))];
  for (const m of all) {
    const days = daysUntil(m.deadline!, now);
    const id = await createAlert(db, {
      organizationId: m.organizationId,
      profileId: m.profileId,
      type: "DEADLINE_SOON",
      severity: days <= 2 ? "CRITICAL" : "ATTENTION",
      title: `Prazo em ${days} dia${days === 1 ? "" : "s"} · ${m.title}`,
      body: `${m.organizationName ?? ""}\nEncerramento das propostas: ${formatDateTime(m.deadline)}`,
      opportunityId: m.opportunityId,
      dedupKey: `deadline7:${m.profileId ?? "watch"}:${m.opportunityId}:${m.deadline!.toISOString()}`,
    });
    if (id) created++;
  }
  return created;
}

/** Daily: vault documents expiring in ≤ 30 days, ≤ 10 days, or already expired. */
export async function documentExpiryAlerts(db: Database, now = new Date()): Promise<number> {
  const horizon = localDateString(addDays(now, 30));
  const docs = await db
    .select({
      id: schema.profileDocuments.id,
      organizationId: schema.profileDocuments.organizationId,
      profileId: schema.profileDocuments.profileId,
      title: schema.profileDocuments.title,
      expiresOn: schema.profileDocuments.expiresOn,
      profileName: schema.procurementProfiles.displayName,
    })
    .from(schema.profileDocuments)
    .innerJoin(schema.procurementProfiles, eq(schema.procurementProfiles.id, schema.profileDocuments.profileId))
    .where(and(eq(schema.profileDocuments.archived, false), isNotNull(schema.profileDocuments.expiresOn), lte(schema.profileDocuments.expiresOn, horizon)));
  let created = 0;
  for (const d of docs) {
    const days = daysUntil(new Date(`${d.expiresOn}T23:59:59-03:00`), now);
    const bucket = days < 0 ? "expired" : days <= 10 ? "10" : "30";
    const id = await createAlert(db, {
      organizationId: d.organizationId,
      profileId: d.profileId,
      type: "DOCUMENT_EXPIRING",
      severity: days < 0 ? "CRITICAL" : days <= 10 ? "ATTENTION" : "INFO",
      title: days < 0 ? `Documento vencido · ${d.title}` : `Documento vence em ${days} dia${days === 1 ? "" : "s"} · ${d.title}`,
      body: `Perfil: ${d.profileName}\nValidade: ${formatDate(d.expiresOn)}`,
      profileDocumentId: d.id,
      dedupKey: `docexp:${d.id}:${d.expiresOn}:${bucket}`,
    });
    if (id) created++;
  }
  return created;
}

/** Collector failed repeatedly → admins are told once per day and source. */
export async function sourceFailureAlert(db: Database, sourceKey: string, sourceName: string, message: string, now = new Date()): Promise<void> {
  const orgs = await db.select({ id: schema.organizations.id }).from(schema.organizations);
  for (const org of orgs) {
    await createAlert(db, {
      organizationId: org.id,
      type: "SOURCE_FAILURE",
      severity: "CRITICAL",
      title: `Falha na coleta · ${sourceName}`,
      body: `${message.slice(0, 400)}\nAs demais fontes continuam operando normalmente.`,
      dedupKey: `srcfail:${sourceKey}:${localDateString(now)}`,
      roles: ["ADMIN"],
    });
  }
}
