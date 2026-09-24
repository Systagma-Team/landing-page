import { z } from "zod";

export const NEEDS = ["new-product", "integration", "data", "ai", "modernization", "other"] as const;
export const BUDGETS = ["b1", "b2", "b3", "b4", "unknown"] as const;

// Error messages are keys into messages.contact.errors, resolved per locale in the form
export const contactSchema = z.object({
  name: z.string().trim().min(2, "nameShort").max(120, "nameShort"),
  email: z.email("emailInvalid").max(254, "emailInvalid"),
  company: z.string().trim().max(120).optional().default(""),
  needs: z.array(z.enum(NEEDS)).min(1, "needsEmpty"),
  budget: z.enum(BUDGETS).optional(),
  message: z.string().trim().min(20, "messageShort").max(2000, "messageLong"),
  locale: z.enum(["pt-BR", "en"]),
  source: z.string().max(40).optional(),
  utm: z.string().max(300).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ErrorKey = "nameShort" | "emailInvalid" | "needsEmpty" | "messageShort" | "messageLong";

export type ContactState =
  | { status: "idle" }
  | { status: "success"; email?: string }
  | { status: "invalid"; fieldErrors: Partial<Record<keyof ContactInput, string[]>>; values: Record<string, unknown> }
  | { status: "rate_limited" }
  | { status: "send_error" };
