// Analytics (SPEC 12): cookieless, no personal data. The provider is still an open question (SPEC 17), so every event
// is dispatched on window as `sys:track`; connecting a provider means forwarding those events from one listener.
export type TrackProps = Record<string, string | number | boolean>;

export function track(event: string, props: TrackProps = {}) {
  window.dispatchEvent(new CustomEvent("sys:track", { detail: { event, ...props } }));
}

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
