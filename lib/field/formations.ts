import { FORMATIONS, type FormationId } from "@/lib/director";

// Formation generators (SPEC 7.1). Output per particle: x, y in a unit box (−1…1), alpha, tint (0 blue, 1 teal).
// The renderer maps each formation to the screen: "viewport" ones fill it, "zone" ones fit the field zone,
// "converge" sits on the contact form panel.
// ponytail: generation runs on the main thread (~20 ms for 6,000 points); move to a Worker if it shows up in traces.

export type Placement = "viewport" | "zone" | "converge";
export const PLACEMENT: Record<FormationId, Placement> = {
  noise: "viewport",
  symbol: "zone",
  lattice: "zone",
  build: "zone",
  connect: "zone",
  analyze: "zone",
  transform: "zone",
  current: "viewport",
  converge: "converge",
};

/** Live metadata the HUD shows for a formation (counts come from the generators, never hard-coded copy). */
export type Meta = Partial<Record<FormationId, Record<string, number>>>;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Out = { put: (x: number, y: number, alpha: number, tint: number) => void; rnd: () => number; n: number };

const gauss = (rnd: () => number) => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());

/** Samples the flat two-colour vector symbol: teal pixels → tint 1, blue → 0. */
async function symbolPixels() {
  const img = new Image();
  img.src = "/brand/systagma-symbol.svg";
  await img.decode();
  const w = 320;
  const h = Math.round((w * 887) / 548);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const px: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] < 128) continue;
    const teal = data[i * 4 + 1] / (data[i * 4 + 2] + 1) > 0.8 ? 1 : 0;
    px.push(i % w, Math.floor(i / w), teal);
  }
  return { px, w, h };
}

export async function generateAll(n: number) {
  const rowsPer = Math.ceil(n / 128);
  const data = new Float32Array(FORMATIONS.length * rowsPer * 128 * 4);
  const meta: Meta = {};
  const sym = await symbolPixels();

  const gens: Record<FormationId, (o: Out) => void> = {
    noise: ({ put, rnd, n }) => {
      for (let i = 0; i < n; i++) put(rnd() * 2 - 1, rnd() * 2 - 1, 0.35 + rnd() * 0.55, rnd());
    },
    symbol: ({ put, rnd, n }) => {
      const count = sym.px.length / 3;
      const s = 2 / sym.h; // fit height to −1…1
      for (let i = 0; i < n; i++) {
        const k = Math.floor(rnd() * count) * 3;
        const x = (sym.px[k] + rnd() * 0.8 - 0.4 - sym.w / 2) * s;
        const y = -(sym.px[k + 1] + rnd() * 0.8 - 0.4 - sym.h / 2) * s;
        put(x, y, 0.55 + rnd() * 0.45, sym.px[k + 2]);
      }
      meta.symbol = { order: 100 };
    },
    transform: ({ put, rnd, n }) => {
      const count = sym.px.length / 3;
      const s = 2 / sym.h;
      for (let i = 0; i < n; i++) {
        const k = Math.floor(rnd() * count) * 3;
        put((sym.px[k] - sym.w / 2) * s, -(sym.px[k + 1] - sym.h / 2) * s, Math.min(1, 0.65 + rnd() * 0.45), 1);
      }
      meta.transform = { system: 1 };
    },
    lattice: ({ put, rnd, n }) => {
      const spacing = 0.12;
      const dirs = [90, 30, 150].map((d) => [Math.cos((d * Math.PI) / 180), Math.sin((d * Math.PI) / 180)]);
      for (let i = 0; i < n; i++) {
        const [dx, dy] = dirs[Math.floor(rnd() * 3)];
        const off = (Math.floor(rnd() * 17) - 8) * spacing; // which line of the family
        const t = rnd() * 2.4 - 1.2; // position along it
        const x = -dy * off + dx * t;
        const y = dx * off + dy * t;
        const r = Math.hypot(x, y);
        put(x, y, Math.max(0, 0.7 * (1 - Math.min(1, Math.max(0, (r - 0.5) / 0.5)))), 0.3 + rnd() * 0.4);
      }
    },
    build: ({ put, rnd, n }) => {
      for (let i = 0; i < n; i++) {
        const k = Math.floor(rnd() * 4); // plane, 0 = top
        const u = rnd() - 0.5;
        const v = rnd() - 0.5;
        const x = (u - v) * 1.1 * 1.3;
        const y = ((u + v) * 0.64 * 0.5 + (1.5 - k) * 0.22 * 2) * 1.3;
        put(x, y, 0.45 + rnd() * 0.5, k === 0 ? 1 : 0.3 + rnd() * 0.3);
      }
      meta.build = { planes: 4 };
    },
    connect: ({ put, rnd, n }) => {
      const hubs: [number, number][] = [];
      for (let tries = 0; hubs.length < 24 && tries < 5000; tries++) {
        const h: [number, number] = [rnd() * 1.8 - 0.9, rnd() * 1.8 - 0.9];
        if (hubs.every(([x, y]) => Math.hypot(x - h[0], y - h[1]) > 0.3)) hubs.push(h);
      }
      const edges = new Set<string>();
      hubs.forEach(([x, y], i) => {
        hubs
          .map(([a, b], j) => [j, Math.hypot(a - x, b - y)] as const)
          .filter(([j]) => j !== i)
          .sort((a, b) => a[1] - b[1])
          .slice(0, 3)
          .forEach(([j]) => edges.add(i < j ? `${i}-${j}` : `${j}-${i}`));
      });
      // Keep the 36 shortest links (SPEC 7.1)
      const len = ([a, b]: number[]) => Math.hypot(hubs[a][0] - hubs[b][0], hubs[a][1] - hubs[b][1]);
      const list = [...edges].map((e) => e.split("-").map(Number)).sort((a, b) => len(a) - len(b)).slice(0, 36);
      for (let i = 0; i < n; i++) {
        if (rnd() < 0.4) {
          const [x, y] = hubs[Math.floor(rnd() * hubs.length)];
          put(x + gauss(rnd) * 0.025, y + gauss(rnd) * 0.025, 0.7 + rnd() * 0.3, 1);
        } else {
          const [a, b] = list[Math.floor(rnd() * list.length)];
          const t = rnd();
          put(hubs[a][0] + (hubs[b][0] - hubs[a][0]) * t, hubs[a][1] + (hubs[b][1] - hubs[a][1]) * t, 0.35 + rnd() * 0.3, 0.2);
        }
      }
      meta.connect = { nodes: hubs.length, edges: list.length };
    },
    analyze: ({ put, rnd, n }) => {
      const series = [0.25, 0.4, 0.35, 0.55, 0.5, 0.7, 0.62, 0.8, 0.75, 0.9, 0.85, 1.0];
      for (let i = 0; i < n; i++) {
        if (rnd() < 0.85) {
          const b = Math.floor(rnd() * 12);
          const h = series[b] * 1.8;
          const x = -0.88 + b * 0.16 + rnd() * 0.1;
          put(x, -0.9 + rnd() * h, 0.4 + rnd() * 0.5, series[b]);
        } else {
          const x = rnd() * 1.8 - 0.9;
          put(x, -0.75 + (x + 0.9) * 0.85 + gauss(rnd) * 0.06, 0.6 + rnd() * 0.4, 1);
        }
      }
      meta.analyze = { series: series.length };
    },
    current: ({ put, rnd, n }) => {
      for (let i = 0; i < n; i++) {
        const band = Math.floor(rnd() * 7);
        put(rnd() * 2 - 1, -0.72 + band * 0.24 + gauss(rnd) * 0.02, 0.3 + rnd() * 0.5, band % 2);
      }
    },
    converge: ({ put, rnd, n }) => {
      for (let i = 0; i < n; i++) {
        const r = -Math.log(1 - rnd()) * 0.12;
        const a = rnd() * Math.PI * 2;
        put(Math.cos(a) * r, Math.sin(a) * r, Math.max(0.15, 0.9 - r * 2), r < 0.08 ? 1 : 0.4);
      }
    },
  };

  FORMATIONS.forEach((id, f) => {
    const rnd = mulberry32(0x5157 + f);
    let i = 0;
    const base = f * rowsPer * 128 * 4;
    const put = (x: number, y: number, alpha: number, tint: number) => {
      data.set([x, y, alpha, tint], base + i++ * 4);
    };
    gens[id]({ put, rnd, n });
  });

  return { data, rowsPer, meta };
}
