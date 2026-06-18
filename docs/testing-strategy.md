# Frontend Testing Strategy — hf-frontend

> Adaptada do padrão skillCraft (`sc-frontend/docs/testing-strategy.md`) para a stack **Vite + React**.
> Fonte de verdade de processo (HF): [../../hf-income-service/docs/workflow.md](../../hf-income-service/docs/workflow.md).
> Status: **fundação instalada** em HF-81 (Vitest+coverage v8, Testing Library, MSW, Playwright, axe, docs-guard, gates de CI). Data: 2026-06-17.
> Rampa de cobertura: thresholds per-file 90% em `src/services` e `src/utils` medem apenas arquivos com teste; a cobertura real entra na HF-76 e o gate global 80% na HF-80.

---

## Estado atual (gap)

| Área | Hoje | Lacuna |
|------|------|--------|
| Runner unit/component | — | Vitest não instalado |
| Coverage | — | sem `@vitest/coverage-v8`, sem thresholds |
| Integration (API mockada) | — | sem MSW |
| E2E | — | sem Playwright |
| a11y | — | sem axe |
| CI de teste | `ci-cd.yml` | nenhum step de teste/coverage |
| Scripts | `dev`, `build`, `lint` | sem `typecheck`, `test`, `test:coverage`, `e2e` |
| Enforcement de docs | — | sem `docs-guard.sh` |

**Consequência:** comportamento crítico (refresh de token, mapeamento de `error.code`→pt-BR, polling de estados) hoje não tem proteção de regressão.

---

## Arquitetura de teste (pirâmide alvo)

```
        /\        E2E (Playwright)        — poucos, fluxos críticos ponta a ponta
       /  \       Integration (RTL+MSW)   — telas + API mockada por contrato
      /----\      Component (RTL)         — estados loading/erro/vazio
     /------\     Unit (Vitest)           — utils/hooks/services/parsing
   a11y (axe) atravessa component + E2E
```

| Camada | Ferramenta | Valida | Onde mora |
|--------|-----------|--------|-----------|
| Unit | Vitest | `src/utils`, `src/services` (cliente API, parsing, mapeamento de erro), auth/refresh | `*.test.ts` ao lado |
| Component | Vitest + Testing Library | render, interação, **estados error/loading/empty** | `*.test.tsx` ao lado |
| Integration | Vitest + RTL + **MSW** | tela ↔ API mockada, submit de form, navegação (react-router) | `*.test.tsx` |
| E2E | **Playwright** | auth (login/refresh), criação de despesa compartilhada, fluxos de saldo/orçamento | `e2e/` |
| a11y | **@axe-core/playwright** + `vitest-axe` | ARIA, teclado, contraste | dentro de E2E e component |

---

## Coverage

| Camada | Alvo |
|--------|------|
| `src/utils`, `src/services` (parsing, cliente API, auth) | **90%** |
| Hooks | **85%** |
| Componentes | **80%** |
| Páginas/rotas | **80%** (E2E cobre o resto) |
| Fluxos E2E críticos | **100% dos fluxos** (auth, despesa compartilhada, saldo) |

**Gate de bloqueio no CI: 80% lines/branches global** (`coverage.thresholds`), `per-file` em `src/services` e `src/utils`.
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
