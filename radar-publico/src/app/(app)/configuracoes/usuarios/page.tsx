import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { createUser, updateUser } from "@/app/actions/settings";
import { ActionForm } from "@/components/action-form";
import { Badge, buttonClass, Card, CardBody, CardHeader, Field, Input, Notice, PageHeader, Select } from "@/components/ui";
import { getDb, schema } from "@/db";
import { formatDateTime } from "@/lib/dates";
import { requireUser } from "@/server/auth/dal";
import { hasRole, ROLE_LABEL } from "@/server/auth/roles";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsersPage() {
  const user = await requireUser();
  if (!hasRole(user.role, "ADMIN")) {
    return (
      <div>
        <PageHeader eyebrow="Configurações" title="Usuários" />
        <Notice tone="attention">Apenas administradores gerenciam usuários.</Notice>
      </div>
    );
  }
  const users = await getDb().select().from(schema.users).where(eq(schema.users.organizationId, user.organizationId)).orderBy(asc(schema.users.name));
  return (
    <div>
      <PageHeader
        eyebrow="Configurações"
        title="Usuários e papéis"
        description="Administrador: perfis, fontes, pesos e usuários. Analista: revisão, decisões, documentos e notas. Leitor: somente leitura. Não há cadastro público."
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Usuários" />
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {users.map((u) => (
                <li key={u.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{u.name}</p>
                    <span className="text-xs text-slate-500">{u.email}</span>
                    <Badge tone="brand">{ROLE_LABEL[u.role]}</Badge>
                    {!u.active && <Badge tone="negative">Inativo</Badge>}
                    <span className="text-xs text-slate-500">último acesso {formatDateTime(u.lastLoginAt)}</span>
                  </div>
                  <ActionForm action={updateUser} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <Field label="Papel" htmlFor={`role-${u.id}`} className="w-36">
                      <Select id={`role-${u.id}`} name="role" defaultValue={u.role}>
                        {Object.entries(ROLE_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <label className="flex items-center gap-1 pb-2 text-xs">
                      <input type="checkbox" name="active" defaultChecked={u.active} /> Ativo
                    </label>
                    <Field label="Nova senha (opcional)" htmlFor={`pw-${u.id}`} className="w-48">
                      <Input id={`pw-${u.id}`} name="newPassword" type="password" autoComplete="new-password" />
                    </Field>
                    <button type="submit" className={buttonClass.secondary}>
                      Salvar
                    </button>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Novo usuário" />
          <CardBody>
            <ActionForm action={createUser} className="flex flex-col gap-3" resetOnSuccess>
              <Field label="Nome" htmlFor="nu-name">
                <Input id="nu-name" name="name" required />
              </Field>
              <Field label="E-mail" htmlFor="nu-email">
                <Input id="nu-email" name="email" type="email" required />
              </Field>
              <Field label="Papel" htmlFor="nu-role">
                <Select id="nu-role" name="role" defaultValue="ANALYST">
                  {Object.entries(ROLE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Senha temporária" htmlFor="nu-pw" hint="Mínimo 12 caracteres, letras e números.">
                <Input id="nu-pw" name="password" type="password" autoComplete="new-password" required minLength={12} />
              </Field>
              <button type="submit" className={buttonClass.primary}>
                Criar usuário
              </button>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
