import { parseArgs } from "node:util";
import { eq, sql } from "drizzle-orm";
import { closeDb, getDb, schema } from "@/db";
import { audit } from "@/server/audit";
import { hashPassword, passwordProblems } from "@/server/auth/password";

/**
 * Usage: npm run user:create -- --email a@b.com --name "Nome" --role ADMIN [--password ...] [--org systagma]
 * Without --password, ADMIN_PASSWORD is used. There is no public sign-up.
 */
async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string", default: process.env.ADMIN_EMAIL },
      name: { type: "string", default: process.env.ADMIN_NAME ?? "Administrador" },
      role: { type: "string", default: "ADMIN" },
      password: { type: "string", default: process.env.ADMIN_PASSWORD },
      org: { type: "string", default: process.env.ORG_SLUG ?? "systagma" },
    },
  });
  const email = values.email?.trim().toLowerCase();
  const role = values.role?.toUpperCase() as "ADMIN" | "ANALYST" | "VIEWER";
  if (!email || !values.password) throw new Error("Informe --email e --password (ou ADMIN_EMAIL/ADMIN_PASSWORD)");
  if (!["ADMIN", "ANALYST", "VIEWER"].includes(role)) throw new Error("Papel inválido: use ADMIN, ANALYST ou VIEWER");
  const problems = passwordProblems(values.password);
  if (problems.length > 0) throw new Error(`Senha fraca: ${problems.join(", ")}`);

  const db = getDb();
  const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.slug, values.org!));
  if (!org) throw new Error(`Organização "${values.org}" não encontrada — rode npm run db:seed antes`);
  const [existing] = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = ${email}`);
  const passwordHash = await hashPassword(values.password);
  if (existing) {
    await db.update(schema.users).set({ passwordHash, role, name: values.name!, active: true, updatedAt: new Date() }).where(eq(schema.users.id, existing.id));
    await audit({ organizationId: org.id, userId: null, action: "user.updated_cli", entityType: "user", entityId: existing.id, after: { email, role } });
    console.log(`Usuário ${email} atualizado (${role}).`);
  } else {
    const [user] = await db.insert(schema.users).values({ organizationId: org.id, email, name: values.name!, role, passwordHash }).returning({ id: schema.users.id });
    await audit({ organizationId: org.id, userId: null, action: "user.created_cli", entityType: "user", entityId: user.id, after: { email, role } });
    console.log(`Usuário ${email} criado (${role}).`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
