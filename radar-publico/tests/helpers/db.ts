import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, type Database } from "@/db";
import { seedOrganization } from "@/server/profiles/seed";

let migrated = false;

/** Fresh schema state for each suite: migrate once, truncate every table, seed the organisation. */
export async function resetDatabase(): Promise<{ db: Database; organizationId: string }> {
  if (!process.env.DATABASE_URL?.includes("test")) throw new Error("Refusing to reset a non-test database");
  const db = getDb();
  if (!migrated) {
    await migrate(db, { migrationsFolder: "./drizzle" });
    migrated = true;
  }
  const tables = await db.execute<{ tablename: string }>(sql`select tablename from pg_tables where schemaname = 'public' and tablename <> '__drizzle_migrations'`);
  const names = tables.rows.map((r) => `"${r.tablename}"`).join(", ");
  if (names) await db.execute(sql.raw(`truncate ${names} restart identity cascade`));
  const organizationId = await seedOrganization(db, { name: "Systagma", slug: "systagma" });
  return { db, organizationId };
}
