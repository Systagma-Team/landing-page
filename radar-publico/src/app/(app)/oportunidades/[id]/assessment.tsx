import Link from "next/link";
import { AlertTriangle, Ban, Bot, Check, FileSearch, Gavel, Info, Triangle, UserCheck } from "lucide-react";
import { decide, override, removeOverride } from "@/app/actions/opportunities";
import { ActionForm } from "@/components/action-form";
import { CompatibilityBadge, DecisionBadge, ScoreMeter } from "@/components/status";
import { Badge, buttonClass, cx, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { COMPATIBILITY_LABEL, DIMENSION_LABEL, WORKFLOW_LABEL } from "@/lib/labels";
import type { ProfileAssessment } from "@/server/opportunities/detail";
import { DISCARD_REASONS, HUMAN_STATES, INTEREST_REASONS } from "@/server/opportunities/workflow";
import type { AttentionItem } from "@/server/matching/types";

const CONFIDENCE_LABEL: Record<string, string> = { HIGH: "alta", MEDIUM: "média", LOW: "baixa" };

function Quote({ text, sourceRef, refLabel }: { text?: string | null; sourceRef?: string | null; refLabel: (ref: string) => string }) {
  if (!text) return null;
  return (
    <figure className="mt-1">
      <blockquote className="border-l-2 border-slate-300 pl-2 text-xs italic text-slate-600">“{text}”</blockquote>
      {sourceRef && <figcaption className="mt-0.5 text-[11px] text-slate-500">Fonte: {refLabel(sourceRef)}</figcaption>}
    </figure>
  );
}

function ItemList({ items, icon, tone, refLabel, empty }: { items: AttentionItem[]; icon: React.ReactNode; tone: string; refLabel: (r: string) => string; empty?: string }) {
  if (items.length === 0) return empty ? <p className="text-xs text-slate-500">{empty}</p> : null;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((a, i) => (
        <li key={`${a.code}-${i}`} className={cx("text-sm", tone)}>
          <span className="flex items-start gap-1.5">
            <span className="mt-0.5 shrink-0">{icon}</span>
            <span>{a.message}</span>
          </span>
          <Quote text={a.supportingText} sourceRef={a.sourceRef} refLabel={refLabel} />
        </li>
      ))}
    </ul>
  );
}

export function AssessmentPanel({
  a,
  opportunityId,
  canAct,
  refLabel,
  evidenceDocs,
}: {
  a: ProfileAssessment;
  opportunityId: string;
  canAct: boolean;
  refLabel: (ref: string) => string;
  evidenceDocs: { id: string; title: string }[];
}) {
  const m = a.stored;
  const r = a.live;
  const decision = a.workflow?.status;

  if (!m && r && !decision) {
    // Not relevant for this profile: keep it available but out of the way.
    return (
      <details className="rounded-lg border border-slate-200 bg-white shadow-xs">
        <summary className="flex flex-wrap items-center gap-2 px-4 py-2.5">
          <span className="text-sm font-bold uppercase tracking-wide text-slate-800">Perfil {a.profile.displayName}</span>
          <ScoreMeter score={r.score} size="sm" />
          <CompatibilityBadge status={r.status} />
          <span className="text-xs text-slate-500">Sem capacidade ou atividade do perfil no objeto — ver análise calculada</span>
        </summary>
        <div className="border-t border-slate-100">
          <FullPanel a={a} opportunityId={opportunityId} canAct={canAct} refLabel={refLabel} evidenceDocs={evidenceDocs} />
        </div>
      </details>
    );
  }
  return <FullPanel a={a} opportunityId={opportunityId} canAct={canAct} refLabel={refLabel} evidenceDocs={evidenceDocs} />;
}

function FullPanel({
  a,
  opportunityId,
  canAct,
  refLabel,
  evidenceDocs,
}: {
  a: ProfileAssessment;
  opportunityId: string;
  canAct: boolean;
  refLabel: (ref: string) => string;
  evidenceDocs: { id: string; title: string }[];
}) {
  const m = a.stored;
  const r = a.live;
  const result = m
    ? {
        status: m.status,
        score: m.score,
        confidence: m.confidence,
        breakdown: m.breakdown,
        serviceMatches: m.serviceMatches,
        activityMatches: m.activityMatches,
        evidenceMatches: m.evidenceMatches,
        attention: m.attention,
        blockers: m.blockers,
        gaps: m.gaps,
        missingInformation: m.missingInformation,
        riskFlags: m.riskFlags,
      }
    : r;
  const activeScore = a.overrides.find((o) => o.active && o.field === "SCORE");
  const activeStatus = a.overrides.find((o) => o.active && o.field === "COMPATIBILITY_STATUS");
  const effectiveScore = activeScore ? Number(activeScore.manualValue) : result?.score ?? null;
  const effectiveStatus = activeStatus ? String(activeStatus.manualValue) : result?.status ?? null;
  const decision = a.workflow?.status;

  return (
    <section aria-labelledby={`perfil-${a.profile.slug}`} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <h2 id={`perfil-${a.profile.slug}`} className="text-sm font-bold uppercase tracking-wide text-slate-800">
          Perfil {a.profile.displayName}
        </h2>
        <Link href={`/perfis/${a.profile.slug}`} className="text-xs font-medium text-brand-700 hover:underline">
          Ver perfil
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* ------------------------------------------------ automatic analysis */}
        <div className="border-b border-slate-200 p-4 lg:col-span-3 lg:border-b-0 lg:border-r">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <Bot className="size-3.5" aria-hidden />
            Análise automática
          </p>
          {!result ? (
            <p className="text-sm text-slate-500">Sem análise disponível.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <ScoreMeter score={effectiveScore} manual={!!activeScore} size="lg" />
                <CompatibilityBadge status={effectiveStatus} />
                <Badge tone="muted">confiança {CONFIDENCE_LABEL[result.confidence] ?? result.confidence}</Badge>
              </div>
              {(activeScore || activeStatus) && (
                <p className="text-xs text-slate-600">
                  Resultado automático preservado: {result.score}/100 · {COMPATIBILITY_LABEL[result.status]}
                </p>
              )}
              {!m && r && (
                <Notice tone="neutral" icon={<Info className="size-4" aria-hidden />}>
                  Calculado agora para consulta — nenhuma capacidade ou atividade do perfil foi encontrada no objeto, por isso a oportunidade não entra nas listas deste perfil.
                </Notice>
              )}
              {result.missingInformation.some((x) => x.startsWith("Perfil incompleto")) && (
                <Notice tone="attention" title="PERFIL INCOMPLETO" icon={<AlertTriangle className="size-4" aria-hidden />}>
                  {result.missingInformation.find((x) => x.startsWith("Perfil incompleto"))?.replace("Perfil incompleto: ", "Faltam: ")}. Confiança reduzida.
                </Notice>
              )}

              <div>
                <h3 className="mb-1 text-xs font-semibold text-emerald-800">Correspondências fortes</h3>
                {result.serviceMatches.length === 0 && result.activityMatches.length === 0 ? (
                  <p className="text-xs text-slate-500">Nenhuma capacidade ou atividade do perfil encontrada no objeto.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {result.serviceMatches.map((s) => (
                      <li key={s.capabilityId} className="text-sm text-emerald-900">
                        <details>
                          <summary className="flex items-center gap-1.5">
                            <Check className="size-3.5" aria-hidden />
                            <span className="font-medium">{s.name}</span>
                            <span className="text-xs text-emerald-700">({s.hits.map((h) => h.term).join(", ")})</span>
                          </summary>
                          <ul className="ml-5 mt-1 flex flex-col gap-1">
                            {s.hits.map((h, i) => (
                              <li key={i}>
                                <Quote text={h.snippet} sourceRef={h.field === "object" ? "field:objectDescription" : h.field === "complementary" ? "field:complementaryInfo" : null} refLabel={refLabel} />
                              </li>
                            ))}
                          </ul>
                        </details>
                      </li>
                    ))}
                    {result.activityMatches.map((act) => (
                      <li key={act.activityId} className="flex items-center gap-1.5 text-sm text-emerald-900">
                        <Check className="size-3.5" aria-hidden />
                        Atividade: {act.code ? `${act.code} — ` : ""}
                        {act.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="mb-1 text-xs font-semibold text-amber-900">Atenção</h3>
                <ItemList
                  items={[...result.attention, ...result.riskFlags]}
                  icon={<AlertTriangle className="size-3.5" aria-hidden />}
                  tone="text-amber-900"
                  refLabel={refLabel}
                  empty="Nenhum ponto de atenção detectado."
                />
              </div>

              <div>
                <h3 className="mb-1 text-xs font-semibold text-red-800">Bloqueios potenciais</h3>
                <ItemList items={result.blockers} icon={<Ban className="size-3.5" aria-hidden />} tone="text-red-800" refLabel={refLabel} empty="Nenhum detectado automaticamente." />
              </div>

              {result.gaps.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold text-amber-900">Possíveis lacunas</h3>
                  <ul className="flex flex-col gap-2">
                    {result.gaps.map((g, i) => (
                      <li key={i} className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950">
                        <p className="flex items-center gap-1 font-semibold">
                          <Triangle className="size-3" aria-hidden />
                          {g.result}
                        </p>
                        <p className="mt-1">
                          <span className="font-medium">Exigido:</span> {g.required}
                        </p>
                        <p>
                          <span className="font-medium">Perfil:</span> {g.profileEvidence}
                        </p>
                        <Quote text={g.supportingText} sourceRef={g.sourceRef} refLabel={refLabel} />
                        <p className="mt-1 font-medium">Revisão humana necessária.</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.evidenceMatches.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold text-slate-800">Possível evidência de apoio encontrada</h3>
                  <ul className="flex flex-col gap-1 text-sm">
                    {result.evidenceMatches.map((e) => {
                      const doc = evidenceDocs.find((d) => d.id === e.documentId);
                      return (
                        <li key={e.evidenceId} className="flex flex-wrap items-center gap-1.5">
                          <FileSearch className="size-3.5 text-slate-500" aria-hidden />
                          <span className="font-medium">{e.title}</span>
                          <span className="text-xs text-slate-500">({e.matchedOn.join(", ")})</span>
                          {doc && (
                            <a href={`/cofre/arquivo/${doc.id}`} className="text-xs font-medium text-brand-700 underline">
                              abrir documento
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-1 text-xs text-slate-500">Sugestão automática: não conclui que a evidência atende ao edital.</p>
                </div>
              )}

              {result.missingInformation.filter((x) => !x.startsWith("Perfil incompleto")).length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold text-slate-700">Informações ausentes</h3>
                  <ul className="list-inside list-disc text-xs text-slate-600">
                    {result.missingInformation
                      .filter((x) => !x.startsWith("Perfil incompleto"))
                      .map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                  </ul>
                </div>
              )}

              <details>
                <summary className="text-xs font-medium text-brand-700 hover:underline">Composição do score</summary>
                <table className="mt-2 w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-1 font-medium">Dimensão</th>
                      <th className="py-1 text-right font-medium">Peso</th>
                      <th className="py-1 text-right font-medium">Valor</th>
                      <th className="py-1 text-right font-medium">Pontos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.breakdown.dimensions.map((d) => (
                      <tr key={d.dimension}>
                        <td className="py-1">
                          {DIMENSION_LABEL[d.dimension]}
                          <span className="block text-[11px] text-slate-500">{d.note}</span>
                        </td>
                        <td className="py-1 text-right tabular-nums">{d.weight}</td>
                        <td className="py-1 text-right tabular-nums">{d.value == null ? "desconhecido (0,5)" : d.value.toFixed(2)}</td>
                        <td className="py-1 text-right tabular-nums">{d.points.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.breakdown.cap && <p className="mt-1 text-xs text-slate-600">Score limitado a {result.breakdown.cap.value}: {result.breakdown.cap.reason}</p>}
                {result.breakdown.confidenceFactors.length > 0 && <p className="mt-1 text-xs text-slate-600">Confiança reduzida: {result.breakdown.confidenceFactors.join("; ")}.</p>}
              </details>

              {m && (
                <p className="text-[11px] text-slate-500">
                  Perfil v{m.profileVersion} · motor {m.engineVersion} · calculado em {formatDateTime(m.computedAt)} · histórico: {a.history.length} cálculo(s)
                </p>
              )}
            </div>
          )}
        </div>

        {/* ------------------------------------------------ human decision */}
        <div className="bg-brand-50/60 p-4 lg:col-span-2">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-800">
            <UserCheck className="size-3.5" aria-hidden />
            Decisão humana
          </p>
          <DecisionBadge status={decision} />
          {decision === "READY_FOR_HUMAN_SUBMISSION" && (
            <div className="mt-3">
              <Notice tone="brand" icon={<Gavel className="size-4" aria-hidden />} title="Portão de envio humano">
                O Radar Público não envia lances, propostas, documentos ou declarações. O envio oficial deve ser feito por uma pessoa no portal da contratação.
                Depois, registre aqui como “Enviada externamente”.
              </Notice>
            </div>
          )}
          {canAct ? (
            <div className="mt-3 flex flex-col gap-4">
              <ActionForm action={decide} className="flex flex-col gap-2" resetOnSuccess>
                <input type="hidden" name="opportunityId" value={opportunityId} />
                <input type="hidden" name="profileId" value={a.profile.id} />
                <Field label="Registrar decisão" htmlFor={`to-${a.profile.slug}`}>
                  <Select id={`to-${a.profile.slug}`} name="to" defaultValue="" required>
                    <option value="" disabled>
                      Selecione…
                    </option>
                    {HUMAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {WORKFLOW_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Motivo (opcional)" htmlFor={`reason-${a.profile.slug}`}>
                  <Select id={`reason-${a.profile.slug}`} name="reasonCode" defaultValue="">
                    <option value="">—</option>
                    <optgroup label="Interesse">
                      {Object.entries(INTEREST_REASONS).map(([k, v]) => (
                        <option key={`i-${k}`} value={k}>
                          {v}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Descarte">
                      {Object.entries(DISCARD_REASONS)
                        .filter(([k]) => k !== "OTHER")
                        .map(([k, v]) => (
                          <option key={`d-${k}`} value={k}>
                            {v}
                          </option>
                        ))}
                    </optgroup>
                  </Select>
                </Field>
                <Field label="Comentário (opcional)" htmlFor={`reasonText-${a.profile.slug}`}>
                  <Textarea id={`reasonText-${a.profile.slug}`} name="reasonText" rows={2} maxLength={1000} />
                </Field>
                <label className="flex items-start gap-2 text-xs text-slate-700">
                  <input type="checkbox" name="confirmManualSubmission" className="mt-0.5" />
                  <span>Para “Enviada externamente”: confirmo que a proposta foi enviada por uma pessoa, no portal oficial, fora do Radar Público.</span>
                </label>
                <button type="submit" className={buttonClass.primary}>
                  Registrar decisão
                </button>
              </ActionForm>

              <details className="rounded-md border border-slate-200 bg-white p-3">
                <summary className="text-xs font-semibold text-slate-700">Ajuste manual da análise</summary>
                <ActionForm action={override} className="mt-2 flex flex-col gap-2" resetOnSuccess>
                  <input type="hidden" name="opportunityId" value={opportunityId} />
                  <input type="hidden" name="profileId" value={a.profile.id} />
                  <Field label="Campo" htmlFor={`field-${a.profile.slug}`}>
                    <Select id={`field-${a.profile.slug}`} name="field" defaultValue="SCORE">
                      <option value="SCORE">Score (0–100)</option>
                      <option value="COMPATIBILITY_STATUS">Status de compatibilidade</option>
                      <option value="CATEGORY">Categoria</option>
                      <option value="SERVICE_MAPPING">Mapeamento de serviços</option>
                      <option value="RISK">Risco</option>
                      <option value="PROFILE_MATCH">Compatibilidade do perfil</option>
                    </Select>
                  </Field>
                  <Field label="Novo valor" htmlFor={`mv-${a.profile.slug}`} hint="Score: número 0–100. Status: HIGH_COMPATIBILITY, MEDIUM_COMPATIBILITY, LOW_COMPATIBILITY, REQUIRES_REVIEW, LIKELY_INCOMPATIBLE, INSUFFICIENT_INFORMATION.">
                    <Input id={`mv-${a.profile.slug}`} name="manualValue" required maxLength={500} />
                  </Field>
                  <Field label="Motivo" htmlFor={`mr-${a.profile.slug}`}>
                    <Textarea id={`mr-${a.profile.slug}`} name="reason" rows={2} required minLength={5} maxLength={1000} />
                  </Field>
                  <button type="submit" className={buttonClass.secondary}>
                    Salvar ajuste (automático é preservado)
                  </button>
                </ActionForm>
              </details>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-600">Seu perfil de acesso é somente leitura.</p>
          )}

          {a.overrides.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-1 text-xs font-semibold text-slate-700">Ajustes manuais</h3>
              <ul className="flex flex-col gap-2">
                {a.overrides.map((o) => (
                  <li key={o.id} className={cx("rounded-md border p-2 text-xs", o.active ? "border-brand-200 bg-white" : "border-slate-200 bg-slate-50 text-slate-500")}>
                    <p>
                      <span className="font-semibold">{o.field}</span>: automático <code>{JSON.stringify(o.automaticValue)}</code> → manual <code>{JSON.stringify(o.manualValue)}</code>
                      {!o.active && " (revogado/substituído)"}
                    </p>
                    <p className="mt-0.5">“{o.reason}” — {o.userName ?? "usuário"}, {formatDateTime(o.createdAt)}</p>
                    {o.active && canAct && (
                      <form action={removeOverride} className="mt-1">
                        <input type="hidden" name="overrideId" value={o.id} />
                        <button type="submit" className="text-brand-700 underline">
                          Revogar ajuste
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
