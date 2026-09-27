import type { CollectorDefinition } from "./types";

export interface SourceDefinition {
  key: string;
  name: string;
  description: string;
  enabledByDefault: boolean;
  defaultConfig: Record<string, unknown>;
  collectors: CollectorDefinition[];
}

/** Static metadata (no network code) shared by the seed, the worker scheduler and the admin UI. */
export const SOURCE_DEFINITIONS: SourceDefinition[] = [
  {
    key: "pncp",
    name: "PNCP — Portal Nacional de Contratações Públicas",
    description: "API de Consultas (contratações, PCA) e API PNCP (arquivos). Pública, sem autenticação.",
    enabledByDefault: true,
    defaultConfig: {
      baseUrl: "https://pncp.gov.br",
      // Leilão (1, 13) excluded: sale of public assets.
      modalities: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      pageSize: 50,
      maxPagesPerModality: 40,
      initialLookbackDays: 3,
      overlapDays: 1,
      proposalHorizonDays: 60,
      pcaDateParams: ["dataInicio", "dataFim"],
      pcaRelevantCategories: ["solucoes de tic", "servico", "servicos"],
    },
    collectors: [
      { name: "publicacao", label: "Contratações publicadas", cron: "5 */2 * * *" },
      { name: "atualizacao", label: "Contratações atualizadas", cron: "35 */6 * * *" },
      { name: "proposta", label: "Propostas em aberto", cron: "10 6 * * *" },
      { name: "pca", label: "Planos de Contratação Anual (PCA)", cron: "20 3 * * *" },
    ],
  },
  {
    key: "comprasgov",
    name: "Compras.gov.br — Dados Abertos (módulo Contratações)",
    description: "Espelho das contratações federais (SIASG) publicadas no PNCP. Desligado por padrão; deduplicado por número de controle PNCP.",
    enabledByDefault: false,
    defaultConfig: {
      baseUrl: "https://dadosabertos.compras.gov.br",
      modalities: [4, 5, 6, 7, 8, 9],
      pageSize: 50,
      maxPagesPerModality: 20,
      initialLookbackDays: 3,
      overlapDays: 1,
    },
    collectors: [{ name: "publicacao", label: "Contratações (Lei 14.133)", cron: "45 5 * * *" }],
  },
  {
    key: "contratabrasil",
    name: "Contrata+Brasil",
    description: "Sem API pública de consulta verificada. Contratações formalizadas aparecem no PNCP (dispensa).",
    enabledByDefault: false,
    defaultConfig: {},
    collectors: [],
  },
];

export function sourceDefinition(key: string): SourceDefinition | undefined {
  return SOURCE_DEFINITIONS.find((d) => d.key === key);
}
