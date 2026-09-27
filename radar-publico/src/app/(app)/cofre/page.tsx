import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { Award, Download, FileCheck2, FolderLock, Upload } from "lucide-react";
import { addEvidence, archiveDocument, removeEvidence, uploadDocument } from "@/app/actions/vault";
import { ActionForm } from "@/components/action-form";
import { Badge, buttonClass, Card, CardBody, CardHeader, cx, EmptyState, Field, Input, PageHeader, Select, Table, Td, Textarea, Th } from "@/components/ui";
import { getDb, schema } from "@/db";
import { daysUntil, formatDate } from "@/lib/dates";
import { EVIDENCE_TYPE_LABEL, VAULT_CATEGORY_LABEL } from "@/lib/labels";
import { requireUser } from "@/server/auth/dal";
import { hasRole } from "@/server/auth/roles";
import { maxUploadBytes } from "@/server/storage";

export const metadata: Metadata = { title: "Cofre de documentos" };

function ExpiryBadge({ expiresOn }: { expiresOn: string | null }) {
  if (!expiresOn) return <Badge tone="muted">Sem validade</Badge>;
  const days = daysUntil(new Date(`${expiresOn}T23:59:59-03:00`));
  if (days < 0) return <Badge tone="negative">Vencido</Badge>;
  if (days <= 10) return <Badge tone="negative">Atenção: vence em {days} dia(s)</Badge>;
  if (days <= 30) return <Badge tone="attention">Vence em {days} dias</Badge>;
  return <Badge tone="positive">Válido</Badge>;
}

export default async function VaultPage({ searchParams }: { searchParams: Promise<{ perfil?: string }> }) {
  const user = await requireUser();
  const { perfil } = await searchParams;
  const db = getDb();
  const profiles = await db
    .select()
    .from(schema.procurementProfiles)
    .where(eq(schema.procurementProfiles.organizationId, user.organizationId))
    .orderBy(asc(schema.procurementProfiles.kind));
  const profile = profiles.find((p) => p.slug === perfil) ?? profiles.find((p) => p.slug === "systagma") ?? profiles[0];
  if (!profile) return <EmptyState title="Nenhum perfil cadastrado" />;
  const canEdit = hasRole(user.role, "ANALYST");

  const [documents, evidence] = await Promise.all([
    db
      .select()
      .from(schema.profileDocuments)
      .where(and(eq(schema.profileDocuments.profileId, profile.id), eq(schema.profileDocuments.archived, false)))
      .orderBy(asc(schema.profileDocuments.expiresOn), desc(schema.profileDocuments.createdAt)),
    db
      .select()
      .from(schema.technicalEvidence)
      .where(and(eq(schema.technicalEvidence.profileId, profile.id), eq(schema.technicalEvidence.active, true)))
      .orderBy(desc(schema.technicalEvidence.createdAt)),
  ]);
  const hidden = <input type="hidden" name="profileId" value={profile.id} />;

  return (
    <div>
      <PageHeader
        eyebrow="Cofre de capacidades e documentos"
        title={`Cofre — ${profile.displayName}`}
        description="Documentos e evidências de cada perfil alimentam a prontidão documental, lacunas e sugestões de evidência. Arquivos ficam em armazenamento privado."
      />
      <nav aria-label="Perfis" className="mb-4 flex gap-1 border-b border-slate-200">
        {profiles.map((p) => (
          <Link
            key={p.id}
            href={`/cofre?perfil=${p.slug}`}
            aria-current={p.id === profile.id ? "page" : undefined}
            className={cx("-mb-px border-b-2 px-3 py-2 text-sm font-medium", p.id === profile.id ? "border-brand-600 text-brand-800" : "border-transparent text-slate-600 hover:text-slate-900")}
          >
            {p.displayName}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <Card>
            <CardHeader title="Documentos" icon={<FolderLock className="size-4 text-slate-500" aria-hidden />} description="Certidões, cadastros, atestados, portfólio, documentos jurídicos e financeiros" />
            <CardBody className="p-0">
              {documents.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-500">Nenhum documento cadastrado.</p>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Documento</Th>
                      <Th>Categoria</Th>
                      <Th>Emissão</Th>
                      <Th>Validade</Th>
                      <Th>Situação</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents.map((d) => (
                      <tr key={d.id}>
                        <Td>
                          <p className="font-medium text-slate-900">{d.title}</p>
                          {d.notes && <p className="text-xs text-slate-500">{d.notes}</p>}
                          {d.originalName && (
                            <a href={`/cofre/arquivo/${d.id}`} className="mt-0.5 inline-flex items-center gap-1 text-xs text-brand-700 underline">
                              <Download className="size-3" aria-hidden />
                              {d.originalName}
                            </a>
                          )}
                        </Td>
                        <Td className="text-xs">{VAULT_CATEGORY_LABEL[d.category]}</Td>
                        <Td className="whitespace-nowrap text-xs">{formatDate(d.issuedOn)}</Td>
                        <Td className="whitespace-nowrap text-xs">{d.expiresOn ? formatDate(d.expiresOn) : "—"}</Td>
                        <Td>
                          <ExpiryBadge expiresOn={d.expiresOn} />
                        </Td>
                        <Td>
                          {canEdit && (
                            <ActionForm action={archiveDocument} confirm="Arquivar este documento?">
                              <input type="hidden" name="documentId" value={d.id} />
                              <button type="submit" className={buttonClass.small}>
                                Arquivar
                              </button>
                            </ActionForm>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Evidências técnicas"
              icon={<Award className="size-4 text-slate-500" aria-hidden />}
              description="Atestados, cases e certificações com as capacidades que demonstram. Usadas para sugerir possível evidência de apoio — nunca para concluir que o edital é atendido."
            />
            <CardBody className="p-0">
              {evidence.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-500">Nenhuma evidência cadastrada.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {evidence.map((e) => {
                    const doc = documents.find((d) => d.id === e.documentId);
                    return (
                      <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{e.title}</p>
                          <p className="text-xs text-slate-500">
                            {EVIDENCE_TYPE_LABEL[e.type]}
                            {e.issuer && ` · ${e.issuer}`}
                            {e.issuedOn && ` · ${formatDate(e.issuedOn)}`}
                          </p>
                          <ul className="mt-1 flex flex-wrap gap-1">
                            {e.capabilities.map((c) => (
                              <li key={c}>
                                <Badge tone="brand">{c}</Badge>
                              </li>
                            ))}
                          </ul>
                          {doc?.originalName && (
                            <a href={`/cofre/arquivo/${doc.id}`} className="mt-1 inline-flex items-center gap-1 text-xs text-brand-700 underline">
                              <FileCheck2 className="size-3" aria-hidden />
                              {doc.title}
                            </a>
                          )}
                        </div>
                        {canEdit && (
                          <ActionForm action={removeEvidence} confirm="Remover esta evidência?">
                            <input type="hidden" name="evidenceId" value={e.id} />
                            <button type="submit" className={buttonClass.small}>
                              Remover
                            </button>
                          </ActionForm>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {canEdit && (
          <aside className="flex flex-col gap-6">
            <Card>
              <CardHeader title="Adicionar documento" icon={<Upload className="size-4 text-slate-500" aria-hidden />} />
              <CardBody>
                <ActionForm action={uploadDocument} className="flex flex-col gap-3" resetOnSuccess>
                  {hidden}
                  <Field label="Categoria" htmlFor="doc-category">
                    <Select id="doc-category" name="category" required defaultValue="">
                      <option value="" disabled>
                        Selecione…
                      </option>
                      {Object.entries(VAULT_CATEGORY_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Título" htmlFor="doc-title">
                    <Input id="doc-title" name="title" required minLength={2} maxLength={200} />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Emissão" htmlFor="doc-issued">
                      <Input id="doc-issued" name="issuedOn" type="date" />
                    </Field>
                    <Field label="Validade" htmlFor="doc-expires" hint="Deixe vazio se não expira">
                      <Input id="doc-expires" name="expiresOn" type="date" />
                    </Field>
                  </div>
                  <Field label="Arquivo (opcional)" htmlFor="doc-file" hint={`PDF, DOCX, XLSX, ODT, ODS, DOC, XLS, PNG, JPG, TXT, CSV · até ${Math.round(maxUploadBytes() / 1024 / 1024)} MB`}>
                    <Input id="doc-file" name="file" type="file" accept=".pdf,.docx,.xlsx,.odt,.ods,.doc,.xls,.png,.jpg,.jpeg,.txt,.csv" />
                  </Field>
                  <Field label="Notas" htmlFor="doc-notes">
                    <Textarea id="doc-notes" name="notes" rows={2} maxLength={1000} />
                  </Field>
                  <button type="submit" className={buttonClass.primary}>
                    Salvar documento
                  </button>
                </ActionForm>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Adicionar evidência técnica" icon={<Award className="size-4 text-slate-500" aria-hidden />} />
              <CardBody>
                <ActionForm action={addEvidence} className="flex flex-col gap-3" resetOnSuccess>
                  {hidden}
                  <Field label="Tipo" htmlFor="ev-type">
                    <Select id="ev-type" name="type" defaultValue="ATESTADO_CAPACIDADE_TECNICA">
                      {Object.entries(EVIDENCE_TYPE_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Título" htmlFor="ev-title">
                    <Input id="ev-title" name="title" required minLength={3} placeholder="Atestado — Projeto X" />
                  </Field>
                  <Field label="Emissor" htmlFor="ev-issuer">
                    <Input id="ev-issuer" name="issuer" />
                  </Field>
                  <Field label="Data" htmlFor="ev-issued">
                    <Input id="ev-issued" name="issuedOn" type="date" />
                  </Field>
                  <Field label="Capacidades demonstradas" htmlFor="ev-caps" hint="Separe por vírgulas: Power BI, integração de APIs, dashboard, SQL">
                    <Input id="ev-caps" name="capabilities" required />
                  </Field>
                  <Field label="Documento vinculado" htmlFor="ev-doc">
                    <Select id="ev-doc" name="documentId" defaultValue="">
                      <option value="">—</option>
                      {documents.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Descrição" htmlFor="ev-desc">
                    <Textarea id="ev-desc" name="description" rows={2} />
                  </Field>
                  <button type="submit" className={buttonClass.primary}>
                    Salvar evidência
                  </button>
                </ActionForm>
              </CardBody>
            </Card>
          </aside>
        )}
      </div>
    </div>
  );
}
