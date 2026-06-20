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

  it('propaga erro do envelope (error.code REC)', async () => {
    server.use(http.delete('*/income/i1', () => HttpResponse.json({ data: null, error: { code: 'REC-03' } }, { status: 400 })));
    const { data, error } = await incomeService.deleteIncome('i1', 'u1');
    expect(data).toBeNull();
    expect(error).toEqual({ code: 'REC-03' });
  });
});
