import { PgBoss } from "pg-boss";
import { SOURCE_DEFINITIONS } from "@/server/sources/definitions";

export const TZ = "America/Sao_Paulo";

export const collectQueue = (sourceKey: string, collector: string) => `collect-${sourceKey}-${collector}`;

export const QUEUES = {
  process: "process-opportunities",
  documents: "discover-documents",
  daily: "daily-maintenance",
  dispatch: "dispatch-alerts",
  digestDaily: "digest-daily",
  digestWeekly: "digest-weekly",
  rematch: "rematch-profiles",
} as const;

export interface QueueSpec {
  name: string;
  cron?: string;
  options: { retryLimit: number; retryDelay: number; retryBackoff: boolean; expireInSeconds: number; policy?: "standard" | "stately" | "singleton" | "short" };
}

/** Every queue with retry policy and (optional) schedule in Brasília time. */
export function queueSpecs(): QueueSpec[] {
  const collectors: QueueSpec[] = SOURCE_DEFINITIONS.flatMap((d) =>
    d.collectors.map((c) => ({
      name: collectQueue(d.key, c.name),
      cron: c.cron,
      // one queued + one active at most: overlapping runs of the same collector are pointless
      options: { retryLimit: 3, retryDelay: 300, retryBackoff: true, expireInSeconds: 3 * 3600, policy: "stately" as const },
    })),
  );
  return [
    ...collectors,
    { name: QUEUES.process, options: { retryLimit: 3, retryDelay: 60, retryBackoff: true, expireInSeconds: 3600 } },
    { name: QUEUES.documents, cron: "15 */3 * * *", options: { retryLimit: 2, retryDelay: 300, retryBackoff: true, expireInSeconds: 3600, policy: "stately" } },
    { name: QUEUES.daily, cron: "50 6 * * *", options: { retryLimit: 3, retryDelay: 600, retryBackoff: true, expireInSeconds: 3600, policy: "stately" } },
    { name: QUEUES.dispatch, cron: "* * * * *", options: { retryLimit: 1, retryDelay: 30, retryBackoff: false, expireInSeconds: 300, policy: "stately" } },
    { name: QUEUES.digestDaily, cron: "55 7 * * *", options: { retryLimit: 3, retryDelay: 300, retryBackoff: true, expireInSeconds: 1800, policy: "stately" } },
    { name: QUEUES.digestWeekly, cron: "57 7 * * 1", options: { retryLimit: 3, retryDelay: 300, retryBackoff: true, expireInSeconds: 1800, policy: "stately" } },
    { name: QUEUES.rematch, options: { retryLimit: 2, retryDelay: 120, retryBackoff: true, expireInSeconds: 3 * 3600, policy: "stately" } },
  ];
}

const globalForBoss = globalThis as unknown as { __radarBoss?: Promise<PgBoss> };

/** Producer-only instance for the web app: no scheduling, no maintenance, no migrations. */
async function producer(): Promise<PgBoss> {
  if (!globalForBoss.__radarBoss) {
    globalForBoss.__radarBoss = (async () => {
      const boss = new PgBoss({ connectionString: process.env.DATABASE_URL!, supervise: false, schedule: false, migrate: false });
      boss.on("error", (e) => console.error("[pg-boss]", e));
      await boss.start();
      return boss;
    })();
  }
  return globalForBoss.__radarBoss;
}

/** Enqueue from the web app (e.g. "Coletar agora", rematch after a profile change). */
export async function enqueue(name: string, data: object = {}): Promise<string | null> {
  const boss = await producer();
  return boss.send(name, data);
}
