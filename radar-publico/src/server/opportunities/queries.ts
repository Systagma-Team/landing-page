import "server-only";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { normalizeText, onlyDigits, stripAccents } from "@/lib/text";
import type { AttentionItem, CapabilityMatch, GapItem } from "@/server/matching/types";

export const PAGE_SIZE = 25;

export type Tab = "todas" | "alta" | "revisar" | "andamento" | "favoritas" | "descartadas" | "catalogo";

export interface OpportunityFilters {
  perfil?: string;
  aba?: Tab;
  q?: string;
  uf?: string;
  cidade?: string;
  tipo?: string;
  fonte?: string;
  status?: string;
  scoreMin?: number;
  scoreMax?: number;
  prazo?: "abertas" | "7" | "30" | "encerradas" | "todas";
  valorMin?: number;
  valorMax?: number;
  servico?: string;
  inovacao?: "fortes" | "todas";
  ordem?: "score" | "prazo" | "publicacao" | "valor";
  page?: number;
  /** page-level scope */
  scope?: "default" | "future" | "innovation";
}

const TABS: Tab[] = ["todas", "alta", "revisar", "andamento", "favoritas", "descartadas", "catalogo"];
const num = (v: string | undefined) => (v && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);

export function parseFilters(sp: Record<string, string | string[] | undefined>, scope: OpportunityFilters["scope"] = "default"): OpportunityFilters {
  const get = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const aba = get("aba") as Tab | undefined;
  const prazo = get("prazo") as OpportunityFilters["prazo"];
  const ordem = get("ordem") as OpportunityFilters["ordem"];
  return {
    scope,
    perfil: get("perfil"),
    aba: aba && TABS.includes(aba) ? aba : "todas",
    q: get("q")?.slice(0, 200),
    uf: get("uf")?.toUpperCase().slice(0, 2),
    cidade: get("cidade")?.slice(0, 100),
    tipo: get("tipo"),
    fonte: get("fonte"),
    status: get("status"),
    scoreMin: num(get("scoreMin")),
    scoreMax: num(get("scoreMax")),
    prazo: prazo && ["abertas", "7", "30", "encerradas", "todas"].includes(prazo) ? prazo : "abertas",
    valorMin: num(get("valorMin")),
    valorMax: num(get("valorMax")),
    servico: get("servico"),
    inovacao: get("inovacao") === "todas" ? "todas" : scope === "innovation" ? "fortes" : undefined,
    ordem: ordem && ["score", "prazo", "publicacao", "valor"].includes(ordem) ? ordem : scope === "future" ? "score" : "score",
    page: Math.max(1, Math.min(1000, num(get("page")) ?? 1)),
  };
}

export interface OrgProfile {
  id: string;
  slug: string;
  displayName: string;
  kind: "MEI" | "COMPANY";
}

export async function orgProfiles(organizationId: string): Promise<OrgProfile[]> {
  return getDb()
    .select({ id: schema.procurementProfiles.id, slug: schema.procurementProfiles.slug, displayName: schema.procurementProfiles.displayName, kind: schema.procurementProfiles.kind })
    .from(schema.procurementProfiles)
    .where(eq(schema.procurementProfiles.organizationId, organizationId))
    .orderBy(asc(schema.procurementProfiles.kind));
}

export interface CardMatch {
  profileId: string;
  profileSlug: string;
  profileName: string;
  status: string;
  automaticStatus: string;
  score: number;
  automaticScore: number;
  manual: boolean;
  capabilities: string[];
  attention: AttentionItem[];
  blockers: AttentionItem[];
  gaps: GapItem[];
  profileIncomplete: boolean;
}

export interface OpportunityCardData {
  id: string;
  title: string;
  objectDescription: string;
  organizationName: string | null;
  unitName: string | null;
  city: string | null;
  state: string | null;
  kind: string;
  status: string;
  modalityName: string | null;
  estimatedValue: string | null;
  proposalDeadline: Date | null;
  publicationDate: Date | null;
  expectedDate: string | null;
  innovationClass: string;
  sourceUrl: string | null;
  sources: string[];
  matches: CardMatch[];
  workflows: { profileId: string; status: string }[];
  watchlisted: boolean;
}

/** Current matches with manual overrides applied (automatic values kept alongside). */
function effectiveMatchesCte(organizationId: string, profileId: string | null): SQL {
  return sql`pm as (
    select m.opportunity_id, m.profile_id, m.service_matches,
      coalesce((select (mo.manual_value #>> '{}')::int from ${schema.matchOverrides} mo
                 where mo.organization_id = m.organization_id and mo.opportunity_id = m.opportunity_id and mo.profile_id = m.profile_id
                   and mo.field = 'SCORE' and mo.active order by mo.created_at desc limit 1), m.score) as score,
      coalesce((select mo.manual_value #>> '{}' from ${schema.matchOverrides} mo
                 where mo.organization_id = m.organization_id and mo.opportunity_id = m.opportunity_id and mo.profile_id = m.profile_id
                   and mo.field = 'COMPATIBILITY_STATUS' and mo.active order by mo.created_at desc limit 1), m.status::text) as status
    from ${schema.opportunityMatches} m
    where m.is_current and m.organization_id = ${organizationId} ${profileId ? sql`and m.profile_id = ${profileId}` : sql``}
  ), best as (
    select distinct on (opportunity_id) opportunity_id, score, status from pm order by opportunity_id, score desc
  )`;
}

export async function listOpportunities(organizationId: string, f: OpportunityFilters): Promise<{ total: number; items: OpportunityCardData[]; profiles: OrgProfile[] }> {
  const db = getDb();
  const profiles = await orgProfiles(organizationId);
  const profile = f.perfil ? profiles.find((p) => p.slug === f.perfil) ?? null : null;
  const profileId = profile?.id ?? null;
  const now = new Date();
  const conds: SQL[] = [];

  // scope
  if (f.scope === "future") conds.push(sql`o.kind = 'FUTURE_PROCUREMENT'`);
  else if (f.tipo) conds.push(sql`o.kind = ${f.tipo}`);
  else if (f.scope !== "innovation") conds.push(sql`o.kind <> 'FUTURE_PROCUREMENT'`);
  if (f.scope === "innovation" || f.inovacao) {
    conds.push(f.inovacao === "todas" ? sql`o.innovation_class <> 'NONE'` : sql`o.innovation_class in ('CPSI','ETEC','COMPETITIVE_DIALOGUE')`);
  }

  // tabs
  const wfProfile = profileId ? sql`and w.profile_id = ${profileId}` : sql``;
  const matchedOnly = !["favoritas", "descartadas", "catalogo", "andamento"].includes(f.aba ?? "todas") && f.scope !== "innovation";
  switch (f.aba) {
    case "alta":
      conds.push(sql`exists (select 1 from pm where pm.opportunity_id = o.id and pm.status = 'HIGH_COMPATIBILITY')`);
      break;
    case "revisar":
      conds.push(sql`exists (select 1 from pm where pm.opportunity_id = o.id and pm.status = 'REQUIRES_REVIEW'
        and not exists (select 1 from ${schema.opportunityWorkflows} w where w.organization_id = ${organizationId} and w.opportunity_id = o.id and w.profile_id = pm.profile_id))`);
      break;
    case "andamento":
      conds.push(sql`exists (select 1 from ${schema.opportunityWorkflows} w where w.organization_id = ${organizationId} and w.opportunity_id = o.id ${wfProfile}
        and w.status in ('INTERESTED','ANALYZING_DOCUMENTS','PREPARING_PROPOSAL','READY_FOR_HUMAN_SUBMISSION','SUBMITTED_EXTERNALLY'))`);
      break;
    case "favoritas":
      conds.push(sql`exists (select 1 from ${schema.watchlist} wl where wl.organization_id = ${organizationId} and wl.opportunity_id = o.id)`);
      break;
    case "descartadas":
      conds.push(sql`exists (select 1 from ${schema.opportunityWorkflows} w where w.organization_id = ${organizationId} and w.opportunity_id = o.id ${wfProfile} and w.status = 'DISCARDED')`);
      break;
  }
  if (f.aba !== "descartadas" && f.aba !== "catalogo") {
    conds.push(sql`not exists (select 1 from ${schema.opportunityWorkflows} w where w.organization_id = ${organizationId} and w.opportunity_id = o.id ${wfProfile} and w.status = 'DISCARDED')`);
  }

  // deadlines (not applied to PCA items, which have none)
  const deadlineApplies = f.scope !== "future" && f.aba !== "andamento" && f.aba !== "favoritas" && f.aba !== "descartadas";
  if (deadlineApplies) {
    if (f.prazo === "abertas") conds.push(sql`o.status <> 'CANCELLED' and (o.proposal_deadline is null or o.proposal_deadline >= ${now})`);
    else if (f.prazo === "7" || f.prazo === "30") {
      conds.push(sql`o.proposal_deadline >= ${now} and o.proposal_deadline <= ${new Date(now.getTime() + Number(f.prazo) * 86_400_000)}`);
    } else if (f.prazo === "encerradas") conds.push(sql`(o.proposal_deadline < ${now} or o.status = 'CANCELLED')`);
  }

  if (f.q) {
    const q = stripAccents(f.q).toLowerCase();
    const like = `%${f.q.replace(/[%_\\]/g, "")}%`;
    const digits = onlyDigits(f.q);
    conds.push(sql`(
      o.search_vector @@ websearch_to_tsquery('portuguese', ${q})
      or o.pncp_control_number ilike ${like}
      or o.process_number ilike ${like}
      ${digits.length === 14 ? sql`or o.organization_cnpj = ${digits}` : sql``}
      or exists (select 1 from ${schema.opportunityDocuments} d where d.opportunity_id = o.id
                 and (d.title ilike ${like} or to_tsvector('portuguese', coalesce(d.extracted_text, '')) @@ websearch_to_tsquery('portuguese', ${q})))
    )`);
  }
  if (f.uf) conds.push(sql`o.state = ${f.uf}`);
  if (f.cidade) conds.push(sql`o.city_search like ${`%${normalizeText(f.cidade)}%`}`);
  if (f.fonte) conds.push(sql`exists (select 1 from ${schema.opportunitySources} s where s.opportunity_id = o.id and s.source_key = ${f.fonte})`);
  if (f.status) conds.push(sql`exists (select 1 from pm where pm.opportunity_id = o.id and pm.status = ${f.status})`);
  if (f.servico) conds.push(sql`exists (select 1 from pm where pm.opportunity_id = o.id and pm.service_matches @> ${JSON.stringify([{ category: f.servico }])}::jsonb)`);
  if (f.scoreMin != null) conds.push(sql`coalesce(best.score, 0) >= ${f.scoreMin}`);
  if (f.scoreMax != null) conds.push(sql`coalesce(best.score, 0) <= ${f.scoreMax}`);
  if (f.valorMin != null) conds.push(sql`o.estimated_value >= ${f.valorMin}`);
  if (f.valorMax != null) conds.push(sql`o.estimated_value <= ${f.valorMax}`);

  const order =
    f.ordem === "prazo"
      ? sql`o.proposal_deadline asc nulls last, best.score desc nulls last`
      : f.ordem === "publicacao"
        ? sql`o.publication_date desc nulls last`
        : f.ordem === "valor"
          ? sql`o.estimated_value desc nulls last`
          : sql`best.score desc nulls last, o.proposal_deadline asc nulls last`;

  const where = conds.length > 0 ? sql`where ${sql.join(conds, sql` and `)}` : sql``;
  const offset = ((f.page ?? 1) - 1) * PAGE_SIZE;
  const result = await db.execute<{ id: string; total: number }>(sql`
    with ${effectiveMatchesCte(organizationId, profileId)}
    select o.id, count(*) over()::int as total
    from ${schema.opportunities} o
    ${matchedOnly ? sql`join best on best.opportunity_id = o.id` : sql`left join best on best.opportunity_id = o.id`}
    ${where}
    order by ${order}, o.id
    limit ${PAGE_SIZE} offset ${offset}
  `);
  const ids = result.rows.map((r) => r.id);
  const total = result.rows[0]?.total ?? 0;
  return { total, items: await loadCards(organizationId, ids, profiles), profiles };
}

export async function loadCards(organizationId: string, ids: string[], profiles?: OrgProfile[]): Promise<OpportunityCardData[]> {
  if (ids.length === 0) return [];
  const db = getDb();
  const profs = profiles ?? (await orgProfiles(organizationId));
  const [opps, matches, overrides, flows, watched, sources] = await Promise.all([
    db.select().from(schema.opportunities).where(inArray(schema.opportunities.id, ids)),
    db
      .select()
      .from(schema.opportunityMatches)
      .where(and(inArray(schema.opportunityMatches.opportunityId, ids), eq(schema.opportunityMatches.organizationId, organizationId), eq(schema.opportunityMatches.isCurrent, true))),
    db
      .select()
      .from(schema.matchOverrides)
      .where(and(inArray(schema.matchOverrides.opportunityId, ids), eq(schema.matchOverrides.organizationId, organizationId), eq(schema.matchOverrides.active, true)))
      .orderBy(desc(schema.matchOverrides.createdAt)),
    db
      .select({ opportunityId: schema.opportunityWorkflows.opportunityId, profileId: schema.opportunityWorkflows.profileId, status: schema.opportunityWorkflows.status })
      .from(schema.opportunityWorkflows)
      .where(and(inArray(schema.opportunityWorkflows.opportunityId, ids), eq(schema.opportunityWorkflows.organizationId, organizationId))),
    db
      .select({ opportunityId: schema.watchlist.opportunityId })
      .from(schema.watchlist)
      .where(and(inArray(schema.watchlist.opportunityId, ids), eq(schema.watchlist.organizationId, organizationId))),
    db
      .select({ opportunityId: schema.opportunitySources.opportunityId, sourceKey: schema.opportunitySources.sourceKey })
      .from(schema.opportunitySources)
      .where(inArray(schema.opportunitySources.opportunityId, ids)),
  ]);
  const watchedSet = new Set(watched.map((w) => w.opportunityId));
  const byId = new Map(opps.map((o) => [o.id, o]));
  return ids
    .map((id) => byId.get(id))
    .filter((o): o is NonNullable<typeof o> => !!o)
    .map((o) => ({
      id: o.id,
      title: o.title,
      objectDescription: o.objectDescription,
      organizationName: o.organizationName,
      unitName: o.unitName,
      city: o.city,
      state: o.state,
      kind: o.kind,
      status: o.status,
      modalityName: o.modalityName,
      estimatedValue: o.estimatedValue,
      proposalDeadline: o.proposalDeadline,
      publicationDate: o.publicationDate,
      expectedDate: o.expectedDate,
      innovationClass: o.innovationClass,
      sourceUrl: o.sourceUrl,
      sources: Array.from(new Set(sources.filter((s) => s.opportunityId === o.id).map((s) => s.sourceKey))),
      watchlisted: watchedSet.has(o.id),
      workflows: flows.filter((w) => w.opportunityId === o.id).map((w) => ({ profileId: w.profileId, status: w.status })),
      matches: matches
        .filter((m) => m.opportunityId === o.id)
        .map((m) => {
          const p = profs.find((x) => x.id === m.profileId);
          const scoreO = overrides.find((ov) => ov.opportunityId === o.id && ov.profileId === m.profileId && ov.field === "SCORE");
          const statusO = overrides.find((ov) => ov.opportunityId === o.id && ov.profileId === m.profileId && ov.field === "COMPATIBILITY_STATUS");
          return {
            profileId: m.profileId,
            profileSlug: p?.slug ?? "",
            profileName: p?.displayName ?? "Perfil",
            status: statusO ? String(statusO.manualValue) : m.status,
            automaticStatus: m.status,
            score: scoreO ? Number(scoreO.manualValue) : m.score,
            automaticScore: m.score,
            manual: !!(scoreO || statusO),
            capabilities: (m.serviceMatches as CapabilityMatch[]).map((c) => c.name),
            attention: [...m.attention, ...m.riskFlags],
            blockers: m.blockers,
            gaps: m.gaps,
            profileIncomplete: m.missingInformation.some((x) => x.startsWith("Perfil incompleto")),
          };
        })
        .sort((a, b) => b.score - a.score),
    }));
}
