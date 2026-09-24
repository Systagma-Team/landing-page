"use server";
import { z } from "zod";
import { contactSchema, type ContactState } from "@/lib/schema/contact";
import { sendContactEmails } from "@/lib/mailer";

// ponytail: rate limiting (Upstash) and Turnstile arrive with the real mailer in M3; nothing is sent until then.
export async function submitContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  // Silent bot traps: pretend success, send nothing
  if (form.get("website")) return { status: "success" };
  const startedAt = Number(form.get("startedAt") || 0);
  if (startedAt && Date.now() - startedAt < 3000) return { status: "success" };

  const values = {
    name: form.get("name"),
    email: form.get("email"),
    company: form.get("company") ?? "",
    needs: form.getAll("needs"),
    budget: form.get("budget") || undefined,
    message: form.get("message"),
    locale: form.get("locale"),
    source: form.get("source") || undefined,
    utm: form.get("utm") || undefined,
  };
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "invalid", fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await sendContactEmails(parsed.data);
  } catch (err) {
    console.error("contact_send_failed", { reason: (err as Error).message }); // no personal data in logs
    return { status: "send_error" };
  }
  return { status: "success", email: parsed.data.email };
}
