import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { SLUG_OFFER } from "@/content/offers";
import { OfferRoute, offerMetadata } from "@/components/offer-route";

// The four solution pages; localized paths (/en/solutions/data…) map here through i18n/routing.ts
export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(SLUG_OFFER).map((slug) => ({ slug }));

const kindOf = (slug: string) => SLUG_OFFER[slug as keyof typeof SLUG_OFFER];

export async function generateMetadata({ params }: PageProps<"/[locale]/solucoes/[slug]">) {
  const { locale, slug } = await params;
  return kindOf(slug) ? offerMetadata(locale as Locale, kindOf(slug)) : {};
}

export default async function Solution({ params }: PageProps<"/[locale]/solucoes/[slug]">) {
  const { locale, slug } = await params;
  if (!kindOf(slug)) notFound();
  return <OfferRoute locale={locale as Locale} kind={kindOf(slug)} />;
}
