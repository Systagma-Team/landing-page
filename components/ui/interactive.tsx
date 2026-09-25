"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Check, Copy, Menu, Plus, X } from "lucide-react";
import { setCalm, useCalm } from "@/lib/calm";
import { buttonClass, Roll } from "@/components/ui/button";

type NavLink = { href: string; label: string };

/** Reduce-motion switch (Design System 11.14): overrides the OS setting in either direction, live. */
export function CalmToggle({ label }: { label: string }) {
  const calm = useCalm();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={calm}
      onClick={() => setCalm(!calm)}
      className="inline-flex min-h-11 items-center gap-3 text-body-sm whitespace-nowrap text-fg-muted hover:text-fg"
    >
      <span className={`relative h-5 w-9 rounded-full border border-line-strong transition-colors ${calm ? "bg-emit" : ""}`}>
        <span className={`absolute top-0.5 left-0.5 size-3.5 rounded-full bg-fg transition-transform ${calm ? "translate-x-4" : ""}`} />
      </span>
      {label}
    </button>
  );
}

const tick = (cb: () => void) => {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
};
const brasilia = () =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format();

/** Live Brasília clock (true data, console voice). */
export function Clock() {
  const time = useSyncExternalStore(tick, brasilia, () => "--:--:--");
  return <span className="hud whitespace-nowrap">Brasília {time}</span>;
}

/** Full-screen menu overlay (< 1024 px) on a native modal <dialog>: focus trap, Esc and focus return built in. */
export function MobileMenu({ links, cta, labels }: { links: NavLink[]; cta: NavLink; labels: { open: string; close: string; nav: string; calm: string } }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => dialog.current?.close();
  const menu = (on: boolean) => dispatchEvent(new CustomEvent("sys:menu", { detail: on })); // pauses smooth scroll

  return (
    <>
      <button
        type="button"
        className="grid size-11 place-items-center lg:hidden"
        aria-label={labels.open}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
          menu(true);
        }}
      >
        <Menu size={24} strokeWidth={1.5} aria-hidden />
      </button>
      <dialog
        ref={dialog}
        id="mobile-menu"
        onClose={() => {
          setOpen(false);
          menu(false);
        }}
        className="m-0 h-dvh max-h-none w-full max-w-none border-0 bg-panel p-0 text-fg backdrop:bg-panel"
      >
        <div className="container-page flex h-full flex-col pb-8">
          <div className="flex h-(--header-h) items-center justify-end">
            <button type="button" className="grid size-11 place-items-center" aria-label={labels.close} onClick={close}>
              <X size={24} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          <nav aria-label={labels.nav} className="mt-8">
            <ul>
              {links.map((l) => (
                <li key={l.href} className="border-b border-line">
                  <a href={l.href} onClick={close} className="flex min-h-18 items-center font-serif text-display-md font-light">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto flex flex-col gap-6">
            <a href={cta.href} onClick={close} className={`${buttonClass()} w-full`}>
              <Roll>{cta.label}</Roll>
            </a>
            <div className="flex items-center justify-between">
              <Clock />
              <CalmToggle label={labels.calm} />
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** FAQ item (Design System 11.11). Opens itself when the URL hash matches its id. */
export function AccordionItem({ id, question, children }: { id: string; question: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigger = useId();

  useEffect(() => {
    const sync = () => location.hash === `#${id}` && setOpen(true);
    sync();
    addEventListener("hashchange", sync);
    return () => removeEventListener("hashchange", sync);
  }, [id]);

  return (
    <div id={id} className="border-b border-line">
      <h3>
        <button
          id={trigger}
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between gap-6 py-7 text-left font-serif text-heading-md font-light"
        >
          {question}
          <Plus size={24} strokeWidth={1.5} aria-hidden className={`shrink-0 transition-transform duration-400 ${open ? "rotate-45" : ""}`} />
        </button>
      </h3>
      {/* grid-rows animates height without measuring; `hidden` keeps closed panels out of the a11y tree and tab order */}
      <div className={`grid transition-[grid-template-rows] duration-400 ease-out-expo ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div id={`${id}-panel`} role="region" aria-labelledby={trigger} hidden={!open} className="max-w-[68ch] overflow-hidden pb-8 text-body-lg text-fg-muted">
          {children}
        </div>
      </div>
    </div>
  );
}

export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-2 text-body-sm text-fg-muted hover:text-fg"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            const node = document.querySelector("[data-copy-source]");
            if (node) getSelection()?.selectAllChildren(node);
          }
        }}
      >
        {copied ? <Check size={16} strokeWidth={1.5} aria-hidden /> : <Copy size={16} strokeWidth={1.5} aria-hidden />}
        {label}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? done : ""}
      </span>
    </>
  );
}
