CREATE TYPE "public"."activity_type" AS ENUM('CNAE_PRIMARY', 'CNAE_SECONDARY', 'MEI_OCCUPATION', 'ACTIVITY');--> statement-breakpoint
CREATE TYPE "public"."alert_severity" AS ENUM('INFO', 'ATTENTION', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('NEW_HIGH_MATCH', 'DEADLINE_SOON', 'DEADLINE_CHANGED', 'OPPORTUNITY_UPDATED', 'DOCUMENT_EXPIRING', 'NEW_PCA_MATCH', 'NEW_INNOVATION', 'SOURCE_FAILURE');--> statement-breakpoint
CREATE TYPE "public"."analyzer_kind" AS ENUM('RULES', 'AI');--> statement-breakpoint
CREATE TYPE "public"."capability_level" AS ENUM('CORE', 'SECONDARY', 'EXPLORATORY');--> statement-breakpoint
CREATE TYPE "public"."change_type" AS ENUM('DEADLINE_CHANGED', 'PROPOSAL_START_CHANGED', 'VALUE_CHANGED', 'STATUS_CHANGED', 'OBJECT_CHANGED', 'DOCUMENT_ADDED', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."compatibility_status" AS ENUM('HIGH_COMPATIBILITY', 'MEDIUM_COMPATIBILITY', 'LOW_COMPATIBILITY', 'REQUIRES_REVIEW', 'LIKELY_INCOMPATIBLE', 'INSUFFICIENT_INFORMATION');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."evidence_type" AS ENUM('ATESTADO_CAPACIDADE_TECNICA', 'CASE', 'CERTIFICATION', 'PORTFOLIO', 'CONTRACT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."evidence_verification" AS ENUM('VERIFIED', 'UNVERIFIED');--> statement-breakpoint
CREATE TYPE "public"."innovation_class" AS ENUM('CPSI', 'ETEC', 'COMPETITIVE_DIALOGUE', 'INNOVATION_MENTION', 'NONE');--> statement-breakpoint
CREATE TYPE "public"."negative_effect" AS ENUM('EXCLUDE', 'PENALIZE');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('IN_APP', 'EMAIL', 'WEBHOOK', 'SLACK');--> statement-breakpoint
CREATE TYPE "public"."notification_frequency" AS ENUM('IMMEDIATE', 'DAILY', 'WEEKLY', 'OFF');--> statement-breakpoint
CREATE TYPE "public"."opportunity_kind" AS ENUM('ACTIVE_TENDER', 'DIRECT_PROCUREMENT', 'FUTURE_PROCUREMENT', 'CONTRACT_NOTICE', 'AWARD_RESULT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."opportunity_status" AS ENUM('PUBLISHED', 'SUSPENDED', 'CANCELLED', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."override_field" AS ENUM('SCORE', 'COMPATIBILITY_STATUS', 'CATEGORY', 'SERVICE_MAPPING', 'RISK', 'PROFILE_MATCH');--> statement-breakpoint
CREATE TYPE "public"."profile_kind" AS ENUM('MEI', 'COMPANY');--> statement-breakpoint
CREATE TYPE "public"."requirement_category" AS ENUM('TECHNICAL_QUALIFICATION', 'PROFESSIONAL_QUALIFICATION', 'CERTIFICATE', 'FINANCIAL', 'PREVIOUS_EXPERIENCE', 'CNAE', 'SITE_VISIT', 'CONSORTIUM', 'SUBCONTRACTING', 'ME_EPP', 'EXECUTION_TIMEFRAME', 'DEADLINE', 'INTEGRATION', 'PLATFORM', 'GEOGRAPHIC', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."source_run_status" AS ENUM('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."term_polarity" AS ENUM('POSITIVE', 'NEGATIVE');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'ANALYST', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."vault_category" AS ENUM('CNPJ_CARD', 'CCMEI', 'SICAF', 'CERTIDAO_FEDERAL', 'CERTIDAO_ESTADUAL', 'CERTIDAO_MUNICIPAL', 'CERTIDAO_FGTS', 'CERTIDAO_TRABALHISTA', 'CERTIDAO_FALENCIA', 'ATESTADO_CAPACIDADE_TECNICA', 'PORTFOLIO', 'CASE_STUDY', 'TEAM_QUALIFICATION', 'PROFESSIONAL_CERTIFICATION', 'LEGAL', 'FINANCIAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."workflow_status" AS ENUM('NEW', 'AUTOMATICALLY_ANALYZED', 'REVIEW_REQUIRED', 'INTERESTED', 'ANALYZING_DOCUMENTS', 'PREPARING_PROPOSAL', 'READY_FOR_HUMAN_SUBMISSION', 'SUBMITTED_EXTERNALLY', 'WON', 'LOST', 'DISCARDED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "alert_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid NOT NULL,
	"user_id" uuid,
	"channel" "notification_channel" NOT NULL,
	"frequency" "notification_frequency" NOT NULL,
	"target" text,
	"status" "delivery_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"profile_id" uuid,
	"type" "alert_type" NOT NULL,
	"severity" "alert_severity" DEFAULT 'INFO' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"opportunity_id" uuid,
	"profile_document_id" uuid,
	"dedup_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"user_id" uuid,
	"actor_type" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"before" jsonb,
	"after" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_blobs" (
	"sha256" text PRIMARY KEY NOT NULL,
	"storage_key" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"mime_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"ip" text,
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"match_id" uuid,
	"field" "override_field" NOT NULL,
	"automatic_value" jsonb,
	"manual_value" jsonb NOT NULL,
	"reason" text NOT NULL,
	"user_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"profile_id" uuid,
	"channel" "notification_channel" NOT NULL,
	"frequency" "notification_frequency" DEFAULT 'IMMEDIATE' NOT NULL,
	"alert_types" text[] DEFAULT '{}' NOT NULL,
	"min_score" integer DEFAULT 75 NOT NULL,
	"target" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "opportunity_kind" NOT NULL,
	"status" "opportunity_status" DEFAULT 'UNKNOWN' NOT NULL,
	"source_status_name" text,
	"primary_source" text NOT NULL,
	"source_url" text,
	"origin_system_url" text,
	"pncp_control_number" text,
	"title" text NOT NULL,
	"object_description" text NOT NULL,
	"complementary_info" text,
	"modality_code" integer,
	"modality_name" text,
	"dispute_mode_name" text,
	"instrument_name" text,
	"process_number" text,
	"purchase_number" text,
	"purchase_year" integer,
	"purchase_sequence" integer,
	"srp" boolean,
	"legal_basis" jsonb,
	"organization_name" text,
	"organization_cnpj" text,
	"government_sphere" text,
	"government_power" text,
	"unit_code" text,
	"unit_name" text,
	"state" text,
	"city" text,
	"city_ibge" text,
	"estimated_value" numeric(18, 2),
	"awarded_value" numeric(18, 2),
	"currency" text DEFAULT 'BRL' NOT NULL,
	"publication_date" timestamp with time zone,
	"proposal_start" timestamp with time zone,
	"proposal_deadline" timestamp with time zone,
	"expected_date" date,
	"source_updated_at" timestamp with time zone,
	"exclusive_me_epp" boolean,
	"innovation_class" "innovation_class" DEFAULT 'NONE' NOT NULL,
	"innovation_evidence" text,
	"content_hash" text NOT NULL,
	"raw_payload" jsonb,
	"search_text" text DEFAULT '' NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(search_text, ''))) STORED,
	"documents_checked_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"analyzer" "analyzer_kind" NOT NULL,
	"provider" text,
	"model" text,
	"prompt_version" text,
	"schema_version" text NOT NULL,
	"input_hash" text NOT NULL,
	"source_document_ids" uuid[] DEFAULT '{}' NOT NULL,
	"output" jsonb,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"type" "change_type" NOT NULL,
	"field" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"significant" boolean DEFAULT true NOT NULL,
	"source_key" text,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"from_status" "workflow_status",
	"to_status" "workflow_status" NOT NULL,
	"reason_code" text,
	"reason_text" text,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"source_sequence" integer,
	"title" text NOT NULL,
	"doc_type_code" integer,
	"doc_type_name" text,
	"url" text NOT NULL,
	"published_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"file_sha256" text,
	"retrieved_at" timestamp with time zone,
	"extraction_status" text DEFAULT 'NOT_DOWNLOADED' NOT NULL,
	"extracted_text" text,
	"page_count" integer,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"profile_version" integer NOT NULL,
	"engine_version" text NOT NULL,
	"input_hash" text NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"status" "compatibility_status" NOT NULL,
	"score" integer NOT NULL,
	"confidence" text NOT NULL,
	"breakdown" jsonb NOT NULL,
	"service_matches" jsonb NOT NULL,
	"activity_matches" jsonb NOT NULL,
	"evidence_matches" jsonb NOT NULL,
	"attention" jsonb NOT NULL,
	"blockers" jsonb NOT NULL,
	"gaps" jsonb NOT NULL,
	"missing_information" jsonb NOT NULL,
	"risk_flags" jsonb NOT NULL,
	"explanation" text NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"profile_id" uuid,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"analysis_id" uuid NOT NULL,
	"category" "requirement_category" NOT NULL,
	"rule_id" text,
	"description" text NOT NULL,
	"supporting_text" text,
	"source_ref" text NOT NULL,
	"page" integer,
	"section" text,
	"verification" "evidence_verification" NOT NULL,
	"confidence" real,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"source_record_id" text NOT NULL,
	"source_url" text,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_updated_at" timestamp with time zone,
	"last_payload_hash" text
);
--> statement-breakpoint
CREATE TABLE "opportunity_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"status" "workflow_status" DEFAULT 'NEW' NOT NULL,
	"assigned_to" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "procurement_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" "profile_kind" NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"legal_name" text,
	"cnpj" text,
	"is_me_epp" boolean,
	"sicaf_status" text,
	"nationwide" boolean DEFAULT false NOT NULL,
	"preferred_states" text[] DEFAULT '{}' NOT NULL,
	"restrict_to_preferred_states" boolean DEFAULT false NOT NULL,
	"min_project_value" numeric(16, 2),
	"max_project_value" numeric(16, 2),
	"operational_capacity" text,
	"notes" text,
	"scoring" jsonb NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"type" "activity_type" NOT NULL,
	"code" text,
	"description" text NOT NULL,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"category" "vault_category" NOT NULL,
	"title" text NOT NULL,
	"issued_on" date,
	"expires_on" date,
	"notes" text,
	"storage_key" text,
	"original_name" text,
	"mime_type" text,
	"size_bytes" integer,
	"sha256" text,
	"archived" boolean DEFAULT false NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"snapshot_hash" text NOT NULL,
	"change_summary" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"endpoint" text NOT NULL,
	"source_record_id" text NOT NULL,
	"payload_hash" text NOT NULL,
	"payload" jsonb NOT NULL,
	"opportunity_id" uuid,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" "capability_level" DEFAULT 'CORE' NOT NULL,
	"strategic" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"collector" text NOT NULL,
	"status" "source_run_status" DEFAULT 'RUNNING' NOT NULL,
	"window_from" date,
	"window_to" date,
	"fetched" integer DEFAULT 0 NOT NULL,
	"created" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"unchanged" integer DEFAULT 0 NOT NULL,
	"failed_records" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cursors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_status" "source_run_status",
	"last_error" text,
	"last_records_collected" integer,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxonomy_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"capability_id" uuid,
	"polarity" "term_polarity" NOT NULL,
	"term" text NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"case_sensitive" boolean DEFAULT false NOT NULL,
	"effect" "negative_effect",
	"note" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technical_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"type" "evidence_type" NOT NULL,
	"title" text NOT NULL,
	"issuer" text,
	"issued_on" date,
	"description" text,
	"capabilities" text[] DEFAULT '{}' NOT NULL,
	"document_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'VIEWER' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"added_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_profile_id_procurement_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."procurement_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_profile_document_id_profile_documents_id_fk" FOREIGN KEY ("profile_document_id") REFERENCES "public"."profile_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_overrides" ADD CONSTRAINT "match_overrides_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_overrides" ADD CONSTRAINT "match_overrides_profile_id_procurement_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."procurement_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_overrides" ADD CONSTRAINT "match_overrides_match_id_opportunity_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."opportunity_matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_overrides" ADD CONSTRAINT "match_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_profile_id_procurement_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."procurement_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_analyses" ADD CONSTRAINT "opportunity_analyses_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_changes" ADD CONSTRAINT "opportunity_changes_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_decisions" ADD CONSTRAINT "opportunity_decisions_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_decisions" ADD CONSTRAINT "opportunity_decisions_profile_id_procurement_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."procurement_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_decisions" ADD CONSTRAINT "opportunity_decisions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_documents" ADD CONSTRAINT "opportunity_documents_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_documents" ADD CONSTRAINT "opportunity_documents_file_sha256_file_blobs_sha256_fk" FOREIGN KEY ("file_sha256") REFERENCES "public"."file_blobs"("sha256") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_keys" ADD CONSTRAINT "opportunity_keys_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_matches" ADD CONSTRAINT "opportunity_matches_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_matches" ADD CONSTRAINT "opportunity_matches_profile_id_procurement_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."procurement_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_notes" ADD CONSTRAINT "opportunity_notes_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_notes" ADD CONSTRAINT "opportunity_notes_profile_id_procurement_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."procurement_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_notes" ADD CONSTRAINT "opportunity_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_requirements" ADD CONSTRAINT "opportunity_requirements_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_requirements" ADD CONSTRAINT "opportunity_requirements_analysis_id_opportunity_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."opportunity_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_sources" ADD CONSTRAINT "opportunity_sources_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_workflows" ADD CONSTRAINT "opportunity_workflows_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_workflows" ADD CONSTRAINT "opportunity_workflows_profile_id_procurement_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."procurement_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_workflows" ADD CONSTRAINT "opportunity_workflows_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_profiles" ADD CONSTRAINT "procurement_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_activities" ADD CONSTRAINT "profile_activities_profile_id_procurement_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."procurement_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_documents" ADD CONSTRAINT "profile_documents_profile_id_procurement_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."procurement_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_documents" ADD CONSTRAINT "profile_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_versions" ADD CONSTRAINT "profile_versions_profile_id_procurement_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."procurement_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_versions" ADD CONSTRAINT "profile_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_records" ADD CONSTRAINT "raw_records_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_capabilities" ADD CONSTRAINT "service_capabilities_profile_id_procurement_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."procurement_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_runs" ADD CONSTRAINT "source_runs_source_key_sources_key_fk" FOREIGN KEY ("source_key") REFERENCES "public"."sources"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_terms" ADD CONSTRAINT "taxonomy_terms_profile_id_procurement_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."procurement_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_terms" ADD CONSTRAINT "taxonomy_terms_capability_id_service_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."service_capabilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_evidence" ADD CONSTRAINT "technical_evidence_profile_id_procurement_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."procurement_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_evidence" ADD CONSTRAINT "technical_evidence_document_id_profile_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."profile_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_deliveries_uq" ON "alert_deliveries" USING btree ("alert_id","user_id","channel");--> statement-breakpoint
CREATE INDEX "alert_deliveries_pending_idx" ON "alert_deliveries" USING btree ("status","channel","frequency");--> statement-breakpoint
CREATE UNIQUE INDEX "alerts_dedup_uq" ON "alerts" USING btree ("organization_id","dedup_key");--> statement-breakpoint
CREATE INDEX "alerts_org_created_idx" ON "alerts" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_org_idx" ON "audit_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "login_attempts_email_idx" ON "login_attempts" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "login_attempts_ip_idx" ON "login_attempts" USING btree ("ip","created_at");--> statement-breakpoint
CREATE INDEX "match_overrides_lookup_idx" ON "match_overrides" USING btree ("organization_id","opportunity_id","profile_id");--> statement-breakpoint
CREATE INDEX "notification_preferences_user_idx" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_pncp_uq" ON "opportunities" USING btree ("pncp_control_number");--> statement-breakpoint
CREATE INDEX "opportunities_deadline_idx" ON "opportunities" USING btree ("proposal_deadline");--> statement-breakpoint
CREATE INDEX "opportunities_publication_idx" ON "opportunities" USING btree ("publication_date");--> statement-breakpoint
CREATE INDEX "opportunities_kind_idx" ON "opportunities" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "opportunities_state_idx" ON "opportunities" USING btree ("state");--> statement-breakpoint
CREATE INDEX "opportunities_org_cnpj_idx" ON "opportunities" USING btree ("organization_cnpj");--> statement-breakpoint
CREATE INDEX "opportunities_search_idx" ON "opportunities" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_analyses_cache_uq" ON "opportunity_analyses" USING btree ("opportunity_id","analyzer","schema_version","input_hash");--> statement-breakpoint
CREATE INDEX "opportunity_changes_opp_idx" ON "opportunity_changes" USING btree ("opportunity_id","detected_at");--> statement-breakpoint
CREATE INDEX "opportunity_decisions_idx" ON "opportunity_decisions" USING btree ("organization_id","opportunity_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_documents_uq" ON "opportunity_documents" USING btree ("opportunity_id","url");--> statement-breakpoint
CREATE INDEX "opportunity_keys_opp_idx" ON "opportunity_keys" USING btree ("opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_matches_current_uq" ON "opportunity_matches" USING btree ("profile_id","opportunity_id") WHERE "opportunity_matches"."is_current";--> statement-breakpoint
CREATE INDEX "opportunity_matches_org_profile_idx" ON "opportunity_matches" USING btree ("organization_id","profile_id","is_current","score");--> statement-breakpoint
CREATE INDEX "opportunity_matches_opp_idx" ON "opportunity_matches" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "opportunity_notes_idx" ON "opportunity_notes" USING btree ("organization_id","opportunity_id");--> statement-breakpoint
CREATE INDEX "opportunity_requirements_opp_idx" ON "opportunity_requirements" USING btree ("opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_sources_uq" ON "opportunity_sources" USING btree ("source_key","source_record_id");--> statement-breakpoint
CREATE INDEX "opportunity_sources_opp_idx" ON "opportunity_sources" USING btree ("opportunity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_workflows_uq" ON "opportunity_workflows" USING btree ("organization_id","opportunity_id","profile_id");--> statement-breakpoint
CREATE INDEX "opportunity_workflows_status_idx" ON "opportunity_workflows" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_org_slug_uq" ON "procurement_profiles" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "activities_profile_idx" ON "profile_activities" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profile_documents_profile_idx" ON "profile_documents" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profile_documents_expiry_idx" ON "profile_documents" USING btree ("expires_on");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_versions_uq" ON "profile_versions" USING btree ("profile_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_records_uq" ON "raw_records" USING btree ("source_key","source_record_id","payload_hash");--> statement-breakpoint
CREATE INDEX "raw_records_opp_idx" ON "raw_records" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "capabilities_profile_idx" ON "service_capabilities" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "source_runs_source_idx" ON "source_runs" USING btree ("source_key","started_at");--> statement-breakpoint
CREATE INDEX "terms_profile_idx" ON "taxonomy_terms" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "evidence_profile_idx" ON "technical_evidence" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "watchlist_uq" ON "watchlist" USING btree ("organization_id","opportunity_id");