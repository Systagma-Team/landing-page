import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { Database, PlugZap } from "lucide-react";
import { runCollectorNow, testSource, toggleSource, updateSourceModalities } from "@/app/actions/settings";
import { ActionForm } from "@/components/action-form";
import { Badge, buttonClass, Card, CardBody, CardHeader, DescriptionList, Field, Input, Notice, PageHeader, Table, Td, Th } from "@/components/ui";
import { getDb, schema } from "@/db";
import { formatDateTime } from "@/lib/dates";
import { formatInt } from "@/lib/format";
import { requireUser } from "@/server/auth/dal";
import { hasRole } from "@/server/auth/roles";
import { PNCP_MODALITIES } from "@/server/matching/classify";
import { SOURCE_DEFINITIONS } from "@/server/sources/definitions";

export const metadata: Metadata = { title: "Fontes de dados" };

const RUN_TONE = { SUCCESS: "positive", PARTIAL: "attention", FAILED: "negative", RUNNING: "info" } as const;
const RUN_LABEL = { SUCCESS: "Sucesso", PARTIAL: "Parcial", FAILED: "Falha", RUNNING: "Em execução" } as const;

export default async function SourcesPage() {
  const user = await requireUser();
  const isAdmin = hasRole(user.role, "ADMIN");
  const db = getDb();
  const sources = await db.select().from(schema.sources);
  const runs = await db.select().from(schema.sourceRuns).orderBy(desc(schema.sourceRuns.startedAt)).limit(30);

  return (
    <div>
      <PageHeader
        eyebrow="Configurações"
        title="Fontes de dados"
        description="Saúde dos coletores oficiais. Cada fonte roda de forma independente: a falha de uma não interrompe as demais. Coletores rodam no worker em segundo plano."
      />
      <div className="mb-5">
        <Notice tone="info">
          Endpoints e campos foram implementados a partir da documentação oficial e de clientes públicos recentes. Antes de uso em produção, confira o checklist em{" "}
          <code>docs/SOURCES.md</code> (endpoint, autenticação, limites, paginação, campos e termos de uso).
        </Notice>
      </div>
      <div className="flex flex-col gap-6">
        {SOURCE_DEFINITIONS.map((def) => {
          const s = sources.find((x) => x.key === def.key);
          if (!s) return null;
          const config = { ...def.defaultConfig, ...s.config } as Record<string, unknown>;
          const modalities = (config.modalities as number[] | undefined) ?? [];
          return (
            <Card key={def.key}>
              <CardHeader
                title={def.name}
                icon={<Database className="size-4 text-slate-500" aria-hidden />}
                description={def.description}
                actions={
                  <div className="flex items-center gap-2">
                    {s.enabled ? <Badge tone="positive">Ativa</Badge> : <Badge tone="muted">Desativada</Badge>}
                    {s.lastStatus && <Badge tone={RUN_TONE[s.lastStatus]}>{RUN_LABEL[s.lastStatus]}</Badge>}
                  </div>
                }
              />
              <CardBody className="flex flex-col gap-4">
                <DescriptionList
                  columns={3}
                  items={[
                    { label: "Última execução", value: formatDateTime(s.lastRunAt) },
                    { label: "Último sucesso", value: formatDateTime(s.lastSuccessAt) },
                    { label: "Registros na última coleta", value: s.lastRecordsCollected != null ? formatInt(s.lastRecordsCollected) : "—" },
                    { label: "Falhas consecutivas", value: String(s.consecutiveFailures) },
                    { label: "Cursores", value: Object.entries(s.cursors).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—" },
                    { label: "Coletores", value: def.collectors.map((c) => `${c.label} (${c.cron})`).join(" · ") || "Nenhum" },
                  ]}
                />
                {s.lastError && <Notice tone="negative" title="Último erro">{s.lastError}</Notice>}
                <div className="flex flex-wrap items-start gap-3">
                  <ActionForm action={testSource}>
                    <input type="hidden" name="sourceKey" value={def.key} />
                    <button type="submit" className={buttonClass.secondary}>
                      <PlugZap className="size-4" aria-hidden />
                      Testar conexão
                    </button>
                  </ActionForm>
                  {isAdmin && (
                    <ActionForm action={toggleSource}>
                      <input type="hidden" name="sourceKey" value={def.key} />
                      {!s.enabled && <input type="hidden" name="enabled" value="on" />}
                      <button type="submit" className={s.enabled ? buttonClass.danger : buttonClass.secondary} disabled={!s.enabled && def.collectors.length === 0}>
                        {s.enabled ? "Desativar fonte" : "Ativar fonte"}
                      </button>
                    </ActionForm>
                  )}
                  {isAdmin &&
                    s.enabled &&
                    def.collectors.map((c) => (
                      <ActionForm key={c.name} action={runCollectorNow}>
                        <input type="hidden" name="sourceKey" value={def.key} />
                        <input type="hidden" name="collector" value={c.name} />
                        <button type="submit" className={buttonClass.secondary}>
                          Coletar agora: {c.label}
                        </button>
                      </ActionForm>
                    ))}
                </div>
                {isAdmin && def.collectors.length > 0 && (
                  <details>
                    <summary className="text-xs font-medium text-brand-700 hover:underline">Modalidades e janela de coleta</summary>
                    <ActionForm action={updateSourceModalities} className="mt-2 flex flex-col gap-3">
                      <input type="hidden" name="sourceKey" value={def.key} />
                      <fieldset>
                        <legend className="text-xs text-slate-600">Modalidades coletadas (leilões excluídos por padrão: são vendas de bens públicos)</legend>
                        <div className="mt-1 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
                          {Object.entries(PNCP_MODALITIES).map(([code, name]) => (
                            <label key={code} className="flex items-center gap-1.5">
                              <input type="checkbox" name="modalities" value={code} defaultChecked={modalities.includes(Number(code))} />
                              {code} — {name}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <Field label="Janela inicial (dias para trás na primeira coleta)" htmlFor={`lb-${def.key}`} className="max-w-xs">
                        <Input id={`lb-${def.key}`} name="initialLookbackDays" defaultValue={String(config.initialLookbackDays ?? 3)} inputMode="numeric" />
                      </Field>
                      <button type="submit" className={`${buttonClass.primary} self-start`}>
                        Salvar configuração
                      </button>
                    </ActionForm>
                  </details>
                )}
              </CardBody>
            </Card>
          );
        })}

        <Card>
          <CardHeader title="Execuções recentes" description="Registro de cada coleta: janela, volume, falhas e erros." />
          <CardBody className="p-0">
            {runs.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500">Nenhuma execução registrada. Inicie o worker com <code>npm run worker</code>.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Início</Th>
                    <Th>Fonte / coletor</Th>
                    <Th>Janela</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Lidos</Th>
                    <Th className="text-right">Novos</Th>
                    <Th className="text-right">Atualizados</Th>
                    <Th className="text-right">Falhas</Th>
                    <Th>Erros</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <Td className="whitespace-nowrap text-xs">{formatDateTime(r.startedAt)}</Td>
                      <Td className="text-xs">
                        {r.sourceKey} / {r.collector}
                      </Td>
                      <Td className="whitespace-nowrap text-xs">
                        {r.windowFrom} → {r.windowTo}
                      </Td>
                      <Td>
                        <Badge tone={RUN_TONE[r.status]}>{RUN_LABEL[r.status]}</Badge>
                      </Td>
                      <Td className="text-right tabular-nums">{formatInt(r.fetched)}</Td>
                      <Td className="text-right tabular-nums">{formatInt(r.created)}</Td>
                      <Td className="text-right tabular-nums">{formatInt(r.updated)}</Td>
                      <Td className="text-right tabular-nums">{formatInt(r.failedRecords)}</Td>
                      <Td className="max-w-md text-xs text-red-700">{r.errors.slice(0, 2).map((e) => e.message).join(" · ")}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
