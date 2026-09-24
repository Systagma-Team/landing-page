"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { submitContact } from "@/app/actions/contact";
import { BUDGETS, NEEDS, type ContactState, type ErrorKey } from "@/lib/schema/contact";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { button } from "@/lib/ui";

type Props = { email: string };

const FIELDS = ["name", "email", "needs", "message"] as const;

/** Remounting via key is how "send another message" resets the action state. */
export function ContactForm(props: Props) {
  const [round, setRound] = useState(0);
  return <Form key={round} {...props} onAgain={() => setRound(round + 1)} />;
}

function Form({ email, onAgain }: Props & { onAgain: () => void }) {
  // Messages come from NextIntlClientProvider in the layout (contact namespace only)
  const locale = useLocale();
  const t = useMessages().contact;
  const tf = useTranslations("contact");
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, { status: "idle" });
  const form = useRef<HTMLFormElement>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const [count, setCount] = useState(0);
  const [startedAt, setStartedAt] = useState("");
  const [utm, setUtm] = useState("");
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    // The form resets to the returned values after each submit; keep the counter in step
    setSeen(state);
    setCount(state.status === "invalid" ? String(state.values.message ?? "").length : 0);
  }

  const errors = state.status === "invalid" ? state.fieldErrors : {};
  const values = state.status === "invalid" ? state.values : {};
  const err = (f: (typeof FIELDS)[number]) => errors[f]?.[0] as ErrorKey | undefined;
  const invalid = FIELDS.filter((f) => err(f));

  useEffect(() => {
    // UTM attribution without cookies (SPEC 13)
    try {
      const q = new URLSearchParams(location.search);
      const found = [...q].filter(([k]) => k.startsWith("utm_")).map(([k, v]) => `${k}=${v}`).join("&");
      if (found) sessionStorage.setItem("utm", found);
    } catch {}
  }, []);

  useEffect(() => {
    if (state.status === "success") successHeading.current?.focus();
    if (state.status === "invalid") form.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-start gap-4" aria-live="polite">
        <span className="grid size-10 place-items-center rounded-full bg-accent-fill text-on-accent">
          <Check size={20} strokeWidth={2} aria-hidden />
        </span>
        <h3 ref={successHeading} tabIndex={-1} className="text-heading-sm">
          {t.success.title}
        </h3>
        {state.email && <p className="text-fg-muted">{tf("success.body", { email: state.email })}</p>}
        <button type="button" className={button("ghost", "md")} onClick={onAgain}>
          {t.success.again}
        </button>
      </div>
    );
  }

  const describedBy = (f: string, hint?: boolean) => [hint && `${f}-hint`, errors[f as keyof typeof errors] && `${f}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <form
      ref={form}
      action={action}
      noValidate
      aria-label={t.form.label}
      onFocus={() => {
        if (startedAt) return;
        setStartedAt(String(Date.now()));
        try {
          setUtm(sessionStorage.getItem("utm") ?? "");
        } catch {}
      }}
      className="flex flex-col gap-6"
    >
      <p className="text-caption text-fg-subtle">{t.form.required}</p>

      {invalid.length > 0 && (
        <div role="alert" className="rounded-sm bg-danger-bg p-4 text-body-sm text-danger-fg">
          <p className="font-medium">{t.form.summary}</p>
          <ul className="mt-2 list-disc pl-5">
            {invalid.map((f) => (
              <li key={f}>
                <a href={`#${f === "needs" ? "needs-0" : f}`} className="underline">
                  {t.errors[err(f)!]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="startedAt" value={startedAt} />
      <input type="hidden" name="source" value="contact" />
      <input type="hidden" name="utm" value={utm} />
      {/* Honeypot: humans never see or reach it */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="sr-only" />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="name" label={`${t.form.name} *`} error={err("name") && t.errors[err("name")!]}>
          <input
            id="name" name="name" type="text" autoComplete="name" required maxLength={120}
            defaultValue={String(values.name ?? "")}
            aria-invalid={!!err("name")} aria-describedby={describedBy("name")} className={input}
          />
        </Field>
        <Field id="email" label={`${t.form.email} *`} error={err("email") && t.errors[err("email")!]}>
          <input
            id="email" name="email" type="email" autoComplete="email" required maxLength={254}
            defaultValue={String(values.email ?? "")}
            aria-invalid={!!err("email")} aria-describedby={describedBy("email")} className={input}
          />
        </Field>
      </div>

      <Field id="company" label={t.form.company}>
        <input id="company" name="company" type="text" autoComplete="organization" maxLength={120} defaultValue={String(values.company ?? "")} className={input} />
      </Field>

      <fieldset aria-describedby={err("needs") ? "needs-error" : undefined}>
        <legend className="mb-3 text-body-sm font-medium">{t.form.needs} *</legend>
        <div className="flex flex-wrap gap-2">
          {NEEDS.map((n, i) => (
            <label key={n} className={chip}>
              <input
                id={`needs-${i}`} type="checkbox" name="needs" value={n} className="peer sr-only"
                defaultChecked={Array.isArray(values.needs) && values.needs.includes(n)}
                aria-invalid={!!err("needs")}
              />
              <Check size={16} strokeWidth={2} aria-hidden className="hidden peer-checked:block" />
              {t.form.needsOptions[n]}
            </label>
          ))}
        </div>
        {err("needs") && <FieldError id="needs-error">{t.errors[err("needs")!]}</FieldError>}
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-body-sm font-medium">{t.form.budget}</legend>
        <div className="flex flex-wrap gap-2">
          {BUDGETS.map((b) => (
            <label key={b} className={chip}>
              <input type="radio" name="budget" value={b} className="peer sr-only" defaultChecked={values.budget === b} />
              <Check size={16} strokeWidth={2} aria-hidden className="hidden peer-checked:block" />
              {t.form.budgetOptions[b]}
            </label>
          ))}
        </div>
      </fieldset>

      <Field id="message" label={`${t.form.message} *`} error={err("message") && t.errors[err("message")!]}>
        <p id="message-hint" className="-mt-1 mb-1 text-body-sm text-fg-subtle">{t.form.messageHint}</p>
        <textarea
          id="message" name="message" required minLength={20} maxLength={2000} rows={6}
          defaultValue={String(values.message ?? "")}
          onChange={(e) => setCount(e.target.value.length)}
          aria-invalid={!!err("message")} aria-describedby={describedBy("message", true)}
          className={`${input} h-auto min-h-36 resize-y py-3`}
        />
        <p className="text-right text-caption text-fg-subtle tabular-nums">{tf("form.counter", { count })}</p>
      </Field>

      <p className="text-caption text-fg-subtle">
        {tf.rich("form.lgpd", { link: (text) => <Link href="/privacidade" className="link">{text}</Link> })}
      </p>

      {(state.status === "send_error" || state.status === "rate_limited") && (
        <p role="alert" className="flex gap-2 text-body-sm text-danger-fg">
          <AlertCircle size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
          {tf(state.status === "send_error" ? "sendError" : "rateLimited", { email })}
        </p>
      )}

      <button type="submit" disabled={pending} aria-busy={pending || undefined} className={`${button("primary", "lg")} min-w-52 self-start`}>
        {pending && <Loader2 size={20} strokeWidth={1.5} aria-hidden className="animate-spin" />}
        {pending ? t.form.sending : t.form.submit}
      </button>
    </form>
  );
}

const input =
  "h-12 w-full rounded-sm border border-line-input bg-surface-raised px-4 text-body-md text-fg focus:border-accent aria-invalid:border-danger-fg";
const chip =
  "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-sm border border-line-input px-4 text-body-sm transition-colors duration-[180ms] has-checked:border-accent-fill has-checked:bg-accent-fill has-checked:text-on-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus";

function Field({ id, label, error, children }: { id: string; label: string; error?: string | false; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-body-sm font-medium">{label}</label>
      {children}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mt-2 flex gap-1.5 text-body-sm text-danger-fg">
      <AlertCircle size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}
