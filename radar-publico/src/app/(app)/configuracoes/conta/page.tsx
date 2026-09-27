import type { Metadata } from "next";
import { changeOwnPassword } from "@/app/actions/auth";
import { ActionForm } from "@/components/action-form";
import { buttonClass, Card, CardBody, CardHeader, DescriptionList, Field, Input, PageHeader } from "@/components/ui";
import { requireUser } from "@/server/auth/dal";
import { ROLE_LABEL } from "@/server/auth/roles";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div>
      <PageHeader eyebrow="Configurações" title="Minha conta" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Dados" />
          <CardBody>
            <DescriptionList
              columns={1}
              items={[
                { label: "Nome", value: user.name },
                { label: "E-mail", value: user.email },
                { label: "Papel", value: ROLE_LABEL[user.role] },
                { label: "Organização", value: user.organizationName },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Alterar senha" description="Outras sessões abertas serão encerradas." />
          <CardBody>
            <ActionForm action={changeOwnPassword} className="flex flex-col gap-3" resetOnSuccess>
              <Field label="Senha atual" htmlFor="current">
                <Input id="current" name="current" type="password" autoComplete="current-password" required />
              </Field>
              <Field label="Nova senha" htmlFor="next" hint="Mínimo 12 caracteres, com letras e números.">
                <Input id="next" name="next" type="password" autoComplete="new-password" required minLength={12} />
              </Field>
              <Field label="Confirmar nova senha" htmlFor="confirm">
                <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={12} />
              </Field>
              <button type="submit" className={buttonClass.primary}>
                Alterar senha
              </button>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
