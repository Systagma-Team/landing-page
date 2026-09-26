import type { Need } from "@/lib/contact-options";

// Commercial architecture: four solution pillars and two services. Copy lives in messages (`offers.*`); this file maps
// each offer to its route and to the need it pre-selects in the contact form.
export const PILLARS = ["software", "data", "automation", "web"] as const;
export const SERVICES = ["consulting", "support"] as const;
export type OfferKey = (typeof PILLARS)[number] | (typeof SERVICES)[number];

export const OFFER_HREF = {
  software: "/solucoes/software",
  data: "/solucoes/dados",
  automation: "/solucoes/automacao-e-ia",
  web: "/solucoes/web",
  consulting: "/consultoria",
  support: "/sustentacao-e-evolucao",
} as const satisfies Record<OfferKey, string>;

export const OFFER_NEED: Record<OfferKey, Need> = {
  software: "system",
  data: "data",
  automation: "automation",
  web: "website",
  consulting: "consulting",
  support: "support",
};

/** `/solucoes/[slug]` segment → offer. */
export const SLUG_OFFER = { software: "software", dados: "data", "automacao-e-ia": "automation", web: "web" } as const;
