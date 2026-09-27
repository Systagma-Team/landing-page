import { closeDb, getDb } from "@/db";
import { seedOrganization } from "@/server/profiles/seed";

async function main() {
  const name = process.env.ORG_NAME ?? "Systagma";
  const slug = process.env.ORG_SLUG ?? "systagma";
  const id = await seedOrganization(getDb(), { name, slug });
  console.log(`Organização "${name}" pronta (${id}). Perfis MEI (vazio) e Systagma (taxonomia inicial) criados; fontes registradas.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
