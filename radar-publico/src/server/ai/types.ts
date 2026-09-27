import { z } from "zod";

/**
 * Provider-agnostic AI contract. Business logic depends on this interface only; each provider
 * returns output validated against these schemas on the server. Every extracted item must carry a
 * verbatim quote and the reference of the source it came from — unsupported items are later marked
 * UNVERIFIED and never treated as fact.
 */

export const AI_SCHEMA_VERSION = "ai-extract-v1";
export const AI_PROMPT_VERSION = "2026-09-27";

export const REQUIREMENT_CATEGORIES = [
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
] as const;

const Quoted = {
  supporting_quote: z.string().describe("Trecho copiado literalmente do texto-fonte, sem paráfrase"),
  source_ref: z.string().describe("Referência exata da fonte, uma das fornecidas (ex.: field:objectDescription, document:<id>)"),
  page: z.number().int().describe("Página do documento quando conhecida; 0 se desconhecida"),
};

export const ExtractionSchema = z.object({
  objective: z.array(z.object({ text: z.string(), ...Quoted })).describe("Objetivo da contratação (0 ou 1 item)"),
  required_services: z.array(z.object({ name: z.string(), ...Quoted })),
  technologies: z.array(z.object({ name: z.string(), ...Quoted })),
  deliverables: z.array(z.object({ description: z.string(), ...Quoted })),
  requirements: z.array(
    z.object({
      category: z.enum(REQUIREMENT_CATEGORIES),
      description: z.string().describe("Requisito em uma frase, sem acrescentar valores que não estejam no trecho"),
      ...Quoted,
    }),
  ),
  risks: z.array(z.object({ description: z.string(), ...Quoted })),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

export interface AISource {
  ref: string;
  label: string;
  text: string;
}

export type AIResult<T> =
  | { status: "OK"; output: T; model: string; usage?: Record<string, unknown> }
  | { status: "REFUSED" | "TRUNCATED" | "INVALID_OUTPUT" | "ERROR"; error: string; model: string };

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  /** Structured requirement/scope extraction with verbatim citations. */
  extractRequirements(input: { title: string; sources: AISource[] }): Promise<AIResult<Extraction>>;
}

export class AIDisabledError extends Error {
  constructor() {
    super("Análise por IA desativada (AI_PROVIDER=disabled)");
    this.name = "AIDisabledError";
  }
}
