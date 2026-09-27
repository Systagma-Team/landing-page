# Fontes oficiais — pesquisa e checklist de verificação

> O ambiente onde o MVP foi construído **não tinha acesso de rede a `*.gov.br`** (bloqueio de egress).
> As informações abaixo foram levantadas em documentação secundária pública e precisam ser conferidas no
> Swagger oficial antes de ligar os coletores em produção. Cada item marcado **[verificar]** tem teste de
> contrato correspondente em `tests/` usando payloads de exemplo.

## 1. PNCP — Portal Nacional de Contratações Públicas

Base: `https://pncp.gov.br`

| API | Base | Documentação | Autenticação |
|---|---|---|---|
| Consultas | `/api/consulta/v1` | Swagger `/api/consulta/swagger-ui/index.html`, OpenAPI `/api/consulta/v3/api-docs` | Nenhuma |
| PNCP (manutenção + GET públicos) | `/api/pncp/v1` | Swagger `/api/pncp/swagger-ui/index.html`, OpenAPI `/api/pncp/v3/api-docs` | GET públicos sem autenticação; escrita exige credencial (não usada) |

### Endpoints usados

| Uso | Endpoint | Parâmetros |
|---|---|---|
| Contratações por data de publicação | `GET /api/consulta/v1/contratacoes/publicacao` | `dataInicial`, `dataFinal` (yyyyMMdd), `codigoModalidadeContratacao` (obrigatório), `uf`, `codigoMunicipioIbge`, `cnpj`, `codigoUnidadeAdministrativa`, `idUsuario`, `pagina`, `tamanhoPagina` |
| Contratações por data de atualização | `GET /api/consulta/v1/contratacoes/atualizacao` | mesmos parâmetros de `publicacao` |
| Contratações com proposta aberta | `GET /api/consulta/v1/contratacoes/proposta` | `dataFinal`, `codigoModalidadeContratacao`, filtros, `pagina`, `tamanhoPagina` |
| PCA por data de atualização | `GET /api/consulta/v1/pca/atualizacao` | `dataInicio`, `dataFim`, `codigoClassificacaoSuperior` (opcional, configurável), `pagina`, `tamanhoPagina` |
| Itens de um PCA | `GET /api/pncp/v1/orgaos/{cnpj}/pca/{ano}/{sequencial}/itens` | usado quando o plano vem sem itens |
| PCA por ano/classe | `GET /api/consulta/v1/pca/` | `anoPca`, `codigoClassificacaoSuperior`, `pagina`, `tamanhoPagina` |
| Arquivos da compra | `GET /api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/arquivos` | — |
| Detalhe da compra | `GET /api/consulta/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}` | — |

Página pública da compra (link para humanos): `https://pncp.gov.br/app/editais/{cnpj}/{ano}/{sequencial}`.

### Paginação e limites

- Resposta paginada: `data[]`, `totalRegistros`, `totalPaginas`, `numeroPagina`, `paginasRestantes`, `empty`.
- `tamanhoPagina`: máximo **50** em contratações (400 “Tamanho de página inválido” acima), 500 em atas e
  contratos, 100 em instrumentos de cobrança. **[verificar]**
- Janela de datas maior que 365 dias → 422.
- Coleção vazia pode vir como 404 ou 204.
- Limite de taxa: 429 (respeitar `Retry-After`); o WAF pode responder HTML com status 200 e rejeitar
  requisições sem `User-Agent` e sem `Accept: application/json`.

### Campos de contratação usados na normalização

`numeroControlePNCP`, `numeroCompra`, `anoCompra`, `sequencialCompra`, `processo`,
`modalidadeId`/`modalidadeNome`, `modoDisputaId`/`modoDisputaNome`, `situacaoCompraId`/`situacaoCompraNome`,
`tipoInstrumentoConvocatorioId`/`tipoInstrumentoConvocatorioNome`, `objetoCompra`, `informacaoComplementar`,
`srp`, `amparoLegal{codigo,nome,descricao}`, `valorTotalEstimado`, `valorTotalHomologado`,
`dataAberturaProposta`, `dataEncerramentoProposta`, `dataPublicacaoPncp`, `dataInclusao`, `dataAtualizacao`,
`dataAtualizacaoGlobal`, `orgaoEntidade{cnpj,razaoSocial,poderId,esferaId}`,
`unidadeOrgao{codigoUnidade,nomeUnidade,codigoIbge,municipioNome,ufSigla,ufNome}`, `linkSistemaOrigem`,
`usuarioNome`.

Datas vêm sem fuso horário; tratadas como horário de Brasília (UTC−3). **[verificar]**

### Tabelas de domínio

- Modalidade: 1 Leilão eletrônico · 2 Diálogo competitivo · 3 Concurso · 4 Concorrência eletrônica ·
  5 Concorrência presencial · 6 Pregão eletrônico · 7 Pregão presencial · 8 Dispensa · 9 Inexigibilidade ·
  10 Manifestação de interesse · 11 Pré-qualificação · 12 Credenciamento · 13 Leilão presencial
- Situação: 1 Divulgada · 2 Revogada · 3 Anulada · 4 Suspensa
- Instrumento convocatório: 1 Edital · 2 Aviso de contratação direta · 3 Ato que autoriza contratação direta
- Tipo de documento: 1 Aviso de contratação direta · 2 Edital · 3 Minuta de contrato · 4 Termo de referência ·
  5 Anteprojeto · 6 Projeto básico · 7 Estudo técnico preliminar · 8 Projeto executivo · 9 Mapa de riscos ·
  10 DFD · 11 Ata de registro de preço · 12 Contrato · 13 Termo de rescisão · 14 Termo aditivo ·
  15 Termo de apostilamento · 16 Outros · 17 Nota de empenho · 18 Relatório final
- Esfera: F Federal · E Estadual · M Municipal · D Distrital. Poder: E, L, J
- Categoria do item PCA: 1 Material · 2 Serviço · 3 Obras · 4 Serviços de engenharia · 5 Soluções de TIC ·
  6 Locação de imóveis · 7 Alienação/concessão/permissão · 8 Obras e serviços de engenharia

### Termos de uso

Dados públicos (Lei de Acesso à Informação, Lei 14.133/2021 art. 174). Consulta sem cadastro. Usar
identificação de cliente no `User-Agent`, respeitar limites de taxa, não contornar o WAF.

## 2. Compras.gov.br — API de Dados Abertos

Base: `https://dadosabertos.compras.gov.br` — Swagger em `/swagger-ui/index.html`, manual
`manual-api-compras.pdf` no portal gov.br/compras.

- Módulo 7 “Contratações” (Lei 14.133): `GET /modulo-contratacoes/1_consultarContratacoes_PNCP_14133`
  com `pagina`, `tamanhoPagina`, `dataPublicacaoPncpInicial`, `dataPublicacaoPncpFinal` (yyyy-MM-dd),
  `codigoModalidade`. Detalhe: `1.1_consultarContratacoes_PNCP_14133_Id`. **[verificar campos]**
- O conteúdo espelha as contratações do SIASG publicadas no PNCP. Deduplicação por `numeroControlePNCP`.
- Instabilidades relatadas pela comunidade; o adapter está **desligado por padrão**.

## 3. Contrata+Brasil

`https://contratamaisbrasil.sistema.gov.br` — marketplace de contratações de pequeno valor para MEIs
(serviços e alimentos). Nenhuma API pública de consulta foi encontrada. Não há raspagem implementada: o
adapter existe no registro, com `healthCheck` informando “sem interface estruturada verificada”. As
contratações formalizadas devem ser publicadas no PNCP (dispensa), onde são coletadas normalmente.

## 4. Adapters futuros

A interface `ProcurementSourceAdapter` (`src/server/sources/types.ts`) permite adicionar portais estaduais,
municipais, programas de inovação e empresas públicas registrando um novo adapter em
`src/server/sources/registry.ts`, sem alterar o pipeline.

## Referências consultadas

- Swagger PNCP Consultas: https://pncp.gov.br/api/consulta/swagger-ui/index.html
- Manual das APIs de Consultas PNCP v1.0: https://www.gov.br/pncp/pt-br/central-de-conteudo/manuais/versoes-anteriores/ManualPNCPAPIConsultasVerso1.0.pdf
- Manual de Integração PNCP: https://pncp.gov.br/manual/pt-br/latest/singlehtml/
- Transcrição do manual (gist): https://gist.github.com/Micael106/04a3e5515057ab11ea8797603682f0bd
- Cliente open source recente com limites observados: https://github.com/AnxietyLab/pncp-cli
- Relato do limite de 50 por página: https://github.com/ferinbon-cpu/robo-dados-publicos/issues/502
- Servidor MCP open source recente sobre as mesmas APIs (mai/2026): https://github.com/Licinexus/licinexus-mcp —
  confirma `pca/atualizacao` com `dataInicio`/`dataFim` (e `codigoClassificacaoSuperior` opcional), página de
  10 a 50 em contratações, detalhe em `/api/consulta/v1/orgaos/{cnpj}/compras/{ano}/{seq}`, itens/arquivos em
  `/api/pncp/v1/...`, itens do PCA em `/api/pncp/v1/orgaos/{cnpj}/pca/{ano}/{seq}/itens` e o formato de plano
  com `orgaoCnpj`/`sequencialPca`/`itens` (o adapter aceita também o formato do manual).
- Dados Abertos Compras.gov.br: https://dadosabertos.compras.gov.br/swagger-ui/index.html
- Contrata+Brasil: https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/contrata-brasil
