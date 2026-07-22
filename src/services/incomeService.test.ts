import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { incomeService } from './incomeService';
import { config } from '../config';
import { server } from '../test/msw/server';

interface Captured { method: string; href: string; pathname: string; search: string; }
let captured: Captured | null;

beforeEach(() => {
  captured = null;
  server.use(
    http.all('*', async ({ request }) => {
      const url = new URL(request.url);
      captured = { method: request.method, href: url.href, pathname: url.pathname, search: url.search };
      return HttpResponse.json({ data: [], error: null });
    }),
  );
});

describe('incomeService', () => {
  it('getIncomes aponta para o base URL do income-service', async () => {
    await incomeService.getIncomes('u1', '2026-06');
    expect(captured?.href.startsWith(config.incomeApi.baseUrl)).toBe(true);
    expect(captured?.method).toBe('GET');
    expect(captured?.pathname).toMatch(/\/income$/);
    const p = new URLSearchParams(captured?.search);
    expect(p.get('user_id')).toBe('u1');
    expect(p.get('competence')).toBe('2026-06');
    expect(p.has('type')).toBe(false);
  });

  it('getIncomes inclui type quando informado', async () => {
    await incomeService.getIncomes('u1', '2026-06', 'SALARY');
    expect(new URLSearchParams(captured?.search).get('type')).toBe('SALARY');
  });

  it('deleteIncome faz DELETE /income/:id?requester_id', async () => {
    await incomeService.deleteIncome('i1', 'u1');
    expect(captured?.method).toBe('DELETE');
    expect(captured?.pathname).toMatch(/\/income\/i1$/);
    expect(new URLSearchParams(captured?.search).get('requester_id')).toBe('u1');
  });

  it('createIncome faz POST /income com o corpo', async () => {
    let seen: { url: string; body: Record<string, unknown> } | undefined;
    server.use(http.post('*/income', async ({ request }) => {
      seen = { url: request.url, body: (await request.json()) as Record<string, unknown> };
      return HttpResponse.json({ data: { id: 'i1' }, error: null }, { status: 201 });
    }));
    await incomeService.createIncome({ user_id: 'u1', description: 'Salário', amount: 7500, type: 'SALARY', date: '2026-06-05', competence: '2026-06', recurrent: true });
    expect(seen?.url).toMatch(/\/income$/);
    expect(seen?.body).toMatchObject({ description: 'Salário', amount: 7500, type: 'SALARY', recurrent: true });
  });

  it('updateIncome faz PUT /income/:id com os campos editáveis', async () => {
    let seen: { url: string; body: Record<string, unknown> } | undefined;
    server.use(http.put('*/income/i1', async ({ request }) => {
      seen = { url: request.url, body: (await request.json()) as Record<string, unknown> };
      return HttpResponse.json({ data: { id: 'i1' }, error: null });
    }));
    await incomeService.updateIncome('i1', { requester_id: 'u1', description: 'Reajuste', amount: 8200, recurrent: true });
    expect(seen?.url).toMatch(/\/income\/i1$/);
    expect(seen?.body).toMatchObject({ requester_id: 'u1', description: 'Reajuste', amount: 8200, recurrent: true });
  });

  it('propaga erro do envelope (error.code REC)', async () => {
    server.use(http.delete('*/income/i1', () => HttpResponse.json({ data: null, error: { code: 'REC-03' } }, { status: 400 })));
    const { data, error } = await incomeService.deleteIncome('i1', 'u1');
    expect(data).toBeNull();
    expect(error).toEqual({ code: 'REC-03' });
  });

  it('getBalance faz GET /balance no base URL do income com user_id e competence', async () => {
    await incomeService.getBalance('u1', '2026-06');
    expect(captured?.href.startsWith(config.incomeApi.baseUrl)).toBe(true);
    expect(captured?.method).toBe('GET');
    expect(captured?.pathname).toMatch(/\/balance$/);
    const p = new URLSearchParams(captured?.search);
    expect(p.get('user_id')).toBe('u1');
    expect(p.get('competence')).toBe('2026-06');
  });

  it('getBalance converte os valores monetários string em number', async () => {
    server.use(http.get('*/balance', () =>
      HttpResponse.json({ data: rawBalance({ balance_today: '4300.00', projected_balance: '3450.50' }), error: null })));
    const { data, error } = await incomeService.getBalance('u1', '2026-06');
    expect(error).toBeNull();
    expect(data?.balance_today).toBe(4300);
    expect(data?.projected_balance).toBe(3450.5);
    expect(data?.is_projected_negative).toBe(false);
  });

  it('getBalance propaga o envelope de erro (UPSTREAM_TIMEOUT) sem mapear', async () => {
    server.use(http.get('*/balance', () =>
      HttpResponse.json({ data: null, error: { code: 'UPSTREAM_TIMEOUT', message: 'x' } }, { status: 503 })));
    const { data, error } = await incomeService.getBalance('u1', '2026-06');
    expect(data).toBeNull();
    expect(error).toEqual({ code: 'UPSTREAM_TIMEOUT', message: 'x' });
  });
});

describe('incomeService — teto global (ORC)', () => {
  const rawGlobalBudget = (overrides: Record<string, unknown> = {}) => ({
    id: 'gb1', user_id: 'u1', competence: '2026-07', ceiling: '2500.00',
    auto_adjusted: false, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  });

  it('getGlobalBudget faz GET /budgets/global no base URL do income e converte ceiling para number', async () => {
    let seenUrl: URL | undefined;
    server.use(http.get('*/budgets/global', ({ request }) => {
      seenUrl = new URL(request.url);
      return HttpResponse.json({ data: rawGlobalBudget({ auto_adjusted: true }), error: null });
    }));
    const { data, error } = await incomeService.getGlobalBudget('u1', '2026-07');
    expect(seenUrl?.href.startsWith(config.incomeApi.baseUrl)).toBe(true);
    expect(seenUrl?.pathname).toMatch(/\/budgets\/global$/);
    expect(seenUrl?.searchParams.get('user_id')).toBe('u1');
    expect(seenUrl?.searchParams.get('competence')).toBe('2026-07');
    expect(error).toBeNull();
    expect(data?.ceiling).toBe(2500);
    expect(data?.auto_adjusted).toBe(true);
  });

  it('getGlobalBudget propaga BUDGET_NOT_FOUND (404 = sem teto definido) com data null', async () => {
    server.use(http.get('*/budgets/global', () =>
      HttpResponse.json({ data: null, error: { code: 'BUDGET_NOT_FOUND' } }, { status: 404 })));
    const { data, error } = await incomeService.getGlobalBudget('u1', '2026-07');
    expect(data).toBeNull();
    expect(error).toEqual({ code: 'BUDGET_NOT_FOUND' });
  });

  it('createGlobalBudget faz POST /budgets/global com user_id, competence e ceiling', async () => {
    let seen: { url: string; body: Record<string, unknown> } | undefined;
    server.use(http.post('*/budgets/global', async ({ request }) => {
      seen = { url: request.url, body: (await request.json()) as Record<string, unknown> };
      return HttpResponse.json({ data: rawGlobalBudget(), error: null }, { status: 201 });
    }));
    const { data, error } = await incomeService.createGlobalBudget('u1', '2026-07', 2500);
    expect(seen?.url).toMatch(/\/budgets\/global$/);
    expect(seen?.body).toEqual({ user_id: 'u1', competence: '2026-07', ceiling: 2500 });
    expect(error).toBeNull();
    expect(data?.ceiling).toBe(2500);
  });

  it('createGlobalBudget propaga BUDGET_ALREADY_EXISTS (409) sem mapear', async () => {
    server.use(http.post('*/budgets/global', () =>
      HttpResponse.json({ data: null, error: { code: 'BUDGET_ALREADY_EXISTS' } }, { status: 409 })));
    const { data, error } = await incomeService.createGlobalBudget('u1', '2026-07', 2500);
    expect(data).toBeNull();
    expect(error).toEqual({ code: 'BUDGET_ALREADY_EXISTS' });
  });

  it('updateGlobalBudget faz PUT /budgets/global/:id só com ceiling e converte a resposta', async () => {
    let seen: { url: string; body: Record<string, unknown> } | undefined;
    server.use(http.put('*/budgets/global/gb1', async ({ request }) => {
      seen = { url: request.url, body: (await request.json()) as Record<string, unknown> };
      return HttpResponse.json({ data: rawGlobalBudget({ ceiling: '3100.50' }), error: null });
    }));
    const { data, error } = await incomeService.updateGlobalBudget('gb1', 3100.5);
    expect(seen?.url).toMatch(/\/budgets\/global\/gb1$/);
    expect(seen?.body).toEqual({ ceiling: 3100.5 });
    expect(error).toBeNull();
    expect(data?.ceiling).toBe(3100.5);
    // Edição manual: backend responde auto_adjusted=false (ORC-05)
    expect(data?.auto_adjusted).toBe(false);
  });

  it('updateGlobalBudget propaga INVALID_CEILING sem mapear', async () => {
    server.use(http.put('*/budgets/global/gb1', () =>
      HttpResponse.json({ data: null, error: { code: 'INVALID_CEILING' } }, { status: 400 })));
    const { data, error } = await incomeService.updateGlobalBudget('gb1', -1);
    expect(data).toBeNull();
    expect(error).toEqual({ code: 'INVALID_CEILING' });
  });
});

describe('incomeService.getIncomes — formatos de payload (HF-120)', () => {
  it('retorna a lista quando data é um array simples (formato documentado)', async () => {
    server.use(
      http.get('*/income', () => HttpResponse.json({ data: [{ id: 'i1' }, { id: 'i2' }], error: null })),
    );
    const { data, error } = await incomeService.getIncomes('u1', '2026-06');
    expect(error).toBeNull();
    expect(data).toEqual([{ id: 'i1' }, { id: 'i2' }]);
  });

  it('desembrulha quando data vem como {items: Income[]} (divergência de contrato)', async () => {
    server.use(
      http.get('*/income', () => HttpResponse.json({ data: { items: [{ id: 'i1' }] }, error: null })),
    );
    const { data, error } = await incomeService.getIncomes('u1', '2026-06');
    expect(error).toBeNull();
    expect(data).toEqual([{ id: 'i1' }]);
  });

  it('retorna [] quando data aninhado não traz um array (formato inesperado)', async () => {
    server.use(
      http.get('*/income', () => HttpResponse.json({ data: { items: null }, error: null })),
    );
    const { data, error } = await incomeService.getIncomes('u1', '2026-06');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('retorna [] quando data é null sem erro (resposta vazia)', async () => {
    server.use(http.get('*/income', () => HttpResponse.json({ data: null, error: null })));
    const { data, error } = await incomeService.getIncomes('u1', '2026-06');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('propaga o erro do envelope sem tentar desembrulhar', async () => {
    server.use(
      http.get('*/income', () =>
        HttpResponse.json({ data: null, error: { code: 'INVALID_USER_ID' } }, { status: 400 }),
      ),
    );
    const { data, error } = await incomeService.getIncomes('u1', '2026-06');
    expect(data).toBeNull();
    expect(error).toEqual({ code: 'INVALID_USER_ID' });
  });
});

function rawBalance(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'u1', competence: '2026-06', total_income: '7500.00', total_personal: '1800.00',
    total_shared: '1400.00', total_expenses: '3200.00', balance_today: '4300.00',
    committed_bills: '850.00', projected_balance: '3450.00', is_projected_negative: false,
    ...overrides,
  };
}
