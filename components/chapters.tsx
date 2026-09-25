import type { CSSProperties, ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { isSet, site } from "@/content/site";
import { whatsappHref } from "@/lib/whatsapp";
import { Mark } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { AccordionItem, CopyButton } from "@/components/ui/interactive";
import { ContactForm } from "@/components/contact-form";

// Chapters (SPEC 6). Plain copy comes from the typed messages object; strings with placeholders go through t().
// Scroll choreography is CSS reading --p, which components/scene/engine.tsx writes on each [data-chapter].

const pin = (token: string) => ({ "--pin": `var(${token})` }) as CSSProperties;

/** Visually hidden until focused: jumps past a pinned chapter (Design System 13). */
function SkipChapter({ to }: { to: string }) {
  const t = useTranslations("common");
  return (
    <a href={`#${to}`} className="sr-only z-60 focus:not-sr-only focus:absolute focus:top-(--header-h) focus:left-4 focus:bg-panel focus:px-4 focus:py-3">
      {t("skipChapter")}
    </a>
  );
}

/** Chapter title with a line-mask entrance (scroll-timeline CSS where supported; static otherwise).
 *  Font caps at 18cqi so a ~10-char word (e.g. pt "frequentes") fits its column instead of being clipped. */
function Title({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  return (
    <h2 id={id} tabIndex={-1} className={`@container mask-in block overflow-clip font-serif font-light ${className}`}>
      <span className="block text-[length:min(1em,18cqi)]">{children}</span>
    </h2>
  );
}

export function Hero() {
  const t = useMessages();
  const wa = whatsappHref(useLocale());
  return (
    <section id="top" data-chapter="hero" data-pin style={pin("--pin-hero")} aria-labelledby="hero-title">
      <SkipChapter to="about" />
      {/* Phones: text on top, symbol assembles in the lower part of the stage (SPEC 7.2) */}
      <div data-stage className="flex flex-col lg:flex-row lg:items-center">
        <div className="container-page relative z-10 pt-[calc(var(--header-h)+1.5rem)] lg:pt-(--header-h) lg:pb-20">
          <div data-field-safe className="max-w-4xl">
            {/* ponytail: display-xl capped at 8.2vw so the serif line stays on one line beside the field zone */}
            <h1 id="hero-title" tabIndex={-1} className="text-[min(var(--text-display-xl),max(3.25rem,8.2vw))] leading-[0.9]">
              <span className="hero-line-1 block font-sans font-light tracking-[-0.04em] uppercase">{t.hero.h1a}</span>{" "}
              <span className="hero-line-2 block font-serif font-light tracking-[-0.02em] italic">{t.hero.h1b}</span>
            </h1>
            <p className="mt-8 max-w-[44ch] text-body-lg text-fg-muted">{t.hero.lead}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#contact">{t.hero.cta}</ButtonLink>
              {wa ? (
                <ButtonLink href={wa} variant="secondary" external>
                  <MessageCircle size={18} strokeWidth={1.5} aria-hidden />
                  {t.hero.whatsapp}
                  <span className="sr-only">{t.common.newTab}</span>
                </ButtonLink>
              ) : (
                <ButtonLink href="#services" variant="secondary">{t.hero.seeMoves}</ButtonLink>
              )}
            </div>
            <p className="mt-5 text-body-sm text-fg-subtle">{t.hero.note}</p>
          </div>
        </div>
        {/* The crisp vector symbol, laid over the particle one at 60–70% of the pin; always shown without the field */}
        <Mark label={t.common.symbol} className="hero-symbol pointer-events-none w-auto" />
        <div className="scroll-cue absolute bottom-8 left-(--space-gutter) lg:bottom-16 flex items-center gap-4 text-body-sm text-fg-muted [html[data-calm]_&]:hidden [html[data-static]_&]:hidden">
          <span aria-hidden className="scroll-line relative h-10 w-px overflow-clip bg-line-strong" />
          {t.hero.scrollCue}
        </div>
        {/* On desktop the HUD shows ORDEM bottom-right; this copy serves smaller screens */}
        <p data-order aria-hidden className="hud absolute right-(--space-gutter) bottom-8 text-accent lg:hidden [html[data-calm]_&]:hidden [html[data-static]_&]:hidden">
          {t.hud.order} 000%
        </p>
      </div>
    </section>
  );
}

/** Splits the statement into word spans (server-rendered, so no layout shift and readable without JS). */
function Words({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <p data-words style={{ "--n": words.length } as CSSProperties} className="max-w-[24ch] font-serif text-display-md font-light">
      {words.map((w, i) => {
        const greek = w.match(/^<g>(.+)<\/g>(.*)$/);
        return (
          <span key={i}>
            <span className="word" style={{ "--i": i } as CSSProperties}>
              {greek ? (
                <>
                  <i lang="grc-Latn">{greek[1]}</i>
                  {greek[2]}
                </>
              ) : (
                w
              )}
            </span>{" "}
          </span>
        );
      })}
    </p>
  );
}

export function Manifesto() {
  const t = useMessages().about;
  return (
    <section id="about" data-chapter="about" data-pin style={pin("--pin-manifesto")} aria-labelledby="about-title">
      <SkipChapter to="services" />
      <div data-stage className="flex items-center">
        <div className="container-page relative z-10">
          <div data-field-safe className="max-w-5xl">
            <h2 id="about-title" tabIndex={-1} className="sr-only">{t.h2}</h2>
            <Words text={t.statement} />
            <p className="fade-late mt-10 max-w-[56ch] text-body-lg text-fg-muted">{t.followUp}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Pillars() {
  const m = useMessages();
  const t = m.services;
  const tf = useTranslations("services");
  const pillars = Object.values(t.pillars);
  return (
    <section id="services" data-chapter="services" data-pin style={pin("--pin-pillars")} aria-labelledby="services-title">
      <SkipChapter to="how-we-work" />
      <div data-stage className="pillars-stage flex flex-col" data-pillar="0">
        <div className="container-page relative z-10 flex flex-1 flex-col pt-[calc(var(--header-h)+2rem)] pb-32 max-md:max-h-[58lvh] max-md:pb-6">
          <div data-field-safe className="max-w-xl">
            <Title id="services-title" className="text-heading-lg">{t.h2}</Title>
            {/* Odometer: the second digit is a 0–9 column moved by --d */}
            {/* ponytail: numeral-xl capped at 22lvh so title, numeral and pillar text fit one 100lvh stage */}
            <div aria-hidden className="odometer mt-4 flex h-[1em] items-start overflow-clip font-serif text-[min(var(--text-numeral-xl),22lvh)] leading-none font-extralight tabular-nums max-md:hidden [html[data-calm]_&]:hidden [html[data-static]_&]:hidden [html:not(.js)_&]:hidden">
              <span className="h-[1em]">0</span>
              <span className="odometer-col flex shrink-0 flex-col">
                {Array.from({ length: 10 }, (_, d) => <span key={d} className="h-[1em] shrink-0">{d}</span>)}
              </span>
            </div>
            <div className="mt-4 grid gap-16">
              <p className="pillars-lead max-w-[48ch] text-body-lg text-fg-muted">{t.lead}</p>
              <ol className="contents">
                {pillars.map((p, i) => (
                  <li key={p.title} className="pillar flex flex-col gap-3">
                    <span className="sr-only">{tf("stepOf", { n: i + 1 })}</span>
                    <span aria-hidden className="hud text-accent">{String(i + 1).padStart(2, "0")} / 04</span>
                    <h3 className="font-serif text-display-md font-light">{p.title}</h3>
                    <p className="text-body-lg text-fg-muted">{p.description}</p>
                    <ul className="mt-2 grid gap-x-8 gap-y-2 text-body-sm sm:grid-cols-2">
                      {p.items.map((s) => (
                        <li key={s} className="flex items-baseline gap-3">
                          <span aria-hidden className="size-1.5 shrink-0 translate-y-[-0.15em] rounded-full bg-emit" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
        {/* Rail: one segment per pillar, filled by --f0…--f3 */}
        <div aria-hidden className="container-page absolute inset-x-0 bottom-16 z-10 grid grid-cols-4 gap-3 max-md:hidden [html[data-calm]_&]:hidden [html[data-static]_&]:hidden">
          {pillars.map((p, i) => (
            <div key={p.title} className="flex flex-col gap-2">
              <span className="relative h-px bg-line-strong">
                <span className="rail-fill absolute inset-0 bg-accent" style={{ "--f": `var(--f${i}, 0)` } as CSSProperties} />
              </span>
              <span className="hud">{p.title}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowWeWork() {
  const t = useMessages().how;
  const models = Object.values(t.models);
  return (
    <section id="how-we-work" data-chapter="how" aria-labelledby="how-title" className="section relative z-10">
      <div className="container-content">
        <div data-field-safe className="max-w-4xl">
          <Title id="how-title" className="text-display-lg">{t.h2}</Title>
          <p className="mt-6 max-w-[56ch] text-body-lg text-fg-muted">{t.lead}</p>
        </div>
        <ul className="mt-16 flex flex-col gap-6">
          {models.map((m, i) => (
            <li
              key={m.title}
              data-theme="paper"
              className="stack-card sticky flex min-h-[60lvh] flex-col justify-between gap-10 rounded-md p-8 shadow-sheet sm:p-12 lg:min-h-[72lvh] lg:p-16"
              style={{ top: `calc(var(--header-h) + ${i * 24}px)` }}
            >
              <span aria-hidden className="hud">{String(i + 1).padStart(2, "0")} / {String(models.length).padStart(2, "0")}</span>
              <div className="max-w-3xl">
                <h3 className="font-serif text-display-md font-light">{m.title}</h3>
                <p className="mt-6 text-body-lg text-fg-muted">{m.body}</p>
              </div>
              <p className="text-body-sm text-fg-subtle">
                {t.bestForLabel}: <span className="text-fg">{m.bestFor}</span>
              </p>
            </li>
          ))}
        </ul>
        <h3 className="mt-(--space-section) font-serif text-heading-lg font-light">{t.commitmentsTitle}</h3>
        <div className="mt-10">
          {Object.values(t.commitments).map((c) => (
            <div key={c.title} data-field-safe className="group relative grid gap-4 border-t border-line py-10 lg:grid-cols-12 lg:gap-8">
              <span aria-hidden className="absolute inset-x-0 -top-px h-px origin-left scale-x-0 bg-accent transition-transform duration-700 ease-out-expo group-hover:scale-x-100" />
              <h4 className="font-serif text-heading-md font-light lg:col-span-5">{c.title}</h4>
              <p className="text-body-lg text-fg-muted lg:col-span-6 lg:col-start-7">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const t = useMessages().faq;
  const rich = useTranslations("faq");
  return (
    <section id="faq" data-chapter="faq" aria-labelledby="faq-title" className="section relative z-10">
      <div className="container-content grid gap-14 lg:grid-cols-12 lg:gap-8">
        <div data-field-safe className="lg:sticky lg:top-[calc(var(--header-h)+3rem)] lg:col-span-4 lg:self-start">
          <Title id="faq-title" className="text-display-lg">{t.h2}</Title>
          <p className="mt-6 text-body-lg text-fg-muted">{t.lead}</p>
          {isSet(site.email) && (
            <p className="mt-6 text-fg-muted">
              {rich.rich("fallback", {
                email: site.email,
                mail: (email) => <a href={`mailto:${site.email}`} className="link">{email}</a>,
              })}
            </p>
          )}
        </div>
        <div data-field-safe className="border-t border-line lg:col-span-7 lg:col-start-6">
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
  const hasChannels = isSet(site.email) || !!wa || isSet(site.hours);
  return (
    <section id="contact" data-chapter="contact" aria-labelledby="contact-title" className="section relative z-10">
      <div className="container-content grid gap-14 lg:grid-cols-12 lg:gap-8">
        <div data-field-safe className="lg:col-span-5">
          <Title id="contact-title" className="text-display-lg">{t.h2}</Title>
          <p className="mt-8 max-w-[44ch] text-body-lg text-fg-muted">{t.lead}</p>

          {/* Channels render only when configured (AC-CONT-05) */}
          {hasChannels && (
            <dl className="mt-12 flex flex-col gap-6">
              {isSet(site.email) && (
                <div>
                  <dt className="hud">{t.email}</dt>
                  <dd className="mt-1 flex flex-wrap items-center gap-x-4">
                    <a href={`mailto:${site.email}`} className="link text-body-lg" data-copy-source>{site.email}</a>
                    <CopyButton text={site.email} label={t.copy} done={t.copied} />
                  </dd>
                </div>
              )}
              {wa && (
                <div>
                  <dt className="hud">{t.whatsapp}</dt>
                  <dd className="mt-1">
                    <a href={wa} target="_blank" rel="noopener" className="link text-body-lg">
                      {t.whatsappCta}
                      <span className="sr-only"> {m.common.newTab}</span>
                    </a>
                    <p className="text-body-sm text-fg-muted">{t.whatsappNote}</p>
                  </dd>
                </div>
              )}
              {isSet(site.hours) && (
                <div>
                  <dt className="hud">{t.hours}</dt>
                  <dd className="mt-1">{tf("hoursValue", { hours: site.hours })}</dd>
                </div>
              )}
            </dl>
          )}

          <h3 className="mt-14 font-serif text-heading-md font-light">{t.nextTitle}</h3>
          <ol className="mt-6 flex flex-col gap-5">
            {t.next.map((step, i) => (
              <li key={step} className="flex items-baseline gap-5">
                <span aria-hidden className="w-8 shrink-0 font-serif text-heading-lg font-extralight text-accent tabular-nums">{i + 1}</span>
                <span className="text-fg-muted">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div data-converge className="glass self-start p-8 sm:p-12 lg:col-span-6 lg:col-start-7">
          <ContactForm email={isSet(site.email) ? site.email : ""} />
        </div>
      </div>
    </section>
  );
}
