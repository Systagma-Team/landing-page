"use server";

import { refresh } from "next/cache";
import { getDb } from "@/db";
import { discoverDocuments } from "@/server/ingestion/documents";
import { processOpportunities } from "@/server/ingestion/pipeline";
import { analyzeOpportunityWithAI } from "@/server/analysis/ai";
import { addNote as addNoteService, overrideMatch, revokeOverride, setWorkflowStatus, toggleWatchlist, type OverrideField, type WorkflowStatus } from "@/server/opportunities/workflow";
import { actorWithRole, optStr, runAction, str, uuid } from "./helpers";
import type { ActionState } from "./types";

export async function toggleWatch(formData: FormData): Promise<void> {
  const actor = await actorWithRole("ANALYST");
  await toggleWatchlist(getDb(), actor, uuid(formData, "opportunityId"));
  refresh();
}

/** Card shortcut: interest or discard without reason (reasons can be added on the detail page). */
export async function quickDecision(formData: FormData): Promise<void> {
  const actor = await actorWithRole("ANALYST");
  const to = str(formData, "to") as WorkflowStatus;
  if (to !== "INTERESTED" && to !== "DISCARDED") return;
  await setWorkflowStatus(getDb(), actor, { opportunityId: uuid(formData, "opportunityId"), profileId: uuid(formData, "profileId"), to });
  refresh();
}

export async function decide(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorWithRole("ANALYST");
    await setWorkflowStatus(getDb(), actor, {
      opportunityId: uuid(formData, "opportunityId"),
      profileId: uuid(formData, "profileId"),
      to: str(formData, "to") as WorkflowStatus,
      reasonCode: optStr(formData, "reasonCode"),
      reasonText: optStr(formData, "reasonText"),
      confirmManualSubmission: formData.get("confirmManualSubmission") === "on",
    });
    refresh();
    return "Decisão registrada.";
  });
}

export async function override(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorWithRole("ANALYST");
    const field = str(formData, "field") as OverrideField;
    const raw = str(formData, "manualValue");
    await overrideMatch(getDb(), actor, {
      opportunityId: uuid(formData, "opportunityId"),
      profileId: uuid(formData, "profileId"),
      field,
      manualValue: field === "SCORE" ? Number(raw) : raw,
      reason: str(formData, "reason"),
    });
    refresh();
    return "Ajuste manual registrado. O resultado automático foi preservado.";
  });
}

export async function removeOverride(formData: FormData): Promise<void> {
  const actor = await actorWithRole("ANALYST");
  await revokeOverride(getDb(), actor, uuid(formData, "overrideId"));
  refresh();
}

export async function addNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorWithRole("ANALYST");
    const profileId = optStr(formData, "profileId");
    await addNoteService(getDb(), actor, {
      opportunityId: uuid(formData, "opportunityId"),
      profileId: profileId && profileId !== "all" ? profileId : null,
      body: str(formData, "body"),
    });
    refresh();
    return "Nota adicionada.";
  });
}

/** Re-runs document discovery, rule extraction and matching for one opportunity. */
export async function reanalyze(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await actorWithRole("ANALYST");
    const id = uuid(formData, "opportunityId");
    const db = getDb();
    const docs = await discoverDocuments(db, { opportunityIds: [id] });
    await processOpportunities(db, [id], docs.changes);
    const ai = await analyzeOpportunityWithAI(db, id);
    if (ai.status === "OK") await processOpportunities(db, [id], []);
    refresh();
    const aiNote =
      ai.status === "DISABLED" ? "" : ai.status === "OK" ? ` IA: ${ai.verified} requisito(s) verificados, ${ai.unverified} não confirmados.` : ai.status === "CACHED" ? " IA: sem mudanças desde a última análise." : ` IA: ${ai.status}.`;
    return `Análise atualizada${docs.added > 0 ? ` (${docs.added} documento(s) novo(s))` : ""}.${aiNote}`;
  });
}
