import "server-only";
import { asc, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { addDays, localDateString } from "@/lib/dates";
import { loadCards, orgProfiles, type OpportunityCardData, type OrgProfile } from "./queries";

export interface DashboardData {
  profiles: OrgProfile[];
  metrics: {
    newLast7Days: number;
    highByProfile: { profile: OrgProfile; count: number }[];
    deadline7: number;
    deadline30: number;
    awaitingReview: number;
    inProgress: number;
    future: number;
    innovation: number;
    documentationGaps: number;
    expiringDocuments: number;
  };
  priorities: OpportunityCardData[];
  upcoming: OpportunityCardData[];
  sources: (typeof schema.sources.$inferSelect)[];
  profileCompleteness: { profile: OrgProfile; missing: string[] }[];
}

const RELEVANT = sql`('HIGH_COMPATIBILITY','MEDIUM_COMPATIBILITY','REQUIRES_REVIEW')`;

export async function getDashboard(organizationId: string): Promise<DashboardData> {
  const db = getDb();
  const now = new Date();
  const in7 = addDays(now, 7);
  const in30 = addDays(now, 30);
  const profiles = await orgProfiles(organizationId);
  const open = sql`o.status <> 'CANCELLED' and (o.proposal_deadline is null or o.proposal_deadline >= ${now})`;
  const notDiscarded = sql`not exists (select 1 from ${schema.opportunityWorkflows} w where w.organization_id = ${organizationId} and w.opportunity_id = o.id and w.status in ('DISCARDED','CANCELLED','LOST'))`;
  const count = async (q: ReturnType<typeof sql>) => Number((await db.execute<{ n: number }>(q)).rows[0]?.n ?? 0);

  const [newLast7Days, deadline7, deadline30, awaitingReview, inProgress, future, innovation, documentationGaps] = await Promise.all([
    count(sql`select count(distinct o.id)::int as n from ${schema.opportunities} o join ${schema.opportunityMatches} m on m.opportunity_id = o.id
      where m.organization_id = ${organizationId} and m.is_current and m.status in ${RELEVANT} and o.kind <> 'FUTURE_PROCUREMENT' and o.first_seen_at >= ${addDays(now, -7)}`),
    count(sql`select count(distinct o.id)::int as n from ${schema.opportunities} o join ${schema.opportunityMatches} m on m.opportunity_id = o.id
      where m.organization_id = ${organizationId} and m.is_current and m.status in ${RELEVANT} and ${notDiscarded}
      and o.status <> 'CANCELLED' and o.proposal_deadline between ${now} and ${in7}`),
    count(sql`select count(distinct o.id)::int as n from ${schema.opportunities} o join ${schema.opportunityMatches} m on m.opportunity_id = o.id
      where m.organization_id = ${organizationId} and m.is_current and m.status in ${RELEVANT} and ${notDiscarded}
      and o.status <> 'CANCELLED' and o.proposal_deadline between ${now} and ${in30}`),
    count(sql`select count(distinct o.id)::int as n from ${schema.opportunities} o join ${schema.opportunityMatches} m on m.opportunity_id = o.id
      where m.organization_id = ${organizationId} and m.is_current and m.status = 'REQUIRES_REVIEW' and ${open}
      and not exists (select 1 from ${schema.opportunityWorkflows} w where w.organization_id = ${organizationId} and w.opportunity_id = o.id and w.profile_id = m.profile_id)`),
    count(sql`select count(distinct w.opportunity_id)::int as n from ${schema.opportunityWorkflows} w
      where w.organization_id = ${organizationId} and w.status in ('INTERESTED','ANALYZING_DOCUMENTS','PREPARING_PROPOSAL','READY_FOR_HUMAN_SUBMISSION','SUBMITTED_EXTERNALLY')`),
    count(sql`select count(distinct o.id)::int as n from ${schema.opportunities} o join ${schema.opportunityMatches} m on m.opportunity_id = o.id
      where m.organization_id = ${organizationId} and m.is_current and m.status in ${RELEVANT} and o.kind = 'FUTURE_PROCUREMENT'`),
    count(sql`select count(*)::int as n from ${schema.opportunities} o where o.innovation_class in ('CPSI','ETEC','COMPETITIVE_DIALOGUE') and ${open}`),
    count(sql`select count(distinct o.id)::int as n from ${schema.opportunities} o join ${schema.opportunityMatches} m on m.opportunity_id = o.id
      where m.organization_id = ${organizationId} and m.is_current and m.status in ${RELEVANT} and ${open} and ${notDiscarded}
      and jsonb_array_length(m.gaps) > 0`),
  ]);

  const highByProfile = await Promise.all(
    profiles.map(async (profile) => ({
      profile,
      count: await count(sql`select count(*)::int as n from ${schema.opportunityMatches} m join ${schema.opportunities} o on o.id = m.opportunity_id
        where m.profile_id = ${profile.id} and m.is_current and m.status = 'HIGH_COMPATIBILITY' and ${open} and o.kind <> 'FUTURE_PROCUREMENT'`),
    })),
  );

  const [expiring] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.profileDocuments)
    .where(sql`${schema.profileDocuments.organizationId} = ${organizationId} and not ${schema.profileDocuments.archived} and ${schema.profileDocuments.expiresOn} <= ${localDateString(in30)}`);

  const priorityIds = (
    await db.execute<{ id: string }>(sql`
      select o.id from ${schema.opportunities} o join ${schema.opportunityMatches} m on m.opportunity_id = o.id
      where m.organization_id = ${organizationId} and m.is_current and m.status in ('HIGH_COMPATIBILITY','REQUIRES_REVIEW','MEDIUM_COMPATIBILITY')
        and o.kind <> 'FUTURE_PROCUREMENT' and ${open} and ${notDiscarded}
      group by o.id order by max(m.score) desc, min(o.proposal_deadline) asc nulls last limit 6`)
  ).rows.map((r) => r.id);
  const upcomingIds = (
    await db.execute<{ id: string }>(sql`
      select o.id from ${schema.opportunities} o
      where o.proposal_deadline between ${now} and ${in30} and o.status <> 'CANCELLED' and ${notDiscarded}
        and (exists (select 1 from ${schema.opportunityMatches} m where m.opportunity_id = o.id and m.organization_id = ${organizationId} and m.is_current and m.status in ${RELEVANT})
          or exists (select 1 from ${schema.watchlist} wl where wl.opportunity_id = o.id and wl.organization_id = ${organizationId}))
      order by o.proposal_deadline asc limit 6`)
  ).rows.map((r) => r.id);

  const sources = await db.select().from(schema.sources).orderBy(desc(schema.sources.enabled), asc(schema.sources.key));

  const completeness = await Promise.all(
    profiles.map(async (profile) => {
      const [p] = await db.select().from(schema.procurementProfiles).where(eq(schema.procurementProfiles.id, profile.id));
      const [{ acts }] = await db.select({ acts: sql<number>`count(*)::int` }).from(schema.profileActivities).where(sql`${schema.profileActivities.profileId} = ${profile.id} and ${schema.profileActivities.active}`);
      const [{ docs }] = await db.select({ docs: sql<number>`count(*)::int` }).from(schema.profileDocuments).where(sql`${schema.profileDocuments.profileId} = ${profile.id} and not ${schema.profileDocuments.archived}`);
      const missing: string[] = [];
      if (!p.cnpj) missing.push("CNPJ");
      if (acts === 0) missing.push(profile.kind === "MEI" ? "CNAEs/ocupações" : "CNAEs");
      if (docs === 0) missing.push("documentos no cofre");
      if (p.minProjectValue == null && p.maxProjectValue == null) missing.push("faixa de valor");
      return { profile, missing };
    }),
  );

  return {
    profiles,
    metrics: {
      newLast7Days,
      highByProfile,
      deadline7,
      deadline30,
      awaitingReview,
      inProgress,
      future,
      innovation,
      documentationGaps,
      expiringDocuments: expiring?.n ?? 0,
    },
    priorities: await loadCards(organizationId, priorityIds, profiles),
    upcoming: await loadCards(organizationId, upcomingIds, profiles),
    sources,
    profileCompleteness: completeness.filter((c) => c.missing.length > 0),
  };
}
