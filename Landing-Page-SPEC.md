# Systagma — Landing Page SPEC

| | |
|---|---|
| Version | **2.0** (supersedes 1.0) |
| Date | September 2026 |
| Depends on | `Brand-Guideline.md` v1.1, `Design-system.md` v2.0 |
| Stack | Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Motion 13 · Anime.js 4.5 · Lenis 1.3 · WebGL2 |
| Primary locale | Portuguese (Brazil), English second **[CONFIRM EN at launch]** |

This is the single brief for rebuilding the Systagma landing page as a scroll-driven experience. It replaces v1's layout and motion sections entirely; the contact backend, SEO, security and privacy sections carry over with small updates. It is written so a creative developer (human or coding agent) can build it without guessing, and a reviewer can check it against numbered acceptance criteria.

### Placeholders

Values in `{{DOUBLE_BRACES}}` must be supplied before launch and never invented during the build: `{{SITE_URL}}`, `{{CONTACT_EMAIL}}`, `{{WHATSAPP_NUMBER}}`, `{{LEGAL_NAME}}`, `{{CNPJ}}`, `{{CITY_UF}}`, `{{HOURS}}`, `{{SOCIAL_*}}`, `{{MEDIA_ORIGIN}}` (where project videos are hosted). Any element whose value is missing **does not render**. No empty lists, empty columns or visible braces.

---

## 1. Summary

### 1.1 Goal

Make visitors feel, within ten seconds, that Systagma builds things with unusual care, then turn that impression into a qualified email conversation. The page must look complete and premium even before any portfolio work exists.

### 1.2 Experience concept: "Order from noise"

A single field of about 6,000 points of light sits behind the entire page. When the page opens, the points are scattered: ideas, noise. The hero asks the visitor to scroll to put them in order, and as they do, the points assemble into the Systagma symbol while a console readout counts `ORDEM 000% → 100%`. From then on, the same points rearrange for each chapter: a calm lattice behind the name's meaning; stacked planes, a network, a chart and the symbol again for the four pillars; a horizontal current behind the portfolio; and finally a single glowing node behind the contact form that brightens with every completed step and bursts back into the symbol when the message is sent.

The name means "things set in order", and the tagline is "ideas to impact through data". The page performs both, with the visitor's own scrolling as the agent.

### 1.3 Success metrics

| Metric | Target (first 90 days) |
|---|---|
| Visitors who reach the contact chapter | ≥ 40% |
| Contact form started → sent | ≥ 35% |
| Hero assembly completed (scroll past 60% of the hero pin) | ≥ 70% of visitors |
| Core Web Vitals (p75, mobile) | LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.05 |
| Field frame rate | ≥ 55 fps on a 2020 MacBook Air and a mid-range 2023 Android phone (after adaptive quality) |

### 1.4 What the new references taught this spec

| Pattern | Seen in | Used here |
|---|---|---|
| Preloader that draws the logo, counts up and lifts a curtain | studiors.be | C0 Boot (short, once per session, skippable) |
| Fixed ambient background layer (dot field, scan, vignette, canvas streaks) | sibaldesign.com | The Field, grain and vignette layers |
| HUD frame: corner brackets, side rails, scroll counter, live clock, progress bar | sibaldesign.com | HUD layer, limited to true live data |
| Headline mixing a grotesk line and a serif line | studiors.be | Hero and chapter titles |
| Manifesto words brightening one by one as you scroll | studiors.be | C2 Manifesto |
| Tall pinned section (400lvh) with a sticky canvas stage walking through four items | mindrobotics.com | C3 Pillars (the four movements) |
| Horizontal pinned project strip with index and progress | sibaldesign.com, studiors.be | C4 Work |
| Stacking process cards | studiors.be | C5 How we work |
| Clip-path wipe on media; pill buttons with fill-wipe hover | mindrobotics.com | Project media; all buttons |
| Cursor with contextual labels | studiors.be | Cursor label |
| Three-step contact form with step counter and pills | studiors.be | C8 Contact |
| Motion videos that play only in view and pause for reduced motion | studiors.be | Project cards |
| `noscript` rule that restores animated content to its final state | studiors.be | Root layout |
| Big display type from a single condensed family (Bebas Neue) | zeynapp.co.uk (the saved file is only an SPA shell; its animations are not inspectable) | Not adopted; noted for scale only |

**Deliberately not adopted:** hiding the whole site from assistive technology until the visitor clicks "Enter" (sibaldesign.com); ambient sound; all-caps everywhere; glitch effects on headlines; a playable game (mindrobotics.com); and animation that hides essential content when JavaScript fails.

---

## 2. Scope

| In scope (v2) | Out of scope (later) |
|---|---|
| One-page scroll experience in PT-BR and EN, with calm mode | Case study pages `/portfolio/[slug]` with shared-element transitions |
| The Field (WebGL2), posters, adaptive quality | Blog / insights |
| Boot sequence, HUD, cursor label, magnetic buttons | CMS (content stays in the repository) |
| Pinned chapters: hero, manifesto, pillars, work strip; stacked cards | Sound design |
| Three-step contact form with email delivery and auto-reply | Live chat |
| WhatsApp click-to-chat behind a flag | |
| Privacy page, 404, SEO, Open Graph, JSON-LD, analytics | |

---

## 3. Tech stack

| Concern | Choice | Version guidance | Notes |
|---|---|---|---|
| Framework | Next.js, App Router | 16.3.x; at least 16.3.7 (security release scheduled 30 Sep 2026) | `proxy.ts` for next-intl; no `next lint` |
| UI | React | 19.x | Server Components by default |
| Styling | Tailwind CSS | 4.x | Tokens in `globals.css` (Design System 12.1) |
| Smooth scroll | `lenis` + `lenis/react` | 1.3.x | Desktop wheel only; native on touch; off in calm mode |
| React motion | `motion` | 13.x (`motion/react`, `motion/react-m`) | Scroll progress, presence, springs, layout |
| Timelines, SVG, text | `animejs` | 4.5.x | `createTimeline`, `splitText`, `scrambleText`, `svg.createDrawable`, `stagger`. Dynamic import only |
| Scene | WebGL2, hand-written | — | No three.js/OGL: one program, points and lines; ~10 KB of our own code |
| i18n | `next-intl` | 4.x | Section 4.1 |
| Validation | `zod` | 4.x | Server-side; client uses `zod/mini` for step checks |
| Email, bot protection, rate limit | Resend + React Email, Cloudflare Turnstile, `@upstash/ratelimit` | current | Section 8 |
| Icons | `lucide-react` | current | 1.5 px stroke |
| Media | Self-hosted MP4 (H.264) + WebM (VP9) for project motion thumbnails | ≤ 1.5 MB each, 6–10 s loops | Served from `{{MEDIA_ORIGIN}}` |
| Tests | Vitest, Playwright, `@axe-core/playwright`, Lighthouse CI | | Section 15 |

GSAP is not needed: every effect in this spec is covered by Motion, Anime.js, Lenis and the custom field.

---

## 4. Architecture

### 4.1 Routing and rendering

Routes: `/` (pt-BR), `/en`, `/privacidade`, `/en/privacy`, and the 404. Pages are prerendered for both locales (`generateStaticParams` plus `setRequestLocale` in each layout and page). All text is server-rendered; the only runtime server code is the contact Server Action. Section anchors use the same English ids in both locales.

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

`proxy.ts` runs next-intl locale negotiation.

Client islands:

| Client island | Loads | Why |
|---|---|---|
| `SmoothScroll` | Immediately after hydration | Lenis |
| `Field` | After hydration, dynamic import | WebGL scene |
| `Boot` | Immediately, only when `data-booted` is absent | Intro sequence |
| `Hud`, `Cursor` | After hydration, dynamic import (≥ 1024 px / fine pointer only) | Chrome |
| Chapter controllers (`HeroStage`, `ManifestoStage`, `PillarsStage`, `WorkStrip`, `StackCards`, `ContactStage`) | With their chapters | Scroll choreography |
| `SiteHeader`, `MobileMenu`, `Accordion`, `ContactForm`, `CopyButton`, `CalmToggle`, `WhatsAppFloat` | With their sections | Interaction |

### 4.2 Project structure

```
systagma-web/
├─ app/
│  ├─ [locale]/ layout.tsx · page.tsx · privacidade/page.tsx · not-found.tsx · opengraph-image.tsx
│  ├─ dev/field/page.tsx          # poster capture (development builds only)
│  ├─ actions/contact.ts
│  ├─ globals.css · sitemap.ts · robots.ts · manifest.ts
├─ components/
│  ├─ brand/       logo-lockup.tsx (SVG) · symbol-vector.tsx · symbol-outline.tsx · pillar-icons.tsx
│  ├─ scene/       field.tsx · field-poster.tsx · grain.tsx · vignette.tsx · hud.tsx · cursor.tsx · boot.tsx
│  ├─ chapters/    hero.tsx · manifesto.tsx · pillars.tsx · work.tsx · how-we-work.tsx
│  │               testimonials.tsx · faq.tsx · contact.tsx · footer.tsx
│  ├─ ui/          button.tsx · magnet.tsx · odometer.tsx · accordion.tsx · pill.tsx
│  │               field-input.tsx · step-form.tsx · copy-button.tsx · calm-toggle.tsx · whatsapp.tsx
│  ├─ layout/      site-header.tsx · mobile-menu.tsx · skip-links.tsx · language-switcher.tsx
│  └─ providers/   smooth-scroll.tsx · motion-provider.tsx
├─ content/        site.ts · chapters.ts · projects.ts · testimonials.ts
├─ lib/
│  ├─ director.ts · calm.ts · motion-tokens.ts · fonts.ts · anchors.ts
│  ├─ hooks/       use-chapter.ts · use-line-reveal.ts · use-scrub.ts · use-safe-rect.ts · use-magnet.ts
│  ├─ field/       renderer.ts · formations.ts · formations.worker.ts · field.vert.glsl · field.frag.glsl · rng.ts
│  └─ (backend)    whatsapp.ts · mailer.ts · rate-limit.ts · turnstile.ts · analytics.ts · jsonld.ts · schema/contact.ts
├─ messages/       pt-BR.json · en.json
├─ public/         brand/*.svg · field/*.webp (posters) · texture/grain.svg · portfolio/*
├─ proxy.ts · next.config.ts · .env.example
```

GLSL files are imported as strings (Turbopack raw loader rule in `next.config.ts`, or `?raw` imports).

### 4.3 Content model

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
  kind: "product" | "client" | "lab";  // lab = internal experiment, always labelled "Experimento"
  status: "live" | "beta" | "building";
  accent: "coral" | "amber" | "lime" | "violet" | "rose"; // products only; client projects use "neutral" styling
  category: Localized;                  // e.g. "SaaS de gestão" / "Management SaaS"
  summary: Localized;                   // ≤ 110 characters
  url?: string;                         // external site, opens in a new tab
  image?: { src: string; alt: Localized };
  video?: { mp4: string; webm: string; poster: string; width: number; height: number };
  size?: "wide" | "narrow";            // rhythm in the horizontal strip
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

`content/chapters.ts` is new. It holds the chapter map (5.1) as data: id, anchor, pin token, formation keys, dim level and HUD name in both locales. The director, HUD and header read from it, so tuning the choreography never means hunting through components.

### 4.4 Environment variables

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
| `NEXT_PUBLIC_MEDIA_ORIGIN` | public | when videos exist | Origin of project videos (added to CSP `media-src`) |

---

## 5. Experience architecture

### 5.1 Chapter map

| # | Chapter | Anchor | Pin | Field keys (progress → formation) | Dim | HUD name (PT / EN) |
|---|---|---|---|---|---|---|
| C0 | Boot | — | — | `symbol` → burst to `noise` | 1 | — |
| C1 | Hero | `#top` | `--pin-hero` | 0 `noise` → 0.6 `symbol` (span 0.6) | 1 | Início / Start |
| C2 | Manifesto | `#about` | `--pin-manifesto` | 0 `symbol` → 0.35 `lattice` | 0.8 | Nome / Name |
| C3 | Pillars | `#services` | `--pin-pillars` | 0 `lattice` → 0.14 `build` → 0.38 `connect` → 0.62 `analyze` → 0.86 `transform` | 1 | Movimentos / Moves |
| C4 | Work | `#work` | computed | 0 `transform` → 0.15 `current` | 0.7 | Portfólio / Work |
| C5 | How we work | `#how-we-work` | stack | 0 `current` → 0.2 `lattice` | 0.35 | Formatos / Formats |
| C6 | Testimonials (conditional) | `#testimonials` | — | `lattice` | 0.35 | Clientes / Clients |
| C7 | FAQ | `#faq` | — | `lattice` | 0.3 | Perguntas / Questions |
| C8 | Contact | `#contact` | — | 0 `lattice` → 0.4 `converge` | 1 | Contato / Contact |
| C9 | Footer | — | reveal | `converge` → `symbol` on success; otherwise stays | 0.6 | — |

Continuity rule: each chapter's first key equals the previous chapter's last formation. If C4 is hidden (no projects), C5's keys start from `transform`.

### 5.2 Layer stack (bottom to top)

Field (or poster) → grain → vignette → chapters → HUD → header and progress line → cursor label and WhatsApp float → menu → boot → skip link. See Design System 6.5.

### 5.3 Global chrome

| Element | Spec |
|---|---|
| Header | Design System 11.1. Nav items: Serviços / Services (`#services`), Portfólio / Work (`#work`, only if projects exist), Como trabalhamos / How we work, FAQ, and the primary button "Iniciar um projeto" / "Start a project" |
| HUD | Design System 10. Desktop only (≥ 1024 px) |
| Cursor label | Design System 11.4. Fine pointers only |
| Grain and vignette | Design System 6.3 |
| Skip links | "Pular para o conteúdo" at the top; "Pular para o próximo capítulo" at the start of each pinned chapter |
| Calm toggle | In the footer and the mobile menu (Design System 11.14) |
| Anchors | All in-page links go through `lib/anchors.ts` (Lenis `scrollTo` with header offset, then focus the chapter heading) |

---

## 6. Chapters

Each chapter lists its purpose, layout, copy, choreography (what happens at each point of the chapter's scroll progress `p`), calm-mode layout and acceptance criteria. Progress `p` runs 0→1 across the chapter's pin (Design System 5.2). Copy marked **[CONFIRM]** is a business promise the founders must approve.

### C0 — Boot (first visit per session)

**Purpose.** Set the tone in under two seconds and show the symbol whole before the page scatters it.

**Conditions.** Runs only when `<html>` has neither `data-booted` nor `data-calm`. Sets `sessionStorage['sys:booted'] = '1'` when it starts.

**Layout.** Full-screen Abyss overlay, centred. The symbol outline (1 px Signal strokes from `symbol-outline.tsx`) at 40vh tall; under it a mono counter `000` in `body-sm` mono; bottom-right a text button "Pular introdução" / "Skip intro".

| Time (ms) | Event | Owner |
|---|---|---|
| 0–900 | Outline segments draw (`svg.createDrawable`, `draw: '0 0' → '0 1'`, stagger 40 ms); counter climbs to 100, gated by readiness (fonts loaded and field initialised), but never waits past 1,400 ms | Anime.js |
| 900–1,300 | Filled segments fade in over the outline; centre node glows | Anime.js |
| 1,300–1,800 | Curtain: two Abyss panels split along the symbol's 30° diagonal and slide apart (`clip-path` polygons); at the same moment the field **bursts** from `symbol` to `noise` behind them | Anime.js + field |
| 1,800 | Overlay removed from the DOM | — |

Skip by the button, `Esc`, any click, wheel or touch-move: jump to the end state in 300 ms. The page underneath is fully rendered and accessible throughout. The overlay is `aria-hidden`; the skip link to content remains the first focusable element.

| ID | Acceptance criterion |
|---|---|
| AC-BOOT-01 | Shown at most once per browser session; never in calm mode. |
| AC-BOOT-02 | Total duration ≤ 1,800 ms; all four skip methods work. |
| AC-BOOT-03 | LCP (p75, mobile) stays ≤ 2.5 s with the boot enabled, measured in the lab and in the field. |
| AC-BOOT-04 | No element outside the overlay is `aria-hidden` or `inert` at any time. |

---

### C1 — Hero

**Purpose.** Say what Systagma is, give one clear next step, and invite the visitor to do the brand's work: put the ideas in order.

**Layout.** Section `height: var(--pin-hero)` with a sticky 100lvh stage. Text zone (cols 1–6): the headline in two lines, lead (max 44ch), buttons, reply note. Field zone (cols 6–12): the symbol assembles here. Bottom-left of the stage: the scroll cue with a 1 px vertical line that draws downward and repeats three times, then stops. HUD bottom-right: `ORDEM 000%`.

```
┌───────────────────────────────────────────────────────────────────────┐
│ [S Systagma]   Serviços  Portfólio  Como trabalhamos  FAQ  PT/EN [Iniciar]│
│┌                                                                     ┐│
│  IDEIAS,                         ·  · ·   ·     ·  ·  (noise)          │
│  postas em ordem.            ·     ·   ·  ·   ·    ·                   │
│                                  ·   ·    ·  ·   ·   ·                 │
│  Lead paragraph…                    → as you scroll, the points        │
│  [Iniciar um projeto] [Ver os quatro movimentos]   form the S here     │
│  Respondemos em até 1 dia útil.                                        │
│  │ Role para pôr em ordem                              ORDEM 042%      │
│└                                                                     ┘│
└───────────────────────────────────────────────────────────────────────┘
```

| Element | PT-BR | EN |
|---|---|---|
| H1 line 1 (grotesk caps, Plex Sans 300, `display-xl`) | Ideias, | Ideas, |
| H1 line 2 (serif italic, Source Serif 4 300, `display-xl`) | postas em ordem. | put in order. |
| Lead (`body-lg`, `fg-muted`) | A Systagma projeta, desenvolve e integra software sob medida, e mede o que ele entrega. Do primeiro rascunho ao impacto que aparece nos dados. | Systagma designs, builds and integrates custom software, and measures what it delivers. From the first sketch to impact you can see in the data. |
| Primary button | Iniciar um projeto | Start a project |
| Secondary button | Ver os quatro movimentos (`#services`), or "Conversar no WhatsApp" when configured | See the four moves, or "Chat on WhatsApp" |
| Note (`body-sm`, `fg-subtle`) | Respondemos em até 1 dia útil. **[CONFIRM]** | We reply within one business day. **[CONFIRM]** |
| Scroll cue (`body-sm`) | Role para pôr em ordem | Scroll to put them in order |
| HUD readout | ORDEM {000–100}% | ORDER {000–100}% |

The H1 is one element; the two lines are `<span class="block">` children, and the text in the DOM is sentence case ("Ideias, postas em ordem.") with `text-transform: uppercase` on line 1 only.

| `p` | Event |
|---|---|
| 0.00 | Field `noise` across the whole viewport; ORDEM 000% |
| 0.00–0.60 | Field morphs `noise` → `symbol` into the field zone; ORDEM = rounded morph × 100; line 1 drifts −3vw on x, line 2 drifts +3vw (transform only) |
| 0.50 | Header hides (scrolling down) |
| 0.60–0.70 | The crisp vector symbol (`symbol-vector.tsx`) cross-fades in over the particles, which dim to 40% beneath it |
| 0.62 | Centre node pulses once (scale 1 → 1.12 → 1, 600 ms, Anime.js); ORDEM 100% flashes in Signal |
| 0.70–1.00 | Hold; scroll cue fades out; the next chapter begins |

Scrolling back reverses everything except the one-time pulse.

**Calm layout.** Normal section (`min-height: 100svh`), `symbol.webp` poster behind, vector symbol shown in the field zone, no HUD counter, no scroll cue.

| ID | Acceptance criterion |
|---|---|
| AC-HERO-01 | The H1 is fully visible on first paint (no opacity, clip or transform before the visitor scrolls). |
| AC-HERO-02 | At 390 × 844 the H1, lead and primary button are visible without scrolling. |
| AC-HERO-03 | ORDEM always equals the rounded assembly progress; the assembly is fully reversible. |
| AC-HERO-04 | Buttons stay clickable and at full opacity throughout the pin. |
| AC-HERO-05 | With WebGL unavailable, the poster and vector symbol render and the chapter still reads correctly. |

---

### C2 — Manifesto (the name)

**Purpose.** Make the name memorable and state the promise, one word at a time.

**Layout.** Pinned (`--pin-manifesto`). Text zone widened to cols 1–8: the statement in `display-md` Source Serif 4 300, 22–26 characters per line. Every word is server-rendered as `<span class="word">` (no layout shift, readable without JavaScript). The follow-up paragraph sits below in `body-lg`. Field: the symbol dissolves into the lattice.

| Element | PT-BR | EN |
|---|---|---|
| H2 (visually hidden) | Sobre a Systagma | About Systagma |
| Statement | Systagma vem do grego: *systēma*, um todo feito de partes, e *tagma*, o que foi posto em ordem. | Systagma comes from Greek: *systēma*, a whole made of parts, and *tagma*, something set in order. |
| Follow-up | É o nosso trabalho. Organizamos pessoas, processos e dados em software que funciona como um só sistema, e mostramos em números o que mudou. | That's our job. We arrange people, processes and data into software that works as a single system, and we show in numbers what changed. |

| `p` | Event |
|---|---|
| 0.00–0.35 | Field `symbol` → `lattice` |
| 0.00–0.80 | Words light from 16% to 100% opacity in reading order (Anime.js timeline scrubbed with `seek`) |
| 0.85–1.00 | Follow-up paragraph fades in (opacity only) |

**Calm layout.** All words at full opacity; follow-up visible; `lattice.webp` poster.

| ID | Acceptance criterion |
|---|---|
| AC-MAN-01 | Word spans are inline, not `aria-hidden`; a screen reader reads the sentence normally. |
| AC-MAN-02 | The Greek words are `<i lang="grc-Latn">`. |
| AC-MAN-03 | A `data-field-safe` rectangle covers the statement; no particle behind it exceeds 15% alpha. |

---

### C3 — Pillars (four movements)

**Purpose.** Show what Systagma sells, organized by the method, with each pillar given its own formation.

**Layout.** Pinned (`--pin-pillars`). Text zone: chapter title at the top in `heading-lg` serif (persistent while pinned), then the odometer numeral, pillar title (`display-md` serif), description (`body-lg`), and four services in two columns. Field zone: the pillar's formation. Bottom: the four-segment rail with pillar names. HUD bottom-right: formation metadata. On phones the stage splits vertically: text on the upper 55%, field below.

```
┌───────────────────────────────────────────────────────────────────────┐
│  Do código ao resultado, em quatro movimentos.                        │
│                                                                       │
│  ╭──╮╭──╮                                ◇ ◇ ◇ ◇  (stacked planes)    │
│  │0 ││2 │  (odometer, serif 200)        ◇ ◇ ◇ ◇                      │
│  ╰──╯╰──╯                                 ◇ ◇ ◇ ◇                     │
│  Conectar                                                             │
│  Integramos o novo ao que você já usa…              NÓS 24 · CONEXÕES 36│
│  • APIs e integrações   • Automação                                   │
│  • Nuvem e DevOps       • Migração de legados                         │
│  ━━━━━━━━━━━━ ━━━━━━━━━━━━ ──────────── ────────────                   │
│  Construir    Conectar     Analisar     Transformar                   │
└───────────────────────────────────────────────────────────────────────┘
```

| Element | PT-BR | EN |
|---|---|---|
| Chapter title | Do código ao resultado, em quatro movimentos. | From code to outcome, in four moves. |
| Lead (shown only during the intro, `p` < 0.12) | Todo projeto passa pelas mesmas quatro etapas. Você pode contratar uma, algumas ou o caminho inteiro. | Every project moves through the same four stages. Bring us in for one, a few, or the whole way. |

Pillar copy (unchanged from v1):

| # | Title | Description (PT-BR) | Description (EN) | Services (PT-BR) | Services (EN) |
|---|---|---|---|---|---|
| 01 | Construir / Build | Software sob medida, web e mobile, com arquitetura pronta para crescer. | Custom web and mobile software, with architecture that's ready to grow. | Plataformas web e SaaS; Aplicativos iOS e Android; Sistemas internos e painéis administrativos; Design de produto (UX/UI) | Web platforms and SaaS; iOS and Android apps; Internal tools and back-offices; Product design (UX/UI) |
| 02 | Conectar / Connect | Integramos o novo ao que você já usa, para que os dados circulem sem retrabalho. | We plug the new into what you already run, so data moves without rework. | APIs e integrações (ERP, CRM, pagamentos); Automação de processos; Nuvem e DevOps; Migração de sistemas legados | APIs and integrations (ERP, CRM, payments); Workflow automation; Cloud and DevOps; Legacy system migration |
| 03 | Analisar / Analyze | Transformamos dados dispersos em indicadores confiáveis e decisões mais rápidas. | We turn scattered data into trustworthy metrics and faster decisions. | Engenharia de dados e pipelines; Dashboards e BI; IA e machine learning aplicados; Métricas de produto | Data engineering and pipelines; Dashboards and BI; Applied AI and machine learning; Product analytics |
| 04 | Transformar / Transform | Usamos o que os dados mostram para evoluir o produto e o negócio. | We use what the data shows to evolve the product and the business. | Discovery e estratégia de produto; Modernização de sistemas; Agentes de IA e automação inteligente; Evolução contínua e sustentação | Product discovery and strategy; System modernization; AI agents and intelligent automation; Continuous improvement and support |

| `p` | Event |
|---|---|
| 0.00–0.12 | Title and lead visible; field `lattice` → `build` begins |
| 0.12 | Lead masks out; pillar 01 masks in; odometer shows 01; rail segment 1 starts filling |
| 0.14 | `build` complete (HUD: `PLANOS 04`) |
| 0.36 | Pillar 02 swaps in; odometer rolls to 02 |
| 0.38 | `connect` complete; edge lines fade in (HUD: `NÓS 24 · CONEXÕES 36`) |
| 0.60 / 0.62 | Pillar 03 swaps in / `analyze` complete (HUD: `SÉRIES 12`) |
| 0.84 / 0.86 | Pillar 04 swaps in / `transform` complete, all teal (HUD: `SISTEMA 01`) |
| 0.86–1.00 | Hold; rail complete |

Pillar text swaps are triggered (500 ms line mask), not scrubbed, so text is never caught half-visible. Formations are scrubbed. HUD values come from the generators' metadata, never from hard-coded strings.

**Calm layout.** An `<ol>` of four blocks, each with its text and its formation poster (`build.webp`, `connect.webp`, `analyze.webp`, `transform.webp`) at 16:9.

| ID | Acceptance criterion |
|---|---|
| AC-PIL-01 | The four pillars are an `<ol>` of four `<li>` with `<h3>`, all present in the DOM in order. Inactive pillars are hidden with opacity only (not `inert`, not `aria-hidden`, not `display: none`) and contain no focusable elements. |
| AC-PIL-02 | The odometer has a visually hidden text equivalent ("Etapa 2 de 4" / "Step 2 of 4"). |
| AC-PIL-03 | Scrolling backwards reverses formations, text, odometer and rail correctly. |
| AC-PIL-04 | A "Pular para o próximo capítulo" link at the start of the chapter jumps to `#work` (or the next present chapter). |

---

### C4 — Work (horizontal strip)

**Purpose.** Show real work, with motion, without leaving the page.

**Conditions.** 3+ visible projects: pinned horizontal strip. 1–2: two large cards in normal flow, no pin. 0: chapter, nav item and HUD entry removed; C5's field keys start from `transform`.

**Layout.** Pinned section whose height equals track width − viewport width + 100lvh (measured with `ResizeObserver`). Stage: title row (title `display-lg` serif, lead `body-lg`), then the track of cards (Design System 11.8) starting at the text-zone edge with 4vw gaps, then a footer row: index `01 / 05`, a 1 px progress bar, and a text link "Pular para Como trabalhamos". Field: `current` streams, speed following scroll velocity. On phones: no pin; the track is a native horizontal scroller with `scroll-snap-type: x mandatory`; the index follows the snapped card.

| Element | PT-BR | EN |
|---|---|---|
| Title | Em movimento | In motion |
| Lead | Produtos próprios, projetos de clientes e experimentos do nosso laboratório. | Our own products, client projects and experiments from our lab. |
| Kind labels | Produto Systagma · Projeto de cliente · Experimento | Systagma product · Client project · Experiment |
| Status | Em produção · Beta · Em desenvolvimento | Live · Beta · In development |
| Skip link | Pular para Como trabalhamos | Skip to How we work |

| `p` | Event |
|---|---|
| 0.00–0.15 | Field `transform` → `current`; title lines mask in |
| 0.05–1.00 | Track translates from 0 to −(track − viewport); each card's media shifts 8% against the track; index and bar update |
| per card | First time ≥ 50% visible: media clip-wipes in and its video plays; below 50% it pauses |

**Calm layout.** Vertical list of cards with poster images; no video autoplay.

| ID | Acceptance criterion |
|---|---|
| AC-WORK-01 | Focusing a card with the keyboard scrolls the page so the card is fully visible. |
| AC-WORK-02 | Videos are muted, `playsinline`, `preload="none"`, have posters, play only in view, and never play in calm mode. |
| AC-WORK-03 | Client projects without `clientConsent` fail a unit test and never render; `lab` items always show the "Experimento" label. |
| AC-WORK-04 | Vertical page scrolling never gets trapped: the pin ends exactly when the last card is fully visible. |

---

### C5 — How we work

**Purpose.** Lower the risk of starting: three clear ways in, and four rules that hold in all of them.

**Layout.** Chapter title (`display-lg` serif) and lead in normal flow, then three **paper cards** that stack (Design System 11.9), then the commitments as four spec rows on the dark surface. Field: `lattice` at 35% brightness. The header switches to its panel background while paper cards are under it.

| Element | PT-BR | EN |
|---|---|---|
| Title | Como trabalhamos juntos | How we work together |
| Lead | Três formas de começar, com as mesmas regras em todas. | Three ways to start, with the same rules in each. |
| Card index (HUD voice) | 01 / 03 … | 01 / 03 … |
| "Ideal para" label | Ideal para | Best for |

Engagement models (card content, unchanged from v1):

| Model | PT-BR | EN | Best for (PT-BR / EN) |
|---|---|---|---|
| Diagnóstico / Discovery sprint | Duas semanas para entender o problema, validar a solução com quem vai usar e sair com escopo, plano e estimativa. Preço fixo. | Two weeks to understand the problem, test the solution with the people who'll use it, and leave with a scope, a plan and an estimate. Fixed price. | Quando a ideia ainda está aberta. / When the idea is still open. |
| Projeto fechado / Fixed-scope project | Escopo, prazo e investimento acordados antes de começar, com entregas a cada duas semanas. | Scope, timeline and budget agreed before we start, with deliveries every two weeks. | MVPs e sistemas com objetivo claro. / MVPs and systems with a clear goal. |
| Time dedicado / Dedicated team | Um time multidisciplinar que trabalha como extensão do seu, em ciclos quinzenais e com as prioridades que você define. | A cross-functional team that works as an extension of yours, in two-week cycles, on the priorities you set. | Produtos em evolução contínua. / Products that keep evolving. |

Commitments (spec rows, unchanged from v1):

| H3 | PT-BR: O que vale em qualquer formato | EN: What holds in every format |
|---|---|---|
| Commitment 1 **[CONFIRM]** | **O código é seu.** Repositórios, contas de nuvem e documentação ficam em nome da sua empresa desde o primeiro dia. | **You own the code.** Repositories, cloud accounts and documentation are in your company's name from day one. |
| Commitment 2 **[CONFIRM]** | **Software funcionando a cada duas semanas.** Você acompanha demonstrações, não relatórios de status. | **Working software every two weeks.** You see demos, not status reports. |
| Commitment 3 **[CONFIRM]** | **Métrica antes da funcionalidade.** Combinamos como medir o sucesso antes da primeira linha de código. | **Metrics before features.** We agree on how success is measured before the first line of code. |
| Commitment 4 **[CONFIRM]** | **Preço e prazo por escrito.** Mudanças de escopo são estimadas e aprovadas antes de entrar no ciclo. | **Price and timeline in writing.** Scope changes are estimated and approved before they enter a cycle. |

**Calm layout.** Cards in normal flow, no sticking or scaling.

| ID | Acceptance criterion |
|---|---|
| AC-HOW-01 | Paper cards meet paper-theme contrast (Ink on Mist 15:1; muted 6.3:1). |
| AC-HOW-02 | The header stays readable over paper cards. |
| AC-HOW-03 | The three models are not numbered as a sequence in the accessible structure (they are alternatives); the `01 / 03` index is `aria-hidden` HUD text. |

---

### C6 — Testimonials (conditional)

Rendered only with at least two approved testimonials. Each quote is a spec row: the quote in `display-md` serif 300 (max 32ch) on the left, attribution on the right (`body-sm`: name, role, company). No carousel. Field `lattice`, dim 0.35. Each quote uses `<figure>`, `<blockquote>` and `<figcaption>`.

---

### C7 — FAQ

**Layout.** Two columns on desktop: left (cols 1–4, sticky) title in `display-lg` serif, lead, and the "didn't find it" line (rendered only if `{{CONTACT_EMAIL}}` is set); right (cols 6–12) the accordion (Design System 11.11). Field `lattice`, dim 0.3.

| Element | PT-BR | EN |
|---|---|---|
| Title | Perguntas frequentes | Common questions |
| Lead | O que costumam nos perguntar antes de começar. | What people usually ask before we start. |
| Fallback line | Não achou sua pergunta? Escreva para {{CONTACT_EMAIL}}. | Didn't find yours? Write to {{CONTACT_EMAIL}}. |

Questions and answers (unchanged from v1):

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

| ID | Acceptance criterion |
|---|---|
| AC-FAQ-01 | `/#faq-codigo` scrolls (through Lenis) to the item and opens it. |
| AC-FAQ-02 | Triggers are buttons inside `<h3>` with `aria-expanded` and `aria-controls`; panels are regions labelled by their trigger; closed panels are out of the tab order. |

---

### C8 — Contact

**Purpose.** Convert. Email is primary; WhatsApp is optional.

**Layout.** Text zone (cols 1–5): title in `display-lg` serif, lead, direct channels (each rendered only if configured: email with copy button, WhatsApp, hours), and "O que acontece depois" as three steps with serif numerals. Field zone (cols 7–12): the glass form panel. Behind the panel, the field converges into a single node that shows through the frosted glass as a soft glow.

| Element | PT-BR | EN |
|---|---|---|
| Title | Conte o que você quer construir. | Tell us what you want to build. |
| Lead | Respondemos por e-mail em até um dia útil com os próximos passos. **[CONFIRM]** | We reply by email within one business day with next steps. **[CONFIRM]** |
| Next steps title | O que acontece depois | What happens next |
| Step 1 | Lemos sua mensagem e respondemos em até um dia útil. | We read your message and reply within one business day. |
| Step 2 | Marcamos uma conversa de 30 minutos para entender o contexto. | We book a 30-minute call to understand the context. |
| Step 3 | Enviamos uma proposta ou um plano de diagnóstico. | We send a proposal or a discovery plan. |
| Form step 1 name | Quem é você? | Who are you? |
| Form step 2 name | O projeto | The project |
| Form step 3 name | Detalhes | Details |
| Step counter | 01 / 03 | 01 / 03 |
| Navigation | Voltar · Continuar · Enviar mensagem | Back · Continue · Send message |
| Step announcement (live region) | Etapa 2 de 3: O projeto | Step 2 of 3: The project |

Fields by step: step 1 holds `name`, `email`, `company`; step 2 holds `needs` and `budget`; step 3 holds `message`, the LGPD notice and the submit button. Hidden fields (`website`, `startedAt`, `source`, `utm`, `locale`) and the Turnstile widget sit in step 3. Field definitions (unchanged from v1):

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

Messages and states (unchanged from v1):

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

| Moment | Field |
|---|---|
| Chapter enters | `lattice` → `converge` over 0–0.4 |
| Step 1 / 2 / 3 completed | Node brightness `uEmit` 0.33 → 0.66 → 1.0 |
| Send succeeds | Burst: points fly out and settle into `symbol` (900 ms); the panel crossfades to the success state |
| Send fails | Node dims to 0.66; error message shown; nothing else moves |

**Calm layout.** Same composition; `converge.webp` poster; steps switch without sliding.

| ID | Acceptance criterion |
|---|---|
| AC-CONT-01 | Without JavaScript, all three steps render as one form and submission works. |
| AC-CONT-02 | "Continuar" validates only the current step. Invalid fields keep their values, get `aria-invalid` and an inline message, and focus moves to the first invalid field; on a valid step, focus moves to the next step's legend and the live region announces it. |
| AC-CONT-03 | A filled honeypot or a submission faster than 3 s returns the normal success UI but sends nothing (section 8.1). |
| AC-CONT-04 | Every text block in the chapter is registered as a safe rectangle; the node never reduces text contrast below 4.5:1. |
| AC-CONT-05 | Empty channels (no email, no WhatsApp, no hours) render nothing: no empty `<dl>`, no empty headings. |

---

### C9 — Footer

Fixed beneath the page and uncovered as the main content scrolls away (Design System 11.13).

| Element | PT-BR | EN |
|---|---|---|
| Lockup | Horizontal SVG lockup spanning the content width | same |
| Tagline (`display-md` serif italic) | Da ideia ao impacto, com dados. | Ideas to impact, through data. |
| Columns | Site · Contato · Social (each only if it has links) | Site · Contact · Social |
| Clock | Brasília {HH:MM:SS} | Brasília {HH:MM:SS} |
| Toggle | Reduzir movimento | Reduce motion |
| Back to top | Voltar ao topo | Back to top |
| Legal | © 2026 {{LEGAL_NAME}} · CNPJ {{CNPJ}} · {{CITY_UF}} · Política de Privacidade (separate inline items; missing values not rendered) | same structure |

### Floating WhatsApp button

Only when `NEXT_PUBLIC_WHATSAPP_NUMBER` is set. Glass surface, monochrome glyph. Appears after C1 ends; hidden during C8, the footer and the open menu. Link format and prefilled messages as in section 8.5.

---

## 7. The Field — implementation

The design intent, uniforms and shaders are in Design System 8 and 12.9. This section fixes the generator parameters, fitting, lifecycle and fallbacks.

### 7.1 Generators

All generators use one seeded PRNG (`mulberry32`, seed `0x5157` + formation index). Output per particle: `x, y, alpha, tint`. Scene units: y in −1…1, x in −aspect…aspect before stage fitting.

| Formation | Algorithm | Parameters | Metadata |
|---|---|---|---|
| `noise` | Uniform random over the full viewport rectangle; alpha 0.35–0.9 | — | — |
| `symbol` | Draw `symbol-vector` paths (no gradients: blue faces `#0000FF`, teal faces `#00FF00`, nodes `#00FF00`) to a 320 × 520 `OffscreenCanvas`; collect filled pixels; pick N with jitter ±0.4 px; tint = 1 for green pixels, 0 for blue; nodes get alpha 1 and 1.4× density | Canvas 320 × 520 | `ORDEM 100%` |
| `lattice` | Points along three families of lines at 90°, 30° and 150°, spacing 0.12 units, inside the field zone, alpha fading towards the zone edges | spacing 0.12 | — |
| `build` | Four isometric rhombus planes (width 1.1, depth 0.64 units) stacked 0.22 units apart; points uniform on each plane; top plane tint 1, others 0.3–0.6 | planes 4 | `PLANOS 04` |
| `connect` | 24 hubs by Poisson-disk sampling (min distance 0.18) in the field zone; each hub linked to its 3 nearest neighbours, deduplicated to 36 edges; 40% of points cluster at hubs (Gaussian σ 0.02), 60% spread along edges | hubs 24, edges 36 | `NÓS 24 · CONEXÕES 36` |
| `analyze` | 12 isometric bars; heights from a fixed series (0.25, 0.4, 0.35, 0.55, 0.5, 0.7, 0.62, 0.8, 0.75, 0.9, 0.85, 1.0 × 0.9 units); 85% of points fill the bars, 15% form a scatter band along the trend | series 12 | `SÉRIES 12` |
| `transform` | `symbol` positions, tint 1 for all, alpha +10% | — | `SISTEMA 01` |
| `current` | 7 horizontal bands; x uniform across 2 × aspect; the vertex shader wraps x by `uFlowOffset`, which the CPU advances by `dt × (0.05 + 0.4 × abs(velocity))` | bands 7 | — |
| `converge` | Points on orbits around one node (radius distribution exponential, mean 0.12), node at the centre of the form panel | — | `ETAPA {n}/03` |

Generation runs in a Web Worker (`formations.worker.ts`) and posts back one `Float32Array`. The `symbol` rasterisation uses `OffscreenCanvas` in the worker; if unavailable, it runs on the main thread during idle time.

### 7.2 Stage fitting

`uStage` places each formation in the field zone:

| Viewport | Field zone (normalized device coordinates) | Scale |
|---|---|---|
| ≥ 1024 px | x 0.05…0.95, y −0.8…0.8 (right side) | 0.85 |
| 768–1023 px | x −0.2…0.95, y −0.8…0.8 | 0.8 |
| < 768 px | x −0.9…0.9, y −0.95…0.0 (lower half) | 0.7 |

`noise` and `current` ignore the zone and fill the viewport. `converge` centres on the form panel's measured position.

### 7.3 Lifecycle

| Step | Detail |
|---|---|
| Mount | `<Field>` is rendered once in the root layout, fixed, `aria-hidden`, behind everything. It renders the current chapter's poster immediately (so there is never an empty background), then dynamic-imports the renderer |
| Decide | Calm mode → stay on posters. No WebGL2 → posters (`field_fallback: no-webgl2`). `navigator.connection.saveData` → posters. Otherwise start the renderer |
| Count | 6,000 (≥ 1024 px), 4,000 (768–1023 px), 2,500 (< 768 px); halved when `navigator.hardwareConcurrency ≤ 4` and `deviceMemory ≤ 4` |
| Start | Once formations are ready, cross-fade from poster to canvas over 600 ms |
| Adapt | First 90 frames: average > 20 ms → halve count, DPR 1; still > 20 ms → posters (`field_fallback: slow`) |
| Idle | Settled formation and still pointer for 2 s → 30 fps; tab hidden → paused |
| Resize | Recompute aspect, stage and safe rects; formations do not regenerate unless the breakpoint tier changes |
| Context loss | Listen for `webglcontextlost`; switch to posters; try one restore |

### 7.4 Director inputs

| Input | Written by |
|---|---|
| `from`, `to`, `mix`, `dim` | `useChapter` in each chapter (Design System 12.6) |
| `velocity` | Lenis bridge |
| `pointer`, `pointerStrength` | A single `pointermove` listener on `window` (fine pointers only), converted to scene units |
| `safe` | `useSafeRect` on every `data-field-safe` element; the four rectangles closest to the viewport centre are sent, in device pixels with a y-flip for `gl_FragCoord` |
| `emit`, `burst` | Contact form (steps, success) and Boot |

### 7.5 Burst

`burst` is an impulse (set to 1, decays with a 900 ms half-life). While it is above 0, the vertex shader adds an outward offset from the stage centre proportional to `burst × (0.5 + aSeed)`. The Boot and a successful form send both use it.

### 7.6 Posters

`/dev/field` renders any formation at 2560 × 1440 (`?capture=symbol`) and downloads a WebP. Commit all nine posters to `public/field/`, each ≤ 60 KB. The `symbol` poster is also the base of the Open Graph image (section 9.2). Posters are regenerated whenever a generator or palette changes.

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

**v2 change — multi-step front end.** The three steps (who you are, the project, details) are one `<form>` with three `<fieldset>`s, so the Server Action, schema and anti-spam rules below are unchanged. Client-side, each step is validated with the same zod schema (`contactSchema.pick(...)`) before advancing. Without JavaScript, all steps render at once and the form submits normally. `startedAt` is set on the first interaction with step 1; the 3-second bot check still applies to the whole form.

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

---

## 9. SEO and discoverability

### 9.1 Metadata

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

### 9.2 Open Graph image

`app/[locale]/opengraph-image.tsx` renders a 1200 × 630 image with `next/og`: the `symbol` field poster (section 7.6) as the background, the localized headline set as two lines (grotesk caps line in IBM Plex Sans Light, serif italic line in Source Serif 4) on the left, and the domain in IBM Plex Mono at the bottom-left. `next/og` cannot read WOFF2, so ship `IBMPlexSans-Light.ttf`, `SourceSerif4-Italic.ttf` and `IBMPlexMono-Regular.ttf` in `assets/fonts/` for this route only.

### 9.3 Structured data

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

### 9.4 Sitemap, robots, extras

| File | Content |
|---|---|
| `app/sitemap.ts` | Landing and privacy URLs for both locales, each with `alternates.languages` |
| `app/robots.ts` | Allow all; point to the sitemap. Search and AI crawlers are allowed on purpose: being cited in AI answers is a discovery channel **[CONFIRM]** |
| `app/manifest.ts` | Name, short name, Abyss `theme_color` and `background_color`, icons from Brand Guideline 3.7 |
| `public/llms.txt` (optional) | A short Markdown summary of who Systagma is, the four pillars and the contact email. It is a proposed convention, cheap to maintain |

---

---

## 10. Performance budget

A motion-rich site must still load fast. These budgets are enforced in CI (Lighthouse CI and a bundle-size check) and verified on real devices.

| Metric | Budget | How it is met |
|---|---|---|
| LCP (p75, mobile) | ≤ 2.5 s | H1 is server-rendered text, never hidden; field starts on a poster; boot overlay is lightweight SVG |
| INP (p75) | ≤ 200 ms | Field runs off React; scroll work happens in Motion value listeners and the render loop, not in React state |
| CLS | ≤ 0.05 | Word spans server-rendered; pins sized with CSS tokens; strip height measured before pin activates; fonts via `next/font` |
| First-load JS, landing route (gzip) | ≤ 200 KB | Next + React; Motion via `LazyMotion`; Lenis (~5 KB) |
| Deferred JS after hydration (gzip) | ≤ 60 KB | Anime.js modules used (~20 KB), field renderer + worker (~12 KB), HUD, cursor, boot |
| Posters | ≤ 60 KB each, one loaded at a time (next ones prefetched on idle) | WebP, 2560 px wide |
| Project videos | ≤ 1.5 MB each, `preload="none"` | Played only in view |
| Field frame time | ≤ 18 ms average on reference devices | Adaptive quality (Design System 7.5) |
| GPU memory | ≤ 40 MB | One texture (≤ 9 × 6,000 × 16 bytes ≈ 0.9 MB) plus framebuffer |
| Lighthouse (mobile) | Performance ≥ 85, Accessibility 100, Best Practices 100, SEO 100 | Performance target is lower than v1's 95 because of WebGL; this trade-off is intentional |

Reference devices: 2020 MacBook Air (M1) in Chrome and Safari; a mid-range 2023 Android phone (e.g., Samsung Galaxy A54) in Chrome; iPhone 12 in Safari; a 2019 Windows laptop with integrated graphics in Edge.

---

## 11. Accessibility and calm mode

The Design System accessibility checklist (section 13) applies. Page-specific requirements:

| ID | Requirement |
|---|---|
| AC-A11Y-01 | Every chapter's content is complete, ordered HTML. Nothing exists only in the canvas, the HUD or the cursor. |
| AC-A11Y-02 | Calm mode (OS setting or toggle) removes Lenis, pins, the canvas, splitting, magnetism, the cursor label and grain animation, and shows posters. Switching the toggle takes effect immediately without reload. |
| AC-A11Y-03 | Keyboard: every interactive element is reachable in DOM order; focus is always visible; focus inside pinned chapters and the strip scrolls the page to keep the element visible. |
| AC-A11Y-04 | Screen readers: pinned chapters read all their content in order (inactive pillars are not `aria-hidden`); decorative layers (`Field`, grain, vignette, HUD, cursor, boot) are `aria-hidden`. |
| AC-A11Y-05 | Contrast: every `data-field-safe` block measures ≥ 4.5:1 against the worst-case local background during automated screenshot checks at each pillar threshold. |
| AC-A11Y-06 | axe-core reports zero serious or critical violations in normal and calm modes, on `/`, `/en`, privacy pages and the 404, at 390 and 1440 px. |
| AC-A11Y-07 | At 200% zoom and 320 px width there is no horizontal scrolling of the page (the work strip scrolls inside its own region only). |
| AC-A11Y-08 | No `aria-hidden` or `inert` on content at any time, including during the boot. |

---

## 12. Analytics

Cookieless, no personal data. Events go through `lib/analytics.ts`.

Base events:

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

New in v2:

| Event | Properties | Fired when |
|---|---|---|
| `boot_skip` | `method` (`button`, `esc`, `click`, `scroll`) | Boot skipped |
| `hero_assembled` | — | Hero assembly reaches 100% for the first time in the session |
| `chapter_view` | `id` | A chapter becomes active for the first time in the session |
| `form_step` | `step` (1–3), `direction` (`next`, `back`) | Form step changes |
| `calm_toggle` | `on` (boolean) | Visitor switches motion off or on |
| `field_fallback` | `reason` (`calm`, `no-webgl2`, `save-data`, `slow`, `context-lost`) | The field falls back to posters |

`field_fallback` rates tell you how many visitors see the posters instead of the live field; if `slow` exceeds 15%, lower default particle counts.

---

## 13. Security and privacy

| Area | Requirement |
|---|---|
| Headers (`next.config.ts`) | `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy: camera=(), microphone=(), geolocation=()`; `X-Frame-Options: DENY` |
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' <analytics endpoint>; worker-src 'self' blob:; media-src 'self' {{MEDIA_ORIGIN}}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. A nonce-based CSP would force every page to render per request; for a static marketing site, this trade-off keeps pages static. Revisit if the site gains authenticated areas. |
| Secrets | Only variables prefixed `NEXT_PUBLIC_` reach the browser. `.env.example` lists every variable with no values. |
| Server Action | Relies on Next.js's built-in origin check; set `experimental.serverActions.allowedOrigins` only if the site sits behind a proxy with a different host. |
| Personal data | Contact data exists only in the email inboxes; nothing is stored in a database in this version. Logs never contain names, emails or message text. |
| Dependencies | Renovate or Dependabot enabled; Next.js security releases applied within 48 hours. |

---

---

## 14. Secondary pages

### 14.1 Privacy policy (`/privacidade`, `/en/privacy`)

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

The privacy page uses the **paper** theme with the field hidden, for comfortable long reading.

### 14.2 404

Dark, centred (one of the two centred layouts). The field shows the `symbol` formation, then on load the points drift 12% apart along their seeds and settle there: the system has come apart. The Anime.js piece is the headline's line-mask reveal. Calm mode: `symbol` poster, no drift.

| Element | PT-BR | EN |
|---|---|---|
| H1 (`display-lg` serif) | Esta parte do sistema não existe. | This part of the system doesn't exist. |
| Body | O endereço pode ter mudado ou nunca ter existido. | The address may have changed, or it never existed. |
| Buttons | Voltar ao início · Iniciar um projeto | Back to home · Start a project |

---

## 15. Testing and quality

| Layer | Tool | Covers |
|---|---|---|
| Unit | Vitest | `resolve()` key interpolation; formation generators (counts, bounds, determinism, metadata); contact schema per step; `whatsappHref`; message-key parity between locales; `projects.ts` rules |
| End-to-end | Playwright | Boot once per session and all skip methods; hero ORDEM counter at scroll positions 0/30/60%; pillar thresholds (text, odometer, rail, HUD metadata); strip keyboard focus; stacked cards; anchor navigation through Lenis; multi-step form (next/back/validation/no-JS submit); calm toggle switching all layers live |
| Accessibility | `@axe-core/playwright` | AC-A11Y-06 in both modes |
| Contrast | Playwright screenshots + pixel sampling | AC-A11Y-05: sample the brightest pixel behind each safe block at each chapter threshold |
| Performance | Lighthouse CI; a Playwright script that records `requestAnimationFrame` intervals for 10 s of scripted scrolling | Section 10 budgets; field frame time |
| Visual | Playwright screenshots at 390 / 1024 / 1440 px, normal and calm | Regressions in each chapter's key frames |
| Devices | Manual pass on the reference devices (section 10) | Feel: scroll smoothness, pin exits, video autoplay, Safari 60 fps cap with Lenis, iOS address-bar resizing with `lvh` |

### Definition of done

| # | Condition |
|---|---|
| 1 | Every acceptance criterion in this document passes in normal and calm modes. |
| 2 | Reference-device frame rate ≥ 55 fps after adaptive quality; no long tasks > 100 ms during scrolling. |
| 3 | No **[CONFIRM]** marker or `{{PLACEHOLDER}}` remains in shipped copy; unset values render nothing. |
| 4 | Logo assets are the vector redraw; the animated symbol SVG has tagged segments, connector and nodes. |
| 5 | All nine posters committed and current. |
| 6 | Contact flow verified end to end (email received, auto-reply received, SPF/DKIM/DMARC passing). |
| 7 | Privacy policy reviewed by a lawyer. |
| 8 | Production runs a patched Next.js 16.3 release (16.3.7 or later). |

---

## 16. Delivery plan

Estimates assume one senior creative developer comfortable with WebGL. Brand assets (M0) run in parallel.

| Milestone | Contents | Estimate |
|---|---|---|
| M0 — Assets | Vector logo redraw; horizontal lockup; animated symbol SVG with tagged parts; symbol outline SVG; at least three portfolio items (products, client work with consent, or labelled lab experiments) with 6–10 s motion loops | Designer, 2 weeks |
| M1 — Foundation | New tokens and fonts; calm mode; Lenis provider and anchors; director; chapter map; header, HUD, cursor, grain; CI with budgets | 4 days |
| M2 — Field | Renderer, shaders, worker generators for all nine formations, stage fitting, safe rects, pointer, burst, adaptive quality, posters route | 6 days |
| M3 — Chapters (static) | All chapter layouts in normal and calm modes with final copy; paper cards; multi-step form UI | 5 days |
| M4 — Choreography | Boot; hero assembly; manifesto words; pillars with odometer and rail; work strip; stacked cards; contact converge/burst; footer reveal; micro-interactions | 7 days |
| M5 — Backend & content | Contact action, emails, Turnstile, rate limit; privacy page; SEO, OG from poster, JSON-LD; analytics | 3 days |
| M6 — Hardening | Performance and device passes; accessibility and contrast automation; cross-browser fixes; content freeze; launch | 5 days |

Total development: about six weeks for one developer, plus the designer's asset work.

---

## 17. Open questions

| # | Question | Blocks |
|---|---|---|
| 1 | Approve the "Order from noise" concept and the hero scroll cue ("Role para pôr em ordem") | M3 |
| 2 | First three portfolio items and their media; which are client work (consent needed) and which are lab experiments | C4 |
| 3 | Where project videos are hosted (`{{MEDIA_ORIGIN}}`) | C4, CSP |
| 4 | Licence a commercial display serif, or launch with Source Serif 4? | M1 |
| 5 | The v1 open questions still stand: domain, legal name and CNPJ, contact email, WhatsApp number and hours, EN at launch, response-time promise, budget ranges, testimonials, social profiles, hosting, brand owner | Various |

---

## 18. Carry-over fixes from the current build

The last rendered HTML shows these issues. Fix them regardless of the v2 redesign.

| Seen in the build | Fix |
|---|---|
| Header and footer logo is `symbol-56.png` plus "Systagma" typed in Urbanist | Use the horizontal SVG lockup component; remove Urbanist entirely |
| Hero symbol is a `next/image` PNG with `loading="lazy"` above the fold | Replaced by the field and `symbol-vector.tsx`; never lazy-load above-the-fold media |
| Contact renders an empty `<dl>` when no channels are configured | Render the channels block only if at least one channel exists |
| Footer renders a "Contato" heading with no links | Render a column only if it has links |
| Header always shows an 85% navy bar with blur and a border | Transparent by default; panel background only over paper surfaces (Design System 11.1) |
| No motion beyond CSS transitions | This spec |
