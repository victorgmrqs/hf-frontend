> Part of the `testing-guide-hf-frontend` skill (see `../SKILL.md`).

# File conventions

## Naming

| Layer | Pattern | Example |
|---|---|---|
| Unit/component/integration (Vitest) | `<Name>.test.ts` / `<Name>.test.tsx` | `GlobalBudgetCard.test.tsx` |
| E2E (Playwright) | `<flow>.spec.ts` | `expense.spec.ts` |

## Directory placement

- **Colocated, always** — the test file sits next to the file it tests (`Component.tsx` + `Component.test.tsx` in the same directory). No centralized `__tests__/` or `test/` mirror tree for unit/component/integration tests.
- **Shared test infrastructure** lives in `src/test/`: `renderWithProviders.tsx` (page integration harness), `msw/server.ts` + `msw/handlers.ts` (base MSW setup) + `msw/pageHandlers.ts` (shared page-level defaults).
- **E2E** lives in the top-level `e2e/` directory, separate from `src/` — Vitest explicitly excludes it (`vitest.config.ts` → `coverage.exclude` / test `exclude: [...,'e2e/**']`), and Playwright's `testDir` points only there.

## Configuration

- `vitest.config.ts` — `environment: 'jsdom'`, `setupFiles: ['./vitest.setup.ts']`, coverage via `@vitest/coverage-v8`.
- `vitest.setup.ts` — starts the MSW server with `onUnhandledRequest: 'error'`, resets handlers and calls RTL `cleanup()` after each test, polyfills `window.matchMedia` for libs that query it (sonner, Tailwind-adjacent UI).
- `playwright.config.ts` — serves the production build (`npm run build && npm run preview`) rather than the dev server, single `chromium` project, retries only in CI.

## Gate enforcement

- `docs-guard.sh` (run in CI and by `/code-review-task`) fails a PR when `src/` changes without a matching test (`*.test.ts[x]` or `e2e/*.spec.ts[x]`) and without a `CHANGELOG.md` entry in the same diff.
- Coverage gate thresholds (global % and the stricter per-folder % for `src/services`/`src/utils`) are documented in `docs/testing-strategy.md` — this guide intentionally does not repeat the numbers; check that file for the current targets.
