import type { Need } from "@/lib/contact-options";

// Commercial architecture: four solution pillars, three specialty pages under them (chosen from search research:
// distinct commercial intents with their own SERPs) and two services. Copy lives in messages (`offers.*`).
export const PILLARS = ["software", "data", "automation", "web"] as const;
export const SPECIALTIES = ["bi", "integration", "ai"] as const;
export const SERVICES = ["consulting", "support"] as const;
export type OfferKey = (typeof PILLARS)[number] | (typeof SPECIALTIES)[number] | (typeof SERVICES)[number];

export const OFFER_HREF = {
  software: "/solucoes/software",
  data: "/solucoes/dados",
  automation: "/solucoes/automacao-e-ia",
  web: "/solucoes/web",
  bi: "/solucoes/dados/power-bi",
  integration: "/solucoes/automacao-e-ia/integracao-de-sistemas",
  ai: "/solucoes/automacao-e-ia/inteligencia-artificial",
  consulting: "/consultoria",
  support: "/sustentacao-e-evolucao",
} as const satisfies Record<OfferKey, string>;

/** Each specialty lives under a pillar (breadcrumb, schema and the pillar's "Aprofunde" links). */
export const PARENT: Partial<Record<OfferKey, OfferKey>> = { bi: "data", integration: "automation", ai: "automation" };
export const childrenOf = (k: OfferKey) => SPECIALTIES.filter((s) => PARENT[s] === k);

export const OFFER_NEED: Record<OfferKey, Need> = {
  software: "system",
  data: "data",
  automation: "automation",
  web: "website",
  bi: "data",
  integration: "integration",
  ai: "ai",
  consulting: "consulting",
  support: "support",
};

/** `/solucoes/[slug]` and `/solucoes/[slug]/[sub]` segments → offer. */
export const SLUG_OFFER = { software: "software", dados: "data", "automacao-e-ia": "automation", web: "web" } as const;
export const SUB_OFFER = {
  "dados/power-bi": "bi",
  "automacao-e-ia/integracao-de-sistemas": "integration",
  "automacao-e-ia/inteligencia-artificial": "ai",
} as const;
