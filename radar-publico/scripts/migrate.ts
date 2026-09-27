import { migrate } from "drizzle-orm/node-postgres/migrator";
import { closeDb, getDb } from "@/db";

async function main() {
  await migrate(getDb(), { migrationsFolder: "./drizzle" });
  console.log("Migrações aplicadas.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
