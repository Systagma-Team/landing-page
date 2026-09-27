"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { getDb, schema } from "@/db";
import { splitList } from "@/lib/validation";
import { audit } from "@/server/audit";
import { requestRematch } from "@/server/jobs/requests";
import { commitProfileVersion } from "@/server/profiles/service";
import { FileValidationError, saveUpload } from "@/server/storage";
import { actorWithRole, optStr, runAction, str, UserInputError, uuid } from "./helpers";
import type { ActionState } from "./types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
function optDate(formData: FormData, key: string): string | null {
  const v = optStr(formData, key);
  if (!v) return null;
  if (!DATE.test(v)) throw new UserInputError("Data inválida.");
  return v;
}

async function assertProfile(organizationId: string, profileId: string) {
  const [p] = await getDb()
    .select({ id: schema.procurementProfiles.id })
    .from(schema.procurementProfiles)
    .where(and(eq(schema.procurementProfiles.id, profileId), eq(schema.procurementProfiles.organizationId, organizationId)));
  if (!p) throw new UserInputError("Perfil não encontrado.");
}

/** Vault changes feed matching (documentation readiness, certifications, evidence), so they version the profile. */
async function afterVaultChange(organizationId: string, profileId: string, userId: string, summary: string) {
  await commitProfileVersion(getDb(), profileId, userId, summary);
  await requestRematch(organizationId);
}

export async function uploadDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorWithRole("ANALYST");
    const profileId = uuid(formData, "profileId");
    await assertProfile(actor.organizationId, profileId);
    const category = str(formData, "category") as (typeof schema.vaultCategory.enumValues)[number];
    if (!schema.vaultCategory.enumValues.includes(category)) throw new UserInputError("Categoria inválida.");
    const title = str(formData, "title").slice(0, 200);
    if (title.length < 2) throw new UserInputError("Informe um título.");
    const issuedOn = optDate(formData, "issuedOn");
    const expiresOn = optDate(formData, "expiresOn");
    if (issuedOn && expiresOn && expiresOn < issuedOn) throw new UserInputError("Validade anterior à emissão.");

    const file = formData.get("file");
    let stored = null;
    if (file instanceof File && file.size > 0) {
      try {
        stored = await saveUpload(file);
      } catch (err) {
        if (err instanceof FileValidationError) throw new UserInputError(err.message);
        throw err;
      }
    }
    const [doc] = await getDb()
      .insert(schema.profileDocuments)
      .values({
        organizationId: actor.organizationId,
        profileId,
        category,
        title,
        issuedOn,
        expiresOn,
        notes: optStr(formData, "notes")?.slice(0, 1000) ?? null,
        storageKey: stored?.storageKey ?? null,
        originalName: stored?.originalName ?? null,
        mimeType: stored?.mimeType ?? null,
        sizeBytes: stored?.sizeBytes ?? null,
        sha256: stored?.sha256 ?? null,
        uploadedBy: actor.id,
      })
      .returning({ id: schema.profileDocuments.id });
    await audit({
      organizationId: actor.organizationId,
      userId: actor.id,
      action: "vault.document_added",
      entityType: "profile_document",
      entityId: doc.id,
      after: { profileId, category, title, issuedOn, expiresOn, sha256: stored?.sha256 ?? null, size: stored?.sizeBytes ?? null },
      ip: actor.ip,
    });
    await afterVaultChange(actor.organizationId, profileId, actor.id, `Documento adicionado ao cofre: ${title}`);
    refresh();
    return "Documento registrado no cofre.";
  });
}

export async function archiveDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorWithRole("ANALYST");
    const id = uuid(formData, "documentId");
    const [doc] = await getDb()
      .update(schema.profileDocuments)
      .set({ archived: true, updatedAt: new Date() })
      .where(and(eq(schema.profileDocuments.id, id), eq(schema.profileDocuments.organizationId, actor.organizationId)))
      .returning();
    if (!doc) throw new UserInputError("Documento não encontrado.");
    await audit({ organizationId: actor.organizationId, userId: actor.id, action: "vault.document_archived", entityType: "profile_document", entityId: id, before: { title: doc.title }, ip: actor.ip });
    await afterVaultChange(actor.organizationId, doc.profileId, actor.id, `Documento arquivado: ${doc.title}`);
    refresh();
    return "Documento arquivado (o arquivo original é mantido para rastreabilidade).";
  });
}

export async function addEvidence(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorWithRole("ANALYST");
    const profileId = uuid(formData, "profileId");
    await assertProfile(actor.organizationId, profileId);
    const type = str(formData, "type") as (typeof schema.evidenceType.enumValues)[number];
    if (!schema.evidenceType.enumValues.includes(type)) throw new UserInputError("Tipo inválido.");
    const title = str(formData, "title").slice(0, 200);
    if (title.length < 3) throw new UserInputError("Informe um título.");
    const capabilities = splitList(str(formData, "capabilities"));
    if (capabilities.length === 0) throw new UserInputError("Informe ao menos uma capacidade demonstrada (ex.: Power BI, integração de APIs).");
    const documentIdRaw = optStr(formData, "documentId");
    let documentId: string | null = null;
    if (documentIdRaw) {
      const [d] = await getDb()
        .select({ id: schema.profileDocuments.id })
        .from(schema.profileDocuments)
        .where(and(eq(schema.profileDocuments.id, documentIdRaw), eq(schema.profileDocuments.profileId, profileId)));
      if (!d) throw new UserInputError("Documento vinculado não encontrado.");
      documentId = d.id;
    }
    const [ev] = await getDb()
      .insert(schema.technicalEvidence)
      .values({
        organizationId: actor.organizationId,
        profileId,
        type,
        title,
        issuer: optStr(formData, "issuer")?.slice(0, 200) ?? null,
        issuedOn: optDate(formData, "issuedOn"),
        description: optStr(formData, "description")?.slice(0, 2000) ?? null,
        capabilities,
        documentId,
      })
      .returning({ id: schema.technicalEvidence.id });
    await audit({ organizationId: actor.organizationId, userId: actor.id, action: "vault.evidence_added", entityType: "technical_evidence", entityId: ev.id, after: { title, type, capabilities, documentId }, ip: actor.ip });
    await afterVaultChange(actor.organizationId, profileId, actor.id, `Evidência técnica adicionada: ${title}`);
    refresh();
    return "Evidência registrada.";
  });
}

export async function removeEvidence(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await actorWithRole("ANALYST");
    const id = uuid(formData, "evidenceId");
    const [ev] = await getDb()
      .update(schema.technicalEvidence)
      .set({ active: false, updatedAt: new Date() })
      .where(and(eq(schema.technicalEvidence.id, id), eq(schema.technicalEvidence.organizationId, actor.organizationId)))
      .returning();
    if (!ev) throw new UserInputError("Evidência não encontrada.");
    await audit({ organizationId: actor.organizationId, userId: actor.id, action: "vault.evidence_removed", entityType: "technical_evidence", entityId: id, before: { title: ev.title }, ip: actor.ip });
    await afterVaultChange(actor.organizationId, ev.profileId, actor.id, `Evidência removida: ${ev.title}`);
    refresh();
    return "Evidência removida.";
  });
}
