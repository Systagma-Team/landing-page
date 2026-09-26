// Zod-free, so the form can render without shipping the validator (it loads on the first "Continuar").
// Needs follow the commercial architecture; "unsure" means nobody has to know the technical name of the solution.
export const NEEDS = ["system", "website", "data", "automation", "integration", "ai", "consulting", "support", "unsure"] as const;
export type Need = (typeof NEEDS)[number];
export const BUDGETS = ["b1", "b2", "b3", "b4", "unknown"] as const;

/** The three form steps (SPEC C8): each "Continuar" validates only its own fields. */
export const STEPS = [
  ["name", "email", "company"],
  ["needs", "budget"],
  ["message"],
] as const;
