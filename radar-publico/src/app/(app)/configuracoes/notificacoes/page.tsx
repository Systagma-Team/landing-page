import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { addNotificationPreference, removeNotificationPreference } from "@/app/actions/settings";
import { ActionForm } from "@/components/action-form";
import { Badge, buttonClass, Card, CardBody, CardHeader, Field, Input, Notice, PageHeader, Select } from "@/components/ui";
import { getDb, schema } from "@/db";
import { ALERT_TYPE_LABEL, CHANNEL_LABEL, FREQUENCY_LABEL } from "@/lib/labels";
import { requireUser } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const db = getDb();
  const [prefs, profiles] = await Promise.all([
    db.select().from(schema.notificationPreferences).where(eq(schema.notificationPreferences.userId, user.id)),
    db.select().from(schema.procurementProfiles).where(eq(schema.procurementProfiles.organizationId, user.organizationId)).orderBy(asc(schema.procurementProfiles.kind)),
  ]);
  const smtp = !!process.env.SMTP_HOST;
  return (
    <div>
      <PageHeader
        eyebrow="Configurações"
        title="Notificações"
        description="Todos os alertas aparecem no sistema. Aqui você escolhe receber também por e-mail, webhook ou Slack — imediatamente ou em resumo diário/semanal — por perfil."
      />
      {!smtp && (
        <div className="mb-5">
          <Notice tone="attention">E-mail ainda não configurado no servidor (SMTP_HOST). Preferências de e-mail ficam registradas, mas não serão enviadas até a configuração.</Notice>
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Minhas preferências" />
          <CardBody className="p-0">
            {prefs.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500">Somente alertas no sistema.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {prefs.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="brand">{CHANNEL_LABEL[p.channel]}</Badge>
                        <Badge tone="muted">{FREQUENCY_LABEL[p.frequency]}</Badge>
                        <Badge tone="muted">{profiles.find((x) => x.id === p.profileId)?.displayName ?? "Todos os perfis"}</Badge>
                        <Badge tone="muted">score ≥ {p.minScore}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {p.alertTypes.length === 0 ? "Todos os tipos de alerta" : p.alertTypes.map((t) => ALERT_TYPE_LABEL[t] ?? t).join(", ")}
                        {p.target && ` · destino: ${p.channel === "EMAIL" ? p.target : `${p.target.slice(0, 40)}…`}`}
                      </p>
                    </div>
                    <ActionForm action={removeNotificationPreference}>
                      <input type="hidden" name="preferenceId" value={p.id} />
                      <button type="submit" className={buttonClass.small}>
                        Remover
                      </button>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Adicionar preferência" />
          <CardBody>
            <ActionForm action={addNotificationPreference} className="flex flex-col gap-3" resetOnSuccess>
              <Field label="Canal" htmlFor="channel" hint="Webhook e Slack: apenas administradores.">
                <Select id="channel" name="channel" defaultValue="EMAIL">
                  <option value="EMAIL">E-mail</option>
                  <option value="WEBHOOK">Webhook (JSON assinado)</option>
                  <option value="SLACK">Slack (incoming webhook)</option>
                </Select>
              </Field>
              <Field label="Destino" htmlFor="target" hint={`E-mail (vazio = ${user.email}) ou URL HTTPS`}>
                <Input id="target" name="target" />
              </Field>
              <Field label="Frequência" htmlFor="frequency">
                <Select id="frequency" name="frequency" defaultValue="IMMEDIATE">
                  {Object.entries(FREQUENCY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Perfil" htmlFor="profileId">
                <Select id="profileId" name="profileId" defaultValue="all">
                  <option value="all">Todos os perfis</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Score mínimo (alta compatibilidade)" htmlFor="minScore">
                <Input id="minScore" name="minScore" defaultValue="75" inputMode="numeric" />
              </Field>
              <fieldset>
                <legend className="text-xs font-medium text-slate-700">Tipos (nenhum marcado = todos)</legend>
                <div className="mt-1 flex flex-col gap-1 text-xs">
                  {Object.entries(ALERT_TYPE_LABEL).map(([k, v]) => (
                    <label key={k} className="flex items-center gap-1.5">
                      <input type="checkbox" name="alertTypes" value={k} />
                      {v}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button type="submit" className={buttonClass.primary}>
                Salvar
              </button>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
