# Frontend Testing Strategy — hf-frontend

> Adaptada do padrão skillCraft (`sc-frontend/docs/testing-strategy.md`) para a stack **Vite + React**.
> Fonte de verdade de processo (HF): [../../hf-income-service/docs/workflow.md](../../hf-income-service/docs/workflow.md).
> Status: **aplicado** — fundação instalada em HF-81 (Vitest+coverage v8, Testing Library, MSW, Playwright, axe, docs-guard, gates de CI), cobertura real via backfill HF-76…HF-79 e **gate global 80% ativo desde a HF-80** (2026-07-02), com E2E dos fluxos críticos (despesa compartilhada e saldo/orçamento).
> Pendência: E2E de autenticação (login + refresh) aguarda a implementação de auth no cliente — registrada no HF-80.
>
> Receita concreta por tipo de artefato (setup pattern, o que testar, quando pular): skill `testing-guide-hf-frontend`
> (`.claude/skills/testing-guide-hf-frontend/`, gerada via `/generate-test-guide`, HF-121). Este documento é o status
> de alto nível e a fonte de metas de cobertura/anti-padrões; a skill é o "como" por tipo (services/utils/hooks/
> contexts/components/pages/e2e).

---

## Estado atual

| Área | Estado |
|------|--------|
| Runner unit/component | Vitest 4 + Testing Library (HF-81) |
| Coverage | `@vitest/coverage-v8`; **gate global 80%** nas 4 métricas + 90% agregado por pasta em `src/services`/`src/utils` (HF-80) |
| Integration (API mockada) | MSW com handlers derivados do `openapi.yaml` (HF-79) |
| E2E | Playwright: smoke, despesa compartilhada, saldo/orçamento (HF-80) |
| a11y | axe estrito WCAG 2 A/AA nas 6 rotas (HF-82/HF-84) |
| CI de teste | `ci-cd.yml`: typecheck, `test:coverage` (gate bloqueante), e2e |
| Enforcement de docs | `scripts/docs-guard.sh` no CI |

**Lacuna conhecida:** E2E de auth (login/refresh) — depende de o cliente ganhar tela de login/JWT.

---

## Arquitetura de teste (pirâmide alvo)

```
        /\        E2E (Playwright)        — poucos, fluxos críticos ponta a ponta
       /  \       Integration (RTL+MSW)   — telas + API mockada por contrato
      /----\      Component (RTL)         — estados loading/erro/vazio
     /------\     Unit (Vitest)           — utils/hooks/services/parsing
   a11y (axe) atravessa component + E2E
```

Mapeamento por tipo de artefato (services, utils, hooks, contexts, components, pages, e2e) com setup pattern e
exemplos reais do projeto: ver o quick reference da skill `testing-guide-hf-frontend` (`SKILL.md` §4).

---

## Coverage

| Camada | Alvo |
|--------|------|
| `src/utils`, `src/services` (parsing, cliente API, auth) | **90%** |
| Hooks | **85%** |
| Componentes | **80%** |
| Páginas/rotas | **80%** (E2E cobre o resto) |
| Fluxos E2E críticos | **100% dos fluxos** (auth, despesa compartilhada, saldo) |

**Gate de bloqueio no CI: 80% global nas 4 métricas** (`coverage.thresholds`), 90% agregado por pasta em `src/services` e `src/utils` (a flag `perFile` do Vitest é única para todos os grupos de threshold — com o gate global ativo, o 90% das camadas puras passou de per-file para agregado por pasta na HF-80).
Regra herdada do backend: **cada `error.code` do envelope que a UI mapeia → 1 teste nomeado**.

> Coverage é piso necessário, **não suficiente** — ver Qualidade de teste.

---

## Qualidade de teste (anti-padrões — rejeitar)

| # | Anti-padrão | Sinal |
|---|-------------|-------|
| 1 | Trivial | testa constante/markup estático sem comportamento |
| 2 | Snapshot-only | único `toMatchSnapshot()` como toda a asserção |
| 3 | Sem asserção | `render`/`act` sem `expect` |
| 4 | Mock-heavy | mocka a própria unidade sob teste |
| 5 | Detalhe de implementação | assere classe CSS/estado interno em vez de saída visível (preferir `getByRole`/`getByText`) |
| 6 | Duplicado/inflado | testes idênticos para subir %; `expect(true).toBe(true)` |

**Exigir:** comportamento de negócio e resultado para o usuário, caminho negativo (cada `error.code` tratado), edge (vazio, lista longa, rede lenta/timeout).

---

## Setup (ticket de fundação — equivalente ao SKC-28)

Antes de exigir os gates de teste no `/task` e `/code-review-task`, abrir um ticket `[frontend]` que:

1. **devDependencies:** `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `msw`, `@playwright/test`, `@axe-core/playwright`, `vitest-axe`.
2. **Scripts** (`package.json`):
   ```jsonc
   "typecheck": "tsc --noEmit",
   "test": "vitest run",
   "test:coverage": "vitest run --coverage",
   "e2e": "playwright test"
   ```
3. **`vitest.config.ts`** com `environment: "jsdom"`, `setupFiles`, e `coverage` com `provider: "v8"` + `thresholds` (80% / per-file 90% em `src/services` e `src/utils`). **Não** usar `passWithNoTests: true`.
4. **`src/test/msw/`** (`handlers.ts`, `server.ts`) com handlers derivados do `openapi.yaml`.
5. **`playwright.config.ts`** + `e2e/` com smoke de auth e um teste de a11y.
6. **CI (`ci-cd.yml`):** steps `npm run typecheck`, `npm run test:coverage` e `npm run e2e` (com `npx playwright install --with-deps`).
7. **`scripts/docs-guard.sh`:** falhar o PR se `src/` mudou sem `CHANGELOG.md` e sem teste (`*.test.ts[x]`) no mesmo diff.
8. **Testes prioritários** ao subir a fundação: `services/` (cliente API + refresh de token) e mapeamento de `error.code`→pt-BR.

---

## Responsabilidades do agente

| Papel | Responsabilidade |
|-------|------------------|
| Planner (`/task` brief) | Listar "Cenários de Teste Obrigatórios" por camada antes do CHECKPOINT 1 |
| Developer | Test-first para regras/`error.code`; `test:coverage` verde localmente antes do review |
| Reviewer (`/code-review-task`) | Rodar coverage; bloquear abaixo do threshold; aplicar checklist de anti-padrões; `error.code` mapeado sem teste = bloqueador |
| QA | E2E dos fluxos críticos + a11y no fechamento de fase |
