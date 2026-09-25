# Systagma — Brand Guideline

| | |
|---|---|
| Version | 1.1 (draft for approval) |
| Date | September 2026 |
| Scope | Corporate brand of Systagma and the rules that govern products in its portfolio |
| Companion documents | `Design-system.md` v2.0 (tokens, motion, components), `Landing-Page-SPEC.md` v2.0 (website build) |
| Status markers | Items marked **[CONFIRM]** are proposals that need a founder decision before publication |

---

## 1. Brand foundation

### 1.1 The name

Systagma joins two Greek roots. *Systēma* (σύστημα) is a whole made of parts that stand together; *tagma* (τάγμα) is something that has been set in order. Read together, the name describes the job exactly: taking people, processes and data and arranging them into software that works as one. **[CONFIRM]** that this story matches the founders' intent; it is the backbone of the website's opening statement.

Pronunciation is *sis-TAG-ma* in English and *sis-TÁG-ma* in Portuguese. The name is always written with a capital S and the rest in lowercase: Systagma. Never SYSTAGMA in running text, never SysTagma, never Systagma's with a trademark symbol in body copy.

### 1.2 What Systagma is

Systagma is a software house. It designs, builds, integrates and operates digital products for other companies, and it will also launch products of its own. That dual role matters for the brand: the corporate identity has to feel credible to a CTO signing a contract and flexible enough to sit behind several product brands without swallowing them (see section 9).

**Positioning statement (internal).** For companies that need software to work as part of the business rather than beside it, Systagma is the software house that builds, connects and measures digital products end to end, so ideas turn into impact you can see in the data.

### 1.3 Pillars

The four verbs in the logo lockup are not decoration; they are the brand's operating model and the backbone of the website's services section. They form a real sequence, which is why they may be numbered.

| # | Pillar (EN / PT-BR) | What it means | Services it groups |
|---|---|---|---|
| 01 | Build / Construir | We design and ship the software itself. | Web platforms and SaaS, mobile apps, internal tools, product design |
| 02 | Connect / Conectar | We make the new system talk to what already exists. | APIs and integrations, workflow automation, cloud and DevOps, legacy migration |
| 03 | Analyze / Analisar | We turn what the system produces into trustworthy numbers. | Data engineering, dashboards and BI, applied AI/ML, product analytics |
| 04 | Transform / Transformar | We use those numbers to change the product and the business. | Discovery and strategy, modernization, AI agents, continuous improvement |

### 1.4 Taglines

| Role | English | Portuguese (BR) | Where it appears |
|---|---|---|---|
| Brand tagline | Ideas to impact through data | Da ideia ao impacto, com dados **[CONFIRM wording]** | Footer, social bios, presentation covers, OG images |
| Method line | Build, Connect, Analyze, Transform | Construir, Conectar, Analisar, Transformar | Services section, proposals, the large-format logo lockup |
| Website headline | Ideas, put in order. | Ideias, postas em ordem. | Hero of the website (derived from the name's meaning) |

The current logo artwork stacks both the method line and the tagline under the wordmark. That lockup is kept for large-format use only (section 3.2). In interfaces the two lines are never shown together as a single dotted string; the method line is presented as four separate, labelled steps.

### 1.5 Personality

Systagma sounds like a senior engineer who is also good with clients: precise, calm, direct, and warm without being chummy.

| We are | We are not |
|---|---|
| Precise: we name the thing, the number, the date. | Vague: "innovative solutions", "cutting-edge technology". |
| Structured: we show how the work is organized. | Rigid: jargon walls, process for its own sake. |
| Candid: we say what something costs and what can go wrong. | Salesy: superlatives, urgency tricks, "the best in Brazil". |
| Warm-technical: we explain acronyms and speak to one person. | Cold or cute: robot voice, or emoji-heavy casualness. |

---

## 2. Market scan and the decisions it drove

### 2.1 What the four reference sites do

The four supplied references were decompiled and analysed for palette, type, structure, motion and conversion patterns.

| Reference | Built with | Base surfaces | Single accent | Type | Pattern worth learning from | Pattern to avoid |
|---|---|---|---|---|---|---|
| wama.com.br (design and software agency, BR) | Framer | Near-black `#0F0F0F`, off-white | Lime `#CDFF59` | TWK Lausanne, Inter | A 10-question FAQ that answers real buyer fears (code ownership, budget, post-launch support); a contact form that qualifies leads by service and budget; SEO articles aimed at buyers | Very heavy page (the saved HTML source alone is over 1 MB) |
| weevolveit.com (AI-first tech partner, MX) | Next.js | Charcoal `#1C1C1C` | Amber `#F5B90A` | Custom sans | A named, five-phase method with one-line punchy definitions; WhatsApp click-to-chat with a prefilled message; Organization JSON-LD with a sales contact point | Testimonial marquee duplicates every quote in the DOM; mixed languages on one page |
| finseo.ai (AI visibility SaaS) | Next.js (Turbopack) | Alternating cream `#FAF9F5` and anthracite | Green `#0ECA7B` | Season Sans | Real product UI in the hero instead of abstract art; alternating light and dark bands to pace a long page | A dense feature list that reads like a spec sheet |
| axiom-power (Webflow template, energy) | Webflow, GSAP, Lenis | White and dark | Teal `#5ABDB2` | Template sans | A statement section after the hero; four plain "commitments"; figures with methodology notes ("measured, not modelled"), which makes claims credible | Scroll-jacking smooth scroll (Lenis) and split-text effects everywhere |

Three patterns appear in all four sites. Each uses a neutral-dominant base with exactly one saturated accent. Each explains *how* the company works, not only *what* it sells. And each makes contact easy while still qualifying the lead.

### 2.2 What the wider market says about colour

Blue is saturated in software. One B2B SaaS branding studio reports that over 70% of SaaS brands still use blue as their primary colour, and several 2026 trend reports argue that the default "tech blue" no longer differentiates on its own. At the same time, teal is having a moment: WGSN and Coloro named **Transformative Teal** their Colour of the Year 2026, describing it as a blend of dependable dark blue and aquatic green that sits between the digital and the natural. Trend reports also stress contrast and accessibility as a brand requirement rather than a nice-to-have, with the European Accessibility Act now in force and WCAG 2.2 as the working standard.

### 2.3 Decisions

| Question | Decision | Why |
|---|---|---|
| Keep the logo colours? | Yes. The hues are kept; their *roles* change. | The navy, blue and teal are well matched to the market moment and already carry recognition. |
| Which colour leads? | **Teal ("Node")** becomes the signature accent. Blue ("Current") becomes a supporting colour. | Teal is ownable and on-trend; blue alone would look like 70% of the category. |
| What replaces black? | **Navy ("Abyss")**, taken from the logo's own dark background. | Every competitor uses near-black or charcoal. A deep navy is recognisably Systagma and softer on the eye. |
| Gradients in UI? | No. The multi-stop gradient lives in the symbol only. | Gradient washes are the most common tell of templated tech sites and hurt text contrast. |
| Light surfaces? | Cool whites with a faint navy cast ("Mist"), not cream. | Warm cream fights the cold teal and is now a cliché of its own. |
| How much accent? | Teal covers no more than about 5% of any screen. | Scarcity keeps the accent meaningful: if it is teal, it is actionable or important. |

---

## 3. Logo

### 3.1 Anatomy and meaning

The symbol is an S built from folded, isometric ribbon segments, crossed by a circuit line that links three nodes.

| Element | Reads as | Brand meaning |
|---|---|---|
| Ribbon segments | Layers, modules, planes of a system | The parts Systagma arranges ("tagma") |
| Isometric angles (30°) | Engineering drawing, structure | Order, precision, things built to fit |
| Connector line | A data path or circuit trace | Integration, the flow of data |
| Bottom-left node | Where the line starts | The idea |
| Centre node (teal, with a knockout ring) | The hub the line passes through | Systagma, the system that does the work |
| Top-right node | Where the line ends | The impact |

The connector runs from bottom-left to top-right, which is the tagline drawn as a picture: ideas to impact, through the system. Use this story in pitches and on the About page.

Measured on the supplied artwork, the symbol's bounding box is about 546 × 885 px, a ratio close to 1 : 1.62. The centre node's diameter (called **N** in this guide) is about 15% of the symbol's height. N is the unit for all clear-space and spacing rules below.

### 3.2 Versions

| Version | Composition | Use it for | Minimum size (digital / print) |
|---|---|---|---|
| A. Vertical lockup | Symbol above wordmark | Covers, social cards, presentations, merchandise | 96 px wide / 25 mm |
| B. Vertical lockup with lines | Version A plus method line and tagline (the current artwork) | Large format only: event banners, office wall, first slide of a keynote | 280 px wide / 70 mm |
| C. Horizontal lockup **(to be created)** | Symbol left, wordmark right | Website header, email signature, documents, invoices | 112 px wide / 30 mm |
| D. Symbol | Symbol alone | Favicon, app icon, avatars, watermark, loading states | 24 px tall / 8 mm |
| E. Symbol, compact | Flat two-colour symbol with thicker connector | Anything rendered below 32 px (favicon 16/32, browser tab) | 16 px |
| F. Wordmark | Wordmark alone | Rare: when the symbol is already present on the same surface | 80 px wide / 20 mm |

**Horizontal lockup construction (C).** Symbol height equals two times the wordmark's cap height. The gap between symbol and wordmark equals 1N. The wordmark's cap-height centre aligns with the symbol's vertical centre. Final proportions are set during the vector redraw (3.3) and then frozen.

### 3.3 Production issues with the current files, and the redraw brief

The supplied logos are 1254 × 1254 px JPEGs exported through WhatsApp. They are compressed, have no transparency, and the light and dark versions differ slightly in gradient shading. None of them can go into production as-is. Before launch, commission a vector redraw with this brief:

| Topic | Requirement |
|---|---|
| Grid | Rebuild every segment on a 30° isometric grid so all edges share the same angles and all segment thicknesses are equal. |
| Light model | One light source (top-right). Faces lit from the top-right take teal, shaded faces take blue. Each segment gets at most one two-stop linear gradient, same angle across the mark. |
| Nodes | Perfect circles. Outer nodes at about 0.95N; centre node at 1N with a knockout ring of 0.12N that separates it from the ribbons. |
| Connector | Constant stroke of about 0.17N with 90°/30° bends only; no rounded ends except where it meets a node. |
| Flat versions | Produce flat (no gradient) full-colour, one-colour Ink, one-colour white and compact versions from the same geometry. |
| Wordmark | Outline the wordmark as vectors. It is a geometric sans with single-storey *a* and *g*; if it came from a font, identify it and verify the licence permits logo use. Correct any uneven spacing after outlining. |
| Colour | Specify gradient stops using the palette in section 4 so the logo and the interface match exactly. |
| Deliverables | See 3.7. |

### 3.4 Clear space

Keep a margin of at least **1N** on every side of any lockup or of the symbol. Nothing else (text, image edges, other logos, UI chrome) may enter that area. On social avatars and the WhatsApp Business profile photo, which are cropped to a circle, the symbol's height should be no more than 60% of the canvas so the circular crop never touches it.

### 3.5 Colour versions and backgrounds

| Background | Logo version | Wordmark colour |
|---|---|---|
| White `#FFFFFF`, Mist `#F1F4F8` | Full colour | Ink `#072036` |
| Abyss `#031227`, Ink `#072036` | Full colour | White `#FFFFFF` |
| Teal or blue brand fills | One-colour Abyss or one-colour white, whichever passes 4.5:1 | Same as symbol |
| Photography | One-colour white on a darkened area, or full colour on a clean light area | White or Ink |
| Single-colour production (embroidery, laser, stamps) | One-colour Ink or white | Same as symbol |

### 3.6 Misuse

| Do not | Reason |
|---|---|
| Recolour the segments or swap the gradient direction | The light model is part of the mark's recognition. |
| Add shadows, glows, bevels or 3D effects | The mark is already dimensional; effects make it muddy. |
| Stretch, skew, rotate or mirror it | It breaks the isometric geometry. |
| Separate the nodes from the S or animate them off the mark in static use | The connected nodes are the idea; broken apart, they read as a molecule icon. Animation that *assembles* the mark is allowed (section 7). |
| Place the full-colour mark on mid-tone backgrounds or busy photos | The teal and blue faces disappear. |
| Use lockup B (with lines) in a website header or at small sizes | The small caps become unreadable below about 280 px wide. |
| Typeset "Systagma" in a font as a stand-in for the wordmark | Only the outlined wordmark is the logo. |
| Put the logo inside a container shape (circle, rounded square) except for app icons and avatars | It shrinks the mark and adds a competing shape. |
| Use the JPEG files anywhere public | See 3.3. |

### 3.7 Logo deliverables

| File | Format | Notes |
|---|---|---|
| `systagma-lockup-vertical-{color,ink,white}.svg` | SVG | Versions A |
| `systagma-lockup-vertical-lines-{color,white}.svg` | SVG, PDF | Version B |
| `systagma-lockup-horizontal-{color,ink,white}.svg` | SVG | Version C |
| `systagma-symbol-{color,flat,ink,white}.svg` | SVG | Versions D |
| `systagma-symbol-compact.svg` | SVG | Version E, also the source for icons |
| `favicon.ico`, `icon.svg`, `apple-icon.png` (180), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Mixed | Web app icons; the maskable version keeps the symbol inside the central 80% safe zone |
| `og-default.png` | PNG 1200 × 630 | Default social share image |
| `avatar-abyss.png` | PNG 1024 × 1024 | Social and WhatsApp profile photo |
| `systagma-symbol-animated.svg` | SVG with separated, IDed paths | Source for the website's assembly animation: each segment, node and the connector as its own path |

---

## 4. Colour

### 4.1 Core palette

Six named colours carry the brand. Full tonal scales (50–950) and semantic tokens live in `Design-system.md`.

| Name | Hex | Scale token | Role |
|---|---|---|---|
| **Void** | `#020A17` | `slate-975` | Base of the website, where the particle field is drawn. Added in v1.1. |
| **Abyss** | `#031227` | `slate-950` | Panels, menus, footer, print and social backgrounds. The brand's "black". |
| **Ink** | `#072036` | `slate-900` | Wordmark colour; body text on light; secondary dark surface. |
| **Mist** | `#F1F4F8` | `slate-50` | Alternate light surface. |
| **Current** | `#0268BB` | `blue-600` | Supporting colour: focus rings on light surfaces, data visualisation, the blue faces of the symbol. Never a CTA fill. |
| **Node** | `#03B7B7` | `teal-500` | Signature accent: primary button fill (with Abyss text), active states, the centre node. |
| **Signal** | `#67E0D6` | `teal-300` | Accent for text, links and icons on dark surfaces. |

Two more values are used so the accent stays accessible on light surfaces: **Deep Teal** `#00737A` (`teal-700`) for accent text and links on white or Mist, and **White** `#FFFFFF` as the main light surface.

### 4.2 Proportion

On the website: about 80% navy (Void, Abyss, Ink), 10–15% paper (Mist) for moments meant for reading, and teal only as **light**: the particle field, thin active marks and small highlights, never large painted areas. Blue appears in the field's shaded points, focus states, data and the logo. In print and presentations, the v1.0 balance (more White and Mist) still applies.

### 4.3 The "Flow" gradient

The gradient belongs to the symbol and to large brand illustrations only.

```
linear-gradient(135deg, #02407D 0%, #0268BB 35%, #03B7B7 75%, #67E0D6 100%)
```

It is never used as a button fill, never placed behind text, never used as a section background wash, and never applied to type.

### 4.4 Accessible pairings

Contrast ratios below are computed with the WCAG 2.x formula. AA requires 4.5:1 for body text and 3:1 for large text and for UI boundaries.

| Foreground | Background | Ratio | Use |
|---|---|---|---|
| Ink `#072036` | White | 16.55 | Body text on light |
| `slate-600` `#4D5B6A` | White / Mist | 6.95 / 6.65 | Secondary text on light |
| Deep Teal `#00737A` | White / Mist | 5.63 / 5.38 | Links and accent text on light |
| Current `#0268BB` | White | 5.68 | Focus ring and data on light |
| Abyss `#031227` | Node `#03B7B7` | 7.56 | Text on the primary button |
| `slate-50` `#F1F4F8` | Abyss | 17.00 | Body text on dark |
| `slate-300` `#B6BFC9` | Abyss | 10.08 | Secondary text on dark |
| Signal `#67E0D6` | Abyss / Ink | 11.80 / 10.41 | Links and accent text on dark |
| White | Node `#03B7B7` | 2.48 | **Fails.** Never put white text on teal. |
| Node `#03B7B7` | White | 2.48 | **Fails for text.** Teal on white is for fills and large graphics only, never for text. |

### 4.5 Portfolio accents

Products in the Systagma portfolio each receive one accent from this set (section 9). All five share the same OKLCH lightness and chroma, so they sit together in a grid without one shouting over another. Each has a *fill* version (for surfaces, with Abyss text on top) and an *ink* version (for text on white). Teal is reserved for Systagma itself and is never assigned to a product.

| Accent | Fill | Abyss text on fill | Ink (text on white) | Ratio on white |
|---|---|---|---|---|
| Coral | `#FD8D78` | 8.27 | `#A04130` | 6.38 |
| Amber | `#E1A536` | 8.61 | `#835A01` | 6.13 |
| Lime | `#97C25B` | 9.10 | `#4D7002` | 5.78 |
| Violet | `#B89FFE` | 8.42 | `#6A51A4` | 6.31 |
| Rose | `#F48ABA` | 8.21 | `#983F6B` | 6.44 |

---

## 5. Typography

### 5.1 Families

| Voice | Family | Why | Licence |
|---|---|---|---|
| Editorial (headline lines, manifesto, big numerals) | **Source Serif 4** (variable, optical sizes, italic) | Gives the brand the calm authority of an established firm; its display optical size stays refined at 100 px and above | SIL OFL, Google Fonts |
| Grotesk (uppercase display lines, body, interface) | **IBM Plex Sans** (300, 400, 500) | Engineered, "systems" character; excellent Portuguese diacritics; readable at 14 px | SIL OFL, Google Fonts |
| Console (live data only) | **IBM Plex Mono** (400, 500) | Matches Plex Sans; used for the HUD and real code, never for decoration | SIL OFL, Google Fonts |

Urbanist, used in v1.0, is retired from the interface: the wordmark keeps its own geometric drawing and headlines no longer imitate it. A commercial display serif with a true display cut may replace Source Serif 4 later if it keeps the same scale.

### 5.2 Rules

Headlines contrast by **line**, never by word: a line in Plex Sans Light uppercase may sit above a line in Source Serif 4 italic (the website hero), but a single word is never switched to another face, weight or colour. Uppercase appears in only two places: grotesk display lines and the console (HUD). Body text is Plex Sans Regular at 16–18 px, line height 1.65, measure 60–68 characters. Everything else is sentence case. The console voice shows only true, live information (time in Brasília, scroll progress, a form step), never decorative codes. Big numerals use the serif at light weights with lining, tabular figures.

The full type scale lives in `Design-system.md` section 4.

---

## 6. Graphic language

### 6.1 Four motifs

**The isometric grid.** A 30° line grid is the canvas the symbol is drawn on. On the website it appears as the field's `lattice` formation; in diagrams and presentations it may appear once per page as a faint background (about 6% opacity, radially masked). It is never a full-page texture.

**The connector.** A single stroke with node dots at its ends, taken from the symbol. It is the brand's signature device: in the website it links the four pillars, in diagrams it shows data flow, in presentations it can connect a problem to an outcome. Stroke weight scales with the layout (2 px on web), nodes are always perfect circles, bends are 90° or 30°, and there is only ever one connector per view.

**The field.** Thousands of small points of light on Void: data. Scattered, they are noise; ordered, they form the symbol or a chart, a network, a lattice. On the website the field is the living background and the main visual asset; stills of its formations are used for social images, presentation covers and the Open Graph image. Points are always round, small and teal-to-blue; the field never carries text.

**The chamfer.** The ribbon ends in the symbol are cut at an angle. The primary button and portfolio media frames echo this with a bevelled corner (implemented with CSS `corner-shape: bevel`, falling back to a small rounded corner in browsers that do not support it). It is used on those two components only; everything else has plain small radii.

### 6.2 Iconography

Interface icons come from **Lucide** at 1.5 px stroke on a 24 px grid, in the current text colour. The four pillars get custom glyphs drawn from the symbol's vocabulary: *Build* as two stacked isometric segments, *Connect* as two nodes and a connector, *Analyze* as a node with three branching lines of different lengths, *Transform* as a single segment folding at 30°. Same 24 px grid, same 1.5 px stroke, so they sit next to Lucide icons without friction.

### 6.3 Imagery

Show real work: product screenshots in simple device-free frames, architecture diagrams drawn in the brand's line style, and photos of the actual team in natural light. Avoid stock photos of people pointing at screens, glowing brains, handshakes over holograms, and AI-generated "futuristic city" art. Team photos may use an optional duotone (Abyss shadows to Mist highlights) when a set of mismatched photos needs unifying.

### 6.4 Data visualisation

Because the tagline promises impact "through data", charts are brand moments. Use this series order: Current `#0268BB`, Node `#03B7B7`, `blue-300` `#86C4FE`, `teal-800` `#015660`, then the portfolio accents if more series are needed. Gridlines use `slate-200` on light and `slate-800` on dark. Always label series directly, not through a legend alone, and never rely on colour alone to distinguish them.

---

## 7. Motion principles

Motion at Systagma performs the brand's promise: **order from noise**. Scattered points become a system as the visitor scrolls. Motion is rich, but it is never random and it is always tied to meaning.

| Principle | In practice |
|---|---|
| The visitor puts things in order | Scroll drives the main story: the symbol assembles, pillars change form, the contact node brightens as the form is completed. Motion follows the reader's hand instead of playing at them |
| One scene, many formations | A single particle field runs behind the whole website; chapters ask it for formations instead of adding their own decorations |
| Editorial calm, console precision | Headlines reveal in measured lines; small console readouts update with live values. Nothing bounces; small overshoot only when a node "arrives" |
| Rich but budgeted | Every animated layer has a performance budget, an adaptive fallback and a still image |
| Calm mode is designed | People who ask for less motion (system setting or the site's own toggle) get the same story as composed stills, with nothing hidden |

Libraries, layers, timings and the field's formations are specified in `Design-system.md` sections 7–10.

---

## 8. Voice and tone

### 8.1 Principles

**Say what it does.** "We connect your ERP to your online store" beats "We deliver integrated omnichannel solutions."
**Show the number or drop the claim.** "Demos every two weeks" is a promise; "agile excellence" is noise. Every figure published on the site must be true and explainable.
**Plain first, technical when useful.** Spell out an acronym the first time (*Business Intelligence (BI)*), then use it freely.
**Calm confidence.** No superlatives, no false urgency, no exclamation marks in headlines.
**Talk to one person.** "Você" and "you", never "the client" in customer-facing copy.

### 8.2 Words

| Prefer (PT-BR) | Prefer (EN) | Avoid (PT-BR) | Avoid (EN) |
|---|---|---|---|
| construir, conectar, medir, entregar | build, connect, measure, ship | soluções inovadoras, de ponta | innovative solutions, cutting-edge |
| prazo, escopo, investimento | timeline, scope, budget | sinergia, alavancar | synergy, leverage |
| código, dados, sistema | code, data, system | disruptivo, revolucionário | disruptive, revolutionary |
| você, sua empresa | you, your team | "transformação digital" sem explicar o quê | "digital transformation" without saying what changes |

### 8.3 Interface vocabulary

An action keeps the same name through its whole flow, so people learn the interface.

| Action | Button (PT-BR / EN) | In progress | Done |
|---|---|---|---|
| Send the contact form | Enviar mensagem / Send message | Enviando… / Sending… | Mensagem enviada / Message sent |
| Start the contact journey | Iniciar um projeto / Start a project | n/a | n/a |
| Open WhatsApp | Conversar no WhatsApp / Chat on WhatsApp | n/a | n/a |
| Copy the email address | Copiar e-mail / Copy email | n/a | E-mail copiado / Email copied |
| Open a portfolio item | Ver projeto / View project | n/a | n/a |

### 8.4 Formatting conventions

| Item | PT-BR | EN |
|---|---|---|
| Dates | 24 set. 2026 | Sep 24, 2026 |
| Currency | R$ 30 mil, R$ 1.250,00 | US$ 10k, $1,250.00 |
| Time and hours | 9h–18h | 9 am–6 pm |
| Phone | +55 (XX) XXXXX-XXXX | +55 XX XXXXX XXXX |
| Case | Sentence case everywhere | Sentence case everywhere |

### 8.5 Rewrites

| Before | After |
|---|---|
| Oferecemos soluções tecnológicas inovadoras para alavancar o seu negócio. | Construímos o software que sua operação precisa e conectamos ele ao que você já usa. |
| We are passionate about delivering excellence. | You'll see working software every two weeks. |
| Entre em contato e descubra como podemos ajudar! | Conte o que você quer construir. Respondemos em até um dia útil. |

---

## 9. Portfolio brand architecture

Systagma will host several projects. The recommended model is an **endorsed brand architecture**: each product has its own name and identity, and Systagma appears as a quiet guarantor.

| Model | How it looks | Verdict |
|---|---|---|
| Branded house ("Systagma Pay", "Systagma Analytics") | One brand everywhere | Rejected: every product failure touches the parent, and products can't be spun out or sold cleanly. |
| House of brands (no visible link) | Products fully independent | Rejected: new products lose the credibility the parent has built. |
| **Endorsed** ("Lumen — a Systagma product") | Own identity plus a small endorsement | **Adopted.** Products can grow independently while borrowing trust. |

**Client projects** are not part of the portfolio architecture. They carry the client's brand only; Systagma appears as a credit ("Desenvolvido por Systagma / Built by Systagma") in case studies and, with the client's permission, in the product's footer.

### 9.1 What products share and what they own

| Shared with Systagma (keeps the family resemblance) | Owned by each product (keeps it distinct) |
|---|---|
| Neutral scale (slate), Abyss and Mist surfaces | Name and wordmark |
| IBM Plex Sans for text; Source Serif 4 allowed for display | One accent from the portfolio set (4.5) |
| Spacing, grid, radius and motion tokens | Product symbol (when it gets one) |
| Accessibility rules and voice principles | Product-specific tone within the voice principles |

### 9.2 Endorsement lockup

The product logo sits on the left; a 1 px divider in the current border colour follows; then the endorsement text "um produto Systagma" or "a Systagma product" in Plex Sans Medium, set at 40% of the product wordmark's height. For very small spaces, the compact Systagma symbol at the wordmark's cap height may replace the text. Every product website's footer carries the endorsement and links to the Systagma site.

### 9.3 Before a product has a logo

A product in development may use a **node mark**: a filled circle in its accent colour with the product's initial in Abyss, Source Serif 4 at weight 400. This keeps the portfolio grid consistent while identities are designed.

### 9.4 Naming guidance for products

Names should be short (two or three syllables), pronounceable in Portuguese and English, not built on "Sys-" or "-tagma" (that would blur the endorsed model), and checked for availability with the INPI trademark database and for the matching domain before any public use.

---

## 10. Applications

### 10.1 WhatsApp Business profile

Contact will be mainly by email, with WhatsApp Business as a second channel. When the account is created:

| Setting | Content |
|---|---|
| Profile photo | `avatar-abyss.png`: symbol centred on Abyss, symbol height about 60% of the canvas so the circle crop is safe. |
| Business name | Systagma |
| Category | The closest available software or IT services category. |
| Description | PT: "Software sob medida, integrações e dados. Atendimento em dias úteis, 9h–18h." **[CONFIRM hours]** EN version in the same structure if serving international clients. |
| Email and website | The main contact email and the site URL. |
| Greeting message | "Olá! Aqui é a Systagma. Conte em poucas palavras o que você quer construir e respondemos ainda hoje em horário comercial." |
| Away message | "Recebemos sua mensagem. Nosso horário é de segunda a sexta, 9h–18h. Se preferir, escreva para [e-mail]." |
| Quick replies | `/orcamento` (how proposals work), `/portfolio` (link to the portfolio section), `/email` (the email address), `/reuniao` (booking link, if one exists). |
| Labels | Novo contato, Em proposta, Cliente, Parceiro. |

### 10.2 Email signature

Name in Plex Sans SemiBold (Ink), role and phone in Plex Sans Regular (`slate-600`), the horizontal lockup at 120 px wide as a hosted PNG (with `alt="Systagma"`), and one line with the site URL. No quotes, banners, or social icon rows.

### 10.3 Social

Avatar: `avatar-abyss.png`. Cover images: a field poster (e.g., the `symbol` or `lattice` formation) as background, the brand tagline in Source Serif 4 italic, the symbol on the right within the platform's safe area. Posts follow the voice rules; carousels use Mist or Abyss backgrounds, never the Flow gradient.

---

## 11. Governance

| Topic | Rule |
|---|---|
| Ownership | One named brand owner approves new lockups, product accents and any change to this document. **[CONFIRM owner]** |
| Versioning | Semantic versions: major for identity changes, minor for new rules, patch for corrections. Record changes in a changelog at the end of this file. |
| Source of truth | Colour, type and motion values are defined once in `Design-system.md` and exported as tokens; this guide explains *why*, the design system defines *what*. |
| Review | Revisit after the first two portfolio products launch to check the endorsed model works in practice. |

### Sources for the market scan

WGSN and Coloro, Colour of the Year 2026 (Transformative Teal), as reported by mr-mag.com and fashionunited.uk. Tentackles, "4 B2B SaaS Color Palettes That Stand Out in 2026". Inkbot Design, "Brand Colour Trends in 2026". Stauffer, "Why 2026 Color Trends Are Signaling a Craving for Reality". Reference site analysis based on the four HTML files supplied with the brief (wama.com.br, weevolveit.com, finseo.ai, axiom-power-template.webflow.io).

### Changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | Sep 2026 | First complete draft. |
| 1.1 | Sep 2026 | Website direction "Order from noise": Void base colour, dark-dominant proportion, new type voices (Source Serif 4, Plex Sans, Plex Mono), the field motif, rewritten motion principles. |
