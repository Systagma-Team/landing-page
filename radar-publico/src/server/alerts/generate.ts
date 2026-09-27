import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { schema, type Database } from "@/db";

export type AlertType = (typeof schema.alertType.enumValues)[number];

export interface NewAlert {
  organizationId: string;
  profileId?: string | null;
  type: AlertType;
  severity: "INFO" | "ATTENTION" | "CRITICAL";
  title: string;
  body: string;
  opportunityId?: string | null;
  profileDocumentId?: string | null;
  dedupKey: string;
  /** Used by per-user minimum score filters on NEW_HIGH_MATCH. */
  score?: number | null;
  /** Restrict fan-out to these roles (e.g. source failures go to admins). */
  roles?: ("ADMIN" | "ANALYST" | "VIEWER")[];
}

/**
 * Creates an alert once (dedup key per organisation) and schedules deliveries:
 * in-app for every active user, plus e-mail/webhook/Slack according to each user's preferences
 * (immediate, daily or weekly digest).
 */
export async function createAlert(db: Database, alert: NewAlert): Promise<string | null> {
  const [row] = await db
    .insert(schema.alerts)
    .values({
      organizationId: alert.organizationId,
      profileId: alert.profileId ?? null,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      body: alert.body,
      opportunityId: alert.opportunityId ?? null,
      profileDocumentId: alert.profileDocumentId ?? null,
      dedupKey: alert.dedupKey,
    })
    .onConflictDoNothing()
    .returning({ id: schema.alerts.id });
  if (!row) return null;

  const users = await db
    .select({ id: schema.users.id, email: schema.users.email, role: schema.users.role })
    .from(schema.users)
    .where(and(eq(schema.users.organizationId, alert.organizationId), eq(schema.users.active, true)));
  const recipients = alert.roles ? users.filter((u) => alert.roles!.includes(u.role)) : users;
  if (recipients.length === 0) return row.id;

  const prefs = await db
    .select()
    .from(schema.notificationPreferences)
    .where(
      and(
        inArray(schema.notificationPreferences.userId, recipients.map((u) => u.id)),
        eq(schema.notificationPreferences.enabled, true),
        alert.profileId
          ? or(isNull(schema.notificationPreferences.profileId), eq(schema.notificationPreferences.profileId, alert.profileId))
          : isNull(schema.notificationPreferences.profileId),
      ),
    );

  const deliveries: (typeof schema.alertDeliveries.$inferInsert)[] = recipients.map((u) => ({
    alertId: row.id,
    userId: u.id,
    channel: "IN_APP" as const,
    frequency: "IMMEDIATE" as const,
    status: "SENT" as const,
    sentAt: new Date(),
  }));
  const seen = new Set<string>();
  for (const p of prefs) {
    if (p.channel === "IN_APP" || p.frequency === "OFF") continue;
    if (p.alertTypes.length > 0 && !p.alertTypes.includes(alert.type)) continue;
    if (alert.type === "NEW_HIGH_MATCH" && alert.score != null && alert.score < p.minScore) continue;
    const key = `${p.userId}:${p.channel}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const user = recipients.find((u) => u.id === p.userId)!;
    deliveries.push({
      alertId: row.id,
      userId: p.userId,
      channel: p.channel,
      frequency: p.frequency,
      target: p.channel === "EMAIL" ? p.target || user.email : p.target,
      status: "PENDING",
    });
  }
  await db.insert(schema.alertDeliveries).values(deliveries).onConflictDoNothing();
  return row.id;
}
