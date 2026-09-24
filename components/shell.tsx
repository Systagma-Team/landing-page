import { useLocale, useTranslations } from "next-intl";
import { isSet, site } from "@/content/site";
import { getPathname, Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { whatsappHref } from "@/lib/whatsapp";
import { button } from "@/lib/ui";
import { Logo } from "@/components/brand";
import { MobileMenu } from "@/components/interactive";

type Page = "/" | "/privacidade";

/** Section links point at the home page so they also work from the privacy page and the 404. */
function useSectionLinks() {
  const t = useTranslations("nav");
  const home = getPathname({ href: "/", locale: useLocale() });
  // Portfolio link returns with the first project (SPEC S4)
  return [
    { href: `${home}#services`, label: t("services") },
    { href: `${home}#how-we-work`, label: t("howWeWork") },
    { href: `${home}#faq`, label: t("faq") },
  ];
}

export function SiteHeader({ page }: { page: Page }) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const locale = useLocale();
  const links = useSectionLinks();
  const home = getPathname({ href: "/", locale });
  const cta = { href: `${home}#contact`, label: t("cta") };

  return (
    <header data-theme="dark" className="sticky top-0 z-50 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-6 lg:h-18">
        <a href={`${home}#top`} aria-label={tc("home")} className="rounded-xs">
          <Logo />
        </a>
        <nav aria-label={t("label")} className="ml-auto hidden lg:block">
          <ul className="flex gap-8 text-body-sm font-medium">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-fg-muted transition-colors hover:text-fg">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-4 lg:ml-0">
          <ul aria-label={t("language")} className="flex items-center text-body-sm font-medium">
            {routing.locales.map((l, i) => (
              <li key={l} className={i ? "border-l border-line" : ""}>
                <Link
                  href={page}
                  locale={l}
                  hrefLang={l}
                  lang={l}
                  aria-label={l === "en" ? t("en") : t("pt")}
                  aria-current={l === locale ? "true" : undefined}
                  className={`grid h-11 place-items-center px-2.5 ${l === locale ? "text-fg" : "text-fg-muted hover:text-fg"}`}
                >
                  {l === "en" ? "EN" : "PT"}
                </Link>
              </li>
            ))}
          </ul>
          <a href={cta.href} className={`${button("primary", "sm")} max-lg:hidden`}>
            {cta.label}
          </a>
          <MobileMenu links={links} cta={cta} labels={{ open: t("openMenu"), close: t("closeMenu"), nav: t("label") }} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const t = useTranslations();
  const locale = useLocale();
  const links = useSectionLinks();
  const wa = whatsappHref(locale);
  const socials = Object.entries(site.socials).filter(([, url]) => isSet(url));
  const col = "flex flex-col gap-3 text-body-sm";

  return (
    <footer data-theme="dark" className="border-t border-line">
      <div className="container-content flex flex-col gap-12 py-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="flex flex-col gap-4">
            <Logo />
            <p className="text-fg-muted">{t("footer.tagline")}</p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <nav aria-label={t("footer.site")} className={col}>
              <h2 className="font-sans text-body-sm font-semibold">{t("footer.site")}</h2>
              {links.map((l) => (
                <a key={l.href} href={l.href} className="text-fg-muted hover:text-fg">{l.label}</a>
              ))}
            </nav>
            <div className={col}>
              <h2 className="font-sans text-body-sm font-semibold">{t("footer.contact")}</h2>
              <a href={`mailto:${site.email}`} className="text-fg-muted hover:text-fg">{site.email}</a>
              {wa && (
                <a href={wa} target="_blank" rel="noopener" className="text-fg-muted hover:text-fg">
                  WhatsApp <span className="sr-only">{t("common.newTab")}</span>
                </a>
              )}
            </div>
            {socials.length > 0 && (
              <div className={col}>
                <h2 className="font-sans text-body-sm font-semibold">{t("footer.social")}</h2>
                {socials.map(([name, url]) => (
                  <a key={name} href={url} target="_blank" rel="noopener" className="text-fg-muted hover:text-fg">
                    {name} <span className="sr-only">{t("common.newTab")}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-fg-subtle">
          <span>© {new Date().getFullYear()} {site.legalName}</span>
          <span>CNPJ {site.cnpj}</span>
          <span>{site.city} – {site.uf}</span>
          <Link href="/privacidade" className="link">{t("footer.privacy")}</Link>
        </p>
      </div>
    </footer>
  );
}
