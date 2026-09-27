import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Ban, Check, CircleSlash, MapPin, Star, Triangle } from "lucide-react";
import { quickDecision, toggleWatch } from "@/app/actions/opportunities";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatBRL } from "@/lib/format";
import { SOURCE_LABEL, STATUS_LABEL } from "@/lib/labels";
import type { OpportunityCardData } from "@/server/opportunities/queries";
import { CompatibilityBadge, DeadlineBadge, DecisionBadge, InnovationBadge, KindBadge, ScoreMeter } from "./status";
import { Badge, buttonClass, cx } from "./ui";

export function OpportunityCard({ o, canAct, focusProfileSlug }: { o: OpportunityCardData; canAct: boolean; focusProfileSlug?: string }) {
  const matches = focusProfileSlug ? o.matches.filter((m) => m.profileSlug === focusProfileSlug) : o.matches;
  const top = matches[0];
  const topDecision = top ? o.workflows.find((w) => w.profileId === top.profileId)?.status : undefined;
  const location = [o.city, o.state].filter(Boolean).join(" / ");

  return (
    <article className="rounded-lg border border-slate-200 bg-white shadow-xs transition hover:border-slate-300">
      <div className="flex flex-col gap-3 p-4 md:flex-row">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <KindBadge kind={o.kind} />
            {o.modalityName && <Badge tone="muted">{o.modalityName}</Badge>}
            <InnovationBadge innovationClass={o.innovationClass} />
            {o.status !== "PUBLISHED" && <Badge tone={o.status === "CANCELLED" ? "negative" : "attention"}>{STATUS_LABEL[o.status]}</Badge>}
          </div>
          <p className="mt-2 truncate text-xs font-semibold uppercase tracking-wide text-slate-500" title={o.organizationName ?? undefined}>
            {o.organizationName ?? "Órgão não informado"}
            {o.unitName && <span className="font-normal normal-case tracking-normal"> · {o.unitName}</span>}
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-slate-900">
            <Link href={`/oportunidades/${o.id}`} className="hover:text-brand-700 hover:underline">
              {o.title}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-3 text-sm text-slate-700">
            <span className="font-medium text-slate-500">Objeto: </span>
            {o.objectDescription}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-slate-500">Valor estimado</dt>
              <dd className="font-medium tabular-nums text-slate-900">{formatBRL(o.estimatedValue)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Local</dt>
              <dd className="flex items-center gap-1 font-medium text-slate-900">
                <MapPin className="size-3 text-slate-400" aria-hidden />
                {location || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{o.kind === "FUTURE_PROCUREMENT" ? "Previsão" : "Prazo da proposta"}</dt>
              <dd className="flex flex-wrap items-center gap-1 font-medium text-slate-900">
                {o.kind === "FUTURE_PROCUREMENT" ? (
                  formatDate(o.expectedDate)
                ) : (
                  <>
                    <DeadlineBadge deadline={o.proposalDeadline} kind={o.kind} />
                    <span className="sr-only">{formatDateTime(o.proposalDeadline)}</span>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Fonte</dt>
              <dd className="font-medium text-slate-900">{o.sources.map((s) => SOURCE_LABEL[s] ?? s).join(", ") || "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="flex shrink-0 flex-col gap-2 md:w-80">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Análise automática</p>
          {matches.length === 0 && <p className="text-xs text-slate-500">Sem compatibilidade calculada para os perfis.</p>}
          {matches.map((m) => (
            <div key={m.profileId} className="rounded-md border border-slate-200 bg-slate-50/70 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-700">{m.profileName}</span>
                <ScoreMeter score={m.score} manual={m.manual} size="sm" />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <CompatibilityBadge status={m.status} />
                {m.profileIncomplete && <Badge tone="attention" title="Dados do perfil incompletos — confiança reduzida">perfil incompleto</Badge>}
              </div>
              {m.capabilities.length > 0 && (
                <ul className="mt-2 flex flex-col gap-0.5 text-xs text-emerald-800">
                  {m.capabilities.slice(0, 4).map((c) => (
                    <li key={c} className="flex items-center gap-1">
                      <Check className="size-3" aria-hidden />
                      {c}
                    </li>
                  ))}
                </ul>
              )}
              {(m.attention.length > 0 || m.blockers.length > 0 || m.gaps.length > 0) && (
                <ul className="mt-1.5 flex flex-col gap-0.5 text-xs">
                  {m.blockers.slice(0, 2).map((b) => (
                    <li key={b.code + b.message} className="flex items-start gap-1 text-red-800">
                      <Ban className="mt-0.5 size-3 shrink-0" aria-hidden />
                      <span>
                        <span className="sr-only">Bloqueio potencial: </span>
                        {b.message}
                      </span>
                    </li>
                  ))}
                  {m.attention.slice(0, 2).map((a) => (
                    <li key={a.code + a.message} className="flex items-start gap-1 text-amber-900">
                      <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
                      <span>
                        <span className="sr-only">Atenção: </span>
                        {a.message}
                      </span>
                    </li>
                  ))}
                  {m.gaps.length > 0 && (
                    <li className="flex items-start gap-1 text-amber-900">
                      <Triangle className="mt-0.5 size-3 shrink-0" aria-hidden />
                      {m.gaps.length} possível(is) lacuna(s)
                    </li>
                  )}
                </ul>
              )}
            </div>
          ))}
          <DecisionBadge status={topDecision} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-2">
        <Link href={`/oportunidades/${o.id}`} className={buttonClass.small}>
          Ver análise
        </Link>
        {o.sourceUrl && (
          <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className={buttonClass.small}>
            Ver edital na fonte
            <ArrowUpRight className="size-3" aria-hidden />
          </a>
        )}
        {canAct && (
          <>
            <form action={toggleWatch}>
              <input type="hidden" name="opportunityId" value={o.id} />
              <button type="submit" className={cx(buttonClass.small, o.watchlisted && "border-amber-300 bg-amber-50 text-amber-900")} aria-pressed={o.watchlisted}>
                <Star className={cx("size-3", o.watchlisted && "fill-amber-400 text-amber-500")} aria-hidden />
                {o.watchlisted ? "Favorita" : "Favoritar"}
              </button>
            </form>
            {top && !topDecision && (
              <>
                <form action={quickDecision}>
                  <input type="hidden" name="opportunityId" value={o.id} />
                  <input type="hidden" name="profileId" value={top.profileId} />
                  <input type="hidden" name="to" value="INTERESTED" />
                  <button type="submit" className={buttonClass.small}>
                    <Check className="size-3" aria-hidden />
                    Marcar interesse ({top.profileName})
                  </button>
                </form>
                <form action={quickDecision}>
                  <input type="hidden" name="opportunityId" value={o.id} />
                  <input type="hidden" name="profileId" value={top.profileId} />
                  <input type="hidden" name="to" value="DISCARDED" />
                  <button type="submit" className={buttonClass.small}>
                    <CircleSlash className="size-3" aria-hidden />
                    Descartar ({top.profileName})
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </article>
  );
}
