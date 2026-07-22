> Part of the `testing-guide-hf-frontend` skill (see `../SKILL.md`).

# Hooks (`src/hooks/use*.tsx`)

## What to test

- Every state transition the hook exposes: initial/loading, success, each mapped `error.code`, and any special non-error state (e.g., `notFound` for a 404 that means "not configured yet", not a failure).
- Cancellation of stale responses on unmount or when a dependency (user, competence) changes — if the hook implements this (see `useGlobalBudget`'s `cancelled` flag), assert it doesn't set state after being superseded.
- `refresh()`/refetch functions, if exposed.

## Layer assignment

Always MSW-backed integration — a hook that fetches data crosses the HTTP boundary, so per §1 of the main guide it is tested with the **real hook + real service + MSW-faked HTTP**, never with the service mocked. There is no separate unit layer for these hooks: the branching (loading/error/notFound) and the HTTP contract are proven together in the same test.

Exception: a hook with pure client-side logic and no fetch (rare in this project) would be unit-only, following `artifacts/utils.md` instead.

## Setup pattern

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ReactNode } from 'react';
import { UserProvider } from './useUser';
import { useSomeHook } from './useSomeHook';
import { server } from '../test/msw/server';

const wrapper = ({ children }: { children: ReactNode }) => <UserProvider>{children}</UserProvider>;

describe('useSomeHook', () => {
  it('busca os dados e popula o estado', async () => {
    server.use(http.get('*/some-path', () => HttpResponse.json({ data: { id: '1' }, error: null })));
    const { result } = renderHook(() => useSomeHook('arg'), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.error).toBeNull();
  });

  it('mapeia error.code X para mensagem pt-BR', async () => {
    server.use(http.get('*/some-path', () =>
      HttpResponse.json({ data: null, error: { code: 'X' } }, { status: 400 })));
    const { result } = renderHook(() => useSomeHook('arg'), { wrapper });
    await waitFor(() => expect(result.current.error).toBe('<mensagem esperada>'));
  });
});
```

Wrap with `UserProvider` (or the relevant context provider) whenever the hook depends on `useUser`/`useCompetence` internally — do not mock those away; they're cheap to provide for real.

## When to skip

- Do not add a case for every possible input value if the hook's logic doesn't branch on it — one happy path + one per distinct state (loading/error/notFound/empty) is enough.
- Do not duplicate a component's rendering assertions here — this layer proves state, not markup.

## Examples from project

- `useBalance` — loading, success (numeric conversion), 4 distinct `error.code` mappings, unknown-code fallback (`useBalance.test.tsx`).
- `useGlobalBudget` — loading, success, `notFound` (404 = no budget yet, not an error), error, cancellation on unmount/competence change (`useGlobalBudget.test.tsx`).
- `useUser` — `localStorage` restoration/fallback, persistence, error state (`useUser.test.tsx`).
