"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { getDb, schema } from "@/db";
import { requireUser } from "@/server/auth/dal";

export async function markAlertRead(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("deliveryId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await getDb()
    .update(schema.alertDeliveries)
    .set({ readAt: new Date() })
    .where(and(eq(schema.alertDeliveries.id, id), eq(schema.alertDeliveries.userId, user.id)));
  refresh();
}

export async function markAllRead(): Promise<void> {
  const user = await requireUser();
  const db = getDb();
  const unread = await db
    .select({ id: schema.alertDeliveries.id })
    .from(schema.alertDeliveries)
    .where(and(eq(schema.alertDeliveries.userId, user.id), eq(schema.alertDeliveries.channel, "IN_APP"), isNull(schema.alertDeliveries.readAt)));
  if (unread.length > 0) {
    await db.update(schema.alertDeliveries).set({ readAt: new Date() }).where(inArray(schema.alertDeliveries.id, unread.map((u) => u.id)));
  }
  refresh();
}
