import type { ComponentProps, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <div className="mt-1 max-w-3xl text-sm text-slate-600">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ children, className, as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <Tag className={cx("rounded-lg border border-slate-200 bg-white shadow-xs", className)}>{children}</Tag>;
}

export function CardHeader({ title, description, actions, icon }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {icon}
          {title}
        </h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("px-4 py-3", className)}>{children}</div>;
}

type Tone = "neutral" | "positive" | "attention" | "negative" | "info" | "brand" | "muted";

const TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-300",
  positive: "bg-emerald-50 text-emerald-800 ring-emerald-300",
  attention: "bg-amber-50 text-amber-900 ring-amber-300",
  negative: "bg-red-50 text-red-800 ring-red-300",
  info: "bg-sky-50 text-sky-800 ring-sky-300",
  brand: "bg-brand-50 text-brand-800 ring-brand-200",
  muted: "bg-white text-slate-500 ring-slate-200",
};

export function Badge({ tone = "neutral", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function Stat({ label, value, hint, tone = "neutral", href, icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone; href?: string; icon?: ReactNode }) {
  const accent: Record<Tone, string> = {
    neutral: "border-l-slate-300",
    positive: "border-l-emerald-500",
    attention: "border-l-amber-500",
    negative: "border-l-red-500",
    info: "border-l-sky-500",
    brand: "border-l-brand-500",
    muted: "border-l-slate-200",
  };
  const body = (
    <div className={cx("h-full rounded-lg border border-l-4 border-slate-200 bg-white px-4 py-3 shadow-xs", accent[tone], href && "transition hover:border-slate-300 hover:shadow-sm")}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
  return href ? (
    <a href={href} className="block">
      {body}
    </a>
  ) : (
    body
  );
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      {icon && <div className="text-slate-400">{icon}</div>}
      <p className="text-sm font-medium text-slate-800">{title}</p>
      {children && <div className="max-w-xl text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "info", title, children, icon }: { tone?: Tone; title?: ReactNode; children?: ReactNode; icon?: ReactNode }) {
  const map: Record<Tone, string> = {
    neutral: "border-slate-200 bg-slate-50 text-slate-800",
    positive: "border-emerald-200 bg-emerald-50 text-emerald-900",
    attention: "border-amber-200 bg-amber-50 text-amber-900",
    negative: "border-red-200 bg-red-50 text-red-900",
    info: "border-sky-200 bg-sky-50 text-sky-900",
    brand: "border-brand-200 bg-brand-50 text-brand-900",
    muted: "border-slate-200 bg-white text-slate-700",
  };
  return (
    <div className={cx("flex gap-2 rounded-md border px-3 py-2 text-sm", map[tone])} role={tone === "negative" ? "alert" : undefined}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : undefined}>{children}</div>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ form controls

export const buttonClass = {
  primary:
    "inline-flex items-center justify-center gap-1.5 rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white shadow-xs hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-xs hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50",
  ghost: "inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50",
  small:
    "inline-flex items-center justify-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50",
};

export const inputClass =
  "block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50";

export function Field({ label, htmlFor, hint, children, className }: { label: ReactNode; htmlFor?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(inputClass, props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(inputClass, "pr-8", props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(inputClass, props.className)} />;
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th scope="col" className={cx("whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500", className)}>{children}</th>;
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx("px-3 py-2 align-top text-slate-700", className)}>{children}</td>;
}

export function DescriptionList({ items, columns = 2 }: { items: { label: string; value: ReactNode }[]; columns?: 1 | 2 | 3 }) {
  const cols = columns === 1 ? "" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";
  return (
    <dl className={cx("grid grid-cols-1 gap-x-6 gap-y-3", cols)}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs font-medium text-slate-500">{it.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-slate-900">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
