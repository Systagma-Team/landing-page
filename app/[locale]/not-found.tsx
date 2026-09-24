import { useLocale, useTranslations } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import { button } from "@/lib/ui";
import { Symbol } from "@/components/brand";
import { SiteHeader } from "@/components/shell";

export default function NotFound() {
  const t = useTranslations("notFound");
  const home = getPathname({ href: "/", locale: useLocale() });
  return (
    <>
      <title>{t("h1")}</title>
      <SiteHeader page="/" />
      <main id="main" tabIndex={-1} data-theme="light" className="section">
        <div className="container-content flex flex-col items-center text-center">
          <Symbol className="h-40 w-auto" sizes="100px" />
          <h1 className="mt-10 text-display-md">{t("h1")}</h1>
          <p className="mt-6 max-w-[56ch] text-body-lg text-fg-muted">{t("body")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={home} className={button("secondary", "lg")}>{t("home")}</a>
            <a href={`${home}#contact`} className={button("primary", "lg")}>{t("cta")}</a>
          </div>
        </div>
      </main>
    </>
  );
}
