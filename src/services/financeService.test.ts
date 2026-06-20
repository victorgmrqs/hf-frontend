import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { financeService } from './financeService';
import { server } from '../test/msw/server';

// Captura a última request para validar o contrato (método/URL/query/body) que o
// financeService monta. Os métodos são finos sobre apiFetch (já testado em api.test).
interface Captured {
  method: string;
  pathname: string;
  search: string;
  body: unknown;
}
let captured: Captured | null;

beforeEach(() => {
  captured = null;
  server.use(
    http.all('*', async ({ request }) => {
      let body: unknown = null;
      try {
        body = await request.clone().json();
      } catch {
        body = null;
      }
      const url = new URL(request.url);
      captured = { method: request.method, pathname: url.pathname, search: url.search, body };
      return HttpResponse.json({ data: [], error: null });
    }),
  );
});

describe('financeService — construção de query (GET)', () => {
  it('getExpenses sem filtros não adiciona query', async () => {
    await financeService.getExpenses('u1');
    expect(captured?.method).toBe('GET');
    expect(captured?.pathname).toBe('/api/v1/expenses/user/u1');
    expect(captured?.search).toBe('');
  });

  it('getExpenses inclui apenas os filtros informados', async () => {
    await financeService.getExpenses('u1', '2026-06', 'SHARED', 'cat1');
    const p = new URLSearchParams(captured?.search);
    expect(p.get('competence')).toBe('2026-06');
    expect(p.get('type')).toBe('SHARED');
    expect(p.get('category_id')).toBe('cat1');
  });

  it('getTotals e getBudgetStatus passam competence/user na query', async () => {
    await financeService.getTotals('u1', '2026-06');
    expect(captured?.pathname).toBe('/api/v1/expenses/user/u1/totals');
    expect(new URLSearchParams(captured?.search).get('competence')).toBe('2026-06');

    await financeService.getBudgetStatus('u1', '2026-06');
    expect(captured?.pathname).toBe('/api/v1/budgets/status');
    const p = new URLSearchParams(captured?.search);
    expect(p.get('user_id')).toBe('u1');
    expect(p.get('competence')).toBe('2026-06');
  });

  it('getExpenseTotalsByCategory monta GET /expenses/totals/by-category?user_id&competence', async () => {
    await financeService.getExpenseTotalsByCategory('u1', '2026-06');
    expect(captured?.method).toBe('GET');
    expect(captured?.pathname).toBe('/api/v1/expenses/totals/by-category');
    const p = new URLSearchParams(captured?.search);
    expect(p.get('user_id')).toBe('u1');
    expect(p.get('competence')).toBe('2026-06');
  });

  it('getAccountsPayable inclui status só quando informado', async () => {
    await financeService.getAccountsPayable('u1');
    expect(new URLSearchParams(captured?.search).has('status')).toBe(false);

    await financeService.getAccountsPayable('u1', 'PENDING');
    expect(new URLSearchParams(captured?.search).get('status')).toBe('PENDING');
  });
});

describe('financeService — mutações (método/URL/body)', () => {
  const cases: {
    name: string;
    run: () => Promise<unknown>;
    method: string;
    pathname: string;
    body?: unknown;
    searchHas?: [string, string];
  }[] = [
    { name: 'createBudget', run: () => financeService.createBudget({ amount: 10 }), method: 'POST', pathname: '/api/v1/budgets', body: { amount: 10 } },
    { name: 'updateBudget', run: () => financeService.updateBudget('b1', 'u1', { amount: 5, alert_threshold: 70 }), method: 'PUT', pathname: '/api/v1/budgets/b1', body: { amount: 5, alert_threshold: 70 }, searchHas: ['requester_id', 'u1'] },
    { name: 'deleteBudget', run: () => financeService.deleteBudget('b1', 'u1'), method: 'DELETE', pathname: '/api/v1/budgets/b1', searchHas: ['requester_id', 'u1'] },
    { name: 'copyBudgetsFromPrevious', run: () => financeService.copyBudgetsFromPrevious('u1', '2026-06'), method: 'POST', pathname: '/api/v1/budgets/copy-from-previous', body: { user_id: 'u1', target_competence: '2026-06' } },
    { name: 'createCategory', run: () => financeService.createCategory({ name: 'X' }), method: 'POST', pathname: '/api/v1/categories', body: { name: 'X' } },
    { name: 'updateCategory', run: () => financeService.updateCategory('c1', { name: 'Y' }), method: 'PUT', pathname: '/api/v1/categories/c1', body: { name: 'Y' } },
    { name: 'deleteCategory', run: () => financeService.deleteCategory('c1'), method: 'DELETE', pathname: '/api/v1/categories/c1' },
    { name: 'createPaymentMethod', run: () => financeService.createPaymentMethod({ name: 'PM' }), method: 'POST', pathname: '/api/v1/payment-methods', body: { name: 'PM' } },
    { name: 'updatePaymentMethod', run: () => financeService.updatePaymentMethod('p1', { name: 'PM2' }), method: 'PUT', pathname: '/api/v1/payment-methods/p1', body: { name: 'PM2' } },
    { name: 'deletePaymentMethod', run: () => financeService.deletePaymentMethod('p1', 'u1'), method: 'DELETE', pathname: '/api/v1/payment-methods/p1', searchHas: ['requester_id', 'u1'] },
    { name: 'createExpense', run: () => financeService.createExpense({ value: 9 }), method: 'POST', pathname: '/api/v1/expenses', body: { value: 9 } },
    { name: 'updateExpenseCategory', run: () => financeService.updateExpenseCategory('e1', 'u1', 'cat1'), method: 'PATCH', pathname: '/api/v1/expenses/e1/category', body: { category_id: 'cat1' }, searchHas: ['requester_id', 'u1'] },
    { name: 'updateExpenseCategory (null)', run: () => financeService.updateExpenseCategory('e1', 'u1', null), method: 'PATCH', pathname: '/api/v1/expenses/e1/category', body: { category_id: null } },
    { name: 'updateExpense', run: () => financeService.updateExpense('e1', 'u1', { value: 3 }), method: 'PUT', pathname: '/api/v1/expenses/e1', body: { value: 3 }, searchHas: ['requester_id', 'u1'] },
    { name: 'deleteExpense', run: () => financeService.deleteExpense('e1', 'u1'), method: 'DELETE', pathname: '/api/v1/expenses/e1', searchHas: ['requester_id', 'u1'] },
    { name: 'createAccountPayable', run: () => financeService.createAccountPayable({ amount: 1 }), method: 'POST', pathname: '/api/v1/accounts-payable', body: { amount: 1 } },
    { name: 'payAccountPayable', run: () => financeService.payAccountPayable('a1', 'u1', { paid_at: 'x' }), method: 'POST', pathname: '/api/v1/accounts-payable/a1/pay', body: { paid_at: 'x' }, searchHas: ['requester_id', 'u1'] },
    { name: 'updateAccountPayable', run: () => financeService.updateAccountPayable('a1', 'u1', { amount: 2 }), method: 'PUT', pathname: '/api/v1/accounts-payable/a1', body: { amount: 2 }, searchHas: ['requester_id', 'u1'] },
    { name: 'deleteAccountPayable', run: () => financeService.deleteAccountPayable('a1', 'u1'), method: 'DELETE', pathname: '/api/v1/accounts-payable/a1', searchHas: ['requester_id', 'u1'] },
  ];

  it.each(cases)('$name → método, URL e body corretos', async ({ run, method, pathname, body, searchHas }) => {
    await run();
    expect(captured?.method).toBe(method);
    expect(captured?.pathname).toBe(pathname);
    if (body !== undefined) expect(captured?.body).toEqual(body);
    if (searchHas) expect(new URLSearchParams(captured?.search).get(searchHas[0])).toBe(searchHas[1]);
  });
});

describe('financeService — GET simples', () => {
  it.each([
    ['getUsers', () => financeService.getUsers(), '/api/v1/users'],
    ['getCategories', () => financeService.getCategories(), '/api/v1/categories'],
    ['getPaymentMethods', () => financeService.getPaymentMethods('u1'), '/api/v1/payment-methods/user/u1'],
    ['getBudgets', () => financeService.getBudgets('u1', '2026-06'), '/api/v1/budgets'],
  ] as const)('%s → GET %s', async (_name, run, pathname) => {
    await run();
    expect(captured?.method).toBe('GET');
    expect(captured?.pathname).toBe(pathname);
  });
});

describe('financeService — propagação de erro do envelope', () => {
  it('propaga { data:null, error } com error.code do backend', async () => {
    server.use(
      http.get('*/budgets/status', () =>
        HttpResponse.json(
          { data: null, error: { code: 'DSP-001', message: 'inválido', trace_id: 't1' } },
          { status: 400 },
        ),
      ),
    );
    const { data, error } = await financeService.getBudgetStatus('u1', '2026-06');
    expect(data).toBeNull();
    expect(error).toEqual({ code: 'DSP-001', message: 'inválido', trace_id: 't1' });
  });
});

describe('financeService.getAvailableCompetences', () => {
  it('injeta o mês atual, deduplica e ordena desc', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    server.use(
      http.get('*/expenses/user/*', () =>
        HttpResponse.json({
          data: [{ competence: '2026-05' }, { competence: '2026-05' }, { competence: '2026-03' }],
          error: null,
        }),
      ),
    );

    const result = await financeService.getAvailableCompetences('u1');
    expect(result).toEqual(['2026-06', '2026-05', '2026-03']);
    vi.useRealTimers();
  });

  it('não duplica quando o mês atual já está presente', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    server.use(
      http.get('*/expenses/user/*', () =>
        HttpResponse.json({ data: [{ competence: '2026-06' }], error: null }),
      ),
    );

    expect(await financeService.getAvailableCompetences('u1')).toEqual(['2026-06']);
    vi.useRealTimers();
  });

  it('retorna [] quando não há dados', async () => {
    server.use(
      http.get('*/expenses/user/*', () =>
        HttpResponse.json({ data: null, error: { code: 'X' } }, { status: 500 }),
      ),
    );
    expect(await financeService.getAvailableCompetences('u1')).toEqual([]);
  });
});
