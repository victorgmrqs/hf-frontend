> Part of the `testing-guide-hf-frontend` skill (see `../SKILL.md`).

# Components (`src/components/*.tsx`)

## What to test

- Every rendering branch: loading (skeleton), error (message shown), empty/not-found state, success state with real data.
- User interaction: clicks opening modals, form submission, confirm/cancel flows — assert the resulting behavior (modal opens, callback called), not internal state.
- Conditional visual elements tied to data (e.g., a badge shown only when a flag is true, an alert only when a threshold is exceeded).
- Accessible name/role of interactive elements (buttons, selects) — this project treats a11y as part of component correctness (see HF-82/84/85 in `CHANGELOG.md`).

## Layer assignment

Unit/component test, always with the data-fetching hook(s) **mocked** via `vi.spyOn(hookModule, 'useX').mockReturnValue(...)` — this isolates rendering/interaction logic from the hook, which already has its own MSW-backed test (`artifacts/hooks.md`). Do not also stand up MSW in a component test; if you find yourself doing that, the component is doing a hook's job and should either use a hook or be tested as a page (`artifacts/pages.md`).

## Setup pattern

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SomeCard from './SomeCard';
import * as useSomeHookModule from '../hooks/useSomeHook';

const hookSpy = vi.spyOn(useSomeHookModule, 'useSomeHook');

const mockHook = (over: Partial<ReturnType<typeof useSomeHookModule.useSomeHook>>) =>
  hookSpy.mockReturnValue({ data: null, loading: false, error: null, ...over });

beforeEach(() => vi.clearAllMocks());

describe('SomeCard', () => {
  it('mostra skeleton durante o carregamento', () => {
    mockHook({ loading: true });
    render(<SomeCard />);
    expect(screen.getByLabelText('Carregando...')).toBeInTheDocument();
  });

  it('mostra a mensagem de erro', () => {
    mockHook({ error: 'Algo deu errado.' });
    render(<SomeCard />);
    expect(screen.getByText('Algo deu errado.')).toBeInTheDocument();
  });

  it('interação do usuário abre o modal', async () => {
    const user = userEvent.setup();
    mockHook({ data: { id: '1' } });
    render(<SomeCard />);
    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByRole('heading', { name: /editar/i })).toBeInTheDocument();
  });
});
```

For modals/forms with `sonner` toasts, mock the module (`vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))`) and assert the call, per `Budgets.test.tsx`.

## When to skip

- Do not assert CSS class names or component internal state — assert what's visible/accessible (`getByRole`, `getByText`, `getByLabelText`).
- Do not re-implement the hook's own state-machine tests here — mock the hook's return value directly instead of exercising real state transitions.

## Examples from project

- `GlobalBudgetCard` — loading/error/notFound/success/exceeded-budget branches, badge visibility tied to `auto_adjusted`, modal open on click — hook mocked via `vi.spyOn` (`GlobalBudgetCard.test.tsx`).
- `ExpenseModal`, `BudgetModal`, etc. — form validation, submit success/error, accessible names for selects (HF-85).
