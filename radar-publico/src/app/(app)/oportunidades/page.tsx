import type { Metadata } from "next";
import { OpportunityListView } from "@/components/opportunity-list-view";
import { requireUser } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Oportunidades" };

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  return (
    <OpportunityListView
      user={user}
      searchParams={await searchParams}
      scope="default"
      basePath="/oportunidades"
      title="Oportunidades"
      description="Contratações coletadas das fontes oficiais, analisadas separadamente para cada perfil. O score é de priorização de negócio — não indica habilitação legal."
    />
  );
}
