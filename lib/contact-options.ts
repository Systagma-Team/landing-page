// Zod-free, so the form can render without shipping the validator (it loads on the first "Continuar").
export const NEEDS = ["new-product", "integration", "data", "ai", "modernization", "other"] as const;
export const BUDGETS = ["b1", "b2", "b3", "b4", "unknown"] as const;

/** The three form steps (SPEC C8): each "Continuar" validates only its own fields. */
export const STEPS = [
  ["name", "email", "company"],
  ["needs", "budget"],
  ["message"],
] as const;
