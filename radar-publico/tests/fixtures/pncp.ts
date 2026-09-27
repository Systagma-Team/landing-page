/** Payloads shaped like the PNCP API de Consultas (manual v1 field names). */
export function contratacao(overrides: Record<string, unknown> = {}) {
  return {
    numeroControlePNCP: "12345678000190-1-000045/2026",
    numeroCompra: "45",
    anoCompra: 2026,
    sequencialCompra: 45,
    processo: "23000.001234/2026-11",
    modalidadeId: 6,
    modalidadeNome: "Pregão - Eletrônico",
    modoDisputaNome: "Aberto",
    situacaoCompraId: 1,
    situacaoCompraNome: "Divulgada no PNCP",
    tipoInstrumentoConvocatorioNome: "Edital",
    objetoCompra:
      "Contratação de empresa especializada para desenvolvimento de sistemas web, integração de sistemas via APIs e sustentação de sistemas, com painel gerencial em Power BI.",
    informacaoComplementar: "A licitante deverá apresentar atestado de capacidade técnica compatível com o objeto.",
    srp: false,
    amparoLegal: { codigo: 1, nome: "Lei 14.133/2021, Art. 28, I", descricao: "pregão" },
    valorTotalEstimado: 850000,
    valorTotalHomologado: null,
    dataAberturaProposta: "2026-10-01T08:00:00",
    dataEncerramentoProposta: "2026-10-20T09:00:00",
    dataPublicacaoPncp: "2026-09-25T10:00:00",
    dataInclusao: "2026-09-25T10:00:00",
    dataAtualizacao: "2026-09-25T10:00:00",
    orgaoEntidade: { cnpj: "12345678000190", razaoSocial: "PREFEITURA MUNICIPAL DE EXEMPLO", poderId: "E", esferaId: "M" },
    unidadeOrgao: { codigoUnidade: "1", nomeUnidade: "Secretaria de Administração", codigoIbge: "2611606", municipioNome: "Recife", ufSigla: "PE" },
    linkSistemaOrigem: "https://compras.exemplo.gov.br/pregao/45",
    ...overrides,
  };
}

export const licensing = contratacao({
  numeroControlePNCP: "12345678000190-1-000046/2026",
  numeroCompra: "46",
  sequencialCompra: 46,
  processo: "23000.001235/2026-11",
  objetoCompra: "Aquisição de licenças de software Microsoft 365, licenças de uso por 12 meses.",
  informacaoComplementar: null,
});

export const photography = contratacao({
  numeroControlePNCP: "98765432000110-1-000007/2026",
  numeroCompra: "7",
  sequencialCompra: 7,
  processo: "777/2026",
  modalidadeId: 8,
  modalidadeNome: "Dispensa",
  objetoCompra: "Contratação de serviços de fotografia para cobertura fotográfica dos eventos culturais do município.",
  informacaoComplementar: null,
  valorTotalEstimado: 9000,
  orgaoEntidade: { cnpj: "98765432000110", razaoSocial: "PREFEITURA DE OLINDA", poderId: "E", esferaId: "M" },
  unidadeOrgao: { codigoUnidade: "2", nomeUnidade: "Secretaria de Cultura", codigoIbge: "2609600", municipioNome: "Olinda", ufSigla: "PE" },
});

export function page(data: unknown[], totalPaginas = 1, numeroPagina = 1) {
  return { data, totalRegistros: data.length, totalPaginas, numeroPagina, paginasRestantes: Math.max(0, totalPaginas - numeroPagina), empty: data.length === 0 };
}

/** Minimal fetch double routing PNCP URLs to handlers. */
export function fakeFetch(handler: (url: URL) => { status?: number; json?: unknown; text?: string; contentType?: string }) {
  const calls: string[] = [];
  const impl = (async (input: string | URL | Request) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
    calls.push(url.toString());
    const r = handler(url);
    const body = r.json !== undefined ? JSON.stringify(r.json) : r.text ?? "";
    return new Response(r.status === 204 ? null : body, {
      status: r.status ?? 200,
      headers: { "content-type": r.contentType ?? (r.json !== undefined ? "application/json" : "text/html") },
    });
  }) as typeof fetch;
  return { impl, calls };
}
