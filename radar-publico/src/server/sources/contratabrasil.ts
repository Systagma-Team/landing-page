import type { HealthResult, NormalizedOpportunity, ProcurementSourceAdapter, SourceRecord } from "./types";
import { NotSupportedError } from "./types";

/**
 * Contrata+Brasil (https://contratamaisbrasil.sistema.gov.br) — small-value purchases for MEIs.
 * No public structured query API was found, and scraping is not implemented: the portal's terms and
 * technical stability have not been verified, and access controls must never be bypassed.
 * Purchases formalised there are expected to be published on PNCP (dispensa), where they are collected.
 */
export class ContrataBrasilAdapter implements ProcurementSourceAdapter {
  readonly key = "contratabrasil";
  readonly name = "Contrata+Brasil";
  readonly collectors = [];

  async *fetchOpportunities(): AsyncIterable<SourceRecord> {
    throw new NotSupportedError("Contrata+Brasil: nenhuma interface estruturada pública verificada");
  }

  async fetchOpportunityDetails(): Promise<SourceRecord | null> {
    return null;
  }

  async fetchDocuments() {
    return [];
  }

  async *fetchProcurementPlans(): AsyncIterable<SourceRecord> {
    throw new NotSupportedError("Contrata+Brasil não publica planos de contratação");
  }

  normalize(): NormalizedOpportunity | null {
    return null;
  }

  async healthCheck(): Promise<HealthResult> {
    return {
      status: "NOT_CONFIGURED",
      message: "Sem API pública de consulta verificada. Oportunidades publicadas no PNCP são coletadas pelo adapter PNCP.",
    };
  }
}
