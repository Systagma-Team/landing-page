"use client";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { submitContact } from "@/app/actions/contact";
import { BUDGETS, NEEDS, STEPS } from "@/lib/contact-options";
import type { ContactField, ContactState, ErrorKey } from "@/lib/schema/contact";
import { director } from "@/lib/director";
import { getPathname } from "@/i18n/navigation";
import { buttonClass, Roll } from "@/components/ui/button";

type Errors = Partial<Record<ContactField, string[]>>;

const useHydrated = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

/** Remounting via key is how "send another message" resets the action state. */
export function ContactForm(props: { email: string }) {
  const [round, setRound] = useState(0);
  return <Form key={round} {...props} onAgain={() => setRound(round + 1)} />;
}

/**
 * Three-step form (Design System 11.12, SPEC C8): one <form>, three <fieldset>s. Without JavaScript all steps show
 * and it submits as one page; with JavaScript one step shows at a time and "Continuar" validates only that step.
 */
function Form({ email, onAgain }: { email: string; onAgain: () => void }) {
  const locale = useLocale();
  const t = useMessages().contact;
  const tf = useTranslations("contact");
  const js = useHydrated();
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, { status: "idle" });
  const form = useRef<HTMLFormElement>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0);
  const [clientErrors, setClientErrors] = useState<Errors>({});
  const [count, setCount] = useState(0);
  const [startedAt, setStartedAt] = useState("");
  const [utm, setUtm] = useState("");

  // Server answers: jump back to the first step with an error; keep the message counter in step
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if ("values" in state) setCount(String(state.values.message ?? "").length);
    if (state.status === "invalid") {
      setClientErrors({});
      const first = STEPS.findIndex((fields) => fields.some((f) => state.fieldErrors[f]));
      if (first >= 0) setStep(first);
    }
  }

  const errors: Errors = { ...(state.status === "invalid" ? state.fieldErrors : {}), ...clientErrors };
  const values = "values" in state ? state.values : {};
  const err = (f: ContactField) => errors[f]?.[0] as ErrorKey | undefined;
  const invalid = (["name", "email", "needs", "message"] as const).filter((f) => err(f));

  useEffect(() => {
    // UTM attribution without cookies (SPEC 12)
    try {
      const q = new URLSearchParams(location.search);
      const found = [...q].filter(([k]) => k.startsWith("utm_")).map(([k, v]) => `${k}=${v}`).join("&");
      if (found) sessionStorage.setItem("utm", found);
    } catch {}
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      director.emit = 1;
      director.burst = 1; // points fly out and settle into the symbol
      director.settled = true;
      successHeading.current?.focus();
    }
    if (state.status === "send_error" || state.status === "rate_limited") director.emit = 0.66;
    if (state.status === "invalid") form.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state]);

  const next = async () => {
    // The validator (zod) loads on the first "Continuar", keeping it out of the page's first load
    const [{ z }, { contactSchema, readContact }] = await Promise.all([import("zod/mini"), import("@/lib/schema/contact")]);
    const fields = STEPS[step];
    const shape = Object.fromEntries(fields.map((f) => [f, true])) as Record<(typeof fields)[number], true>;
    const parsed = z.pick(contactSchema, shape).safeParse(readContact(new FormData(form.current!)));
    if (!parsed.success) {
      setClientErrors(z.flattenError(parsed.error).fieldErrors as Errors);
      return;
    }
    setClientErrors({});
    director.emit = (step + 1) / 3; // the converge node brightens per completed step
    setStep(step + 1);
  };

  // Focus follows the step: first invalid field on errors, the new step's legend when advancing
  const moved = useRef(false);
  useEffect(() => {
    if (Object.keys(clientErrors).length) form.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [clientErrors]);
  useEffect(() => {
    // A server-side error that sent us back to this step wins over the legend
    const invalidHere = form.current?.querySelector<HTMLElement>("fieldset:not([hidden]) [aria-invalid='true']");
    if (moved.current) (invalidHere ?? document.getElementById(`step-${step}-legend`))?.focus();
    moved.current = true;
  }, [step]);

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-start gap-5" aria-live="polite">
        <span className="grid size-12 place-items-center rounded-full bg-emit text-btn-fg">
          <Check size={22} strokeWidth={2} aria-hidden />
        </span>
        <h3 ref={successHeading} tabIndex={-1} className="font-serif text-display-md font-light">{t.success.title}</h3>
        {state.email && <p className="text-body-lg text-fg-muted">{tf("success.body", { email: state.email })}</p>}
        <button type="button" className={buttonClass({ variant: "secondary" })} onClick={onAgain}>
          <Roll>{t.success.again}</Roll>
        </button>
      </div>
    );
  }

  const describedBy = (f: ContactField, hint?: boolean) => [hint && `${f}-hint`, err(f) && `${f}-error`].filter(Boolean).join(" ") || undefined;
  const shown = (i: number) => !js || i === step;
  const failed = state.status === "send_error" || state.status === "rate_limited";

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
      onSubmit={(e) => {
        // Enter on an early step means "Continuar", not "send everything"
        if (js && step < STEPS.length - 1) {
          e.preventDefault();
          next();
        }
      }}
    >
      <div className="mb-10">
        <div className="flex items-baseline justify-between gap-4">
          {js && (
            <p className="hud text-accent" aria-live="polite">
              <span aria-hidden>{String(step + 1).padStart(2, "0")} / 03</span>
              <span className="sr-only">{tf("stepAnnounce", { n: step + 1, name: t.steps[step] })}</span>
            </p>
          )}
          <p className="text-caption text-fg-subtle">{t.form.required}</p>
        </div>
        {js && (
          <span aria-hidden className="mt-4 block h-px bg-line-strong">
            <span className="block h-px origin-left bg-accent transition-transform duration-400" style={{ transform: `scaleX(${(step + 1) / 3})` }} />
          </span>
        )}
      </div>

      {invalid.length > 0 && (
        <div role="alert" className="mb-8 rounded-sm border border-danger/40 p-4 text-body-sm text-danger">
          <p className="font-medium">{t.form.summary}</p>
          <ul className="mt-2 list-disc pl-5">
            {invalid.map((f) => (
              <li key={f}>
                <a href={`#${f === "needs" ? "needs-0" : f}`} className="underline">{t.errors[err(f)!]}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Step index={0} name={t.steps[0]} shown={shown(0)}>
        <Field id="name" label={`${t.form.name} *`} error={err("name") && t.errors[err("name")!]}>
          <input id="name" name="name" type="text" autoComplete="name" required maxLength={120} defaultValue={String(values.name ?? "")} aria-invalid={!!err("name")} aria-describedby={describedBy("name")} className={input} />
        </Field>
        <Field id="email" label={`${t.form.email} *`} error={err("email") && t.errors[err("email")!]}>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={String(values.email ?? "")} aria-invalid={!!err("email")} aria-describedby={describedBy("email")} className={input} />
        </Field>
        <Field id="company" label={t.form.company}>
          <input id="company" name="company" type="text" autoComplete="organization" maxLength={120} defaultValue={String(values.company ?? "")} className={input} />
        </Field>
      </Step>

      <Step index={1} name={t.steps[1]} shown={shown(1)}>
        <fieldset aria-describedby={err("needs") ? "needs-error" : undefined}>
          <legend className="mb-4 text-body-sm font-medium">{t.form.needs} *</legend>
          <div className="flex flex-wrap gap-2">
            {NEEDS.map((n, i) => (
              <label key={n} className={pill}>
                <input id={`needs-${i}`} type="checkbox" name="needs" value={n} className="peer sr-only" defaultChecked={Array.isArray(values.needs) && values.needs.includes(n)} aria-invalid={!!err("needs")} />
                <Check size={16} strokeWidth={2} aria-hidden className="hidden peer-checked:block" />
                {t.form.needsOptions[n]}
              </label>
            ))}
          </div>
          {err("needs") && <FieldError id="needs-error">{t.errors[err("needs")!]}</FieldError>}
        </fieldset>
        <fieldset>
          <legend className="mb-4 text-body-sm font-medium">{t.form.budget}</legend>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map((b) => (
              <label key={b} className={pill}>
                <input type="radio" name="budget" value={b} className="peer sr-only" defaultChecked={values.budget === b} />
                <Check size={16} strokeWidth={2} aria-hidden className="hidden peer-checked:block" />
                {t.form.budgetOptions[b]}
              </label>
            ))}
          </div>
        </fieldset>
      </Step>

      <Step index={2} name={t.steps[2]} shown={shown(2)}>
        <Field id="message" label={`${t.form.message} *`} error={err("message") && t.errors[err("message")!]}>
          <p id="message-hint" className="text-body-sm text-fg-subtle">{t.form.messageHint}</p>
          <textarea
            id="message" name="message" required minLength={20} maxLength={2000} rows={5}
            defaultValue={String(values.message ?? "")}
            onChange={(e) => setCount(e.target.value.length)}
            aria-invalid={!!err("message")} aria-describedby={describedBy("message", true)}
            className={`${input} h-auto min-h-36 resize-y py-3`}
          />
          <p className="text-right text-caption text-fg-subtle tabular-nums">{tf("form.counter", { count })}</p>
        </Field>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="startedAt" value={startedAt} />
        <input type="hidden" name="source" value="contact" />
        <input type="hidden" name="utm" value={utm} />
        {/* Honeypot: humans never see or reach it */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="sr-only" />
        <p className="text-caption text-fg-subtle">
          {tf.rich("form.lgpd", { link: (text) => <a href={getPathname({ href: "/privacidade", locale })} className="link">{text}</a> })}
        </p>
        {failed && (
          <p role="alert" className="flex gap-2 text-body-sm text-danger">
            <AlertCircle size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
            {/* The fallback address is only offered when it's configured */}
            {email
              ? tf(state.status === "send_error" ? "sendError" : "rateLimited", { email })
              : state.status === "send_error"
                ? t.sendErrorPlain
                : t.rateLimitedPlain}
          </p>
        )}
      </Step>

      <div className="mt-10 flex flex-wrap gap-3">
        {js && step > 0 && (
          <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => setStep(step - 1)}>
            <Roll>{t.back}</Roll>
          </button>
        )}
        {js && step < STEPS.length - 1 ? (
          <button type="button" className={buttonClass()} onClick={next}>
            <Roll>{t.continue}</Roll>
          </button>
        ) : (
          <button type="submit" disabled={pending} aria-busy={pending || undefined} className={`${buttonClass()} min-w-52`}>
            {pending && <Loader2 size={18} strokeWidth={1.5} aria-hidden className="animate-spin" />}
            <Roll>{pending ? t.form.sending : t.form.submit}</Roll>
          </button>
        )}
      </div>
    </form>
  );
}

const input =
  "h-14 w-full border-0 border-b border-line-input bg-transparent text-body-lg text-fg transition-colors focus:border-accent aria-invalid:border-danger";
const pill =
  "inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-5 text-body-sm transition-colors hover:border-fg/40 has-checked:border-emit has-checked:bg-emit has-checked:text-btn-fg has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus";

function Step({ index, name, shown, children }: { index: number; name: string; shown: boolean; children: React.ReactNode }) {
  return (
    <fieldset hidden={!shown} className="flex flex-col gap-8 [&+&]:mt-12">
      <legend id={`step-${index}-legend`} tabIndex={-1} className="mb-8 font-serif text-heading-md font-light">
        {name}
      </legend>
      {children}
    </fieldset>
  );
}

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
    <p id={id} className="mt-2 flex gap-1.5 text-body-sm text-danger">
      <AlertCircle size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}
