import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { SearchX } from "lucide-react";
import type { ReactNode } from "react";
import { getDb, schema } from "@/db";
import { hasRole } from "@/server/auth/roles";
import type { CurrentUser } from "@/server/auth/dal";
import { listOpportunities, PAGE_SIZE, parseFilters, type OpportunityFilters, type Tab } from "@/server/opportunities/queries";
import { formatInt } from "@/lib/format";
import { OpportunityCard } from "./opportunity-card";
import { OpportunityFiltersForm, Pagination } from "./opportunity-filters";
import { EmptyState, PageHeader, cx } from "./ui";

const TAB_LABEL: Record<Tab, string> = {
  todas: "Todas",
  alta: "Alta compatibilidade",
  revisar: "Revisar",
  andamento: "Em andamento",
  favoritas: "Favoritas",
  descartadas: "Descartadas",
  catalogo: "Catálogo completo",
};

async function capabilityCategories(organizationId: string) {
  const rows = await getDb()
    .selectDistinct({ category: schema.serviceCapabilities.category, name: schema.serviceCapabilities.name })
    .from(schema.serviceCapabilities)
    .where(and(eq(schema.serviceCapabilities.organizationId, organizationId), eq(schema.serviceCapabilities.active, true)));
  const map = new Map<string, string>();
  for (const r of rows) if (!map.has(r.category)) map.set(r.category, r.name);
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
}

export async function OpportunityListView({
  user,
  searchParams,
  scope,
  basePath,
  title,
  description,
  eyebrow,
  notice,
}: {
  user: CurrentUser;
  searchParams: Record<string, string | string[] | undefined>;
  scope: OpportunityFilters["scope"];
  basePath: string;
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  notice?: ReactNode;
}) {
  const f = parseFilters(searchParams, scope);
  const [{ total, items, profiles }, categories] = await Promise.all([listOpportunities(user.organizationId, f), capabilityCategories(user.organizationId)]);
  const canAct = hasRole(user.role, "ANALYST");
  const flat: Record<string, string | undefined> = Object.fromEntries(
    Object.entries(searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const tabHref = (tab: Tab) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(flat)) if (v && k !== "page" && k !== "aba") sp.set(k, v);
    if (tab !== "todas") sp.set("aba", tab);
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const tabs: Tab[] = scope === "default" ? ["todas", "alta", "revisar", "andamento", "favoritas", "descartadas", "catalogo"] : ["todas", "catalogo"];
  const profileName = profiles.find((p) => p.slug === f.perfil)?.displayName;

  return (
    <div>
      <PageHeader
        eyebrow={eyebrow}
        title={profileName && scope === "default" ? `${title} — ${profileName}` : title}
        description={description}
        actions={<p className="text-sm text-slate-600">{formatInt(total)} resultado(s)</p>}
      />
      {notice}
      <nav aria-label="Abas" className="mb-3 flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <Link
            key={t}
            href={tabHref(t)}
            aria-current={(f.aba ?? "todas") === t ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              (f.aba ?? "todas") === t ? "border-brand-600 text-brand-800" : "border-transparent text-slate-600 hover:text-slate-900",
            )}
          >
            {TAB_LABEL[t]}
          </Link>
        ))}
      </nav>
      <OpportunityFiltersForm f={f} profiles={profiles} categories={categories} basePath={basePath} />
      {items.length === 0 ? (
        <EmptyState title="Nenhuma oportunidade encontrada" icon={<SearchX className="size-8" aria-hidden />}>
          Ajuste os filtros, consulte o catálogo completo ou verifique a saúde das fontes em Configurações → Fontes de dados.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((o) => (
            <OpportunityCard key={o.id} o={o} canAct={canAct} focusProfileSlug={f.perfil} />
          ))}
        </div>
      )}
      <Pagination page={f.page ?? 1} total={total} pageSize={PAGE_SIZE} params={flat} basePath={basePath} />
    </div>
  );
}
