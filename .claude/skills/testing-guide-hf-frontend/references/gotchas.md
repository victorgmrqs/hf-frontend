> Part of the `testing-guide-hf-frontend` skill (see `../SKILL.md`).

# Gotchas & pitfalls

## Vitest coverage thresholds — `perFile` is all-or-nothing, not per-glob

`vitest.config.ts`'s `thresholds` has stricter glob keys for `src/services/**` and `src/utils/**` (90% vs the 80% global). Vitest's `perFile` flag is a single boolean for the *entire* thresholds config — it cannot be turned on only for those two globs. This project deliberately runs with `perFile` unset (aggregate-per-folder), which is why those two folders are checked as a 90% **aggregate**, not truly per individual file. If you need genuine per-file enforcement for a specific folder, you'd have to set `perFile: true` globally, which would also force 80%-per-file everywhere else — evaluate that trade-off before changing it.

## Vitest 4 version notes

Vitest 4 removed `coverage.all` and `ignoreEmptyLines`, and made AST-based V8 remapping the only coverage mode (no more Istanbul-style toggle). Some Vitest 4 release notes describe a minimum Vite 6 requirement — this project currently pins `vite@^5.4.10` with `vitest@^4.1.9`; if you hit a coverage/transform inconsistency after a dependency bump, check this combination first before assuming it's a test-writing mistake.

## MSW: don't remove the global unhandled-request guard

`vitest.setup.ts` sets `onUnhandledRequest: 'error'` — any request without a matching handler fails loudly. This is deliberate and already correct; don't relax it to `'warn'`/`'bypass'` to make a red test pass — a failing request usually means a missing handler for a real code path, not a broken test.

## MSW and Playwright are mutually exclusive per run

MSW installs a Service Worker that intercepts `fetch` before it reaches the network layer Playwright's `page.route` inspects — so a request faked by MSW is invisible to `page.route`, and vice versa. Never try to use MSW inside an `e2e/*.spec.ts` file; stub with `page.route` only (see `references/external-systems.md`).

## Playwright route resolution order

Playwright resolves `page.route` matchers in **reverse registration order** — the last-registered matching route wins. The project's convention is catch-all first (`page.route('**/api/v1/**', ...)`), then progressively more specific routes — if you register them in the opposite order, the catch-all will shadow your specific stub.

## jsdom polyfills

`jsdom` (used by Vitest's `environment: 'jsdom'`) doesn't implement `window.matchMedia`. `vitest.setup.ts` already polyfills it because some UI libraries query it on mount. If a new dependency throws on a missing browser API in tests, check whether it needs a similar polyfill added to `vitest.setup.ts` rather than mocking the dependency itself.

## `afterEach` cleanup order

`vitest.setup.ts` calls RTL's `cleanup()` and `server.resetHandlers()` in the same `afterEach` — if you add a new global setup file, keep both calls together; dropping either one causes cross-test leakage (stale DOM nodes or stale MSW handlers) that manifests as flaky, order-dependent test failures.
