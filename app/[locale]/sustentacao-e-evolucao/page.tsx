import type { Locale } from "@/i18n/routing";
import { OfferRoute, offerMetadata } from "@/components/offer-route";

export async function generateMetadata({ params }: PageProps<"/[locale]/sustentacao-e-evolucao">) {
  return offerMetadata((await params).locale as Locale, "support");
}

export default async function Support({ params }: PageProps<"/[locale]/sustentacao-e-evolucao">) {
  return <OfferRoute locale={(await params).locale as Locale} kind="support" />;
}
