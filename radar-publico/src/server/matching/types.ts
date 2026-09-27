export type ProfileKind = "MEI" | "COMPANY";

export type CompatibilityStatus =
  | "HIGH_COMPATIBILITY"
  | "MEDIUM_COMPATIBILITY"
  | "LOW_COMPATIBILITY"
  | "REQUIRES_REVIEW"
  | "LIKELY_INCOMPATIBLE"
  | "INSUFFICIENT_INFORMATION";

export type OpportunityKind =
  | "ACTIVE_TENDER"
  | "DIRECT_PROCUREMENT"
  | "FUTURE_PROCUREMENT"
  | "CONTRACT_NOTICE"
  | "AWARD_RESULT"
  | "OTHER";

export type InnovationClass = "CPSI" | "ETEC" | "COMPETITIVE_DIALOGUE" | "INNOVATION_MENTION" | "NONE";

export type RequirementCategory =
  | "TECHNICAL_QUALIFICATION"
  | "PROFESSIONAL_QUALIFICATION"
  | "CERTIFICATE"
  | "FINANCIAL"
  | "PREVIOUS_EXPERIENCE"
  | "CNAE"
  | "SITE_VISIT"
  | "CONSORTIUM"
  | "SUBCONTRACTING"
  | "ME_EPP"
  | "EXECUTION_TIMEFRAME"
  | "DEADLINE"
  | "INTEGRATION"
  | "PLATFORM"
  | "GEOGRAPHIC"
  | "OTHER";

export const DIMENSIONS = [
  "service",
  "activity",
  "technicalCapacity",
  "evidence",
  "economic",
  "time",
  "geographic",
  "documentation",
  "strategic",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export interface ScoringConfig {
  weights: Record<Dimension, number>;
  thresholds: { high: number; medium: number; low: number };
  /** Score from which NEW_HIGH_MATCH alerts may be raised. */
  alertMinScore: number;
  /** Vault categories considered essential for "documentation readiness". */
  essentialDocuments: string[];
}

export interface TermSpec {
  id?: string;
  term: string;
  weight: number;
  caseSensitive: boolean;
}

export interface ProfileSnapshot {
  profileId: string;
  organizationId: string;
  version: number;
  kind: ProfileKind;
  slug: string;
  displayName: string;
  legalName: string | null;
  cnpj: string | null;
  isMeEpp: boolean | null;
  sicafStatus: string | null;
  nationwide: boolean;
  preferredStates: string[];
  restrictToPreferredStates: boolean;
  minProjectValue: number | null;
  maxProjectValue: number | null;
  scoring: ScoringConfig;
  activities: {
    id: string;
    type: string;
    code: string | null;
    description: string;
    keywords: string[];
  }[];
  capabilities: {
    id: string;
    category: string;
    name: string;
    level: "CORE" | "SECONDARY" | "EXPLORATORY";
    strategic: boolean;
    terms: TermSpec[];
  }[];
  negativeTerms: (TermSpec & { effect: "EXCLUDE" | "PENALIZE"; note: string | null })[];
  evidence: {
    id: string;
    type: string;
    title: string;
    issuer: string | null;
    capabilities: string[];
    documentId: string | null;
  }[];
  documents: { id: string; category: string; title: string; expiresOn: string | null }[];
}

export interface RequirementInput {
  id?: string;
  category: RequirementCategory;
  ruleId: string | null;
  description: string;
  supportingText: string | null;
  sourceRef: string;
  attributes: Record<string, unknown>;
  verification: "VERIFIED" | "UNVERIFIED";
}

export interface OpportunityInput {
  id: string;
  kind: OpportunityKind;
  status: "PUBLISHED" | "SUSPENDED" | "CANCELLED" | "UNKNOWN";
  title: string;
  objectDescription: string;
  complementaryInfo: string | null;
  /** Additional verified text (document excerpts, item descriptions). */
  extraText?: string | null;
  modalityCode: number | null;
  state: string | null;
  city: string | null;
  estimatedValue: number | null;
  proposalDeadline: Date | null;
  expectedDate: string | null;
  exclusiveMeEpp: boolean | null;
  innovationClass: InnovationClass;
  requirements: RequirementInput[];
}

export type TextField = "object" | "complementary" | "title" | "extra";

export interface TermHit {
  term: string;
  field: TextField;
  weight: number;
  snippet: string;
}

export interface CapabilityMatch {
  capabilityId: string;
  name: string;
  category: string;
  level: "CORE" | "SECONDARY" | "EXPLORATORY";
  strength: number;
  hits: TermHit[];
}

export interface ActivityMatch {
  activityId: string;
  type: string;
  code: string | null;
  description: string;
  strength: number;
  hits: TermHit[];
}

export interface EvidenceMatch {
  evidenceId: string;
  title: string;
  type: string;
  documentId: string | null;
  matchedOn: string[];
}

export interface AttentionItem {
  code: string;
  message: string;
  supportingText?: string | null;
  sourceRef?: string | null;
}

export interface GapItem {
  code:
    | "POTENTIAL_TECHNICAL_QUALIFICATION_GAP"
    | "POTENTIAL_DOCUMENTATION_GAP"
    | "POTENTIAL_CNAE_ACTIVITY_MISMATCH"
    | "POTENTIAL_CERTIFICATION_GAP";
  required: string;
  profileEvidence: string;
  result: string;
  supportingText?: string | null;
  sourceRef?: string | null;
}

export interface DimensionScore {
  dimension: Dimension;
  weight: number;
  /** 0..1, or null when unknown (scored as neutral 0.5). */
  value: number | null;
  points: number;
  note: string;
}

export interface ScoreBreakdown {
  dimensions: DimensionScore[];
  rawScore: number;
  cap: { value: number; reason: string } | null;
  confidenceFactors: string[];
}

export interface MatchResult {
  status: CompatibilityStatus;
  score: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  relevant: boolean;
  profileIncomplete: boolean;
  profileCompleteness: number;
  breakdown: ScoreBreakdown;
  serviceMatches: CapabilityMatch[];
  activityMatches: ActivityMatch[];
  evidenceMatches: EvidenceMatch[];
  negativeHits: TermHit[];
  attention: AttentionItem[];
  blockers: AttentionItem[];
  gaps: GapItem[];
  missingInformation: string[];
  riskFlags: AttentionItem[];
  explanation: string;
}
