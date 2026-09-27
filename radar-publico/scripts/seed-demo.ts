/**
 * LOCAL DEMO DATA ONLY — fictional procurements for exploring the UI without network access to
 * official sources. Every record uses source "demo" and organisations marked "(DEMONSTRAÇÃO)".
 * Refuses to run in production or without the explicit flag:
 *   npm run db:seed-demo -- --i-understand-this-is-demo-data
 */
import { eq } from "drizzle-orm";
import { closeDb, getDb, schema } from "@/db";
import { addDays, localDateString } from "@/lib/dates";
import { ingestRecord } from "@/server/ingestion/upsert";
import { processOpportunities } from "@/server/ingestion/pipeline";
import { commitProfileVersion } from "@/server/profiles/service";
import { normalizePncpContratacao, normalizePncpPcaItem } from "@/server/sources/pncp";
import type { SourceRecord } from "@/server/sources/types";

if (process.env.NODE_ENV === "production" || !process.argv.includes("--i-understand-this-is-demo-data")) {
  console.error("Recusado: dados de demonstração só em ambiente local, com --i-understand-this-is-demo-data.");
  process.exit(1);
}

const now = new Date();
const iso = (days: number, hour = 9) => `${localDateString(addDays(now, days))}T${String(hour).padStart(2, "0")}:00:00`;
let seq = 100;

function contratacao(o: {
  modalidadeId: number;
  modalidadeNome: string;
  objeto: string;
  info?: string;
  valor: number | null;
  prazoDias: number;
  orgao: string;
  unidade: string;
  cidade: string;
  uf: string;
  situacao?: number;
  amparo?: string;
}) {
  const s = ++seq;
  const cnpj = "99999999000191";
  return {
    numeroControlePNCP: `${cnpj}-1-${String(s).padStart(6, "0")}/2026`,
    numeroCompra: String(s),
    anoCompra: 2026,
    sequencialCompra: s,
    processo: `DEMO.${s}/2026`,
    modalidadeId: o.modalidadeId,
    modalidadeNome: o.modalidadeNome,
    modoDisputaNome: o.modalidadeId === 8 ? "Dispensa com disputa" : "Aberto",
    situacaoCompraId: o.situacao ?? 1,
    situacaoCompraNome: o.situacao === 3 ? "Anulada" : "Divulgada no PNCP",
    tipoInstrumentoConvocatorioNome: o.modalidadeId === 8 ? "Aviso de Contratação Direta" : "Edital",
    objetoCompra: o.objeto,
    informacaoComplementar: o.info ?? null,
    srp: false,
    amparoLegal: { codigo: 1, nome: o.amparo ?? "Lei 14.133/2021, Art. 28, I", descricao: "" },
    valorTotalEstimado: o.valor,
    dataAberturaProposta: iso(-2),
    dataEncerramentoProposta: iso(o.prazoDias, 10),
    dataPublicacaoPncp: iso(-2, 8),
    dataAtualizacao: iso(-2, 8),
    orgaoEntidade: { cnpj, razaoSocial: `${o.orgao} (DEMONSTRAÇÃO)`, poderId: "E", esferaId: "M" },
    unidadeOrgao: { codigoUnidade: String(s), nomeUnidade: o.unidade, codigoIbge: "0000000", municipioNome: o.cidade, ufSigla: o.uf },
    linkSistemaOrigem: null,
  };
}

const RECORDS = [
  contratacao({
    modalidadeId: 6,
    modalidadeNome: "Pregão - Eletrônico",
    objeto:
      "Contratação de empresa especializada para desenvolvimento, implantação e sustentação de sistema web de gestão de processos, com integração de sistemas via APIs e painel gerencial em Power BI.",
    info: "A licitante deverá apresentar atestado de capacidade técnica compatível com o objeto. Exige-se balanço patrimonial do último exercício. A visita técnica é facultativa. Prazo de execução de 12 (doze) meses.",
    valor: 850000,
    prazoDias: 11,
    orgao: "PREFEITURA MUNICIPAL DE EXEMPLO",
    unidade: "Secretaria de Administração",
    cidade: "Recife",
    uf: "PE",
  }),
  contratacao({
    modalidadeId: 6,
    modalidadeNome: "Pregão - Eletrônico",
    objeto: "Serviços de business intelligence: engenharia de dados, pipeline de dados (ETL) e dashboards em Power BI para indicadores da saúde.",
    info: "Os serviços contemplam integração de dados de sistemas legados. Exige certificação ISO 27001 da contratada.",
    valor: 420000,
    prazoDias: 5,
    orgao: "SECRETARIA ESTADUAL DE SAÚDE",
    unidade: "Diretoria de Tecnologia",
    cidade: "São Paulo",
    uf: "SP",
  }),
  contratacao({
    modalidadeId: 6,
    modalidadeNome: "Pregão - Eletrônico",
    objeto: "Aquisição de licenças de software Microsoft 365, licenças de uso por 12 meses, para servidores da autarquia.",
    valor: 310000,
    prazoDias: 9,
    orgao: "AUTARQUIA DE EXEMPLO",
    unidade: "Gerência de TI",
    cidade: "Curitiba",
    uf: "PR",
  }),
  contratacao({
    modalidadeId: 6,
    modalidadeNome: "Pregão - Eletrônico",
    objeto: "Aquisição de computadores, notebooks e impressoras com software pré-instalado.",
    valor: 780000,
    prazoDias: 14,
    orgao: "CÂMARA MUNICIPAL DE EXEMPLO",
    unidade: "Setor de Compras",
    cidade: "Natal",
    uf: "RN",
  }),
  contratacao({
    modalidadeId: 4,
    modalidadeNome: "Concorrência - Eletrônica",
    objeto:
      "Contrato Público para Solução Inovadora (CPSI) para teste de solução de inteligência artificial para triagem e extração de informação de documentos administrativos.",
    info: "Licitação especial nos termos da Lei Complementar nº 182/2021 (Marco Legal das Startups).",
    valor: 1600000,
    prazoDias: 26,
    orgao: "AGÊNCIA DE INOVAÇÃO DE EXEMPLO",
    unidade: "Diretoria de Transformação Digital",
    cidade: "Brasília",
    uf: "DF",
    amparo: "Lei Complementar nº 182/2021, art. 13",
  }),
  contratacao({
    modalidadeId: 8,
    modalidadeNome: "Dispensa",
    objeto: "Desenvolvimento de portal institucional e website responsivo para a Câmara, com hospedagem e treinamento.",
    info: "Contratação exclusiva para ME/EPP.",
    valor: 58000,
    prazoDias: 3,
    orgao: "CÂMARA MUNICIPAL DE OUTRA CIDADE",
    unidade: "Presidência",
    cidade: "Caruaru",
    uf: "PE",
  }),
  contratacao({
    modalidadeId: 8,
    modalidadeNome: "Dispensa",
    objeto: "Contratação de serviços de fotografia para cobertura fotográfica dos eventos culturais do município.",
    valor: 9000,
    prazoDias: 7,
    orgao: "SECRETARIA MUNICIPAL DE CULTURA",
    unidade: "Eventos",
    cidade: "Olinda",
    uf: "PE",
  }),
  contratacao({
    modalidadeId: 6,
    modalidadeNome: "Pregão - Eletrônico",
    objeto: "Automação de processos administrativos com RPA e automação de relatórios gerenciais, incluindo assistente virtual para atendimento interno.",
    info: "É vedada a participação de empresas reunidas em consórcio.",
    valor: null,
    prazoDias: 40,
    orgao: "TRIBUNAL DE EXEMPLO",
    unidade: "Secretaria de Gestão",
    cidade: "Belo Horizonte",
    uf: "MG",
  }),
  contratacao({
    modalidadeId: 6,
    modalidadeNome: "Pregão - Eletrônico",
    objeto: "Contratação de fábrica de software para manutenção evolutiva de sistemas legados.",
    valor: 2400000,
    prazoDias: 18,
    orgao: "COMPANHIA DE EXEMPLO",
    unidade: "Tecnologia",
    cidade: "Porto Alegre",
    uf: "RS",
    situacao: 3,
  }),
];

const PCA = {
  plan: { orgaoEntidadeCnpj: "99999999000191", orgaoEntidadeRazaoSocial: "GOVERNO DO ESTADO DE EXEMPLO (DEMONSTRAÇÃO)", codigoUnidade: "77", nomeUnidade: "Secretaria de Planejamento", anoPca: 2027, idPcaPncp: "demo-pca-2027" },
  item: {
    numeroItem: 12,
    categoriaItemPcaNome: "Soluções de TIC",
    descricaoItem: "Contratação de serviços de business intelligence e integração de dados para painel gerencial de indicadores do estado.",
    valorTotal: 900000,
    dataDesejada: "2027-05-01",
  },
};

async function main() {
  const db = getDb();
  const [org] = await db.select().from(schema.organizations);
  if (!org) throw new Error("Rode npm run db:seed antes.");

  // Demo MEI configuration (EXEMPLO) so the MEI module can be explored; replace with real CCMEI data.
  const [mei] = await db.select().from(schema.procurementProfiles).where(eq(schema.procurementProfiles.slug, "mei"));
  const acts = await db.select().from(schema.profileActivities).where(eq(schema.profileActivities.profileId, mei.id));
  if (acts.length === 0) {
    await db.insert(schema.profileActivities).values({
      organizationId: org.id,
      profileId: mei.id,
      type: "MEI_OCCUPATION",
      code: "7420-0/01",
      description: "EXEMPLO (substituir pelos dados reais): Fotógrafo(a) independente",
      keywords: ["fotografia", "cobertura fotográfica", "registro fotográfico"],
    });
    await db.update(schema.procurementProfiles).set({ preferredStates: ["PE"], restrictToPreferredStates: true, maxProjectValue: "13000.00" }).where(eq(schema.procurementProfiles.id, mei.id));
    await commitProfileVersion(db, mei.id, null, "Configuração de EXEMPLO para demonstração");
  }

  const ids: string[] = [];
  for (const payload of RECORDS) {
    const n = normalizePncpContratacao(payload, "demo", "demo")!;
    n.sourceUrl = null;
    const record: SourceRecord = { endpoint: "demo", sourceRecordId: n.sourceRecordId, payload };
    const r = await ingestRecord(db, record, n);
    ids.push(r.opportunityId);
  }
  const pca = normalizePncpPcaItem(PCA, "demo")!;
  pca.sourceUrl = null;
  const r = await ingestRecord(db, { endpoint: "demo-pca", sourceRecordId: pca.sourceRecordId, payload: PCA }, pca);
  ids.push(r.opportunityId);

  const processed = await processOpportunities(db, ids, []);
  console.log(`Demonstração: ${ids.length} registros fictícios processados`, processed);

  // A later deadline extension on the first record, to show change history and alerts.
  const [user] = await db.select().from(schema.users).where(eq(schema.users.organizationId, org.id));
  if (user) {
    await db.insert(schema.watchlist).values({ organizationId: org.id, opportunityId: ids[0], addedBy: user.id }).onConflictDoNothing();
    const updated = { ...RECORDS[0], dataEncerramentoProposta: iso(16, 10), dataAtualizacaoGlobal: iso(0, 7) };
    const n = normalizePncpContratacao(updated, "demo", "demo")!;
    n.sourceUrl = null;
    const res = await ingestRecord(db, { endpoint: "demo", sourceRecordId: n.sourceRecordId, payload: updated }, n);
    await processOpportunities(db, [res.opportunityId], [{ opportunityId: res.opportunityId, changes: res.changes }]);
    console.log(`Prazo prorrogado na oportunidade de demonstração: ${res.changes.map((c) => c.type).join(", ")}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
