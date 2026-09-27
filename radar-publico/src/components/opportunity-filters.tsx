import Link from "next/link";
import { Filter, Search } from "lucide-react";
import { COMPATIBILITY_LABEL, KIND_LABEL, SOURCE_LABEL, UFS } from "@/lib/labels";
import type { OpportunityFilters, OrgProfile } from "@/server/opportunities/queries";
import { buttonClass, Field, Input, Select } from "./ui";

export function OpportunityFiltersForm({
  f,
  profiles,
  categories,
  basePath,
  showTabs = true,
}: {
  f: OpportunityFilters;
  profiles: OrgProfile[];
  categories: { value: string; label: string }[];
  basePath: string;
  showTabs?: boolean;
}) {
  const advancedOpen = !!(f.uf || f.cidade || f.tipo || f.fonte || f.status || f.servico || f.scoreMin != null || f.scoreMax != null || f.valorMin != null || f.valorMax != null);
  return (
    <form method="get" action={basePath} className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-xs" role="search" aria-label="Filtrar oportunidades">
      {showTabs && <input type="hidden" name="aba" value={f.aba ?? "todas"} />}
      {f.inovacao && <input type="hidden" name="inovacao" value={f.inovacao} />}
      <div className="flex flex-col gap-2 md:flex-row md:items-end">
        <Field label="Buscar" htmlFor="q" className="flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-slate-400" aria-hidden />
            <Input id="q" name="q" defaultValue={f.q} placeholder="Objeto, órgão, número do processo, CNPJ, requisitos, documentos…" className="pl-8" />
          </div>
        </Field>
        <Field label="Perfil" htmlFor="perfil" className="md:w-40">
          <Select id="perfil" name="perfil" defaultValue={f.perfil ?? ""}>
            <option value="">Todos</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.displayName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Prazo" htmlFor="prazo" className="md:w-44">
          <Select id="prazo" name="prazo" defaultValue={f.prazo ?? "abertas"}>
            <option value="abertas">Em aberto</option>
            <option value="7">Encerra em até 7 dias</option>
            <option value="30">Encerra em até 30 dias</option>
            <option value="encerradas">Encerradas/canceladas</option>
            <option value="todas">Todas</option>
          </Select>
        </Field>
        <Field label="Ordenar por" htmlFor="ordem" className="md:w-40">
          <Select id="ordem" name="ordem" defaultValue={f.ordem ?? "score"}>
            <option value="score">Maior score</option>
            <option value="prazo">Prazo mais próximo</option>
            <option value="publicacao">Mais recentes</option>
            <option value="valor">Maior valor</option>
          </Select>
        </Field>
        <button type="submit" className={buttonClass.primary}>
          Aplicar
        </button>
      </div>
      <details className="mt-2" open={advancedOpen}>
        <summary className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
          <Filter className="size-3" aria-hidden />
          Mais filtros
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
          <Field label="UF" htmlFor="uf">
            <Select id="uf" name="uf" defaultValue={f.uf ?? ""}>
              <option value="">Todas</option>
              {UFS.map((uf) => (
                <option key={uf}>{uf}</option>
              ))}
            </Select>
          </Field>
          <Field label="Cidade" htmlFor="cidade">
            <Input id="cidade" name="cidade" defaultValue={f.cidade} />
          </Field>
          <Field label="Tipo" htmlFor="tipo">
            <Select id="tipo" name="tipo" defaultValue={f.tipo ?? ""}>
              <option value="">Todos</option>
              {Object.entries(KIND_LABEL)
                .filter(([k]) => k !== "OTHER")
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Fonte" htmlFor="fonte">
            <Select id="fonte" name="fonte" defaultValue={f.fonte ?? ""}>
              <option value="">Todas</option>
              {Object.entries(SOURCE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Compatibilidade" htmlFor="status">
            <Select id="status" name="status" defaultValue={f.status ?? ""}>
              <option value="">Todas</option>
              {Object.entries(COMPATIBILITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Serviço" htmlFor="servico">
            <Select id="servico" name="servico" defaultValue={f.servico ?? ""}>
              <option value="">Todos</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Score mín." htmlFor="scoreMin">
            <Input id="scoreMin" name="scoreMin" type="number" min={0} max={100} defaultValue={f.scoreMin} />
          </Field>
          <Field label="Score máx." htmlFor="scoreMax">
            <Input id="scoreMax" name="scoreMax" type="number" min={0} max={100} defaultValue={f.scoreMax} />
          </Field>
          <Field label="Valor mín. (R$)" htmlFor="valorMin">
            <Input id="valorMin" name="valorMin" type="number" min={0} step="any" defaultValue={f.valorMin} />
          </Field>
          <Field label="Valor máx. (R$)" htmlFor="valorMax">
            <Input id="valorMax" name="valorMax" type="number" min={0} step="any" defaultValue={f.valorMax} />
          </Field>
          <div className="col-span-2 flex items-end">
            <Link href={basePath} className={buttonClass.ghost}>
              Limpar filtros
            </Link>
          </div>
        </div>
      </details>
    </form>
  );
}

export function Pagination({ page, total, pageSize, params, basePath }: { page: number; total: number; pageSize: number; params: Record<string, string | undefined>; basePath: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v != null && v !== "" && k !== "page") sp.set(k, v);
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };
  return (
    <nav aria-label="Paginação" className="mt-4 flex items-center justify-between text-sm">
      <p className="text-slate-600">
        Página {page} de {pages}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className={buttonClass.secondary} rel="prev">
            Anterior
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1)} className={buttonClass.secondary} rel="next">
            Próxima
          </Link>
        )}
      </div>
    </nav>
  );
}
