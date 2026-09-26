import type { Locale } from "@/i18n/routing";
import { OfferRoute, offerMetadata } from "@/components/offer-route";

export async function generateMetadata({ params }: PageProps<"/[locale]/consultoria">) {
  return offerMetadata((await params).locale as Locale, "consulting");
}

export default async function Consulting({ params }: PageProps<"/[locale]/consultoria">) {
  return <OfferRoute locale={(await params).locale as Locale} kind="consulting" />;
}
