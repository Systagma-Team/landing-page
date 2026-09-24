// Run: npm run check — asserts the pieces of logic that can silently break.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { contactSchema } from "../lib/schema/contact.ts";

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

console.log("ok");
