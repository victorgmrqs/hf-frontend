---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---
# Estilo de código

- Texto visível ao usuário (labels, mensagens, comentários de regra de negócio) em pt-BR; identificadores de código em inglês.
- `any` é proibido mesmo o linter só avisar (`@typescript-eslint/no-explicit-any: warn`); se inevitável, justifique em comentário na mesma linha.
- Componente de apresentação: `const Nome: React.FC<NomeProps> = ({...}) => {...}`; `export default Nome` ao final do arquivo.
- Hook/service: `export function useNome(...)` ou objeto nomeado exportado (ex. `export const incomeService = {...}`) — nunca `export default` para hooks/services.
- Interface de props sufixada `Props` (ex. `GlobalBudgetCardProps`), declarada logo acima do componente que a usa.
- Formatação monetária sempre via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` — nunca concatenar `"R$"` manualmente.
- Comentário só quando explica uma decisão não óbvia (referência a `HF-XX`/regra de domínio, workaround de bug do backend); não documente o óbvio.
