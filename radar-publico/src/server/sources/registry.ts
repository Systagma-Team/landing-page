import { ComprasGovAdapter } from "./comprasgov";
import { ContrataBrasilAdapter } from "./contratabrasil";
import { PncpAdapter } from "./pncp";
import type { ProcurementSourceAdapter } from "./types";

type Factory = () => ProcurementSourceAdapter;

/** Register new portals here; the ingestion pipeline is source-agnostic. */
const factories: Record<string, Factory> = {
  pncp: () => new PncpAdapter(),
  comprasgov: () => new ComprasGovAdapter(),
  contratabrasil: () => new ContrataBrasilAdapter(),
};

const instances = new Map<string, ProcurementSourceAdapter>();

export function getAdapter(key: string): ProcurementSourceAdapter {
  let adapter = instances.get(key);
  if (!adapter) {
    const factory = factories[key];
    if (!factory) throw new Error(`Fonte desconhecida: ${key}`);
    adapter = factory();
    instances.set(key, adapter);
  }
  return adapter;
}

/** Test hook: replace an adapter (e.g. with a stub that simulates outages). */
export function setAdapter(key: string, adapter: ProcurementSourceAdapter | null): void {
  if (adapter) instances.set(key, adapter);
  else instances.delete(key);
}

export function adapterKeys(): string[] {
  return Object.keys(factories);
}
