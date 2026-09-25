// Vector brand marks from /brand/systagma-sprite.svg (interim trace; swap the sprite for the designer's redraw).
const SPRITE = "/brand/systagma-sprite.svg";

/** The symbol, full colour. */
export function Mark({ label, className }: { label?: string; className?: string }) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <svg viewBox="0 0 548 887" className={className} {...a11y}>
      <use href={`${SPRITE}#mark`} />
    </svg>
  );
}

/**
 * Horizontal lockup (Brand Guideline 3.2 C): symbol height = 2 × wordmark cap height, gap = 1N (15% of the
 * symbol), wordmark cap-height centre on the symbol's centre. Units are the symbol's own (887 tall).
 * The wordmark takes currentColor (white on dark, Ink on paper).
 */
export function Lockup({ className, label = "Systagma" }: { className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 3361 887" className={className} role="img" aria-label={label}>
      <use href={`${SPRITE}#mark`} width="548" height="887" />
      <use href={`${SPRITE}#wordmark`} x="681" y="222" width="2680" height="576" />
    </svg>
  );
}
