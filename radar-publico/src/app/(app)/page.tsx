import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, FileWarning, Lightbulb, Search, Sparkles, Telescope, UserCog, Workflow } from "lucide-react";
import { OpportunityCard } from "@/components/opportunity-card";
import { Badge, Card, CardBody, CardHeader, EmptyState, Notice, PageHeader, Stat } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { formatInt } from "@/lib/format";
import { requireUser } from "@/server/auth/dal";
import { hasRole } from "@/server/auth/roles";
import { getDashboard } from "@/server/opportunities/dashboard";

export const metadata: Metadata = { title: "Painel" };

function SourceStatus({ status, enabled }: { status: string | null; enabled: boolean }) {
  if (!enabled) return <Badge tone="muted">Desativada</Badge>;
  if (!status) return <Badge tone="muted">Aguardando 1ª coleta</Badge>;
  if (status === "SUCCESS") return <Badge tone="positive"><CheckCircle2 className="size-3" aria-hidden />Operando</Badge>;
  if (status === "PARTIAL") return <Badge tone="attention"><AlertTriangle className="size-3" aria-hidden />Parcial</Badge>;
  return <Badge tone="negative"><AlertTriangle className="size-3" aria-hidden />Falha</Badge>;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const d = await getDashboard(user.organizationId);
  const canAct = hasRole(user.role, "ANALYST");
  const m = d.metrics;

  return (
    <div>
      <PageHeader
        title="Painel"
        description="O que é relevante para nós agora. Números consideram apenas oportunidades analisadas como compatíveis ou em revisão para os perfis desta organização."
      />

      {d.profileCompleteness.length > 0 && (
        <div className="mb-5 flex flex-col gap-2">
          {d.profileCompleteness.map(({ profile, missing }) => (
            <Notice key={profile.id} tone="attention" icon={<UserCog className="size-4" aria-hidden />} title={`PERFIL INCOMPLETO — ${profile.displayName}`}>
              Faltam: {missing.join(", ")}. O score deste perfil não é autoritativo até os dados reais serem cadastrados.{" "}
              <Link className="font-medium underline" href={`/perfis/${profile.slug}`}>
                Completar perfil
              </Link>
            </Notice>
          ))}
        </div>
      )}

      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Novas (7 dias)" value={formatInt(m.newLast7Days)} icon={<Sparkles className="size-3.5" aria-hidden />} href="/oportunidades?ordem=publicacao" tone="brand" />
        {m.highByProfile.map(({ profile, count }) => (
          <Stat
            key={profile.id}
            label={`Alta compatibilidade · ${profile.displayName}`}
            value={formatInt(count)}
            icon={<CheckCircle2 className="size-3.5" aria-hidden />}
            href={`/oportunidades?aba=alta&perfil=${profile.slug}`}
            tone="positive"
          />
        ))}
        <Stat label="Prazo em até 7 dias" value={formatInt(m.deadline7)} icon={<CalendarClock className="size-3.5" aria-hidden />} href="/oportunidades?prazo=7&ordem=prazo" tone={m.deadline7 > 0 ? "negative" : "neutral"} />
        <Stat label="Prazo em até 30 dias" value={formatInt(m.deadline30)} icon={<CalendarClock className="size-3.5" aria-hidden />} href="/oportunidades?prazo=30&ordem=prazo" tone="attention" />
        <Stat label="Aguardando revisão" value={formatInt(m.awaitingReview)} icon={<Search className="size-3.5" aria-hidden />} href="/oportunidades?aba=revisar" tone="attention" />
        <Stat label="Em andamento (decisão humana)" value={formatInt(m.inProgress)} icon={<Workflow className="size-3.5" aria-hidden />} href="/oportunidades?aba=andamento" tone="brand" />
        <Stat label="Contratações futuras (PCA)" value={formatInt(m.future)} icon={<Telescope className="size-3.5" aria-hidden />} href="/radar-futuro" tone="info" />
        <Stat label="Inovação (CPSI/ETEC/diálogo)" value={formatInt(m.innovation)} icon={<Lightbulb className="size-3.5" aria-hidden />} href="/inovacao" tone="info" />
        <Stat label="Possíveis lacunas documentais" value={formatInt(m.documentationGaps)} icon={<FileWarning className="size-3.5" aria-hidden />} hint="em oportunidades relevantes abertas" href="/oportunidades?ordem=score" tone={m.documentationGaps > 0 ? "attention" : "neutral"} />
        <Stat label="Documentos vencendo (30 dias)" value={formatInt(m.expiringDocuments)} icon={<FileWarning className="size-3.5" aria-hidden />} href="/cofre" tone={m.expiringDocuments > 0 ? "negative" : "neutral"} />
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-3 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Prioridades (análise automática)</h2>
            <Link href="/oportunidades" className="text-sm font-medium text-brand-700 hover:underline">
              Ver todas
            </Link>
          </div>
          {d.priorities.length === 0 ? (
            <EmptyState title="Nenhuma oportunidade priorizada ainda">
              Assim que os coletores rodarem e os perfis estiverem configurados, as oportunidades mais compatíveis aparecerão aqui.
            </EmptyState>
          ) : (
            d.priorities.map((o) => <OpportunityCard key={o.id} o={o} canAct={canAct} />)
          )}
        </div>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Prazos próximos" icon={<CalendarClock className="size-4 text-slate-500" aria-hidden />} description="Relevantes ou favoritas, próximos 30 dias" />
            <CardBody className="p-0">
              {d.upcoming.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-500">Nenhum prazo nos próximos 30 dias.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {d.upcoming.map((o) => (
                    <li key={o.id} className="px-4 py-2.5">
                      <Link href={`/oportunidades/${o.id}`} className="block text-sm font-medium text-slate-900 hover:text-brand-700">
                        {o.title}
                      </Link>
                      <p className="truncate text-xs text-slate-500">{o.organizationName}</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-700">{formatDateTime(o.proposalDeadline)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title="Saúde das fontes"
              actions={
                <Link href="/configuracoes/fontes" className="text-xs font-medium text-brand-700 hover:underline">
                  Detalhes
                </Link>
              }
            />
            <CardBody className="p-0">
              <ul className="divide-y divide-slate-100">
                {d.sources.map((s) => (
                  <li key={s.key} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500">
                        Última coleta bem-sucedida: {formatDateTime(s.lastSuccessAt)}
                        {s.lastRecordsCollected != null && ` · ${formatInt(s.lastRecordsCollected)} registros`}
                      </p>
                      {s.lastError && s.lastStatus !== "SUCCESS" && <p className="mt-0.5 line-clamp-2 text-xs text-red-700">{s.lastError}</p>}
                    </div>
                    <SourceStatus status={s.lastStatus} enabled={s.enabled} />
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
