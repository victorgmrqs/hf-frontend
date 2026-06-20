import { http, HttpResponse } from 'msw';

const ok = (data: unknown) => HttpResponse.json({ data, error: null });

/**
 * Handlers GET padrão para testes de integração das páginas: usuário presente
 * (para o UserProvider selecionar currentUser) e demais listas vazias. Cada teste
 * sobrescreve o que precisa com `server.use(...)` para os cenários de dados/erro.
 */
export const pageHandlers = [
  http.get('*/users', () => ok([{ id: 'u1', name: 'Ana', email: 'ana@hf.com' }])),
  http.get('*/expenses/user/:id/totals', () => ok({ total_personal: 0, total_shared: 0, total_general: 0 })),
  http.get('*/expenses/totals/by-category', () => ok([])),
  http.get('*/expenses/user/:id', () => ok([])),
  http.get('*/budgets/status', () => ok([])),
  http.get('*/budgets', () => ok([])),
  http.get('*/categories', () => ok([])),
  http.get('*/payment-methods/user/:id', () => ok([])),
  http.get('*/accounts-payable', () => ok([])),
];
