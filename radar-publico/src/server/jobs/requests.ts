import "server-only";
import { rematchOpen } from "@/server/matching/rematch";
import { enqueue, QUEUES } from "./queues";

/**
 * Asks the worker to recompute matches for an organisation. If the queue is unavailable
 * (worker never started), a bounded inline recomputation keeps the UI consistent.
 */
export async function requestRematch(organizationId: string): Promise<"queued" | "inline"> {
  try {
    await enqueue(QUEUES.rematch, { organizationId });
    return "queued";
  } catch (err) {
    console.warn("[rematch] fila indisponível, recalculando inline:", (err as Error).message);
    await rematchOpen(organizationId, () => undefined, 2000);
    return "inline";
  }
}
