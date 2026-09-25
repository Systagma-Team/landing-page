import { useSyncExternalStore } from "react";

// Calm mode (Design System 7.4): OS reduced-motion or the site toggle. The <head> script applies it before paint.
const subscribe = (cb: () => void) => {
  window.addEventListener("sys:calm", cb);
  return () => window.removeEventListener("sys:calm", cb);
};
export const isCalm = () => document.documentElement.hasAttribute("data-calm");
export const useCalm = () => useSyncExternalStore(subscribe, isCalm, () => false);

export function setCalm(on: boolean) {
  document.documentElement.toggleAttribute("data-calm", on);
  try {
    localStorage.setItem("sys:calm", on ? "1" : "0");
  } catch {}
  window.dispatchEvent(new Event("sys:calm"));
}
