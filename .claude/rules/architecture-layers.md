---
paths:
  - "src/pages/**/*.tsx"
  - "src/components/**/*.tsx"
  - "src/hooks/**/*.tsx"
  - "src/services/**/*.ts"
---
# Direção de dependência entre camadas

Fluxo único: `pages` → `components`/`hooks` → `services` → `api.ts`. Nunca o inverso.

- Toda chamada à API passa por `src/services` — nunca `fetch` solto em componente ou página.
- Regra de negócio (cálculo, validação de domínio) nunca vive no frontend — é responsabilidade do backend; aqui é só apresentação/UX.
- Estado de dados assíncronos (loading/erro/dados) vive em hooks (`src/hooks`), não em componentes de apresentação.
- Componentes de apresentação (`src/components`) não importam `src/services` diretamente — sempre por um hook.
- Páginas (`src/pages`) compõem componentes + hooks; não implementam fetch próprio.

Exemplo real: `GlobalBudgetCard` (componente) usa `useGlobalBudget` (hook) que chama `incomeService.getGlobalBudget` (service) que chama `apiFetch` (`api.ts`).
