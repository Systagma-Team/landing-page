import type { Key } from "@/lib/director";

// Chapter map (SPEC 5.1) as data: the engine, HUD and header read it; tune choreography here.
// Continuity rule: each chapter's first key is the previous chapter's last formation.
// C4 Work and C6 Testimonials are absent until content exists, so "how" starts from `transform`.
export const CHAPTERS = [
  { id: "hero", anchor: "top", pinned: true, dim: 1, keys: [{ at: 0, formation: "noise" }, { at: 0.6, formation: "symbol", span: 0.6 }] },
  { id: "about", anchor: "about", pinned: true, dim: 0.8, keys: [{ at: 0, formation: "symbol" }, { at: 0.35, formation: "lattice", span: 0.35 }] },
  {
    id: "services",
    anchor: "services",
    pinned: true,
    dim: 1,
    keys: [
      { at: 0, formation: "lattice" },
      { at: 0.14, formation: "build" },
      { at: 0.38, formation: "connect" },
      { at: 0.62, formation: "analyze" },
      { at: 0.86, formation: "transform" },
    ],
  },
  { id: "how", anchor: "how-we-work", pinned: false, dim: 0.35, keys: [{ at: 0, formation: "transform" }, { at: 0.2, formation: "lattice" }] },
  { id: "faq", anchor: "faq", pinned: false, dim: 0.3, keys: [{ at: 0, formation: "lattice" }] },
  { id: "contact", anchor: "contact", pinned: false, dim: 1, keys: [{ at: 0, formation: "lattice" }, { at: 0.4, formation: "converge", span: 0.4 }] },
  // 404: the symbol, dimmed (SPEC 14.2)
  { id: "lost", anchor: "main", pinned: false, dim: 0.6, keys: [{ at: 0, formation: "symbol" }] },
] as const satisfies readonly { id: string; anchor: string; pinned: boolean; dim: number; keys: Key[] }[];

export type ChapterId = (typeof CHAPTERS)[number]["id"];

/** Pillar thresholds in the services pin (SPEC C3): pillar k is active from PILLAR_AT[k-1]. */
export const PILLAR_AT = [0.12, 0.36, 0.6, 0.84] as const;
