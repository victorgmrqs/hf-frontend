---
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
  - "e2e/**/*.spec.ts"
---
# Convenções de teste

- Teste sempre co-localizado (`Component.tsx` + `Component.test.tsx`).
- Vitest + Testing Library: `describe('NomeDoArquivo')` com `it('descrição do comportamento em pt-BR')`.
- Mock de hook: `vi.spyOn(hookModule, 'useX').mockReturnValue(...)` — nunca mocke a própria unidade sob teste.
- Fixtures como factory com overrides (ex. `budget(over)`, `balance(over)`) — evita duplicação, mantém o teste legível.
- Integração com API: MSW via `ok(data)` / `fail(status, code, message)` de `src/test/msw/handlers.ts` — nunca mocke `fetch` manualmente.
- Assert pelo que o usuário vê: `getByRole`/`getByText`/`getByLabelText` — nunca classe CSS ou estado interno do componente.
- Cada `error.code` tratado pela UI tem 1 teste nomeado. Anti-padrões proibidos (trivial, snapshot-only, sem asserção, mock-heavy, detalhe de implementação, duplicado): ver `docs/testing-strategy.md` §Qualidade de teste.
