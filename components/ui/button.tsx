import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

// Buttons (Design System 11.3): chamfer, fill wipe from the left and a text roll (CSS in globals.css).
const variants = {
  primary: "bg-btn-bg text-btn-fg",
  secondary: "border border-line-strong text-fg [--wipe:rgb(241_244_248/0.08)]",
} as const;
const sizes = { md: "h-14 px-7", sm: "h-12 px-5" } as const;

type Style = { variant?: keyof typeof variants; size?: keyof typeof sizes };

export const buttonClass = ({ variant = "primary", size = "md" }: Style = {}) =>
  `btn chamfer inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium tracking-[0.01em] text-body-sm select-none ${variants[variant]} ${sizes[size]}`;

/** The label and its aria-hidden twin that rolls in on hover. */
export function Roll({ children }: { children: ReactNode }) {
  return (
    <span className="roll">
      <span>{children}</span>
      <span aria-hidden>{children}</span>
    </span>
  );
}

export function ButtonLink({
  variant,
  size,
  external,
  children,
  className = "",
  ...rest
}: ComponentPropsWithoutRef<"a"> & Style & { external?: boolean; children: ReactNode }) {
  return (
    <a className={`${buttonClass({ variant, size })} ${className}`} {...(external ? { target: "_blank", rel: "noopener" } : {})} {...rest}>
      <Roll>{children}</Roll>
      {external && <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden />}
    </a>
  );
}
