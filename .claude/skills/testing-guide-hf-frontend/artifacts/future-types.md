> Part of the `testing-guide-hf-frontend` skill (see `../SKILL.md`).

# Future artifact types (not yet present)

Proactive guidance for artifact types this project doesn't have yet but is likely to add, based on the roadmap visible in Jira (HF-86 auth) and common React app evolution.

## Auth guards / protected routes (HF-86)

When `src/services/api.ts` gains Bearer JWT + refresh (HF-86), and routes become protected:

- **Unit/hook layer:** the token-attach and 401→refresh→retry logic in `apiFetch` needs MSW-backed tests: request carries `Authorization: Bearer <token>`; a 401 triggers exactly one refresh + retry; refresh failure clears the session and propagates the error without an infinite retry loop.
- **Component layer:** a `ProtectedRoute`/`RequireAuth` wrapper component, if introduced, is tested like any component with branching — mock the auth hook/context, assert redirect-to-login vs render-children for each state.
- **E2E layer:** login success, session maintained across a simulated token refresh, logout — these are the "auth (login+refresh)" E2E cases already flagged as pending in `docs/testing-strategy.md`.

## Error boundaries

If a React `ErrorBoundary` component is introduced (none exists today):

- **Component layer:** render a child that throws, assert the fallback UI renders instead of crashing the tree. Use `vitest`'s `vi.spyOn(console, 'error').mockImplementation(() => {})` to silence the expected React error log for that one test.
- Do not test the boundary's interaction with every possible child error — one thrown-error case proving the fallback renders is enough (this is a "wiring" concern, not branching business logic).

## New services for a third backend

If hf-frontend ever consumes a third REST backend, follow the exact pattern in `artifacts/services.md` and `references/external-systems.md`: add its `baseUrl` to `src/config`, add MSW handlers keyed to its URL prefix, and assert `href.startsWith(config.<newApi>.baseUrl)` in the contract test, same as `incomeService.test.ts` already does for the second backend.
