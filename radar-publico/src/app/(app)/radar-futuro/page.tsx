import type { Metadata } from "next";
import { Telescope } from "lucide-react";
import { OpportunityListView } from "@/components/opportunity-list-view";
import { Notice } from "@/components/ui";
import { requireUser } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Radar futuro" };

export default async function FutureRadarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  return (
    <OpportunityListView
      user={user}
      searchParams={await searchParams}
      scope="future"
      basePath="/radar-futuro"
      eyebrow="Planejamento / PCA"
      title="Radar futuro"
      description="Itens dos Planos de Contratações Anuais (PCA) publicados no PNCP que indicam compras antes da publicação do edital."
      notice={
        <div className="mb-3">
          <Notice tone="info" icon={<Telescope className="size-4" aria-hidden />} title="Oportunidade futura — ainda sem edital">
            A data prevista vem do próprio plano do órgão e pode mudar. Use para relacionamento e preparação, não como prazo de proposta.
          </Notice>
        </div>
      }
    />
  );
}
