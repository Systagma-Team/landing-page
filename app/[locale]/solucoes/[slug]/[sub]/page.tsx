import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { SUB_OFFER } from "@/content/offers";
import { OfferRoute, offerMetadata } from "@/components/offer-route";

// Specialty pages under a pillar (/solucoes/dados/power-bi…); localized paths map here through i18n/routing.ts
export const dynamicParams = false;
export const generateStaticParams = () =>
  Object.keys(SUB_OFFER).map((path) => {
    const [slug, sub] = path.split("/");
    return { slug, sub };
  });

const kindOf = (slug: string, sub: string) => SUB_OFFER[`${slug}/${sub}` as keyof typeof SUB_OFFER];

export async function generateMetadata({ params }: PageProps<"/[locale]/solucoes/[slug]/[sub]">) {
  const { locale, slug, sub } = await params;
  const kind = kindOf(slug, sub);
  return kind ? offerMetadata(locale as Locale, kind) : {};
}

export default async function Specialty({ params }: PageProps<"/[locale]/solucoes/[slug]/[sub]">) {
  const { locale, slug, sub } = await params;
  const kind = kindOf(slug, sub);
  if (!kind) notFound();
  return <OfferRoute locale={locale as Locale} kind={kind} />;
}
