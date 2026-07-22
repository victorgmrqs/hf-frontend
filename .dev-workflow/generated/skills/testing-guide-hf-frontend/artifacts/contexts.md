> Part of the `testing-guide-hf-frontend` skill (see `../SKILL.md`).

# Contexts (`src/contexts/*.tsx`)

## What to test

Same as `artifacts/hooks.md` — a context that fetches/holds shared state (e.g., `BudgetsContext`) is tested exactly like a hook: state transitions, error mapping, and the guard that throws when consumed outside its provider.

## Layer assignment

MSW-backed integration, same reasoning as hooks (§1 of the main guide) — a context wrapping a fetch crosses the HTTP boundary.

The "used outside provider" guard (e.g., `useBudgets must be used within a BudgetsProvider`) is a pure branch with no HTTP involved — assert it directly by rendering a probe component without the provider, no MSW needed for that specific case.

## Setup pattern

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BudgetsProvider, useBudgets } from './BudgetsContext';

function Probe() {
  const ctx = useBudgets();
  return <span>{ctx.someValue}</span>;
}

it('lança quando usado fora do provider', () => {
  expect(() => render(<Probe />)).toThrow('useBudgets must be used within a BudgetsProvider');
});

it('expõe o estado quando dentro do provider', async () => {
  // server.use(...) para os endpoints que o provider busca, então render(<BudgetsProvider><Probe /></BudgetsProvider>)
});
```

## When to skip

Same as hooks — don't duplicate component-level rendering assertions here.

## Examples from project

- `BudgetsContext` — provider guard + data fetching, same pattern as `useBalance`/`useGlobalBudget` (`BudgetsContext.test.tsx`).
