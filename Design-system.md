# Systagma — Design System

| | |
|---|---|
| Version | **2.0** (supersedes 1.0) |
| Date | September 2026 |
| Implements | `Brand-Guideline.md` v1.1 |
| Stack target | Next.js 16 · React 19 · Tailwind CSS 4 · Motion 13 (`motion/react`) · Anime.js 4.5 · Lenis 1.3 · WebGL2 (no 3D library) |
| Accessibility target | WCAG 2.2 AA, with a first-class **calm mode** |

### What changed from v1 and why

Version 1 was built on restraint: one animation on load, no smooth scroll, flat surfaces, light sections. Built faithfully, it produced a correct but forgettable page. Version 2 keeps the brand (navy, teal, the S, the four verbs) and changes how it is staged, following four scroll-driven reference sites (studiors.be, sibaldesign.com, mindrobotics.com, zeynapp.co.uk).

| Area | v1 | v2 |
|---|---|---|
| Concept | A tidy page about order | **Order from noise**: a live particle field that the visitor puts in order by scrolling |
| Background | Flat colour per section | One fixed WebGL scene behind the entire page, changing formation per chapter |
| Layout | Alternating light/dark sections | Dark, continuous "chapters", several pinned, with one paper (light) moment |
| Type | Urbanist SemiBold + Plex Sans | Source Serif 4 (editorial voice) + IBM Plex Sans (grotesk voice) + IBM Plex Mono (console voice) |
| Motion | One load animation; no scroll effects | Six motion layers: smooth scroll, scene, chapter choreography, reveals, micro-interactions, HUD |
| Accent | Teal paint (buttons) | Teal as **light**: emitted by the field and by small precise marks; buttons are Mist |
| Chrome | Plain header | Header plus a thin HUD frame that shows live, true data |
| Reduced motion | Animations off | A designed **calm mode**, switchable by the OS setting or by a visible toggle |

---

## 1. Principles

**One scene, many formations.** The whole page happens in front of a single field of data points. Chapters do not bring their own decorations; they ask the field for a formation.

**The visitor puts things in order.** Scroll is the verb. The hero literally asks people to scroll to assemble the symbol, and the pillars change form as they read. Motion is tied to the reader's hand, so it never feels like decoration running on its own.

**Editorial type, console precision.** Large, calm serif and grotesk headlines carry the luxury; a small monospaced HUD carries the engineering. The two never mix inside one line.

**Teal is light, not paint.** Teal appears as emitted light (particles, the centre node, thin active marks, focus on dark). Surfaces are navy; buttons are Mist.

**Rich, but budgeted.** Every layer has a frame-time and byte budget, an adaptive quality path, and a static fallback. A beautiful site that stutters is not luxury.

**Calm mode is a design, not a switch-off.** Everything that moves has a composed still state. People who ask for less motion get the same story as a sequence of stills.

---

## 2. Token architecture

Three tiers, as before: primitives → semantic → component, consumed through Tailwind 4 `@theme`. The default theme is now **dark**; the only other theme is **paper**, used by the stacked cards in "How we work" and by the privacy page.

| Tier | Example |
|---|---|
| Primitive | `--color-slate-975: #020A17` |
| Semantic | `--color-surface` → Void on dark, Mist on paper |
| Component | `--field-safe-alpha: 0.15` |

---

## 3. Colour

### 3.1 Surfaces

| Name | Hex | Token | Role |
|---|---|---|---|
| **Void** | `#020A17` | `slate-975` | New base of the page. The field is drawn on it. |
| **Abyss** | `#031227` | `slate-950` | Panels, menu overlay, footer |
| **Ink** | `#072036` | `slate-900` | Raised elements, text on paper |
| **Glass** | `rgb(3 18 39 / 0.6)` + 24 px blur | — | Contact form panel over the field |
| **Paper** | `#F1F4F8` | `slate-50` | Stacked engagement cards, privacy page |

Void is a slightly deeper, bluer navy than Abyss (OKLCH L 0.14 vs 0.18). Layering Void → Abyss → Ink gives depth without shadows.

### 3.2 Lines and text on dark

| Token | Value | Contrast on Void | Use |
|---|---|---|---|
| `fg` | `#F1F4F8` | 17.99 | Headlines, body |
| `fg-muted` | `#B6BFC9` | 10.66 | Leads, descriptions |
| `fg-subtle` | `#8F99A6` | 6.87 | Meta, HUD labels |
| `line` | Mist at 8% | 1.17 | Decorative hairlines |
| `line-strong` | Mist at 16% | 1.47 | HUD brackets, card borders |
| `line-input` | `#6A7684` (slate-500) | ≈ 4.3 | Form underlines (meets 3:1 for UI boundaries) |

### 3.3 Light (accent)

| Token | Hex | Use |
|---|---|---|
| `accent` | `#67E0D6` (teal-300, **Signal**) | Links, active HUD values, progress lines, focus-adjacent marks. 12.48 on Void. |
| `emit` | `#03B7B7` (teal-500, **Node**) | Particle tint, centre node glow, selected pill fill |
| `emit-cool` | `#1B84E0` (blue-500) | Particle tint for "shaded" faces of formations |
| `focus` | `#86C4FE` (blue-300) | Focus rings on dark (10.72 on Void) |

### 3.4 Buttons

| Button | Rest | Hover |
|---|---|---|
| Primary | Mist fill, Void text (17.99) | Fill wipes to Signal from the left; Void text stays (12.48) |
| Secondary | 1 px `line-strong` outline, Mist text | Fill wipes to Mist at 8% |

### 3.5 Paper theme

| Token | Value | Contrast |
|---|---|---|
| `surface` | Mist `#F1F4F8` | |
| `fg` | Ink `#072036` | 15.0 |
| `fg-muted` | `#4D5B6A` | 6.3 |
| `accent` | `#00737A` (teal-700) | 5.38 |
| `line` | `#D3DAE2` | |
| `focus` | `#0268BB` (blue-600) | 5.43 |

### 3.6 The particle-over-text rule

A full-brightness Signal particle behind Mist body text gives a contrast of only **1.44:1**. The same particle at 15% alpha gives **13.55:1**. Therefore, particles that fall inside a registered text area render at 15% of their alpha (section 8.6). Formations are also laid out away from text columns (section 5.3). Both rules apply; neither is optional.

### 3.7 Other colour tokens

Status tokens, the portfolio accent set and the full teal, blue and slate scales are listed in Appendix A. New primitive in v2: `slate-975 #020A17` (Void).

---

## 4. Typography

### 4.1 Three voices

| Voice | Family | Weights | Role |
|---|---|---|---|
| **Editorial** | Source Serif 4 (variable, optical size 8–60, italic) | 300–400 | Headline lines, manifesto, pillar titles, FAQ questions, big numerals |
| **Grotesk** | IBM Plex Sans | 300, 400, 500 | Uppercase display lines, body, interface |
| **Console** | IBM Plex Mono | 400, 500 | HUD only: live values, indices, step counters |

Urbanist is retired from the interface. The wordmark keeps its own geometric drawing; headlines no longer imitate it. All three families are SIL OFL and self-hosted with `next/font`. For a commercial upgrade of the editorial voice, choose a display serif with a true optical-size or display cut (e.g., GT Sectra Display or Tiempos Headline) and keep the same scale.

### 4.2 Scale

Fluid between 360 px and 1440 px viewports.

| Token | Mobile → desktop | CSS value | Line height | Tracking | Voice |
|---|---|---|---|---|---|
| `numeral-xl` | 120 → 320 px | `clamp(7.5rem, 3.333rem + 18.5vw, 20rem)` | 0.8 | −0.04em | Editorial 200–300, lining tabular figures |
| `display-xl` | 52 → 168 px | `clamp(3.25rem, 0.833rem + 10.7vw, 10.5rem)` | 0.9 | −0.04em (grotesk caps) / −0.02em (serif) | Hero only |
| `display-lg` | 44 → 120 px | `clamp(2.75rem, 1.167rem + 7.04vw, 7.5rem)` | 0.95 | −0.03em | Chapter titles, contact title |
| `display-md` | 34 → 72 px | `clamp(2.125rem, 1.333rem + 3.52vw, 4.5rem)` | 1.08 | −0.02em | Manifesto, pillar titles, card titles |
| `heading-lg` | 30 → 48 px | `clamp(1.875rem, 1.5rem + 1.67vw, 3rem)` | 1.1 | −0.015em | Sub-chapter headings |
| `heading-md` | 24 → 32 px | `clamp(1.5rem, 1.333rem + 0.741vw, 2rem)` | 1.2 | −0.01em | FAQ questions (serif), commitment titles |
| `heading-sm` | 20 → 24 px | `clamp(1.25rem, 1.167rem + 0.37vw, 1.5rem)` | 1.25 | 0 | Project names, step titles |
| `body-lg` | 18 → 21 px | `clamp(1.125rem, 1.0625rem + 0.278vw, 1.3125rem)` | 1.55 | 0 | Leads, form inputs |
| `body-md` | 16 → 18 px | `clamp(1rem, 0.958rem + 0.185vw, 1.125rem)` | 1.65 | 0 | Body |
| `body-sm` | 14 → 15 px | `clamp(0.875rem, 0.854rem + 0.0926vw, 0.9375rem)` | 1.5 | 0.005em | Labels, nav |
| `caption` | 13 px | `0.8125rem` | 1.45 | 0.01em | Legal |
| `hud` | 11 px | `0.6875rem` | 1.3 | 0.08em, uppercase | Console voice only |

### 4.3 Rules

| Rule | Detail |
|---|---|
| Contrast by line, not by word | A headline may set one **whole line** in grotesk caps and the next **whole line** in serif italic (the hero). Never switch voice, weight or colour for a single word inside a line. |
| Uppercase | Allowed in two places only: grotesk display lines and the HUD. Never for buttons, labels or navigation. |
| The HUD tells the truth | Console text shows only live, real data (scroll percentage, chapter, Brasília time, formation metadata, form step). No decorative codes, fake coordinates or "SYS.LOADING" strings. |
| Numerals | Big numerals use Source Serif 4 at weight 200–300 with lining, tabular figures. HUD numbers are zero-padded (`042%`, `03 / 07`). |
| Italics | Serif italic for whole lines and for the transliterated Greek words (a typographic convention). |
| Measure | Body 60–68ch; manifesto 22–26ch per line at `display-md`. |
| Wrapping | `text-wrap: balance` on display and headings; `pretty` on paragraphs. |

---

## 5. Space, layout and the stage

### 5.1 Grid and space

The 12/8/4-column grid, breakpoints and 4 px spacing scale are listed in Appendix B. New or changed tokens:

| Token | Value | Use |
|---|---|---|
| `--space-section` | `clamp(6rem, 3.333rem + 11.9vw, 14rem)` | Padding of non-pinned chapters |
| `--space-gutter` | `clamp(1.25rem, 0.333rem + 4.07vw, 4rem)` | Page margin |
| `--header-h` | 72 px (64 px < 1024) | Offsets for sticky stages and anchors |
| `--hud-inset` | 16 px | Distance of HUD brackets from viewport edges |

### 5.2 Pinned chapters

A pinned chapter is a tall section (`height: N lvh`) containing a stage (`position: sticky; top: 0; height: 100lvh`). Use `lvh` for the section and the stage so mobile browser bars do not cause jumps. Pin lengths are tokens so choreography can be tuned in one place:

| Token | Desktop | Mobile (< 768) | Chapter |
|---|---|---|---|
| `--pin-hero` | 200lvh | 150lvh | Hero assembly |
| `--pin-manifesto` | 250lvh | 180lvh | Word-by-word manifesto |
| `--pin-pillars` | 500lvh | 400lvh | Four pillars |
| `--pin-work` | computed from track width | not pinned (native swipe) | Horizontal portfolio strip |

### 5.3 Stage zones

On desktop every stage splits into a **text zone** (columns 1–5) and a **field zone** (columns 6–12). Formations are generated to fit the field zone; text never sits over a dense part of the field. On mobile the field sits behind the text at reduced density and the safe-area rule (3.6) carries the contrast.

```
Desktop stage (100lvh)
┌──────────────────────────────────────────────────────────────┐
│ ┌─ HUD ─┐                                          ┌─ HUD ─┐ │
│  TEXT ZONE (cols 1–5)      │   FIELD ZONE (cols 6–12)        │
│  headline, copy, CTA       │   formation drawn here          │
│                            │                                 │
│ └─ HUD ─┘   progress rail ───────────────────────  └─ HUD ─┘ │
└──────────────────────────────────────────────────────────────┘
```

### 5.4 Alignment

Left-aligned throughout. The two exceptions are the boot sequence and the 404 page, which are centred compositions.

---

## 6. Shape, surface, texture and layers

### 6.1 Shape

| Token | Value | Use |
|---|---|---|
| `radius-xs` | 4 px | Checkbox marks |
| `radius-sm` | 6 px | Pills, inputs on paper |
| `radius-md` | 12 px | Glass panel, paper cards |
| `radius-full` | 9999 px | Cursor, nodes, floating button |
| **Chamfer** | `corner-shape: bevel` at 10 px, falling back to 6 px round | Primary and secondary buttons, project media frames |

### 6.2 Surfaces

| Surface | Recipe |
|---|---|
| Glass panel | `background: rgb(3 18 39 / 0.6); backdrop-filter: blur(24px) saturate(1.2); border: 1px solid var(--line-strong); border-radius: 12px`. Mist text on it measures 17.4:1. |
| Paper card | Mist fill, Ink text, `radius-md`, no border, `shadow-sheet` |
| Scrim | Radial gradient from Void at 70% to transparent, placed behind text zones on mobile |

### 6.3 Texture

| Layer | Recipe | Motion |
|---|---|---|
| Grain | SVG `feTurbulence` noise tile (base frequency 0.8, 2 octaves) as a data URI, `opacity: 0.04`, `mix-blend-mode: overlay`, fixed, full viewport | Steps between 8 offsets at 8 fps; static in calm mode |
| Vignette | `radial-gradient(ellipse at 50% 45%, transparent 55%, rgb(2 10 23 / 0.7) 100%)`, fixed | None |

### 6.4 Elevation

Two shadows only: `shadow-sheet: 0 -24px 64px -24px rgb(2 10 23 / 0.6)` (paper cards stacking over each other) and `shadow-float: 0 8px 24px -6px rgb(2 10 23 / 0.5)` (floating WhatsApp button).

### 6.5 Layers

| Layer | z-index | Contents |
|---|---|---|
| Field | 0 | Fixed WebGL canvas (or poster in calm mode) |
| Texture | 1 | Grain and vignette |
| Content | 10 | Chapters |
| HUD | 40 | Corner brackets, rails, readouts (`pointer-events: none`) |
| Header | 50 | Logo, navigation, CTA, progress line |
| Cursor & float | 60 | Cursor label, WhatsApp button |
| Menu | 80 | Mobile menu overlay |
| Boot | 90 | First-visit intro |
| Skip link | 100 | Skip link |

---

## 7. Motion architecture

### 7.1 Six layers

| Layer | What it is | Owner |
|---|---|---|
| **L0 Scroll** | Smooth, inertial scrolling; the single source of scroll position and velocity | Lenis |
| **L1 Scene** | The Field: a fixed particle system that changes formation per chapter | Custom WebGL2 |
| **L2 Choreography** | Pinned chapters whose content is scrubbed by scroll progress | Motion (`useScroll`, `useTransform`) driving Anime.js timelines via `seek()` |
| **L3 Reveals** | Line-mask headline reveals, word lighting, media wipes | Anime.js (`splitText`, `animate`) |
| **L4 Interaction** | Magnetic buttons, fill-wipe hovers, text roll, cursor label, menu, accordion, form steps | Motion |
| **L5 HUD** | Live readouts, label scrambles, progress lines | Motion values + Anime.js `scrambleText` |

### 7.2 One scroll source

All scroll-linked progress is read from Motion's `useScroll` (which reads native scroll, which Lenis drives). Anime.js timelines that must follow scroll are created with `autoplay: false` and moved with `timeline.seek(progress * timeline.duration)` from a Motion value listener. Anime's own `onScroll` observer is not used, so two systems never disagree about where the page is.

A tiny module, the **director** (`lib/director.ts`), holds per-frame scene state in a plain mutable object (current chapter, chapter progress, formation pair, mix, velocity, pointer, safe rects, form progress). The field's render loop reads it every frame; React components write to it from Motion value listeners. React state is used only for discrete changes (chapter id) so the HUD and header re-render a handful of times per page, not 60 times a second.

### 7.3 Tokens

| Duration | ms | Use |
|---|---|---|
| `instant` | 100 | Colour swaps |
| `fast` | 200 | Press, small toggles |
| `base` | 400 | Accordion, menu items, form step slide |
| `slow` | 700 | Line reveals, fill wipes, card lifts |
| `cinematic` | 1200 | Boot phases, chapter title reveals |

| Ease | Cubic-bezier | Anime.js | Use |
|---|---|---|---|
| `ease-out-expo` | `(0.16, 1, 0.3, 1)` | `outExpo` | Reveals, text roll, arrivals |
| `ease-in-out-quart` | `(0.76, 0, 0.24, 1)` | `inOutQuart` | Wipes, curtains, strip snapping |
| `ease-out-quint` | `(0.22, 1, 0.36, 1)` | `outQuint` | Micro-interactions |

| Spring | Motion config | Use |
|---|---|---|
| `spring-cursor` | `stiffness 500, damping 40, mass 0.4` | Cursor follower |
| `spring-magnet` | `stiffness 220, damping 18` | Magnetic buttons |
| `spring-ui` | `stiffness 420, damping 36` | Header, menu, odometer digits |

| Scroll | Value |
|---|---|
| Lenis `lerp` | 0.085 (desktop wheel) |
| Lenis on touch | Off (`syncTouch: false`): native scrolling on phones and tablets |
| Morph window | A formation change is spread over 30% of the chapter segment that contains it |
| Stagger | 60 ms per item, max 8 items; particles use a per-particle delay of up to 35% of the morph |

### 7.4 Calm mode

Calm mode is on when the OS reports `prefers-reduced-motion: reduce` **or** the visitor turns motion off with the toggle in the footer and the mobile menu (stored in `localStorage` as `sys:calm`). In calm mode:

| Layer | Calm behaviour |
|---|---|
| L0 | Lenis is not started; native scroll |
| L1 | The canvas is not created. Each chapter shows its **poster** (a still of its formation, WebP) as the fixed background, swapped without animation when the chapter changes |
| L2 | Pins are removed: every chapter uses its static, stacked layout at natural height |
| L3 | All content is visible from the start; no splitting |
| L4 | Hover colour changes remain; magnetism, text roll and the cursor label are off |
| L5 | HUD values update without scramble; the grain is static |

### 7.5 Performance rules

Animate only `transform`, `opacity`, `clip-path`, SVG stroke properties and shader uniforms. Never animate layout properties except accordion height through Motion. The render loop pauses when the tab is hidden and when the field is fully settled and the pointer is still (it then ticks at 30 fps for the slow drift). `will-change` is set only while an element is animating. Anime.js, the field and the cursor are dynamically imported after hydration.

**Adaptive quality.** The field measures the average frame time over its first 90 frames. Above 20 ms it halves the particle count and caps device pixel ratio at 1; if still above 20 ms, it switches to posters (as in calm mode, but pins and reveals stay on).

---

## 8. The Field

### 8.1 Concept

Thousands of small points of light on Void. At the top of the page they are scattered: ideas, noise. As the visitor scrolls, they assemble into the Systagma symbol, then rearrange into one formation per chapter. The field is the site's main visual asset, so it must look finished even before any portfolio imagery exists.

### 8.2 Formations

Every formation is generated in code (no downloads) from a seeded random source, so it is identical on every visit. Each generator also returns **metadata** (counts) that the HUD may display.

| Id | Name (PT / EN) | Shape | Metadata shown in HUD |
|---|---|---|---|
| `noise` | Ruído / Noise | Points scattered across the whole viewport with slow curl-noise drift | — |
| `symbol` | Símbolo / Symbol | Points sampled from the vector symbol; tint follows the symbol's blue and teal faces | `ORDEM 100%` |
| `lattice` | Malha / Lattice | Points along a 30° isometric grid in the field zone | — |
| `build` | Construir / Build | Four stacked isometric planes, points spread across each plane | `PLANOS 04` |
| `connect` | Conectar / Connect | 24 hubs with points clustered at hubs and strung along 36 edges; edges also drawn as faint lines | `NÓS 24 · CONEXÕES 36` |
| `analyze` | Analisar / Analyze | 12 isometric bars of different heights plus a scatter band | `SÉRIES 12` |
| `transform` | Transformar / Transform | The symbol again, fully teal, with a slow inward flow | `SISTEMA 01` |
| `current` | Corrente / Current | Horizontal streams whose speed follows scroll velocity | — |
| `converge` | Convergir / Converge | Everything orbiting a single node behind the contact form | `ETAPA 01/03` (from the form) |

### 8.3 Storage and morphing

All formations for N particles are packed into one `RGBA32F` texture, 128 texels wide, one block of `ceil(N / 128)` rows per formation. Each texel holds `x, y` (scene units: y in −1…1, x in −aspect…aspect), `alpha` and `tint` (0 = blue, 1 = teal). The vertex shader reads the "from" and "to" texels with `texelFetch` using `gl_VertexID` and mixes them with a per-particle delay, so a morph ripples through the field instead of moving as one block.

### 8.4 Uniforms (written by the director every frame)

| Uniform | Meaning |
|---|---|
| `uFrom`, `uTo`, `uMix` | Formation pair and progress between them |
| `uTime` | Seconds since start |
| `uVelocity` | Smoothed Lenis velocity, clamped to −1…1 |
| `uPointer`, `uPointerStrength` | Pointer in scene units; repulsion strength (0 on touch) |
| `uStage` (vec4) | Offset and scale that fit the formation into the field zone |
| `uDim` | Global brightness per chapter (e.g., 0.35 behind the FAQ) |
| `uSafe[4]`, `uSafeCount` | Text rectangles in device pixels (section 8.6) |
| `uEmit` | Brightness of the converge node (grows with form progress; flashes on success) |
| `uBurst` | Outward impulse (Boot, form success), decays with a 900 ms half-life |
| `uFlowOffset` | Accumulated horizontal offset for `current` (CPU adds `dt × (0.05 + 0.4 × abs(velocity))` each frame, so speed changes never jump) |

### 8.5 Rendering

`GL_POINTS`, round soft sprites (discard outside radius, smoothstep edge), premultiplied alpha, additive blending, point size 1.6–3.2 CSS px scaled by device pixel ratio. Colour mixes `emit-cool` (#1B84E0) to `emit` (#03B7B7) by tint, with a slight lift towards Signal for the brightest points. The `connect` formation adds a `GL_LINES` pass over hub pairs at up to 18% alpha. Particle counts: 6,000 on desktop, 4,000 on tablets, 2,500 on phones. Device pixel ratio is capped at 1.5 (1 on phones).

### 8.6 Safe rectangles

Any element marked `data-field-safe` reports its bounding box to the director on scroll and resize (up to four at a time, nearest to the viewport centre). Points inside those rectangles draw at 15% alpha. This is what keeps body text above 4.5:1 when a formation passes behind it (section 3.6).

### 8.7 Pointer

On devices with a fine pointer, points within a small radius of the cursor are pushed away and return with a spring. The effect is subtle (maximum displacement about 3% of the viewport height) and it is off on touch and in calm mode.

### 8.8 Posters

A development-only route (`/dev/field?capture=<id>`) renders each formation at 2560 × 1440 on Void and saves a WebP. The posters (`/public/field/<id>.webp`, target ≤ 60 KB each) are the calm-mode background, the adaptive-quality fallback, the no-WebGL fallback and the source for Open Graph imagery.

---

## 9. Motion pattern catalogue

| Pattern | Trigger | What moves | Timing | Owner |
|---|---|---|---|---|
| **Boot** | First visit per session | Symbol outline draws; counter 000→100; segments fill; curtain splits along the 30° diagonal | ≤ 1,800 ms total; skippable | Anime.js timeline |
| **Burst** | End of Boot | Field jumps from `symbol` to `noise` (points fly out) | 900 ms, `outExpo` | Field |
| **Assemble** | Scroll through the hero pin | Field `noise` → `symbol`; HUD `ORDEM` counts 000→100; headline lines drift apart | Scrubbed over 0–60% of the pin | Motion → director |
| **Word light** | Scroll through the manifesto pin | Each word goes from 16% to 100% opacity in reading order | Scrubbed | Motion → Anime.js `seek` |
| **Line mask** | Chapter titles enter the viewport | Lines slide up from a clipping mask | 700 ms, stagger 80 ms, `outExpo`, once | Anime.js `splitText` |
| **Odometer** | Pillar change | Each digit of the big numeral rolls to its new value | `spring-ui` | Motion |
| **Morph** | Chapter or pillar threshold | Field formation change, rippling by particle | Scrubbed over the morph window | Field |
| **Strip** | Scroll through the work pin | Horizontal track translates; cards' media parallax by 8% | Scrubbed | Motion |
| **Stack** | Scroll through How we work | Each paper card sticks; the one beneath scales to 0.94 and darkens 12% | Scrubbed | Motion |
| **Clip wipe** | Project media enters | `clip-path: inset(100% 0 0 0)` → `inset(0)` | 900 ms, `inOutQuart`, once | CSS transition toggled by observer |
| **Fill wipe** | Button hover/focus | Fill slides in from the left; label rolls up and is replaced by a copy | 600 ms, `inOutQuart` | CSS + Motion |
| **Magnet** | Pointer within 80 px of a primary button | Button follows pointer up to 8 px | `spring-magnet` | Motion |
| **Cursor label** | Pointer over `data-cursor` elements | A 10 px ring grows to 72 px and shows a short label | `spring-cursor` | Motion |
| **Scramble** | HUD value changes | Characters scramble into the new label | 400 ms | Anime.js `scrambleText` |
| **Converge** | Contact chapter; each completed form step | Field gathers into one node; node brightens per step; success bursts into `symbol` | Scrubbed + 900 ms burst | Field |
| **Footer reveal** | End of page | Main content lifts away, uncovering the fixed footer beneath | Native scroll | CSS |

**Not used:** fade-and-rise on every block, per-letter headline animation, parallax on text, marquees of duplicated content, sound, anything that hides content from assistive technology until the visitor clicks "enter".

---

## 10. HUD layer

The HUD is a thin console frame drawn over the page on screens ≥ 1024 px. It is decorative to assistive technology (`aria-hidden`) because every value it shows also exists elsewhere in the page or is non-essential.

| Element | Position | Content (all live) |
|---|---|---|
| Brackets | Four corners, `--hud-inset` from edges | 16 px L-shapes in `line-strong` |
| Left rail | Vertical text, left edge, centred | `SYSTAGMA ⟋ {chapter name}` |
| Right rail | Vertical text, right edge, centred | `{scroll %, 3 digits}%` and `{chapter index} / {total}` |
| Bottom-left | Above bracket | `BRASÍLIA {HH:MM:SS}` (Intl, `America/Sao_Paulo`) |
| Bottom-right | Above bracket | Formation readout from generator metadata, e.g. `NÓS 24 · CONEXÕES 36` |
| Progress line | Under the header, full width | 1 px Signal line, `scaleX` = page progress |

Below 1024 px only the progress line remains. HUD text uses the `hud` token, `fg-subtle` for labels and `accent` for changing values.

---

## 11. Components

Values reference the tokens above. Every component lists its calm-mode behaviour where it differs.

### 11.1 Header

| Part | Spec |
|---|---|
| Frame | Fixed, height `--header-h`, no background at rest. When the element beneath is a paper surface (detected with an `IntersectionObserver` on `[data-theme="paper"]`), it gains `panel` at 80% with a 16 px blur so text stays readable |
| Left | Horizontal SVG lockup (logo version C), 28 px tall. Never a PNG, never a typed name |
| Centre (≥ 1024) | Links in `body-sm` 400 `fg-muted`; hover draws a 1 px underline from the left (`scaleX`, 400 ms, `outExpo`); the current chapter's link gets `fg` and a 4 px `emit` dot beneath |
| Right | Language switcher (`PT / EN`), primary button size `sm`, menu button (< 1024) |
| Progress | 1 px Signal line along the bottom edge, `scaleX` = page progress (part of the HUD, always visible) |
| Behaviour | Hides when scrolling down past 50% of the hero, returns on any upward scroll or when focus enters it |

### 11.2 Menu overlay (< 1024)

Full-screen Abyss overlay with the field visible at 30% behind it. Links in `display-md` serif, each revealed by a line mask with a 60 ms stagger. At the bottom: primary button, WhatsApp (if configured), the Brasília clock and the calm-mode toggle. Focus is trapped, `Esc` closes, focus returns to the menu button, Lenis is stopped while open (`lenis.stop()`).

### 11.3 Buttons

| Variant | Rest | Hover / focus-visible | Press |
|---|---|---|---|
| `primary` | `btn-bg` fill, `btn-fg` label, chamfer, 56 px tall (48 px `sm`), Plex Sans 500, +0.01em | **Fill wipe** in `btn-wipe` from the left (600 ms `inOutQuart`) and **text roll** (label slides up, an identical copy slides in from below, 500 ms `outExpo`); **magnet** within 80 px | Scale 0.98 |
| `secondary` | Transparent, 1 px `line-strong` border, `fg` label, chamfer | Fill wipe in Mist at 8%; text roll | Scale 0.98 |
| `link` | `accent` text, no underline | Underline draws from the left | — |
| `icon` | 48 × 48 px, `line-strong` ring, `radius-full` | Ring fills with Mist at 8% | Scale 0.96 |

Labels never carry trailing arrows. Links that leave the site get a small `ArrowUpRight` icon. The text roll duplicates the label with `aria-hidden` on the copy. In calm mode only the colour change remains.

### 11.4 Cursor label

A 10 px ring (1 px Mist at 60%) follows the pointer with `spring-cursor`. Over elements with `data-cursor="<label>"` it grows to 72 px, fills with Mist, and shows the label in Void (`body-sm` 500): *Ver* / *View*, *Arrastar* / *Drag*, *Abrir* / *Open*. The native cursor is **not** hidden. Only on `(pointer: fine)`; off in calm mode. The label repeats information already present in the element's accessible name.

### 11.5 Chapter title

`display-lg` (or `display-md`), split into lines with Anime.js `splitText`; each line sits in a clipping wrapper and slides up from 105% (pattern **Line mask**). A small `hud` label above it shows the chapter index as live HUD data (`02 / 07`), in `fg-subtle`. Titles use serif, or a grotesk-caps line followed by a serif line, never mixed inside one line.

### 11.6 Numeral odometer

The pillar number rendered in `numeral-xl` serif 200. Each digit is a vertical column of 0–9 inside a clipping box; changing value moves the column with `spring-ui`. The accessible text is a visually hidden "Etapa 2 de 4".

### 11.7 Pillar stage

| Zone | Content |
|---|---|
| Text zone (cols 1–5) | Odometer; pillar title in `display-md` serif; description in `body-lg` `fg-muted`; four services as a two-column list with a 6 px `emit` dot per item |
| Field zone (cols 6–12) | The pillar's formation; its metadata in the HUD's bottom-right readout |
| Rail (bottom) | Four equal segments, each a 1 px `line-strong` bar overdrawn in Signal as its pillar progresses; the pillar names under each segment in `hud` |

Pillar text swaps with a line-mask out (up) and in (from below), 500 ms, when progress crosses a pillar threshold. All four pillars exist in the DOM in order. While pinned, only the active one is visible; the others are hidden with opacity only (not `inert`, not `aria-hidden`, not `display: none`) and contain no focusable elements, so screen readers still read all four in sequence. Calm mode shows all four stacked.

### 11.8 Project card (strip)

| Part | Spec |
|---|---|
| Size | Alternating wide (min(62vw, 960px)) and narrow (min(40vw, 620px)) cards, 70lvh tall on desktop |
| Media | Chamfered frame; muted, looping, `playsinline` video with poster, `preload="none"`, played only while ≥ 50% visible; **Clip wipe** on first entry; media translates 8% against the scroll for depth |
| Text | Index `01` (hud), name (`heading-sm`), one-liner (`body-md` `fg-muted`), meta (category · year · status badge) |
| Cursor | `data-cursor="Ver"` |
| Calm | Poster image only; strip becomes a vertical list |

### 11.9 Paper card (stack)

Paper theme, `radius-md`, `shadow-sheet`, 72lvh tall on desktop, full width of the content container. Contents: `hud` index `01 / 03`, title in `display-md` serif, description in `body-lg`, "Ideal para" line in `body-sm` `fg-subtle`. Cards stick at `top: calc(var(--header-h) + i × 24px)`; as the next card arrives the previous one scales to 0.94 and darkens (pattern **Stack**).

### 11.10 Spec row (commitments)

Full-width row with a 1 px `line` top border: title in `heading-md` serif on the left (cols 1–5), text in `body-lg` `fg-muted` on the right (cols 7–12). On hover the border brightens to Signal from the left. On mobile the title stacks above the text.

### 11.11 Accordion

Question in `heading-md` serif, 1 px `line` separators, a 24 px plus icon that rotates to a cross. Panel height animates with Motion (400 ms, `outExpo`). Deep links (`#faq-codigo`) open the matching item. Each trigger is a `<button>` inside an `<h3>` with `aria-expanded` and `aria-controls`; each panel has `role="region"` and `aria-labelledby` pointing to its trigger; closed panels are removed from the tab order. Multiple items may be open.

### 11.12 Multi-step form

| Part | Spec |
|---|---|
| Container | Glass panel, 32–48 px padding |
| Header | Step counter `01 / 03` (`hud`, `aria-live="polite"`) and the step name in `heading-sm`; a 1 px progress bar in Signal |
| Steps | Three `<fieldset>`s in one `<form>`. Without JavaScript all three are visible and the form works as one page. With JavaScript, one step shows at a time and slides horizontally (40 px + opacity, 400 ms) |
| Fields | Underline style: no box, 1 px `line-input` bottom border that turns Signal on focus with a 2 px `focus` outline offset below; label above in `body-sm` 500; input text `body-lg`; 56 px tall |
| Pills | 44 px tall, `radius-full`, 1 px `line-strong` border, `body-sm`; selected: `emit` fill with Void text (7.99:1) and a check icon |
| Navigation | `secondary` "Voltar" and `primary` "Continuar"; the last step's primary is "Enviar mensagem" |
| Validation | Each step validates before advancing; errors appear inline under the field in `danger`, the field gets `aria-invalid="true"` and `aria-describedby`, an error summary is announced, and focus moves to the first invalid field |
| Field link | Each completed step raises the converge node's brightness (`uEmit` 0.33 → 0.66 → 1) |

### 11.13 Footer

Fixed beneath the page (the main content has a bottom margin equal to the footer height), revealed as the page scrolls away (pattern **Footer reveal**). Contents: the horizontal lockup set across the full content width (SVG, `aria-label="Systagma"`), the brand tagline in `display-md` serif italic, three link columns (only columns with content render), the Brasília clock, the calm-mode toggle, legal line, and a magnetic "Voltar ao topo" icon button.

### 11.14 Calm-mode toggle

A switch (`role="switch"`, `aria-checked`) labelled "Reduzir movimento" / "Reduce motion". It sets or clears `data-calm` on `<html>`, stores the choice in `localStorage` (`sys:calm` = `1` or `0`), and dispatches a `sys:calm` event so all layers switch without a reload. An explicit choice overrides the OS setting in either direction.

### 11.15 Other components

Language switcher, status badge, WhatsApp button and skip link are specified in Appendix C.

---

## 12. Implementation reference

These are reference sketches. Verify signatures against the installed versions (Motion 13, Anime.js 4.5, Lenis 1.3) before relying on them.

### 12.1 `app/globals.css` (Tailwind CSS 4)

```css
@import "tailwindcss";

@theme {
  --color-*: initial;
  --color-white: #FFFFFF;
  --color-transparent: transparent;
  --color-current: currentColor;

  --color-teal-100: #CCF7F1; --color-teal-300: #67E0D6; --color-teal-400: #28CBC6;
  --color-teal-500: #03B7B7; --color-teal-700: #00737A; --color-teal-900: #023E49;
  --color-blue-300: #86C4FE; --color-blue-500: #1B84E0; --color-blue-600: #0268BB;

  --color-slate-50: #F1F4F8;  --color-slate-200: #D3DAE2; --color-slate-300: #B6BFC9;
  --color-slate-400: #8F99A6; --color-slate-450: #7C8795; --color-slate-500: #6A7684;
  --color-slate-550: #5B6776; --color-slate-600: #4D5B6A; --color-slate-800: #1C2F44;
  --color-slate-850: #10273D; --color-slate-900: #072036; --color-slate-950: #031227;
  --color-slate-975: #020A17;

  --color-coral: #FD8D78;  --color-amber: #E1A536; --color-lime: #97C25B;
  --color-violet: #B89FFE; --color-rose: #F48ABA;

  --text-numeral-xl: clamp(7.5rem, 3.333rem + 18.5vw, 20rem);
  --text-numeral-xl--line-height: 0.8;  --text-numeral-xl--letter-spacing: -0.04em;
  --text-display-xl: clamp(3.25rem, 0.833rem + 10.7vw, 10.5rem);
  --text-display-xl--line-height: 0.9;
  --text-display-lg: clamp(2.75rem, 1.167rem + 7.04vw, 7.5rem);
  --text-display-lg--line-height: 0.95; --text-display-lg--letter-spacing: -0.03em;
  --text-display-md: clamp(2.125rem, 1.333rem + 3.52vw, 4.5rem);
  --text-display-md--line-height: 1.08; --text-display-md--letter-spacing: -0.02em;
  --text-heading-lg: clamp(1.875rem, 1.5rem + 1.67vw, 3rem);
  --text-heading-lg--line-height: 1.1;
  --text-heading-md: clamp(1.5rem, 1.333rem + 0.741vw, 2rem);
  --text-heading-md--line-height: 1.2;
  --text-heading-sm: clamp(1.25rem, 1.167rem + 0.37vw, 1.5rem);
  --text-heading-sm--line-height: 1.25;
  --text-body-lg: clamp(1.125rem, 1.0625rem + 0.278vw, 1.3125rem);
  --text-body-lg--line-height: 1.55;
  --text-body-md: clamp(1rem, 0.958rem + 0.185vw, 1.125rem);
  --text-body-md--line-height: 1.65;
  --text-body-sm: clamp(0.875rem, 0.854rem + 0.0926vw, 0.9375rem);
  --text-body-sm--line-height: 1.5;
  --text-caption: 0.8125rem;
  --text-hud: 0.6875rem; --text-hud--line-height: 1.3; --text-hud--letter-spacing: 0.08em;

  --radius-xs: 4px; --radius-sm: 6px; --radius-md: 12px;
  --shadow-sheet: 0 -24px 64px -24px rgb(2 10 23 / 0.6);
  --shadow-float: 0 8px 24px -6px rgb(2 10 23 / 0.5);

  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);

  --container-content: 76rem;
  --container-page: 90rem;
}

:root, [data-theme="dark"] {
  color-scheme: dark;
  --sys-surface: var(--color-slate-975);
  --sys-panel: var(--color-slate-950);
  --sys-raised: var(--color-slate-900);
  --sys-fg: var(--color-slate-50);
  --sys-fg-muted: var(--color-slate-300);
  --sys-fg-subtle: var(--color-slate-400);
  --sys-line: rgb(241 244 248 / 0.08);
  --sys-line-strong: rgb(241 244 248 / 0.16);
  --sys-line-input: var(--color-slate-500);
  --sys-accent: var(--color-teal-300);
  --sys-focus: var(--color-blue-300);
  --sys-selection: var(--color-teal-900);
  --sys-btn-bg: var(--color-slate-50);
  --sys-btn-fg: var(--color-slate-975);
  --sys-btn-wipe: var(--color-teal-300);
  --sys-danger: #FFA098; --sys-success: #7CD591;
}

[data-theme="paper"] {
  color-scheme: light;
  --sys-surface: var(--color-slate-50);
  --sys-panel: var(--color-white);
  --sys-raised: var(--color-white);
  --sys-fg: var(--color-slate-900);
  --sys-fg-muted: var(--color-slate-600);
  --sys-fg-subtle: var(--color-slate-550);
  --sys-line: var(--color-slate-200);
  --sys-line-strong: var(--color-slate-300);
  --sys-line-input: var(--color-slate-450);
  --sys-accent: var(--color-teal-700);
  --sys-focus: var(--color-blue-600);
  --sys-selection: var(--color-teal-100);
  --sys-btn-bg: var(--color-slate-900);
  --sys-btn-fg: var(--color-slate-50);
  --sys-btn-wipe: var(--color-teal-700);
  --sys-danger: #A03F3C; --sys-success: #137738;
}

@theme inline {
  --color-surface: var(--sys-surface);
  --color-panel: var(--sys-panel);
  --color-raised: var(--sys-raised);
  --color-fg: var(--sys-fg);
  --color-fg-muted: var(--sys-fg-muted);
  --color-fg-subtle: var(--sys-fg-subtle);
  --color-line: var(--sys-line);
  --color-line-strong: var(--sys-line-strong);
  --color-line-input: var(--sys-line-input);
  --color-accent: var(--sys-accent);
  --color-emit: var(--color-teal-500);
  --color-emit-cool: var(--color-blue-500);
  --color-focus: var(--sys-focus);
  --color-btn-bg: var(--sys-btn-bg);
  --color-btn-fg: var(--sys-btn-fg);
  --color-btn-wipe: var(--sys-btn-wipe);
  --color-danger: var(--sys-danger);
  --color-success: var(--sys-success);

  --font-serif: var(--font-source-serif), Georgia, "Times New Roman", serif;
  --font-sans: var(--font-plex-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-plex-mono), ui-monospace, SFMono-Regular, Menlo, monospace;
}

:root {
  --header-h: 72px;
  --hud-inset: 16px;
  --space-section: clamp(6rem, 3.333rem + 11.9vw, 14rem);
  --space-gutter: clamp(1.25rem, 0.333rem + 4.07vw, 4rem);
  --pin-hero: 200lvh; --pin-manifesto: 250lvh; --pin-pillars: 500lvh;
}
@media (max-width: 1023px) { :root { --header-h: 64px; } }
@media (max-width: 767px) {
  :root { --pin-hero: 150lvh; --pin-manifesto: 180lvh; --pin-pillars: 400lvh; }
}

@layer base {
  html { scroll-padding-top: var(--header-h); background: var(--sys-surface); }
  body { @apply bg-surface text-fg font-sans text-body-md antialiased; }
  [data-chapter] { background: transparent; }        /* the field shows through */
  [data-theme="paper"] { @apply bg-surface text-fg; }
  ::selection { background: var(--sys-selection); }
  :focus-visible { outline: 2px solid var(--sys-focus); outline-offset: 3px; }
  h1, h2, h3 { text-wrap: balance; }
  p { text-wrap: pretty; }

  /* Hide reveal targets only when JS runs and motion is on */
  html.js:not([data-calm]) [data-reveal="lines"] .line-inner { transform: translateY(105%); }
  html.js:not([data-calm]) [data-reveal="words"] .word { opacity: 0.16; }

  /* Calm mode: no pins, no hidden states */
  html[data-calm] [data-pin] { height: auto !important; }
  html[data-calm] [data-stage] { position: static !important; height: auto !important; }
}

@layer components {
  .chamfer { border-radius: var(--radius-sm); }
  @supports (corner-shape: bevel) { .chamfer { border-radius: 10px; corner-shape: bevel; } }

  .glass {
    background: rgb(3 18 39 / 0.6);
    backdrop-filter: blur(24px) saturate(1.2);
    border: 1px solid var(--sys-line-strong);
    border-radius: var(--radius-md);
  }

  .hud { font-family: var(--font-mono); font-size: var(--text-hud);
         letter-spacing: 0.08em; text-transform: uppercase; color: var(--sys-fg-subtle); }

  .btn { position: relative; overflow: clip; isolation: isolate; }
  .btn::before {
    content: ""; position: absolute; inset: 0; z-index: -1;
    background: var(--sys-btn-wipe);
    transform: translateX(-101%);
    transition: transform 600ms var(--ease-in-out-quart);
  }
  .btn:hover::before, .btn:focus-visible::before { transform: translateX(0); }
  .btn .roll { display: grid; overflow: clip; }
  .btn .roll > * { grid-area: 1 / 1; transition: transform 500ms var(--ease-out-expo); }
  .btn .roll > :last-child { transform: translateY(110%); }
  .btn:hover .roll > :first-child, .btn:focus-visible .roll > :first-child { transform: translateY(-110%); }
  .btn:hover .roll > :last-child, .btn:focus-visible .roll > :last-child { transform: translateY(0); }
  html[data-calm] .btn .roll > * { transition: none; }

  .grain { position: fixed; inset: -50%; z-index: 1; pointer-events: none;
           opacity: 0.04; mix-blend-mode: overlay;
           background-image: url("/texture/grain.svg");
           animation: grain 1s steps(8) infinite; }
  html[data-calm] .grain { animation: none; }
  @keyframes grain {
    0% { transform: translate(0, 0); }   25% { transform: translate(-5%, 3%); }
    50% { transform: translate(4%, -6%); } 75% { transform: translate(-3%, 5%); }
    100% { transform: translate(0, 0); }
  }
}
```

Add to the root layout a `<noscript>` style that forces `[data-reveal] *` visible and un-transformed, and a blocking inline script in `<head>`:

```html
<script>
(function(){var d=document.documentElement;d.classList.add('js');
try{var s=localStorage.getItem('sys:calm');
var m=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(s==='1'||(s===null&&m))d.setAttribute('data-calm','');
if(sessionStorage.getItem('sys:booted'))d.setAttribute('data-booted','');}catch(e){}})();
</script>
```

### 12.2 `lib/fonts.ts`

```ts
import { Source_Serif_4, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

export const serif = Source_Serif_4({
  subsets: ["latin"], axes: ["opsz"], style: ["normal", "italic"],
  variable: "--font-source-serif", display: "swap",
});
export const sans = IBM_Plex_Sans({
  subsets: ["latin"], weight: ["300", "400", "500"],
  variable: "--font-plex-sans", display: "swap",
});
export const mono = IBM_Plex_Mono({
  subsets: ["latin"], weight: ["400", "500"],
  variable: "--font-plex-mono", display: "swap", preload: false,
});
```

### 12.3 `lib/motion-tokens.ts`

```ts
export const ease = {
  outExpo: [0.16, 1, 0.3, 1],
  inOutQuart: [0.76, 0, 0.24, 1],
  outQuint: [0.22, 1, 0.36, 1],
} as const;

export const spring = {
  cursor: { type: "spring", stiffness: 500, damping: 40, mass: 0.4 },
  magnet: { type: "spring", stiffness: 220, damping: 18 },
  ui: { type: "spring", stiffness: 420, damping: 36 },
} as const;

export const duration = { instant: 0.1, fast: 0.2, base: 0.4, slow: 0.7, cinematic: 1.2 } as const;

export const anime = {
  ease: { outExpo: "outExpo", inOutQuart: "inOutQuart", outQuint: "outQuint" },
  ms: { fast: 200, base: 400, slow: 700, cinematic: 1200 },
  stagger: 60,
} as const;

export const lenisOptions = { lerp: 0.085, smoothWheel: true, syncTouch: false } as const;
```

### 12.4 Calm mode and smooth scroll

```tsx
// lib/calm.ts
import { useSyncExternalStore } from "react";
const subscribe = (cb: () => void) => {
  window.addEventListener("sys:calm", cb);
  return () => window.removeEventListener("sys:calm", cb);
};
export const isCalm = () => document.documentElement.hasAttribute("data-calm");
export const useCalm = () => useSyncExternalStore(subscribe, isCalm, () => false);
export function setCalm(on: boolean) {
  document.documentElement.toggleAttribute("data-calm", on);
  try { localStorage.setItem("sys:calm", on ? "1" : "0"); } catch {}
  window.dispatchEvent(new Event("sys:calm"));
}
```

```tsx
// components/providers/smooth-scroll.tsx
"use client";
import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { useCalm } from "@/lib/calm";
import { lenisOptions } from "@/lib/motion-tokens";
import { director } from "@/lib/director";

function VelocityBridge() {
  useLenis((lenis) => {
    director.velocity = Math.max(-1, Math.min(1, lenis.velocity / 40));
  });
  return null;
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const calm = useCalm();
  if (calm) return <>{children}</>;
  return (
    <ReactLenis root options={lenisOptions}>
      <VelocityBridge />
      {children}
    </ReactLenis>
  );
}
```

In-page anchor links are intercepted and sent through `lenis.scrollTo(target, { offset: -headerHeight })`; when the scroll completes, focus moves to the target chapter's heading (which has `tabIndex={-1}`).

### 12.5 `lib/director.ts`

```ts
import { useSyncExternalStore } from "react";

export const FORMATIONS = ["noise", "symbol", "lattice", "build", "connect",
  "analyze", "transform", "current", "converge"] as const;
export type FormationId = (typeof FORMATIONS)[number];
export type ChapterId = "hero" | "about" | "services" | "work" | "how" |
  "testimonials" | "faq" | "contact" | "footer";

export const director = {
  chapter: "hero" as ChapterId,
  from: 0, to: 0, mix: 0,         // formation indices + progress
  velocity: 0,                     // −1…1 from Lenis
  pointer: [0, 0] as [number, number], pointerStrength: 0,
  dim: 1, emit: 0, burst: 0,
  safe: [] as [number, number, number, number][], // device-pixel rects
};

const listeners = new Set<() => void>();
export function setChapter(id: ChapterId) {
  if (director.chapter === id) return;
  director.chapter = id;
  listeners.forEach((l) => l());
}
export const useChapterId = () =>
  useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => director.chapter,
    () => "hero" as ChapterId,
  );

/** Keys: formation reached at `at` (0–1). The morph into a key spans `span`
 *  (default: 30% of the gap from the previous key). */
export type Key = { at: number; formation: FormationId; span?: number };

export function resolve(keys: Key[], p: number) {
  const idx = (f: FormationId) => FORMATIONS.indexOf(f);
  if (p <= keys[0].at) return { from: idx(keys[0].formation), to: idx(keys[0].formation), mix: 0 };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (p <= b.at) {
      const span = b.span ?? (b.at - a.at) * 0.3;
      const t = Math.min(1, Math.max(0, (p - (b.at - span)) / span));
      return { from: idx(a.formation), to: idx(b.formation), mix: t * t * (3 - 2 * t) };
    }
  }
  const last = idx(keys[keys.length - 1].formation);
  return { from: last, to: last, mix: 0 };
}
```

### 12.6 `useChapter` — wiring a chapter to the field

```tsx
"use client";
import { useEffect, type RefObject } from "react";
import { useScroll, useInView, useMotionValueEvent } from "motion/react";
import { director, resolve, setChapter, type ChapterId, type Key } from "@/lib/director";

export function useChapter(
  id: ChapterId,
  ref: RefObject<HTMLElement | null>,
  keys: Key[],
  { pinned = false, dim = 1 }: { pinned?: boolean; dim?: number } = {},
) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: pinned ? ["start start", "end end"] : ["start center", "end center"],
  });
  const active = useInView(ref, { margin: "-50% 0px -50% 0px" });
  useEffect(() => { if (active) setChapter(id); }, [active, id]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (director.chapter !== id) return;
    Object.assign(director, resolve(keys, p), { dim });
  });
  return scrollYProgress; // chapters also use it for their own choreography
}
```

**Continuity rule:** each chapter's first key is the formation the previous chapter ends on, so crossing a chapter boundary never jumps.

### 12.7 Line reveal with Anime.js `splitText`

```tsx
"use client";
import { useEffect, useRef } from "react";
import { isCalm } from "@/lib/calm";

export function useLineReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isCalm()) return;
    let revert = () => {};
    let io: IntersectionObserver | undefined;
    import("animejs").then(({ splitText, animate, stagger }) => {
      // Split into lines wrapped in clipping elements; re-splits on resize.
      const split = splitText(el, { lines: { wrap: "clip" } });
      split.addEffect(({ lines }) =>
        animate(lines, { y: ["105%", "0%"], duration: 700, ease: "outExpo",
                         delay: stagger(80), autoplay: false }));
      io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { split.effects.forEach((fx) => fx.play?.()); io?.disconnect(); }
      }, { threshold: 0.2 });
      io.observe(el);
      revert = () => split.revert();
    });
    return () => { io?.disconnect(); revert(); };
  }, []);
  return ref;
}
```

### 12.8 Scrubbing an Anime.js timeline from scroll

```tsx
const progress = useChapter("about", ref, keys, { pinned: true });
const tl = useRef<Timeline | null>(null);
useEffect(() => {
  import("animejs").then(({ createTimeline, stagger }) => {
    tl.current = createTimeline({ autoplay: false })
      .add(ref.current!.querySelectorAll(".word"), {
        opacity: [0.16, 1], duration: 1000, delay: stagger(40), ease: "linear",
      });
  });
  return () => tl.current?.revert();
}, []);
useMotionValueEvent(progress, "change", (p) => {
  const t = tl.current; if (t) t.seek(Math.min(1, p / 0.8) * t.duration);
});
```

### 12.9 The Field renderer (outline)

```ts
// lib/field/renderer.ts — loaded with dynamic import after hydration
import { director, FORMATIONS } from "@/lib/director";
import { generateAll } from "./formations"; // returns { data: Float32Array, rowsPer, meta }
import vert from "./field.vert.glsl";
import frag from "./field.frag.glsl";

export async function startField(canvas: HTMLCanvasElement, count: number) {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
  if (!gl) return { ok: false as const, reason: "no-webgl2" };
  const { data, rowsPer, meta } = await generateAll(count, canvas); // may run in a Worker
  // RGBA32F texture, 128 wide, rowsPer × FORMATIONS.length tall, NEAREST filtering
  // aSeed attribute: Float32Array(count) of seeded randoms
  // program: compile vert/frag; blend: ONE, ONE (additive)
  let raf = 0, last = performance.now();
  const frame = (now: number) => {
    const dt = (now - last) / 1000; last = now;
    // upload uniforms from director (uFrom, uTo, uMix, uVelocity, uPointer, uDim, uSafe…)
    // draw POINTS; if a connect formation is involved, draw LINES pass
    // adaptive quality: track average frame time over first 90 frames
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  document.addEventListener("visibilitychange", () =>
    document.hidden ? cancelAnimationFrame(raf) : (raf = requestAnimationFrame(frame)));
  return { ok: true as const, meta, stop: () => cancelAnimationFrame(raf) };
}
```

```glsl
// field.vert.glsl
#version 300 es
precision highp float;
uniform sampler2D uPositions;
uniform int uFrom, uTo, uRowsPer;
uniform float uMix, uTime, uVelocity, uPointerStrength, uPointSize, uDpr, uAspect;
uniform float uBurst, uFlowOffset;   // burst impulse 0–1; accumulated current offset
uniform int uCurrent;                // index of the `current` formation
uniform vec2 uPointer;
uniform vec4 uStage;           // xy offset, zw scale
in float aSeed;
out float vAlpha; out float vTint;

vec4 fetchAt(int f) {
  int i = gl_VertexID;
  return texelFetch(uPositions, ivec2(i % 128, i / 128 + f * uRowsPer), 0);
}

vec2 flowIf(vec4 v, int f) {              // horizontal wrap for `current`
  if (f != uCurrent) return v.xy;
  float w = 2.0 * uAspect;
  return vec2(mod(v.x + uFlowOffset * (0.6 + aSeed) + uAspect, w) - uAspect, v.y);
}

void main() {
  vec4 a = fetchAt(uFrom), b = fetchAt(uTo);
  float t = clamp((uMix - aSeed * 0.35) / 0.65, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  vec2 p = mix(flowIf(a, uFrom), flowIf(b, uTo), t);
  p += normalize(p + 1e-5) * uBurst * (0.5 + aSeed) * 0.8;   // burst outward
  p += 0.004 * vec2(sin(uTime * 0.6 + aSeed * 40.0), cos(uTime * 0.5 + aSeed * 31.0));
  vec2 d = p - uPointer;
  p += normalize(d + 1e-5) * uPointerStrength * smoothstep(0.18, 0.0, length(d)) * 0.06;
  p.y += uVelocity * 0.02 * (aSeed - 0.5);
  p = p * uStage.zw + uStage.xy;
  gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);
  gl_PointSize = uPointSize * uDpr * mix(0.6, 1.4, aSeed);
  vAlpha = mix(a.z, b.z, t);
  vTint = mix(a.w, b.w, t);
}
```

```glsl
// field.frag.glsl
#version 300 es
precision mediump float;
uniform vec3 uCool, uWarm;     // #1B84E0, #03B7B7 in linear RGB
uniform float uDim;
uniform vec4 uSafe[4];
uniform int uSafeCount;
in float vAlpha; in float vTint;
out vec4 outColor;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c);
  if (r2 > 0.25) discard;
  float a = vAlpha * smoothstep(0.25, 0.0, r2) * uDim;
  for (int k = 0; k < 4; k++) {
    if (k >= uSafeCount) break;
    vec4 s = uSafe[k];
    if (gl_FragCoord.x > s.x && gl_FragCoord.x < s.z &&
        gl_FragCoord.y > s.y && gl_FragCoord.y < s.w) a *= 0.15;
  }
  outColor = vec4(mix(uCool, uWarm, vTint) * a, a);
}
```

---

## 13. Accessibility checklist

| Area | Requirement |
|---|---|
| Contrast | Text ≥ 4.5:1, large text and UI boundaries ≥ 3:1. Use only the pairings in section 3. |
| Focus | Every interactive element shows the 2 px `focus` outline on keyboard focus. Nothing removes it. |
| Targets | Interactive targets are at least 44 × 44 px (WCAG 2.5.8 minimum is 24 × 24). |
| Keyboard | Full page usable with Tab, Shift+Tab, Enter, Space and Esc. Menu and accordion follow WAI-ARIA patterns. |
| Structure | One `h1` per page; landmarks `header`, `nav`, `main`, `footer`; sections labelled by their H2 (`aria-labelledby`). |
| Language | `<html lang="pt-BR">` or `lang="en"`; inline foreign words (the Greek roots) wrapped with `lang="grc-Latn"` where practical. |
| Motion | Reduced-motion behaviour per 8.4. No content flashes more than 3 times per second. No auto-moving content longer than 5 s. |
| Forms | Visible labels, programmatic errors, error summary, no placeholder-only labels, autocomplete attributes set (`name`, `email`, `organization`). |
| Media | Every informative image has `alt`; decorative SVGs have `aria-hidden="true"`; the hero symbol has `role="img"` and `aria-label="Símbolo da Systagma"`. |
| Zoom | Layout works at 200% zoom and at 320 px wide without horizontal scrolling. |
| Content | Nothing is only in the canvas or the HUD. All text is server-rendered HTML in reading order. |
| Calm mode | OS setting and visible toggle both honoured; every chapter has a composed static layout. |
| Boot | Never longer than 1.8 s, skippable with a visible button, `Esc`, click or scroll; never sets `aria-hidden` on the page; not shown again in the same session. |
| Pins | Each pinned chapter starts with a visually hidden "Pular para o próximo capítulo" link that becomes visible on focus. |
| Horizontal strip | Focusing a card scrolls the page to the position where that card is visible (`lenis.scrollTo`). |
| Contrast | Safe rectangles registered for every text block that can overlap the field (3.6, 8.6). |
| Cursor | The custom cursor never replaces the native one and never carries unique information. |
| Motion limits | No flashing above 3 per second. Looping motion (grain, drift) is subtle, and the toggle stops it (WCAG 2.2.2). |
| Focus | 2 px focus outline on every interactive element, including within pinned stages and the multi-step form. |
| Language | `lang` on `<html>`; Greek words marked `lang="grc-Latn"`. |

---

## 14. Governance

Source of truth is this document; the Figma library mirrors its token names; changes land in this file, `globals.css` and Figma in the same pull request; breaking token renames bump the major version. The field's formation list, pin lengths and motion tokens are design decisions: change them in this document first, then in code. Any new animation must name its layer (L0–L5), its owner library, its calm-mode state and its budget before it is built.

---

## Appendix A — Full colour scales

Carried from v1 so this document is self-contained. Contrast columns are against White and Abyss.

### A.1 Primitive scales

**Teal** (signature accent, from the centre node)

| Step | Hex | On White | On Abyss | Typical use |
|---|---|---|---|---|
| 50 | `#E7FCF9` | 1.07 | 17.59 | Tint backgrounds |
| 100 | `#CCF7F1` | 1.16 | 16.20 | Text selection on light |
| 200 | `#9DEEE5` | 1.33 | 14.11 | |
| 300 | `#67E0D6` | 1.59 | 11.80 | **Signal**: accent text on dark |
| 400 | `#28CBC6` | 2.01 | 9.33 | Primary button hover |
| 500 | `#03B7B7` | 2.48 | 7.56 | **Node**: primary button fill, active markers |
| 600 | `#0C9498` | 3.68 | 5.10 | Large graphics on light |
| 700 | `#00737A` | 5.63 | 3.33 | **Deep Teal**: accent text on light |
| 800 | `#015660` | 8.40 | 2.23 | Charts |
| 900 | `#023E49` | 11.75 | 1.60 | |
| 950 | `#022732` | 15.69 | 1.20 | |

**Blue** (supporting, from the logo's blue faces)

| Step | Hex | On White | On Abyss | Typical use |
|---|---|---|---|---|
| 50 | `#EEF6FE` | 1.09 | 17.19 | Info background |
| 100 | `#D8ECFF` | 1.21 | 15.51 | |
| 200 | `#B8DCFE` | 1.43 | 13.13 | |
| 300 | `#86C4FE` | 1.85 | 10.13 | Focus ring on dark, charts |
| 400 | `#51A5F6` | 2.60 | 7.20 | |
| 500 | `#1B84E0` | 3.87 | 4.84 | |
| 600 | `#0268BB` | 5.68 | 3.30 | **Current**: focus ring on light, charts |
| 700 | `#02549C` | 7.63 | 2.46 | |
| 800 | `#02407D` | 10.33 | 1.81 | Flow gradient start |
| 900 | `#042E5D` | 13.51 | 1.39 | |
| 950 | `#041D3E` | 16.79 | 1.12 | |

**Slate** (neutrals with a navy cast; the darkest steps are the logo's navies)

| Step | Hex | On White | On Abyss | Typical use |
|---|---|---|---|---|
| 0 | `#FFFFFF` | 1.00 | 18.76 | White surface |
| 25 | `#F8FAFD` | 1.05 | 17.94 | |
| 50 | `#F1F4F8` | 1.10 | 17.00 | **Mist** surface; body text on dark |
| 100 | `#E5EAF0` | 1.21 | 15.50 | Neutral badge background |
| 200 | `#D3DAE2` | 1.41 | 13.30 | Dividers on light |
| 300 | `#B6BFC9` | 1.86 | 10.08 | Secondary text on dark |
| 400 | `#8F99A6` | 2.89 | 6.50 | Tertiary text on dark |
| 450 | `#7C8795` | 3.65 | 5.14 | Input borders on light (≥3:1 non-text) |
| 500 | `#6A7684` | 4.63 | 4.05 | Input borders on dark |
| 550 | `#5B6776` | 5.76 | 3.26 | Tertiary text on light |
| 600 | `#4D5B6A` | 6.95 | 2.70 | Secondary text on light |
| 700 | `#334354` | 10.14 | 1.85 | Neutral badge text |
| 800 | `#1C2F44` | 13.64 | 1.37 | Dividers on dark |
| 850 | `#10273D` | 15.22 | 1.23 | Raised surface on dark |
| 900 | `#072036` | 16.55 | 1.13 | **Ink**: text on paper; raised surface |
| 950 | `#031227` | 18.76 | 1.00 | **Abyss**: panels |
| 975 | `#020A17` | 19.4 | — | **Void**: page base (new in v2) |

### A.2 Status tokens

| Token set | `*-fg` (on light) | `*-bg` (light) | `*-fg` (on dark) | Used by |
|---|---|---|---|---|
| success | `#137738` (5.64 on white) | `#E6FAE9` | `#7CD591` (10.52 on Abyss) | "Live" badge, form success |
| warning | `#8D5E05` (5.62) | `#FFF1DF` | `#EEB154` (9.87) | Non-blocking notices |
| danger | `#A03F3C` (6.42) | `#FEF0EE` | `#FFA098` (9.59) | Field errors, send failure |
| info | `#1E65AA` (6.00) | `#ECF4FE` | `#8DC2FE` (10.07) | "Beta" badge |

On dark surfaces the status backgrounds become the fg colour at 12% opacity (`color-mix(in oklab, var(--color-success-fg) 12%, transparent)`).

### A.3 Portfolio accents

Assigned one per product (see Brand Guideline 9). Teal is never assigned to a product.

| Accent | `fill` | `ink` | Abyss on fill | Ink on White |
|---|---|---|---|---|
| coral | `#FD8D78` | `#A04130` | 8.27 | 6.38 |
| amber | `#E1A536` | `#835A01` | 8.61 | 6.13 |
| lime | `#97C25B` | `#4D7002` | 9.10 | 5.78 |
| violet | `#B89FFE` | `#6A51A4` | 8.42 | 6.31 |
| rose | `#F48ABA` | `#983F6B` | 8.21 | 6.44 |

## Appendix B — Spacing and grid

### B.1 Spacing scale

Base unit 4 px. Use the scale; do not invent values.

| Token | px | rem | Typical use |
|---|---|---|---|
| `0.5` | 2 | 0.125 | Hairline offsets |
| `1` | 4 | 0.25 | Icon-to-text in badges |
| `2` | 8 | 0.5 | Tight stacks |
| `3` | 12 | 0.75 | Label to input |
| `4` | 16 | 1 | Default stack, card padding (mobile) |
| `5` | 20 | 1.25 | Button horizontal padding (md) |
| `6` | 24 | 1.5 | Grid gutter (tablet), card padding (desktop) |
| `8` | 32 | 2 | Grid gutter (desktop), between groups |
| `10` | 40 | 2.5 | |
| `12` | 48 | 3 | Section header to content (mobile) |
| `16` | 64 | 4 | Section header to content (desktop) |
| `20` | 80 | 5 | Section padding (mobile) |
| `24` | 96 | 6 | |
| `32` | 128 | 8 | |
| `40` | 160 | 10 | Section padding (desktop) |

### B.2 Breakpoints

Tailwind 4 defaults are kept: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536 px. Design is mobile-first; the three reference frames in Figma are 390, 1024 and 1440 px wide.

### B.3 Containers and grid

| Container | Max width | Use |
|---|---|---|
| `container-page` | 1440 px (+ gutters) | Header, hero, full-bleed bands |
| `container-content` | 1216 px (+ gutters) | Most sections |
| `container-prose` | 68ch | Privacy page, long answers |

| Viewport | Columns | Gutter |
|---|---|---|
| < 768 px | 4 | 16 px |
| 768–1023 px | 8 | 24 px |
| ≥ 1024 px | 12 | 32 px |

## Appendix C — Components carried from v1

### C.1 Language switcher

Two text links "PT" and "EN" separated by a `line` divider, `body-sm` 500. The current locale has `aria-current="true"` and `fg` colour; the other is `fg-muted`. Each link has `hreflang` and `lang` attributes and a full `aria-label` ("Português (Brasil)", "English"). Switching preserves the current hash.

### C.2 Status badge

Pill, 24 px tall, 10 px horizontal padding, `body-sm` 500, with a 6 px leading dot.

| Status | PT-BR / EN | Background | Text | Dot |
|---|---|---|---|---|
| `live` | Em produção / Live | `success-bg` | `success-fg` | filled `success-fg` |
| `beta` | Beta / Beta | `info-bg` | `info-fg` | filled `info-fg` |
| `building` | Em desenvolvimento / In development | `slate-100` | `slate-700` | hollow ring |

### C.3 WhatsApp button

**Inline:** `secondary` button with the WhatsApp glyph leading, label "Conversar no WhatsApp". **Floating:** 56 px circle on the glass surface (v2), white glyph, `shadow-float`, fixed 20 px from bottom-right plus `env(safe-area-inset-bottom)`; appears after the hero leaves the viewport and hides while the contact section is visible, both via Motion presence (scale 0.8 → 1, opacity). Accessible name: "Conversar no WhatsApp (abre em nova aba)".

The glyph stays monochrome on purpose: WhatsApp green (`#25D366`) placed next to brand teal reads as a near-miss colour clash, and the glyph alone is recognisable enough.

### C.4 Skip link

First focusable element on every page: "Pular para o conteúdo" / "Skip to content", visually hidden until focused, then shown at top-left on `surface-raised` with a focus outline, `z-skip`.
