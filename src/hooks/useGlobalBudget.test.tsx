import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { ReactNode } from 'react';
import { UserProvider } from './useUser';
import { useGlobalBudget } from './useGlobalBudget';
import { server } from '../test/msw/server';

const wrapper = ({ children }: { children: ReactNode }) => <UserProvider>{children}</UserProvider>;

const usersOk = http.get('*/users', () =>
  HttpResponse.json({ data: [{ id: 'u1', name: 'Ana', email: 'ana@hf.com' }], error: null }),
);

const budgetOk = (overrides: Record<string, unknown> = {}) =>
  http.get('*/budgets/global', () =>
    HttpResponse.json({
      data: {
        id: 'gb1', user_id: 'u1', competence: '2026-07', ceiling: '2500.00',
        auto_adjusted: false, ...overrides,
      },
      error: null,
    }),
  );

const budgetErr = (code: string, status: number) =>
  http.get('*/budgets/global', () =>
    HttpResponse.json({ data: null, error: { code } }, { status }),
  );

afterEach(() => localStorage.clear());

describe('useGlobalBudget', () => {
  it('busca o teto do usuário logado e converte ceiling em number', async () => {
    server.use(usersOk, budgetOk({ auto_adjusted: true }));

    const { result } = renderHook(() => useGlobalBudget('2026-07'), { wrapper });

    await waitFor(() => expect(result.current.budget).not.toBeNull());
    expect(result.current.budget?.ceiling).toBe(2500);
    expect(result.current.budget?.auto_adjusted).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.notFound).toBe(false);
  });

  it('BUDGET_NOT_FOUND (404) vira notFound=true sem mensagem de erro', async () => {
    server.use(usersOk, budgetErr('BUDGET_NOT_FOUND', 404));

    const { result } = renderHook(() => useGlobalBudget('2026-07'), { wrapper });

    await waitFor(() => expect(result.current.notFound).toBe(true));
    expect(result.current.budget).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('mapeia UPSTREAM_UNAVAILABLE para mensagem pt-BR', async () => {
    server.use(usersOk, budgetErr('UPSTREAM_UNAVAILABLE', 503));

    const { result } = renderHook(() => useGlobalBudget('2026-07'), { wrapper });

    await waitFor(() =>
      expect(result.current.error).toBe('Serviço temporariamente indisponível. Tente novamente.'),
    );
    expect(result.current.notFound).toBe(false);
  });

  it('usa a mensagem contextual para erro sem código conhecido', async () => {
    server.use(usersOk, budgetErr('WHATEVER_UNKNOWN', 500));

    const { result } = renderHook(() => useGlobalBudget('2026-07'), { wrapper });

    await waitFor(() =>
      expect(result.current.error).toBe('Erro ao carregar o teto global do mês.'),
    );
  });

  it('refresh() refaz a busca e substitui o estado (404 → teto criado)', async () => {
    server.use(usersOk, budgetErr('BUDGET_NOT_FOUND', 404));

    const { result } = renderHook(() => useGlobalBudget('2026-07'), { wrapper });
    await waitFor(() => expect(result.current.notFound).toBe(true));

    server.use(budgetOk());
    act(() => result.current.refresh());

    await waitFor(() => expect(result.current.budget?.ceiling).toBe(2500));
    expect(result.current.notFound).toBe(false);
  });
});
