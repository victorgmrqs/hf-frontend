---
name: testing-guide-hf-frontend
description: >
  Testing guide for hf-frontend. Reference this skill when planning features,
  implementing code, creating tests, or reviewing changes in hf-frontend.
  Covers what to test, at which layer, and how to set up each test —
  organized by artifact type.
  Triggers on: planning hf-frontend features, implementing hf-frontend features,
  writing tests for hf-frontend, reviewing hf-frontend code, reviewing hf-frontend tests,
  what should I test in hf-frontend, how to test hf-frontend, hf-frontend test guide.
---

# Testing Guide — hf-frontend

## 0. Purpose

This guide helps you decide **what to test**, at **which layer**, and **how to set up tests** for each type of artifact in `hf-frontend`. When working on a specific artifact type (service, hook, component, page, e2e spec), read the corresponding guide in `artifacts/` for the complete recipe. Supporting references (mock strategy, file conventions, gotchas) are in `references/`.

For the project's coverage status, historical ramp, and pyramid narrative, see `docs/testing-strategy.md` — this guide is the concrete per-type recipe; that doc is the high-level status.

## 1. Testability Foundations

hf-frontend has **no backend of its own** — it is a pure React/Vite client consuming two remote REST APIs (hf-transaction-service, hf-income-service) through a single typed transport (`apiFetch` in `services/api.ts`). This reshapes the universal fundamentals as follows:

- **The only "external system" is HTTP.** There is no DB, queue, cache, or email to fake — every external-system decision in this project reduces to "how do we fake these two REST APIs." MSW (Vitest layers) and Playwright `page.route` (E2E) are the two fakes in use — never both in the same test run (MSW's Service Worker makes requests invisible to `page.route`, so E2E deliberately does not use MSW).
- **Services are the system-boundary-contract layer.** `financeService`/`incomeService` wrap `apiFetch` and are the only files allowed to know an endpoint's URL/method/body shape. A test that exercises a service through MSW is, per the fundamentals, an **integration test of the HTTP contract** — even though it's colocated and run by Vitest like a "unit" test. When a service method also has branching (e.g., `getExpenses` normalizing two payload shapes since HF-120), that branching gets unit-style assertions in the same MSW-backed test file — the mock boundary is the network, not the function.
- **Hooks cross the HTTP boundary too — and this project's convention is to NOT mock the service in a hook's own test.** `useBalance.test.tsx` renders the real hook, which calls the real service, which calls the real (MSW-faked) `fetch`. This is deliberate: mocking `financeService` in a hook test would hide a broken query/URL, exactly the bug MSW-backed tests are meant to catch. Reserve `vi.spyOn` on a hook module for **component** tests, where the hook itself is the unit boundary being isolated.
- **Components are the unit layer for UI branching.** `GlobalBudgetCard.test.tsx` mocks `useGlobalBudget`/`useBalance` via `vi.spyOn(...).mockReturnValue(...)` — this isolates the component's rendering logic (loading/error/empty/success branches) from data fetching, which hooks already test on their own.
- **Pages are full integration.** `Budgets.test.tsx` uses `renderWithProviders` (real component tree + react-router + context providers) with MSW — proving the page wires components, hooks, and routing together correctly. This does not re-test component branching (already covered) or hook fetching (already covered) — it tests composition.
- **E2E is real-browser, not HTTP-only.** Unlike the fundamentals' default framing (E2E = supertest-style HTTP test), this project's `e2e/*.spec.ts` runs a real Chromium browser via Playwright against a built app, with the backend stubbed via `page.route`. See §6 for the terminology note and `artifacts/e2e.md` for the pattern.
- **No DI, no modules, no controllers, no entities.** hf-frontend has none of the backend-oriented artifact types the generic fundamentals assume (no module compilation tests, no repository/ORM layer). Skip those sections of the universal fundamentals entirely — they do not apply here.

## 2. Testing Criteria

**Worth testing** (anchored to this project's artifact types):
- Services with parsing/normalization branching (e.g., `financeService.getExpenses`/`incomeService.getIncomes` since HF-120 — nested vs flat payload)
- `errorMessage.ts` (`messageForError`) — every `error.code` the UI maps to pt-BR needs a named test
- Hooks with loading/error/notFound/empty branching (`useBalance`, `useGlobalBudget`, `useFamilyTotals`, `useCompetence`, `useUser`)
- Components with conditional rendering (loading skeleton / error banner / empty state / success — e.g., `GlobalBudgetCard`, all `*Modal.tsx`)
- Pages composing multiple data sources and user actions (delete/filter/paginate/copy/pay flows in `Budgets.tsx`, `Expenses.tsx`, etc.)
- Critical E2E flows: shared-expense creation, balance/budget display (auth login+refresh pending HF-86)
- a11y: no serious axe violations on the 6 routes (component-level `vitest-axe` + `e2e/a11y.spec.ts`)

**NOT worth testing:**
- Simple CRUD service methods with no branching beyond building a URL/body (`createBudget`, `deleteCategory`, etc.) — one contract test (method/URL/body) per method is enough; do not add extra cases per field
- Static JSX structure or CSS class assertions — assert via `getByRole`/`getByText`, per `.claude/rules/coding-style.md` and `.claude/rules/testing.md`
- Re-testing hook fetching logic inside a page integration test (already covered at the hook layer)
- Re-testing component branch rendering inside a page integration test (already covered at the component layer)
- Trivial pure functions with a single path (see anti-patterns already in `docs/testing-strategy.md`)

## 3. Feature Implementation Checklist

| Artifact created/modified | Required tests | Guide |
|---|---|---|
| Service method (`src/services/*.ts`) | MSW-backed test: method/URL/body contract; unit-style assertions for any parsing branch | `artifacts/services.md` |
| Util function (`src/utils/*.ts`) | Unit: one case per branch | `artifacts/utils.md` |
| Hook (`src/hooks/use*.tsx`) | `renderHook` + MSW: loading, success, each mapped `error.code`, empty/not-found state | `artifacts/hooks.md` |
| Context (`src/contexts/*.tsx`) | Same pattern as hooks | `artifacts/contexts.md` |
| Component (`src/components/*.tsx`) | RTL + `vi.spyOn` on the hook(s) it uses: loading/error/empty/success + user interaction | `artifacts/components.md` |
| Page (`src/pages/*.tsx`) | `renderWithProviders` + MSW: data render, empty state, one user flow (delete/filter/etc.) | `artifacts/pages.md` |
| Critical user flow (new or changed) | Playwright spec with `page.route` stubs | `artifacts/e2e.md` |

**How to use:** after implementing, walk each row that applies to what you touched; read the linked guide and verify the test exists before opening the PR (mirrors `/code-review-task`'s test-sufficiency gate).

## 4. Artifact Type Quick Reference

| Artifact Type | Pattern | Test Layer(s) | Guide |
|---|---|---|---|
| Services | `src/services/*.ts` | MSW integration (+ unit-style for parsing branches) | `artifacts/services.md` |
| Utils | `src/utils/*.ts` | Unit | `artifacts/utils.md` |
| Hooks | `src/hooks/use*.tsx` | `renderHook` + MSW integration | `artifacts/hooks.md` |
| Contexts | `src/contexts/*.tsx` | `renderHook`/`render` + MSW integration | `artifacts/contexts.md` |
| Components | `src/components/*.tsx` | RTL unit (hook mocked) | `artifacts/components.md` |
| Pages | `src/pages/*.tsx` | RTL + MSW integration | `artifacts/pages.md` |
| E2E specs | `e2e/*.spec.ts` | Playwright, real browser | `artifacts/e2e.md` |
| Future types (auth guards, error boundaries) | — | — | `artifacts/future-types.md` |

## 5. Anti-patterns — Do NOT Do This

- ❌ **Mock the service inside a hook's own test** — defeats the MSW-backed HTTP contract check; mock the hook only in *component* tests (`artifacts/hooks.md`, `artifacts/components.md`)
- ❌ **Use MSW in Playwright E2E specs** — MSW's Service Worker makes requests invisible to `page.route`; stub with `page.route` only (`artifacts/e2e.md`)
- ❌ **Add a test case per CRUD field variant with no branching** — one contract test per service method is enough (`artifacts/services.md`)
- ❌ **Assert CSS classes or component internal state** — assert what the user sees (`getByRole`/`getByText`/`getByLabelText`) — see `.claude/rules/coding-style.md`
- ❌ **Re-test hook/component branches inside a page integration test** — pages test composition, not logic already covered elsewhere (§1)
- ❌ **Forget `server.resetHandlers()` semantics** — already wired globally in `vitest.setup.ts`; don't add a second manual reset that could mask leakage (`references/gotchas.md`)
- ❌ **Ship a new mapped `error.code` without a named test** — every code in `ERROR_MESSAGES` needs one test (`artifacts/services.md`, `artifacts/hooks.md`)
- ❌ **Snapshot-only, mock-heavy, or assertion-free tests** — full anti-pattern list in `docs/testing-strategy.md` §Qualidade de teste (kept there, not duplicated here)

## 6. E2E Terminology Note

This project's `e2e/*.spec.ts` are **real-browser Playwright tests** (Chromium, built app, `page.route` network stubs) — not HTTP-only "supertest-style" tests. This differs from how some testing literature (and the universal fundamentals this guide is derived from) uses "E2E" to mean a server-only HTTP integration test. When cross-referencing outside sources, keep this distinction in mind: hf-frontend's E2E layer exercises real rendering, navigation, and user interaction, in addition to the HTTP contract.

## 7. References

| Topic | File |
|---|---|
| External system (HTTP) mock strategy | `references/external-systems.md` |
| Mock health rules & boundary principle | `references/mock-health-rules.md` |
| File naming, directory structure | `references/file-conventions.md` |
| Stack-specific gotchas & pitfalls | `references/gotchas.md` |

## 8. How to Use This Guide

- **This file (SKILL.md)** — always loaded. Core rules, quick reference, anti-patterns.
- **`artifacts/`** — one file per artifact type. Read the relevant file when creating or modifying that type.
- **`references/`** — supporting content. Read when you need mock strategy, conventions, or gotcha details.

When working on a feature:
1. Check §3 to identify which artifacts need tests.
2. Read the corresponding `artifacts/*.md` file for the complete recipe.
3. Consult `references/` as needed.
4. For coverage targets and anti-pattern checklist, see `docs/testing-strategy.md` (kept as the project's single source for those, not duplicated here).
