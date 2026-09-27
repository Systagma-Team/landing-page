import { createHmac } from "node:crypto";
import { and, asc, eq, inArray, lt, ne } from "drizzle-orm";
import nodemailer from "nodemailer";
import { schema, type Database } from "@/db";
import { formatDateTime } from "@/lib/dates";

export interface Transport {
  email(to: string, subject: string, text: string): Promise<void>;
  webhook(url: string, payload: unknown): Promise<void>;
  slack(url: string, text: string): Promise<void>;
}

const MAX_ATTEMPTS = 5;

export function isAllowedWebhookUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol === "https:") return !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(url.hostname);
    return process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function defaultTransport(): Transport {
  const host = process.env.SMTP_HOST;
  const mailer = host
    ? nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      })
    : null;
  const post = async (url: string, body: string, headers: Record<string, string>) => {
    if (!isAllowedWebhookUrl(url)) throw new Error("URL de webhook não permitida");
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body, signal: AbortSignal.timeout(15_000), redirect: "error" });
    if (!res.ok) throw new Error(`Webhook respondeu ${res.status}`);
  };
  return {
    async email(to, subject, text) {
      if (!mailer) throw new Error("SMTP não configurado");
      await mailer.sendMail({ from: process.env.SMTP_FROM ?? "Radar Público <radar@localhost>", to, subject, text });
    },
    async webhook(url, payload) {
      const body = JSON.stringify(payload);
      const secret = process.env.WEBHOOK_SECRET;
      await post(url, body, secret ? { "X-Radar-Signature": `sha256=${createHmac("sha256", secret).update(body).digest("hex")}` } : {});
    },
    async slack(url, text) {
      await post(url, JSON.stringify({ text }), {});
    },
  };
}

function link(alert: { opportunityId: string | null }): string {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return alert.opportunityId ? `${base}/oportunidades/${alert.opportunityId}` : `${base}/alertas`;
}

type Row = {
  delivery: typeof schema.alertDeliveries.$inferSelect;
  alert: typeof schema.alerts.$inferSelect;
};

function renderOne(r: Row): string {
  return `${r.alert.title}\n${r.alert.body}\n${link(r.alert)}\n(${formatDateTime(r.alert.createdAt)})`;
}

/**
 * Sends pending e-mail/webhook/Slack deliveries of one frequency. IMMEDIATE sends one message per
 * alert; DAILY/WEEKLY group everything pending per user and channel into a digest.
 */
export async function dispatchPending(
  db: Database,
  frequency: "IMMEDIATE" | "DAILY" | "WEEKLY",
  transport: Transport = defaultTransport(),
): Promise<{ sent: number; failed: number; skipped: number }> {
  const rows: Row[] = await db
    .select({ delivery: schema.alertDeliveries, alert: schema.alerts })
    .from(schema.alertDeliveries)
    .innerJoin(schema.alerts, eq(schema.alerts.id, schema.alertDeliveries.alertId))
    .where(
      and(
        eq(schema.alertDeliveries.status, "PENDING"),
        eq(schema.alertDeliveries.frequency, frequency),
        ne(schema.alertDeliveries.channel, "IN_APP"),
        lt(schema.alertDeliveries.attempts, MAX_ATTEMPTS),
      ),
    )
    .orderBy(asc(schema.alerts.createdAt))
    .limit(1000);

  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = frequency === "IMMEDIATE" ? r.delivery.id : `${r.delivery.userId}:${r.delivery.channel}:${r.delivery.target}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const group of groups.values()) {
    const { channel, target } = group[0].delivery;
    const ids = group.map((g) => g.delivery.id);
    if (!target) {
      await db.update(schema.alertDeliveries).set({ status: "SKIPPED", error: "Destino não configurado" }).where(inArray(schema.alertDeliveries.id, ids));
      skipped += ids.length;
      continue;
    }
    const subject =
      group.length === 1 ? `[Radar Público] ${group[0].alert.title}` : `[Radar Público] Resumo ${frequency === "DAILY" ? "diário" : "semanal"}: ${group.length} alertas`;
    const text = group.map(renderOne).join("\n\n———\n\n") + "\n\nAnálise automática. A decisão de participar e qualquer envio oficial são sempre humanos.";
    try {
      if (channel === "EMAIL") await transport.email(target, subject, text);
      else if (channel === "SLACK") await transport.slack(target, `*${subject}*\n${text}`);
      else if (channel === "WEBHOOK")
        await transport.webhook(target, {
          frequency,
          alerts: group.map((g) => ({ id: g.alert.id, type: g.alert.type, severity: g.alert.severity, title: g.alert.title, body: g.alert.body, url: link(g.alert), createdAt: g.alert.createdAt })),
        });
      await db.update(schema.alertDeliveries).set({ status: "SENT", sentAt: new Date(), error: null }).where(inArray(schema.alertDeliveries.id, ids));
      sent += ids.length;
    } catch (err) {
      const message = (err as Error).message.slice(0, 500);
      const permanent = message.includes("não configurado") || message.includes("não permitida");
      for (const g of group) {
        await db
          .update(schema.alertDeliveries)
          .set({ attempts: g.delivery.attempts + 1, error: message, status: permanent || g.delivery.attempts + 1 >= MAX_ATTEMPTS ? "FAILED" : "PENDING" })
          .where(eq(schema.alertDeliveries.id, g.delivery.id));
      }
      failed += ids.length;
    }
  }
  return { sent, failed, skipped };
}
