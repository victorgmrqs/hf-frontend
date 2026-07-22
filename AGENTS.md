# AGENTS.md — hf-frontend

<!-- Keep this file short. Procedures live in skills; layer conventions live in rules. -->

## Overview

Frontend web do Home Finance, gerenciador financeiro doméstico para um casal com filhos (despesas com divisão automática, formas de pagamento, categorias, receitas, orçamento mensal, saldo, metas). Consome dois backends Go via REST: hf-transaction-service (DSP/FPG/CAT/USR/PER) e hf-income-service (REC/ORC/SAL/MET). O backend é a autoridade das regras de negócio — este app nunca as duplica.

## Stack

- TypeScript strict, Vite 5, React 18, react-router-dom 6
- Tailwind CSS 4 + Bootstrap 5, lucide-react, sonner
- Vitest + Testing Library + Playwright (coverage v8, MSW, axe)
- npm; cliente REST tipado gerado a partir de `openapi.yaml`

## Commands

```bash
npm run lint          # lint
npm run typecheck     # tsc -b --noEmit
npm run test:coverage # testes + gate de cobertura
npm run build          # tsc && vite build
npm run e2e            # Playwright
```

## Non-negotiable constraints

- Nenhuma regra de negócio no frontend — autoridade é o backend; validação de UX não substitui a do servidor.
- Toda chamada à API passa por `src/services` — nunca `fetch` solto em componente.
- Tokens/segredos nunca em log/console; só `VITE_*` é público e exposto no bundle.
- Estados de loading, erro e vazio explícitos em toda tela que consome API.
- `error.code` do envelope da API mapeado para mensagens pt-BR; nunca stack/`trace_id` cru ao usuário.
- UI responsiva ≥ 360 px; interface em pt-BR.
- Coverage: 80% global, 90% agregado por pasta em `src/services` e `src/utils`.

## Workflow

- Planejamento: processo canônico HF em `../hf-income-service/docs/workflow.md` → tickets Jira (prefixo `[frontend]` para este repo).
- Execução: `/task <TICKET-ID>` → task-brief (checkpoint 1) → implementação test-first → `/docs-sync` → DoD (checkpoint 2) → `/code-review-task` → commit/push → Jira In Review.
- Configuração: `.dev-workflow/workflow.config.yaml`.

## Documentation loaded on demand

- Regras de negócio: `RULES.md` (domínios USR/DSP/FPG/CAT/PER/CAL/MET/CTP)
- Estratégia de testes: `docs/testing-strategy.md`
- Contrato REST: `openapi.yaml` / `OPENAPI.md`
