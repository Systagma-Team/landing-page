import type { ProfileKind, ScoringConfig } from "@/server/matching/types";

/** Initial weights from the product brief. Not permanent — editable per profile in Perfis → Pesos. */
export const DEFAULT_WEIGHTS: ScoringConfig["weights"] = {
  service: 25,
  activity: 20,
  technicalCapacity: 15,
  evidence: 10,
  economic: 10,
  time: 5,
  geographic: 5,
  documentation: 5,
  strategic: 5,
};

export function defaultScoring(kind: ProfileKind): ScoringConfig {
  return {
    weights: { ...DEFAULT_WEIGHTS },
    thresholds: { high: 75, medium: 55, low: 35 },
    alertMinScore: 75,
    essentialDocuments:
      kind === "MEI"
        ? ["CCMEI", "CERTIDAO_FEDERAL", "CERTIDAO_FGTS", "CERTIDAO_TRABALHISTA", "CERTIDAO_MUNICIPAL"]
        : [
            "CNPJ_CARD",
            "CERTIDAO_FEDERAL",
            "CERTIDAO_FGTS",
            "CERTIDAO_TRABALHISTA",
            "CERTIDAO_ESTADUAL",
            "CERTIDAO_MUNICIPAL",
            "CERTIDAO_FALENCIA",
          ],
  };
}

type SeedTerm = [term: string, weight: number, caseSensitive?: boolean];

export interface SeedCapability {
  category: string;
  name: string;
  description: string;
  level: "CORE" | "SECONDARY" | "EXPLORATORY";
  strategic: boolean;
  terms: SeedTerm[];
}

/**
 * Systagma seed taxonomy (brief §3 and §18). Terms are discovery signals combined with
 * classification — never exact-match filters. Everything here is editable in the profile.
 */
export const SYSTAGMA_CAPABILITIES: SeedCapability[] = [
  {
    category: "SOFTWARE",
    name: "Software sob medida",
    description: "Sistemas e softwares customizados, sistemas web, plataformas, APIs, backend, modernização",
    level: "CORE",
    strategic: false,
    terms: [
      ["desenvolvimento de sistemas", 1.2],
      ["desenvolvimento de software", 1.2],
      ["software sob medida", 1.2],
      ["fábrica de software", 1.2],
      ["sistemas web", 1],
      ["sistema web", 1],
      ["aplicação web", 1],
      ["modernização de sistemas", 1],
      ["plataforma digital", 0.7],
      ["solução de tecnologia", 0.5],
      ["desenvolvimento de aplicativos", 1],
      ["desenvolvimento de soluções", 0.6],
    ],
  },
  {
    category: "MAINTENANCE",
    name: "Sustentação e evolução de sistemas",
    description: "Manutenção, suporte e evolução contínua de sistemas e integrações",
    level: "CORE",
    strategic: false,
    terms: [
      ["sustentação de sistemas", 1.2],
      ["manutenção de sistemas", 1],
      ["manutenção evolutiva", 1],
      ["manutenção corretiva e evolutiva", 1],
      ["evolução de sistemas", 1],
      ["manutenção de software", 1],
      ["suporte a sistemas", 0.7],
    ],
  },
  {
    category: "DATA",
    name: "Dados e Business Intelligence",
    description: "BI, Power BI, dashboards, engenharia e integração de dados, ETL/ELT, data warehouse, ciência de dados",
    level: "CORE",
    strategic: true,
    terms: [
      ["business intelligence", 1.2],
      ["Power BI", 1.2],
      ["BI", 0.8, true],
      ["dashboard", 0.8],
      ["painel gerencial", 0.9],
      ["painel de indicadores", 0.9],
      ["indicadores", 0.3],
      ["análise de dados", 1],
      ["engenharia de dados", 1.2],
      ["integração de dados", 1],
      ["ETL", 1, true],
      ["ELT", 1, true],
      ["pipeline de dados", 1.2],
      ["data warehouse", 1.2],
      ["data lake", 1],
      ["ciência de dados", 1],
      ["analytics", 0.8],
      ["análise preditiva", 1],
    ],
  },
  {
    category: "AUTOMATION",
    name: "Automação de processos",
    description: "Automação de processos, tarefas, workflows, rotinas administrativas e relatórios",
    level: "CORE",
    strategic: true,
    terms: [
      ["automação de processos", 1.2],
      ["automação de tarefas", 1],
      ["automação de workflows", 1],
      ["automação de fluxos", 1],
      ["automação administrativa", 1],
      ["automação de relatórios", 1],
      ["RPA", 1, true],
      ["robotização de processos", 1],
    ],
  },
  {
    category: "INTEGRATION",
    name: "Integração de sistemas e APIs",
    description: "Integração de sistemas, APIs, plataformas e dados; webservices",
    level: "CORE",
    strategic: false,
    terms: [
      ["integração de sistemas", 1.2],
      ["integração de APIs", 1.2],
      ["integração de plataformas", 1],
      ["webservices", 0.8],
      ["web services", 0.8],
      ["serviços web", 0.6],
      ["API", 0.6, true],
      ["APIs", 0.6, true],
      ["barramento de serviços", 0.8],
      ["interoperabilidade", 0.7],
    ],
  },
  {
    category: "AI",
    name: "IA aplicada",
    description: "Agentes de IA, assistentes, RAG, LLM, processamento de documentos, busca inteligente, classificação",
    level: "CORE",
    strategic: true,
    terms: [
      ["inteligência artificial", 1.2],
      ["IA", 0.9, true],
      ["IA generativa", 1.2],
      ["agente de IA", 1.2],
      ["agentes inteligentes", 1],
      ["assistente virtual", 1],
      ["chatbot", 1],
      ["machine learning", 1.2],
      ["aprendizado de máquina", 1.2],
      ["processamento de linguagem natural", 1.2],
      ["modelos de linguagem", 1],
      ["processamento de documentos", 0.8],
      ["extração de informação", 0.8],
      ["RAG", 0.9, true],
      ["LLM", 1, true],
      ["busca inteligente", 0.8],
    ],
  },
  {
    category: "WEB",
    name: "Web e portais",
    description: "Sites institucionais e corporativos, portais, landing pages, aplicações web",
    level: "SECONDARY",
    strategic: false,
    terms: [
      ["portal", 0.4],
      ["portal web", 0.9],
      ["portal institucional", 1],
      ["portal de serviços", 0.8],
      ["site institucional", 1],
      ["website", 1],
      ["sítio eletrônico", 0.7],
      ["desenvolvimento web", 1],
      ["landing page", 1],
      ["portal da transparência", 0.8],
    ],
  },
  {
    category: "CONSULTING",
    name: "Consultoria em tecnologia",
    description: "Consultoria em tecnologia, sistemas, dados, automação, arquitetura e oportunidades de IA",
    level: "SECONDARY",
    strategic: false,
    terms: [
      ["consultoria em tecnologia", 1],
      ["consultoria em TI", 1],
      ["consultoria em dados", 1],
      ["consultoria em sistemas", 1],
      ["arquitetura de software", 1],
      ["arquitetura de dados", 1],
      ["transformação digital", 0.7],
    ],
  },
];

/** Negative signals: "software" mentioned but the object is licensing, resale or hardware. */
export const SYSTAGMA_NEGATIVE_TERMS: { term: string; weight: number; effect: "EXCLUDE" | "PENALIZE"; note: string }[] = [
  { term: "licença de software", weight: 1.5, effect: "EXCLUDE", note: "Revenda/licenciamento" },
  { term: "licenças de uso", weight: 1.5, effect: "EXCLUDE", note: "Revenda/licenciamento" },
  { term: "licenciamento de software", weight: 1.5, effect: "EXCLUDE", note: "Revenda/licenciamento" },
  { term: "aquisição de licenças", weight: 1.5, effect: "EXCLUDE", note: "Revenda/licenciamento" },
  { term: "renovação de licenças", weight: 1.2, effect: "EXCLUDE", note: "Revenda/licenciamento" },
  { term: "subscrição", weight: 1.2, effect: "EXCLUDE", note: "Revenda/licenciamento" },
  { term: "cessão de direito de uso", weight: 0.8, effect: "PENALIZE", note: "Software pronto (locação)" },
  { term: "locação de software", weight: 0.8, effect: "PENALIZE", note: "Software pronto (locação)" },
  { term: "aquisição de computadores", weight: 1.5, effect: "EXCLUDE", note: "Hardware" },
  { term: "microcomputadores", weight: 1.2, effect: "EXCLUDE", note: "Hardware" },
  { term: "notebooks", weight: 1.2, effect: "EXCLUDE", note: "Hardware" },
  { term: "desktops", weight: 1.2, effect: "EXCLUDE", note: "Hardware" },
  { term: "equipamentos de informática", weight: 1.2, effect: "EXCLUDE", note: "Hardware" },
  { term: "suprimentos de informática", weight: 1.2, effect: "EXCLUDE", note: "Hardware" },
  { term: "impressoras", weight: 1.2, effect: "EXCLUDE", note: "Impressão" },
  { term: "outsourcing de impressão", weight: 1.5, effect: "EXCLUDE", note: "Impressão" },
  { term: "toner", weight: 1.2, effect: "EXCLUDE", note: "Impressão" },
  { term: "cartuchos", weight: 1, effect: "EXCLUDE", note: "Impressão" },
  { term: "cabeamento estruturado", weight: 1.5, effect: "EXCLUDE", note: "Infraestrutura de rede" },
  { term: "rede lógica", weight: 1.2, effect: "EXCLUDE", note: "Infraestrutura de rede" },
  { term: "fibra óptica", weight: 1, effect: "EXCLUDE", note: "Infraestrutura de rede" },
  { term: "switches", weight: 1, effect: "EXCLUDE", note: "Infraestrutura de rede" },
  { term: "nobreak", weight: 1, effect: "EXCLUDE", note: "Hardware" },
  { term: "telefonia", weight: 1, effect: "EXCLUDE", note: "Telecom" },
  { term: "videomonitoramento", weight: 1, effect: "EXCLUDE", note: "Segurança eletrônica" },
  { term: "manutenção de computadores", weight: 1.2, effect: "EXCLUDE", note: "Manutenção de hardware" },
];
