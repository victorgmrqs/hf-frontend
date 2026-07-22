> Part of the `testing-guide-hf-frontend` skill (see `../SKILL.md`).

# Utils (`src/utils/*.ts`)

## What to test

- Every branch of a pure function: each conditional, each early return, each fallback value.
- Boundary/edge inputs: empty string, empty array, `null`/`undefined`, zero, negative, max — whatever the function's signature allows.
- For `errorMessage.ts` specifically: one named test per `error.code` in `ERROR_MESSAGES`, plus the fallback path (unknown code, missing code, non-object error).

## Layer assignment

Unit only — these are plain functions with no system boundary. No integration or E2E layer applies.

## Setup pattern

```ts
import { describe, expect, it } from 'vitest';
import { someUtil } from './someUtil';

describe('someUtil', () => {
  it('caminho feliz: descreve o comportamento esperado', () => {
    expect(someUtil('input')).toBe('expected');
  });

  it('trata o caso de borda X', () => {
    expect(someUtil('')).toBe('fallback');
  });
});
```

For `messageForError`, iterate the catalog to guarantee every code has a test without hand-listing each one twice:

```ts
it.each(Object.entries(ERROR_MESSAGES))('mapeia %s corretamente', (code, expected) => {
  expect(messageForError({ code })).toBe(expected);
});
```

## When to skip

- A function with a single execution path and no branching does not need a dedicated unit test (e.g., a one-line formatter with no conditional) — per the fundamentals' "single-path utilities" exclusion.
- Do not write a test whose assertion just repeats the implementation's literal return value with no independent expectation (mirror test).

## Examples from project

- `errorMessage.ts` (`messageForError`) — one test per mapped `error.code` + fallback cases (unknown code, no code, non-object error) — see `errorMessage.test.ts`.
- `formatCompetence.ts` — branching, tested per branch in `formatCompetence.test.ts`.
- `budgetAlert.ts`, `donut.ts` — same pattern: one case per conditional/threshold.
