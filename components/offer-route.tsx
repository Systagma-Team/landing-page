import type { Metadata } from "next";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { OFFER_HREF, type OfferKey } from "@/content/offers";
import { alternates, ldScript, serviceLd } from "@/lib/seo";
import { OfferPage } from "@/components/offer";

// Shared by the offer routes (app/[locale]/solucoes/[slug], consultoria, sustentacao-e-evolucao)

export async function offerMetadata(locale: Locale, kind: OfferKey): Promise<Metadata> {
  const { offers } = await getMessages({ locale });
  const { title, description } = offers[kind].meta;
  return { title, description, alternates: alternates(OFFER_HREF[kind], locale) };
}

export async function OfferRoute({ locale, kind }: { locale: Locale; kind: OfferKey }) {
  setRequestLocale(locale);
  const { offers } = await getMessages({ locale });
  const ld = serviceLd(locale, OFFER_HREF[kind], offers[kind].meta.title, offers[kind].meta.description);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldScript(ld) }} />
      <OfferPage kind={kind} />
    </>
  );
}
