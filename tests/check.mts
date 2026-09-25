// Run: npm run check — asserts the pieces of logic that can silently break.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { contactSchema } from "../lib/schema/contact.ts";
import { FORMATIONS, resolve } from "../lib/director.ts";
import { CHAPTERS } from "../content/chapters.ts";

// Message parity: en.json must have exactly the keys of pt-BR.json (SPEC 4.4)
const json = (f: string) => JSON.parse(readFileSync(new URL(`../messages/${f}.json`, import.meta.url), "utf8"));
const keys = (o: unknown, p = ""): string[] =>
  o && typeof o === "object" && !Array.isArray(o)
    ? Object.entries(o).flatMap(([k, v]) => keys(v, p ? `${p}.${k}` : k))
    : [p];
assert.deepEqual(keys(json("en")).sort(), keys(json("pt-BR")).sort());

// Contact schema: error messages are keys into messages.contact.errors
const ok = { name: "Ana", email: "ana@empresa.com", needs: ["data"], message: "Precisamos de um painel de vendas.", locale: "pt-BR" };
assert.ok(contactSchema.safeParse(ok).success);
const bad = contactSchema.safeParse({ ...ok, name: "A", email: "x", needs: [], message: "curta" });
assert.ok(!bad.success);
assert.deepEqual(bad.error.issues.map((i) => i.message).sort(), ["emailInvalid", "messageShort", "nameShort", "needsEmpty"]);
for (const k of ["emailInvalid", "messageShort", "nameShort", "needsEmpty", "messageLong"]) assert.ok(json("pt-BR").contact.errors[k]);
assert.ok(!contactSchema.safeParse({ ...ok, needs: ["hack"] }).success);

// Field choreography: resolve() interpolates between keys and the chapter map keeps continuity
const heroKeys = [{ at: 0, formation: "noise" }, { at: 0.6, formation: "symbol", span: 0.6 }] as const;
const i = (f: string) => FORMATIONS.indexOf(f as never);
assert.deepEqual(resolve([...heroKeys], 0), { from: i("noise"), to: i("noise"), mix: 0 });
assert.equal(resolve([...heroKeys], 0.3).mix, 0.5); // smoothstep midpoint
assert.deepEqual(resolve([...heroKeys], 0.9), { from: i("symbol"), to: i("symbol"), mix: 0 });
const pillars = [0, 0.14, 0.38, 0.62, 0.86].map((at, k) => ({ at, formation: ["lattice", "build", "connect", "analyze", "transform"][k] })) as never;
assert.equal(resolve(pillars, 0.2).to, i("connect"));
assert.equal(resolve(pillars, 0.2).mix, 0); // morph window is the last 30% before 0.38

// Continuity rule (SPEC 5.1): each chapter starts on the formation the previous one ends on
const page = CHAPTERS.filter((c) => c.id !== "lost");
page.slice(1).forEach((c, k) => assert.equal(c.keys[0].formation, page[k].keys.at(-1)!.formation, `${page[k].id} → ${c.id}`));

console.log("ok");
