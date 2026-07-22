> Part of the `testing-guide-hf-frontend` skill (see `../SKILL.md`).

# Mock health rules

## The boundary rule, translated to this project

Mock across the boundary you're isolating, never within it:

- **In a component test:** mock the hook(s) it calls (`vi.spyOn(hookModule, 'useX').mockReturnValue(...)`) — the hook has its own MSW-backed test. Do not also stand up MSW handlers in a component test.
- **In a hook test:** do NOT mock the service the hook calls — use MSW to fake the HTTP response instead. Mocking the service would hide a broken query/URL/body, which is exactly what the hook test (per §1 of the main guide) exists to catch.
- **In a page test:** use the real component tree and real hooks, faked only at the HTTP layer (MSW) — this is the composition layer; nothing internal to it should be mocked.
- **In an E2E spec:** fake only at the network layer (`page.route`) — everything else (React, router, real DOM) is real.

If a test needs many mocks to set up, that's a signal: either the unit under test is doing too much (split it), or you're testing at the wrong layer (e.g., mocking three hooks in a "component" test probably means you're actually testing a page — move it to `artifacts/pages.md`).

## Framework-specific mocking patterns

- **Hook isolation:** `vi.spyOn(hookModule, 'useX')` + `.mockReturnValue({...})` — import the hook module with `import * as hookModule from '../hooks/useX'` so the spy can replace the named export. Reset with `vi.clearAllMocks()` in `beforeEach`.
- **Module mocking for side-effect libs:** `vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))` at the top of the file — `sonner` is a side-effect dependency (toast UI), not owned code, so full-module mock is appropriate here (unlike hooks, which get `vi.spyOn` to keep the rest of the module's real exports intact).
- **HTTP faking:** always MSW (`http.get/post/put/delete` + `HttpResponse.json`) in Vitest layers; always `page.route` in Playwright — never mix the two in the same test run.

## What NOT to mock

- Configured client-side primitives with no test-blocking side effects (e.g., `Intl.NumberFormat`, `URLSearchParams`) — use them for real; mocking them would hide a formatting bug.
- `apiFetch` itself inside a service test — let the real `apiFetch` run against the MSW-faked `fetch`, so the test also proves the service's URL-building code is correct, not just its parsing.
