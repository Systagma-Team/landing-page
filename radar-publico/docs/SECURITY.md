# Segurança, permissões e revisão

Dados de contratações e documentos internos são tratados como informação sensível da empresa.

## Autenticação e sessão

- Sessão em banco: token aleatório de 256 bits no cookie `rp_session` (`HttpOnly`, `SameSite=Lax`,
  `Secure` em produção); o banco guarda apenas o SHA-256 do token.
- Expiração por inatividade (7 dias, deslizante) e absoluta (30 dias). Logout, troca de senha,
  desativação ou mudança de papel encerram as sessões do usuário.
- Senhas com `scrypt` (N=2^15, r=8, p=1), comparação em tempo constante, política mínima de 12 caracteres
  com letras e números. E-mails inexistentes passam pelo mesmo custo de verificação.
- Bloqueio de login: 5 falhas por e-mail ou 20 por IP em 15 minutos. Mensagem de erro genérica.
- Sem cadastro público: usuários são criados por administradores (UI ou `npm run user:create`).

## Autorização (RBAC)

| Ação | Leitor | Analista | Administrador |
|---|:-:|:-:|:-:|
| Ver oportunidades, análises, cofre, alertas | ✓ | ✓ | ✓ |
| Favoritar, decidir (interesse/descarte/fluxo), notas, ajustes manuais | | ✓ | ✓ |
| Enviar/arquivar documentos e evidências | | ✓ | ✓ |
| Testar conexão das fontes | | ✓ | ✓ |
| Editar perfis, taxonomia e pesos | | | ✓ |
| Ativar fontes, configurar coleta, “Coletar agora” | | | ✓ |
| Gerenciar usuários, consultar auditoria completa | | | ✓ |
| Webhook/Slack como canal de alerta | | | ✓ |

- `proxy.ts` faz apenas redirecionamento otimista (presença do cookie).
- Toda Server Action e Route Handler revalida a sessão no banco e o papel (`actorWithRole` /
  `requireRole`), e os serviços repetem a checagem (`assertRole`) — defesa em profundidade.
- Dados de tenant são sempre filtrados por `organization_id`; perfis, documentos, evidências, overrides,
  decisões e preferências são verificados como pertencentes à organização do usuário.
- `SUBMITTED_EXTERNALLY` exige confirmação explícita de que o envio foi feito por uma pessoa fora da
  plataforma; “Vencida/Perdida” só após envio externo registrado. Nenhum código envia propostas.

## Entradas e arquivos

- Server Actions validam e normalizam todas as entradas (IDs UUID, números, datas, CNPJ com dígitos
  verificadores, CNAE, listas limitadas, tamanhos máximos). Consultas usam SQL parametrizado.
- Uploads: lista de extensões, verificação de assinatura (magic bytes), limite de tamanho
  (`MAX_UPLOAD_MB`), nome sanitizado, armazenamento endereçado por SHA-256 fora de `public/`, permissão
  `0600`. Arquivos nunca são executados.
- Download apenas autenticado, escopo por organização, `Content-Disposition: attachment`, `nosniff`,
  `Cache-Control: private, no-store`, CSP `sandbox`. Cada download é auditado.

## Saídas externas

- Webhooks/Slack: somente HTTPS para hosts públicos (sem IPs privados/loopback), sem seguir redirects,
  timeout de 15 s, assinatura `X-Radar-Signature: sha256=<HMAC>` com `WEBHOOK_SECRET`.
- Coletores: apenas APIs públicas oficiais, `User-Agent` identificado, limite de taxa conservador,
  respeito a 429/`Retry-After`; HTML inesperado (WAF) é tratado como falha, nunca contornado.
- IA (opcional): somente textos públicos das contratações são enviados ao provedor; documentos do cofre
  nunca são enviados.

## Cabeçalhos

CSP (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`),
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`,
sem `X-Powered-By`. Páginas marcadas `noindex`. Server Actions têm checagem de origem (CSRF) do Next.js.

## Auditoria

`audit_logs` (append-only) registra login, decisões, mudanças de fluxo, ajustes manuais e revogações,
alterações de perfil (com versão), uploads/arquivamentos/downloads, evidências, notas, fontes,
execuções manuais, usuários, preferências de notificação e análises de IA.

## Revisão realizada no MVP

- Todas as Server Actions revisadas quanto a autenticação, papel mínimo e escopo de organização.
- Testes automatizados cobrem: portão de envio humano, papel insuficiente, ajuste manual preservando o
  automático, isolamento de falhas de fonte, deduplicação, validação de evidência da IA.
- Teste de navegador (Playwright) cobriu: login inválido, redirecionamento sem sessão, bloqueio de
  download sem sessão, leitor sem ações, analista sem edição de perfil, upload com conteúdo falsificado
  rejeitado, CNPJ inválido rejeitado; varredura axe (WCAG 2 A/AA) sem violações nas páginas principais.

## Pendências para produção

- Rate limiting na borda (reverse proxy) para rotas autenticadas e downloads.
- Backups e retenção dos documentos do cofre; armazenamento S3 compatível com criptografia.
- MFA para administradores (fora do escopo do MVP).
- CSP com nonce (hoje `'unsafe-inline'` para scripts do Next.js).
