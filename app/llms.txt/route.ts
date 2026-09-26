import en from "@/messages/en.json";
import { isSet, site } from "@/content/site";
import { getPathname } from "@/i18n/navigation";
import { OFFER_HREF, PILLARS, SERVICES, type OfferKey } from "@/content/offers";

export const dynamic = "force-static";

// Short Markdown summary for LLM crawlers (SPEC 10.4, optional convention), built from the site copy
export function GET() {
  const offer = (k: OfferKey) =>
    `- [${en.offers[k].name}](${new URL(getPathname({ href: OFFER_HREF[k], locale: "en" }), site.url).href}): ${en.offers[k].meta.description}`;
  const body = [
    "# Systagma",
    "",
    `> ${en.meta.description}`,
    "",
    en.hero.lead,
    "",
    "## Solutions",
    ...PILLARS.map(offer),
    "",
    "## Services",
    ...SERVICES.map(offer),
    "",
    "## Contact",
    `- Website: ${site.url} (Portuguese) · ${site.url}/en (English)`,
    ...(isSet(site.email) ? [`- Email: ${site.email}`] : []),
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
