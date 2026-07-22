> Part of the `testing-guide-hf-frontend` skill (see `../SKILL.md`).

# Pages (`src/pages/*.tsx`)

## What to test

- The page renders data coming from its hooks/context through to the composed components (proves wiring, not the components' own branch logic).
- Empty state when there's no data.
- One full user flow per significant action the page exposes (delete + confirm, filter, paginate, copy-from-previous, open a modal and submit) — enough to prove the page connects the action to the right service call and re-renders.
- Toast/feedback on success and on error (mocked `sonner`).

## Layer assignment

Full integration: real component tree via `renderWithProviders` (wraps router + context providers) + MSW. This is the composition layer — it does not re-assert component branch rendering (`artifacts/components.md`) or hook state transitions (`artifacts/hooks.md`), both already covered at their own layers.

## Setup pattern

```tsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SomePage from './SomePage';
import { renderWithProviders } from '../test/renderWithProviders';
import { pageHandlers } from '../test/msw/pageHandlers';
import { server } from '../test/msw/server';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  server.use(...pageHandlers); // handlers padrão para os endpoints que a página sempre chama
});

describe('SomePage (integração)', () => {
  it('renderiza os dados vindos da API', async () => {
    server.use(http.get('*/some-path', () => HttpResponse.json({ data: [{ id: '1' }], error: null })));
    renderWithProviders(<SomePage />);
    expect(await screen.findByText('...')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há dados', async () => {
    renderWithProviders(<SomePage />);
    await waitFor(() => expect(screen.getByText(/Nenhum .* encontrado/)).toBeInTheDocument());
  });

  it('exclui um item: confirma e chama o service', async () => {
    const user = userEvent.setup();
    server.use(/* GET + DELETE handlers */);
    renderWithProviders(<SomePage />);
    await user.click(await screen.findByRole('button', { name: /excluir/i }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });
});
```

Add new default handlers to `src/test/msw/pageHandlers.ts` only when most page tests need them; override per-test with `server.use(...)` for anything specific to one scenario (see `Budgets.test.tsx`).

## When to skip

- Do not add a page-level test for every component branch state — that belongs in `artifacts/components.md`.
- Do not add a page-level test for every hook error code — that belongs in `artifacts/hooks.md`. One representative error-path test per page is enough to prove the page surfaces it.

## Examples from project

- `Budgets.test.tsx` — render from API, empty state, delete flow (confirm modal → toast), copy-from-previous flow.
- `Expenses.test.tsx`, `AccountsPayable.test.tsx`, `Dashboard.test.tsx`, `Income.test.tsx`, `Settings.test.tsx` — same pattern per page (HF-79 backfill).
