import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { serif, sans, mono } from "@/lib/fonts";
import { site } from "@/content/site";
import { SiteFooter } from "@/components/layout/chrome";
import { SceneEngine } from "@/components/scene/engine";
import "../globals.css";

/** Runs before first paint: `js` class plus calm mode from storage or the OS setting (see lib/calm.ts). */
const headScript = `(function(){var d=document.documentElement;d.classList.add('js');try{var s=localStorage.getItem('sys:calm');var m=matchMedia('(prefers-reduced-motion: reduce)').matches;if(s==='1'||(s===null&&m))d.setAttribute('data-calm','')}catch(e){}})();`;

export const dynamicParams = false;
export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));

export const viewport: Viewport = { themeColor: "#020A17" };

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

  return (
    <html lang={locale} className={`${serif.variable} ${sans.variable} ${mono.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Before first paint: `js` class and calm mode, so nothing flashes in the wrong state */}
        <script dangerouslySetInnerHTML={{ __html: headScript }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only z-100 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:bg-panel focus:px-4 focus:py-3"
        >
          {messages.common.skip}
        </a>
        {/* Only the contact form reads messages on the client */}
        <NextIntlClientProvider messages={{ contact: messages.contact }}>
          <SceneEngine hud={{ chapters: messages.hud.chapters, meta: messages.hud.meta, order: messages.hud.order }} />
          {children}
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
