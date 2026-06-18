---
name: code-review-task
description: >
  Code review automatizado do branch atual contra development (hf-frontend).
  Valida aderência ao CLAUDE.md, executa lint, typecheck, build e testes,
  faz bug-hunt no diff, verifica suficiência e qualidade dos testes, roda
  docs-guard e emite veredito APROVADO/REPROVADO. Chamada pela Fase 6.5 do
  /task ou avulsa. Uso: /code-review-task <TICKET-ID>   ex: /code-review-task HF-42
---

# Skill: /code-review-task (hf-frontend)

## Objetivo

Gate de qualidade antes do commit: revisar **apenas o diff do branch atual** contra `development` e emitir um veredito objetivo. Não é refatoração — é verificação de conformidade com o que o projeto já definiu.

## Etapa 1 — Coleta

1. Diff: `git diff development...HEAD` (+ `git status` para untracked). Pré-commit (fluxo /task): working tree (`git diff development` + arquivos novos).
2. Contexto: `CLAUDE.md`, `openapi.yaml`, `RULES.md`, `docs/testing-strategy.md`.
3. Ticket: `task-brief.yaml` na raiz, ou via MCP Atlassian.

## Etapa 2 — Checklist de styleguide (análise do diff)

| # | Verificação |
|---|-------------|
| 1 | TypeScript strict: sem `any`/`@ts-ignore` sem justificativa em comentário |
| 2 | Chamadas à API só pelo cliente tipado em `src/services`; endpoints existem no `openapi.yaml` |
| 3 | `error.code` do envelope mapeado para mensagens pt-BR; sem stack/`trace_id` cru para o usuário |
| 4 | Nenhum token/segredo logado ou hardcoded; só `VITE_*` exposto no bundle |
| 5 | Estados de loading/erro/vazio presentes nas telas alteradas |
| 6 | Responsividade ≥ 360 px preservada nas telas tocadas; textos em pt-BR |
| 7 | Nenhuma regra de negócio duplicada no cliente (autoridade é o backend) |
| 8 | Estrutura/nomenclatura consistente com o código vizinho (`pages`/`components`/`hooks`/`services`) |

## Etapa 3 — Verificações executáveis (capturar resultado real, não assumir)

```bash
npm run lint
npm run typecheck
npm run build
npm run test:coverage          # gate de cobertura (≥80% global; ≥90% services+utils)
npm run e2e                     # quando o diff toca fluxo crítico (auth/despesa/saldo)
```

Erro em qualquer um = **bloqueador**. Cobertura abaixo do threshold = **bloqueador**.
> Se algum script ainda não existir (fundação de testes pendente), registre como **bloqueador de processo** e aponte `docs/testing-strategy.md` §Setup.

## Etapa 4 — Docs-guard

Execute `scripts/docs-guard.sh` (se presente) e verifique semanticamente:

| Diff contém... | Exigir | Severidade |
|----------------|--------|------------|
| Mudança em `src/` | `CHANGELOG.md` `[Unreleased]` com `(HF-XX)` | Bloqueador |
| `package.json` (deps) | `CHANGELOG.md` seção Dependencies | Bloqueador |
| Tela nova/alterada | Evidência screenshot/GIF referenciada no brief/PR | Bloqueador |
| Código em `src/` (exceto só-tipos/estilos) | teste (`*.test.ts[x]`/e2e) no mesmo diff | Bloqueador |

## Etapa 4.6 — Bug-hunt no diff (procurar bugs, não estilo)

| # | Padrão de bug | Onde olhar |
|---|---------------|------------|
| 1 | Promise sem `await`/sem tratamento de erro em handler ou efeito | actions, handlers, `useEffect` |
| 2 | Race/stale state: efeito sem cleanup, fetch sem cancelamento ao desmontar/navegar, resposta antiga sobrescrevendo nova | fetches concorrentes, navegação |
| 3 | Estado de erro/vazio não renderizado (só happy path) ou loading infinito em falha | telas alteradas |
| 4 | Dados do usuário renderizados sem escape (`dangerouslySetInnerHTML`, href dinâmico) | componentes de exibição |
| 5 | Dependências de hook erradas (closure velho) com dado desatualizado | `useEffect`/`useCallback`/`useMemo` |
| 6 | `undefined`/`null` da resposta da API desreferenciado sem guard; non-null `!` sem garantia | `src/services`, parsing |
| 7 | Lógica sensível só no client (validação/autorização que o backend precisa repetir) | forms, rotas protegidas |
| 8 | Off-by-one/limites em paginação, truncamento, índices de lista | listagens |

Bug provável com impacto real = **bloqueador**; suspeita/risco teórico = recomendação com justificativa.

## Etapa 4.7 — Suficiência de testes

1. Rode `npm run test:coverage`. Cobertura abaixo do threshold (80% global / 90% em `src/services` e `src/utils`) = **bloqueador**.
2. Para cada **branch novo/alterado sem cobertura** (incluindo estados de erro/vazio/loading):
   - comportamento que espelha regra de negócio ou `error.code` → teste ausente é **bloqueador**;
   - demais bordas → **recomendação** com o caso proposto (nome + cenário).
3. Avalie a **qualidade das asserções** (Etapa 4.9).

## Etapa 4.9 — Qualidade de teste (anti-padrões)

Cobertura alta não prova teste bom. Rejeitar (conta como teste **ausente**, logo bloqueador quando cobre regra/`error.code`):

| # | Anti-padrão | Sinal |
|---|-------------|-------|
| 1 | Trivial | testa constante/markup estático sem comportamento |
| 2 | Snapshot-only | único `toMatchSnapshot()` como toda a asserção |
| 3 | Sem asserção | `render`/`act` sem `expect` |
| 4 | Mock-heavy | mocka a própria unidade sob teste |
| 5 | Detalhe de implementação | assere classe CSS/estado interno em vez de saída visível (preferir `getByRole`/`getByText`) |
| 6 | Duplicado/inflado | testes idênticos para subir %; `expect(true).toBe(true)` |

Exigir validação significativa: comportamento de negócio, resultado para o usuário, caminho negativo (cada `error.code` tratado), edge (vazio, lista longa, timeout/rede lenta). Referência: `docs/testing-strategy.md` §Qualidade de teste.

## Etapa 4.8 — Reviews nativos do Claude Code (camada extra)

- **`/security-review` (built-in) é OBRIGATÓRIO** quando o diff toca: fluxo de autenticação/sessão/tokens, `dangerouslySetInnerHTML` ou renderização de conteúdo do usuário, upload de arquivos, novas variáveis `VITE_*` (vazamento de config) ou rotas protegidas. Achados de severidade alta = bloqueador.
- **`/code-review` (built-in) com esforço alto** é recomendado no fechamento de cada fase do roadmap (diff acumulado do epic), fora do fluxo por task.

## Etapa 5 — Veredito

```
## Code Review — <TICKET-ID>

**Veredito: APROVADO | REPROVADO**

### Bloqueadores
- [arquivo:linha] descrição + regra violada

### Recomendações
- [arquivo:linha] sugestão

### Execuções
- lint: ✅/❌ · typecheck: ✅/❌ · build: ✅/❌ · test:coverage: ✅/❌ (X%) · e2e: ✅/—/❌

### Docs-guard
- CHANGELOG: ✅/❌ · teste no diff: ✅/❌ · evidência: ✅/❌

### Bug-hunt
- N achados (por severidade) ou "nenhum padrão da Etapa 4.6 encontrado"

### Suficiência de testes
- Branches/estados sem teste: [lista com caso proposto]
- /security-review nativo: executado ✅ (achados: N) / não exigido para este diff

### Checklist do PR (para a Fase 7 do /task)
- Itens verificados para pré-marcar: [lista]
```

## Restrições

- Não corrija código nesta skill; não aprove com bloqueador aberto; revise só o diff do branch.
