# Systagma — Landing Page SPEC

| | |
|---|---|
| Version | 1.0 (draft for build) |
| Date | September 2026 |
| Depends on | `Brand-Guideline.md` v1.0, `Design-system.md` v1.0 |
| Stack | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Motion 13 · Anime.js 4 |
| Primary locale | Portuguese (Brazil), with English as a second locale **[CONFIRM EN at launch]** |

This document is the single brief for building Systagma's first website: a one-page landing site plus a privacy page and a 404. It is written so a developer (human or coding agent) can build it without guessing, and so a reviewer can check the result against numbered acceptance criteria.

### Placeholders

Values in `{{DOUBLE_BRACES}}` must be supplied before launch. None of them should be invented during the build.

| Placeholder | Meaning | Example format |
|---|---|---|
| `{{SITE_URL}}` | Production domain | `https://systagma.com.br` |
| `{{CONTACT_EMAIL}}` | Public contact inbox | `contato@…` |
| `{{WHATSAPP_NUMBER}}` | WhatsApp Business number, digits only with country code | `55XXXXXXXXXXX` |
| `{{LEGAL_NAME}}` / `{{CNPJ}}` | Company legal name and tax ID | `Systagma Tecnologia Ltda.` / `00.000.000/0000-00` |
| `{{CITY_UF}}` | City and state shown in the footer | `Cidade – UF` |
| `{{HOURS}}` | Business hours | `Segunda a sexta, 9h–18h` |
| `{{SOCIAL_*}}` | LinkedIn, GitHub, Instagram URLs | full URLs |

---

## 1. Summary

### 1.1 Goal

Turn visitors who need custom software into qualified conversations. The page must explain in under a minute what Systagma does, how it works, and how to start, and it must scale as portfolio products are added.

### 1.2 Audiences

| Audience | What they need to see | Where the page answers it |
|---|---|---|
| Founders and business owners with an idea or a problem | That they don't need a finished spec; what a first step costs | Hero, How we work (Discovery sprint), FAQ |
| CTOs and tech leads at established companies | Integration, data and ownership competence; engineering discipline | Services (Connect, Analyze), commitments, FAQ on code ownership |
| Partners and future product users | What Systagma has built and is building | Portfolio |

### 1.3 Conversions and success metrics

| Conversion | Type | Target (first 90 days) |
|---|---|---|
| Contact form sent | Primary | ≥ 2% of unique visitors reach the form; ≥ 35% of those who start it send it |
| WhatsApp click (when enabled) | Secondary | Tracked, no target until baseline exists |
| Email click or copy | Secondary | Tracked |
| Core Web Vitals (p75, mobile) | Quality | LCP ≤ 2.0 s, INP ≤ 150 ms, CLS ≤ 0.05 |

### 1.4 What the reference sites taught this spec

| Pattern | Seen in | Applied here |
|---|---|---|
| Named method with one-line definitions | weevolveit.com | Services organized as the four pillars (Build, Connect, Analyze, Transform) with one sentence each (S3) |
| Statement section after the hero | axiom-power | "About the name" statement (S2) |
| Plain commitments instead of adjectives | axiom-power | Four commitments in How we work (S5) |
| FAQ that answers buyer fears (ownership, cost, post-launch) | wama.com.br | Nine questions in S7 |
| Form that qualifies by service and budget | wama.com.br | Needs chips and budget chips in the contact form (S8) |
| WhatsApp click-to-chat with a prefilled message | weevolveit.com | Feature-flagged WhatsApp buttons (S8, floating button) |
| Organization JSON-LD with a sales contact point | weevolveit.com | Section 10.3 |
| Alternating dark and light bands to pace a long page | finseo.ai | Surface rhythm (Design System 6.4) |
| Avoided: scroll hijacking, split-text everywhere, duplicated marquee content, very heavy pages | axiom, weevolveit, wama | Native scroll, one orchestrated animation, no marquees, strict JS budget |

---

## 2. Scope

| In scope (v1) | Out of scope (later phases) |
|---|---|
| One-page landing site in PT-BR and EN | Blog / insights (planned: phase 2, for SEO) |
| Contact form with email delivery and auto-reply | Individual case study pages `/portfolio/[slug]` (phase 2) |
| WhatsApp click-to-chat, behind a feature flag | CMS integration (content lives in the repo for v1) |
| Privacy policy page, 404 page | Careers page |
| SEO metadata, Open Graph images, JSON-LD, sitemap, robots | Live chat widget, chatbot |
| Cookieless analytics and event tracking | Cookie consent banner (not needed if analytics stays cookieless) |
| Hero symbol animation, pillars scroll thread, micro-interactions | Site-wide dark mode toggle (sections are already themed) |

---

## 3. Tech stack

| Concern | Choice | Version guidance | Notes |
|---|---|---|---|
| Framework | **Next.js**, App Router | 16.3.x. Start on the latest 16.3 patch and upgrade to **16.3.7** when it ships (scheduled security release, 30 Sep 2026). | Turbopack is the default bundler. Next 16 renames `middleware.ts` to `proxy.ts` and removes the `next lint` command. |
| UI runtime | React | 19.x, as required by Next 16 | Server Components by default |
| Language | TypeScript | 5.x, `strict: true` | |
| Runtime | Node.js | 20.9 or newer (22 LTS recommended) | |
| Styling | Tailwind CSS | 4.x | CSS-first config in `globals.css` (Design System 12.1) |
| Motion (React) | `motion` | 13.x, imported from `motion/react` and `motion/react-m` | Use `LazyMotion` + `domAnimation`; wrap in `MotionConfig reducedMotion="user"` |
| Motion (SVG timeline) | `animejs` | 4.x | Dynamic import in the hero and 404 only |
| i18n | `next-intl` | 4.x (confirm Next 16 support at install) | Locale routing in `proxy.ts` |
| Validation | `zod` | 4.x | Shared schema for client hints and server validation |
| Email sending | Resend + React Email | current | Any SMTP provider works; keep the sender behind `lib/mailer.ts` |
| Bot protection | Cloudflare Turnstile | current | Invisible/managed mode, verified server-side |
| Rate limiting | `@upstash/ratelimit` + Upstash Redis | current | Fall back to an in-memory limiter in development |
| Icons | `lucide-react` | current | 1.5 px stroke |
| Class utils | `clsx`, `tailwind-merge` 3.x | | Configure custom text sizes (Design System 12.4) |
| Analytics | Vercel Web Analytics or Plausible | | Cookieless, no personal data |
| Tests | Vitest, Playwright, `@axe-core/playwright`, Lighthouse CI | | Section 16 |
| Lint / format | ESLint 9 (flat config) + Prettier with `prettier-plugin-tailwindcss`, or Biome | | Run directly, not via `next lint` |
| Hosting | Vercel, functions in `gru1` (São Paulo) **[CONFIRM]** | | Any Node host works; static pages plus one Server Action |

---

## 4. Architecture

### 4.1 Routing and locales

| URL | Locale | Page |
|---|---|---|
| `/` | pt-BR | Landing page |
| `/en` | en | Landing page |
| `/privacidade` | pt-BR | Privacy policy |
| `/en/privacy` | en | Privacy policy |
| any unknown path | detected | 404 |

```ts
// i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pt-BR", "en"],
  defaultLocale: "pt-BR",
  localePrefix: "as-needed",
  pathnames: {
    "/": "/",
    "/privacidade": { "pt-BR": "/privacidade", en: "/privacy" },
  },
});
```

`proxy.ts` runs the next-intl middleware for locale negotiation. Visitors whose browser prefers English are sent to `/en` on their first visit; after that, the language switcher's choice wins. Section anchors use the same English IDs in both locales (`#services`, `#work`, `#how-we-work`, `#faq`, `#contact`) so analytics and deep links stay stable.

### 4.2 Rendering

Every page is prerendered at build time for both locales (`generateStaticParams` returning both locales, and `setRequestLocale(locale)` in each layout and page so next-intl does not force dynamic rendering). The page reads no request-time data. The only server-side code at runtime is the contact Server Action. Client Components are limited to the list below; everything else is a Server Component.

| Client Component | Why it needs the client |
|---|---|
| `SiteHeader` | Scroll state, hide/show, scroll-spy |
| `MobileMenu` | Open state, focus trap |
| `SymbolAssemble` | Anime.js timeline |
| `PillarsThread` | Scroll-linked Motion values |
| `Accordion` | Expand state |
| `ContactForm` | Form state, Turnstile |
| `CopyButton` | Clipboard |
| `WhatsAppFloat` | Visibility based on scroll position |
| `MotionProvider` | `LazyMotion` + `MotionConfig` |

### 4.3 Project structure

```
systagma-web/
├─ app/
│  ├─ [locale]/
│  │  ├─ layout.tsx              # <html>, fonts, providers, header, footer
│  │  ├─ page.tsx                # composes sections S1–S8
│  │  ├─ privacidade/page.tsx    # localized to /en/privacy via pathnames
│  │  ├─ not-found.tsx
│  │  └─ opengraph-image.tsx     # per-locale OG image (next/og)
│  ├─ actions/contact.ts         # "use server" — contact Server Action
│  ├─ globals.css                # tokens (Design System 12.1)
│  ├─ sitemap.ts · robots.ts · manifest.ts
│  └─ icon.svg · apple-icon.png · favicon.ico
├─ components/
│  ├─ brand/        logo-horizontal.tsx · symbol-static.tsx · symbol-assemble.tsx
│  │                pillar-icons.tsx · connector-diagram.tsx
│  ├─ layout/       site-header.tsx · mobile-menu.tsx · site-footer.tsx
│  │                skip-link.tsx · section.tsx · language-switcher.tsx
│  ├─ sections/     hero.tsx · about.tsx · services.tsx · work.tsx
│  │                how-we-work.tsx · testimonials.tsx · faq.tsx · contact.tsx
│  ├─ ui/           button.tsx · badge.tsx · accordion.tsx · field.tsx
│  │                chip-group.tsx · copy-button.tsx · whatsapp-button.tsx
│  └─ providers/    motion-provider.tsx
├─ content/         site.ts · projects.ts · testimonials.ts
├─ emails/          contact-notification.tsx · contact-confirmation.tsx
├─ i18n/            routing.ts · request.ts · navigation.ts
├─ lib/             cn.ts · fonts.ts · motion-tokens.ts · whatsapp.ts · mailer.ts
│                   rate-limit.ts · turnstile.ts · analytics.ts · jsonld.ts
│                   schema/contact.ts
├─ messages/        pt-BR.json · en.json
├─ public/brand/    lockups, symbol variants, avatar, og-default.png
├─ public/portfolio/ product images (AVIF/WebP sources)
├─ tests/           unit/ · e2e/
├─ proxy.ts         # next-intl locale routing
├─ next.config.ts
└─ .env.example
```

### 4.4 Content model

All interface copy lives in `messages/{locale}.json` (next-intl). Structured records that will grow over time live in typed files under `content/`. A unit test fails the build if the two message files do not have identical keys.

```ts
// content/site.ts
export const site = {
  name: "Systagma",
  legalName: "{{LEGAL_NAME}}",
  cnpj: "{{CNPJ}}",
  url: process.env.NEXT_PUBLIC_SITE_URL!,
  email: "{{CONTACT_EMAIL}}",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || null, // null hides every WhatsApp CTA
  cityUf: "{{CITY_UF}}",
  socials: { linkedin: "{{SOCIAL_LINKEDIN}}", github: "{{SOCIAL_GITHUB}}", instagram: "{{SOCIAL_INSTAGRAM}}" },
} as const;
```

```ts
// content/projects.ts
type Locale = "pt-BR" | "en";
type Localized = Record<Locale, string>;

export type Project = {
  slug: string;
  name: string;
  kind: "product" | "client";          // product = Systagma's own; client = built for a client
  status: "live" | "beta" | "building";
  accent: "coral" | "amber" | "lime" | "violet" | "rose"; // products only; client projects use "neutral" styling
  category: Localized;                  // e.g. "SaaS de gestão" / "Management SaaS"
  summary: Localized;                   // ≤ 110 characters
  url?: string;                         // external site, opens in a new tab
  image?: { src: string; alt: Localized };
  year: number;
  featured?: boolean;
  order: number;
  clientConsent?: true;                 // required when kind === "client"
};

export const projects: Project[] = []; // empty until real items exist
```

```ts
// content/testimonials.ts
export type Testimonial = {
  quote: Record<"pt-BR" | "en", string>;
  name: string;
  role: Record<"pt-BR" | "en", string>;
  company: string;
  photo?: string;
  consentDate: string; // ISO date of written permission
};
export const testimonials: Testimonial[] = [];
```

### 4.5 Environment variables

| Variable | Scope | Required | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | public | yes | Canonical URLs, sitemap, OG |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | public | no | Digits only with country code; empty hides WhatsApp |
| `CONTACT_TO_EMAIL` | server | yes | Inbox that receives leads |
| `CONTACT_FROM_EMAIL` | server | yes | Verified sender, e.g. `Systagma <site@mail.{{domain}}>` |
| `RESEND_API_KEY` | server | yes | Email provider key |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | public | yes | Turnstile widget |
| `TURNSTILE_SECRET_KEY` | server | yes | Turnstile verification |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | server | prod | Rate limiting |
| `CONTACT_DRY_RUN` | server | no | `1` logs emails instead of sending (tests, previews) |

---

## 5. Global shell

`app/[locale]/layout.tsx` renders, in order:

| Element | Details |
|---|---|
| `<html>` | `lang` = current locale; the three font `.variable` classes; `data-scroll-behavior="smooth"`; a tiny inline script in `<head>` that adds the `js` class and, if the hero already played this session, sets `data-assembled` (prevents a flash of hidden symbol pieces, see 9.1) |
| `MotionProvider` | `LazyMotion features={domAnimation} strict` + `MotionConfig reducedMotion="user"` |
| `SkipLink` | Targets `#main` |
| `SiteHeader` | Design System 10.2 |
| `<main id="main">` | The page |
| `SiteFooter` | Design System 10.14 |
| `WhatsAppFloat` | Only when `site.whatsapp` is set |

**Surface rhythm for the landing page.** Each section is a `<section data-theme="…" aria-labelledby="…">`.

| # | Section | Anchor | Theme | Surface |
|---|---|---|---|---|
| S1 | Hero | `#top` | dark | `surface` (Abyss) |
| S2 | About the name | `#about` | light | `surface-subtle` (Mist) |
| S3 | Services (four pillars) | `#services` | light | `surface` (White) |
| S4 | Portfolio | `#work` | light | `surface-subtle` (Mist) |
| S5 | How we work | `#how-we-work` | dark | `surface-subtle` (Ink) |
| S6 | Testimonials (conditional) | `#testimonials` | light | `surface-subtle` (Mist) |
| S7 | FAQ | `#faq` | light | `surface` (White) |
| S8 | Contact | `#contact` | dark | `surface` (Abyss) |
| S9 | Footer | — | dark | `surface` (Abyss) |

If S4 is hidden (no projects), S3 and S5 still differ (white vs. dark), so the rhythm holds.

**Header navigation**

| Label (PT-BR) | Label (EN) | Target | Shown when |
|---|---|---|---|
| Serviços | Services | `#services` | always |
| Portfólio | Work | `#work` | at least 1 project |
| Como trabalhamos | How we work | `#how-we-work` | always |
| FAQ | FAQ | `#faq` | always |
| **Iniciar um projeto** (primary button) | **Start a project** | `#contact` | always |

---

## 6. Sections

Each section lists purpose, layout, copy (PT-BR and EN), components, motion and acceptance criteria. Copy is final unless marked **[CONFIRM]**; commitments and numbers marked that way are business promises the founders must approve.

### S1 — Hero

**Purpose.** Say what Systagma is and give one clear next step, above the fold on every device.

**Layout.** Desktop: 12-column grid; text in columns 1–7, symbol in columns 8–12, vertically centred in a band of `min(100svh, 56rem)` minus the header. The symbol sits on the isometric grid (6% opacity, radially masked, Brand Guideline 6.1). Mobile: text first, symbol below the buttons at 180 px tall.

```
Desktop (≥1024)
┌──────────────────────────────────────────────────────────────────────────┐
│ [S Systagma]   Serviços  Portfólio  Como trabalhamos  FAQ   PT|EN [Iniciar um projeto] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                 ╱ ╲ ╱ ╲ ╱ ╲  (grid 6%)   │
│  Ideias, postas                               ┌──────────────┐           │
│  em ordem.                                    │   symbol     │           │
│                                               │  assembles   │           │
│  Lead paragraph, max 56ch …                   └──────────────┘           │
│  [Iniciar um projeto]  [Conversar no WhatsApp]                           │
│  Respondemos em até 1 dia útil.                                          │
└──────────────────────────────────────────────────────────────────────────┘

Mobile (390)
┌────────────────────────┐
│ [S Systagma]  PT|EN [≡]│
│ Ideias,                │
│ postas em              │
│ ordem.                 │
│ Lead …                 │
│ [Iniciar um projeto]   │
│ [Conversar no WhatsApp]│
│ Respondemos em …       │
│      [ symbol ]        │
└────────────────────────┘
```

**Copy**

| Element | PT-BR | EN |
|---|---|---|
| H1 (`display-lg`) | Ideias, postas em ordem. | Ideas, put in order. |
| Lead (`body-lg`, `fg-muted`) | A Systagma projeta, desenvolve e integra software sob medida, e mede o que ele entrega. Do primeiro rascunho ao impacto que aparece nos dados. | Systagma designs, builds and integrates custom software, and measures what it delivers. From the first sketch to impact you can see in the data. |
| Primary button | Iniciar um projeto | Start a project |
| Secondary button (WhatsApp on) | Conversar no WhatsApp | Chat on WhatsApp |
| Secondary button (WhatsApp off) | Ver o que fazemos (links to `#services`) | See what we do (links to `#services`) |
| Note (`body-sm`, `fg-subtle`) | Respondemos em até 1 dia útil. **[CONFIRM]** | We reply within one business day. **[CONFIRM]** |

Alternative H1 options for the founders: "Software que coloca sua operação em ordem." / "Software that puts your operation in order."; "Da ideia ao impacto, com dados." / "Ideas to impact, through data."

**Components.** `Button` (primary `lg`, secondary `lg`), `WhatsAppButton`, `SymbolAssemble`.
**Motion.** Pattern **Assemble → Connect → Arrive** on the symbol only (section 9.1). The H1, lead and buttons render immediately with no entrance animation, because the H1 is the LCP element.

| ID | Acceptance criterion |
|---|---|
| AC-HERO-01 | At 390 × 844 the H1, lead and primary button are fully visible without scrolling. |
| AC-HERO-02 | The H1 is visible on first paint (no opacity or transform animation on text). |
| AC-HERO-03 | With `NEXT_PUBLIC_WHATSAPP_NUMBER` unset, no WhatsApp element exists in the DOM and the secondary button links to `#services`. |
| AC-HERO-04 | The symbol has `role="img"` and a localized `aria-label`; the grid background is `aria-hidden`. |
| AC-HERO-05 | With reduced motion enabled, the symbol renders complete with no animation. |

---

### S2 — About the name

**Purpose.** Make the brand memorable and explain the promise behind it in two sentences.

**Layout.** Statement in columns 1–8 (`heading-md`, max 30ch), follow-up paragraph below it (`body-lg`, `fg-muted`, max 56ch). Columns 9–12 hold a small static `ConnectorDiagram`: three nodes on the symbol's diagonal connector labelled *Ideia*, *Sistema*, *Impacto* (EN: *Idea*, *System*, *Impact*), the middle node in `accent-fill`. On mobile the diagram sits below the text at full width, max 320 px.

**Copy**

| Element | PT-BR | EN |
|---|---|---|
| H2 (visually hidden) | Sobre a Systagma | About Systagma |
| Statement | Systagma vem do grego: *systēma*, um todo feito de partes, e *tagma*, o que foi posto em ordem. | Systagma comes from Greek: *systēma*, a whole made of parts, and *tagma*, something set in order. |
| Follow-up | É o nosso trabalho. Organizamos pessoas, processos e dados em software que funciona como um só sistema, e mostramos em números o que mudou. | That's our job. We arrange people, processes and data into software that works as a single system, and we show in numbers what changed. |
| Diagram labels | Ideia · Sistema · Impacto (as three separate labels) | Idea · System · Impact |

**[CONFIRM]** the etymology story (Brand Guideline 1.1).
**Motion.** None.

| ID | Acceptance criterion |
|---|---|
| AC-ABOUT-01 | The Greek words are wrapped in `<i lang="grc-Latn">`. |
| AC-ABOUT-02 | The diagram is an inline SVG with a `<title>` and the three labels as real text. |

---

### S3 — Services (the four pillars)

**Purpose.** Show what Systagma sells, organized by the brand's method, so a visitor can find their need in seconds.

**Layout.** Desktop: columns 1–4 hold the section header, sticky at `top: 120px`; columns 6–12 hold the `<ol>` of four `PillarStep`s along a vertical thread on the left edge. Mobile: header above, steps below, thread along the left at 16 px from the edge.

```
┌─────────────────────────────┬─────────────────────────────────────────────┐
│ Do código ao resultado,     │ ●── 01  [glyph] Construir                    │
│ em quatro movimentos.       │ │       Software sob medida, web e mobile…   │
│                             │ │       · Plataformas web e SaaS  · Apps …   │
│ Lead …        (sticky)      │ │                                           │
│                             │ ○── 02  [glyph] Conectar                     │
│                             │ │       …                                    │
│                             │ ○── 03  Analisar                             │
│                             │ ○── 04  Transformar                          │
└─────────────────────────────┴─────────────────────────────────────────────┘
● reached (teal)   ○ upcoming   │ thread draws with scroll
```

**Copy**

| Element | PT-BR | EN |
|---|---|---|
| H2 | Do código ao resultado, em quatro movimentos. | From code to outcome, in four moves. |
| Lead | Todo projeto passa pelas mesmas quatro etapas. Você pode contratar uma, algumas ou o caminho inteiro. | Every project moves through the same four stages. Bring us in for one, a few, or the whole way. |

| # | Title | Description (PT-BR) | Description (EN) | Services (PT-BR) | Services (EN) |
|---|---|---|---|---|---|
| 01 | Construir / Build | Software sob medida, web e mobile, com arquitetura pronta para crescer. | Custom web and mobile software, with architecture that's ready to grow. | Plataformas web e SaaS; Aplicativos iOS e Android; Sistemas internos e painéis administrativos; Design de produto (UX/UI) | Web platforms and SaaS; iOS and Android apps; Internal tools and back-offices; Product design (UX/UI) |
| 02 | Conectar / Connect | Integramos o novo ao que você já usa, para que os dados circulem sem retrabalho. | We plug the new into what you already run, so data moves without rework. | APIs e integrações (ERP, CRM, pagamentos); Automação de processos; Nuvem e DevOps; Migração de sistemas legados | APIs and integrations (ERP, CRM, payments); Workflow automation; Cloud and DevOps; Legacy system migration |
| 03 | Analisar / Analyze | Transformamos dados dispersos em indicadores confiáveis e decisões mais rápidas. | We turn scattered data into trustworthy metrics and faster decisions. | Engenharia de dados e pipelines; Dashboards e BI; IA e machine learning aplicados; Métricas de produto | Data engineering and pipelines; Dashboards and BI; Applied AI and machine learning; Product analytics |
| 04 | Transformar / Transform | Usamos o que os dados mostram para evoluir o produto e o negócio. | We use what the data shows to evolve the product and the business. | Discovery e estratégia de produto; Modernização de sistemas; Agentes de IA e automação inteligente; Evolução contínua e sustentação | Product discovery and strategy; System modernization; AI agents and intelligent automation; Continuous improvement and support |

**Components.** `SectionHeader`, `PillarStep` × 4, `PillarsThread`, custom pillar glyphs.
**Motion.** Pattern **Thread** (section 9.2).

| ID | Acceptance criterion |
|---|---|
| AC-SERV-01 | Steps are an `<ol>` with four `<li>`, each containing an `<h3>`. |
| AC-SERV-02 | Scrolling from the first to the last step draws the thread fully; each node fills when the thread reaches it; scrolling back reverses it. |
| AC-SERV-03 | With reduced motion, the thread is fully drawn and all nodes are filled on load. |
| AC-SERV-04 | The sticky header column never overlaps the site header and releases before the section ends. |

---

### S4 — Portfolio

**Purpose.** Show real work, and give future products a home that scales from one item to many.

**Layout (depends on content, Design System 11.1).** 0 items: section and nav item not rendered. 1–2 items: one large card per row, media left (columns 1–7) and text right (8–12). 3–5 items: 2-column grid. 6+ items: 3-column grid at ≥1280 px. Products are listed before client projects, then by `order`.

**Copy**

| Element | PT-BR | EN |
|---|---|---|
| H2 | Produtos e projetos em movimento | Products and projects in motion |
| Lead | Produtos próprios da Systagma e sistemas que construímos para clientes. | Systagma's own products and systems we've built for clients. |
| Kind label | Produto Systagma / Projeto de cliente | Systagma product / Client project |
| Status | Em produção / Beta / Em desenvolvimento | Live / Beta / In development |
| Link hint (visually hidden) | (abre em nova aba) | (opens in a new tab) |

**Components.** `PortfolioCard` (Design System 10.7), `Badge`. Media uses `next/image` with `sizes` matching the grid; items without an image show the product's node mark (Brand Guideline 9.3) on its accent fill. Client projects use a `surface` media background with the client's logo instead of a portfolio accent.

| ID | Acceptance criterion |
|---|---|
| AC-WORK-01 | With `projects = []`, neither the section nor its nav link is in the DOM. |
| AC-WORK-02 | A client project without `clientConsent` fails a unit test and is never rendered. |
| AC-WORK-03 | External links use `target="_blank" rel="noopener"` and announce that they open a new tab. |
| AC-WORK-04 | All card images below the fold are lazy-loaded and have localized `alt` text. |

---

### S5 — How we work

**Purpose.** Lower the risk of starting: three clear ways in, and four rules that hold in all of them.

**Layout.** Section header across columns 1–8. Below, three engagement models in three columns separated by 1 px `line` rules (no card boxes; one column each on mobile, separated by horizontal rules). Below that, an `<h3>` and the four commitments in a 2 × 2 grid (one column on mobile).

**Copy**

| Element | PT-BR | EN |
|---|---|---|
| H2 | Como trabalhamos juntos | How we work together |
| Lead | Três formas de começar, com as mesmas regras em todas. | Three ways to start, with the same rules in each. |

| Model | PT-BR | EN | Best for (PT-BR / EN) |
|---|---|---|---|
| Diagnóstico / Discovery sprint | Duas semanas para entender o problema, validar a solução com quem vai usar e sair com escopo, plano e estimativa. Preço fixo. | Two weeks to understand the problem, test the solution with the people who'll use it, and leave with a scope, a plan and an estimate. Fixed price. | Quando a ideia ainda está aberta. / When the idea is still open. |
| Projeto fechado / Fixed-scope project | Escopo, prazo e investimento acordados antes de começar, com entregas a cada duas semanas. | Scope, timeline and budget agreed before we start, with deliveries every two weeks. | MVPs e sistemas com objetivo claro. / MVPs and systems with a clear goal. |
| Time dedicado / Dedicated team | Um time multidisciplinar que trabalha como extensão do seu, em ciclos quinzenais e com as prioridades que você define. | A cross-functional team that works as an extension of yours, in two-week cycles, on the priorities you set. | Produtos em evolução contínua. / Products that keep evolving. |

| H3 | PT-BR: O que vale em qualquer formato | EN: What holds in every format |
|---|---|---|
| Commitment 1 **[CONFIRM]** | **O código é seu.** Repositórios, contas de nuvem e documentação ficam em nome da sua empresa desde o primeiro dia. | **You own the code.** Repositories, cloud accounts and documentation are in your company's name from day one. |
| Commitment 2 **[CONFIRM]** | **Software funcionando a cada duas semanas.** Você acompanha demonstrações, não relatórios de status. | **Working software every two weeks.** You see demos, not status reports. |
| Commitment 3 **[CONFIRM]** | **Métrica antes da funcionalidade.** Combinamos como medir o sucesso antes da primeira linha de código. | **Metrics before features.** We agree on how success is measured before the first line of code. |
| Commitment 4 **[CONFIRM]** | **Preço e prazo por escrito.** Mudanças de escopo são estimadas e aprovadas antes de entrar no ciclo. | **Price and timeline in writing.** Scope changes are estimated and approved before they enter a cycle. |

**Motion.** None.

| ID | Acceptance criterion |
|---|---|
| AC-HOW-01 | The three models are not numbered (they are alternatives, not a sequence). |
| AC-HOW-02 | Commitment titles are `<h4>` (or `<strong>` in a `<dl>`), not coloured text. |

---

### S6 — Testimonials (conditional)

Rendered only when `testimonials.length >= 2`. Up to three quotes side by side (one column on mobile), no carousel. Quote in `heading-sm` Urbanist 500 inside `<blockquote>`; attribution below in `body-sm` (`name`, `role`, `company`), optional 48 px round photo. H2: "O que dizem sobre o trabalho" / "What clients say about the work".

| ID | Acceptance criterion |
|---|---|
| AC-TEST-01 | With fewer than two testimonials, the section is not rendered. |
| AC-TEST-02 | Each quote uses `<figure>`, `<blockquote>` and `<figcaption>`. |

---

### S7 — FAQ

**Layout.** Desktop: columns 1–4 hold the H2, lead and a "didn't find it" line (sticky); columns 6–12 hold the accordion. Mobile: stacked.

| Element | PT-BR | EN |
|---|---|---|
| H2 | Perguntas frequentes | Common questions |
| Lead | O que costumam nos perguntar antes de começar. | What people usually ask before we start. |
| Fallback line | Não achou sua pergunta? Escreva para {{CONTACT_EMAIL}}. | Didn't find yours? Write to {{CONTACT_EMAIL}}. |

| ID | Question (PT-BR / EN) | Answer (PT-BR) | Answer (EN) |
|---|---|---|---|
| `faq-custo` | Quanto custa um projeto? / How much does a project cost? | Depende do escopo e do formato. Depois de uma conversa inicial, enviamos uma proposta com escopo, prazo e investimento por escrito. Quando o escopo ainda está aberto, começamos por um diagnóstico de duas semanas com preço fixo. | It depends on scope and format. After a first conversation we send a written proposal with scope, timeline and budget. When the scope is still open, we start with a two-week, fixed-price discovery sprint. |
| `faq-prazo` | Quanto tempo leva? / How long does it take? | Um MVP costuma levar de 8 a 16 semanas **[CONFIRM]**. O prazo exato vem na proposta, com entregas a cada duas semanas para você acompanhar. | An MVP usually takes 8 to 16 weeks **[CONFIRM]**. The exact timeline is in the proposal, with deliveries every two weeks so you can follow along. |
| `faq-codigo` | De quem é o código? / Who owns the code? | Da sua empresa. Repositórios, contas de nuvem, domínios e documentação ficam no seu nome desde o início, e entregamos tudo organizado no fim do contrato. | Your company. Repositories, cloud accounts, domains and documentation are in your name from the start, and we hand everything over in order when the contract ends. |
| `faq-sistema` | Vocês assumem um sistema que já está rodando? / Can you take over a system that's already running? | Sim. Começamos com uma auditoria técnica do código, da infraestrutura e dos riscos, e só depois propomos o plano de evolução. | Yes. We start with a technical audit of the code, infrastructure and risks, and only then propose a plan. |
| `faq-ideia` | Preciso chegar com tudo definido? / Do I need everything figured out? | Não. Uma ideia ou um problema bem descrito basta para a primeira conversa. O diagnóstico existe para transformar isso em escopo. | No. An idea or a clearly described problem is enough for a first conversation. The discovery sprint exists to turn that into scope. |
| `faq-comunicacao` | Como funciona a comunicação? / How does communication work? | Um canal direto com o time (e-mail, Slack ou WhatsApp), uma reunião semanal curta e uma demonstração a cada ciclo de duas semanas. | A direct channel with the team (email, Slack or WhatsApp), a short weekly meeting and a demo every two-week cycle. |
| `faq-suporte` | E depois do lançamento? / What happens after launch? | Oferecemos planos de sustentação com monitoramento, correções e evolução contínua. Também podemos treinar seu time para assumir o sistema. | We offer support plans with monitoring, fixes and ongoing improvement. We can also train your team to take the system over. |
| `faq-dados` | Como vocês tratam dados pessoais? / How do you handle personal data? | Seguimos a LGPD: coletamos o mínimo necessário, documentamos o tratamento e aplicamos controle de acesso e criptografia nos sistemas que construímos. Quando necessário, assinamos um acordo de tratamento de dados. | We follow Brazil's LGPD: we collect the minimum needed, document how data is processed, and apply access control and encryption in the systems we build. When needed, we sign a data processing agreement. |
| `faq-idioma` | Vocês atendem empresas fora do Brasil? / Do you work with companies outside Brazil? | Sim, em português e inglês **[CONFIRM]**, com reuniões no fuso que funcionar para os dois lados. | Yes, in Portuguese and English **[CONFIRM]**, with meetings in a time zone that works for both sides. |

**Motion.** Pattern **Expand**.

| ID | Acceptance criterion |
|---|---|
| AC-FAQ-01 | Visiting `/#faq-codigo` scrolls to and opens that item. |
| AC-FAQ-02 | Triggers are buttons inside `<h3>` with `aria-expanded` and `aria-controls`; panels are regions labelled by their trigger. |
| AC-FAQ-03 | Closed panels are removed from the accessibility tree and tab order. |

---

### S8 — Contact

**Purpose.** Convert. Email is the primary channel; WhatsApp is secondary and optional.

**Layout.** Desktop: columns 1–5 hold the heading, lead, direct channels and "what happens next"; columns 7–12 hold the form on a `surface-raised` panel with a 1 px `line` border and `radius-md`. Mobile: heading and channels first, then the form.

```
┌──────────────────────────────┬──────────────────────────────────────────┐
│ Conte o que você quer        │ ┌──────────────────────────────────────┐ │
│ construir.   (display-md)    │ │ Nome *            E-mail *           │ │
│ Lead …                       │ │ Empresa                              │ │
│                              │ │ O que você precisa? * [chip][chip]…  │ │
│ E-mail  contato@… [Copiar]   │ │ Investimento previsto [chip][chip]…  │ │
│ WhatsApp [Conversar]         │ │ Mensagem *                           │ │
│ Horário  {{HOURS}}           │ │ [                                  ] │ │
│                              │ │ LGPD notice                          │ │
│ O que acontece depois        │ │ [Enviar mensagem]                    │ │
│ 1 Lemos e respondemos …      │ └──────────────────────────────────────┘ │
│ 2 Conversa de 30 min …       │                                          │
│ 3 Proposta ou diagnóstico …  │                                          │
└──────────────────────────────┴──────────────────────────────────────────┘
```

**Copy**

| Element | PT-BR | EN |
|---|---|---|
| H2 (`display-md`) | Conte o que você quer construir. | Tell us what you want to build. |
| Lead | Respondemos por e-mail em até um dia útil com os próximos passos. **[CONFIRM]** | We reply by email within one business day with next steps. **[CONFIRM]** |
| Channel: email | E-mail · {{CONTACT_EMAIL}} · Copiar e-mail | Email · {{CONTACT_EMAIL}} · Copy email |
| Channel: WhatsApp (if on) | WhatsApp · Conversar no WhatsApp · Para conversas rápidas em horário comercial. | WhatsApp · Chat on WhatsApp · For quick questions during business hours. |
| Channel: hours | Horário · {{HOURS}} (horário de Brasília) | Hours · {{HOURS}} (Brasília time, UTC−3) |
| H3 | O que acontece depois | What happens next |
| Step 1 | Lemos sua mensagem e respondemos em até um dia útil. | We read your message and reply within one business day. |
| Step 2 | Marcamos uma conversa de 30 minutos para entender o contexto. | We book a 30-minute call to understand the context. |
| Step 3 | Enviamos uma proposta ou um plano de diagnóstico. | We send a proposal or a discovery plan. |

The three "what happens next" steps are a real sequence and use an `<ol>`.

**Form fields** (all copy lives in the message files; validation in section 8.2)

| Field | Name | Type | Required | Label PT-BR / EN | Options PT-BR / EN |
|---|---|---|---|---|---|
| Name | `name` | text, `autocomplete="name"` | yes | Nome / Name | |
| Email | `email` | email, `autocomplete="email"` | yes | E-mail / Email | |
| Company | `company` | text, `autocomplete="organization"` | no | Empresa / Company | |
| Needs | `needs` | checkbox chips | at least 1 | O que você precisa? / What do you need? | Novo produto / New product; Integração / Integration; Dados e BI / Data & BI; IA e automação / AI & automation; Modernização / Modernization; Outro / Other |
| Budget | `budget` | radio chips | no | Investimento previsto / Expected budget | PT: Até R$ 30 mil; R$ 30–80 mil; R$ 80–200 mil; Acima de R$ 200 mil; Ainda não sei. EN: Under US$ 10k; US$ 10–25k; US$ 25–60k; Over US$ 60k; Not sure yet. **[CONFIRM ranges]** |
| Message | `message` | textarea, 20–2000 chars, counter | yes | Conte um pouco sobre o projeto / Tell us a bit about the project | Hint: Qual problema você quer resolver e para quando? / What problem are you solving, and by when? |
| Honeypot | `website` | text, visually hidden, `tabindex="-1"`, `autocomplete="off"` | must be empty | | |
| Timing | `startedAt` | hidden, set on first interaction | | | |
| Source | `source` | hidden, the CTA that led here (`hero`, `header`, `menu`, `faq`…) | | | |
| UTM | `utm` | hidden, captured from the landing URL into `sessionStorage` | | | |
| Locale | `locale` | hidden | | | |
| Turnstile | `cf-turnstile-response` | widget | yes | | |

| Element | PT-BR | EN |
|---|---|---|
| Required note | * obrigatório | * required |
| LGPD notice (`caption`) | Usamos seus dados apenas para responder a este contato. Saiba mais na [Política de Privacidade](/privacidade). | We use your details only to reply to this message. Read our [Privacy Policy](/en/privacy). |
| Submit | Enviar mensagem → Enviando… | Send message → Sending… |
| Success heading | Mensagem enviada | Message sent |
| Success body | Respondemos em até um dia útil no e-mail {email}. | We'll reply to {email} within one business day. |
| Success action | Enviar outra mensagem | Send another message |
| Send error | Não foi possível enviar sua mensagem. Tente de novo ou escreva para {{CONTACT_EMAIL}}. | Your message couldn't be sent. Try again or write to {{CONTACT_EMAIL}}. |
| Rate-limited | Recebemos várias mensagens deste endereço em pouco tempo. Tente de novo em alguns minutos ou escreva para {{CONTACT_EMAIL}}. | We've received several messages from this address in a short time. Try again in a few minutes or write to {{CONTACT_EMAIL}}. |

| ID | Acceptance criterion |
|---|---|
| AC-CONT-01 | The form submits and shows the success panel with JavaScript disabled (progressive enhancement through the Server Action; Turnstile is skipped only in `CONTACT_DRY_RUN`). |
| AC-CONT-02 | Invalid submissions keep all typed values, mark each invalid field, announce an error summary and move focus to the first invalid field. |
| AC-CONT-03 | A filled honeypot or a submission faster than 3 s returns the normal success UI but sends nothing. |
| AC-CONT-04 | The internal notification arrives with `Reply-To` set to the sender; the sender receives a localized confirmation. |
| AC-CONT-05 | After success, focus moves to the success heading and a polite live region announces it. |
| AC-CONT-06 | The Turnstile script is loaded only when the contact section comes within 600 px of the viewport. |

---

### S9 — Footer

| Row | Content |
|---|---|
| 1 | Horizontal lockup; brand tagline ("Da ideia ao impacto, com dados." / "Ideas to impact through data."); nav columns: **Site** (section links), **Contato / Contact** (email, WhatsApp if on), **Social** (LinkedIn, GitHub, Instagram, only those configured) |
| 2 (`caption`) | Copyright line with {{LEGAL_NAME}}, the CNPJ and {{CITY_UF}} as separate inline items spaced with `gap`, followed by the Política de Privacidade / Privacy Policy link |

### Floating WhatsApp button

Only when `site.whatsapp` is set. Appears after S1 leaves the viewport, hides while S8 is in view or the mobile menu is open (Design System 10.9). On mobile it sits above the browser's bottom bar using `env(safe-area-inset-bottom)`.

| ID | Acceptance criterion |
|---|---|
| AC-WA-01 | The link is `https://wa.me/{{WHATSAPP_NUMBER}}?text=<URL-encoded localized message>` and opens in a new tab. |
| AC-WA-02 | The floating button never covers form controls or the footer's legal line at 390 px width. |

---

## 7. Secondary pages

### 7.1 Privacy policy (`/privacidade`, `/en/privacy`)

A prose page in `container-prose`, light theme, with a table of contents of anchor links. It must be reviewed by a lawyer before launch; the outline below reflects what the LGPD expects a policy of this kind to cover.

| Section | Content |
|---|---|
| Quem somos / Who we are | Controller identification: {{LEGAL_NAME}}, CNPJ, address, contact email |
| Dados que coletamos / Data we collect | Contact form fields; technical logs kept by the host; cookieless, aggregated analytics |
| Para que usamos / Why we use it | Replying to the request and preparing proposals |
| Base legal / Legal basis | Preliminary procedures for a contract at the data subject's request (LGPD Art. 7, V) and legitimate interest where applicable |
| Com quem compartilhamos / Who we share it with | Email provider, hosting provider, Cloudflare Turnstile; note that these may process data outside Brazil |
| Por quanto tempo / How long | Retention period **[CONFIRM, e.g. 24 months]** or until deletion is requested |
| Seus direitos / Your rights | Rights under LGPD Art. 18 and how to exercise them |
| Encarregado / Data protection contact | Name or role and email of the person in charge (LGPD Art. 41) |
| Cookies | States that the site sets no tracking cookies |
| Atualizações / Updates | Date of last update |

### 7.2 404

Light theme, centred (the only centred layout on the site). The symbol renders with its segments slightly apart and, on load, drifts 12 px further apart while the connector retracts (one time, 800 ms, Anime.js; skipped with reduced motion). This is the page's one orchestrated moment.

| Element | PT-BR | EN |
|---|---|---|
| H1 | Esta parte do sistema não existe. | This part of the system doesn't exist. |
| Body | O endereço pode ter mudado ou nunca ter existido. | The address may have changed, or it never existed. |
| Buttons | Voltar ao início · Iniciar um projeto | Back to home · Start a project |

---

## 8. Contact system

### 8.1 Flow

| Step | Where | What happens |
|---|---|---|
| 1 | Client | User fills the form. `startedAt` is set on the first interaction. Client-side hints come from the same zod schema, shown on blur and on submit. |
| 2 | Client | On submit, `useActionState` sets pending state; the button morphs to "Enviando…". Without JavaScript the browser posts the form to the Server Action directly. |
| 3 | Server | Honeypot or too-fast submission → return success silently, send nothing. |
| 4 | Server | Rate limit by IP: 5 per 10 minutes and 20 per day. Exceeded → `rate_limited`. |
| 5 | Server | Verify the Turnstile token with Cloudflare. Failure → `send_error` (no detail revealed). |
| 6 | Server | Validate with zod. Failure → `invalid` with field errors and the submitted values. |
| 7 | Server | Send the internal notification and the localized confirmation. Provider failure → `send_error`. |
| 8 | Client | `success` → form replaced by the result panel, focus moved, analytics event sent. |

### 8.2 Schema

```ts
// lib/schema/contact.ts
import { z } from "zod";

export const NEEDS = ["new-product", "integration", "data", "ai", "modernization", "other"] as const;
export const BUDGETS = ["b1", "b2", "b3", "b4", "unknown"] as const; // labels per locale in messages

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  company: z.string().trim().max(120).optional().default(""),
  needs: z.array(z.enum(NEEDS)).min(1),
  budget: z.enum(BUDGETS).optional(),
  message: z.string().trim().min(20).max(2000),
  locale: z.enum(["pt-BR", "en"]),
  source: z.string().max(40).optional(),
  utm: z.string().max(300).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

export type ContactState =
  | { status: "idle" }
  | { status: "success"; email?: string }
  | { status: "invalid"; fieldErrors: Partial<Record<keyof ContactInput, string[]>>; values: Record<string, unknown> }
  | { status: "rate_limited" }
  | { status: "send_error" };
```

Validation messages are keys (`contact.errors.nameShort`, `contact.errors.emailInvalid`, `contact.errors.needsEmpty`, `contact.errors.messageShort`, `contact.errors.messageLong`) resolved per locale, for example "Escreva pelo menos 20 caracteres para entendermos o projeto." / "Write at least 20 characters so we can understand the project."

### 8.3 Server Action

```ts
// app/actions/contact.ts
"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { contactSchema, type ContactState } from "@/lib/schema/contact";
import { limitContact } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendContactEmails } from "@/lib/mailer";

export async function submitContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  // Silent bot traps: pretend success, send nothing
  if (form.get("website")) return { status: "success" };
  const startedAt = Number(form.get("startedAt") || 0);
  if (startedAt && Date.now() - startedAt < 3000) return { status: "success" };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (!(await limitContact(ip))) return { status: "rate_limited" };

  if (process.env.CONTACT_DRY_RUN !== "1") {
    const ok = await verifyTurnstile(String(form.get("cf-turnstile-response") || ""), ip);
    if (!ok) return { status: "send_error" };
  }

  const values = {
    name: form.get("name"),
    email: form.get("email"),
    company: form.get("company") ?? "",
    needs: form.getAll("needs"),
    budget: form.get("budget") || undefined,
    message: form.get("message"),
    locale: form.get("locale"),
    source: form.get("source") || undefined,
    utm: form.get("utm") || undefined,
  };
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "invalid", fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await sendContactEmails(parsed.data);
  } catch (err) {
    console.error("contact_send_failed", { reason: (err as Error).message }); // no personal data in logs
    return { status: "send_error" };
  }
  return { status: "success", email: parsed.data.email };
}
```

```ts
// lib/turnstile.ts
export async function verifyTurnstile(token: string, ip: string) {
  if (!token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token, remoteip: ip }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}
```

```ts
// lib/rate-limit.ts (production)
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const burst = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "10 m"), prefix: "contact:burst" });
const daily = new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(20, "1 d"), prefix: "contact:daily" });

export async function limitContact(ip: string) {
  const [a, b] = await Promise.all([burst.limit(ip), daily.limit(ip)]);
  return a.success && b.success;
}
```

### 8.4 Emails

Both templates are built with React Email and also send a plain-text part. The HTML version uses an Abyss header strip with the horizontal lockup as a hosted PNG, Plex Sans with system fallbacks, and body text in Ink on white.

| Email | To | Reply-To | Subject | Body |
|---|---|---|---|---|
| Internal notification | `CONTACT_TO_EMAIL` | sender's email | `[Site] Novo contato: {name} ({company}) — {needs}` | All fields as a label/value table, plus locale, source CTA, UTM string and timestamp (America/Sao_Paulo) |
| Confirmation (PT-BR) | sender | `CONTACT_TO_EMAIL` | Recebemos sua mensagem — Systagma | "Olá, {name}. Recebemos sua mensagem e respondemos em até um dia útil. Abaixo está o que você enviou; se quiser complementar, é só responder este e-mail." followed by a summary of the submission |
| Confirmation (EN) | sender | `CONTACT_TO_EMAIL` | We got your message — Systagma | "Hi {name}. We've received your message and will reply within one business day. Here's what you sent; to add anything, just reply to this email." followed by the summary |

All user-supplied strings are escaped (React Email does this by default; never build HTML by string concatenation). The sending domain must have SPF, DKIM and DMARC configured; use a subdomain such as `mail.{{domain}}` so marketing reputation and transactional reputation stay separate.

### 8.5 WhatsApp links

```ts
// lib/whatsapp.ts
const PREFILL = {
  "pt-BR": "Olá, Systagma! Vim pelo site e gostaria de conversar sobre um projeto.",
  en: "Hi Systagma! I found you through your website and I'd like to talk about a project.",
} as const;

export function whatsappHref(locale: keyof typeof PREFILL) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER; // digits only, country code first
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(PREFILL[locale])}`;
}
```

WhatsApp Business profile, greeting, away message and quick replies are defined in `Brand-Guideline.md` section 10.1.

---

## 9. Motion implementation

Tokens and library ownership are defined in `Design-system.md` section 8. This section gives the exact choreography and reference code.

### 9.1 Hero symbol: Assemble → Connect → Arrive (Anime.js)

**Source asset.** `systagma-symbol-animated.svg` from the logo redraw (Brand Guideline 3.7), inlined as a React component. Every ribbon segment is a `<g data-piece data-dx data-dy>`; the connector is a single `<path data-connector>` authored from the bottom-left node to the top-right node; the three nodes are `<circle data-node>` in travel order (bottom-left, centre, top-right). Each piece's `dx`/`dy` points 24 px outward from the centre along the isometric axis closest to its long edge:

| Direction | dx, dy (px) |
|---|---|
| Up-right | 20.8, −12 |
| Down-left | −20.8, 12 |
| Up-left | −20.8, −12 |
| Down-right | 20.8, 12 |
| Up / Down | 0, −24 / 0, 24 |

**Timeline**

| Start (ms) | Target | From → to | Duration | Ease |
|---|---|---|---|---|
| 0 | Segments (stagger 60 ms from centre) | translate (dx, dy) → 0; opacity 0 → 1 | 700 | `outQuint` |
| 520 | Connector | draw `0 0` → `0 1` | 600 | `inOutCubic` |
| 520 | Bottom-left node | scale 0.6 → 1; opacity 0 → 1 | 500 | `outBack` |
| 790 | Centre node | same | 500 | `outBack` |
| 1060 | Top-right node | same | 500 | `outBack` |
| ≈ 1560 | End | `data-state="done"`; `sessionStorage['sys-assembled'] = '1'` | | |

The animation plays once per browser session. Later visits in the same session show the finished symbol immediately.

**Flash prevention.** Server-rendered HTML contains the finished symbol. A blocking inline script in `<head>` adds `class="js"` to `<html>` and, if the session flag exists, `data-assembled`. CSS hides the parts only when the animation is actually going to run, with a failsafe that reveals them if the script chunk never loads:

```css
[data-node] { transform-box: fill-box; transform-origin: center; }

@media (prefers-reduced-motion: no-preference) {
  html.js:not([data-assembled]) [data-symbol][data-state="idle"]
    :is([data-piece], [data-node], [data-connector]) {
    opacity: 0;
    animation: sys-failsafe 0s linear 2.5s forwards;
  }
}
@keyframes sys-failsafe { to { opacity: 1; } }
```

**Reference component** (verify method signatures against the Anime.js v4 docs at build time):

```tsx
"use client";
import { useEffect, useRef } from "react";

export function SymbolAssemble({ label }: { label: string }) {
  const root = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const played = document.documentElement.hasAttribute("data-assembled");
    if (reduce || played) { el.dataset.state = "done"; return; }

    let revert = () => {};
    let cancelled = false;

    import("animejs").then(({ createScope, createTimeline, stagger, svg, utils }) => {
      if (cancelled) return;
      const scope = createScope({ root }).add(() => {
        // Put every part in its start state, then hand control from CSS to Anime.js
        utils.set("[data-piece]", {
          opacity: 0,
          translateX: (t: Element) => Number((t as SVGElement).dataset.dx),
          translateY: (t: Element) => Number((t as SVGElement).dataset.dy),
        });
        utils.set("[data-node]", { opacity: 0, scale: 0.6 });
        el.dataset.state = "playing";

        createTimeline({
          onComplete: () => {
            el.dataset.state = "done";
            try { sessionStorage.setItem("sys-assembled", "1"); } catch {}
          },
        })
          .add("[data-piece]", {
            opacity: 1, translateX: 0, translateY: 0,
            duration: 700, ease: "outQuint", delay: stagger(60, { from: "center" }),
          }, 0)
          .add(svg.createDrawable("[data-connector]"), {
            draw: ["0 0", "0 1"], duration: 600, ease: "inOutCubic",
          }, 520)
          .add("[data-node]", {
            opacity: 1, scale: 1, duration: 500, ease: "outBack", delay: stagger(270),
          }, 520);
      });
      revert = () => scope.revert();
    });

    return () => { cancelled = true; revert(); };
  }, []);

  return (
    <svg ref={root} data-symbol data-state="idle" role="img" aria-label={label} viewBox="0 0 546 885">
      {/* segments, connector and nodes from systagma-symbol-animated.svg */}
    </svg>
  );
}
```

### 9.2 Pillars thread (Motion)

The thread's teal fill always ends at a fixed line 65% down the viewport, so it reads as "you are here". Nodes activate when they cross that same line.

```tsx
"use client";
import { useRef } from "react";
import { useScroll, useReducedMotion, useInView } from "motion/react";
import * as m from "motion/react-m";

export function ThreadFill() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 65%", "end 65%"] });
  return (
    <div ref={ref} aria-hidden className="absolute left-2 top-0 bottom-0 w-0.5 bg-line">
      <m.div
        className="h-full w-full origin-top bg-accent-fill"
        style={{ scaleY: reduce ? 1 : scrollYProgress }}
      />
    </div>
  );
}

export function useNodeReached(node: React.RefObject<Element>) {
  const reduce = useReducedMotion();
  // A huge top margin keeps nodes "reached" after they scroll above the viewport
  const inView = useInView(node, { margin: "100000px 0px -35% 0px" });
  return reduce || inView;
}
```

The node fill change uses a `duration-fast` colour transition plus pattern **Arrive** (scale 0.8 → 1 with `spring-node`) the first time each node is reached.

### 9.3 Header, menu, accordion, form

| Behaviour | Implementation |
|---|---|
| Header background after 24 px | `useScroll().scrollY` + `useMotionValueEvent`, toggling a `data-scrolled` attribute; the style change itself is a CSS transition |
| Header hide/show | Same listener: hide when scrolling down past 400 px, show on any upward scroll; `m.header` animates `y: "-100%" ↔ 0` with `spring.ui`; never hides while the menu is open or focus is inside the header |
| Scroll-spy | One `IntersectionObserver` over the sections with `rootMargin: "-45% 0px -50% 0px"`; the active id drives `aria-current` |
| Mobile menu | `AnimatePresence`; sheet `y: -8 → 0`, opacity 0 → 1 in `duration.base`, exit in `duration.fast` |
| Accordion | `AnimatePresence initial={false}`; panel `height: 0 ↔ "auto"`, opacity 0 ↔ 1; icon `rotate: 0 ↔ 45` |
| Submit morph | `AnimatePresence mode="wait"` swapping label, spinner and check; form ↔ result panel crossfade in `duration.base` |
| Floating WhatsApp | `AnimatePresence`; scale 0.8 → 1 and opacity, `spring.ui`; visibility from two observers (hero out of view, contact not in view) |

---

## 10. SEO and discoverability

### 10.1 Metadata

```ts
// app/[locale]/layout.tsx
export async function generateMetadata({ params }: { params: Promise<{ locale: "pt-BR" | "en" }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: locale === "pt-BR" ? "/" : "/en",
      languages: { "pt-BR": "/", en: "/en", "x-default": "/" },
    },
    openGraph: {
      type: "website",
      siteName: "Systagma",
      locale: locale === "pt-BR" ? "pt_BR" : "en_US",
      alternateLocale: locale === "pt-BR" ? ["en_US"] : ["pt_BR"],
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}
```

| Key | PT-BR | EN |
|---|---|---|
| `meta.title` (≤ 60 chars) | Systagma — Software sob medida, integrações e dados | Systagma — Custom software, integrations and data |
| `meta.description` (≤ 155 chars) | Software house que projeta, desenvolve e integra plataformas web, aplicativos e soluções de dados. Do primeiro rascunho ao impacto medido. | Software house that designs, builds and integrates web platforms, mobile apps and data solutions. From first sketch to measured impact. |

### 10.2 Open Graph image

`app/[locale]/opengraph-image.tsx` renders a 1200 × 630 image with `next/og`: Abyss background, isometric grid at 6%, the localized H1 in Urbanist SemiBold 88 px (Mist) on the left, the symbol on the right at 420 px tall, and the domain in Plex Sans at the bottom-left. `next/og` cannot read WOFF2, so ship `Urbanist-SemiBold.ttf` and `IBMPlexSans-Regular.ttf` in `assets/fonts/` for this route only.

### 10.3 Structured data

Inject one JSON-LD script on the landing page:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "{{SITE_URL}}/#organization",
      "name": "Systagma",
      "legalName": "{{LEGAL_NAME}}",
      "url": "{{SITE_URL}}",
      "logo": "{{SITE_URL}}/brand/systagma-symbol-color.png",
      "email": "{{CONTACT_EMAIL}}",
      "slogan": "Ideas to impact through data",
      "address": { "@type": "PostalAddress", "addressLocality": "{{CITY}}", "addressRegion": "{{UF}}", "addressCountry": "BR" },
      "contactPoint": [{
        "@type": "ContactPoint",
        "contactType": "sales",
        "email": "{{CONTACT_EMAIL}}",
        "url": "https://wa.me/{{WHATSAPP_NUMBER}}",
        "availableLanguage": ["Portuguese", "English"]
      }],
      "sameAs": ["{{SOCIAL_LINKEDIN}}", "{{SOCIAL_GITHUB}}", "{{SOCIAL_INSTAGRAM}}"]
    },
    {
      "@type": "WebSite",
      "@id": "{{SITE_URL}}/#website",
      "url": "{{SITE_URL}}",
      "name": "Systagma",
      "inLanguage": ["pt-BR", "en"],
      "publisher": { "@id": "{{SITE_URL}}/#organization" }
    }
  ]
}
```

Omit `contactPoint.url` when WhatsApp is off, and drop empty `sameAs` entries. A `FAQPage` block may be added from the FAQ content; Google no longer shows FAQ rich results for most sites, but the markup remains valid structured data for other consumers.

### 10.4 Sitemap, robots, extras

| File | Content |
|---|---|
| `app/sitemap.ts` | Landing and privacy URLs for both locales, each with `alternates.languages` |
| `app/robots.ts` | Allow all; point to the sitemap. Search and AI crawlers are allowed on purpose: being cited in AI answers is a discovery channel **[CONFIRM]** |
| `app/manifest.ts` | Name, short name, Abyss `theme_color` and `background_color`, icons from Brand Guideline 3.7 |
| `public/llms.txt` (optional) | A short Markdown summary of who Systagma is, the four pillars and the contact email. It is a proposed convention, cheap to maintain |

---

## 11. Performance budget

| Metric | Budget | How it is met |
|---|---|---|
| LCP (p75, mobile) | ≤ 2.0 s | Static HTML; H1 is the LCP element and is never animated; fonts self-hosted with `display: swap`; no hero image |
| INP | ≤ 150 ms | Few client components; no scroll listeners doing layout work; observers instead of scroll handlers where possible |
| CLS | ≤ 0.05 | Fixed dimensions for the symbol and media; button widths locked during loading; fonts via `next/font` (size-adjusted fallbacks) |
| First-load JS (landing route, gzip) | ≤ 130 KB | Server Components by default; `LazyMotion` + `domAnimation`; no smooth-scroll or carousel libraries |
| Hero animation chunk | ≤ 30 KB gzip, loaded after hydration | Dynamic `import("animejs")` inside the effect |
| Third-party scripts | Turnstile only, lazy | Loaded when the contact section approaches the viewport |
| Fonts | ≤ 3 preloaded files | Urbanist variable, Plex Sans 400 and 600; Plex Mono not preloaded |
| Images | AVIF/WebP, responsive `sizes`, lazy below the fold | `next/image` |
| Lighthouse (mobile) | Performance ≥ 95; Accessibility, Best Practices, SEO = 100 | Enforced in CI with Lighthouse CI budgets |

---

## 12. Accessibility

The Design System checklist (section 13) applies in full. Page-specific requirements:

| ID | Requirement |
|---|---|
| AC-A11Y-01 | One `h1` per page; every section has an `h2` (visually hidden where the design has none) and `aria-labelledby`. |
| AC-A11Y-02 | Skip link is the first focusable element and moves focus to `<main>`. |
| AC-A11Y-03 | Sticky header never hides the focused element: `scroll-padding-top` is set and the header does not hide while focus is inside it. |
| AC-A11Y-04 | Every in-page link moves focus to the target section heading, not just the scroll position. |
| AC-A11Y-05 | axe-core reports zero serious or critical violations on `/`, `/en`, `/privacidade`, `/en/privacy` and the 404, at 390 and 1440 px. |
| AC-A11Y-06 | Full contact flow completes with keyboard only and with VoiceOver (iOS Safari) and NVDA (Firefox). |
| AC-A11Y-07 | At 200% zoom and 320 px width there is no horizontal scrolling and no clipped content. |
| AC-A11Y-08 | With reduced motion, no element translates, scales or draws; all content is present in its final state. |

---

## 13. Analytics

Cookieless analytics only; no personal data in any event. Events go through `lib/analytics.ts` so the provider can change without touching components.

| Event | Properties | Fired when |
|---|---|---|
| `cta_click` | `location` (`header`, `hero`, `menu`, `services`, `faq`, `footer`), `target` (`contact`, `whatsapp`, `services`) | Any CTA is activated |
| `whatsapp_click` | `location` | A WhatsApp link opens |
| `email_click` / `email_copy` | `location` | The mailto link is opened or the address copied |
| `contact_start` | none | First interaction with the form |
| `contact_submit` | `status` (`success`, `invalid`, `rate_limited`, `send_error`), `needs`, `budget` | Server Action returns |
| `faq_open` | `id` | An FAQ item opens |
| `project_click` | `slug` | A portfolio card is opened |
| `locale_switch` | `to` | The language switcher is used |

UTM parameters on the landing URL are stored in `sessionStorage` and attached to the internal notification email, so leads can be attributed without cookies.

---

## 14. Security and privacy

| Area | Requirement |
|---|---|
| Headers (`next.config.ts`) | `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy: camera=(), microphone=(), geolocation=()`; `X-Frame-Options: DENY` |
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' <analytics endpoint>; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. A nonce-based CSP would force every page to render per request; for a static marketing site, this trade-off keeps pages static. Revisit if the site gains authenticated areas. |
| Secrets | Only variables prefixed `NEXT_PUBLIC_` reach the browser. `.env.example` lists every variable with no values. |
| Server Action | Relies on Next.js's built-in origin check; set `experimental.serverActions.allowedOrigins` only if the site sits behind a proxy with a different host. |
| Personal data | Contact data exists only in the email inboxes; nothing is stored in a database in v1. Logs never contain names, emails or message text. |
| Dependencies | Renovate or Dependabot enabled; Next.js security releases applied within 48 hours. |

---

## 15. Testing and quality

| Layer | Tool | Covers |
|---|---|---|
| Unit | Vitest | Contact schema; `whatsappHref`; rate-limit wrapper (mocked); message-key parity between `pt-BR.json` and `en.json`; `projects.ts` rules (client projects need consent, product accents are valid, summaries ≤ 110 chars) |
| End-to-end | Playwright | Anchor navigation and scroll-spy; mobile menu (open, trap, Esc, focus return); language switch preserving hash; FAQ deep link; form validation, success (with `CONTACT_DRY_RUN=1`) and rate-limited states; no-JS form submission; WhatsApp link format with the flag on and absence with it off; reduced-motion emulation |
| Accessibility | `@axe-core/playwright` | AC-A11Y-05 |
| Performance | Lighthouse CI | Section 11 budgets on every pull request |
| Visual | Playwright screenshots at 390, 1024, 1440 px | Both locales; catches layout regressions |
| Manual | Real devices | iOS Safari 17+, Android Chrome, Samsung Internet, desktop Chrome, Safari and Firefox; confirm the chamfer falls back cleanly outside Chromium |

### Definition of done

| # | Condition |
|---|---|
| 1 | Every acceptance criterion in this document passes. |
| 2 | No **[CONFIRM]** marker or `{{PLACEHOLDER}}` remains in shipped copy or config. |
| 3 | Logo assets are the vector redraw, not the JPEG originals. |
| 4 | Privacy policy reviewed by a lawyer. |
| 5 | Email sending domain passes SPF, DKIM and DMARC checks; a test lead has been received and replied to. |
| 6 | CI is green: type check, lint, unit, e2e, axe, Lighthouse budgets. |
| 7 | Production is on a patched Next.js 16.3 release (16.3.7 or later once available). |

---

## 16. Delivery plan

Estimates assume one experienced front-end developer and that brand assets arrive by the end of M1.

| Milestone | Contents | Estimate |
|---|---|---|
| M0 — Brand assets (parallel) | Vector redraw, horizontal lockup, compact symbol, animated SVG with tagged parts, icons, OG default | Designer, 1–2 weeks |
| M1 — Foundation | Repo, tokens in `globals.css`, fonts, next-intl routing with `proxy.ts`, layout shell, header, footer, CI pipeline, preview deploys | 3 days |
| M2 — Sections | S1–S9 with static symbol, all copy in both locales, conditional sections | 5 days |
| M3 — Contact backend | Server Action, schema, Turnstile, rate limiting, emails, privacy page | 3 days |
| M4 — Motion | Hero assembly, pillars thread, header, menu, accordion, form morph, floating WhatsApp, 404 | 3 days |
| M5 — Hardening and launch | SEO, OG images, JSON-LD, analytics, performance and accessibility passes, cross-device QA, content freeze, DNS and email authentication | 3 days |

---

## 17. Open questions

| # | Question | Blocks |
|---|---|---|
| 1 | Domain (`.com.br`, `.com`, or both with a redirect)? | M1 |
| 2 | Legal name, CNPJ, and whether a city/address should be public | M2, footer, JSON-LD |
| 3 | Public contact email and internal lead inbox | M3 |
| 4 | WhatsApp Business number and business hours (site launches with WhatsApp off until then) | Flag only |
| 5 | Launch in English as well, or Portuguese only first? | M2 |
| 6 | Approve the etymology story, the hero headline and the four commitments | M2 |
| 7 | Approve the response-time promise ("one business day") and the MVP timeline range | M2 |
| 8 | Budget ranges for the form (BRL and USD) | M3 |
| 9 | First portfolio items: names, status, accent, images, and client consent where needed | S4 |
| 10 | Any testimonials with written permission? | S6 |
| 11 | Hosting (Vercel `gru1` assumed) and analytics provider | M1 |
| 12 | Social profiles to link | Footer |
| 13 | Who owns the brand and approves changes? | Governance |
