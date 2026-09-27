import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CalendarClock, ChevronLeft, FileText, History, Landmark, Link2, ListChecks, NotebookPen, RefreshCw, ScrollText, Star } from "lucide-react";
import { addNote, reanalyze, toggleWatch } from "@/app/actions/opportunities";
import { ActionForm } from "@/components/action-form";
import { DeadlineBadge, InnovationBadge, KindBadge, VerificationBadge } from "@/components/status";
import { Badge, buttonClass, Card, CardBody, CardHeader, cx, DescriptionList, Notice, Select, Textarea } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatBRL, formatCnpj } from "@/lib/format";
import { CHANGE_TYPE_LABEL, POWER_LABEL, REQUIREMENT_GROUPS, REQUIREMENT_LABEL, SOURCE_LABEL, SPHERE_LABEL, STATUS_LABEL, WORKFLOW_LABEL } from "@/lib/labels";
import { requireUser } from "@/server/auth/dal";
import { hasRole } from "@/server/auth/roles";
import { getOpportunityDetail } from "@/server/opportunities/detail";
import { DISCARD_REASONS, INTEREST_REASONS } from "@/server/opportunities/workflow";
import { AssessmentPanel } from "./assessment";

export const metadata: Metadata = { title: "Oportunidade" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatChangeValue(field: string, v: unknown): string {
  if (v == null) return "—";
  if (field === "proposalDeadline" || field === "proposalStart") return formatDateTime(String(v));
  if (field === "estimatedValue" || field === "awardedValue") return formatBRL(String(v));
  if (field === "status") return STATUS_LABEL[String(v)] ?? String(v);
  if (typeof v === "object") return (v as { title?: string }).title ?? JSON.stringify(v);
  return String(v).length > 200 ? `${String(v).slice(0, 200)}…` : String(v);
}

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const user = await requireUser();
  const d = await getOpportunityDetail(user.organizationId, id);
  if (!d) notFound();
  const { opp } = d;
  const canAct = hasRole(user.role, "ANALYST");

  const docTitle = new Map(d.documents.map((doc) => [doc.id, doc.title]));
  const refLabel = (ref: string) => {
    if (ref === "field:objectDescription") return "Objeto da contratação (metadados oficiais)";
    if (ref === "field:complementaryInfo") return "Informações complementares (metadados oficiais)";
    if (ref.startsWith("document:")) return `Documento: ${docTitle.get(ref.slice(9)) ?? ref.slice(9)}`;
    return ref;
  };
  const deadlineReqs = d.requirements.filter((r) => r.category === "DEADLINE");
  const analyzerOf = new Map(d.analyses.map((a) => [a.id, a.analyzer]));

  return (
    <div>
      <nav aria-label="Trilha" className="mb-3 text-sm">
        <Link href="/oportunidades" className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900">
          <ChevronLeft className="size-4" aria-hidden />
          Oportunidades
        </Link>
      </nav>

      <header className="mb-6 border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <KindBadge kind={opp.kind} />
          {opp.modalityName && <Badge tone="muted">{opp.modalityName}</Badge>}
          <Badge tone={opp.status === "PUBLISHED" ? "neutral" : "negative"}>{opp.sourceStatusName ?? STATUS_LABEL[opp.status]}</Badge>
          <InnovationBadge innovationClass={opp.innovationClass} />
          <DeadlineBadge deadline={opp.proposalDeadline} kind={opp.kind} />
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {opp.organizationName}
          {opp.unitName && <span className="font-normal normal-case tracking-normal"> · {opp.unitName}</span>}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{opp.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {opp.sourceUrl && (
            <a href={opp.sourceUrl} target="_blank" rel="noopener noreferrer" className={buttonClass.primary}>
              Ver edital na fonte oficial
              <ArrowUpRight className="size-4" aria-hidden />
            </a>
          )}
          {canAct && (
            <form action={toggleWatch}>
              <input type="hidden" name="opportunityId" value={opp.id} />
              <button type="submit" className={cx(buttonClass.secondary, d.watchlisted && "border-amber-300 bg-amber-50")} aria-pressed={d.watchlisted}>
                <Star className={cx("size-4", d.watchlisted && "fill-amber-400 text-amber-500")} aria-hidden />
                {d.watchlisted ? "Na lista de favoritas" : "Favoritar e monitorar"}
              </button>
            </form>
          )}
          {canAct && (
            <ActionForm action={reanalyze}>
              <input type="hidden" name="opportunityId" value={opp.id} />
              <button type="submit" className={buttonClass.secondary}>
                <RefreshCw className="size-4" aria-hidden />
                Atualizar documentos e análise
              </button>
            </ActionForm>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <Card>
            <CardHeader title="Resumo" icon={<ScrollText className="size-4 text-slate-500" aria-hidden />} />
            <CardBody className="flex flex-col gap-4">
              <div>
                <h2 className="text-xs font-medium text-slate-500">Objeto</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-900">{opp.objectDescription}</p>
              </div>
              {opp.complementaryInfo && (
                <div>
                  <h2 className="text-xs font-medium text-slate-500">Informações complementares</h2>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{opp.complementaryInfo}</p>
                </div>
              )}
              <DescriptionList
                columns={3}
                items={[
                  { label: "Valor estimado", value: <span className="font-semibold">{formatBRL(opp.estimatedValue)}</span> },
                  { label: "Valor homologado", value: opp.awardedValue ? formatBRL(opp.awardedValue) : "—" },
                  { label: "Local", value: [opp.city, opp.state].filter(Boolean).join(" / ") || "—" },
                  { label: "Modalidade", value: opp.modalityName ?? "—" },
                  { label: "Modo de disputa", value: opp.disputeModeName ?? "—" },
                  { label: "Instrumento", value: opp.instrumentName ?? "—" },
                  { label: "Processo", value: opp.processNumber ?? "—" },
                  { label: "Nº da compra", value: opp.purchaseNumber ? `${opp.purchaseNumber}/${opp.purchaseYear ?? ""}` : "—" },
                  { label: "Registro de preços", value: opp.srp == null ? "—" : opp.srp ? "Sim" : "Não" },
                  { label: "Exclusiva ME/EPP", value: opp.exclusiveMeEpp === true ? "Sim (menção no texto oficial)" : "Não identificado nos metadados" },
                  { label: "Amparo legal", value: opp.legalBasis?.name ?? "—" },
                  { label: "Caráter de inovação", value: opp.innovationEvidence ? <span title={opp.innovationEvidence}>{opp.innovationEvidence}</span> : "—" },
                ]}
              />
            </CardBody>
          </Card>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Análise de compatibilidade por perfil</h2>
            <p className="text-xs text-slate-600">
              Cada perfil é analisado separadamente, com suas próprias atividades, capacidades, pesos e documentos. A análise automática apoia a decisão humana e não
              indica habilitação legal.
            </p>
            {d.assessments.map((a) => (
              <AssessmentPanel key={a.profile.id} a={a} opportunityId={opp.id} canAct={canAct} refLabel={refLabel} evidenceDocs={d.evidenceDocs} />
            ))}
          </div>

          <Card>
            <CardHeader
              title="Requisitos identificados"
              icon={<ListChecks className="size-4 text-slate-500" aria-hidden />}
              description="Extraídos por regras determinísticas dos textos oficiais disponíveis, sempre com o trecho de origem. Nada é inferido sem evidência."
            />
            <CardBody className="flex flex-col gap-5">
              {d.requirements.length === 0 && (
                <p className="text-sm text-slate-500">
                  Nenhum requisito identificado nos metadados. A extração do texto completo do edital e anexos entra na V2 — consulte os documentos oficiais.
                </p>
              )}
              {REQUIREMENT_GROUPS.map((g) => {
                const items = d.requirements.filter((r) => g.categories.includes(r.category));
                if (items.length === 0) return null;
                return (
                  <section key={g.title}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{g.title}</h3>
                    <ul className="flex flex-col gap-3">
                      {items.map((r) => (
                        <li key={r.id} className="rounded-md border border-slate-200 p-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-medium text-slate-900">{r.description}</span>
                            <Badge tone="muted">{REQUIREMENT_LABEL[r.category]}</Badge>
                            <VerificationBadge verification={r.verification} />
                            <Badge tone="muted">{analyzerOf.get(r.analysisId) === "AI" ? "IA (validada)" : "Regra determinística"}</Badge>
                          </div>
                          {r.supportingText && <blockquote className="mt-2 border-l-2 border-slate-300 pl-2 text-xs italic text-slate-700">“{r.supportingText}”</blockquote>}
                          <p className="mt-1 text-[11px] text-slate-500">
                            De onde veio: {refLabel(r.sourceRef)}
                            {r.page ? ` · página ${r.page}` : ""}
                            {r.section ? ` · ${r.section}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Documentos da contratação" icon={<FileText className="size-4 text-slate-500" aria-hidden />} description="Originais permanecem na fonte oficial para verificação humana." />
            <CardBody className="p-0">
              {d.documents.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-500">
                  {opp.documentsCheckedAt ? "A fonte não listou documentos." : "Documentos ainda não consultados. Use “Atualizar documentos e análise”."}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {d.documents.map((doc) => (
                    <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{doc.title}</p>
                        <p className="text-xs text-slate-500">
                          {doc.docTypeName ?? "Documento"} · publicado {formatDate(doc.publishedAt)} {!doc.active && "· inativo na fonte"}
                        </p>
                      </div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className={buttonClass.small}>
                        Abrir na fonte
                        <ArrowUpRight className="size-3" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Notas da equipe" icon={<NotebookPen className="size-4 text-slate-500" aria-hidden />} />
            <CardBody className="flex flex-col gap-3">
              {canAct && (
                <ActionForm action={addNote} className="flex flex-col gap-2" resetOnSuccess>
                  <input type="hidden" name="opportunityId" value={opp.id} />
                  <label htmlFor="note-body" className="sr-only">
                    Nota
                  </label>
                  <Textarea id="note-body" name="body" rows={3} required maxLength={5000} placeholder="Observações, dúvidas para esclarecimento, pontos a verificar no edital…" />
                  <div className="flex items-center gap-2">
                    <label htmlFor="note-profile" className="text-xs text-slate-600">
                      Perfil
                    </label>
                    <Select id="note-profile" name="profileId" defaultValue="all" className="w-40">
                      <option value="all">Geral</option>
                      {d.assessments.map((a) => (
                        <option key={a.profile.id} value={a.profile.id}>
                          {a.profile.displayName}
                        </option>
                      ))}
                    </Select>
                    <button type="submit" className={buttonClass.secondary}>
                      Adicionar nota
                    </button>
                  </div>
                </ActionForm>
              )}
              {d.notes.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma nota.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {d.notes.map((n) => (
                    <li key={n.id} className="rounded-md bg-slate-50 p-3 text-sm">
                      <p className="whitespace-pre-line text-slate-800">{n.body}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {n.userName} · {formatDateTime(n.createdAt)}
                        {n.profileId && ` · ${d.assessments.find((a) => a.profile.id === n.profileId)?.profile.displayName ?? ""}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Histórico" icon={<History className="size-4 text-slate-500" aria-hidden />} />
            <CardBody className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Decisões</h3>
                {d.decisions.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma decisão humana registrada.</p>
                ) : (
                  <ol className="flex flex-col gap-2 border-l border-slate-200 pl-3 text-sm">
                    {d.decisions.map((x) => (
                      <li key={x.id}>
                        <p className="font-medium text-slate-900">
                          {d.assessments.find((a) => a.profile.id === x.profileId)?.profile.displayName}: {x.fromStatus ? `${WORKFLOW_LABEL[x.fromStatus]} → ` : ""}
                          {WORKFLOW_LABEL[x.toStatus]}
                        </p>
                        {(x.reasonCode || x.reasonText) && (
                          <p className="text-xs text-slate-600">
                            Motivo: {[x.reasonCode ? (DISCARD_REASONS[x.reasonCode] ?? INTEREST_REASONS[x.reasonCode] ?? x.reasonCode) : null, x.reasonText].filter(Boolean).join(" — ")}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          {x.userName} · {formatDateTime(x.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Alterações na fonte</h3>
                {d.changes.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma alteração detectada desde a primeira coleta.</p>
                ) : (
                  <ol className="flex flex-col gap-2 border-l border-slate-200 pl-3 text-sm">
                    {d.changes.map((c) => (
                      <li key={c.id}>
                        <p className="font-medium text-slate-900">{CHANGE_TYPE_LABEL[c.type]}</p>
                        <p className="text-xs text-slate-600">
                          {formatChangeValue(c.field, c.oldValue)} → {formatChangeValue(c.field, c.newValue)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(c.detectedAt)} · {SOURCE_LABEL[c.sourceKey ?? ""] ?? c.sourceKey}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
              {d.audit.length > 0 && (
                <section className="md:col-span-2">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Auditoria</h3>
                  <ul className="flex flex-col gap-1 text-xs text-slate-600">
                    {d.audit.map((x) => (
                      <li key={x.id}>
                        {formatDateTime(x.createdAt)} · {x.userName ?? "Sistema"} · <code>{x.action}</code>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Prazos" icon={<CalendarClock className="size-4 text-slate-500" aria-hidden />} />
            <CardBody className="flex flex-col gap-3">
              <DescriptionList
                columns={1}
                items={[
                  ...(opp.kind === "FUTURE_PROCUREMENT"
                    ? [{ label: "Previsão de contratação (PCA)", value: formatDate(opp.expectedDate) }]
                    : [
                        { label: "Abertura das propostas", value: formatDateTime(opp.proposalStart) },
                        {
                          label: "Encerramento das propostas",
                          value: (
                            <span className="flex flex-wrap items-center gap-2">
                              {formatDateTime(opp.proposalDeadline)} <DeadlineBadge deadline={opp.proposalDeadline} kind={opp.kind} />
                            </span>
                          ),
                        },
                      ]),
                  { label: "Publicação", value: formatDateTime(opp.publicationDate) },
                ]}
              />
              {deadlineReqs.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-slate-500">Datas mencionadas nos textos</h3>
                  <ul className="mt-1 flex flex-col gap-1 text-sm">
                    {deadlineReqs.map((r) => (
                      <li key={r.id}>{r.description}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[11px] text-slate-500">Prazos ausentes nas fontes oficiais não são inferidos. Confirme sempre no edital.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Órgão contratante" icon={<Landmark className="size-4 text-slate-500" aria-hidden />} />
            <CardBody>
              <DescriptionList
                columns={1}
                items={[
                  { label: "Órgão", value: opp.organizationName },
                  { label: "CNPJ", value: formatCnpj(opp.organizationCnpj) },
                  { label: "Esfera / Poder", value: [SPHERE_LABEL[opp.governmentSphere ?? ""], POWER_LABEL[opp.governmentPower ?? ""]].filter(Boolean).join(" · ") || "—" },
                  { label: "Unidade", value: [opp.unitCode, opp.unitName].filter(Boolean).join(" — ") || "—" },
                  { label: "Município / UF", value: [opp.city, opp.state].filter(Boolean).join(" / ") || "—" },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Fonte e rastreabilidade" icon={<Link2 className="size-4 text-slate-500" aria-hidden />} />
            <CardBody className="flex flex-col gap-3 text-sm">
              <DescriptionList
                columns={1}
                items={[
                  { label: "Nº de controle PNCP", value: opp.pncpControlNumber ? <code className="text-xs">{opp.pncpControlNumber}</code> : "—" },
                  { label: "Fonte principal", value: SOURCE_LABEL[opp.primarySource] ?? opp.primarySource },
                  { label: "Primeira coleta", value: formatDateTime(opp.firstSeenAt) },
                  { label: "Última coleta", value: formatDateTime(opp.lastCollectedAt) },
                  { label: "Atualizado na fonte", value: formatDateTime(opp.sourceUpdatedAt) },
                  { label: "Versões brutas armazenadas", value: String(d.rawCount) },
                ]}
              />
              <div>
                <h3 className="text-xs font-medium text-slate-500">Registros nas fontes</h3>
                <ul className="mt-1 flex flex-col gap-1">
                  {d.sources.map((s) => (
                    <li key={s.id} className="text-xs">
                      <span className="font-medium">{SOURCE_LABEL[s.sourceKey] ?? s.sourceKey}</span> · <code>{s.sourceRecordId}</code> · coletado {formatDateTime(s.collectedAt)}
                      {s.sourceUrl && (
                        <>
                          {" "}
                          ·{" "}
                          <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">
                            link
                          </a>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              {opp.originSystemUrl && (
                <a href={opp.originSystemUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 underline">
                  Sistema de origem da contratação
                  <ArrowUpRight className="size-3" aria-hidden />
                </a>
              )}
              <div>
                <h3 className="text-xs font-medium text-slate-500">Análises registradas</h3>
                {d.analyses.length === 0 ? (
                  <p className="text-xs text-slate-500">Nenhuma.</p>
                ) : (
                  <ul className="mt-1 flex flex-col gap-1 text-xs">
                    {d.analyses.slice(0, 6).map((a) => (
                      <li key={a.id} className={cx(d.currentAnalysisIds.includes(a.id) ? "text-slate-800" : "text-slate-500")}>
                        {a.analyzer === "AI" ? `IA · ${a.provider ?? ""} ${a.model ?? ""}` : "Regras determinísticas"} · esquema {a.schemaVersion} · {formatDateTime(a.createdAt)} ·{" "}
                        {a.sourceDocumentIds.length} doc(s) · entrada <code>{a.inputHash.slice(0, 8)}</code>
                        {d.currentAnalysisIds.includes(a.id) && " · vigente"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardBody>
          </Card>

          <Notice tone="neutral">
            Esta página organiza informações públicas e análises automáticas para apoiar a decisão. Participação, preço, validação jurídica, aprovação de documentos e
            envio oficial são responsabilidades humanas.
          </Notice>
        </aside>
      </div>
    </div>
  );
}
