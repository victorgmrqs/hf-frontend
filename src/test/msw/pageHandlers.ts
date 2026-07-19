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
  // Padrão: sem teto global definido (404 BUDGET_NOT_FOUND) — HF-45.
  http.get('*/budgets/global', () =>
    HttpResponse.json({ data: null, error: { code: 'BUDGET_NOT_FOUND' } }, { status: 404 })),
  http.get('*/budgets', () => ok([])),
  http.get('*/categories', () => ok([])),
  http.get('*/payment-methods/user/:id', () => ok([])),
  http.get('*/accounts-payable', () => ok([])),
  http.get('*/balance', () => ok({
    user_id: 'u1', competence: '2026-06', total_income: '0', total_personal: '0',
    total_shared: '0', total_expenses: '0', balance_today: '0', committed_bills: '0',
    projected_balance: '0', is_projected_negative: false,
  })),
];
