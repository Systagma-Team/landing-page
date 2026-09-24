import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { isSet, site } from "@/content/site";

type Href = Parameters<typeof getPathname>[0]["href"];

/** Canonical + hreflang alternates for one page, using each locale's localized path. */
export function alternates(href: Href, locale: Locale): Metadata["alternates"] {
  const path = (l: Locale) => getPathname({ href, locale: l });
  return {
    canonical: path(locale),
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, path(l)])),
      "x-default": path(routing.defaultLocale),
    },
  };
}

/** Organization + WebSite graph (SPEC 10.3), plus FAQPage. Placeholder values are left out. */
export function jsonLd(locale: Locale, slogan: string, faq: { q: string; a: string }[]) {
  const org = `${site.url}/#organization`;
  const email = isSet(site.email) ? site.email : undefined;
  const sameAs = Object.values(site.socials).filter(isSet);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": org,
        name: site.name,
        legalName: isSet(site.legalName) ? site.legalName : undefined,
        url: site.url,
        logo: `${site.url}/brand/systagma-symbol-color.png`,
        email,
        slogan,
        address: {
          "@type": "PostalAddress",
          addressLocality: isSet(site.city) ? site.city : undefined,
          addressRegion: isSet(site.uf) ? site.uf : undefined,
          addressCountry: "BR",
        },
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "sales",
            email,
            url: site.whatsapp ? `https://wa.me/${site.whatsapp}` : undefined,
            availableLanguage: ["Portuguese", "English"],
          },
        ],
        sameAs: sameAs.length ? sameAs : undefined,
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        inLanguage: [...routing.locales],
        publisher: { "@id": org },
      },
      {
        "@type": "FAQPage",
        inLanguage: locale,
        mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
    ],
  };
}

/** JSON for a <script type="application/ld+json">: "<" escaped so content can't close the tag. */
export const ldScript = (data: object) => JSON.stringify(data).replace(/</g, "\u003c");
