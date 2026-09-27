import { and, desc, eq } from "drizzle-orm";
import { schema, type Database } from "@/db";
import { audit } from "@/server/audit";
import { hasRole, type Role } from "@/server/auth/roles";

export interface Actor {
  id: string;
  organizationId: string;
  role: Role;
  ip?: string | null;
}

export type WorkflowStatus = (typeof schema.workflowStatus.enumValues)[number];

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowError";
  }
}

/** States only automation may derive (never persisted by humans as a decision). */
export const AUTOMATIC_STATES: WorkflowStatus[] = ["NEW", "AUTOMATICALLY_ANALYZED", "REVIEW_REQUIRED"];

/** States a human can choose. SUBMITTED_EXTERNALLY records that a person submitted outside the platform. */
export const HUMAN_STATES: WorkflowStatus[] = [
  "INTERESTED",
  "ANALYZING_DOCUMENTS",
  "PREPARING_PROPOSAL",
  "READY_FOR_HUMAN_SUBMISSION",
  "SUBMITTED_EXTERNALLY",
  "WON",
  "LOST",
  "DISCARDED",
  "CANCELLED",
];

export const DISCARD_REASONS: Record<string, string> = {
  INCOMPATIBLE_ACTIVITY: "Atividade incompatível",
  LOW_VALUE: "Valor baixo",
  INSUFFICIENT_CAPACITY: "Capacidade insuficiente",
  INSUFFICIENT_TIME: "Prazo insuficiente",
  MISSING_QUALIFICATION: "Falta qualificação",
  OUTSIDE_STRATEGY: "Fora da estratégia",
  NOT_FINANCIALLY_VIABLE: "Inviável financeiramente",
  IRRELEVANT_SCOPE: "Escopo irrelevante",
  OTHER: "Outro",
};

export const INTEREST_REASONS: Record<string, string> = {
  STRONG_FIT: "Aderência forte ao portfólio",
  STRATEGIC: "Estratégica",
  GOOD_VALUE: "Valor atrativo",
  EXISTING_EVIDENCE: "Temos evidências/atestados",
  OTHER: "Outro",
};

function assertRole(actor: Actor, role: Role) {
  if (!hasRole(actor.role, role)) throw new WorkflowError("Sem permissão para esta ação");
}

async function assertProfileInOrg(db: Database, actor: Actor, profileId: string) {
  const [p] = await db
    .select({ id: schema.procurementProfiles.id })
    .from(schema.procurementProfiles)
    .where(and(eq(schema.procurementProfiles.id, profileId), eq(schema.procurementProfiles.organizationId, actor.organizationId)));
  if (!p) throw new WorkflowError("Perfil não encontrado");
}

/**
 * Human decision on an opportunity for one profile. The platform never submits anything:
 * SUBMITTED_EXTERNALLY can only be recorded by a person, with explicit confirmation that the
 * submission happened outside Radar Público.
 */
export async function setWorkflowStatus(
  db: Database,
  actor: Actor,
  input: {
    opportunityId: string;
    profileId: string;
    to: WorkflowStatus;
    reasonCode?: string | null;
    reasonText?: string | null;
    confirmManualSubmission?: boolean;
  },
): Promise<void> {
  assertRole(actor, "ANALYST");
  if (!HUMAN_STATES.includes(input.to)) throw new WorkflowError("Status não pode ser definido manualmente");
  await assertProfileInOrg(db, actor, input.profileId);
  if (input.to === "SUBMITTED_EXTERNALLY" && input.confirmManualSubmission !== true) {
    throw new WorkflowError("Confirme que a proposta foi enviada por uma pessoa, fora do Radar Público, no portal oficial.");
  }
  if (input.to === "DISCARDED" && input.reasonCode && !(input.reasonCode in DISCARD_REASONS)) {
    throw new WorkflowError("Motivo de descarte inválido");
  }
  if (input.to === "INTERESTED" && input.reasonCode && !(input.reasonCode in INTEREST_REASONS)) {
    throw new WorkflowError("Motivo inválido");
  }

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(schema.opportunityWorkflows)
      .where(
        and(
          eq(schema.opportunityWorkflows.organizationId, actor.organizationId),
          eq(schema.opportunityWorkflows.opportunityId, input.opportunityId),
          eq(schema.opportunityWorkflows.profileId, input.profileId),
        ),
      );
    const from = current?.status ?? null;
    if ((input.to === "WON" || input.to === "LOST") && from !== "SUBMITTED_EXTERNALLY") {
      throw new WorkflowError("Resultado só pode ser registrado após o envio externo ter sido registrado.");
    }
    if (current) {
      await tx.update(schema.opportunityWorkflows).set({ status: input.to, updatedAt: new Date() }).where(eq(schema.opportunityWorkflows.id, current.id));
    } else {
      await tx.insert(schema.opportunityWorkflows).values({
        organizationId: actor.organizationId,
        opportunityId: input.opportunityId,
        profileId: input.profileId,
        status: input.to,
      });
    }
    await tx.insert(schema.opportunityDecisions).values({
      organizationId: actor.organizationId,
      opportunityId: input.opportunityId,
      profileId: input.profileId,
      fromStatus: from,
      toStatus: input.to,
      reasonCode: input.reasonCode ?? null,
      reasonText: input.reasonText?.trim() || null,
      userId: actor.id,
    });
    await audit(
      {
        organizationId: actor.organizationId,
        userId: actor.id,
        action: "workflow.status_changed",
        entityType: "opportunity",
        entityId: input.opportunityId,
        before: { status: from },
        after: { status: input.to, profileId: input.profileId, reasonCode: input.reasonCode ?? null },
        metadata: input.to === "SUBMITTED_EXTERNALLY" ? { manualSubmissionConfirmed: true } : {},
        ip: actor.ip,
      },
      tx,
    );
  });
}

export async function toggleWatchlist(db: Database, actor: Actor, opportunityId: string): Promise<boolean> {
  assertRole(actor, "ANALYST");
  const [existing] = await db
    .select()
    .from(schema.watchlist)
    .where(and(eq(schema.watchlist.organizationId, actor.organizationId), eq(schema.watchlist.opportunityId, opportunityId)));
  if (existing) {
    await db.delete(schema.watchlist).where(eq(schema.watchlist.id, existing.id));
  } else {
    await db.insert(schema.watchlist).values({ organizationId: actor.organizationId, opportunityId, addedBy: actor.id }).onConflictDoNothing();
  }
  await audit({ organizationId: actor.organizationId, userId: actor.id, action: existing ? "watchlist.removed" : "watchlist.added", entityType: "opportunity", entityId: opportunityId, ip: actor.ip });
  return !existing;
}

export async function addNote(db: Database, actor: Actor, input: { opportunityId: string; profileId?: string | null; body: string }): Promise<void> {
  assertRole(actor, "ANALYST");
  const body = input.body.trim();
  if (!body) throw new WorkflowError("Nota vazia");
  if (body.length > 5000) throw new WorkflowError("Nota muito longa (máx. 5000 caracteres)");
  if (input.profileId) await assertProfileInOrg(db, actor, input.profileId);
  const [note] = await db
    .insert(schema.opportunityNotes)
    .values({ organizationId: actor.organizationId, opportunityId: input.opportunityId, profileId: input.profileId ?? null, userId: actor.id, body })
    .returning({ id: schema.opportunityNotes.id });
  await audit({ organizationId: actor.organizationId, userId: actor.id, action: "note.added", entityType: "opportunity", entityId: input.opportunityId, after: { noteId: note.id }, ip: actor.ip });
}

export type OverrideField = (typeof schema.overrideField.enumValues)[number];

/**
 * Manual override of an automatic assessment. The automatic match row is never modified:
 * the override stores both values, who changed it, when and why.
 */
export async function overrideMatch(
  db: Database,
  actor: Actor,
  input: { opportunityId: string; profileId: string; field: OverrideField; manualValue: unknown; reason: string },
): Promise<string> {
  assertRole(actor, "ANALYST");
  await assertProfileInOrg(db, actor, input.profileId);
  const reason = input.reason.trim();
  if (reason.length < 5) throw new WorkflowError("Informe o motivo da alteração manual");
  if (input.field === "SCORE") {
    const v = Number(input.manualValue);
    if (!Number.isInteger(v) || v < 0 || v > 100) throw new WorkflowError("Score manual deve ser um inteiro entre 0 e 100");
    input.manualValue = v;
  }
  if (input.field === "COMPATIBILITY_STATUS" && !schema.compatibilityStatus.enumValues.includes(input.manualValue as never)) {
    throw new WorkflowError("Status de compatibilidade inválido");
  }

  const [match] = await db
    .select()
    .from(schema.opportunityMatches)
    .where(
      and(
        eq(schema.opportunityMatches.organizationId, actor.organizationId),
        eq(schema.opportunityMatches.opportunityId, input.opportunityId),
        eq(schema.opportunityMatches.profileId, input.profileId),
        eq(schema.opportunityMatches.isCurrent, true),
      ),
    );
  const automaticValue =
    input.field === "SCORE"
      ? match?.score ?? null
      : input.field === "COMPATIBILITY_STATUS"
        ? match?.status ?? null
        : input.field === "SERVICE_MAPPING"
          ? match?.serviceMatches.map((s) => s.name) ?? null
          : input.field === "RISK"
            ? match?.riskFlags ?? null
            : null;

  return db.transaction(async (tx) => {
    await tx
      .update(schema.matchOverrides)
      .set({ active: false })
      .where(
        and(
          eq(schema.matchOverrides.organizationId, actor.organizationId),
          eq(schema.matchOverrides.opportunityId, input.opportunityId),
          eq(schema.matchOverrides.profileId, input.profileId),
          eq(schema.matchOverrides.field, input.field),
          eq(schema.matchOverrides.active, true),
        ),
      );
    const [row] = await tx
      .insert(schema.matchOverrides)
      .values({
        organizationId: actor.organizationId,
        opportunityId: input.opportunityId,
        profileId: input.profileId,
        matchId: match?.id ?? null,
        field: input.field,
        automaticValue,
        manualValue: input.manualValue,
        reason,
        userId: actor.id,
      })
      .returning({ id: schema.matchOverrides.id });
    await audit(
      {
        organizationId: actor.organizationId,
        userId: actor.id,
        action: "match.overridden",
        entityType: "opportunity",
        entityId: input.opportunityId,
        before: { field: input.field, value: automaticValue },
        after: { field: input.field, value: input.manualValue, reason },
        ip: actor.ip,
      },
      tx,
    );
    return row.id;
  });
}

export async function revokeOverride(db: Database, actor: Actor, overrideId: string): Promise<void> {
  assertRole(actor, "ANALYST");
  const [row] = await db
    .update(schema.matchOverrides)
    .set({ active: false })
    .where(and(eq(schema.matchOverrides.id, overrideId), eq(schema.matchOverrides.organizationId, actor.organizationId)))
    .returning();
  if (row) {
    await audit({ organizationId: actor.organizationId, userId: actor.id, action: "match.override_revoked", entityType: "opportunity", entityId: row.opportunityId, before: { field: row.field, value: row.manualValue }, ip: actor.ip });
  }
}

export interface EffectiveAssessment {
  automatic: { score: number | null; status: string | null };
  manual: { score?: { value: number; reason: string; userId: string; at: Date }; status?: { value: string; reason: string; userId: string; at: Date } };
  score: number | null;
  status: string | null;
}

/** Effective values shown to users: manual when present, automatic otherwise — both always visible. */
export async function effectiveAssessment(db: Database, organizationId: string, opportunityId: string, profileId: string): Promise<EffectiveAssessment> {
  const [match] = await db
    .select({ score: schema.opportunityMatches.score, status: schema.opportunityMatches.status })
    .from(schema.opportunityMatches)
    .where(
      and(
        eq(schema.opportunityMatches.organizationId, organizationId),
        eq(schema.opportunityMatches.opportunityId, opportunityId),
        eq(schema.opportunityMatches.profileId, profileId),
        eq(schema.opportunityMatches.isCurrent, true),
      ),
    );
  const overrides = await db
    .select()
    .from(schema.matchOverrides)
    .where(
      and(
        eq(schema.matchOverrides.organizationId, organizationId),
        eq(schema.matchOverrides.opportunityId, opportunityId),
        eq(schema.matchOverrides.profileId, profileId),
        eq(schema.matchOverrides.active, true),
      ),
    )
    .orderBy(desc(schema.matchOverrides.createdAt));
  const scoreO = overrides.find((o) => o.field === "SCORE");
  const statusO = overrides.find((o) => o.field === "COMPATIBILITY_STATUS");
  return {
    automatic: { score: match?.score ?? null, status: match?.status ?? null },
    manual: {
      score: scoreO ? { value: Number(scoreO.manualValue), reason: scoreO.reason, userId: scoreO.userId, at: scoreO.createdAt } : undefined,
      status: statusO ? { value: String(statusO.manualValue), reason: statusO.reason, userId: statusO.userId, at: statusO.createdAt } : undefined,
    },
    score: scoreO ? Number(scoreO.manualValue) : match?.score ?? null,
    status: statusO ? String(statusO.manualValue) : match?.status ?? null,
  };
}
