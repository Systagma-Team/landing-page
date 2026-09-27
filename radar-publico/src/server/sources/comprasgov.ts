import { z } from "zod";
import { addDays, localDateString, parseSourceDate } from "@/lib/dates";
import { onlyDigits } from "@/lib/text";
import { classifyInnovation, detectExclusiveMeEpp, kindFromModality, PNCP_MODALITIES, statusFromSituation } from "@/server/matching/classify";
import { sourceDefinition } from "./definitions";
import { createHttpClient, type HttpClient } from "./http";
import { canonicalControlNumber, parseControlNumber, pncpPublicUrl } from "./pncp";
import type { CollectContext, CollectWindow, NormalizedOpportunity, ProcurementSourceAdapter, SourceRecord } from "./types";
import { NotSupportedError } from "./types";

/*
 * Compras.gov.br — API de Dados Abertos, módulo 7 "Contratações" (Lei 14.133).
 * GET /modulo-contratacoes/1_consultarContratacoes_PNCP_14133
 *   pagina, tamanhoPagina, dataPublicacaoPncpInicial, dataPublicacaoPncpFinal (yyyy-MM-dd), codigoModalidade
 * The module mirrors federal (SIASG) purchases already published on PNCP, so records are only accepted
 * when they carry the PNCP control number — that is what lets deduplication merge them. [verificar campos]
 */

type Obj = Record<string, unknown>;

/** First non-empty value among candidate field names (the mirror's naming is not fully documented). */
function pick(o: Obj, keys: string[]): unknown {
  for (const k of keys) {
    const v = o[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}
const asStr = (v: unknown) => (v == null ? null : String(v).trim() || null);
const asNum = (v: unknown) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function normalizeComprasGovContratacao(payload: unknown): NormalizedOpportunity | null {
  const parsed = z.looseObject({}).safeParse(payload);
  if (!parsed.success) return null;
  const o = parsed.data as Obj;
  const control = asStr(pick(o, ["numeroControlePNCP", "numeroControlePncp", "numeroControlePNCPCompra"]));
  if (!control || !parseControlNumber(control)) return null;
  const pc = parseControlNumber(control)!;
  const modality = asNum(pick(o, ["codigoModalidade", "modalidadeIdPncp", "modalidadeId"]));
  const object = asStr(pick(o, ["objetoCompra", "objeto"])) ?? "";
  const info = asStr(pick(o, ["informacaoComplementar"]));
  const legalText = asStr(pick(o, ["amparoLegalNome", "amparoLegalDescricao"]));
  const innovation = classifyInnovation({ objectDescription: object, complementaryInfo: info, legalBasisText: legalText, modalityCode: modality });
  const year = asNum(pick(o, ["anoCompraPncp", "anoCompra"])) ?? pc.year;
  const seq = asNum(pick(o, ["sequencialCompraPncp", "sequencialCompra"])) ?? pc.sequence;
  const cnpj = onlyDigits(asStr(pick(o, ["orgaoEntidadeCnpj", "cnpjOrgao"]))) || pc.cnpj;
  const modalityName = asStr(pick(o, ["modalidadeNome"])) ?? (modality ? PNCP_MODALITIES[modality] ?? null : null);
  const numero = asStr(pick(o, ["numeroCompra"]));

  return {
    sourceKey: "comprasgov",
    sourceRecordId: canonicalControlNumber(control),
    sourceUrl: pncpPublicUrl(cnpj, year, seq),
    sourceUpdatedAt: parseSourceDate(pick(o, ["dataAtualizacaoPncp", "dataAtualizacao", "dataPublicacaoPncp"])),
    pncpControlNumber: canonicalControlNumber(control),
    kind: kindFromModality(modality),
    status: statusFromSituation(asNum(pick(o, ["situacaoCompraIdPncp", "situacaoCompraId"]))),
    sourceStatusName: asStr(pick(o, ["situacaoCompraNomePncp", "situacaoCompraNome"])),
    title: `${modalityName ?? "Contratação"}${numero ? ` nº ${numero}` : ""}/${year}`,
    objectDescription: object || "(objeto não informado pela fonte)",
    complementaryInfo: info,
    modalityCode: modality,
    modalityName,
    disputeModeName: asStr(pick(o, ["modoDisputaNomePncp", "modoDisputaNome"])),
    instrumentName: asStr(pick(o, ["tipoInstrumentoConvocatorioNome"])),
    processNumber: asStr(pick(o, ["processo", "numeroProcesso"])),
    purchaseNumber: numero,
    purchaseYear: year,
    purchaseSequence: seq,
    srp: typeof o.srp === "boolean" ? (o.srp as boolean) : null,
    legalBasis: legalText ? { name: legalText } : null,
    organizationName: asStr(pick(o, ["orgaoEntidadeRazaoSocial", "nomeOrgao"])),
    organizationCnpj: cnpj,
    governmentSphere: asStr(pick(o, ["orgaoEntidadeEsferaId", "esferaId"])),
    governmentPower: asStr(pick(o, ["orgaoEntidadePoderId", "poderId"])),
    unitCode: asStr(pick(o, ["unidadeOrgaoCodigoUnidade", "codigoUnidade", "uasg"])),
    unitName: asStr(pick(o, ["unidadeOrgaoNomeUnidade", "nomeUnidade"])),
    state: asStr(pick(o, ["unidadeOrgaoUfSigla", "ufSigla", "uf"]))?.toUpperCase() ?? null,
    city: asStr(pick(o, ["unidadeOrgaoMunicipioNome", "municipioNome"])),
    cityIbge: asStr(pick(o, ["unidadeOrgaoCodigoIbge", "codigoIbge"])),
    estimatedValue: asNum(pick(o, ["valorTotalEstimado"])),
    awardedValue: asNum(pick(o, ["valorTotalHomologado"])),
    publicationDate: parseSourceDate(pick(o, ["dataPublicacaoPncp"])),
    proposalStart: parseSourceDate(pick(o, ["dataAberturaPropostaPncp", "dataAberturaProposta"])),
    proposalDeadline: parseSourceDate(pick(o, ["dataEncerramentoPropostaPncp", "dataEncerramentoProposta"])),
    expectedDate: null,
    originSystemUrl: asStr(pick(o, ["linkSistemaOrigem"])),
    exclusiveMeEpp: detectExclusiveMeEpp([object, info]).value,
    innovationClass: innovation.innovationClass,
    innovationEvidence: innovation.evidence,
    raw: payload,
  };
}

export class ComprasGovAdapter implements ProcurementSourceAdapter {
  readonly key = "comprasgov";
  readonly name = "Compras.gov.br";
  readonly collectors = sourceDefinition("comprasgov")!.collectors;
  private http: HttpClient | null = null;

  constructor(private readonly deps: { fetchImpl?: typeof fetch; sleep?: (ms: number) => Promise<void>; minIntervalMs?: number } = {}) {}

  private client(ctx: CollectContext): HttpClient {
    if (!this.http) {
      const cfg = { ...sourceDefinition("comprasgov")!.defaultConfig, ...ctx.config };
      this.http = createHttpClient({
        baseUrl: String(cfg.baseUrl),
        userAgent: process.env.SOURCE_USER_AGENT ?? "RadarPublico/0.1",
        minIntervalMs: this.deps.minIntervalMs ?? 1500,
        fetchImpl: this.deps.fetchImpl,
        sleep: this.deps.sleep,
        log: ctx.log,
      });
    }
    return this.http;
  }

  async *fetchOpportunities(mode: "publicacao" | "atualizacao" | "proposta", window: CollectWindow, ctx: CollectContext): AsyncIterable<SourceRecord> {
    if (mode !== "publicacao") throw new NotSupportedError(`Modo ${mode} não suportado pelo Compras.gov.br`);
    const cfg = { ...sourceDefinition("comprasgov")!.defaultConfig, ...ctx.config } as Record<string, unknown>;
    const modalities = (cfg.modalities as number[]) ?? [];
    const pageSize = Math.min(50, Number(cfg.pageSize) || 50);
    const maxPages = Number(cfg.maxPagesPerModality) || 20;
    let day = window.from;
    const last = localDateString(window.to);
    for (let i = 0; i < 400; i++) {
      for (const modality of modalities) {
        for (let page = 1; page <= maxPages; page++) {
          const body = await this.client(ctx).getJson<Obj>("/modulo-contratacoes/1_consultarContratacoes_PNCP_14133", {
            pagina: page,
            tamanhoPagina: pageSize,
            dataPublicacaoPncpInicial: localDateString(day),
            dataPublicacaoPncpFinal: localDateString(day),
            codigoModalidade: modality,
          });
          const data = (body?.resultado ?? body?.data ?? []) as unknown[];
          if (!Array.isArray(data) || data.length === 0) break;
          for (const item of data) {
            const control = asStr(pick(item as Obj, ["numeroControlePNCP", "numeroControlePncp"]));
            yield { endpoint: "modulo-contratacoes/1", sourceRecordId: control ? canonicalControlNumber(control) : "", payload: item };
          }
          const totalPages = asNum(body?.totalPaginas) ?? 0;
          if (page >= totalPages) break;
        }
      }
      if (localDateString(day) >= last) break;
      day = addDays(day, 1);
    }
  }

  async fetchOpportunityDetails(): Promise<SourceRecord | null> {
    return null;
  }

  async fetchDocuments() {
    // Documents are retrieved from PNCP for the merged opportunity.
    return [];
  }

  async *fetchProcurementPlans(): AsyncIterable<SourceRecord> {
    throw new NotSupportedError("PCA é coletado pelo adapter PNCP");
  }

  normalize(record: SourceRecord): NormalizedOpportunity | null {
    return normalizeComprasGovContratacao(record.payload);
  }

  async healthCheck(ctx: CollectContext) {
    const started = Date.now();
    try {
      const today = localDateString(new Date());
      await this.client(ctx).getJson("/modulo-contratacoes/1_consultarContratacoes_PNCP_14133", {
        pagina: 1,
        tamanhoPagina: 10,
        dataPublicacaoPncpInicial: today,
        dataPublicacaoPncpFinal: today,
        codigoModalidade: 6,
      });
      return { status: "OK" as const, message: "API de Dados Abertos respondeu", latencyMs: Date.now() - started };
    } catch (err) {
      return { status: "DOWN" as const, message: (err as Error).message, latencyMs: Date.now() - started };
    }
  }
}
