import { eq } from "drizzle-orm";
import { schema, type Database } from "@/db";
import { commitProfileVersion } from "./service";
import { defaultScoring, SYSTAGMA_CAPABILITIES, SYSTAGMA_NEGATIVE_TERMS } from "./defaults";
import { SOURCE_DEFINITIONS } from "@/server/sources/definitions";

/** Idempotent seed: organisation, both profiles (MEI deliberately empty), Systagma taxonomy, sources. */
export async function seedOrganization(db: Database, opts: { name: string; slug: string }): Promise<string> {
  return db.transaction(async (tx) => {
    let [org] = await tx.select().from(schema.organizations).where(eq(schema.organizations.slug, opts.slug));
    if (!org) {
      [org] = await tx.insert(schema.organizations).values({ name: opts.name, slug: opts.slug }).returning();
    }

    const existing = await tx.select().from(schema.procurementProfiles).where(eq(schema.procurementProfiles.organizationId, org.id));

    if (!existing.some((p) => p.slug === "mei")) {
      // MEI: no activities, capabilities or terms until the real MEI data is entered.
      const [mei] = await tx
        .insert(schema.procurementProfiles)
        .values({
          organizationId: org.id,
          kind: "MEI",
          slug: "mei",
          displayName: "MEI",
          nationwide: false,
          scoring: defaultScoring("MEI"),
          notes: "Preencha com os dados reais do CCMEI (CNAEs, ocupações, serviços). Nada é pré-configurado.",
        })
        .returning();
      await commitProfileVersion(tx, mei.id, null, "Perfil MEI criado (vazio)");
    }

    if (!existing.some((p) => p.slug === "systagma")) {
      const [sys] = await tx
        .insert(schema.procurementProfiles)
        .values({
          organizationId: org.id,
          kind: "COMPANY",
          slug: "systagma",
          displayName: "Systagma",
          nationwide: true,
          scoring: defaultScoring("COMPANY"),
          notes: "Capacidades iniciais do briefing — revisar e confirmar. CNPJ, CNAEs e evidências pendentes.",
        })
        .returning();
      for (const cap of SYSTAGMA_CAPABILITIES) {
        const [c] = await tx
          .insert(schema.serviceCapabilities)
          .values({
            organizationId: org.id,
            profileId: sys.id,
            category: cap.category,
            name: cap.name,
            description: cap.description,
            level: cap.level,
            strategic: cap.strategic,
          })
          .returning();
        await tx.insert(schema.taxonomyTerms).values(
          cap.terms.map(([term, weight, caseSensitive]) => ({
            organizationId: org.id,
            profileId: sys.id,
            capabilityId: c.id,
            polarity: "POSITIVE" as const,
            term,
            weight,
            caseSensitive: !!caseSensitive,
          })),
        );
      }
      await tx.insert(schema.taxonomyTerms).values(
        SYSTAGMA_NEGATIVE_TERMS.map((n) => ({
          organizationId: org.id,
          profileId: sys.id,
          polarity: "NEGATIVE" as const,
          term: n.term,
          weight: n.weight,
          effect: n.effect,
          note: n.note,
        })),
      );
      await commitProfileVersion(tx, sys.id, null, "Perfil Systagma criado com taxonomia inicial");
    }

    for (const def of SOURCE_DEFINITIONS) {
      await tx
        .insert(schema.sources)
        .values({ key: def.key, name: def.name, enabled: def.enabledByDefault, config: def.defaultConfig })
        .onConflictDoNothing();
    }
    return org.id;
  });
}
