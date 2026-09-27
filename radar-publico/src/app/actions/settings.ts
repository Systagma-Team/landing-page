"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { getDb, schema } from "@/db";
import { audit } from "@/server/audit";
import { hashPassword, passwordProblems } from "@/server/auth/password";
import { invalidateUserSessions } from "@/server/auth/session";
import { isAllowedWebhookUrl } from "@/server/alerts/dispatch";
import { collectQueue, enqueue } from "@/server/jobs/queues";
import { sourceDefinition } from "@/server/sources/definitions";
import { getAdapter } from "@/server/sources/registry";
import { actorWithRole, optNumber, optStr, runAction, str, UserInputError, uuid } from "./helpers";
import type { ActionState } from "./types";

// ---------------------------------------------------------------- sources

export async function toggleSource(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorWithRole("ADMIN");
    const key = str(formData, "sourceKey");
    const def = sourceDefinition(key);
    if (!def) throw new UserInputError("Fonte desconhecida.");
    const enabled = formData.get("enabled") === "on";
    if (enabled && def.collectors.length === 0) throw new UserInputError("Esta fonte não tem interface estruturada verificada e não pode ser ativada.");
    await getDb().update(schema.sources).set({ enabled, updatedAt: new Date() }).where(eq(schema.sources.key, key));
    await audit({ organizationId: actor.organizationId, userId: actor.id, action: enabled ? "source.enabled" : "source.disabled", entityType: "source", entityId: key, ip: actor.ip });
    refresh();
    return enabled ? "Fonte ativada." : "Fonte desativada.";
  });
}

export async function updateSourceModalities(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorWithRole("ADMIN");
    const key = str(formData, "sourceKey");
    const [source] = await getDb().select().from(schema.sources).where(eq(schema.sources.key, key));
    if (!source) throw new UserInputError("Fonte desconhecida.");
    const modalities = formData
      .getAll("modalities")
      .map((m) => Number(m))
      .filter((m) => Number.isInteger(m) && m >= 1 && m <= 13);
    if (modalities.length === 0) throw new UserInputError("Selecione ao menos uma modalidade.");
    const lookback = optNumber(formData, "initialLookbackDays");
    const config = { ...source.config, modalities, ...(lookback != null ? { initialLookbackDays: Math.min(30, Math.round(lookback)) } : {}) };
    await getDb().update(schema.sources).set({ config, updatedAt: new Date() }).where(eq(schema.sources.key, key));
    await audit({ organizationId: actor.organizationId, userId: actor.id, action: "source.config_changed", entityType: "source", entityId: key, before: source.config, after: config, ip: actor.ip });
    refresh();
    return "Configuração salva.";
  });
}

export async function runCollectorNow(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorWithRole("ADMIN");
    const key = str(formData, "sourceKey");
    const collector = str(formData, "collector");
    const def = sourceDefinition(key);
    if (!def?.collectors.some((c) => c.name === collector)) throw new UserInputError("Coletor inválido.");
    try {
      await enqueue(collectQueue(key, collector), { force: true });
    } catch {
      throw new UserInputError("Fila indisponível — verifique se o worker (npm run worker) está em execução.");
    }
    await audit({ organizationId: actor.organizationId, userId: actor.id, action: "source.manual_run", entityType: "source", entityId: key, metadata: { collector }, ip: actor.ip });
    refresh();
    return "Coleta enfileirada. Acompanhe o resultado nesta página.";
  });
}

export async function testSource(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await actorWithRole("ANALYST");
    const key = str(formData, "sourceKey");
    const def = sourceDefinition(key);
    if (!def) throw new UserInputError("Fonte desconhecida.");
    const [source] = await getDb().select().from(schema.sources).where(eq(schema.sources.key, key));
    const result = await getAdapter(key).healthCheck({ config: { ...def.defaultConfig, ...(source?.config ?? {}) }, log: () => undefined });
    const label = { OK: "Operando", DEGRADED: "Degradada", DOWN: "Indisponível", NOT_CONFIGURED: "Não configurada" }[result.status];
    if (result.status === "DOWN") throw new UserInputError(`${label}: ${result.message}`);
    return `${label}: ${result.message}${result.latencyMs != null ? ` (${result.latencyMs} ms)` : ""}`;
  });
}

// ---------------------------------------------------------------- notifications

const CHANNELS = ["EMAIL", "WEBHOOK", "SLACK"] as const;
const FREQUENCIES = ["IMMEDIATE", "DAILY", "WEEKLY", "OFF"] as const;

export async function addNotificationPreference(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorWithRole("VIEWER");
    const channel = str(formData, "channel") as (typeof CHANNELS)[number];
    const frequency = str(formData, "frequency") as (typeof FREQUENCIES)[number];
    if (!CHANNELS.includes(channel) || !FREQUENCIES.includes(frequency)) throw new UserInputError("Canal ou frequência inválidos.");
    let target = optStr(formData, "target");
    if (channel === "WEBHOOK" || channel === "SLACK") {
      if (actor.role !== "ADMIN") throw new UserInputError("Somente administradores configuram webhooks e Slack.");
      if (!target || !isAllowedWebhookUrl(target)) throw new UserInputError("Informe uma URL HTTPS pública válida.");
    }
    if (channel === "EMAIL" && target && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) throw new UserInputError("E-mail inválido.");
    if (channel === "EMAIL" && !target) target = null;
    const profileIdRaw = optStr(formData, "profileId");
    let profileId: string | null = null;
    if (profileIdRaw && profileIdRaw !== "all") {
      const [p] = await getDb()
        .select({ id: schema.procurementProfiles.id })
        .from(schema.procurementProfiles)
        .where(and(eq(schema.procurementProfiles.id, profileIdRaw), eq(schema.procurementProfiles.organizationId, actor.organizationId)));
      if (!p) throw new UserInputError("Perfil inválido.");
      profileId = p.id;
    }
    const alertTypes = formData.getAll("alertTypes").map(String).filter((t) => schema.alertType.enumValues.includes(t as never));
    const minScore = Math.max(0, Math.min(100, optNumber(formData, "minScore") ?? 75));
    const [pref] = await getDb()
      .insert(schema.notificationPreferences)
      .values({ organizationId: actor.organizationId, userId: actor.id, profileId, channel, frequency, alertTypes, minScore, target })
      .returning({ id: schema.notificationPreferences.id });
    await audit({ organizationId: actor.organizationId, userId: actor.id, action: "notification.preference_added", entityType: "notification_preference", entityId: pref.id, after: { channel, frequency, profileId, alertTypes, minScore }, ip: actor.ip });
    refresh();
    return "Preferência salva.";
  });
}

export async function removeNotificationPreference(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorWithRole("VIEWER");
    const id = uuid(formData, "preferenceId");
    await getDb().delete(schema.notificationPreferences).where(and(eq(schema.notificationPreferences.id, id), eq(schema.notificationPreferences.userId, actor.id)));
    await audit({ organizationId: actor.organizationId, userId: actor.id, action: "notification.preference_removed", entityType: "notification_preference", entityId: id, ip: actor.ip });
    refresh();
    return "Preferência removida.";
  });
}

// ---------------------------------------------------------------- users

const ROLES = ["ADMIN", "ANALYST", "VIEWER"] as const;

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorWithRole("ADMIN");
    const email = str(formData, "email").toLowerCase();
    const name = str(formData, "name").slice(0, 120);
    const role = str(formData, "role") as (typeof ROLES)[number];
    const password = str(formData, "password");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserInputError("E-mail inválido.");
    if (name.length < 2) throw new UserInputError("Informe o nome.");
    if (!ROLES.includes(role)) throw new UserInputError("Papel inválido.");
    const problems = passwordProblems(password);
    if (problems.length > 0) throw new UserInputError(`Senha temporária fraca: ${problems.join(", ")}.`);
    const db = getDb();
    const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(sql`lower(${schema.users.email}) = ${email}`);
    if (exists) throw new UserInputError("Já existe um usuário com este e-mail.");
    const [user] = await db
      .insert(schema.users)
      .values({ organizationId: actor.organizationId, email, name, role, passwordHash: await hashPassword(password) })
      .returning({ id: schema.users.id });
    await audit({ organizationId: actor.organizationId, userId: actor.id, action: "user.created", entityType: "user", entityId: user.id, after: { email, role }, ip: actor.ip });
    refresh();
    return "Usuário criado. Compartilhe a senha temporária por um canal seguro.";
  });
}

export async function updateUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorWithRole("ADMIN");
    const id = uuid(formData, "userId");
    const role = str(formData, "role") as (typeof ROLES)[number];
    const active = formData.get("active") === "on";
    if (!ROLES.includes(role)) throw new UserInputError("Papel inválido.");
    if (id === actor.id && (role !== "ADMIN" || !active)) throw new UserInputError("Você não pode remover seu próprio acesso de administrador.");
    const db = getDb();
    const [before] = await db.select().from(schema.users).where(and(eq(schema.users.id, id), eq(schema.users.organizationId, actor.organizationId)));
    if (!before) throw new UserInputError("Usuário não encontrado.");
    await db.update(schema.users).set({ role, active, updatedAt: new Date() }).where(eq(schema.users.id, id));
    if (!active || role !== before.role) await invalidateUserSessions(id);
    const newPassword = optStr(formData, "newPassword");
    if (newPassword) {
      const problems = passwordProblems(newPassword);
      if (problems.length > 0) throw new UserInputError(`Senha fraca: ${problems.join(", ")}.`);
      await db.update(schema.users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(schema.users.id, id));
      await invalidateUserSessions(id);
    }
    await audit({
      organizationId: actor.organizationId,
      userId: actor.id,
      action: "user.updated",
      entityType: "user",
      entityId: id,
      before: { role: before.role, active: before.active },
      after: { role, active, passwordReset: !!newPassword },
      ip: actor.ip,
    });
    refresh();
    return "Usuário atualizado.";
  });
}
