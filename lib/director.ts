// Per-frame scene state shared by the scroll engine (writer) and the field renderer (reader).
// Plain mutable object on purpose: it changes 60 times a second and must never trigger React renders.

export const FORMATIONS = ["noise", "symbol", "lattice", "build", "connect", "analyze", "transform", "current", "converge"] as const;
export type FormationId = (typeof FORMATIONS)[number];

/** Formation reached at chapter progress `at` (0–1); the morph into it spans `span` (default 30% of the gap). */
export type Key = { at: number; formation: FormationId; span?: number };

export const director = {
  from: 0,
  to: 0,
  mix: 0,
  dim: 1,
  velocity: 0, // −1…1
  pointer: [0, 0] as [number, number], // NDC
  pointerStrength: 0,
  emit: 0, // converge node brightness, 0–1 (contact form steps)
  burst: 0, // outward impulse, decays in the renderer
  converge: [0.5, 0] as [number, number], // NDC centre of the contact form panel
  safe: [] as [number, number, number, number][], // device-pixel rects, y flipped for gl_FragCoord
  settled: false, // contact sent: the field rests on the symbol
};

const idx = (f: FormationId) => FORMATIONS.indexOf(f);

export function resolve(keys: Key[], p: number) {
  if (p <= keys[0].at) return { from: idx(keys[0].formation), to: idx(keys[0].formation), mix: 0 };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (p <= b.at) {
      const span = b.span ?? (b.at - a.at) * 0.3;
      const t = Math.min(1, Math.max(0, (p - (b.at - span)) / span));
      return { from: idx(a.formation), to: idx(b.formation), mix: t * t * (3 - 2 * t) };
    }
  }
  const last = idx(keys[keys.length - 1].formation);
  return { from: last, to: last, mix: 0 };
}
