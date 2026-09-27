# Radar Público — Systagma

Plataforma interna de inteligência de oportunidades em compras públicas brasileiras.
Coleta fontes oficiais (PNCP), normaliza, deduplica, classifica, analisa, pontua e alerta — separadamente
para os perfis **MEI** e **Systagma** — e apoia a decisão humana.

> **Não é um robô de licitação.** A plataforma nunca envia lances, propostas, documentos, declarações,
> preços, credenciais ou assinaturas. Decisão de participar, precificação, validação jurídica e envio
> oficial são sempre humanos. Nenhuma análise afirma “elegível”.

- Plano e arquitetura (A–M): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Pesquisa e checklist das fontes oficiais: [`docs/SOURCES.md`](docs/SOURCES.md)
- Segurança e permissões: [`docs/SECURITY.md`](docs/SECURITY.md)

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL 16 ·
Drizzle ORM · pg-boss (filas e cron no próprio Postgres) · Vitest · SDK Anthropic (IA opcional, desligada por padrão).

## Como rodar localmente

```bash
cp .env.example .env                 # ajuste DATABASE_URL
docker compose up -d postgres        # ou use um PostgreSQL 16 existente
npm install
npm run db:migrate                   # aplica o schema
npm run db:seed                      # organização, perfis MEI (vazio) e Systagma (taxonomia inicial), fontes
npm run user:create -- --email voce@systagma.com.br --name "Seu Nome" --role ADMIN --password 'senha-forte-123'

npm run dev                          # app em http://localhost:3000
npm run worker                       # coletores, matching, alertas (processo separado)
```

Sem acesso de rede às fontes oficiais, é possível explorar a interface com dados **fictícios** claramente
marcados (fonte “Demonstração”, órgãos “(DEMONSTRAÇÃO)”):

```bash
npm run db:seed-demo -- --i-understand-this-is-demo-data   # nunca em produção
```

### Scripts

| Script | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | App Next.js |
| `npm run worker` | Worker pg-boss: coletores agendados, processamento, documentos, alertas, resumos, IA |
| `npm run collect:once -- --source pncp --mode publicacao` | Uma coleta manual sem fila (`publicacao`, `atualizacao`, `proposta`, `pca`) |
| `npm run db:generate` / `db:migrate` / `db:seed` | Migrações Drizzle e seed |
| `npm run user:create` | Cria/atualiza usuário (não há cadastro público) |
| `npm test` / `lint` / `typecheck` | Qualidade (testes usam `TEST_DATABASE_URL`, padrão `radar_publico_test`) |

### Agendamentos (horário de Brasília)

| Fila | Quando | Função |
|---|---|---|
| `collect-pncp-publicacao` | a cada 2 h | contratações publicadas (janela com sobreposição) |
| `collect-pncp-atualizacao` | a cada 6 h | contratações atualizadas (prazos, situação, valor) |
| `collect-pncp-proposta` | diário 06:10 | contratações com proposta em aberto |
| `collect-pncp-pca` | diário 03:20 | itens de PCA (radar futuro), com pré-filtro de relevância |
| `collect-comprasgov-publicacao` | diário 05:45 | espelho Compras.gov.br (fonte desligada por padrão) |
| `discover-documents` | a cada 3 h | arquivos das compras relevantes/favoritas |
| `ai-analysis` | :25 e :55 | extração por IA (somente com `AI_PROVIDER=anthropic`) |
| `daily-maintenance` | 06:50 | recálculo diário, alertas de prazo e de validade de documentos |
| `dispatch-alerts` | a cada minuto | e-mail/webhook/Slack imediatos |
| `digest-daily` / `digest-weekly` | 07:55 / seg 07:57 | resumos |

Cada coletor é uma fila independente com retry e backoff: falha no PNCP não bloqueia outra fonte.
A saúde das fontes aparece no Painel e em **Configurações → Fontes de dados**.

## O que está no MVP

- Autenticação por sessão em banco, RBAC (Administrador, Analista, Leitor), bloqueio por tentativas, auditoria.
- Perfis **MEI** e **Systagma** separados e **versionados** (cada análise registra a versão do perfil).
- Conector PNCP (publicação, atualização, propostas abertas, PCA, arquivos); Compras.gov.br (espelho,
  desligado); Contrata+Brasil registrado sem coleta (sem API pública verificada).
- Ingestão idempotente: armazenamento bruto por hash, normalização tolerante, deduplicação por chaves
  oficiais (nunca por título), histórico de alterações (prazo, valor, situação, objeto, documento novo).
- Taxonomia configurável (termos positivos com peso, siglas, termos negativos “excluir/penalizar”).
- Matching determinístico separado por perfil, score 0–100 configurável com explicação, lacunas,
  bloqueios potenciais, evidências sugeridas, perfil incompleto e confiança.
- Extração de requisitos por regras, com trecho literal e referência da fonte.
- IA opcional (V2 antecipada): extração estruturada com validação de citação — itens sem evidência ficam
  “não confirmados na fonte” e não entram no score.
- Painel, lista com busca full-text e filtros, detalhe com **análise automática × decisão humana**,
  favoritos/monitoramento, interesse/descarte com motivo, ajustes manuais que preservam o automático,
  notas, histórico de decisões e alterações, radar futuro (PCA), radar de inovação (CPSI/ETEC/diálogo).
- Cofre de documentos e evidências técnicas por perfil (upload privado, validade, alertas de vencimento).
- Alertas in-app, e-mail (SMTP), webhook assinado e Slack; imediato, diário ou semanal, por perfil.

Próximos passos (V2/V3) em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#k-plano-mvp--v2--v3).

## Antes de produção

1. Verificar endpoints/campos no Swagger oficial (checklist em `docs/SOURCES.md`) — o ambiente de
   desenvolvimento não tinha acesso a `*.gov.br`.
2. Cadastrar os dados reais dos perfis (CNPJ, CNAEs, ocupações, documentos, evidências, faixas de valor).
3. Configurar `SMTP_*`, `WEBHOOK_SECRET`, `APP_BASE_URL`, `STORAGE_DIR` persistente e backups do Postgres.
4. Servir atrás de HTTPS (cookies `Secure` em produção) e definir `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`
   se houver mais de uma instância.
