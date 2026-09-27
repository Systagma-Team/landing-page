import { describe, expect, it } from "vitest";
import { canonicalControlNumber, normalizePncpContratacao, normalizePncpPcaItem, parseControlNumber, PncpAdapter } from "@/server/sources/pncp";
import { normalizeComprasGovContratacao } from "@/server/sources/comprasgov";
import { computeDedupKeys, normalizePurchaseNumber } from "@/server/ingestion/dedup";
import { computeWindow } from "@/server/ingestion/collect";
import { contratacao, fakeFetch, page } from "./fixtures/pncp";

describe("PNCP normalization contract", () => {
  it("normalizes a contratação with Brasília-time dates and a public link", () => {
    const n = normalizePncpContratacao(contratacao())!;
    expect(n.pncpControlNumber).toBe("12345678000190-1-000045/2026");
    expect(n.kind).toBe("ACTIVE_TENDER");
    expect(n.status).toBe("PUBLISHED");
    expect(n.title).toBe("Pregão - Eletrônico nº 45/2026");
    expect(n.proposalDeadline?.toISOString()).toBe("2026-10-20T12:00:00.000Z");
    expect(n.sourceUrl).toBe("https://pncp.gov.br/app/editais/12345678000190/2026/45");
    expect(n.state).toBe("PE");
    expect(n.organizationName).toBe("PREFEITURA MUNICIPAL DE EXEMPLO");
  });

  it("tolerates missing/renamed fields without inventing values", () => {
    const n = normalizePncpContratacao({
      numeroControlePNCP: "12345678000190-1-45/2026",
      modalidadeId: 8,
      situacaoCompraId: 2,
      objetoCompra: "Serviço",
      orgaoEntidade: { cnpj: "12345678000190", razaosocial: "ÓRGÃO" },
      valorTotalEstimado: "",
    })!;
    expect(n.pncpControlNumber).toBe("12345678000190-1-000045/2026");
    expect(n.kind).toBe("DIRECT_PROCUREMENT");
    expect(n.status).toBe("CANCELLED");
    expect(n.estimatedValue).toBeNull();
    expect(n.proposalDeadline).toBeNull();
    expect(n.exclusiveMeEpp).toBeNull();
    expect(n.organizationName).toBe("ÓRGÃO");
    expect(normalizePncpContratacao({ objetoCompra: "sem identificação" })).toBeNull();
  });

  it("parses control numbers", () => {
    expect(parseControlNumber("07424905000138-1-000212/2026")).toEqual({ cnpj: "07424905000138", sequence: 212, year: 2026 });
    expect(canonicalControlNumber("07424905000138-1-212/2026")).toBe("07424905000138-1-000212/2026");
  });

  it("normalizes PCA items from both documented shapes", () => {
    const item = { numeroItem: 3, categoriaItemPcaNome: "Soluções de TIC", descricaoItem: "Serviços de BI", valorTotal: 1000, dataDesejada: "2027-03-10" };
    const a = normalizePncpPcaItem({ plan: { orgaoEntidadeCnpj: "12345678000190", anoPca: 2027, codigoUnidade: "1", idPcaPncp: "X" }, item })!;
    const b = normalizePncpPcaItem({ plan: { orgaoCnpj: "12345678000190", anoPca: 2027, sequencialPca: 4 }, item: { ...item, codigoUnidade: "1" } })!;
    for (const n of [a, b]) {
      expect(n.kind).toBe("FUTURE_PROCUREMENT");
      expect(n.expectedDate).toBe("2027-03-10");
      expect(n.proposalDeadline).toBeNull();
      expect(n.extraKeys).toEqual(["pca:12345678000190:2027:1:3"]);
    }
  });

  it("paginates day by day and modality by modality with page size ≤ 50", async () => {
    const f = fakeFetch((url) => {
      expect(Number(url.searchParams.get("tamanhoPagina"))).toBeLessThanOrEqual(50);
      const p = Number(url.searchParams.get("pagina"));
      return { json: page([contratacao({ numeroControlePNCP: `12345678000190-1-00000${p}/2026` })], 2, p) };
    });
    const adapter = new PncpAdapter({ fetchImpl: f.impl, sleep: async () => undefined, minIntervalMs: 0 });
    const records = [];
    for await (const r of adapter.fetchOpportunities("publicacao", { from: new Date("2026-09-26T12:00:00-03:00"), to: new Date("2026-09-27T12:00:00-03:00") }, { config: { modalities: [6] }, log: () => undefined })) records.push(r);
    expect(records).toHaveLength(4); // 2 days × 2 pages
    expect(f.calls.every((c) => c.includes("codigoModalidadeContratacao=6"))).toBe(true);
    expect(f.calls[0]).toContain("dataInicial=20260926");
  });
});

describe("Compras.gov.br mirror", () => {
  it("accepts only records carrying the PNCP control number and maps them to the same key", () => {
    const n = normalizeComprasGovContratacao({ numeroControlePNCP: "12345678000190-1-000045/2026", codigoModalidade: 6, objetoCompra: "Sistemas", orgaoEntidadeCnpj: "12345678000190" })!;
    const p = normalizePncpContratacao(contratacao())!;
    expect(computeDedupKeys(n)[0]).toBe(computeDedupKeys(p)[0]);
    expect(normalizeComprasGovContratacao({ objetoCompra: "sem controle" })).toBeNull();
  });
});

describe("dedup keys and windows", () => {
  it("builds keys from official identifiers, never titles", () => {
    const keys = computeDedupKeys(normalizePncpContratacao(contratacao())!);
    expect(keys).toEqual(["pncp:12345678000190-1-000045/2026", "cmp:12345678000190:1:6:2026:45", "proc:12345678000190:6:2026:23000001234202611"]);
    expect(normalizePurchaseNumber("00045/2026")).toBe("45");
  });

  it("windows overlap the previous cursor and catch up in bounded steps", () => {
    const now = new Date("2026-09-27T12:00:00-03:00");
    const w = computeWindow("publicacao", "2026-09-25", { overlapDays: 1 }, now);
    expect(w.from.toISOString().slice(0, 10)).toBe("2026-09-24");
    const late = computeWindow("publicacao", "2026-01-01", { overlapDays: 1 }, now);
    expect((late.to.getTime() - late.from.getTime()) / 86_400_000).toBe(30);
    const first = computeWindow("publicacao", undefined, { initialLookbackDays: 3 }, now);
    expect((now.getTime() - first.from.getTime()) / 86_400_000).toBe(3);
  });
});
