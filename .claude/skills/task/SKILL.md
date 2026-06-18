---
name: task
description: >
  Workflow completo de implementação frontend a partir de um ticket Jira
  [frontend]. Lê o ticket via Atlassian MCP, carrega contexto (CLAUDE.md,
  openapi.yaml, workflow canônico do HF), gera task-brief.yaml para aprovação
  (checkpoint 1), cria o branch de development e move o card para In Progress,
  implementa test-first, testa, atualiza CHANGELOG, valida o DoD (checkpoint 2),
  executa /code-review-task, commita, faz push e move o card para In Review.
  PR aberto manualmente. Uso: /task <TICKET-ID>   ex: /task HF-42
---

# Skill: /task (hf-frontend)

## Objetivo

Executar o ciclo completo de desenvolvimento de um ticket **`[frontend]`** com dois checkpoints humanos e um gate de code review. Documentação e testes fazem parte da entrega — não são etapas posteriores. Processo canônico (HF): [../../../../hf-income-service/docs/workflow.md](../../../../hf-income-service/docs/workflow.md).

Projeto Jira: `HF` — https://goncalvesmarques.atlassian.net.
Colunas: `Backlog → In Progress (Fase 3.0) → In Review (Fase 8) → Done (manual, no merge)`.

> Se o ticket NÃO for `[frontend]`, avise que ele pertence a um backend (hf-income-service / hf-transaction-service) e pare.

---

## Fase 1 — Carregamento de contexto

1. Leia o ticket via Atlassian MCP (título, descrição, critérios de aceite, comentários).
2. Leia sempre: `CLAUDE.md`, `openapi.yaml` (ou `OPENAPI.md`), `RULES.md`, `docs/testing-strategy.md`.
3. Conforme o domínio do ticket, identifique os `error.code` do envelope que a UI deve tratar:
   - despesas/pagamentos/categorias → hf-transaction-service (`DSP`, `FPG`, `CAT`, `USR`, `PER`)
   - receitas/orçamento/saldo/metas → hf-income-service (`REC`, `ORC`, `SAL`, `MET`)

---

## Fase 2 — task-brief.yaml

Gere `task-brief.yaml` na raiz (não versionado — já no `.gitignore`):

```yaml
ticket: {id: "", title: "", type: ""}     # feature | bug | chore | refactor
understanding: {problem: "", proposed_solution: ""}
scope:
  domains: []              # DSP | FPG | CAT | USR | PER | REC | ORC | SAL | MET (telas relacionadas)
  affected_files: []       # páginas/componentes/hooks/services
  api_endpoints: []        # endpoints consumidos (do openapi.yaml)
  new_routes: []           # rotas react-router novas
risks: {ambiguities: []}
implementation_plan: {steps: []}
test_scenarios:            # OBRIGATÓRIO antes do checkpoint 1 — por camada
  unit: []                 # utils/services (parsing, cliente API, mapeamento de erro)
  component: []            # estados loading/erro/vazio
  integration: []          # tela ↔ API (MSW)
  e2e: []                  # só fluxo crítico (auth, despesa compartilhada, saldo)
dod_checklist:
  - "[ ] critérios de aceite do ticket satisfeitos"
  - "[ ] lint, typecheck e build verdes"
  - "[ ] estados de loading/erro/vazio tratados; cada error.code tratado mapeia para pt-BR"
  - "[ ] testes da camada apropriada criados; cada error.code tratado tem teste nomeado"
  - "[ ] npm run test:coverage verde (≥ 80% global; ≥ 90% em src/services e src/utils)"
  - "[ ] E2E (Playwright) para fluxo crítico tocado + a11y (axe) das telas novas"
  - "[ ] tokens nunca logados; só VITE_* no bundle"
  - "[ ] responsivo ≥ 360 px; textos em pt-BR"
  - "[ ] CHANGELOG.md atualizado ([Unreleased], (HF-XX))"
  - "[ ] evidência: screenshot/GIF + passos de reprodução para o PR"
```

> Estratégia e metas de teste: [../../../docs/testing-strategy.md](../../../docs/testing-strategy.md).

### CHECKPOINT 1 — Aprovação do brief
Apresente problema, solução, escopo (telas, endpoints, rotas), **cenários de teste por camada**, ambiguidades e plano numerado. **Aguarde aprovação antes de continuar.** Nenhum brief é aprovado sem `test_scenarios`.

---

## Fase 3.0 — Branch + Jira In Progress

1. `git checkout development && git pull --ff-only` (pull só se houver remote) → `git checkout -b feat/HF-XX-descricao-curta`. Se `development` não existir, crie de `main` e avise. Nunca trabalhe em `main`/`development`.
2. Jira → **In Progress** via `getTransitionsForJiraIssue` + `transitionJiraIssue`. Se a coluna não existir, avise e siga.

---

## Fase 3 — Implementação (test-first)

- **Test-first:** para cada regra/`error.code` que a UI trata, escreva o teste **antes ou junto** da implementação. Comportamento novo sem teste da camada apropriada é bloqueador no `/code-review-task`.
- TypeScript strict; sem `any`/`@ts-ignore` sem justificativa; componentes pequenos e consistentes com o código vizinho.
- Toda chamada à API passa pelo cliente tipado em `src/services` — sem `fetch` solto em componente.
- Erros da API: mapear `error.code` (envelope do backend) para mensagens pt-BR; nunca exibir stack/`trace_id` cru ao usuário (logar no console só em dev).
- Fluxos com estado assíncrono: tratar loading/erro/vazio; cancelar requisições obsoletas ao desmontar/navegar (sem race/stale state).
- Nenhuma regra de negócio duplicada no cliente — a autoridade é o backend.

---

## Fase 4 — Testes e verificação (obrigatório)

```bash
npm run lint && npm run typecheck && npm run build
npm run test:coverage    # gate real: falha abaixo do threshold (80% global / 90% services+utils)
npm run e2e              # quando o diff toca fluxo crítico (auth/despesa/saldo) + a11y
```

> Se o tooling de teste ainda não existe neste repo, **pare e avise**: a fundação de testes (ver `docs/testing-strategy.md` §Setup) é pré-requisito e deve ser um ticket próprio.

Capture **screenshot/GIF** do comportamento + print do relatório de coverage (evidência do PR).

---

## Fase 5 — Documentação

Invoque a skill **`/docs-sync`** (via Skill tool) passando o ticket ID — ela aplica a tabela "mudou X → atualiza doc Y" (CHANGELOG, evidência). Revise o relatório antes de seguir. Se o ticket revelou divergência com o `openapi.yaml`/contrato do backend, registre como pendência para o backend no comentário do ticket — não edite docs de outro repo a partir daqui.

---

## Fase 6 — DoD (CHECKPOINT 2)

Verifique cada item do `dod_checklist` e apresente status PRONTO/PENDENTE. **Aguarde aprovação.**

## Fase 6.5 — Code Review (gate)

Invoque `/code-review-task <HF-XX>`. REPROVADO → corrija e repita. Só prossiga APROVADO.

## Fase 7 — PR Description

Preencha o body sobre `.github/pull_request_template.md` (não edite o template): Jira Issue, o que foi feito, como testar, screenshot/evidência, veredito do review; pré-marque o que o review verificou.

## Fase 8 — Entrega

1. Commit `type(HF-XX): mensagem`; `task-brief.yaml` fora do commit.
2. `git push -u origin feat/HF-XX-...` (sem remote: avise e pare).
3. Jira → **In Review** + comentário com resumo, branch e PR description.
4. PR e merge são manuais (base `development`); **Done** é manual no merge.

---

## Restrições

- Nada de código antes do CHECKPOINT 1; nada de commit antes do review APROVADO.
- Nunca commit direto em `main`/`development`; PR/merge são do usuário.
- Ambiguidade sem resposta: pare e pergunte.
