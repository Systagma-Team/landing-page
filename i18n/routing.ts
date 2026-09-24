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
  },
});

export type Locale = (typeof routing.locales)[number];
