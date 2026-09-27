import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __radarPool?: Pool; __radarDb?: Database };

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não configurada");
  return new Pool({ connectionString, max: Number(process.env.DATABASE_POOL_MAX ?? 10) });
}

/** Lazily created so importing modules (e.g. during `next build`) never opens a connection. */
export function getDb(): Database {
  if (!globalForDb.__radarDb) {
    globalForDb.__radarPool = createPool();
    globalForDb.__radarDb = drizzle({ client: globalForDb.__radarPool, schema });
  }
  return globalForDb.__radarDb;
}

export function getPool(): Pool {
  getDb();
  return globalForDb.__radarPool!;
}

export async function closeDb(): Promise<void> {
  await globalForDb.__radarPool?.end();
  globalForDb.__radarPool = undefined;
  globalForDb.__radarDb = undefined;
}

export { schema };
