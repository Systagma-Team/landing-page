// zod/mini: one schema for the server action and the client's per-step checks (loaded on demand in the browser).
import { z } from "zod/mini";
import { BUDGETS, NEEDS } from "../contact-options.ts";

// Error messages are keys into messages.contact.errors, resolved per locale in the form
export const contactSchema = z.object({
  name: z.string().check(z.trim(), z.minLength(2, "nameShort"), z.maxLength(120, "nameShort")),
  email: z.email("emailInvalid").check(z.maxLength(254, "emailInvalid")),
  company: z.optional(z.string().check(z.trim(), z.maxLength(120))),
  needs: z.array(z.enum(NEEDS)).check(z.minLength(1, "needsEmpty")),
  budget: z.optional(z.enum(BUDGETS)),
  message: z.string().check(z.trim(), z.minLength(20, "messageShort"), z.maxLength(2000, "messageLong")),
  locale: z.enum(["pt-BR", "en"]),
  source: z.optional(z.string().check(z.maxLength(40))),
  utm: z.optional(z.string().check(z.maxLength(300))),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactField = keyof ContactInput;
export type ErrorKey = "nameShort" | "emailInvalid" | "needsEmpty" | "messageShort" | "messageLong";

// Every non-success answer returns the submitted values: React resets the form after an action, and they refill it
type Values = Record<string, unknown>;
export type ContactState =
  | { status: "idle" }
  | { status: "success"; email?: string }
  | { status: "invalid"; fieldErrors: Partial<Record<ContactField, string[]>>; values: Values }
  | { status: "rate_limited"; values: Values }
  | { status: "send_error"; values: Values };

/** Reads the form's values the same way on client and server. */
export function readContact(form: FormData) {
  return {
    name: form.get("name"),
    email: form.get("email"),
    company: form.get("company") || undefined,
    needs: form.getAll("needs"),
    budget: form.get("budget") || undefined,
    message: form.get("message"),
    locale: form.get("locale"),
    source: form.get("source") || undefined,
    utm: form.get("utm") || undefined,
  };
}
