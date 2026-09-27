import type { Metadata } from "next";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { OFFER_HREF, PARENT, type OfferKey } from "@/content/offers";
import { site } from "@/content/site";
import { ldScript, offerLd, pageMetadata } from "@/lib/seo";
import { OfferPage } from "@/components/offer";

// Shared by the offer routes (app/[locale]/solucoes/[slug], [slug]/[sub], consultoria, sustentacao-e-evolucao)

export async function offerMetadata(locale: Locale, kind: OfferKey): Promise<Metadata> {
  const { offers } = await getMessages({ locale });
  const { title, description } = offers[kind].meta;
  return pageMetadata(OFFER_HREF[kind], locale, description, title);
}

export async function OfferRoute({ locale, kind }: { locale: Locale; kind: OfferKey }) {
  setRequestLocale(locale);
  const { offers } = await getMessages({ locale });
  const parent = PARENT[kind];
  // Pages in the trail: home › [pillar ›] offer (the "Soluções"/"Serviços" label on the page has no page of its own)
  const trail = [
    { name: site.name, href: "/" as const },
    ...(parent ? [{ name: offers[parent].name, href: OFFER_HREF[parent] }] : []),
    { name: offers[kind].name, href: OFFER_HREF[kind] },
  ];
  const ld = offerLd(locale, OFFER_HREF[kind], offers[kind].meta.title, offers[kind].meta.description, trail);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldScript(ld) }} />
      <OfferPage kind={kind} />
    </>
  );
}
