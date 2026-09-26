import { ArrowUpRight } from "lucide-react";
import { useLocale, useMessages } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import { OFFER_HREF, OFFER_NEED, SERVICES, type OfferKey } from "@/content/offers";
import { SiteHeader } from "@/components/layout/chrome";
import { ButtonLink } from "@/components/ui/button";
import { Contact } from "@/components/chapters";

// Offer page (solutions and services): problem → what we deliver → how it connects → lifecycle → contact.
// Business language first; technical terms come after, in the `tech` line of each group.
export function OfferPage({ kind }: { kind: OfferKey }) {
  const m = useMessages();
  const o = m.offers[kind];
  const c = m.offerCommon;
  const locale = useLocale();
  const home = getPathname({ href: "/", locale });
  const href = (k: OfferKey) => getPathname({ href: OFFER_HREF[k], locale });
  const service = (SERVICES as readonly string[]).includes(kind);
  const h2 = "font-serif text-heading-lg font-light";

  return (
    <>
      <SiteHeader page={OFFER_HREF[kind]} />
      <main id="main" tabIndex={-1} className="relative z-10">
        <section data-chapter={kind} aria-labelledby="offer-title">
          <div className="container-content pt-[calc(var(--header-h)+clamp(3.5rem,1.5rem+8vw,9rem))] pb-(--space-section)">
            <div data-field-safe className="max-w-4xl">
              <p className="hud">
                <a href={`${home}#${service ? "catalog" : "services"}`} className="link">{service ? c.services : c.solutions}</a>
                <span aria-hidden> / </span>
                {o.name}
              </p>
              <h1 id="offer-title" tabIndex={-1} className="mt-6 font-serif text-display-lg font-light">{o.h1}</h1>
              <p className="mt-8 max-w-[56ch] text-body-lg text-fg-muted">{o.lead}</p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="#contact" data-cta={kind}>{o.cta}</ButtonLink>
                <ButtonLink href="#deliver" variant="secondary">{c.secondary}</ButtonLink>
              </div>
            </div>
          </div>

          <div className="container-content pb-(--space-section)">
            <h2 data-field-safe className={h2}>{o.sections.problems}</h2>
            <ul className="mt-10">
              {o.problems.map((p) => (
                <li key={p.q} data-field-safe className="grid gap-4 border-t border-line py-8 lg:grid-cols-12 lg:gap-8">
                  <h3 className="font-serif text-heading-md font-light lg:col-span-5">“{p.q}”</h3>
                  <p className="text-body-lg text-fg-muted lg:col-span-6 lg:col-start-7">{p.a}</p>
                </li>
              ))}
            </ul>
          </div>

          <div id="deliver" className="container-content pb-(--space-section)">
            <h2 data-field-safe className={h2}>{o.sections.deliver}</h2>
            <div className="mt-10 grid gap-px border border-line bg-line lg:grid-cols-3">
              {o.deliver.map((d) => (
                <div key={d.title} className="flex flex-col gap-4 bg-surface p-8">
                  <h3 className="font-serif text-heading-sm font-light">{d.title}</h3>
                  <p className="text-fg-muted">{d.body}</p>
                  {d.items.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-2 text-body-sm">
                      {(d.items as string[]).map((i) => (
                        <li key={i} className="flex items-baseline gap-3">
                          <span aria-hidden className="size-1.5 shrink-0 translate-y-[-0.15em] rounded-full bg-emit" />
                          {i}
                        </li>
                      ))}
                    </ul>
                  )}
                  {d.tech && <p className="mt-auto pt-4 text-caption text-fg-subtle">{d.tech}</p>}
                </div>
              ))}
            </div>
            {o.principle && (
              <p data-field-safe className="mt-12 max-w-[60ch] border-l-2 border-accent pl-6 font-serif text-heading-sm font-light">{o.principle}</p>
            )}
          </div>

          <div className="container-content pb-(--space-section)">
            <h2 data-field-safe className={h2}>{o.sections.connects}</h2>
            <ul className={`mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 ${o.connects.length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
              {o.connects.map((x) => {
                const to = x.to as OfferKey;
                return (
                  <li key={to} className="bg-surface">
                    <a href={href(to)} className="group flex h-full flex-col gap-4 p-8 transition-colors hover:bg-fg/4">
                      <span className="flex items-start justify-between gap-4 font-serif text-heading-sm font-light">
                        {m.offers[to].name}
                        <ArrowUpRight size={20} strokeWidth={1.5} aria-hidden className="mt-1 shrink-0 text-accent" />
                      </span>
                      <span className="text-body-sm text-fg-muted">{x.text}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="container-content pb-(--space-section)">
            <h2 data-field-safe className={h2}>{c.lifecycle.h2}</h2>
            <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {c.lifecycle.steps.map((s, i) => (
                <li key={s.t} data-field-safe className="border-t border-line pt-6">
                  <span aria-hidden className="font-serif text-heading-lg font-extralight text-accent tabular-nums">{i + 1}</span>
                  <h3 className="mt-3 text-body-lg font-medium">{s.t}</h3>
                  <p className="mt-2 text-body-sm text-fg-muted">{s.d}</p>
                </li>
              ))}
            </ol>
            {kind !== "support" && (
              <p className="mt-10">
                <a href={href("support")} className="link inline-flex min-h-11 items-center text-body-lg">{c.lifecycle.link}</a>
              </p>
            )}
          </div>
        </section>
        <Contact need={OFFER_NEED[kind]} />
      </main>
    </>
  );
}
