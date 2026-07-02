import { renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { ReactNode } from 'react';
import { UserProvider } from './useUser';
import { useFamilyTotals } from './useFamilyTotals';
import { server } from '../test/msw/server';

const wrapper = ({ children }: { children: ReactNode }) => <UserProvider>{children}</UserProvider>;

const users = [
  { id: 'u1', name: 'Ana', email: 'ana@hf.com' },
  { id: 'u2', name: 'Bia', email: 'bia@hf.com' },
];

function usersOk(list = users) {
  return http.get('*/users', () => HttpResponse.json({ data: list, error: null }));
}

afterEach(() => {
  localStorage.clear();
});

describe('useFamilyTotals', () => {
  it('busca os totais de cada usuário em paralelo e os agrega por usuário', async () => {
    const totalsByUser: Record<string, { total_personal: number; total_shared: number; total_general: number }> = {
      u1: { total_personal: 100, total_shared: 50, total_general: 150 },
      u2: { total_personal: 200, total_shared: 30, total_general: 230 },
    };
    server.use(
      usersOk(),
      http.get('*/expenses/user/:id/totals', ({ params }) =>
        HttpResponse.json({ data: totalsByUser[params.id as string], error: null }),
      ),
    );

    const { result } = renderHook(() => useFamilyTotals('2026-06'), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.data[0]).toMatchObject({ user: { id: 'u1' }, totals: { total_general: 150 } });
    expect(result.current.data[1]).toMatchObject({ user: { id: 'u2' }, totals: { total_general: 230 } });
    expect(result.current.error).toBeNull();
  });

  it('mantém loading=true durante o fetch e false após resolver', async () => {
    server.use(
      usersOk(),
      http.get('*/expenses/user/:id/totals', async () => {
        await delay(50);
        return HttpResponse.json({ data: { total_personal: 0, total_shared: 0, total_general: 0 }, error: null });
      }),
    );

    const { result } = renderHook(() => useFamilyTotals('2026-06'), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toHaveLength(2);
  });

  it('retorna lista vazia e sem erro quando não há usuários', async () => {
    server.use(usersOk([]));

    const { result } = renderHook(() => useFamilyTotals('2026-06'), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('mapeia error.code VALIDATION_ERROR para mensagem pt-BR', async () => {
    server.use(
      usersOk(),
      http.get('*/expenses/user/:id/totals', () =>
        HttpResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'invalid' } }, { status: 400 }),
      ),
    );

    const { result } = renderHook(() => useFamilyTotals('2026-13'), { wrapper });

    await waitFor(() => expect(result.current.error).toBe('Alguns dados são inválidos. Verifique e tente novamente.'));
    expect(result.current.data).toEqual([]);
  });

  it('usa mensagem genérica pt-BR para erro sem código conhecido', async () => {
    server.use(
      usersOk(),
      http.get('*/expenses/user/:id/totals', () =>
        HttpResponse.json({ data: null, error: { code: 'WHATEVER_UNKNOWN' } }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useFamilyTotals('2026-06'), { wrapper });

    await waitFor(() => expect(result.current.error).toBe('Erro ao carregar visão familiar.'));
    expect(result.current.data).toEqual([]);
  });

  it('mapeia error.code INTERNAL_SERVER_ERROR para mensagem pt-BR', async () => {
    server.use(
      usersOk(),
      http.get('*/expenses/user/:id/totals', () =>
        HttpResponse.json({ data: null, error: { code: 'INTERNAL_SERVER_ERROR', message: 'boom' } }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useFamilyTotals('2026-06'), { wrapper });

    await waitFor(() => expect(result.current.error).toBe('Erro interno no servidor. Tente novamente mais tarde.'));
    expect(result.current.data).toEqual([]);
  });
});
