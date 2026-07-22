> Part of the `testing-guide-hf-frontend` skill (see `../SKILL.md`).

# Services (`src/services/*.ts`)

## What to test

- The HTTP contract your method builds: method, URL path, query params, request body — this is what `apiFetch` sends over the wire.
- Propagation of the `{data, error}` envelope: on backend error, the method must return `{data: null, error}` unchanged, never swallow or reshape it.
- Any parsing/normalization branch (e.g., converting a raw string decimal to `number`, or — since HF-120 — accepting both a flat array and a nested payload shape). Each branch needs its own case.
- Every `error.code` the service or its callers map to pt-BR must have a dedicated test (cross-reference `errorMessage.test.ts`).

## Layer assignment

| Characteristic | Layer |
|---|---|
| Simple CRUD passthrough (builds URL/body, no branching) | MSW-backed contract test only — one case verifying method/URL/body |
| Parsing/normalization branching (e.g., raw→typed conversion, nested-payload handling) | Same MSW-backed test file, one case per branch (this *is* the unit-equivalent layer here — there's no separate "pure function" version to extract) |
| Error propagation | One case per relevant `error.code`/status, asserting `{data: null, error}` |

There is no additional "unit" layer above this — per §1 of the main guide, an MSW-backed service test already validates both the HTTP contract and any branching logic in the same file.

## Setup pattern

```ts
import { http, HttpResponse } from 'msw';
import { describe, expect, it, beforeEach } from 'vitest';
import { server } from '../test/msw/server';
import { someService } from './someService';

describe('someService.someMethod', () => {
  it('monta GET com os parâmetros esperados', async () => {
    let captured: URL | undefined;
    server.use(http.get('*/some-path', ({ request }) => {
      captured = new URL(request.url);
      return HttpResponse.json({ data: [{ id: '1' }], error: null });
    }));

    const { data, error } = await someService.someMethod('arg1');

    expect(captured?.pathname).toMatch(/\/some-path$/);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: '1' }]);
  });

  it('propaga o erro do envelope sem transformar', async () => {
    server.use(http.get('*/some-path', () =>
      HttpResponse.json({ data: null, error: { code: 'SOME_CODE' } }, { status: 400 })));
    const { data, error } = await someService.someMethod('arg1');
    expect(data).toBeNull();
    expect(error).toEqual({ code: 'SOME_CODE' });
  });
});
```

For methods with two base URLs (`config.api.baseUrl` vs `config.incomeApi.baseUrl`), assert `captured.href.startsWith(config.incomeApi.baseUrl)` to prove the request went to the right backend (see `incomeService.test.ts`).

## When to skip

- Do not add a separate test per field of a CRUD body — one case proving method/URL/body is correct is enough (see `financeService.test.ts`'s `it.each(cases)` table pattern for many simple mutations in one block).
- Do not unit-test `apiFetch` itself from every service — it already has its own `api.test.ts`.

## Examples from project

- `financeService.getExpenses` / `incomeService.getIncomes` — branching (flat array vs nested payload vs empty) → one MSW case per branch (`financeService.test.ts` describe block "formatos de payload (HF-120)").
- `financeService.createBudget`, `updateCategory`, etc. — simple CRUD, no branching → covered once each in the `it.each(cases)` table in `financeService.test.ts`.
- `incomeService.getBalance`, `getGlobalBudget` — raw string→number conversion → dedicated case asserting the converted numeric value.
