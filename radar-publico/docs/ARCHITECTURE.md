# Radar Público — Arquitetura e Plano (A–M)

> Plataforma interna de inteligência de oportunidades em compras públicas.
> **Descobrir → coletar → normalizar → classificar → analisar → pontuar → alertar → apoiar a decisão humana.**
> A plataforma **nunca** envia lances, propostas, documentos, declarações, preços, credenciais ou assinaturas.
> Toda decisão de participação e toda submissão oficial é **humana**.

Status deste documento: plano do MVP, escrito antes da implementação e atualizado para refletir o que foi construído.
Os itens marcados como **[verificar]** dependem de validação na documentação oficial ao vivo (ver `docs/SOURCES.md`).

---

## A. Arquitetura do produto

```
                ┌──────────────────────── fontes oficiais ────────────────────────┐
                │ PNCP (API Consulta + API PNCP pública)   Compras.gov.br (Dados   │
                │ Contrata+Brasil (sem API pública verificada)  Abertos, módulo 7) │
                └───────────────┬──────────────────────────────────────────────────┘
                                │  adapters (ProcurementSourceAdapter)
                                ▼
   worker (pg-boss) ── coleta ── raw_records ── normalização ── deduplicação (opportunity_keys)
        │                                                     │
        │                                   detecção de mudanças (opportunity_changes)
        │                                                     ▼
        │                         catálogo público global: opportunities / documents / requirements
        │                                                     │
        │               ┌─────────────── por organização (tenant) ─────────────────┐
        │               │  matching MEI  ─┐                                         │
        └── jobs ──────►│                 ├─► opportunity_matches (score + motivo)  │
                        │  matching SYSTAGMA┘   overrides · decisões · notas · alertas│
                        └───────────────────────────────┬──────────────────────────┘
                                                        ▼
                               app Next.js (pt-BR): painel, oportunidades, detalhe,
                               radar futuro (PCA), inovação, cofre, perfis, configurações
                                                        ▼
                                          DECISÃO HUMANA → participação manual externa
```

Princípios:

1. **Dados públicos são globais; julgamento é por tenant.** Oportunidades, documentos e requisitos extraídos
   pertencem a um catálogo público compartilhado. Perfis, matches, decisões, notas, favoritos, alertas e
   auditoria carregam `organization_id` — pronto para multi-tenant sem retrabalho.
2. **Regras determinísticas primeiro, IA depois.** Termos, regras de exclusão, lacunas documentais e
   bloqueios são determinísticos e rastreáveis. IA (V2) só extrai requisitos **com citação verificada** no texto-fonte.
3. **Análise automática ≠ decisão humana.** O modelo de dados separa `opportunity_matches` (automático,
   imutável) de `match_overrides` e `opportunity_workflows`/`opportunity_decisions` (humano).
4. **Nunca “elegível”.** Os status são de compatibilidade (ver seção H). Não existe status `ELIGIBLE`.
5. **Idempotência em toda a ingestão.** Rodar o mesmo coletor duas vezes não gera duplicatas.

## B. Componentes do sistema

| Componente | Tecnologia | Responsabilidade |
|---|---|---|
| App web | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 | UI pt-BR, Server Actions com autorização no servidor |
| Banco | PostgreSQL 16 + Drizzle ORM | Modelo normalizado, busca full-text (`portuguese`) |
| Filas/agendamento | pg-boss (no próprio Postgres) | Cron, retry com backoff, singleton, dead-letter — sem Redis no MVP |
| Worker | Node + tsx (`npm run worker`) | Coletores, matching, alertas, prazos — independe de aba aberta |
| Adapters de fonte | `src/server/sources/*` | Interface `ProcurementSourceAdapter`, HTTP resiliente, rate limit |
| Motor de matching | `src/server/matching/*` (funções puras) | Termos, exclusões, CNAE, lacunas, score, explicação |
| Extração de requisitos | regras determinísticas + interface de IA | Citação obrigatória, validação de evidência |
| Armazenamento de arquivos | Disco privado (`STORAGE_DIR`) atrás de interface | Trocável por S3 compatível sem alterar regras |
| Notificações | in-app, e-mail (SMTP), webhook/Slack | Imediato, resumo diário, resumo semanal |
| Auditoria | `audit_logs` append-only | Decisões, perfis, overrides, uploads, análises |

## C. Plano de pesquisa das fontes oficiais

Detalhes e evidências em [`docs/SOURCES.md`](./SOURCES.md). Resumo:

| Fonte | Interface | Autenticação | Situação no MVP |
|---|---|---|---|
| **PNCP — API de Consultas** (`/api/consulta/v1`) | REST/JSON pública, OpenAPI em `/api/consulta/v3/api-docs` | Nenhuma para consulta | **Implementado**: `contratacoes/publicacao`, `contratacoes/atualizacao`, `contratacoes/proposta`, `pca/atualizacao` |
| **PNCP — API PNCP** (`/api/pncp/v1`) | REST/JSON pública (GET) | Nenhuma para GET | **Implementado**: arquivos da compra (`/orgaos/{cnpj}/compras/{ano}/{seq}/arquivos`) |
| **Compras.gov.br — Dados Abertos** (módulo 7 “Contratações”) | REST/JSON pública | Nenhuma | **Implementado, desligado por padrão** (espelho do PNCP para o SIASG; dedup por `numeroControlePNCP`) |
| **Contrata+Brasil** | Nenhuma API pública encontrada | — | **Adapter registrado, desabilitado**; contratações devem aparecer no PNCP. Não raspar sem verificar termos |

Checklist obrigatório por conector (executado antes de ligar em produção): endpoint atual, autenticação,
limites de taxa, paginação, campos, termos de uso. Nunca contornar CAPTCHA, autenticação ou proteção anti-bot.

Fatos verificados em fontes secundárias (a API oficial está bloqueada no ambiente de desenvolvimento) **[verificar]**:
- datas `yyyyMMdd`; janela máxima de 365 dias (HTTP 422 acima disso);
- `tamanhoPagina` máximo **50** em contratações (HTTP 400 “Tamanho de página inválido” acima), 500 em atas/contratos;
- 404 em coleções vazias; 429 com `Retry-After`; WAF pode devolver HTML com status 200;
- `codigoModalidadeContratacao` é obrigatório em `publicacao`/`atualizacao`.

## D. Modelo ER

Simplificações em relação à lista inicial de entidades:
- `SearchTerm` + `NegativeTerm` → **`taxonomy_terms`** (com `polarity`).
- `DocumentExpiration` → coluna `expires_on` em **`profile_documents`**.
- `OpportunityScore` → embutido em **`opportunity_matches`** (`score`, `score_breakdown`).
- `OpportunitySource` → **`opportunity_sources`** + **`opportunity_keys`** (chaves de deduplicação).
- Versionamento de perfil → **`profile_versions`** (snapshot JSON imutável, referenciado por cada match).

```
organizations 1─* users 1─* sessions
organizations 1─* procurement_profiles (kind MEI|COMPANY, slug mei|systagma)
procurement_profiles 1─* profile_activities (CNAE / ocupação MEI / atividade + palavras-chave)
procurement_profiles 1─* service_capabilities 1─* taxonomy_terms (POSITIVE)
procurement_profiles 1─* taxonomy_terms (NEGATIVE, capability nula)
procurement_profiles 1─* technical_evidence *─1 profile_documents (cofre)
procurement_profiles 1─* profile_versions (snapshot)

sources 1─* source_runs
opportunities 1─* opportunity_keys        (pncp:<controle>, cmp:<cnpj>:<mod>:<ano>:<num>, proc:...)
opportunities 1─* opportunity_sources     (source, source_id, source_url, collected_at, last_updated_at)
opportunities 1─* raw_records             (payload bruto + hash)
opportunities 1─* opportunity_changes     (prazo, valor, situação, objeto, documento novo)
opportunities 1─* opportunity_documents *─1 file_blobs (sha256)
opportunities 1─* opportunity_analyses 1─* opportunity_requirements (citação + referência)

[tenant] opportunity_matches   (org, opp, profile, profile_version, status, score, breakdown, explicação)
[tenant] match_overrides       (valor automático, valor manual, quem, quando, motivo)
[tenant] opportunity_workflows (org, opp, profile, status do fluxo humano)
[tenant] opportunity_decisions (histórico de transições + motivo)
[tenant] opportunity_notes, watchlist
[tenant] alerts 1─* alert_deliveries ; notification_preferences
[tenant] audit_logs
```

## E. Pipeline de ingestão

```
SOURCE → FETCH (HTTP resiliente, rate limit, retry) → RAW STORAGE (hash; idempotente)
→ NORMALIZAÇÃO (schema tolerante, zod) → DEDUPLICAÇÃO (chaves múltiplas) → DETECÇÃO DE MUDANÇAS
→ DESCOBERTA DE DOCUMENTOS (relevantes/favoritas) → [V2: download, hash, extração de texto]
→ CLASSIFICAÇÃO (tipo, inovação, requisitos por regras) → MATCHING (por perfil) → SCORE → ALERTAS
```

- **Janelas**: cada coletor guarda o fim da última janela bem-sucedida; a próxima execução reprocessa com
  sobreposição (padrão 2 dias) — reprocessar é seguro por causa da idempotência.
- **Deduplicação**: um registro gera todas as chaves possíveis. Se qualquer chave já pertence a uma
  oportunidade, os dados são mesclados; senão, cria-se uma nova. Nunca por título.
- **Isolamento de falhas**: cada fonte roda como job próprio, com `source_runs` e contador de falhas
  consecutivas. PNCP fora do ar não bloqueia Compras.gov.br.
- **Custo de IA**: somente oportunidades com score ≥ limiar ou favoritas vão para análise pesada; análises
  são cacheadas por hash de entrada.

## F. Modelo de matching — MEI

- Fonte da verdade: **atividades reais** (CNAEs, ocupações MEI) + capacidades configuradas pelo usuário.
  Nada é pré-configurado; sem atividades cadastradas o resultado é `INSUFFICIENT_INFORMATION` com o aviso
  **PERFIL INCOMPLETO**.
- A taxonomia de busca do MEI é **derivada** das palavras-chave de cada atividade/capacidade cadastrada.
- Regra de portão: sem correspondência de atividade/ocupação → **POSSÍVEL INCOMPATIBILIDADE DE CNAE /
  ATIVIDADE**, score limitado e status `LIKELY_INCOMPATIBLE` (ou `REQUIRES_REVIEW` se houver sinais de
  serviço). “Tecnologia” genérica nunca basta.
- Limite financeiro configurável (valor máximo por contratação); acima dele → alerta de viabilidade.
- CNAE citado no texto e ausente no perfil → lacuna determinística.

## G. Modelo de matching — SYSTAGMA

- Capacidades configuráveis (seed: Software, Dados/BI, Automação, Integração, IA aplicada, Web, Consultoria,
  Manutenção) com termos de descoberta (seção 18 do briefing) — **sinais**, não filtros exatos.
- Termos negativos configuráveis (licenças, revenda, hardware, impressoras, computadores, cabeamento...).
  Quando o sinal negativo domina e não há indicadores de serviço, o resultado é `LIKELY_INCOMPATIBLE`.
- Nível por capacidade (`CORE`, `SECONDARY`, `EXPLORATORY`) alimenta a dimensão de capacidade técnica.
- Evidências técnicas (atestados, cases) cruzadas com as capacidades encontradas → **POSSÍVEL EVIDÊNCIA DE
  APOIO ENCONTRADA** (nunca “atende ao edital”).
- Sem CNPJ/CNAEs cadastrados, a dimensão de atividade é “desconhecida” e a confiança é reduzida.

## H. Modelo de score

Score 0–100 de **priorização de negócio/técnica** — não é score de elegibilidade legal.

| Dimensão | Peso padrão | Cálculo (0–1) |
|---|---|---|
| Compatibilidade de serviço | 25 | força ponderada dos termos das capacidades (título/objeto > complemento) |
| Atividade / CNAE | 20 | correspondência com atividades; desconhecido = 0,5 com aviso |
| Capacidade técnica | 15 | nível das capacidades encontradas (core/secundária/exploratória) e amplitude |
| Evidência técnica | 10 | evidências cujas capacidades cobrem as encontradas |
| Viabilidade econômica | 10 | valor estimado vs faixa configurada; desconhecido = 0,5 |
| Prazo para proposta | 5 | ≥15 dias = 1 … <3 dias = 0,1; encerrado = 0 |
| Geografia | 5 | UF preferida/atuação nacional |
| Prontidão documental | 5 | documentos essenciais válidos no cofre |
| Estratégico / inovação | 5 | CPSI/ETEC/diálogo competitivo, capacidades estratégicas |

Pesos e limiares são **independentes por perfil** e versionados. Status:

| Status | Regra padrão |
|---|---|
| `HIGH_COMPATIBILITY` | score ≥ 75, sem bloqueios potenciais |
| `MEDIUM_COMPATIBILITY` | 55–74, sem bloqueios |
| `LOW_COMPATIBILITY` | 35–54 |
| `REQUIRES_REVIEW` | score ≥ 55 com bloqueio/lacuna potencial, ou sinais conflitantes |
| `LIKELY_INCOMPATIBLE` | < 35, exclusão por termo negativo, ou incompatibilidade de atividade (MEI) |
| `INSUFFICIENT_INFORMATION` | perfil incompleto (MEI sem atividades) ou objeto sem informação suficiente |

Toda pontuação é exibida com **motivos**: correspondências fortes (✓), atenção (!), bloqueios potenciais (✕),
lacunas, informações ausentes e “Revisão humana necessária”.

## I. Arquitetura de informação (UI)

```
Painel
Oportunidades ─ Todas · MEI · Systagma · Alta compatibilidade · Revisar · Favoritas · Descartadas
Radar futuro ─ PCA (planos de contratação)
Inovação ─ CPSI / ETEC / Diálogo competitivo · Outras menções
Alertas
Cofre ─ Documentos · Evidências técnicas (por perfil)
Perfis ─ MEI · Systagma (atividades, capacidades, termos, pesos, versões)
Configurações ─ Fontes (saúde) · Usuários · Notificações · Auditoria
```

O detalhe da oportunidade separa visualmente **Análise automática** (painel neutro, rotulado) de
**Decisão humana** (painel de ação), com histórico de decisões, mudanças, notas e overrides.

## J. Modelo de segurança

- Sessões em banco: token aleatório de 256 bits no cookie (`HttpOnly`, `Secure` em produção,
  `SameSite=Lax`), apenas o SHA-256 no banco; expiração deslizante; logout invalida no servidor.
- Senhas com `scrypt` (Node crypto), comparação em tempo constante; bloqueio por tentativas (e-mail e IP).
- RBAC `ADMIN` / `ANALYST` / `VIEWER` verificado **no servidor** em toda Server Action e Route Handler
  (camada DAL); `proxy.ts` faz apenas redirecionamento otimista.
- Todas as consultas de dados de tenant filtram por `organization_id`.
- Uploads: lista de extensões, verificação de assinatura (magic bytes), limite de tamanho, nome aleatório,
  armazenamento privado fora de `public/`, download somente autenticado com `Content-Disposition: attachment`
  e `nosniff`. Arquivos nunca são executados.
- Downloads de documentos oficiais apenas de hosts permitidos (proteção contra SSRF).
- Cabeçalhos de segurança (CSP, `frame-ancestors 'none'`, `Referrer-Policy`), segredos via variáveis de ambiente.
- Auditoria append-only de decisões, perfis, pesos, uploads, overrides e análises.

## K. Plano MVP / V2 / V3

**MVP (este entregável — implementado; ver README)**: autenticação + RBAC; perfis MEI e Systagma versionados; conectores PNCP
(publicação, atualização, propostas abertas, PCA, arquivos) e Compras.gov.br (desligado), Contrata+Brasil
(registrado, desabilitado); coleta agendada, normalização, deduplicação, detecção de mudanças; taxonomia
configurável (positiva/negativa); matching separado; score explicável; painel; lista com filtros e busca
full-text; detalhe; favoritos; interesse/descarte com motivo; overrides preservando o automático; notas;
alertas in-app/e-mail/webhook com frequência; cofre de documentos com validade; evidências técnicas;
extração de requisitos por regras com citação; radar PCA e radar de inovação básicos; saúde das fontes;
auditoria.

**V2**: download e hash dos editais; extração PDF/DOCX/XLSX (OCR só sem camada de texto); extração de
requisitos por IA com validação de citação (**já implementada e desligada por padrão** — hoje opera sobre
objeto e informações complementares; passa a cobrir os anexos quando a extração de documentos existir); lacunas de qualificação a partir dos documentos; matching de
capacidade técnica mais rico; itens da compra; notificações mais ricas (Slack nativo, WhatsApp).

**V3**: workspace de proposta (checklists, rascunho — sempre “RASCUNHO — REVISÃO HUMANA”), tarefas,
apoio a precificação com confirmação humana explícita, analytics de sucesso, personalização de ranking com
base nas decisões, colaboração, rastreamento de submissão externa, versão SaaS.

## L. Riscos e informações desconhecidas

1. **API oficial não verificada ao vivo** neste ambiente (egress bloqueado para `*.gov.br`). Endpoints e
   campos foram confirmados por documentação secundária (manual v1, clientes open source recentes). O
   adapter é tolerante a campos ausentes e guarda o payload bruto — revisar contra o Swagger antes de produção.
2. **Datas sem fuso** no PNCP: tratadas como horário de Brasília (UTC−3). **[verificar]**
3. **Volume**: todas as modalidades × janela diária podem gerar milhares de registros/dia; o coletor pagina com
   limite de páginas por execução e a janela avança só em caso de sucesso.
4. **WAF/limites de taxa** do PNCP: rate limit conservador (1 req/s), backoff, `Retry-After`.
5. **Contrata+Brasil** sem API pública: não raspar sem autorização/termos; depende do espelhamento no PNCP.
6. **CPSI**: não há campo estruturado confiável; classificação por base legal/objeto com evidência e nível de confiança.
7. **Perfis reais ausentes**: sem CNPJ/CNAEs/documentos reais, o score não é autoritativo (aviso exibido).
8. **Limite do MEI**: faturamento anual e limites podem mudar por lei — configurável, sem valor fixo no código.

## M. Perguntas que exigem validação de negócio

1. MEI: razão social, CNPJ, CNAE principal/secundários e ocupações registradas no CCMEI.
2. MEI: serviços que de fato presta, capacidade operacional (horas/mês), valor máximo por contratação, UFs/cidades de atuação.
3. MEI: situação no SICAF e certidões disponíveis.
4. Systagma: CNPJ, CNAEs, porte (ME/EPP?) — afeta cotas exclusivas ME/EPP.
5. Systagma: quais capacidades são **core** vs secundárias hoje; alguma deve sair do seed?
6. Systagma: atestados de capacidade técnica, cases, certificações da equipe (ex.: ISO, PMP, Power BI).
7. Faixa de valor preferida por projeto (mínimo/máximo) e restrições geográficas.
8. Pesos do score e limiares de alerta para cada perfil.
9. Canais de alerta desejados (e-mail? Slack? webhook?) e horários dos resumos.
10. Quem pode aprovar mudanças de perfil e de pesos (hoje: `ADMIN`).
11. Política de retenção de documentos internos e onde hospedar (disco, S3 compatível).
12. Uso de IA: provedor autorizado e se documentos internos podem ser enviados a ele.
