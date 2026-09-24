import type { Metadata } from "next";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { site } from "@/content/site";
import { alternates } from "@/lib/seo";
import { SiteHeader } from "@/components/shell";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacidade">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return { title: t("title"), description: t("description"), alternates: alternates("/privacidade", locale) };
}

// Must be reviewed by a lawyer before launch (SPEC 7.1)
export default async function Privacy({ params }: PageProps<"/[locale]/privacidade">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");
  const { privacy } = await getMessages();
  const vars = {
    legalName: site.legalName,
    cnpj: site.cnpj,
    cityUf: `${site.city} – ${site.uf}`,
    email: site.email,
    retention: site.privacy.retention,
    dpo: site.privacy.dpo,
  };
  const ids = Object.keys(privacy.sections) as (keyof typeof privacy.sections)[];

  return (
    <>
      <SiteHeader page="/privacidade" />
      <main id="main" tabIndex={-1} data-theme="light" className="section">
        <article className="container-content">
          <div className="max-w-[68ch]">
            <h1 className="text-heading-lg">{t("title")}</h1>
            <p className="mt-4 text-body-sm text-fg-subtle">{t("updated", { date: site.privacy.updated })}</p>
            <nav aria-labelledby="toc-title" className="mt-10 border-y border-line py-6">
              <h2 id="toc-title" className="font-sans text-body-sm font-semibold">{t("toc")}</h2>
              <ol className="mt-3 flex flex-col gap-2 text-body-sm">
                {ids.map((id) => (
                  <li key={id}><a href={`#${id}`} className="link">{t(`sections.${id}.title`)}</a></li>
                ))}
              </ol>
            </nav>
            {ids.map((id) => (
              <section key={id} aria-labelledby={id} className="mt-10">
                <h2 id={id} className="text-heading-sm">{t(`sections.${id}.title`)}</h2>
                <p className="mt-3 text-fg-muted">{t(`sections.${id}.body`, vars)}</p>
              </section>
            ))}
          </div>
        </article>
      </main>
    </>
  );
}
