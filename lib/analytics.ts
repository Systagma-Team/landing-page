// Analytics (SPEC 12): cookieless, no personal data. The provider is still an open question (SPEC 17), so every event
// is dispatched on window as `sys:track`; connecting a provider means forwarding those events from one listener.
export type TrackProps = Record<string, string | number | boolean>;

export function track(event: string, props: TrackProps = {}) {
  window.dispatchEvent(new CustomEvent("sys:track", { detail: { event, ...props } }));
}

/**
 * Where the session started: the referring site and the first page, e.g. "google.com /solucoes/dados". Kept in
 * sessionStorage (no cookies, no personal data) and submitted with the form, so each lead says which landing page and
 * which search engine or site brought it, even before an analytics provider exists.
 */
const LANDING = "sys:landing";
export function rememberLanding() {
  try {
    if (sessionStorage.getItem(LANDING)) return;
    const ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
    const external = ref && ref !== location.hostname.replace(/^www\./, "");
    sessionStorage.setItem(LANDING, `${external ? ref : "direct"} ${location.pathname}`);
  } catch {}
}
export const readLanding = () => {
  try {
    return sessionStorage.getItem(LANDING) ?? "";
  } catch {
    return "";
  }
};

/** The CTA location that last sent the visitor to the contact form; the form submits it as `source` (SPEC 8.2). */
const SOURCE = "sys:source";
export const readSource = () => {
  try {
    return sessionStorage.getItem(SOURCE) ?? "";
  } catch {
    return "";
  }
};
export const rememberSource = (location: string) => {
  try {
    sessionStorage.setItem(SOURCE, location);
  } catch {}
};
