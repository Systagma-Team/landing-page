"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, Copy, Menu, Plus, X } from "lucide-react";
import { button } from "@/lib/ui";

type Link = { href: string; label: string };

/** Native modal <dialog>: focus trap, Esc, inert page and focus return come from the platform. */
export function MobileMenu({ links, cta, labels }: { links: Link[]; cta: Link; labels: { open: string; close: string; nav: string } }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        className="grid size-11 place-items-center rounded-sm lg:hidden"
        aria-label={labels.open}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
      >
        <Menu size={24} strokeWidth={1.5} aria-hidden />
      </button>
      <dialog
        ref={dialog}
        id="mobile-menu"
        data-theme="dark"
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && close()} // backdrop tap
        className="m-0 mt-16 w-full max-w-none border-0 p-0 bg-surface-raised text-fg shadow-overlay backdrop:bg-slate-950/60"
      >
        <div className="container-page pb-6">
          <button type="button" className="ml-auto grid size-11 place-items-center rounded-sm" aria-label={labels.close} onClick={close}>
            <X size={24} strokeWidth={1.5} aria-hidden />
          </button>
          <nav aria-label={labels.nav}>
            <ul>
              {links.map((l) => (
                <li key={l.href} className="border-b border-line">
                  <a href={l.href} onClick={close} className="flex h-14 items-center font-display text-heading-sm font-semibold">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <a href={cta.href} onClick={close} className={`${button("primary", "lg")} mt-6 w-full`}>
            {cta.label}
          </a>
        </div>
      </dialog>
    </>
  );
}

/** FAQ item (Design System 10.10). Opens itself when the URL hash matches its id. */
export function AccordionItem({ id, question, children }: { id: string; question: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigger = useId();

  useEffect(() => {
    const sync = () => {
      if (location.hash !== `#${id}`) return;
      setOpen(true);
      document.getElementById(id)?.scrollIntoView();
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [id]);

  return (
    <div id={id} className="border-b border-line">
      <h3 className="font-sans">
        <button
          id={trigger}
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between gap-6 py-5 text-left text-body-lg font-medium"
        >
          {question}
          <Plus size={20} strokeWidth={1.5} aria-hidden className={`shrink-0 transition-transform duration-[280ms] ${open ? "rotate-45" : ""}`} />
        </button>
      </h3>
      {/* hidden removes the closed panel from the a11y tree and tab order */}
      <div id={`${id}-panel`} role="region" aria-labelledby={trigger} hidden={!open} className="max-w-[68ch] pt-2 pb-6 text-fg-muted">
        {children}
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
        className={button("ghost", "sm")}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // No Clipboard API: select the address so the visitor can copy it
            const node = document.querySelector(`[data-copy-source]`);
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
