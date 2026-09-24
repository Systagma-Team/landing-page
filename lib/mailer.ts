import type { ContactInput } from "@/lib/schema/contact";

// ponytail: no provider yet (SPEC M3: Resend + React Email). Dry-run logs; otherwise the form reports send_error.
export async function sendContactEmails(input: ContactInput) {
  if (process.env.CONTACT_DRY_RUN === "1") {
    console.info("contact_dry_run", { locale: input.locale, needs: input.needs, source: input.source }); // no personal data
    return;
  }
  throw new Error("mailer_not_configured");
}
