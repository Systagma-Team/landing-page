// {{PLACEHOLDERS}} must be supplied before launch (SPEC "Placeholders"); do not invent them.
export const site = {
  name: "Systagma",
  legalName: "{{LEGAL_NAME}}",
  cnpj: "{{CNPJ}}",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  email: "{{CONTACT_EMAIL}}",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || null, // null hides every WhatsApp CTA
  city: "{{CITY}}",
  uf: "{{UF}}",
  hours: "{{HOURS}}",
  privacy: { updated: "{{PRIVACY_UPDATED}}", retention: "{{RETENTION}}", dpo: "{{DPO}}" },
  // Empty strings are skipped in the footer
  socials: { LinkedIn: "", GitHub: "", Instagram: "" },
} as const;

/** False while a value is still a {{PLACEHOLDER}}: keeps placeholders out of structured data. */
export const isSet = (v: string | null | undefined): v is string => !!v && !v.startsWith("{{");
