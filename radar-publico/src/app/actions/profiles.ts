"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { getDb, schema, type Database } from "@/db";
import { onlyDigits, suggestKeywords } from "@/lib/text";
import { isValidCnpj, normalizeCnae, splitList } from "@/lib/validation";
import { UFS } from "@/lib/labels";
import { audit } from "@/server/audit";
import { requestRematch } from "@/server/jobs/requests";
import { DIMENSIONS, type ScoringConfig } from "@/server/matching/types";
import { commitProfileVersion } from "@/server/profiles/service";
import { CNAE_KEYWORD_SUGGESTIONS } from "@/server/profiles/defaults";
import type { Actor } from "@/server/opportunities/workflow";
import { actorWithRole, optNumber, optStr, runAction, str, UserInputError, uuid } from "./helpers";
import type { ActionState } from "./types";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function ownedProfile(tx: Tx | Database, actor: Actor, profileId: string) {
  const [p] = await tx
    .select()
    .from(schema.procurementProfiles)
    .where(and(eq(schema.procurementProfiles.id, profileId), eq(schema.procurementProfiles.organizationId, actor.organizationId)));
  if (!p) throw new UserInputError("Perfil não encontrado.");
  return p;
}

/**
 * Every profile mutation: authorise (ADMIN), mutate, snapshot a new profile version, audit,
 * then recompute matches so the new configuration takes effect.
 */
async function mutateProfile(
  formData: FormData,
  summary: string,
  fn: (tx: Tx, actor: Actor, profile: typeof schema.procurementProfiles.$inferSelect) => Promise<Record<string, unknown> | void>,
  role: "ADMIN" | "ANALYST" = "ADMIN",
): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorWithRole(role);
    const profileId = uuid(formData, "profileId");
    const db = getDb();
    let version = 0;
    await db.transaction(async (tx) => {
      const profile = await ownedProfile(tx, actor, profileId);
      const details = await fn(tx, actor, profile);
      version = await commitProfileVersion(tx, profileId, actor.id, summary);
      await audit(
        { organizationId: actor.organizationId, userId: actor.id, action: "profile.updated", entityType: "profile", entityId: profileId, after: { summary, version, ...(details ?? {}) }, ip: actor.ip },
        tx,
      );
    });
    const mode = await requestRematch(actor.organizationId);
    refresh();
    return `${summary}. Perfil agora na versão ${version}. ${mode === "queued" ? "Recalculo das oportunidades agendado." : "Oportunidades recalculadas."}`;
  });
}

export async function updateProfileBasics(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return mutateProfile(formData, "Dados do perfil atualizados", async (tx, _actor, profile) => {
    const cnpjRaw = optStr(formData, "cnpj");
    if (cnpjRaw && !isValidCnpj(cnpjRaw)) throw new UserInputError("CNPJ inválido.");
    const min = optNumber(formData, "minProjectValue");
    const max = optNumber(formData, "maxProjectValue");
    if (min != null && max != null && min > max) throw new UserInputError("Valor mínimo maior que o máximo.");
    const meEpp = str(formData, "isMeEpp");
    const states = formData.getAll("preferredStates").map(String).filter((s) => UFS.includes(s));
    const values = {
      displayName: str(formData, "displayName").slice(0, 60) || profile.displayName,
      legalName: optStr(formData, "legalName")?.slice(0, 200) ?? null,
      cnpj: cnpjRaw ? onlyDigits(cnpjRaw) : null,
      isMeEpp: meEpp === "yes" ? true : meEpp === "no" ? false : null,
      sicafStatus: optStr(formData, "sicafStatus")?.slice(0, 200) ?? null,
      nationwide: formData.get("nationwide") === "on",
      preferredStates: states,
      restrictToPreferredStates: formData.get("restrictToPreferredStates") === "on",
      minProjectValue: min == null ? null : min.toFixed(2),
      maxProjectValue: max == null ? null : max.toFixed(2),
      operationalCapacity: optStr(formData, "operationalCapacity")?.slice(0, 500) ?? null,
      notes: optStr(formData, "notes")?.slice(0, 2000) ?? null,
      updatedAt: new Date(),
    };
    await tx.update(schema.procurementProfiles).set(values).where(eq(schema.procurementProfiles.id, profile.id));
    return { before: { cnpj: profile.cnpj, nationwide: profile.nationwide, maxProjectValue: profile.maxProjectValue }, fields: Object.keys(values) };
  });
}

export async function addActivity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return mutateProfile(formData, "Atividade/CNAE adicionada", async (tx, actor, profile) => {
    const type = str(formData, "type") as (typeof schema.activityType.enumValues)[number];
    if (!schema.activityType.enumValues.includes(type)) throw new UserInputError("Tipo inválido.");
    const description = str(formData, "description").slice(0, 300);
    if (description.length < 3) throw new UserInputError("Informe a descrição da atividade.");
    const codeRaw = optStr(formData, "code");
    let code: string | null = null;
    if (codeRaw) {
      code = type.startsWith("CNAE") ? normalizeCnae(codeRaw) : codeRaw.slice(0, 20);
      if (!code) throw new UserInputError("CNAE deve ter 7 dígitos (ex.: 6201-5/01).");
    }
    const provided = splitList(str(formData, "keywords"));
    // Search profile derived from the real activity entered by the user (editable afterwards).
    const known = code && type.startsWith("CNAE") ? CNAE_KEYWORD_SUGGESTIONS[onlyDigits(code)] : undefined;
    const keywords = provided.length > 0 ? provided : known ?? suggestKeywords(description);
    await tx.insert(schema.profileActivities).values({ organizationId: actor.organizationId, profileId: profile.id, type, code, description, keywords });
    return { activity: { type, code, description, keywords } };
  });
}

export async function updateActivityKeywords(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return mutateProfile(formData, "Palavras-chave da atividade atualizadas", async (tx, _actor, profile) => {
    const id = uuid(formData, "activityId");
    const keywords = splitList(str(formData, "keywords"));
    await tx
      .update(schema.profileActivities)
      .set({ keywords, updatedAt: new Date() })
      .where(and(eq(schema.profileActivities.id, id), eq(schema.profileActivities.profileId, profile.id)));
    return { activityId: id, keywords };
  });
}

export async function removeActivity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return mutateProfile(formData, "Atividade removida", async (tx, _actor, profile) => {
    const id = uuid(formData, "activityId");
    await tx.update(schema.profileActivities).set({ active: false, updatedAt: new Date() }).where(and(eq(schema.profileActivities.id, id), eq(schema.profileActivities.profileId, profile.id)));
    return { activityId: id };
  });
}

export async function addCapability(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return mutateProfile(formData, "Capacidade adicionada", async (tx, actor, profile) => {
    const name = str(formData, "name").slice(0, 120);
    const category = str(formData, "category").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 40) || "OUTROS";
    if (name.length < 3) throw new UserInputError("Informe o nome da capacidade.");
    const level = str(formData, "level") as "CORE" | "SECONDARY" | "EXPLORATORY";
    if (!["CORE", "SECONDARY", "EXPLORATORY"].includes(level)) throw new UserInputError("Nível inválido.");
    const [cap] = await tx
      .insert(schema.serviceCapabilities)
      .values({ organizationId: actor.organizationId, profileId: profile.id, category, name, description: optStr(formData, "description"), level, strategic: formData.get("strategic") === "on" })
      .returning();
    const terms = splitList(str(formData, "terms"));
    if (terms.length > 0) {
      await tx.insert(schema.taxonomyTerms).values(
        terms.map((term) => ({ organizationId: actor.organizationId, profileId: profile.id, capabilityId: cap.id, polarity: "POSITIVE" as const, term, weight: 1, caseSensitive: /^[A-Z0-9]{2,4}$/.test(term) })),
      );
    }
    return { capability: { name, category, level, terms } };
  });
}

export async function updateCapability(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return mutateProfile(formData, "Capacidade atualizada", async (tx, _actor, profile) => {
    const id = uuid(formData, "capabilityId");
    const level = str(formData, "level") as "CORE" | "SECONDARY" | "EXPLORATORY";
    if (!["CORE", "SECONDARY", "EXPLORATORY"].includes(level)) throw new UserInputError("Nível inválido.");
    await tx
      .update(schema.serviceCapabilities)
      .set({ level, strategic: formData.get("strategic") === "on", active: formData.get("active") === "on", updatedAt: new Date() })
      .where(and(eq(schema.serviceCapabilities.id, id), eq(schema.serviceCapabilities.profileId, profile.id)));
    return { capabilityId: id, level };
  });
}

export async function addTerm(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return mutateProfile(formData, "Termo adicionado", async (tx, actor, profile) => {
    const polarity = str(formData, "polarity") === "NEGATIVE" ? "NEGATIVE" : "POSITIVE";
    const term = str(formData, "term").slice(0, 80);
    if (term.length < 2) throw new UserInputError("Termo muito curto.");
    const weight = optNumber(formData, "weight") ?? 1;
    if (weight <= 0 || weight > 3) throw new UserInputError("Peso deve estar entre 0,1 e 3.");
    let capabilityId: string | null = null;
    if (polarity === "POSITIVE") {
      capabilityId = uuid(formData, "capabilityId");
      const [cap] = await tx.select().from(schema.serviceCapabilities).where(and(eq(schema.serviceCapabilities.id, capabilityId), eq(schema.serviceCapabilities.profileId, profile.id)));
      if (!cap) throw new UserInputError("Capacidade não encontrada.");
    }
    const effect = polarity === "NEGATIVE" ? (str(formData, "effect") === "PENALIZE" ? "PENALIZE" : "EXCLUDE") : null;
    await tx.insert(schema.taxonomyTerms).values({
      organizationId: actor.organizationId,
      profileId: profile.id,
      capabilityId,
      polarity,
      term,
      weight,
      caseSensitive: formData.get("caseSensitive") === "on",
      effect,
      note: optStr(formData, "note")?.slice(0, 200) ?? null,
    });
    return { term, polarity, weight, effect };
  });
}

export async function removeTerm(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return mutateProfile(formData, "Termo removido", async (tx, _actor, profile) => {
    const id = uuid(formData, "termId");
    await tx.update(schema.taxonomyTerms).set({ active: false, updatedAt: new Date() }).where(and(eq(schema.taxonomyTerms.id, id), eq(schema.taxonomyTerms.profileId, profile.id)));
    return { termId: id };
  });
}

export async function updateScoring(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return mutateProfile(formData, "Pesos e limiares atualizados", async (tx, _actor, profile) => {
    const weights = {} as ScoringConfig["weights"];
    for (const d of DIMENSIONS) {
      const w = optNumber(formData, `w_${d}`);
      if (w == null || w > 100) throw new UserInputError("Pesos devem ser números entre 0 e 100.");
      weights[d] = w;
    }
    if (Object.values(weights).reduce((a, b) => a + b, 0) <= 0) throw new UserInputError("A soma dos pesos deve ser positiva.");
    const high = optNumber(formData, "t_high");
    const medium = optNumber(formData, "t_medium");
    const low = optNumber(formData, "t_low");
    const alertMinScore = optNumber(formData, "alertMinScore");
    if (high == null || medium == null || low == null || alertMinScore == null) throw new UserInputError("Informe todos os limiares.");
    if (!(high > medium && medium > low) || high > 100) throw new UserInputError("Limiares devem obedecer: alta > média > baixa ≤ 100.");
    const essentialDocuments = formData.getAll("essentialDocuments").map(String).filter((c) => schema.vaultCategory.enumValues.includes(c as never));
    const scoring: ScoringConfig = { weights, thresholds: { high, medium, low }, alertMinScore, essentialDocuments };
    await tx.update(schema.procurementProfiles).set({ scoring, updatedAt: new Date() }).where(eq(schema.procurementProfiles.id, profile.id));
    return { before: profile.scoring, after: scoring };
  });
}
