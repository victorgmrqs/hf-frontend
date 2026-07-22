> Part of the `testing-guide-hf-frontend` skill (see `../SKILL.md`).

# External systems: mock strategy

hf-frontend has exactly one class of external system: **remote REST APIs** — hf-transaction-service (`config.api.baseUrl`) and hf-income-service (`config.incomeApi.baseUrl`). No database, cache, queue, or email is faked or touched directly by this repo.

| System | Layer | Strategy | Why |
|---|---|---|---|
| hf-transaction-service (REST) | Unit/hook/component/page (Vitest) | **Fake — MSW** (`src/test/msw/`) | Deterministic, no network flakiness, shared handlers across test types |
| hf-income-service (REST) | Unit/hook/component/page (Vitest) | **Fake — MSW**, same server, different `baseUrl` matched in the handler | Same reasoning; distinguish by asserting `request.url` starts with `config.incomeApi.baseUrl` |
| Both backends | E2E (Playwright) | **Fake — `page.route`** | MSW's Service Worker is invisible to Playwright's network layer — the two fakes are mutually exclusive per test run; E2E always uses `page.route` |

## Setup & teardown

- **Vitest layers:** `src/test/msw/server.ts` (`setupServer`) is started once in `vitest.setup.ts` with `onUnhandledRequest: 'error'` — any request without a matching handler fails the test loudly instead of silently passing. `afterEach` calls `server.resetHandlers()` — never skip this when adding a new setup file, or handlers leak between tests.
- **Per-test overrides:** use `server.use(...)` inside the test (or `beforeEach`) to add scenario-specific handlers; they're cleared automatically after each test by the global `resetHandlers()`.
- **Page-level defaults:** `src/test/msw/pageHandlers.ts` holds handlers most page integration tests need (users, categories, etc.) — import and `server.use(...pageHandlers)` in a page test's `beforeEach`, then override per-scenario with more specific `server.use(...)` calls (last registration wins for a matching path).
- **E2E (Playwright):** register a broad `page.route('**/api/v1/**', ...)` catch-all first, then narrower routes after — Playwright resolves routes in reverse registration order, so the most specific route registered last wins.
