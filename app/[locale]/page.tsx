import type { Metadata } from "next";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { alternates, jsonLd, ldScript } from "@/lib/seo";
import { SiteHeader } from "@/components/layout/chrome";
import { Contact, Faq, Hero, HowWeWork, Manifesto, Pillars } from "@/components/chapters";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  return { alternates: alternates("/", locale) };
}

// C4 Work and C6 Testimonials render only once real content exists (SPEC 11.1 of the design system); none yet.
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
      <main id="main" tabIndex={-1} className="relative z-10">
        <Hero />
        <Manifesto />
        <Pillars />
        <HowWeWork />
        <Faq />
        <Contact />
      </main>
    </>
  );
}
