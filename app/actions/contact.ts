"use server";
import { z } from "zod/mini";
import { contactSchema, readContact, type ContactState } from "@/lib/schema/contact";
import { sendContactEmails } from "@/lib/mailer";

// ponytail: rate limiting (Upstash) and Turnstile arrive with the real mailer (SPEC M5); nothing is sent until then.
export async function submitContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  // Silent bot traps: pretend success, send nothing
  if (form.get("website")) return { status: "success" };
  const startedAt = Number(form.get("startedAt") || 0);
  if (startedAt && Date.now() - startedAt < 3000) return { status: "success" };

  const values = readContact(form);
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "invalid", fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await sendContactEmails(parsed.data);
  } catch (err) {
    console.error("contact_send_failed", { reason: (err as Error).message }); // no personal data in logs
    return { status: "send_error", values };
  }
  return { status: "success", email: parsed.data.email };
}
