/** pt-BR labels for enums. Code stays in English; the interface speaks Portuguese. */

export const COMPATIBILITY_LABEL: Record<string, string> = {
  HIGH_COMPATIBILITY: "Alta compatibilidade",
  MEDIUM_COMPATIBILITY: "Compatibilidade média",
  LOW_COMPATIBILITY: "Baixa compatibilidade",
  REQUIRES_REVIEW: "Requer revisão",
  LIKELY_INCOMPATIBLE: "Provavelmente incompatível",
  INSUFFICIENT_INFORMATION: "Informação insuficiente",
};

export const WORKFLOW_LABEL: Record<string, string> = {
  NEW: "Nova",
  AUTOMATICALLY_ANALYZED: "Analisada automaticamente",
  REVIEW_REQUIRED: "Revisão necessária",
  INTERESTED: "Interesse",
  ANALYZING_DOCUMENTS: "Analisando documentos",
  PREPARING_PROPOSAL: "Preparando proposta",
  READY_FOR_HUMAN_SUBMISSION: "Pronta para envio humano",
  SUBMITTED_EXTERNALLY: "Enviada externamente",
  WON: "Vencida",
  LOST: "Perdida",
  DISCARDED: "Descartada",
  CANCELLED: "Cancelada",
};

export const KIND_LABEL: Record<string, string> = {
  ACTIVE_TENDER: "Licitação",
  DIRECT_PROCUREMENT: "Contratação direta",
  FUTURE_PROCUREMENT: "Contratação futura (PCA)",
  CONTRACT_NOTICE: "Contrato",
  AWARD_RESULT: "Resultado",
  OTHER: "Outro",
};

export const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: "Divulgada",
  SUSPENDED: "Suspensa",
  CANCELLED: "Revogada/anulada",
  UNKNOWN: "Situação desconhecida",
};

export const INNOVATION_LABEL: Record<string, string> = {
  CPSI: "CPSI (Marco Legal das Startups)",
  ETEC: "Encomenda tecnológica",
  COMPETITIVE_DIALOGUE: "Diálogo competitivo",
  INNOVATION_MENTION: "Menciona inovação",
  NONE: "—",
};

export const REQUIREMENT_LABEL: Record<string, string> = {
  TECHNICAL_QUALIFICATION: "Qualificação técnica",
  PROFESSIONAL_QUALIFICATION: "Qualificação profissional",
  CERTIFICATE: "Certificação",
  FINANCIAL: "Econômico-financeira",
  PREVIOUS_EXPERIENCE: "Experiência anterior",
  CNAE: "CNAE",
  SITE_VISIT: "Visita técnica",
  CONSORTIUM: "Consórcio",
  SUBCONTRACTING: "Subcontratação",
  ME_EPP: "ME/EPP",
  EXECUTION_TIMEFRAME: "Prazo de execução",
  DEADLINE: "Prazos",
  INTEGRATION: "Integrações",
  PLATFORM: "Tecnologias/plataformas",
  GEOGRAPHIC: "Requisito geográfico",
  OTHER: "Outros",
};

export const REQUIREMENT_GROUPS: { title: string; categories: string[] }[] = [
  { title: "Requisitos técnicos", categories: ["INTEGRATION", "PLATFORM", "EXECUTION_TIMEFRAME"] },
  { title: "Capacidade técnica", categories: ["TECHNICAL_QUALIFICATION", "PREVIOUS_EXPERIENCE", "PROFESSIONAL_QUALIFICATION"] },
  { title: "Requisitos documentais", categories: ["CERTIFICATE", "CNAE", "ME_EPP"] },
  { title: "Requisitos financeiros", categories: ["FINANCIAL"] },
  { title: "Condições de participação", categories: ["SITE_VISIT", "CONSORTIUM", "SUBCONTRACTING", "GEOGRAPHIC", "DEADLINE", "OTHER"] },
];

export const DIMENSION_LABEL: Record<string, string> = {
  service: "Compatibilidade de serviço",
  activity: "Atividade / CNAE",
  technicalCapacity: "Capacidade técnica",
  evidence: "Evidência técnica",
  economic: "Viabilidade econômica",
  time: "Prazo para proposta",
  geographic: "Geografia",
  documentation: "Prontidão documental",
  strategic: "Estratégico / inovação",
};

export const VAULT_CATEGORY_LABEL: Record<string, string> = {
  CNPJ_CARD: "Cartão CNPJ",
  CCMEI: "CCMEI",
  SICAF: "SICAF",
  CERTIDAO_FEDERAL: "Certidão federal (Receita/PGFN)",
  CERTIDAO_ESTADUAL: "Certidão estadual",
  CERTIDAO_MUNICIPAL: "Certidão municipal",
  CERTIDAO_FGTS: "Certidão FGTS (CRF)",
  CERTIDAO_TRABALHISTA: "Certidão trabalhista (CNDT)",
  CERTIDAO_FALENCIA: "Certidão de falência/recuperação",
  ATESTADO_CAPACIDADE_TECNICA: "Atestado de capacidade técnica",
  PORTFOLIO: "Portfólio",
  CASE_STUDY: "Case",
  TEAM_QUALIFICATION: "Qualificação da equipe",
  PROFESSIONAL_CERTIFICATION: "Certificação profissional",
  LEGAL: "Documento jurídico",
  FINANCIAL: "Documento financeiro",
  OTHER: "Outro",
};

export const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  ATESTADO_CAPACIDADE_TECNICA: "Atestado de capacidade técnica",
  CASE: "Case",
  CERTIFICATION: "Certificação",
  PORTFOLIO: "Portfólio",
  CONTRACT: "Contrato executado",
  OTHER: "Outro",
};

export const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  CNAE_PRIMARY: "CNAE principal",
  CNAE_SECONDARY: "CNAE secundário",
  MEI_OCCUPATION: "Ocupação MEI",
  ACTIVITY: "Atividade",
};

export const LEVEL_LABEL: Record<string, string> = {
  CORE: "Principal",
  SECONDARY: "Secundária",
  EXPLORATORY: "Exploratória",
};

export const ALERT_TYPE_LABEL: Record<string, string> = {
  NEW_HIGH_MATCH: "Nova oportunidade de alta compatibilidade",
  DEADLINE_SOON: "Prazo próximo",
  DEADLINE_CHANGED: "Prazo alterado",
  OPPORTUNITY_UPDATED: "Oportunidade atualizada",
  DOCUMENT_EXPIRING: "Documento vencendo",
  NEW_PCA_MATCH: "Nova contratação futura (PCA)",
  NEW_INNOVATION: "Nova oportunidade de inovação",
  SOURCE_FAILURE: "Falha de coleta",
};

export const CHANNEL_LABEL: Record<string, string> = { IN_APP: "No sistema", EMAIL: "E-mail", WEBHOOK: "Webhook", SLACK: "Slack" };
export const FREQUENCY_LABEL: Record<string, string> = { IMMEDIATE: "Imediato", DAILY: "Resumo diário", WEEKLY: "Resumo semanal", OFF: "Desligado" };

export const CHANGE_TYPE_LABEL: Record<string, string> = {
  DEADLINE_CHANGED: "Prazo de proposta alterado",
  PROPOSAL_START_CHANGED: "Abertura de propostas alterada",
  VALUE_CHANGED: "Valor estimado alterado",
  STATUS_CHANGED: "Situação alterada",
  OBJECT_CHANGED: "Objeto/informações alterados",
  DOCUMENT_ADDED: "Novo documento",
  OTHER: "Outra alteração",
};

export const SPHERE_LABEL: Record<string, string> = { F: "Federal", E: "Estadual", M: "Municipal", D: "Distrital" };
export const POWER_LABEL: Record<string, string> = { E: "Executivo", L: "Legislativo", J: "Judiciário", N: "Não se aplica" };

export const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export const SOURCE_LABEL: Record<string, string> = { pncp: "PNCP", comprasgov: "Compras.gov.br", contratabrasil: "Contrata+Brasil", demo: "Demonstração (fictício)" };
