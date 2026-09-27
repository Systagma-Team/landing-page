import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { isSet, site } from "@/content/site";

type Href = Parameters<typeof getPathname>[0]["href"];

/**
 * Indexing needs the real domain: without NEXT_PUBLIC_SITE_URL, canonicals, hreflang, OG and the sitemap would point at
 * localhost, so the site stays noindex (robots.txt disallows too). A deploy that forgets the variable fails safe.
 */
export const indexable = !!process.env.NEXT_PUBLIC_SITE_URL;

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

/**
 * Everything a page's metadata needs: title, description, canonical/hreflang, its own og:url and the share image.
 * A page-level openGraph replaces the parent's, so the locale's generated image (app/[locale]/opengraph-image.tsx)
 * is referenced here explicitly; otherwise child pages would share without an image.
 */
export function pageMetadata(href: Href, locale: Locale, description: string, title?: string): Metadata {
  const image = { url: `/${locale}/opengraph-image`, width: 1200, height: 630, alt: site.name, type: "image/png" };
  return {
    ...(title ? { title } : {}),
    description,
    alternates: alternates(href, locale),
    openGraph: {
      type: "website",
      siteName: site.name,
      url: getPathname({ href, locale }),
      ...(title ? { title: `${title} — ${site.name}` } : {}),
      description,
      locale: locale === "pt-BR" ? "pt_BR" : "en_US",
      alternateLocale: locale === "pt-BR" ? ["en_US"] : ["pt_BR"],
      images: [image],
    },
    twitter: { card: "summary_large_image", images: [image.url] },
  };
}

const absolute = (href: Href, locale: Locale) => new URL(getPathname({ href, locale }), site.url).href;

/** Organization + WebSite graph (SPEC 10.3), plus FAQPage. Placeholder values are left out. */
export function jsonLd(locale: Locale, slogan: string, description: string, knowsAbout: string[], faq: { q: string; a: string }[]) {
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
        description,
        email,
        slogan,
        // The entity Google should associate with the brand: what Systagma does, for all of Brazil
        knowsAbout,
        areaServed: { "@type": "Country", name: "Brasil" },
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

/** One offer page: the Service (provided by the organization, nationwide) and its visible breadcrumb trail. */
export function offerLd(locale: Locale, href: Href, name: string, description: string, trail: { name: string; href: Href }[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name,
        description,
        url: absolute(href, locale),
        inLanguage: locale,
        areaServed: { "@type": "Country", name: "Brasil" },
        provider: { "@id": `${site.url}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: absolute(t.href, locale) })),
      },
    ],
  };
}

/** JSON for a <script type="application/ld+json">: every "<" is written as a unicode escape so content can't close the tag. */
export const ldScript = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");
