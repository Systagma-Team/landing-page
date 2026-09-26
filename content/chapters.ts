import type { Key } from "@/lib/director";

// Chapter map (SPEC 5.1) as data: the engine, HUD and header read it; tune choreography here.
// Continuity rule: on each page, a chapter's first key is the previous chapter's last formation.
// C4 Work and C6 Testimonials are absent until content exists.
export const CHAPTERS = [
  // Home: hero → problems → name → solutions → where to start → how we work → FAQ → contact
  { id: "hero", anchor: "top", pinned: true, dim: 1, keys: [{ at: 0, formation: "noise" }, { at: 0.6, formation: "symbol", span: 0.6 }] },
  { id: "problems", anchor: "problems", pinned: false, dim: 0.35, keys: [{ at: 0, formation: "symbol" }] },
  { id: "about", anchor: "about", pinned: true, dim: 0.8, keys: [{ at: 0, formation: "symbol" }, { at: 0.35, formation: "lattice", span: 0.35 }] },
  {
    id: "services",
    anchor: "services",
    pinned: true,
    dim: 1,
    // Software → planes, Data → chart, Automation & AI → network, Web → the symbol
    keys: [
      { at: 0, formation: "lattice" },
      { at: 0.14, formation: "build" },
      { at: 0.38, formation: "analyze" },
      { at: 0.62, formation: "connect" },
      { at: 0.86, formation: "transform" },
    ],
  },
  { id: "catalog", anchor: "catalog", pinned: false, dim: 0.35, keys: [{ at: 0, formation: "transform" }] },
  { id: "how", anchor: "how-we-work", pinned: false, dim: 0.35, keys: [{ at: 0, formation: "transform" }, { at: 0.2, formation: "lattice" }] },
  { id: "faq", anchor: "faq", pinned: false, dim: 0.3, keys: [{ at: 0, formation: "lattice" }] },
  { id: "contact", anchor: "contact", pinned: false, dim: 1, keys: [{ at: 0, formation: "lattice" }, { at: 0.4, formation: "converge", span: 0.4 }] },
  // Offer pages: the offer's formation, settling into the lattice the contact chapter starts from
  { id: "software", anchor: "main", pinned: false, dim: 0.45, keys: [{ at: 0, formation: "build" }, { at: 0.85, formation: "lattice", span: 0.25 }] },
  { id: "data", anchor: "main", pinned: false, dim: 0.45, keys: [{ at: 0, formation: "analyze" }, { at: 0.85, formation: "lattice", span: 0.25 }] },
  { id: "automation", anchor: "main", pinned: false, dim: 0.45, keys: [{ at: 0, formation: "connect" }, { at: 0.85, formation: "lattice", span: 0.25 }] },
  { id: "web", anchor: "main", pinned: false, dim: 0.45, keys: [{ at: 0, formation: "transform" }, { at: 0.85, formation: "lattice", span: 0.25 }] },
  // Consulting: noise put in order, the brand's own story
  { id: "consulting", anchor: "main", pinned: false, dim: 0.45, keys: [{ at: 0, formation: "noise" }, { at: 0.3, formation: "symbol", span: 0.3 }, { at: 0.85, formation: "lattice", span: 0.25 }] },
  { id: "support", anchor: "main", pinned: false, dim: 0.45, keys: [{ at: 0, formation: "current" }, { at: 0.85, formation: "lattice", span: 0.25 }] },
  // 404: the symbol, dimmed (SPEC 14.2)
  { id: "lost", anchor: "main", pinned: false, dim: 0.6, keys: [{ at: 0, formation: "symbol" }] },
] as const satisfies readonly { id: string; anchor: string; pinned: boolean; dim: number; keys: Key[] }[];

export type ChapterId = (typeof CHAPTERS)[number]["id"];

/** Chapter order of the home page (continuity is checked along it in tests/check.mts). */
export const HOME: ChapterId[] = ["hero", "problems", "about", "services", "catalog", "how", "faq", "contact"];

/** Pillar thresholds in the services pin (SPEC C3): pillar k is active from PILLAR_AT[k-1]. */
export const PILLAR_AT = [0.12, 0.36, 0.6, 0.84] as const;
