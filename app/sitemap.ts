import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { site } from "@/content/site";
import { OFFER_HREF } from "@/content/offers";

const pages = ["/", ...Object.values(OFFER_HREF), "/privacidade"] as const;
const priority = (href: (typeof pages)[number]) => (href === "/" ? 1 : href === "/privacidade" ? 0.3 : 0.8);

// One entry per page and locale, each listing every language version (SPEC 10.4)
export default function sitemap(): MetadataRoute.Sitemap {
  const url = (href: (typeof pages)[number], locale: (typeof routing.locales)[number]) =>
    new URL(getPathname({ href, locale }), site.url).href;
  return pages.flatMap((href) =>
    routing.locales.map((locale) => ({
      url: url(href, locale),
      changeFrequency: "monthly" as const,
      priority: priority(href),
      alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, url(href, l)])) },
    })),
  );
}
