> Part of the `testing-guide-hf-frontend` skill (see `../SKILL.md`).

# E2E specs (`e2e/*.spec.ts`)

See §6 of the main `SKILL.md` for the terminology note — this layer is a **real-browser** Playwright test, not an HTTP-only test.

## What to test

- Only critical, cross-cutting user flows — not every page or every branch (those are covered at the component/hook/page layers). Per `docs/testing-strategy.md`: shared-expense creation, balance/budget display. Auth (login+refresh) is pending HF-86.
- The actual payload the UI sends to the backend for a critical write (e.g., asserting the captured `POST /expenses` body), when that payload shape is part of the contract.
- a11y: no serious axe violations on the routes covered by `e2e/a11y.spec.ts`.

## Layer assignment

E2E only — real Chromium via Playwright, against the built app (`npm run build && npm run preview`), with the backend stubbed via `page.route`. Never use MSW here (see anti-pattern in the main `SKILL.md` §5) — register a broad catch-all route first, then more specific routes after (last-registered route wins in Playwright).

## Setup pattern

```ts
import { expect, test } from '@playwright/test';
import { ok } from './stubs'; // helper: (body) => (route) => route.fulfill({ json: { data: body, error: null } })

test('fluxo crítico X', async ({ page }) => {
  // Catch-all primeiro — específicos depois têm precedência.
  await page.route('**/api/v1/**', (route) => route.fulfill(ok([])));
  await page.route('**/api/v1/some-path', (route, request) => {
    if (request.method() !== 'POST') return route.fulfill(ok([]));
    const payload = request.postDataJSON();
    return route.fulfill(ok({ id: '1', ...payload }));
  });

  await page.goto('/some-route');
  await page.getByRole('button', { name: 'Nova ação' }).click();
  // preencher formulário, submeter...
  await expect(page.getByText('Item criado')).toBeVisible();
});
```

## When to skip

- Do not write an E2E spec per page or per component state — reserve this layer for flows that genuinely span multiple pages/components/network calls, per `docs/testing-strategy.md`'s "poucos, fluxos críticos" guidance.
- Do not assert implementation details reachable only via DOM structure — assert visible text/roles, same as component tests.

## Examples from project

- `e2e/expense.spec.ts` — create a shared expense, verify the POST payload (SHARED type + `shared_user_ids`), verify it appears in the list.
- `e2e/balance.spec.ts` — balance cards, budget status, negative-projected-balance alert (SAL-05).
- `e2e/smoke.spec.ts` — basic navigation smoke test.
- `e2e/a11y.spec.ts` — axe on the 6 main routes, `violations === []`.
