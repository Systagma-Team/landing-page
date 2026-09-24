import type { Metadata } from "next";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { alternates, jsonLd, ldScript } from "@/lib/seo";
import { SiteHeader } from "@/components/shell";
import { About, Contact, Faq, Hero, HowWeWork, Services } from "@/components/sections";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  return { alternates: alternates("/", locale) };
}

// S4 Portfolio and S6 Testimonials render only once real content exists (SPEC 11.1); none yet.
export default async function Home({ params }: PageProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const { faq } = await getMessages();
  const t = await getTranslations("footer");
  const ld = jsonLd(locale, t("tagline"), Object.values(faq.items));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldScript(ld) }} />
      <SiteHeader page="/" />
      <main id="main" tabIndex={-1}>
        <Hero />
        <About />
        <Services />
        <HowWeWork />
        <Faq />
        <Contact />
      </main>
    </>
  );
}
