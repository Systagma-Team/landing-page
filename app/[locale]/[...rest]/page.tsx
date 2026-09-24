import { notFound } from "next/navigation";

// Unknown paths under a locale render app/[lang]/not-found.tsx inside the site layout.
// ponytail: with the root layout under [lang], Next sends this 404 as a client-rendered shell (status 404, needs JS);
// experimental global-not-found would fix no-JS but loses the locale.
export default function CatchAll() {
  notFound();
}
