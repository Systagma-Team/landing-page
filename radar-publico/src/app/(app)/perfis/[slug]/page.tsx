import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { AlertTriangle, History, ListPlus, Scale, Tags, UserCog, X } from "lucide-react";
import { addActivity, addCapability, addTerm, removeActivity, removeTerm, updateActivityKeywords, updateCapability, updateProfileBasics, updateScoring } from "@/app/actions/profiles";
import { ActionForm } from "@/components/action-form";
import { Badge, buttonClass, Card, CardBody, CardHeader, Field, Input, Notice, PageHeader, Select, Table, Td, Textarea, Th } from "@/components/ui";
import { getDb, schema } from "@/db";
import { formatDateTime } from "@/lib/dates";
import { formatCnpj } from "@/lib/format";
import { ACTIVITY_TYPE_LABEL, DIMENSION_LABEL, LEVEL_LABEL, UFS, VAULT_CATEGORY_LABEL } from "@/lib/labels";
import { requireUser } from "@/server/auth/dal";
import { hasRole } from "@/server/auth/roles";
import { profileCompleteness } from "@/server/matching/engine";
import { DIMENSIONS } from "@/server/matching/types";
import { buildProfileSnapshot } from "@/server/profiles/service";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const db = getDb();
  const [profile] = await db
    .select()
    .from(schema.procurementProfiles)
    .where(and(eq(schema.procurementProfiles.organizationId, user.organizationId), eq(schema.procurementProfiles.slug, slug)));
  if (!profile) notFound();
  const canEdit = hasRole(user.role, "ADMIN");
  const pid = profile.id;

  const [activities, capabilities, terms, versions, snapshot] = await Promise.all([
    db.select().from(schema.profileActivities).where(and(eq(schema.profileActivities.profileId, pid), eq(schema.profileActivities.active, true))).orderBy(asc(schema.profileActivities.createdAt)),
    db.select().from(schema.serviceCapabilities).where(eq(schema.serviceCapabilities.profileId, pid)).orderBy(asc(schema.serviceCapabilities.createdAt)),
    db.select().from(schema.taxonomyTerms).where(and(eq(schema.taxonomyTerms.profileId, pid), eq(schema.taxonomyTerms.active, true))).orderBy(asc(schema.taxonomyTerms.createdAt)),
    db
      .select({ v: schema.profileVersions, userName: schema.users.name })
      .from(schema.profileVersions)
      .leftJoin(schema.users, eq(schema.users.id, schema.profileVersions.createdBy))
      .where(eq(schema.profileVersions.profileId, pid))
      .orderBy(desc(schema.profileVersions.version))
      .limit(30),
    buildProfileSnapshot(db, pid, profile.currentVersion),
  ]);
  const completeness = profileCompleteness(snapshot);
  const negative = terms.filter((t) => t.polarity === "NEGATIVE");
  const isMei = profile.kind === "MEI";
  const hidden = <input type="hidden" name="profileId" value={pid} />;

  return (
    <div>
      <PageHeader
        eyebrow={isMei ? "Módulo MEI" : "Módulo Systagma"}
        title={`Perfil ${profile.displayName}`}
        description={
          isMei
            ? "O matching do MEI usa somente as atividades/CNAEs e ocupações reais cadastradas aqui. Nada é pré-configurado: sem dados reais, o resultado é “informação insuficiente”."
            : "Capacidades e termos de descoberta são sinais configuráveis — não filtros exatos. Ajuste o que a Systagma realmente oferece hoje."
        }
        actions={<Badge tone="brand">Versão {profile.currentVersion}</Badge>}
      />

      {completeness.value < 1 && (
        <div className="mb-5">
          <Notice tone="attention" icon={<AlertTriangle className="size-4" aria-hidden />} title="PERFIL INCOMPLETO">
            Faltam: {completeness.missing.join(", ")}. A plataforma funciona com dados parciais, mas reduz a confiança das análises.
            {completeness.missing.some((m) => m.startsWith("Documentos") || m.startsWith("Evidências")) && (
              <>
                {" "}
                Documentos e evidências são cadastrados no{" "}
                <Link href={`/cofre?perfil=${profile.slug}`} className="font-medium underline">
                  Cofre
                </Link>
                .
              </>
            )}
          </Notice>
        </div>
      )}
      {!canEdit && (
        <div className="mb-5">
          <Notice tone="neutral">Somente administradores alteram perfis, taxonomia e pesos. Você está vendo em modo leitura.</Notice>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <Card>
            <CardHeader title="Dados do perfil" icon={<UserCog className="size-4 text-slate-500" aria-hidden />} description="Identificação, habilitação e preferências comerciais" />
            <CardBody>
              <ActionForm action={updateProfileBasics} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {hidden}
                <fieldset disabled={!canEdit} className="contents">
                  <Field label="Nome de exibição" htmlFor="displayName">
                    <Input id="displayName" name="displayName" defaultValue={profile.displayName} maxLength={60} />
                  </Field>
                  <Field label="Razão social" htmlFor="legalName">
                    <Input id="legalName" name="legalName" defaultValue={profile.legalName ?? ""} maxLength={200} />
                  </Field>
                  <Field label="CNPJ" htmlFor="cnpj" hint={profile.cnpj ? formatCnpj(profile.cnpj) : "Não informado"}>
                    <Input id="cnpj" name="cnpj" defaultValue={profile.cnpj ?? ""} inputMode="numeric" maxLength={18} />
                  </Field>
                  <Field label="Enquadramento ME/EPP" htmlFor="isMeEpp" hint="Afeta participações exclusivas/cotas ME/EPP. Não assumimos.">
                    <Select id="isMeEpp" name="isMeEpp" defaultValue={profile.isMeEpp == null ? "unknown" : profile.isMeEpp ? "yes" : "no"}>
                      <option value="unknown">Não informado</option>
                      <option value="yes">Sim (ME/EPP/MEI)</option>
                      <option value="no">Não</option>
                    </Select>
                  </Field>
                  <Field label="Situação no SICAF" htmlFor="sicafStatus">
                    <Input id="sicafStatus" name="sicafStatus" defaultValue={profile.sicafStatus ?? ""} placeholder="Ex.: credenciado, níveis I–VI válidos até…" />
                  </Field>
                  <Field label="Capacidade operacional" htmlFor="operationalCapacity">
                    <Input id="operationalCapacity" name="operationalCapacity" defaultValue={profile.operationalCapacity ?? ""} placeholder="Ex.: 2 projetos simultâneos, 160 h/mês" />
                  </Field>
                  <Field label="Valor mínimo por contratação (R$)" htmlFor="minProjectValue">
                    <Input id="minProjectValue" name="minProjectValue" defaultValue={profile.minProjectValue ?? ""} inputMode="decimal" />
                  </Field>
                  <Field label="Valor máximo por contratação (R$)" htmlFor="maxProjectValue" hint={isMei ? "Use o limite real aplicável ao MEI — não há valor fixo no sistema." : undefined}>
                    <Input id="maxProjectValue" name="maxProjectValue" defaultValue={profile.maxProjectValue ?? ""} inputMode="decimal" />
                  </Field>
                  <div className="md:col-span-2">
                    <p className="text-xs font-medium text-slate-700">Abrangência geográfica</p>
                    <div className="mt-1 flex flex-wrap gap-4 text-sm">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" name="nationwide" defaultChecked={profile.nationwide} /> Atuação nacional
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" name="restrictToPreferredStates" defaultChecked={profile.restrictToPreferredStates} /> Restringir às UFs selecionadas
                      </label>
                    </div>
                    <fieldset className="mt-2">
                      <legend className="text-xs text-slate-500">UFs preferenciais</legend>
                      <div className="mt-1 grid grid-cols-6 gap-1 text-xs sm:grid-cols-9 md:grid-cols-14">
                        {UFS.map((uf) => (
                          <label key={uf} className="flex items-center gap-1">
                            <input type="checkbox" name="preferredStates" value={uf} defaultChecked={profile.preferredStates.includes(uf)} />
                            {uf}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                  <Field label="Notas" htmlFor="notes" className="md:col-span-2">
                    <Textarea id="notes" name="notes" rows={2} defaultValue={profile.notes ?? ""} maxLength={2000} />
                  </Field>
                  {canEdit && (
                    <div className="md:col-span-2">
                      <button type="submit" className={buttonClass.primary}>
                        Salvar dados do perfil
                      </button>
                    </div>
                  )}
                </fieldset>
              </ActionForm>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={isMei ? "Atividades registradas (CNAEs e ocupações MEI)" : "CNAEs e atividades"}
              icon={<ListPlus className="size-4 text-slate-500" aria-hidden />}
              description={isMei ? "Base do matching MEI. Cadastre exatamente o que consta no CCMEI." : "Usados na dimensão Atividade/CNAE e para detectar CNAEs exigidos em editais."}
            />
            <CardBody className="flex flex-col gap-4">
              {activities.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma atividade cadastrada.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {activities.map((a) => (
                    <li key={a.id} className="rounded-md border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          {a.code && <code className="mr-1 text-xs">{a.code}</code>}
                          {a.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge tone="muted">{ACTIVITY_TYPE_LABEL[a.type]}</Badge>
                          {canEdit && (
                            <ActionForm action={removeActivity} confirm="Remover esta atividade? O histórico de análises é preservado.">
                              {hidden}
                              <input type="hidden" name="activityId" value={a.id} />
                              <button type="submit" className={buttonClass.small}>
                                Remover
                              </button>
                            </ActionForm>
                          )}
                        </div>
                      </div>
                      <ActionForm action={updateActivityKeywords} className="mt-2 flex flex-col gap-1 md:flex-row md:items-end">
                        {hidden}
                        <input type="hidden" name="activityId" value={a.id} />
                        <Field label="Palavras-chave de descoberta (separadas por vírgula)" htmlFor={`kw-${a.id}`} className="flex-1">
                          <Input id={`kw-${a.id}`} name="keywords" defaultValue={a.keywords.join(", ")} disabled={!canEdit} />
                        </Field>
                        {canEdit && (
                          <button type="submit" className={buttonClass.secondary}>
                            Salvar
                          </button>
                        )}
                      </ActionForm>
                    </li>
                  ))}
                </ul>
              )}
              {canEdit && (
                <details className="rounded-md border border-dashed border-slate-300 p-3" open={activities.length === 0}>
                  <summary className="text-sm font-medium text-brand-700">Adicionar atividade / CNAE</summary>
                  <ActionForm action={addActivity} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4" resetOnSuccess>
                    {hidden}
                    <Field label="Tipo" htmlFor="act-type">
                      <Select id="act-type" name="type" defaultValue={isMei ? "MEI_OCCUPATION" : "CNAE_SECONDARY"}>
                        {Object.entries(ACTIVITY_TYPE_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Código (CNAE)" htmlFor="act-code" hint="Ex.: 6201-5/01">
                      <Input id="act-code" name="code" />
                    </Field>
                    <Field label="Descrição" htmlFor="act-desc" className="md:col-span-2">
                      <Input id="act-desc" name="description" required minLength={3} />
                    </Field>
                    <Field label="Palavras-chave (opcional)" htmlFor="act-kw" className="md:col-span-4" hint="Se vazio, sugerimos a partir do CNAE/descrição — revise depois.">
                      <Input id="act-kw" name="keywords" placeholder="fotografia, cobertura fotográfica" />
                    </Field>
                    <div className="md:col-span-4">
                      <button type="submit" className={buttonClass.primary}>
                        Adicionar
                      </button>
                    </div>
                  </ActionForm>
                </details>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Capacidades de serviço e termos de descoberta"
              icon={<Tags className="size-4 text-slate-500" aria-hidden />}
              description="Termos são sinais combinados com classificação, não filtros exatos. Peso 0,3 = sinal fraco; 1,2 = sinal forte."
            />
            <CardBody className="flex flex-col gap-3">
              {capabilities.length === 0 && <p className="text-sm text-slate-500">Nenhuma capacidade cadastrada.</p>}
              {capabilities.map((c) => {
                const capTerms = terms.filter((t) => t.capabilityId === c.id && t.polarity === "POSITIVE");
                return (
                  <details key={c.id} className="rounded-md border border-slate-200">
                    <summary className="flex flex-wrap items-center gap-2 px-3 py-2">
                      <span className="text-sm font-semibold text-slate-900">{c.name}</span>
                      <Badge tone="muted">{c.category}</Badge>
                      <Badge tone={c.level === "CORE" ? "positive" : "neutral"}>{LEVEL_LABEL[c.level]}</Badge>
                      {c.strategic && <Badge tone="brand">Estratégica</Badge>}
                      {!c.active && <Badge tone="negative">Inativa</Badge>}
                      <span className="text-xs text-slate-500">{capTerms.length} termo(s)</span>
                    </summary>
                    <div className="flex flex-col gap-3 border-t border-slate-100 px-3 py-3">
                      {c.description && <p className="text-xs text-slate-600">{c.description}</p>}
                      <ul className="flex flex-wrap gap-1.5">
                        {capTerms.map((t) => (
                          <li key={t.id} className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-0.5 pl-2 pr-1 text-xs">
                            <span>{t.term}</span>
                            <span className="text-slate-500">×{t.weight}</span>
                            {t.caseSensitive && <span className="text-slate-500" title="Diferencia maiúsculas (sigla)">Aa</span>}
                            {canEdit && (
                              <ActionForm action={removeTerm}>
                                {hidden}
                                <input type="hidden" name="termId" value={t.id} />
                                <button type="submit" className="rounded-full p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800" aria-label={`Remover termo ${t.term}`}>
                                  <X className="size-3" aria-hidden />
                                </button>
                              </ActionForm>
                            )}
                          </li>
                        ))}
                      </ul>
                      {canEdit && (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <ActionForm action={addTerm} className="flex flex-wrap items-end gap-2" resetOnSuccess>
                            {hidden}
                            <input type="hidden" name="capabilityId" value={c.id} />
                            <input type="hidden" name="polarity" value="POSITIVE" />
                            <Field label="Novo termo" htmlFor={`t-${c.id}`} className="min-w-40 flex-1">
                              <Input id={`t-${c.id}`} name="term" required minLength={2} maxLength={80} />
                            </Field>
                            <Field label="Peso" htmlFor={`w-${c.id}`} className="w-20">
                              <Input id={`w-${c.id}`} name="weight" defaultValue="1" inputMode="decimal" />
                            </Field>
                            <label className="flex items-center gap-1 pb-2 text-xs">
                              <input type="checkbox" name="caseSensitive" /> Sigla
                            </label>
                            <button type="submit" className={buttonClass.secondary}>
                              Adicionar
                            </button>
                          </ActionForm>
                          <ActionForm action={updateCapability} className="flex flex-wrap items-end gap-2">
                            {hidden}
                            <input type="hidden" name="capabilityId" value={c.id} />
                            <Field label="Nível" htmlFor={`l-${c.id}`} className="w-36">
                              <Select id={`l-${c.id}`} name="level" defaultValue={c.level}>
                                {Object.entries(LEVEL_LABEL).map(([k, v]) => (
                                  <option key={k} value={k}>
                                    {v}
                                  </option>
                                ))}
                              </Select>
                            </Field>
                            <label className="flex items-center gap-1 pb-2 text-xs">
                              <input type="checkbox" name="strategic" defaultChecked={c.strategic} /> Estratégica
                            </label>
                            <label className="flex items-center gap-1 pb-2 text-xs">
                              <input type="checkbox" name="active" defaultChecked={c.active} /> Ativa
                            </label>
                            <button type="submit" className={buttonClass.secondary}>
                              Salvar
                            </button>
                          </ActionForm>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
              {canEdit && (
                <details className="rounded-md border border-dashed border-slate-300 p-3">
                  <summary className="text-sm font-medium text-brand-700">Adicionar capacidade</summary>
                  <ActionForm action={addCapability} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4" resetOnSuccess>
                    {hidden}
                    <Field label="Nome" htmlFor="cap-name" className="md:col-span-2">
                      <Input id="cap-name" name="name" required minLength={3} />
                    </Field>
                    <Field label="Categoria" htmlFor="cap-cat" hint="Ex.: SOFTWARE, DATA, FOTOGRAFIA">
                      <Input id="cap-cat" name="category" required />
                    </Field>
                    <Field label="Nível" htmlFor="cap-level">
                      <Select id="cap-level" name="level" defaultValue="CORE">
                        {Object.entries(LEVEL_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Descrição" htmlFor="cap-desc" className="md:col-span-2">
                      <Input id="cap-desc" name="description" />
                    </Field>
                    <Field label="Termos iniciais (vírgulas)" htmlFor="cap-terms" className="md:col-span-2">
                      <Input id="cap-terms" name="terms" />
                    </Field>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" name="strategic" /> Estratégica
                    </label>
                    <div className="md:col-span-4">
                      <button type="submit" className={buttonClass.primary}>
                        Adicionar capacidade
                      </button>
                    </div>
                  </ActionForm>
                </details>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Termos negativos / exclusões"
              icon={<Tags className="size-4 text-slate-500" aria-hidden />}
              description="Reduzem ou eliminam falsos positivos (ex.: revenda de licenças, hardware). “Excluir” vence quando domina os sinais positivos; “Penalizar” só reduz o score."
            />
            <CardBody className="flex flex-col gap-3">
              {negative.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum termo negativo.</p>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Termo</Th>
                      <Th>Efeito</Th>
                      <Th>Peso</Th>
                      <Th>Nota</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {negative.map((t) => (
                      <tr key={t.id}>
                        <Td>{t.term}</Td>
                        <Td>
                          <Badge tone={t.effect === "EXCLUDE" ? "negative" : "attention"}>{t.effect === "EXCLUDE" ? "Excluir" : "Penalizar"}</Badge>
                        </Td>
                        <Td>{t.weight}</Td>
                        <Td className="text-xs text-slate-500">{t.note}</Td>
                        <Td>
                          {canEdit && (
                            <ActionForm action={removeTerm}>
                              {hidden}
                              <input type="hidden" name="termId" value={t.id} />
                              <button type="submit" className={buttonClass.small}>
                                Remover
                              </button>
                            </ActionForm>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {canEdit && (
                <ActionForm action={addTerm} className="flex flex-wrap items-end gap-2" resetOnSuccess>
                  {hidden}
                  <input type="hidden" name="polarity" value="NEGATIVE" />
                  <Field label="Termo negativo" htmlFor="neg-term" className="min-w-48 flex-1">
                    <Input id="neg-term" name="term" required minLength={2} />
                  </Field>
                  <Field label="Efeito" htmlFor="neg-effect" className="w-32">
                    <Select id="neg-effect" name="effect" defaultValue="EXCLUDE">
                      <option value="EXCLUDE">Excluir</option>
                      <option value="PENALIZE">Penalizar</option>
                    </Select>
                  </Field>
                  <Field label="Peso" htmlFor="neg-weight" className="w-20">
                    <Input id="neg-weight" name="weight" defaultValue="1.2" inputMode="decimal" />
                  </Field>
                  <Field label="Nota" htmlFor="neg-note" className="min-w-40 flex-1">
                    <Input id="neg-note" name="note" />
                  </Field>
                  <button type="submit" className={buttonClass.secondary}>
                    Adicionar
                  </button>
                </ActionForm>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Pesos do score" icon={<Scale className="size-4 text-slate-500" aria-hidden />} description="Score de priorização (0–100), independente por perfil. Não é score de elegibilidade." />
            <CardBody>
              <ActionForm action={updateScoring} className="flex flex-col gap-3">
                {hidden}
                <fieldset disabled={!canEdit} className="contents">
                  <div className="grid grid-cols-1 gap-2">
                    {DIMENSIONS.map((d) => (
                      <div key={d} className="flex items-center justify-between gap-2">
                        <label htmlFor={`w_${d}`} className="text-xs text-slate-700">
                          {DIMENSION_LABEL[d]}
                        </label>
                        <div className="w-20 shrink-0">
                          <Input id={`w_${d}`} name={`w_${d}`} defaultValue={profile.scoring.weights[d]} inputMode="decimal" className="text-right" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">Soma atual: {Object.values(profile.scoring.weights).reduce((a, b) => a + b, 0)} (normalizada para 100).</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Alta ≥" htmlFor="t_high">
                      <Input id="t_high" name="t_high" defaultValue={profile.scoring.thresholds.high} inputMode="numeric" />
                    </Field>
                    <Field label="Média ≥" htmlFor="t_medium">
                      <Input id="t_medium" name="t_medium" defaultValue={profile.scoring.thresholds.medium} inputMode="numeric" />
                    </Field>
                    <Field label="Baixa ≥" htmlFor="t_low">
                      <Input id="t_low" name="t_low" defaultValue={profile.scoring.thresholds.low} inputMode="numeric" />
                    </Field>
                  </div>
                  <Field label="Score mínimo para alerta" htmlFor="alertMinScore">
                    <Input id="alertMinScore" name="alertMinScore" defaultValue={profile.scoring.alertMinScore} inputMode="numeric" />
                  </Field>
                  <fieldset>
                    <legend className="text-xs font-medium text-slate-700">Documentos essenciais (prontidão documental)</legend>
                    <div className="mt-1 flex flex-col gap-1 text-xs">
                      {Object.entries(VAULT_CATEGORY_LABEL)
                        .filter(([k]) => k.startsWith("CERTIDAO") || ["CNPJ_CARD", "CCMEI", "SICAF"].includes(k))
                        .map(([k, v]) => (
                          <label key={k} className="flex items-center gap-1.5">
                            <input type="checkbox" name="essentialDocuments" value={k} defaultChecked={profile.scoring.essentialDocuments.includes(k)} />
                            {v}
                          </label>
                        ))}
                    </div>
                  </fieldset>
                  {canEdit && (
                    <button type="submit" className={buttonClass.primary}>
                      Salvar pesos
                    </button>
                  )}
                </fieldset>
              </ActionForm>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Versões do perfil" icon={<History className="size-4 text-slate-500" aria-hidden />} description="Cada análise registra a versão usada; análises antigas permanecem rastreáveis." />
            <CardBody className="p-0">
              <ol className="divide-y divide-slate-100">
                {versions.map(({ v, userName }) => (
                  <li key={v.id} className="px-4 py-2 text-xs">
                    <p className="font-medium text-slate-900">
                      v{v.version} · {v.changeSummary}
                    </p>
                    <p className="text-slate-500">
                      {userName ?? "Sistema"} · {formatDateTime(v.createdAt)} · {v.snapshot.activities.length} atividade(s), {v.snapshot.capabilities.length} capacidade(s)
                    </p>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
