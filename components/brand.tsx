import Image from "next/image";
import symbol from "@/public/brand/systagma-symbol-color.png";

/**
 * The colour symbol, keyed out of the supplied JPEG (assets/logo (4).jpeg).
 * ponytail: raster; the hero assembly animation (SPEC 9.1) needs the vector redraw with separate parts.
 */
export function Symbol({ label, className, sizes, eager }: { label?: string; className?: string; sizes: string; eager?: boolean }) {
  return (
    <Image
      src={symbol}
      alt={label ?? ""}
      sizes={sizes}
      loading={eager ? "eager" : undefined}
      className={className}
    />
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-display text-[1.375rem] font-semibold tracking-tight">
      <Symbol className="h-7 w-auto" sizes="18px" eager />
      Systagma
    </span>
  );
}

const glyphs = [
  // Build: two stacked isometric segments
  <path key="b" d="M4 9.5 12 5l8 4.5-8 4.5zM4 14.5l8 4.5 8-4.5" />,
  // Connect: two nodes and a connector
  <g key="c"><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="5.5" r="2.5" /><path d="m7.3 16.7 9.4-9.4" /></g>,
  // Analyze: a node with three branches of different lengths
  <g key="a"><circle cx="5.5" cy="12" r="2.5" /><path d="M8 12h13M7.5 10.5 15 6M7.5 13.5 12 17" /></g>,
  // Transform: one segment folding at 30°
  <path key="t" d="M3 17.5 12 12.3V4M12 12.3l9 5.2" />,
];

export function PillarGlyph({ index }: { index: number }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" aria-hidden>
      {glyphs[index]}
    </svg>
  );
}

/** Idea → System → Impact on the symbol's diagonal (SPEC S2). */
export function ConnectorDiagram({ title, labels }: { title: string; labels: string[] }) {
  const nodes = [
    [24, 196],
    [120, 120],
    [216, 44],
  ];
  return (
    <svg viewBox="0 0 320 240" className="w-full max-w-80" role="img" aria-labelledby="connector-title">
      <title id="connector-title">{title}</title>
      <path d="M24 196 216 44" stroke="var(--sys-line-input)" strokeWidth="2" />
      {nodes.map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={y}
            r={i === 1 ? 12 : 8}
            fill={i === 1 ? "var(--color-accent-fill)" : "var(--sys-surface)"}
            stroke={i === 1 ? "none" : "var(--sys-line-input)"}
            strokeWidth="2"
          />
          <text x={x + 18} y={y + 5} fill="currentColor" fontSize="15" fontWeight="500">
            {labels[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}
