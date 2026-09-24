import { MessageCircle } from "lucide-react";
import { site } from "@/content/site";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { whatsappHref } from "@/lib/whatsapp";
import { button } from "@/lib/ui";
import { ConnectorDiagram, PillarGlyph, Symbol } from "@/components/brand";
import { AccordionItem, CopyButton } from "@/components/interactive";
import { ContactForm } from "@/components/contact-form";

function SectionHeader({ id, title, lead }: { id: string; title: string; lead: string }) {
  return (
    <>
      <h2 id={id} className="text-heading-lg">{title}</h2>
      <p className="mt-4 max-w-[56ch] text-body-lg text-fg-muted">{lead}</p>
    </>
  );
}

// Plain copy is read from the typed messages object; strings with placeholders or markup go through t().

export function Hero() {
  const t = useMessages();
  const wa = whatsappHref(useLocale());
  return (
    <section id="top" data-theme="dark" aria-labelledby="hero-title" className="overflow-hidden">
      <div className="container-page grid min-h-[calc(min(100svh,56rem)-4rem)] items-center gap-10 py-12 lg:min-h-[calc(min(100svh,56rem)-4.5rem)] lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <h1 id="hero-title" className="text-display-lg">{t.hero.h1}</h1>
          <p className="mt-6 max-w-[56ch] text-body-lg text-fg-muted">{t.hero.lead}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#contact" className={button("primary", "lg")}>{t.hero.cta}</a>
            {wa ? (
              <a href={wa} target="_blank" rel="noopener" className={button("secondary", "lg")}>
                <MessageCircle size={20} strokeWidth={1.5} aria-hidden />
                {t.hero.whatsapp}
                <span className="sr-only">{t.common.newTab}</span>
              </a>
            ) : (
              <a href="#services" className={button("secondary", "lg")}>{t.hero.seeServices}</a>
            )}
          </div>
          <p className="mt-4 text-body-sm text-fg-subtle">{t.hero.note}</p>
        </div>
        <div className="relative grid place-items-center lg:col-span-5">
          <div aria-hidden className="iso-grid absolute inset-[-20%] text-fg" />
          <Symbol label={t.common.symbol} className="relative h-45 w-auto lg:h-[28rem]" sizes="(min-width: 1024px) 277px, 112px" eager />
        </div>
      </div>
    </section>
  );
}

export function About() {
  const t = useMessages().about;
  const rich = useTranslations("about");
  return (
    <section data-theme="light" data-surface="subtle" aria-labelledby="about-title" id="about" className="section">
      <div className="container-content grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8">
          <h2 id="about-title" className="sr-only">{t.h2}</h2>
          <p className="max-w-[30ch] font-display text-heading-md font-semibold">
            {rich.rich("statement", { g: (word) => <i lang="grc-Latn">{word}</i> })}
          </p>
          <p className="mt-6 max-w-[56ch] text-body-lg text-fg-muted">{t.followUp}</p>
        </div>
        <div className="lg:col-span-4 lg:self-center">
          <ConnectorDiagram title={t.diagramTitle} labels={t.diagram} />
        </div>
      </div>
    </section>
  );
}

export function Services() {
  const t = useMessages().services;
  return (
    <section id="services" data-theme="light" aria-labelledby="services-title" className="section">
      <div className="container-content grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:sticky lg:top-30 lg:col-span-4 lg:self-start">
          <SectionHeader id="services-title" title={t.h2} lead={t.lead} />
        </div>
        {/* ponytail: thread drawn statically; scroll-linked fill is M4 (SPEC 9.2) */}
        <ol className="relative flex flex-col gap-16 lg:col-span-7 lg:col-start-6">
          <span aria-hidden className="absolute top-2 bottom-2 left-[7px] w-0.5 bg-line" />
          {Object.values(t.pillars).map((p, i) => (
            <li key={p.title} className="relative pl-12">
              <span aria-hidden className="absolute top-1.5 left-0 size-4 rounded-full border-2 border-line-input bg-surface" />
              <div className="flex items-center gap-3 text-accent">
                <span className="font-display text-body-sm font-medium text-fg-subtle tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <PillarGlyph index={i} />
              </div>
              <h3 className="mt-3 text-heading-md">{p.title}</h3>
              <p className="mt-3 text-body-lg text-fg-muted">{p.description}</p>
              <ul className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {p.items.map((s) => (
                  <li key={s} className="flex items-baseline gap-3">
                    <span aria-hidden className="size-1.5 shrink-0 translate-y-[-0.15em] rounded-full bg-line-input" />
                    {s}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function HowWeWork() {
  const t = useMessages().how;
  return (
    <section id="how-we-work" data-theme="dark" data-surface="subtle" aria-labelledby="how-title" className="section">
      <div className="container-content">
        <div className="max-w-3xl">
          <SectionHeader id="how-title" title={t.h2} lead={t.lead} />
        </div>
        <ul className="mt-12 grid divide-y divide-line border-y border-line lg:mt-16 lg:grid-cols-3 lg:divide-x lg:divide-y-0 lg:border-y-0">
          {Object.values(t.models).map((m) => (
            <li key={m.title} className="py-8 lg:px-8 lg:py-0 lg:first:pl-0 lg:last:pr-0">
              <h3 className="text-heading-sm">{m.title}</h3>
              <p className="mt-3 text-fg-muted">{m.body}</p>
              <p className="mt-4 text-body-sm text-fg-subtle">{m.bestFor}</p>
            </li>
          ))}
        </ul>
        <h3 className="mt-16 text-heading-sm lg:mt-24">{t.commitmentsTitle}</h3>
        <dl className="mt-8 grid gap-8 md:grid-cols-2">
          {Object.values(t.commitments).map((c) => (
            <div key={c.title}>
              <dt><strong className="font-semibold">{c.title}</strong></dt>
              <dd className="mt-2 text-fg-muted">{c.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function Faq() {
  const t = useMessages().faq;
  const rich = useTranslations("faq");
  return (
    <section id="faq" data-theme="light" aria-labelledby="faq-title" className="section">
      <div className="container-content grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:sticky lg:top-30 lg:col-span-4 lg:self-start">
          <SectionHeader id="faq-title" title={t.h2} lead={t.lead} />
          <p className="mt-6 text-fg-muted">
            {rich.rich("fallback", {
              email: site.email,
              mail: (email) => <a href={`mailto:${site.email}`} className="link">{email}</a>,
            })}
          </p>
        </div>
        <div className="border-t border-line lg:col-span-7 lg:col-start-6">
          {Object.entries(t.items).map(([id, f]) => (
            <AccordionItem key={id} id={id} question={f.q}>
              <p>{f.a}</p>
            </AccordionItem>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  const m = useMessages();
  const t = m.contact;
  const tf = useTranslations("contact");
  const wa = whatsappHref(useLocale());
  return (
    <section id="contact" data-theme="dark" aria-labelledby="contact-title" className="section">
      <div className="container-content grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <h2 id="contact-title" className="text-display-md">{t.h2}</h2>
          <p className="mt-6 max-w-[56ch] text-body-lg text-fg-muted">{t.lead}</p>

          <dl className="mt-10 flex flex-col gap-5">
            <div>
              <dt className="text-body-sm text-fg-subtle">{t.email}</dt>
              <dd className="flex flex-wrap items-center gap-x-3">
                <a href={`mailto:${site.email}`} className="link" data-copy-source>{site.email}</a>
                <CopyButton text={site.email} label={t.copy} done={t.copied} />
              </dd>
            </div>
            {wa && (
              <div>
                <dt className="text-body-sm text-fg-subtle">{t.whatsapp}</dt>
                <dd>
                  <a href={wa} target="_blank" rel="noopener" className="link">
                    {t.whatsappCta}<span className="sr-only"> {m.common.newTab}</span>
                  </a>
                  <p className="text-body-sm text-fg-muted">{t.whatsappNote}</p>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-body-sm text-fg-subtle">{t.hours}</dt>
              <dd>{tf("hoursValue", { hours: site.hours })}</dd>
            </div>
          </dl>

          <h3 className="mt-12 text-heading-sm">{t.nextTitle}</h3>
          <ol className="mt-6 flex flex-col gap-4">
            {t.next.map((step, i) => (
              <li key={step} className="flex gap-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line-input text-body-sm tabular-nums">{i + 1}</span>
                <span className="text-fg-muted">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-md border border-line bg-surface-raised p-6 sm:p-8 lg:col-span-6 lg:col-start-7">
          <ContactForm email={site.email} />
        </div>
      </div>
    </section>
  );
}
