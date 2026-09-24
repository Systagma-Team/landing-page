// Button styles (Design System 10.1) as class strings: links and buttons share them.
const base =
  "inline-flex items-center justify-center gap-2 select-none whitespace-nowrap transition-colors duration-[180ms] ease-out active:scale-[0.98] disabled:cursor-not-allowed";

const variants = {
  primary: "chamfer bg-accent-fill text-on-accent font-semibold hover:bg-accent-fill-hover disabled:bg-slate-200 disabled:text-slate-550",
  secondary: "rounded-sm border border-fg text-fg font-medium hover:bg-surface-subtle",
  ghost: "rounded-sm text-fg font-medium hover:bg-surface-subtle",
} as const;

const sizes = { sm: "h-9 px-3.5 text-body-sm", md: "h-11 px-5 text-body-md", lg: "h-13 px-6 text-body-md" } as const;

export const button = (variant: keyof typeof variants = "primary", size: keyof typeof sizes = "md") =>
  `${base} ${variants[variant]} ${sizes[size]}`;
