import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pt-BR", "en"],
  defaultLocale: "pt-BR",
  localePrefix: "as-needed",
  // "/" is always Portuguese: no Accept-Language redirect and no locale cookie; English lives at /en
  localeDetection: false,
  localeCookie: false,
  pathnames: {
    "/": "/",
    "/privacidade": { "pt-BR": "/privacidade", en: "/privacy" },
    // Offer pages (content/offers.ts); the four solutions share app/[locale]/solucoes/[slug]
    "/solucoes/software": { "pt-BR": "/solucoes/software", en: "/solutions/software" },
    "/solucoes/dados": { "pt-BR": "/solucoes/dados", en: "/solutions/data" },
    "/solucoes/automacao-e-ia": { "pt-BR": "/solucoes/automacao-e-ia", en: "/solutions/automation-and-ai" },
    "/solucoes/web": { "pt-BR": "/solucoes/web", en: "/solutions/web" },
    "/consultoria": { "pt-BR": "/consultoria", en: "/consulting" },
    "/sustentacao-e-evolucao": { "pt-BR": "/sustentacao-e-evolucao", en: "/support-and-evolution" },
  },
});

export type Locale = (typeof routing.locales)[number];
