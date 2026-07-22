# CLAUDE.md

## Project Overview

**hf-frontend** — frontend web do **Home Finance**, gerenciador financeiro doméstico para um casal com filhos: despesas pessoais e compartilhadas (com divisão automática), formas de pagamento, categorias, receitas, orçamento mensal, saldo e metas de redução.

A UI consome dois backends Go via REST:
- **hf-transaction-service** — despesas, formas de pagamento, categorias (domínios `DSP`, `FPG`, `CAT`, `USR`, `PER` — ver [RULES.md](RULES.md)).
- **hf-income-service** — receitas, orçamento global, saldo, metas (domínios `REC`, `ORC`, `SAL`, `MET`).

**A autoridade das regras de negócio é o backend.** Validação no frontend é cortesia de UX; nunca duplique nem reimplemente regra de negócio aqui. O contrato REST é o [openapi.yaml](openapi.yaml) / [OPENAPI.md](OPENAPI.md) — o cliente tipado deriva dele.

## Tech Stack

- **Vite 5 + React 18 + TypeScript strict** (sem `any` não justificado)
- **react-router-dom 6** (rotas), **Tailwind CSS 4** + **Bootstrap 5**, **lucide-react** (ícones), **sonner** (toasts)
- Cliente da API REST tipado a partir do `openapi.yaml`; auth Bearer JWT (access+refresh) com refresh automático no cliente
- Lint/format: ESLint (`--max-warnings 10`) · Testes: Vitest + Testing Library + Playwright (ver [docs/testing-strategy.md](docs/testing-strategy.md))

## Restrições não negociáveis

- Nenhuma regra de negócio no frontend — a autoridade é o backend; validação de UX não substitui a do servidor.
- Tokens/segredos nunca em log/console; só variáveis `VITE_*` são públicas e expostas no bundle.
- Estados de **loading**, **erro** e **vazio** explícitos em toda tela que consome API.
- Erros da API: mapear `error.code` (do envelope padrão) para mensagens pt-BR; nunca exibir stack/`trace_id` cru ao usuário.
- UI responsiva ≥ 360 px; interface em pt-BR.

## Architecture

```
src/
  pages/        — telas por rota (react-router)
  components/   — componentes reutilizáveis
  hooks/        — lógica de estado reutilizável
  services/     — cliente da API tipado (sem fetch solto em componente)
  config/       — configuração (base URL via VITE_API_URL)
  utils/        — funções puras (parsing, formatação, mapeamento de erro)
  styles/ · assets/
```

Toda chamada à API passa por `services/` — nunca `fetch` direto no componente.

## Development Workflow

- **Processo canônico (HF):** [../hf-income-service/docs/workflow.md](../hf-income-service/docs/workflow.md) — mesmo Jira (`HF`), mesmas colunas, mesma estratégia de branches (`main` ← `development` ← `feat/HF-XX-*`).
- Este repo implementa tickets com prefixo **`[frontend]`**.
- **Skills:** `/task <HF-XX>` (ciclo completo), `/code-review-task <HF-XX>` (gate de review), `/docs-sync` (sincroniza docs) — fornecidas pelo plugin `dev-workflow`, configurado em [.dev-workflow/workflow.config.yaml](.dev-workflow/workflow.config.yaml). `/backfill-tests` continua local em `.claude/skills/`.
- Evidência de ticket frontend: **screenshot/GIF + passos de reprodução** no PR.
- Documentação Viva local: `CHANGELOG.md` em toda task (docs-guard no CI).

## Testing & Checks

```bash
npm run lint
npm run typecheck       # tsc -b --noEmit
npm run test:coverage   # Vitest + coverage v8 (gate per-file 90% em src/services e src/utils)
npm run e2e             # Playwright (smoke + a11y axe na home)
npm run build           # tsc && vite build — deve passar antes do PR
```

> A fundação de testes foi instalada em **HF-81** (Vitest+coverage, MSW, Playwright, axe, `docs-guard.sh`, gates de CI). Rampa de cobertura: thresholds per-file 90% em `src/services` e `src/utils` medem só arquivos com teste; cobertura real na HF-76, gate global 80% na HF-80. Ver [docs/testing-strategy.md](docs/testing-strategy.md).

## Long-running Processes

`npm run dev` deve rodar em background no Bash tool para não bloquear o agente.
