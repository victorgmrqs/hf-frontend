---
paths:
  - "src/services/**/*.ts"
---
# Convenções do cliente REST

- Todo acesso HTTP passa por `apiFetch<T>(endpoint, options?, baseUrl?)` (`services/api.ts`); retorna sempre `{data, error}`, nunca lança.
- Dois backends, dois base URLs — nunca hardcode URL: `config.api.baseUrl` (hf-transaction-service) e `config.incomeApi.baseUrl` (hf-income-service).
- Valores monetários chegam como string decimal (ex. `"1800.00"`); converta para `number` com um mapper `Raw* → *` dedicado (ex. `toGlobalBudget`) — nunca `parseFloat` direto no componente.
- Verbos: GET sem `method`; POST/PUT com `body: JSON.stringify(payload)`; DELETE com query params quando o contrato exigir (ex. `requester_id`).
- Todo endpoint consumido deve existir em `openapi.yaml`; se divergir, registrar pendência de contrato — nunca inventar campo/endpoint.
- Exporte uma `interface` por entidade de domínio; use um tipo `Raw*` interno só quando o shape da API difere do tipo de domínio.
