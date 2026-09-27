export type Role = "ADMIN" | "ANALYST" | "VIEWER";

const RANK: Record<Role, number> = { VIEWER: 1, ANALYST: 2, ADMIN: 3 };

export function hasRole(actual: Role, required: Role): boolean {
  return RANK[actual] >= RANK[required];
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  ANALYST: "Analista",
  VIEWER: "Leitor",
};
