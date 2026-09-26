"use client";
import { useEffect } from "react";
import { rememberSource, track } from "@/lib/analytics";

/** Where a click happened: the CTA's own label (data-cta), else its chapter, the header or the footer. */
const locationOf = (el: HTMLElement) =>
  el.dataset.cta ?? el.closest<HTMLElement>("[data-chapter]")?.dataset.chapter ?? (el.closest("footer") ? "footer" : el.closest("header") ? "header" : "page");

/** One delegated listener for the click events of SPEC 12: CTAs, email, WhatsApp and the language switcher. */
export function Analytics() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!a) return;
      const href = a.getAttribute("href")!;
      const location = locationOf(a);
      if (a.dataset.cta) {
        // contact, whatsapp, an in-page anchor, or the page it opens (catalog and consulting links)
        const target = href.endsWith("#contact") ? "contact" : href.includes("wa.me") ? "whatsapp" : href.includes("#") ? href.split("#")[1] : href;
        track("cta_click", { location, target });
        if (target === "contact") rememberSource(location);
      }
      if (href.startsWith("mailto:")) track("email_click", { location });
      else if (href.includes("wa.me")) track("whatsapp_click", { location });
      else if (a.hreflang && a.closest("header")) track("locale_switch", { to: a.hreflang });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
