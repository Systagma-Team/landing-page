import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, schema, type Database } from "@/db";
import { createAlert } from "@/server/alerts/generate";
import { dispatchPending, isAllowedWebhookUrl, type Transport } from "@/server/alerts/dispatch";
import { deadlineAlerts, documentExpiryAlerts } from "@/server/alerts/rules";
import { hashPassword } from "@/server/auth/password";
import { processOpportunities } from "@/server/ingestion/pipeline";
import { ingestRecord } from "@/server/ingestion/upsert";
import { normalizePncpContratacao } from "@/server/sources/pncp";
import { createHttpClient } from "@/server/sources/http";
import { contratacao } from "./fixtures/pncp";
import { resetDatabase } from "./helpers/db";

let db: Database;
let organizationId: string;
let userId: string;

function recordingTransport() {
  const sent: { channel: string; to: string; subject?: string; body: string }[] = [];
  const t: Transport = {
    async email(to, subject, text) {
      sent.push({ channel: "EMAIL", to, subject, body: text });
    },
    async webhook(url, payload) {
      sent.push({ channel: "WEBHOOK", to: url, body: JSON.stringify(payload) });
    },
    async slack(url, text) {
      sent.push({ channel: "SLACK", to: url, body: text });
    },
  };
  return { t, sent };
}

beforeEach(async () => {
  ({ db, organizationId } = await resetDatabase());
  const [u] = await db
    .insert(schema.users)
    .values({ organizationId, email: "a@example.com", name: "A", role: "ANALYST", passwordHash: await hashPassword("senha-de-teste-123") })
    .returning();
  userId = u.id;
});
afterAll(async () => {
  await closeDb();
});

describe("alert delivery", () => {
  it("delivers immediate alerts once and groups digests per user and channel", async () => {
    await db.insert(schema.notificationPreferences).values([
      { organizationId, userId, channel: "EMAIL", frequency: "IMMEDIATE", target: null },
      { organizationId, userId, channel: "WEBHOOK", frequency: "DAILY", target: "https://hooks.example.com/radar" },
    ]);
    for (let i = 0; i < 3; i++) {
      await createAlert(db, { organizationId, type: "OPPORTUNITY_UPDATED", severity: "ATTENTION", title: `Alerta ${i}`, body: "corpo", dedupKey: `k${i}` });
    }
    // idempotent
    expect(await createAlert(db, { organizationId, type: "OPPORTUNITY_UPDATED", severity: "ATTENTION", title: "dup", body: "", dedupKey: "k0" })).toBeNull();

    const { t, sent } = recordingTransport();
    const immediate = await dispatchPending(db, "IMMEDIATE", t);
    expect(immediate.sent).toBe(3);
    expect(sent.filter((s) => s.channel === "EMAIL")).toHaveLength(3);
    expect(sent[0].to).toBe("a@example.com");

    const digest = await dispatchPending(db, "DAILY", t);
    expect(digest.sent).toBe(3);
    const hooks = sent.filter((s) => s.channel === "WEBHOOK");
    expect(hooks).toHaveLength(1);
    expect(JSON.parse(hooks[0].body).alerts).toHaveLength(3);

    // nothing left to send
    expect((await dispatchPending(db, "IMMEDIATE", t)).sent).toBe(0);
    const inApp = await db.select().from(schema.alertDeliveries).where(eq(schema.alertDeliveries.channel, "IN_APP"));
    expect(inApp).toHaveLength(3);
  });

  it("records failures without losing the alert; missing SMTP is a permanent failure", async () => {
    await db.insert(schema.notificationPreferences).values({ organizationId, userId, channel: "EMAIL", frequency: "IMMEDIATE" });
    await createAlert(db, { organizationId, type: "SOURCE_FAILURE", severity: "CRITICAL", title: "x", body: "y", dedupKey: "f1" });
    const failing: Transport = {
      email: async () => {
        throw new Error("SMTP não configurado");
      },
      webhook: async () => undefined,
      slack: async () => undefined,
    };
    const r = await dispatchPending(db, "IMMEDIATE", failing);
    expect(r.failed).toBe(1);
    const [d] = await db.select().from(schema.alertDeliveries).where(eq(schema.alertDeliveries.channel, "EMAIL"));
    expect(d.status).toBe("FAILED");
    expect(d.error).toContain("SMTP");
  });

  it("only allows public HTTPS webhook targets", () => {
    expect(isAllowedWebhookUrl("https://hooks.slack.com/services/x")).toBe(true);
    expect(isAllowedWebhookUrl("https://127.0.0.1/hook")).toBe(false);
    expect(isAllowedWebhookUrl("https://10.0.0.5/hook")).toBe(false);
    expect(isAllowedWebhookUrl("ftp://example.com")).toBe(false);
  });
});

describe("deadline and document expiry alerts", () => {
  it("warns about deadlines within 7 days for relevant matches, once per deadline", async () => {
    const now = new Date("2026-10-15T12:00:00-03:00");
    const payload = contratacao({ dataEncerramentoProposta: "2026-10-20T09:00:00" });
    const n = normalizePncpContratacao(payload)!;
    const { opportunityId } = await ingestRecord(db, { endpoint: "t", sourceRecordId: n.sourceRecordId, payload }, n);
    await processOpportunities(db, [opportunityId], [], { now });
    expect(await deadlineAlerts(db, now)).toBe(1);
    expect(await deadlineAlerts(db, now)).toBe(0);
    const [a] = await db.select().from(schema.alerts).where(eq(schema.alerts.type, "DEADLINE_SOON"));
    expect(a.title).toContain("5 dias");
  });

  it("warns about expiring vault documents and never assumes documents without expiry expire", async () => {
    const [p] = await db.select().from(schema.procurementProfiles).where(eq(schema.procurementProfiles.slug, "systagma"));
    await db.insert(schema.profileDocuments).values([
      { organizationId, profileId: p.id, category: "CERTIDAO_FGTS", title: "CRF", expiresOn: "2026-10-05" },
      { organizationId, profileId: p.id, category: "CNPJ_CARD", title: "Cartão CNPJ", expiresOn: null },
      { organizationId, profileId: p.id, category: "CERTIDAO_FEDERAL", title: "CND", expiresOn: "2027-06-01" },
    ]);
    const now = new Date("2026-09-27T12:00:00-03:00");
    expect(await documentExpiryAlerts(db, now)).toBe(1);
    const [a] = await db.select().from(schema.alerts).where(eq(schema.alerts.type, "DOCUMENT_EXPIRING"));
    expect(a.title).toContain("CRF");
    expect(a.severity).toBe("ATTENTION");
  });
});

describe("resilient HTTP client", () => {
  it("honours 429 Retry-After and retries 5xx before succeeding", async () => {
    const waits: number[] = [];
    let call = 0;
    const client = createHttpClient({
      baseUrl: "https://example.test",
      userAgent: "test",
      minIntervalMs: 0,
      rateLimitWaitMs: 45_000,
      sleep: async (ms) => {
        waits.push(ms);
      },
      fetchImpl: (async () => {
        call++;
        if (call === 1) return new Response("", { status: 429, headers: { "retry-after": "7" } });
        if (call === 2) return new Response("oops", { status: 502 });
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
      }) as typeof fetch,
    });
    expect(await client.getJson("/x")).toEqual({ ok: true });
    expect(call).toBe(3);
    expect(waits).toContain(7000);
    expect(waits.some((w) => w >= 45_000)).toBe(true);
  });

  it("does not retry client errors (400) and treats 404/204 as empty collections", async () => {
    let calls = 0;
    const client = createHttpClient({
      baseUrl: "https://example.test",
      userAgent: "test",
      minIntervalMs: 0,
      sleep: async () => undefined,
      fetchImpl: (async (u: string) => {
        calls++;
        if (String(u).includes("bad")) return new Response("Tamanho de página inválido", { status: 400 });
        if (String(u).includes("none")) return new Response("", { status: 404 });
        return new Response(null, { status: 204 });
      }) as typeof fetch,
    });
    await expect(client.getJson("/bad")).rejects.toThrow(/400/);
    expect(calls).toBe(1);
    expect(await client.getJson("/none")).toBeNull();
    expect(await client.getJson("/empty")).toBeNull();
  });
});
