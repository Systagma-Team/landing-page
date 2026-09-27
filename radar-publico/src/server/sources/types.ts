import type { InnovationClass, OpportunityKind } from "@/server/matching/types";

/** A record exactly as returned by the source (stored verbatim in raw_records). */
export interface SourceRecord {
  endpoint: string;
  sourceRecordId: string;
  payload: unknown;
}

export interface NormalizedOpportunity {
  sourceKey: string;
  sourceRecordId: string;
  sourceUrl: string | null;
  sourceUpdatedAt: Date | null;

  pncpControlNumber: string | null;
  kind: OpportunityKind;
  status: "PUBLISHED" | "SUSPENDED" | "CANCELLED" | "UNKNOWN";
  sourceStatusName: string | null;

  title: string;
  objectDescription: string;
  complementaryInfo: string | null;

  modalityCode: number | null;
  modalityName: string | null;
  disputeModeName: string | null;
  instrumentName: string | null;
  processNumber: string | null;
  purchaseNumber: string | null;
  purchaseYear: number | null;
  purchaseSequence: number | null;
  srp: boolean | null;
  legalBasis: { code?: number | string; name?: string; description?: string } | null;

  organizationName: string | null;
  organizationCnpj: string | null;
  governmentSphere: string | null;
  governmentPower: string | null;
  unitCode: string | null;
  unitName: string | null;
  state: string | null;
  city: string | null;
  cityIbge: string | null;

  estimatedValue: number | null;
  awardedValue: number | null;

  publicationDate: Date | null;
  proposalStart: Date | null;
  proposalDeadline: Date | null;
  expectedDate: string | null;
  originSystemUrl: string | null;

  exclusiveMeEpp: boolean | null;
  innovationClass: InnovationClass;
  innovationEvidence: string | null;

  /** Extra dedup keys for records from plans or mirrors (e.g. "pca:..."). */
  extraKeys?: string[];
  raw: unknown;
}

export interface CollectWindow {
  from: Date;
  to: Date;
}

export interface CollectContext {
  config: Record<string, unknown>;
  log: (msg: string) => void;
}

export interface OpportunityRef {
  sourceRecordId: string;
  pncpControlNumber: string | null;
  organizationCnpj: string | null;
  purchaseYear: number | null;
  purchaseSequence: number | null;
}

export interface SourceDocument {
  sourceSequence: number | null;
  title: string;
  docTypeCode: number | null;
  docTypeName: string | null;
  url: string;
  publishedAt: Date | null;
  active: boolean;
}

export interface HealthResult {
  status: "OK" | "DEGRADED" | "DOWN" | "NOT_CONFIGURED";
  message: string;
  latencyMs?: number;
}

export type CollectorMode = "publicacao" | "atualizacao" | "proposta" | "pca";

export interface CollectorDefinition {
  name: CollectorMode;
  label: string;
  /** cron (Brasília time) */
  cron: string;
}

/**
 * Contract every procurement source implements. New portals (state, municipal, innovation programs)
 * are added by registering another adapter — the pipeline does not change.
 */
export interface ProcurementSourceAdapter {
  readonly key: string;
  readonly name: string;
  readonly collectors: CollectorDefinition[];
  fetchOpportunities(mode: Exclude<CollectorMode, "pca">, window: CollectWindow, ctx: CollectContext): AsyncIterable<SourceRecord>;
  fetchOpportunityDetails(ref: OpportunityRef, ctx: CollectContext): Promise<SourceRecord | null>;
  fetchDocuments(ref: OpportunityRef, ctx: CollectContext): Promise<SourceDocument[]>;
  fetchProcurementPlans(window: CollectWindow, ctx: CollectContext): AsyncIterable<SourceRecord>;
  normalize(record: SourceRecord): NormalizedOpportunity | null;
  healthCheck(ctx: CollectContext): Promise<HealthResult>;
}

export class NotSupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotSupportedError";
  }
}
