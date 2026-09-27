import type { Metadata } from "next";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { OpportunityListView } from "@/components/opportunity-list-view";
import { Notice } from "@/components/ui";
import { requireUser } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Radar de inovação" };

export default async function InnovationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const all = sp.inovacao === "todas";
  return (
    <OpportunityListView
      user={user}
      searchParams={sp}
      scope="innovation"
      basePath="/inovacao"
      eyebrow="Radar de inovação"
      title={all ? "Inovação — todas as menções" : "Inovação — CPSI, encomendas tecnológicas e diálogo competitivo"}
      description={
        <>
          Classificação a partir da base legal, modalidade e texto oficial. {all ? (
            <Link href="/inovacao" className="font-medium text-brand-700 underline">Ver apenas classificações fortes</Link>
          ) : (
            <Link href="/inovacao?inovacao=todas" className="font-medium text-brand-700 underline">Incluir simples menções a inovação</Link>
          )}
        </>
      }
      notice={
        <div className="mb-3">
          <Notice tone="info" icon={<Lightbulb className="size-4" aria-hidden />}>
            Uma oportunidade só é marcada como CPSI quando há referência explícita à LC 182/2021 ou ao instrumento “Contrato Público para Solução Inovadora”.
            Menções genéricas a “inovação” aparecem separadas e exigem revisão humana.
          </Notice>
        </div>
      }
    />
  );
}
