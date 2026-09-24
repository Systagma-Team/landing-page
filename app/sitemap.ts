import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { site } from "@/content/site";

const pages = ["/", "/privacidade"] as const;

// One entry per page and locale, each listing every language version (SPEC 10.4)
export default function sitemap(): MetadataRoute.Sitemap {
  const url = (href: (typeof pages)[number], locale: (typeof routing.locales)[number]) =>
    new URL(getPathname({ href, locale }), site.url).href;
  return pages.flatMap((href) =>
    routing.locales.map((locale) => ({
      url: url(href, locale),
      changeFrequency: "monthly" as const,
      priority: href === "/" ? 1 : 0.3,
      alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, url(href, l)])) },
    })),
  );
}
