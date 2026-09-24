import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { urbanist, plexSans } from "@/lib/fonts";
import { site } from "@/content/site";
import { SiteFooter } from "@/components/shell";
import "../globals.css";

export const dynamicParams = false;
export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));

export const viewport: Viewport = { themeColor: "#031227" };

// Shared defaults; each page adds its own canonical and hreflang alternates
export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(site.url),
    title: { default: t("title"), template: "%s — Systagma" },
    description: t("description"),
    applicationName: site.name,
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: locale === "pt-BR" ? "pt_BR" : "en_US",
      alternateLocale: locale === "pt-BR" ? ["en_US"] : ["pt_BR"],
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations("common");

  return (
    <html lang={locale} className={`${urbanist.variable} ${plexSans.variable}`} data-scroll-behavior="smooth">
      <body>
        <a
          href="#main"
          className="sr-only z-100 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:rounded-sm focus:bg-surface-raised focus:px-4 focus:py-3"
        >
          {t("skip")}
        </a>
        {/* Only the contact form reads messages on the client */}
        <NextIntlClientProvider messages={{ contact: messages.contact }}>
          {children}
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
