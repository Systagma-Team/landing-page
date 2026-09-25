"use client";
import { useEffect, useRef } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { CHAPTERS, PILLAR_AT, type ChapterId } from "@/content/chapters";
import { director, FORMATIONS, resolve } from "@/lib/director";
import { useCalm } from "@/lib/calm";
import type { FieldHandle } from "@/lib/field/renderer";

export type HudCopy = {
  chapters: Record<ChapterId, string>;
  meta: Partial<Record<(typeof FORMATIONS)[number], string>>; // e.g. "NÓS {nodes} · CONEXÕES {edges}"
  order: string; // "ORDEM"
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const pad = (n: number, d = 2) => String(Math.round(n)).padStart(d, "0");

/**
 * The scene engine: one rAF loop that owns scroll (Lenis), reads every chapter's progress, writes the
 * director (field), CSS variables (choreography), the HUD and the header state. Calm mode tears it down.
 * ponytail: plain rAF + CSS variables instead of Motion/Anime.js timelines; one scroll source, no library glue.
 */
export function SceneEngine({ hud }: { hud: HudCopy }) {
  const calm = useCalm();
  const canvas = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const $ = <T extends Element>(s: string) => document.querySelector<T>(s);
    const lenis = calm ? null : new Lenis({ lerp: 0.085, smoothWheel: true, syncTouch: false, autoRaf: false });
    let field: FieldHandle | null = null;
    let stopped = false;

    // L1: the field — not in calm mode, not without WebGL2, not on Save-Data
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    const scenic = !!document.querySelector("[data-chapter]"); // the privacy page has none: paper, no field
    if (hudRef.current) hudRef.current.hidden = !scenic;
    if (!calm && !saveData && scenic && canvas.current) {
      const w = innerWidth;
      const lowEnd = navigator.hardwareConcurrency <= 4 && ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
      const count = (w >= 1024 ? 6000 : w >= 768 ? 4000 : 2500) / (lowEnd ? 2 : 1);
      import("@/lib/field/renderer")
        .then(({ startField }) => startField(canvas.current!, count, () => html.removeAttribute("data-field")))
        .then((h) => {
          if (stopped) return h?.stop();
          field = h;
          if (h) html.setAttribute("data-field", "");
        })
        .catch(() => html.removeAttribute("data-field"));
    }

    // Pointer repulsion (fine pointers only)
    const fine = matchMedia("(pointer: fine)").matches && !calm;
    const onPointer = (e: PointerEvent) => {
      director.pointer = [(e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2];
      director.pointerStrength = 1;
    };
    if (fine) addEventListener("pointermove", onPointer);

    // In-page anchors: smooth scroll with header offset, then focus the target's heading (SPEC 5.3)
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>("a[href*='#']");
      if (!a || a.origin !== location.origin || a.pathname !== location.pathname || e.metaKey || e.ctrlKey) return;
      const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      history.pushState(null, "", a.hash);
      dispatchEvent(new HashChangeEvent("hashchange"));
      const focus = () => {
        const f = target.matches("h1,h2,h3,[tabindex]") ? target : target.querySelector<HTMLElement>("h1,h2,[data-focus]") ?? target;
        if (!f.hasAttribute("tabindex")) f.setAttribute("tabindex", "-1");
        (f as HTMLElement).focus({ preventScroll: true });
      };
      const offset = -parseFloat(getComputedStyle(html).getPropertyValue("--header-h"));
      if (lenis) lenis.scrollTo(target, { offset, onComplete: focus });
      else {
        target.scrollIntoView();
        focus();
      }
    };
    document.addEventListener("click", onClick);
    const onMenu = (e: Event) => ((e as CustomEvent<boolean>).detail ? lenis?.stop() : lenis?.start());
    addEventListener("sys:menu", onMenu);

    // Footer height for the reveal
    const footer = $<HTMLElement>(".site-footer");
    const ro = new ResizeObserver(() => footer && html.style.setProperty("--footer-h", `${footer.offsetHeight}px`));
    if (footer) ro.observe(footer);

    const chapters = CHAPTERS.map((c) => ({ ...c, el: document.querySelector<HTMLElement>(`[data-chapter="${c.id}"]`) })).filter(
      (c): c is typeof c & { el: HTMLElement } => !!c.el,
    );
    const pillars = $<HTMLElement>(".pillars-stage");
    const heroSection = $<HTMLElement>('[data-chapter="hero"]');
    const order = $<HTMLElement>("[data-order]");
    const navLinks = [...document.querySelectorAll<HTMLAnchorElement>("[data-nav]")];
    const stack = [...document.querySelectorAll<HTMLElement>(".stack-card")];
    const header = $<HTMLElement>(".site-header");
    const converge = $<HTMLElement>("[data-converge]");
    const hudEl = hudRef.current;
    const desktop = matchMedia("(min-width: 1024px)");
    const hudSet = (k: string, v: string) => {
      const el = hudEl?.querySelector<HTMLElement>(`[data-hud="${k}"]`);
      if (el && el.textContent !== v) el.textContent = v;
    };

    let active: ChapterId = "hero";
    let lastY = scrollY;
    let lastClock = 0;
    let raf = 0;

    const loop = (t: number) => {
      lenis?.raf(t);
      const vh = innerHeight;
      const y = scrollY;
      director.velocity = lenis ? clamp01(Math.abs(lenis.velocity) / 40) * Math.sign(lenis.velocity) : 0;

      // Chapter progress → CSS --p; the chapter holding the viewport centre drives the field
      let activeP = 0;
      // Short viewports (landscape phones) can't fit a pinned stage: chapters stack and progress is centre-based
      const unpinned = vh < 640;
      if (html.hasAttribute("data-static") !== unpinned) html.toggleAttribute("data-static", unpinned);
      for (const c of chapters) {
        const r = c.el.getBoundingClientRect();
        const p = clamp01(c.pinned && !unpinned ? -r.top / Math.max(1, r.height - vh) : (vh / 2 - r.top) / r.height);
        c.el.style.setProperty("--p", p.toFixed(4));
        if (r.top <= vh / 2 && r.bottom > vh / 2) {
          active = c.id;
          activeP = p;
        }
      }
      const chapter = chapters.find((c) => c.id === active);
      if (chapter) {
        Object.assign(director, resolve([...chapter.keys], activeP), { dim: chapter.dim });
        if (active === "contact" && director.settled) Object.assign(director, { from: 1, to: 1, mix: 0 }); // symbol
        if (active === "hero") {
          // ORDEM = rounded assembly progress (AC-HERO-03)
          if (order) order.textContent = `${hud.order} ${pad(activeP >= 0.6 ? 100 : director.mix * 100, 3)}%`;
          // Particles dim to 40% while the crisp symbol is over them (desktop, pinned only)
          const overlay = innerWidth >= 1024 && !unpinned ? clamp01((activeP - 0.6) / 0.1) * clamp01((1 - activeP) / 0.1) : 0;
          director.dim = 1 - 0.6 * overlay;
        }
      }
      html.dataset.chapter = active;
      navLinks.forEach((a) => (a.dataset.nav === active ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));

      // Pillars: active item, odometer, rail
      if (pillars) {
        const p = parseFloat(pillars.closest<HTMLElement>("[data-chapter]")!.style.getPropertyValue("--p") || "0");
        const k = PILLAR_AT.filter((at) => p >= at).length;
        if (pillars.dataset.pillar !== String(k)) pillars.dataset.pillar = String(k);
        pillars.style.setProperty("--d", String(Math.max(1, k)));
        PILLAR_AT.forEach((at, i) => {
          const end = PILLAR_AT[i + 1] ?? 1;
          pillars.style.setProperty(`--f${i}`, clamp01((p - at) / (end - at)).toFixed(3));
        });
      }

      // Stacked cards: how far the next card has covered this one
      stack.forEach((card, i) => {
        const next = stack[i + 1];
        if (!next) return;
        const a = card.getBoundingClientRect();
        const b = next.getBoundingClientRect();
        card.style.setProperty("--s", clamp01(1 - (b.top - a.top) / a.height).toFixed(3));
      });

      // Header: hide on the way down after half the hero, show on the way up; panel over paper
      const heroHalf = (heroSection?.offsetHeight ?? vh) * 0.5;
      if (y > lastY + 2 && y > heroHalf) html.setAttribute("data-header-hidden", "");
      else if (y < lastY - 2 || y <= heroHalf) html.removeAttribute("data-header-hidden");
      lastY = y;
      const hh = header?.offsetHeight ?? 72;
      const overPaper = [...document.querySelectorAll('[data-theme="paper"]')].some((p) => {
        const r = p.getBoundingClientRect();
        return r.top < hh && r.bottom > 0;
      });
      html.toggleAttribute("data-over-paper", overPaper);

      // Page progress, footer reveal
      const docH = document.documentElement.scrollHeight;
      html.style.setProperty("--page-p", clamp01(y / Math.max(1, docH - vh)).toFixed(4));
      if (footer) footer.style.setProperty("--reveal", `${Math.max(0, y + vh - (docH - footer.offsetHeight))}px`);

      // Safe rectangles: the four text blocks nearest the viewport centre (y flipped for gl_FragCoord)
      director.safe = [...document.querySelectorAll("[data-field-safe]")]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.bottom > 0 && r.top < vh && r.width > 0)
        .sort((a, b) => Math.abs(a.top + a.height / 2 - vh / 2) - Math.abs(b.top + b.height / 2 - vh / 2))
        .slice(0, 4)
        .map((r) => [r.left, vh - r.bottom, r.right, vh - r.top]);

      if (converge) {
        const r = converge.getBoundingClientRect();
        director.converge = [((r.left + r.width / 2) / innerWidth) * 2 - 1, 1 - ((r.top + r.height / 2) / vh) * 2];
      }

      // HUD (desktop only; live values)
      if (hudEl && desktop.matches) {
        const idx = chapters.findIndex((c) => c.id === active);
        hudSet("chapter", `SYSTAGMA ⟋ ${hud.chapters[active]}`);
        hudSet("scroll", `${pad(clamp01(y / Math.max(1, docH - vh)) * 100, 3)}%`);
        hudSet("index", `${pad(idx + 1)} / ${pad(chapters.length)}`);
        const f = FORMATIONS[director.mix > 0.5 ? director.to : director.from];
        const tpl = hud.meta[f];
        const values = field?.meta[f];
        // In the hero the readout is the live assembly counter; elsewhere, the formation's metadata
        const readout = active === "hero" ? (order?.textContent ?? "") : tpl && values ? tpl.replace(/\{(\w+)\}/g, (_, k) => pad(values[k] ?? 0)) : "";
        hudSet("readout", readout);
        if (t - lastClock > 1000) {
          lastClock = t;
          const time = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format();
          hudSet("clock", `BRASÍLIA ${time}`);
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
      field?.stop();
      html.removeAttribute("data-field");
      removeEventListener("pointermove", onPointer);
      document.removeEventListener("click", onClick);
      removeEventListener("sys:menu", onMenu);
      ro.disconnect();
    };
  }, [calm, hud]);

  return (
    <>
      {!calm && <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-0 transition-opacity duration-700 [html[data-field]_&]:opacity-100" />}
      <div aria-hidden className="grain" />
      <div aria-hidden className="vignette" />
      <div ref={hudRef} aria-hidden className="hud pointer-events-none fixed z-40 max-lg:hidden" style={{ inset: "var(--hud-inset)" }}>
        {(["top-0 left-0 border-t border-l", "top-0 right-0 border-t border-r", "bottom-0 left-0 border-b border-l", "bottom-0 right-0 border-b border-r"] as const).map((c) => (
          <span key={c} className={`absolute size-4 border-line-strong ${c}`} />
        ))}
        <span data-hud="chapter" className="absolute top-1/2 left-0 -translate-y-1/2 rotate-180 whitespace-nowrap [writing-mode:vertical-rl]" />
        <span className="absolute top-1/2 right-0 flex -translate-y-1/2 flex-col items-end gap-2 text-right">
          <span data-hud="scroll" className="text-accent" />
          <span data-hud="index" />
        </span>
        <span data-hud="clock" className="absolute bottom-6 left-6" />
        <span data-hud="readout" className="absolute right-6 bottom-6 text-accent" />
      </div>
    </>
  );
}
