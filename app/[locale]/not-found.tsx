import { useLocale, useTranslations } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/chrome";

// 404 (SPEC 14.2): dark and centred, over the field's symbol formation
export default function NotFound() {
  const t = useTranslations("notFound");
  const home = getPathname({ href: "/", locale: useLocale() });
  return (
    <>
      <title>{t("h1")}</title>
      <SiteHeader page="/" />
      <main id="main" tabIndex={-1} data-chapter="lost" className="relative z-10 grid min-h-svh place-items-center px-(--space-gutter) py-32 text-center">
        <div data-field-safe className="flex max-w-4xl flex-col items-center">
          <h1 className="font-serif text-display-lg font-light">{t("h1")}</h1>
          <p className="mt-8 max-w-[48ch] text-body-lg text-fg-muted">{t("body")}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={home} variant="secondary">{t("home")}</ButtonLink>
            <ButtonLink href={`${home}#contact`} data-cta="404">{t("cta")}</ButtonLink>
          </div>
        </div>
      </main>
    </>
  );
}
