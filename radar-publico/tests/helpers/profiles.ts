import { defaultScoring, SYSTAGMA_CAPABILITIES, SYSTAGMA_NEGATIVE_TERMS } from "@/server/profiles/defaults";
import type { OpportunityInput, ProfileSnapshot } from "@/server/matching/types";

let seq = 0;
const id = (p: string) => `${p}-${++seq}`;

export function systagmaSnapshot(overrides: Partial<ProfileSnapshot> = {}): ProfileSnapshot {
  return {
    profileId: "systagma-profile",
    organizationId: "org",
    version: 1,
    kind: "COMPANY",
    slug: "systagma",
    displayName: "Systagma",
    legalName: "Systagma Tecnologia Ltda",
    cnpj: "00000000000191",
    isMeEpp: null,
    sicafStatus: "Cadastrado",
    nationwide: true,
    preferredStates: [],
    restrictToPreferredStates: false,
    minProjectValue: 20000,
    maxProjectValue: 3000000,
    scoring: defaultScoring("COMPANY"),
    activities: [
      { id: id("act"), type: "CNAE_PRIMARY", code: "6201-5/01", description: "Desenvolvimento de programas de computador sob encomenda", keywords: ["desenvolvimento de sistemas", "desenvolvimento de software", "software sob medida", "sistema web", "programas de computador"] },
      { id: id("act"), type: "CNAE_SECONDARY", code: "6209-1/00", description: "Suporte técnico, manutenção e outros serviços em tecnologia da informação", keywords: ["sustentação", "manutenção de sistemas", "manutenção evolutiva"] },
      { id: id("act"), type: "CNAE_SECONDARY", code: "6311-9/00", description: "Tratamento de dados, provedores de serviços de aplicação", keywords: ["tratamento de dados", "business intelligence", "Power BI"] },
    ],
    capabilities: SYSTAGMA_CAPABILITIES.map((c) => ({
      id: `cap-${c.category}`,
      category: c.category,
      name: c.name,
      level: c.level,
      strategic: c.strategic,
      terms: c.terms.map(([term, weight, cs]) => ({ term, weight, caseSensitive: !!cs })),
    })),
    negativeTerms: SYSTAGMA_NEGATIVE_TERMS.map((n, i) => ({ id: `neg-${i}`, term: n.term, weight: n.weight, caseSensitive: false, effect: n.effect, note: n.note })),
    evidence: [],
    documents: [
      { id: "d1", category: "CNPJ_CARD", title: "Cartão CNPJ", expiresOn: null },
      { id: "d2", category: "CERTIDAO_FEDERAL", title: "CND Federal", expiresOn: "2099-01-01" },
      { id: "d3", category: "CERTIDAO_FGTS", title: "CRF FGTS", expiresOn: "2099-01-01" },
      { id: "d4", category: "CERTIDAO_TRABALHISTA", title: "CNDT", expiresOn: "2099-01-01" },
      { id: "d5", category: "CERTIDAO_ESTADUAL", title: "Estadual", expiresOn: "2099-01-01" },
      { id: "d6", category: "CERTIDAO_MUNICIPAL", title: "Municipal", expiresOn: "2099-01-01" },
      { id: "d7", category: "CERTIDAO_FALENCIA", title: "Falência", expiresOn: "2099-01-01" },
    ],
    ...overrides,
  };
}

/** MEI configured with a real-looking non-software occupation (example data for tests only). */
export function meiSnapshot(overrides: Partial<ProfileSnapshot> = {}): ProfileSnapshot {
  return {
    profileId: "mei-profile",
    organizationId: "org",
    version: 1,
    kind: "MEI",
    slug: "mei",
    displayName: "MEI",
    legalName: "Fulano de Tal 00000000000",
    cnpj: "11111111000191",
    isMeEpp: true,
    sicafStatus: null,
    nationwide: false,
    preferredStates: ["PE"],
    restrictToPreferredStates: true,
    minProjectValue: null,
    maxProjectValue: 13000,
    scoring: defaultScoring("MEI"),
    activities: [
      {
        id: "mei-act-1",
        type: "MEI_OCCUPATION",
        code: "7420-0/01",
        description: "Fotógrafo(a) independente",
        keywords: ["fotografia", "fotográfico", "cobertura fotográfica", "registro fotográfico"],
      },
    ],
    capabilities: [
      { id: "mei-cap-1", category: "FOTOGRAFIA", name: "Cobertura fotográfica de eventos", level: "CORE", strategic: false, terms: [{ term: "cobertura fotográfica", weight: 1.2, caseSensitive: false }, { term: "serviços de fotografia", weight: 1.2, caseSensitive: false }] },
    ],
    negativeTerms: [],
    evidence: [],
    documents: [],
    ...overrides,
  };
}

export function opportunity(overrides: Partial<OpportunityInput> = {}): OpportunityInput {
  return {
    id: "opp-1",
    kind: "ACTIVE_TENDER",
    status: "PUBLISHED",
    title: "Pregão Eletrônico nº 123/2026",
    objectDescription: "",
    complementaryInfo: null,
    modalityCode: 6,
    state: "PE",
    city: "Recife",
    estimatedValue: 450000,
    proposalDeadline: new Date(Date.now() + 25 * 86_400_000),
    expectedDate: null,
    exclusiveMeEpp: null,
    innovationClass: "NONE",
    requirements: [],
    ...overrides,
  };
}
