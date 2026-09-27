import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { audit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth/dal";
import { readStored } from "@/server/storage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Authenticated, organisation-scoped download of a private vault file (always as attachment). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autenticado", { status: 401 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("Não encontrado", { status: 404 });
  const [doc] = await getDb()
    .select()
    .from(schema.profileDocuments)
    .where(and(eq(schema.profileDocuments.id, id), eq(schema.profileDocuments.organizationId, user.organizationId)));
  if (!doc || !doc.storageKey) return new Response("Não encontrado", { status: 404 });
  const data = await readStored(doc.storageKey);
  await audit({ organizationId: user.organizationId, userId: user.id, action: "vault.document_downloaded", entityType: "profile_document", entityId: doc.id });
  const filename = (doc.originalName ?? "documento").replace(/["\r\n]/g, "_");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
