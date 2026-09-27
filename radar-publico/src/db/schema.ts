import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  AttentionItem,
  CapabilityMatch,
  EvidenceMatch,
  ActivityMatch,
  GapItem,
  ScoreBreakdown,
  ScoringConfig,
  ProfileSnapshot,
} from "@/server/matching/types";

/*
 * Tenancy: tables holding business judgement carry `organization_id`.
 * Public procurement data (opportunities, documents, extracted requirements)
 * is a shared catalogue collected once and reused by every tenant.
 */

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

// ---------------------------------------------------------------- enums

export const userRole = pgEnum("user_role", ["ADMIN", "ANALYST", "VIEWER"]);
export const profileKind = pgEnum("profile_kind", ["MEI", "COMPANY"]);
export const activityType = pgEnum("activity_type", [
  "CNAE_PRIMARY",
  "CNAE_SECONDARY",
  "MEI_OCCUPATION",
  "ACTIVITY",
]);
export const capabilityLevel = pgEnum("capability_level", ["CORE", "SECONDARY", "EXPLORATORY"]);
export const termPolarity = pgEnum("term_polarity", ["POSITIVE", "NEGATIVE"]);
export const negativeEffect = pgEnum("negative_effect", ["EXCLUDE", "PENALIZE"]);

export const opportunityKind = pgEnum("opportunity_kind", [
  "ACTIVE_TENDER",
  "DIRECT_PROCUREMENT",
  "FUTURE_PROCUREMENT",
  "CONTRACT_NOTICE",
  "AWARD_RESULT",
  "OTHER",
]);
export const opportunityStatus = pgEnum("opportunity_status", [
  "PUBLISHED",
  "SUSPENDED",
  "CANCELLED",
  "UNKNOWN",
]);
export const innovationClass = pgEnum("innovation_class", [
  "CPSI",
  "ETEC",
  "COMPETITIVE_DIALOGUE",
  "INNOVATION_MENTION",
  "NONE",
]);
export const compatibilityStatus = pgEnum("compatibility_status", [
  "HIGH_COMPATIBILITY",
  "MEDIUM_COMPATIBILITY",
  "LOW_COMPATIBILITY",
  "REQUIRES_REVIEW",
  "LIKELY_INCOMPATIBLE",
  "INSUFFICIENT_INFORMATION",
]);
export const workflowStatus = pgEnum("workflow_status", [
  "NEW",
  "AUTOMATICALLY_ANALYZED",
  "REVIEW_REQUIRED",
  "INTERESTED",
  "ANALYZING_DOCUMENTS",
  "PREPARING_PROPOSAL",
  "READY_FOR_HUMAN_SUBMISSION",
  "SUBMITTED_EXTERNALLY",
  "WON",
  "LOST",
  "DISCARDED",
  "CANCELLED",
]);
export const changeType = pgEnum("change_type", [
  "DEADLINE_CHANGED",
  "PROPOSAL_START_CHANGED",
  "VALUE_CHANGED",
  "STATUS_CHANGED",
  "OBJECT_CHANGED",
  "DOCUMENT_ADDED",
  "OTHER",
]);
export const requirementCategory = pgEnum("requirement_category", [
  "TECHNICAL_QUALIFICATION",
  "PROFESSIONAL_QUALIFICATION",
  "CERTIFICATE",
  "FINANCIAL",
  "PREVIOUS_EXPERIENCE",
  "CNAE",
  "SITE_VISIT",
  "CONSORTIUM",
  "SUBCONTRACTING",
  "ME_EPP",
  "EXECUTION_TIMEFRAME",
  "DEADLINE",
  "INTEGRATION",
  "PLATFORM",
  "GEOGRAPHIC",
  "OTHER",
]);
export const evidenceVerification = pgEnum("evidence_verification", ["VERIFIED", "UNVERIFIED"]);
export const analyzerKind = pgEnum("analyzer_kind", ["RULES", "AI"]);
export const sourceRunStatus = pgEnum("source_run_status", ["RUNNING", "SUCCESS", "PARTIAL", "FAILED"]);
export const vaultCategory = pgEnum("vault_category", [
  "CNPJ_CARD",
  "CCMEI",
  "SICAF",
  "CERTIDAO_FEDERAL",
  "CERTIDAO_ESTADUAL",
  "CERTIDAO_MUNICIPAL",
  "CERTIDAO_FGTS",
  "CERTIDAO_TRABALHISTA",
  "CERTIDAO_FALENCIA",
  "ATESTADO_CAPACIDADE_TECNICA",
  "PORTFOLIO",
  "CASE_STUDY",
  "TEAM_QUALIFICATION",
  "PROFESSIONAL_CERTIFICATION",
  "LEGAL",
  "FINANCIAL",
  "OTHER",
]);
export const evidenceType = pgEnum("evidence_type", [
  "ATESTADO_CAPACIDADE_TECNICA",
  "CASE",
  "CERTIFICATION",
  "PORTFOLIO",
  "CONTRACT",
  "OTHER",
]);
export const alertType = pgEnum("alert_type", [
  "NEW_HIGH_MATCH",
  "DEADLINE_SOON",
  "DEADLINE_CHANGED",
  "OPPORTUNITY_UPDATED",
  "DOCUMENT_EXPIRING",
  "NEW_PCA_MATCH",
  "NEW_INNOVATION",
  "SOURCE_FAILURE",
]);
export const alertSeverity = pgEnum("alert_severity", ["INFO", "ATTENTION", "CRITICAL"]);
export const notificationChannel = pgEnum("notification_channel", ["IN_APP", "EMAIL", "WEBHOOK", "SLACK"]);
export const notificationFrequency = pgEnum("notification_frequency", ["IMMEDIATE", "DAILY", "WEEKLY", "OFF"]);
export const deliveryStatus = pgEnum("delivery_status", ["PENDING", "SENT", "FAILED", "SKIPPED"]);
export const overrideField = pgEnum("override_field", [
  "SCORE",
  "COMPATIBILITY_STATUS",
  "CATEGORY",
  "SERVICE_MAPPING",
  "RISK",
  "PROFILE_MATCH",
]);

// ---------------------------------------------------------------- identity

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("VIEWER"),
    active: boolean("active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_uq").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 of the random token held in the cookie; the token itself is never stored.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    ip: text("ip"),
    success: boolean("success").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_attempts_email_idx").on(t.email, t.createdAt), index("login_attempts_ip_idx").on(t.ip, t.createdAt)],
);

// ---------------------------------------------------------------- profiles

export const procurementProfiles = pgTable(
  "procurement_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    kind: profileKind("kind").notNull(),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    legalName: text("legal_name"),
    cnpj: text("cnpj"),
    isMeEpp: boolean("is_me_epp"),
    sicafStatus: text("sicaf_status"),
    nationwide: boolean("nationwide").notNull().default(false),
    preferredStates: text("preferred_states").array().notNull().default([]),
    restrictToPreferredStates: boolean("restrict_to_preferred_states").notNull().default(false),
    minProjectValue: numeric("min_project_value", { precision: 16, scale: 2 }),
    maxProjectValue: numeric("max_project_value", { precision: 16, scale: 2 }),
    operationalCapacity: text("operational_capacity"),
    notes: text("notes"),
    scoring: jsonb("scoring").$type<ScoringConfig>().notNull(),
    currentVersion: integer("current_version").notNull().default(1),
    ...timestamps,
  },
  (t) => [uniqueIndex("profiles_org_slug_uq").on(t.organizationId, t.slug)],
);

export const profileActivities = pgTable(
  "profile_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => procurementProfiles.id, { onDelete: "cascade" }),
    type: activityType("type").notNull(),
    code: text("code"),
    description: text("description").notNull(),
    keywords: text("keywords").array().notNull().default([]),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("activities_profile_idx").on(t.profileId)],
);

export const serviceCapabilities = pgTable(
  "service_capabilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => procurementProfiles.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    level: capabilityLevel("level").notNull().default("CORE"),
    strategic: boolean("strategic").notNull().default(false),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("capabilities_profile_idx").on(t.profileId)],
);

export const taxonomyTerms = pgTable(
  "taxonomy_terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => procurementProfiles.id, { onDelete: "cascade" }),
    capabilityId: uuid("capability_id").references(() => serviceCapabilities.id, { onDelete: "cascade" }),
    polarity: termPolarity("polarity").notNull(),
    term: text("term").notNull(),
    weight: real("weight").notNull().default(1),
    caseSensitive: boolean("case_sensitive").notNull().default(false),
    // Only for NEGATIVE terms.
    effect: negativeEffect("effect"),
    note: text("note"),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("terms_profile_idx").on(t.profileId)],
);

export const profileDocuments = pgTable(
  "profile_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => procurementProfiles.id, { onDelete: "cascade" }),
    category: vaultCategory("category").notNull(),
    title: text("title").notNull(),
    issuedOn: date("issued_on"),
    // Not every document expires.
    expiresOn: date("expires_on"),
    notes: text("notes"),
    storageKey: text("storage_key"),
    originalName: text("original_name"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    sha256: text("sha256"),
    archived: boolean("archived").notNull().default(false),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [index("profile_documents_profile_idx").on(t.profileId), index("profile_documents_expiry_idx").on(t.expiresOn)],
);

export const technicalEvidence = pgTable(
  "technical_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => procurementProfiles.id, { onDelete: "cascade" }),
    type: evidenceType("type").notNull(),
    title: text("title").notNull(),
    issuer: text("issuer"),
    issuedOn: date("issued_on"),
    description: text("description"),
    // Free keywords describing what the evidence demonstrates (e.g. "Power BI", "integração de APIs").
    capabilities: text("capabilities").array().notNull().default([]),
    documentId: uuid("document_id").references(() => profileDocuments.id, { onDelete: "set null" }),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("evidence_profile_idx").on(t.profileId)],
);

export const profileVersions = pgTable(
  "profile_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => procurementProfiles.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").$type<ProfileSnapshot>().notNull(),
    snapshotHash: text("snapshot_hash").notNull(),
    changeSummary: text("change_summary"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("profile_versions_uq").on(t.profileId, t.version)],
);

// ---------------------------------------------------------------- sources

export const sources = pgTable("sources", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  // Per-collector cursor, e.g. { "publicacao": "2026-09-20" }.
  cursors: jsonb("cursors").$type<Record<string, string>>().notNull().default({}),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastStatus: sourceRunStatus("last_status"),
  lastError: text("last_error"),
  lastRecordsCollected: integer("last_records_collected"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  ...timestamps,
});

export const sourceRuns = pgTable(
  "source_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceKey: text("source_key")
      .notNull()
      .references(() => sources.key),
    collector: text("collector").notNull(),
    status: sourceRunStatus("status").notNull().default("RUNNING"),
    windowFrom: date("window_from"),
    windowTo: date("window_to"),
    fetched: integer("fetched").notNull().default(0),
    created: integer("created").notNull().default(0),
    updated: integer("updated").notNull().default(0),
    unchanged: integer("unchanged").notNull().default(0),
    failedRecords: integer("failed_records").notNull().default(0),
    errors: jsonb("errors").$type<{ at: string; message: string }[]>().notNull().default([]),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("source_runs_source_idx").on(t.sourceKey, t.startedAt)],
);

// ---------------------------------------------------------------- public catalogue

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: opportunityKind("kind").notNull(),
    status: opportunityStatus("status").notNull().default("UNKNOWN"),
    sourceStatusName: text("source_status_name"),
    primarySource: text("primary_source").notNull(),
    sourceUrl: text("source_url"),
    originSystemUrl: text("origin_system_url"),
    pncpControlNumber: text("pncp_control_number"),

    title: text("title").notNull(),
    objectDescription: text("object_description").notNull(),
    complementaryInfo: text("complementary_info"),

    modalityCode: integer("modality_code"),
    modalityName: text("modality_name"),
    disputeModeName: text("dispute_mode_name"),
    instrumentName: text("instrument_name"),
    processNumber: text("process_number"),
    purchaseNumber: text("purchase_number"),
    purchaseYear: integer("purchase_year"),
    purchaseSequence: integer("purchase_sequence"),
    srp: boolean("srp"),
    legalBasis: jsonb("legal_basis").$type<{ code?: number | string; name?: string; description?: string } | null>(),

    organizationName: text("organization_name"),
    organizationCnpj: text("organization_cnpj"),
    governmentSphere: text("government_sphere"),
    governmentPower: text("government_power"),
    unitCode: text("unit_code"),
    unitName: text("unit_name"),
    state: text("state"),
    city: text("city"),
    /** accent-free lowercase city for filtering */
    citySearch: text("city_search"),
    cityIbge: text("city_ibge"),

    estimatedValue: numeric("estimated_value", { precision: 18, scale: 2 }),
    awardedValue: numeric("awarded_value", { precision: 18, scale: 2 }),
    currency: text("currency").notNull().default("BRL"),

    publicationDate: timestamp("publication_date", { withTimezone: true }),
    proposalStart: timestamp("proposal_start", { withTimezone: true }),
    proposalDeadline: timestamp("proposal_deadline", { withTimezone: true }),
    // PCA: expected contracting date (dataDesejada).
    expectedDate: date("expected_date"),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),

    // null = unknown (never inferred without evidence)
    exclusiveMeEpp: boolean("exclusive_me_epp"),
    innovationClass: innovationClass("innovation_class").notNull().default("NONE"),
    innovationEvidence: text("innovation_evidence"),

    contentHash: text("content_hash").notNull(),
    rawPayload: jsonb("raw_payload").$type<unknown>(),
    searchText: text("search_text").notNull().default(""),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('portuguese', coalesce(search_text, ''))`,
    ),

    documentsCheckedAt: timestamp("documents_checked_at", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastCollectedAt: timestamp("last_collected_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("opportunities_pncp_uq").on(t.pncpControlNumber),
    index("opportunities_deadline_idx").on(t.proposalDeadline),
    index("opportunities_publication_idx").on(t.publicationDate),
    index("opportunities_kind_idx").on(t.kind),
    index("opportunities_state_idx").on(t.state),
    index("opportunities_org_cnpj_idx").on(t.organizationCnpj),
    index("opportunities_search_idx").using("gin", t.searchVector),
  ],
);

/** Every deduplication key an opportunity is known by (PNCP id, purchase composite, process composite...). */
export const opportunityKeys = pgTable(
  "opportunity_keys",
  {
    key: text("key").primaryKey(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("opportunity_keys_opp_idx").on(t.opportunityId)],
);

export const opportunitySources = pgTable(
  "opportunity_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    sourceKey: text("source_key").notNull(),
    sourceRecordId: text("source_record_id").notNull(),
    sourceUrl: text("source_url"),
    collectedAt: timestamp("collected_at", { withTimezone: true }).notNull().defaultNow(),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }),
    lastPayloadHash: text("last_payload_hash"),
  },
  (t) => [
    uniqueIndex("opportunity_sources_uq").on(t.sourceKey, t.sourceRecordId),
    index("opportunity_sources_opp_idx").on(t.opportunityId),
  ],
);

export const rawRecords = pgTable(
  "raw_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceKey: text("source_key").notNull(),
    endpoint: text("endpoint").notNull(),
    sourceRecordId: text("source_record_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    payload: jsonb("payload").$type<unknown>().notNull(),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id, { onDelete: "set null" }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("raw_records_uq").on(t.sourceKey, t.sourceRecordId, t.payloadHash),
    index("raw_records_opp_idx").on(t.opportunityId),
  ],
);

export const opportunityChanges = pgTable(
  "opportunity_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    type: changeType("type").notNull(),
    field: text("field").notNull(),
    oldValue: jsonb("old_value").$type<unknown>(),
    newValue: jsonb("new_value").$type<unknown>(),
    significant: boolean("significant").notNull().default(true),
    sourceKey: text("source_key"),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("opportunity_changes_opp_idx").on(t.opportunityId, t.detectedAt)],
);

export const fileBlobs = pgTable("file_blobs", {
  sha256: text("sha256").primaryKey(),
  storageKey: text("storage_key").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const opportunityDocuments = pgTable(
  "opportunity_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    sourceKey: text("source_key").notNull(),
    sourceSequence: integer("source_sequence"),
    title: text("title").notNull(),
    docTypeCode: integer("doc_type_code"),
    docTypeName: text("doc_type_name"),
    url: text("url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    fileSha256: text("file_sha256").references(() => fileBlobs.sha256),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }),
    extractionStatus: text("extraction_status").notNull().default("NOT_DOWNLOADED"),
    extractedText: text("extracted_text"),
    pageCount: integer("page_count"),
    discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("opportunity_documents_uq").on(t.opportunityId, t.url)],
);

export const opportunityAnalyses = pgTable(
  "opportunity_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    analyzer: analyzerKind("analyzer").notNull(),
    provider: text("provider"),
    model: text("model"),
    promptVersion: text("prompt_version"),
    schemaVersion: text("schema_version").notNull(),
    inputHash: text("input_hash").notNull(),
    sourceDocumentIds: uuid("source_document_ids").array().notNull().default([]),
    output: jsonb("output").$type<unknown>(),
    status: text("status").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("opportunity_analyses_cache_uq").on(t.opportunityId, t.analyzer, t.schemaVersion, t.inputHash),
  ],
);

export const opportunityRequirements = pgTable(
  "opportunity_requirements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => opportunityAnalyses.id, { onDelete: "cascade" }),
    category: requirementCategory("category").notNull(),
    ruleId: text("rule_id"),
    description: text("description").notNull(),
    supportingText: text("supporting_text"),
    // "field:objectDescription" or "document:<uuid>"
    sourceRef: text("source_ref").notNull(),
    page: integer("page"),
    section: text("section"),
    verification: evidenceVerification("verification").notNull(),
    confidence: real("confidence"),
    attributes: jsonb("attributes").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("opportunity_requirements_opp_idx").on(t.opportunityId)],
);

// ---------------------------------------------------------------- tenant overlays

export const opportunityMatches = pgTable(
  "opportunity_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => procurementProfiles.id, { onDelete: "cascade" }),
    profileVersion: integer("profile_version").notNull(),
    engineVersion: text("engine_version").notNull(),
    inputHash: text("input_hash").notNull(),
    isCurrent: boolean("is_current").notNull().default(true),
    status: compatibilityStatus("status").notNull(),
    score: integer("score").notNull(),
    confidence: text("confidence").notNull(),
    breakdown: jsonb("breakdown").$type<ScoreBreakdown>().notNull(),
    serviceMatches: jsonb("service_matches").$type<CapabilityMatch[]>().notNull(),
    activityMatches: jsonb("activity_matches").$type<ActivityMatch[]>().notNull(),
    evidenceMatches: jsonb("evidence_matches").$type<EvidenceMatch[]>().notNull(),
    attention: jsonb("attention").$type<AttentionItem[]>().notNull(),
    blockers: jsonb("blockers").$type<AttentionItem[]>().notNull(),
    gaps: jsonb("gaps").$type<GapItem[]>().notNull(),
    missingInformation: jsonb("missing_information").$type<string[]>().notNull(),
    riskFlags: jsonb("risk_flags").$type<AttentionItem[]>().notNull(),
    explanation: text("explanation").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("opportunity_matches_current_uq")
      .on(t.profileId, t.opportunityId)
      .where(sql`${t.isCurrent}`),
    index("opportunity_matches_org_profile_idx").on(t.organizationId, t.profileId, t.isCurrent, t.score),
    index("opportunity_matches_opp_idx").on(t.opportunityId),
  ],
);

export const matchOverrides = pgTable(
  "match_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => procurementProfiles.id, { onDelete: "cascade" }),
    matchId: uuid("match_id").references(() => opportunityMatches.id, { onDelete: "set null" }),
    field: overrideField("field").notNull(),
    automaticValue: jsonb("automatic_value").$type<unknown>(),
    manualValue: jsonb("manual_value").$type<unknown>().notNull(),
    reason: text("reason").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("match_overrides_lookup_idx").on(t.organizationId, t.opportunityId, t.profileId)],
);

export const opportunityWorkflows = pgTable(
  "opportunity_workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => procurementProfiles.id, { onDelete: "cascade" }),
    status: workflowStatus("status").notNull().default("NEW"),
    assignedTo: uuid("assigned_to").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("opportunity_workflows_uq").on(t.organizationId, t.opportunityId, t.profileId),
    index("opportunity_workflows_status_idx").on(t.organizationId, t.status),
  ],
);

export const opportunityDecisions = pgTable(
  "opportunity_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => procurementProfiles.id, { onDelete: "cascade" }),
    fromStatus: workflowStatus("from_status"),
    toStatus: workflowStatus("to_status").notNull(),
    reasonCode: text("reason_code"),
    reasonText: text("reason_text"),
    userId: uuid("user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("opportunity_decisions_idx").on(t.organizationId, t.opportunityId, t.createdAt)],
);

export const opportunityNotes = pgTable(
  "opportunity_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").references(() => procurementProfiles.id, { onDelete: "set null" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    ...timestamps,
  },
  (t) => [index("opportunity_notes_idx").on(t.organizationId, t.opportunityId)],
);

export const watchlist = pgTable(
  "watchlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    addedBy: uuid("added_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("watchlist_uq").on(t.organizationId, t.opportunityId)],
);

// ---------------------------------------------------------------- alerts

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    profileId: uuid("profile_id").references(() => procurementProfiles.id, { onDelete: "set null" }),
    type: alertType("type").notNull(),
    severity: alertSeverity("severity").notNull().default("INFO"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id, { onDelete: "cascade" }),
    profileDocumentId: uuid("profile_document_id").references(() => profileDocuments.id, { onDelete: "cascade" }),
    // Idempotency: the same event never produces two alerts.
    dedupKey: text("dedup_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("alerts_dedup_uq").on(t.organizationId, t.dedupKey),
    index("alerts_org_created_idx").on(t.organizationId, t.createdAt),
  ],
);

export const alertDeliveries = pgTable(
  "alert_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alertId: uuid("alert_id")
      .notNull()
      .references(() => alerts.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    channel: notificationChannel("channel").notNull(),
    frequency: notificationFrequency("frequency").notNull(),
    // e-mail address / webhook URL captured when the delivery was scheduled
    target: text("target"),
    status: deliveryStatus("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("alert_deliveries_uq").on(t.alertId, t.userId, t.channel),
    index("alert_deliveries_pending_idx").on(t.status, t.channel, t.frequency),
  ],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // null = every profile
    profileId: uuid("profile_id").references(() => procurementProfiles.id, { onDelete: "cascade" }),
    channel: notificationChannel("channel").notNull(),
    frequency: notificationFrequency("frequency").notNull().default("IMMEDIATE"),
    alertTypes: text("alert_types").array().notNull().default([]),
    minScore: integer("min_score").notNull().default(75),
    target: text("target"),
    enabled: boolean("enabled").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("notification_preferences_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------- audit

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    actorType: text("actor_type").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before").$type<unknown>(),
    after: jsonb("after").$type<unknown>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_org_idx").on(t.organizationId, t.createdAt),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
  ],
);
