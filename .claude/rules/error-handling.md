---
paths:
  - "src/services/**/*.ts"
  - "src/hooks/**/*.tsx"
  - "src/components/**/*.tsx"
  - "src/utils/errorMessage.ts"
---
# Erros: envelope, mapeamento pt-BR, nunca cru ao usuário

- Toda resposta de API segue o envelope `{data, error}`; em falha, `error` é `{code, message, trace_id}`.
- Nunca renderizar `error.message`/`error.trace_id` do backend na UI — use `messageForError(error, fallback)` de `src/utils/errorMessage.ts`.
- Novo `error.code` tratado pela UI exige entrada em `ERROR_MESSAGES` (mesmo arquivo) + teste nomeado (ver rule `testing.md`).
- Estados especiais que não são erro (ex.: 404 = "sem recurso ainda") usam uma função de narrowing dedicada (ex. `isNotFound` em `useGlobalBudget.tsx`) — nunca `as any` para ler `error.code`.
- Hooks distinguem erro de rede (`.catch`) de erro de negócio (`result.error`) e podem usar mensagens de fallback diferentes para cada um.
- Nunca logar tokens/segredos; `console.error` só em dev, nunca com dado sensível ou payload cru do backend.
