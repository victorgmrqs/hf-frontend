export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
    timeout: 10000,
  },
  // hf-income-service (receitas/orçamento/saldo/metas) — serviço separado.
  incomeApi: {
    baseUrl: import.meta.env.VITE_INCOME_API_URL || 'http://localhost:8081/api/v1',
  },
  app: {
    name: 'Home Finance',
  }
} as const;

export type Config = typeof config;
