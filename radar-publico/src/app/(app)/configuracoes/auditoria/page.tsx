import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { Badge, buttonClass, Card, CardBody, Field, Input, Notice, PageHeader, Table, Td, Th } from "@/components/ui";
import { getDb, schema } from "@/db";
import { formatDateTime } from "@/lib/dates";
import { requireUser } from "@/server/auth/dal";
import { hasRole } from "@/server/auth/roles";

export const metadata: Metadata = { title: "Auditoria" };

const PAGE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ acao?: string; entidade?: string; page?: string }> }) {
  const user = await requireUser();
  if (!hasRole(user.role, "ADMIN")) {
    return (
      <div>
        <PageHeader eyebrow="Configurações" title="Auditoria" />
        <Notice tone="attention">Apenas administradores consultam o log de auditoria completo. O histórico de cada oportunidade aparece na própria página.</Notice>
      </div>
    );
  }
  const { acao, entidade, page } = await searchParams;
  const p = Math.max(1, Number(page) || 1);
  const conds = [eq(schema.auditLogs.organizationId, user.organizationId)];
  if (acao) conds.push(sql`${schema.auditLogs.action} ilike ${`%${acao.replace(/[%_]/g, "")}%`}`);
  if (entidade) conds.push(eq(schema.auditLogs.entityType, entidade));
  const rows = await getDb()
    .select({ a: schema.auditLogs, userName: schema.users.name })
    .from(schema.auditLogs)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.userId))
    .where(and(...conds))
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(PAGE + 1)
    .offset((p - 1) * PAGE);
  const hasNext = rows.length > PAGE;
  const qs = (n: number) => `/configuracoes/auditoria?${new URLSearchParams({ ...(acao ? { acao } : {}), ...(entidade ? { entidade } : {}), page: String(n) })}`;
  return (
    <div>
      <PageHeader eyebrow="Configurações" title="Auditoria" description="Registro imutável de decisões, alterações de perfil, pesos, ajustes manuais, uploads, fontes e acessos." />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <Field label="Ação contém" htmlFor="acao">
          <Input id="acao" name="acao" defaultValue={acao} placeholder="workflow, profile, match…" />
        </Field>
        <Field label="Entidade" htmlFor="entidade">
          <Input id="entidade" name="entidade" defaultValue={entidade} placeholder="opportunity, profile, user…" />
        </Field>
        <button type="submit" className={buttonClass.secondary}>
          Filtrar
        </button>
      </form>
      <Card>
        <CardBody className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>Quando</Th>
                <Th>Quem</Th>
                <Th>Ação</Th>
                <Th>Entidade</Th>
                <Th>Detalhes</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.slice(0, PAGE).map(({ a, userName }) => (
                <tr key={a.id}>
                  <Td className="whitespace-nowrap text-xs">{formatDateTime(a.createdAt)}</Td>
                  <Td className="text-xs">{userName ?? <Badge tone="muted">Sistema</Badge>}</Td>
                  <Td>
                    <code className="text-xs">{a.action}</code>
                  </Td>
                  <Td className="text-xs">
                    {a.entityType === "opportunity" && a.entityId ? (
                      <Link href={`/oportunidades/${a.entityId}`} className="text-brand-700 underline">
                        oportunidade
                      </Link>
                    ) : (
                      <>
                        {a.entityType} {a.entityId?.slice(0, 8)}
                      </>
                    )}
                  </Td>
                  <Td className="max-w-lg">
                    <details>
                      <summary className="text-xs text-brand-700">ver</summary>
                      <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-50 p-2 text-[11px]">
                        {JSON.stringify({ antes: a.before, depois: a.after, meta: a.metadata, ip: a.ip }, null, 2)}
                      </pre>
                    </details>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>
      <nav aria-label="Paginação" className="mt-4 flex gap-2">
        {p > 1 && (
          <Link href={qs(p - 1)} className={buttonClass.secondary}>
            Anterior
          </Link>
        )}
        {hasNext && (
          <Link href={qs(p + 1)} className={buttonClass.secondary}>
            Próxima
          </Link>
        )}
      </nav>
    </div>
  );
}
