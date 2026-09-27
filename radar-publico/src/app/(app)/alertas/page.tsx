import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Bell, CheckCheck, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { markAlertRead, markAllRead } from "@/app/actions/alerts";
import { Badge, buttonClass, cx, EmptyState, PageHeader } from "@/components/ui";
import { getDb, schema } from "@/db";
import { formatDateTime } from "@/lib/dates";
import { ALERT_TYPE_LABEL } from "@/lib/labels";
import { requireUser } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Alertas" };

const SEVERITY = {
  CRITICAL: { tone: "negative" as const, icon: <CircleAlert className="size-4 text-red-600" aria-hidden />, label: "Crítico" },
  ATTENTION: { tone: "attention" as const, icon: <TriangleAlert className="size-4 text-amber-600" aria-hidden />, label: "Atenção" },
  INFO: { tone: "info" as const, icon: <Info className="size-4 text-sky-600" aria-hidden />, label: "Informativo" },
};

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ filtro?: string; tipo?: string }> }) {
  const user = await requireUser();
  const { filtro, tipo } = await searchParams;
  const onlyUnread = filtro !== "todos";
  const conds = [eq(schema.alertDeliveries.userId, user.id), eq(schema.alertDeliveries.channel, "IN_APP")];
  if (onlyUnread) conds.push(isNull(schema.alertDeliveries.readAt));
  if (tipo && tipo in ALERT_TYPE_LABEL) conds.push(sql`${schema.alerts.type} = ${tipo}`);
  const rows = await getDb()
    .select({ d: schema.alertDeliveries, a: schema.alerts, profileName: schema.procurementProfiles.displayName })
    .from(schema.alertDeliveries)
    .innerJoin(schema.alerts, eq(schema.alerts.id, schema.alertDeliveries.alertId))
    .leftJoin(schema.procurementProfiles, eq(schema.procurementProfiles.id, schema.alerts.profileId))
    .where(and(...conds))
    .orderBy(desc(schema.alerts.createdAt))
    .limit(200);

  const link = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(Object.entries({ filtro, tipo, ...params }).filter(([, v]) => v) as [string, string][]);
    return `/alertas${sp.size ? `?${sp}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Alertas"
        description="Novas oportunidades compatíveis, prazos, alterações em contratações acompanhadas, documentos vencendo e falhas de coleta. Preferências de e-mail/webhook em Configurações → Notificações."
        actions={
          <form action={markAllRead}>
            <button type="submit" className={buttonClass.secondary}>
              <CheckCheck className="size-4" aria-hidden />
              Marcar todos como lidos
            </button>
          </form>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Link href={link({ filtro: undefined })} className={cx(buttonClass.small, onlyUnread && "border-brand-400 bg-brand-50")} aria-current={onlyUnread ? "page" : undefined}>
          Não lidos
        </Link>
        <Link href={link({ filtro: "todos" })} className={cx(buttonClass.small, !onlyUnread && "border-brand-400 bg-brand-50")} aria-current={!onlyUnread ? "page" : undefined}>
          Todos
        </Link>
        <span className="mx-1 text-slate-300">|</span>
        {Object.entries(ALERT_TYPE_LABEL).map(([k, v]) => (
          <Link key={k} href={link({ tipo: tipo === k ? undefined : k })} className={cx(buttonClass.small, tipo === k && "border-brand-400 bg-brand-50")}>
            {v}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState title={onlyUnread ? "Nenhum alerta não lido" : "Nenhum alerta"} icon={<Bell className="size-8" aria-hidden />} />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ d, a, profileName }) => {
            const sev = SEVERITY[a.severity];
            return (
              <li key={d.id} className={cx("flex gap-3 rounded-lg border bg-white p-3 shadow-xs", d.readAt ? "border-slate-200 opacity-75" : "border-l-4 border-slate-200 border-l-brand-500")}>
                <div className="mt-0.5">{sev.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={sev.tone}>{sev.label}</Badge>
                    <Badge tone="muted">{ALERT_TYPE_LABEL[a.type]}</Badge>
                    {profileName && <Badge tone="brand">{profileName}</Badge>}
                    <span className="text-xs text-slate-500">{formatDateTime(a.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {a.opportunityId ? (
                      <Link href={`/oportunidades/${a.opportunityId}`} className="hover:underline">
                        {a.title}
                      </Link>
                    ) : a.profileDocumentId ? (
                      <Link href="/cofre" className="hover:underline">
                        {a.title}
                      </Link>
                    ) : (
                      a.title
                    )}
                  </p>
                  <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700">{a.body}</p>
                </div>
                {!d.readAt && (
                  <form action={markAlertRead}>
                    <input type="hidden" name="deliveryId" value={d.id} />
                    <button type="submit" className={buttonClass.small}>
                      Marcar como lido
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
