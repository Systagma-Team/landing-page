import { ArrowUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { isSet, site } from "@/content/site";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { whatsappHref } from "@/lib/whatsapp";
import { Lockup } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { CalmToggle, Clock, MobileMenu } from "@/components/ui/interactive";

type Page = "/" | "/privacidade";

/** Chapter links; they point at the home page so they also work from the privacy page and the 404. */
function useSectionLinks() {
  const t = useTranslations("nav");
  const home = getPathname({ href: "/", locale: useLocale() });
  // Portfolio (#work) returns with the first project (SPEC C4)
  return [
    { href: `${home}#services`, label: t("services"), chapter: "services" },
    { href: `${home}#how-we-work`, label: t("howWeWork"), chapter: "how" },
    { href: `${home}#faq`, label: t("faq"), chapter: "faq" },
  ];
}

export function SiteHeader({ page }: { page: Page }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const links = useSectionLinks();
  const home = getPathname({ href: "/", locale });
  const cta = { href: `${home}#contact`, label: t("cta") };

  return (
    <header className="site-header fixed inset-x-0 top-0 z-50 text-fg">
      <div className="container-page flex h-(--header-h) items-center gap-8">
        <a href={`${home}#top`} className="shrink-0">
          <Lockup className="h-7.5 w-auto" label={useTranslations("common")("home")} />
        </a>
        <nav aria-label={t("label")} className="ml-auto hidden lg:block">
          <ul className="flex gap-9 text-body-sm">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  data-nav={l.chapter}
                  className="nav-link relative inline-flex min-h-11 items-center text-fg-muted transition-colors hover:text-fg after:absolute after:bottom-1.5 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-emit after:opacity-0"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-5 lg:ml-0">
          <ul aria-label={t("language")} className="flex items-center text-body-sm">
            {routing.locales.map((l, i) => (
              <li key={l} className={i ? "border-l border-line-strong" : ""}>
                <a
                  href={getPathname({ href: page, locale: l })}
                  hrefLang={l}
                  lang={l}
                  aria-label={l === "en" ? t("en") : t("pt")}
                  aria-current={l === locale ? "true" : undefined}
                  className={`grid h-11 place-items-center px-2.5 ${l === locale ? "text-fg" : "text-fg-muted hover:text-fg"}`}
                >
                  {l === "en" ? "EN" : "PT"}
                </a>
              </li>
            ))}
          </ul>
          <ButtonLink href={cta.href} size="sm" className="max-lg:hidden">
            {cta.label}
          </ButtonLink>
          <MobileMenu links={links} cta={cta} labels={{ open: t("openMenu"), close: t("closeMenu"), nav: t("label"), calm: useTranslations("footer")("calm") }} />
        </div>
      </div>
      <span aria-hidden className="page-progress absolute inset-x-0 bottom-0 h-px bg-accent" />
    </header>
  );
}

export function SiteFooter() {
  const t = useTranslations();
  const locale = useLocale();
  const links = useSectionLinks();
  const wa = whatsappHref(locale);
  const socials = Object.entries(site.socials).filter(([, url]) => isSet(url));
  const contact = [
    isSet(site.email) && { href: `mailto:${site.email}`, label: site.email, external: false },
    wa && { href: wa, label: "WhatsApp", external: true },
  ].filter(Boolean) as { href: string; label: string; external: boolean }[];
  // Legal line: missing values are not rendered (SPEC C9)
  const legal = [isSet(site.cnpj) && `CNPJ ${site.cnpj}`, isSet(site.city) && isSet(site.uf) && `${site.city} – ${site.uf}`].filter(
    (v): v is string => !!v,
  );
  const col = "flex flex-col gap-3 text-body-sm";
  const heading = "hud mb-2";

  return (
    <footer data-theme="dark" className="site-footer border-t border-line bg-panel">
      <div className="container-content flex flex-col gap-14 py-16">
        <Lockup className="h-auto w-full" />
        <div className="grid gap-12 lg:grid-cols-12">
          <p className="font-serif text-display-md font-light italic lg:col-span-6">{t("footer.tagline")}</p>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-6">
            <nav aria-label={t("footer.site")} className={col}>
              <h2 className={heading}>{t("footer.site")}</h2>
              {links.map((l) => (
                <a key={l.href} href={l.href} className="text-fg-muted hover:text-fg">{l.label}</a>
              ))}
            </nav>
            {contact.length > 0 && (
              <div className={col}>
                <h2 className={heading}>{t("footer.contact")}</h2>
                {contact.map((c) => (
                  <a key={c.href} href={c.href} {...(c.external ? { target: "_blank", rel: "noopener" } : {})} className="text-fg-muted hover:text-fg">
                    {c.label}
                    {c.external && <span className="sr-only"> {t("common.newTab")}</span>}
                  </a>
                ))}
              </div>
            )}
            {socials.length > 0 && (
              <div className={col}>
                <h2 className={heading}>{t("footer.social")}</h2>
                {socials.map(([name, url]) => (
                  <a key={name} href={url} target="_blank" rel="noopener" className="text-fg-muted hover:text-fg">
                    {name} <span className="sr-only">{t("common.newTab")}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-6 border-t border-line pt-8">
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-caption text-fg-subtle">
            <span>© {new Date().getFullYear()} {isSet(site.legalName) ? site.legalName : site.name}</span>
            {legal.map((v) => <span key={v}>{v}</span>)}
            <a href={getPathname({ href: "/privacidade", locale })} className="link">{t("footer.privacy")}</a>
          </p>
          <div className="flex items-center gap-6">
            <Clock />
            <CalmToggle label={t("footer.calm")} />
            <a href={`${getPathname({ href: "/", locale })}#top`} aria-label={t("footer.top")} className="grid size-12 place-items-center rounded-full border border-line-strong hover:bg-fg/8">
              <ArrowUp size={20} strokeWidth={1.5} aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
