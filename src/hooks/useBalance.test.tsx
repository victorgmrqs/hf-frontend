import { renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { ReactNode } from 'react';
import { UserProvider } from './useUser';
import { useBalance } from './useBalance';
import { server } from '../test/msw/server';

const wrapper = ({ children }: { children: ReactNode }) => <UserProvider>{children}</UserProvider>;

const usersOk = http.get('*/users', () =>
  HttpResponse.json({ data: [{ id: 'u1', name: 'Ana', email: 'ana@hf.com' }], error: null }),
);

function balanceOk(overrides: Record<string, unknown> = {}) {
  return http.get('*/balance', () =>
    HttpResponse.json({
      data: {
        user_id: 'u1', competence: '2026-06', total_income: '7500.00', total_personal: '1800.00',
        total_shared: '1400.00', total_expenses: '3200.00', balance_today: '4300.00',
        committed_bills: '850.00', projected_balance: '3450.00', is_projected_negative: false,
        ...overrides,
      },
      error: null,
    }),
  );
}

function balanceErr(code: string, status: number) {
  return http.get('*/balance', () =>
    HttpResponse.json({ data: null, error: { code, message: 'x' } }, { status }),
  );
}

afterEach(() => localStorage.clear());

describe('useBalance', () => {
  it('busca o saldo do usuário logado e popula data com valores numéricos', async () => {
    server.use(usersOk, balanceOk());

    const { result } = renderHook(() => useBalance('2026-06'), { wrapper });

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.balance_today).toBe(4300);
    expect(result.current.data?.projected_balance).toBe(3450);
    expect(result.current.error).toBeNull();
  });

  it('mantém loading=true durante o fetch e false após resolver', async () => {
    server.use(
      usersOk,
      http.get('*/balance', async () => {
        await delay(50);
        return HttpResponse.json({
          data: {
            user_id: 'u1', competence: '2026-06', total_income: '0', total_personal: '0',
            total_shared: '0', total_expenses: '0', balance_today: '0', committed_bills: '0',
            projected_balance: '0', is_projected_negative: false,
          },
          error: null,
        });
      }),
    );

    const { result } = renderHook(() => useBalance('2026-06'), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toBeNull();
  });

  it('mapeia MISSING_REQUIRED_FIELD para mensagem pt-BR', async () => {
    server.use(usersOk, balanceErr('MISSING_REQUIRED_FIELD', 400));
    const { result } = renderHook(() => useBalance('2026-06'), { wrapper });
    await waitFor(() => expect(result.current.error).toBe('Não foi possível identificar o usuário.'));
    expect(result.current.data).toBeNull();
  });

  it('mapeia INVALID_COMPETENCE para mensagem pt-BR', async () => {
    server.use(usersOk, balanceErr('INVALID_COMPETENCE', 400));
    const { result } = renderHook(() => useBalance('2026-13'), { wrapper });
    await waitFor(() => expect(result.current.error).toBe('Competência inválida.'));
  });

  it('mapeia UPSTREAM_TIMEOUT para mensagem pt-BR', async () => {
    server.use(usersOk, balanceErr('UPSTREAM_TIMEOUT', 503));
    const { result } = renderHook(() => useBalance('2026-06'), { wrapper });
    await waitFor(() => expect(result.current.error).toBe('Serviço de despesas indisponível. Tente novamente.'));
  });

  it('mapeia UPSTREAM_ERROR para mensagem pt-BR', async () => {
    server.use(usersOk, balanceErr('UPSTREAM_ERROR', 502));
    const { result } = renderHook(() => useBalance('2026-06'), { wrapper });
    await waitFor(() => expect(result.current.error).toBe('Resposta inesperada do serviço de despesas.'));
  });

  it('usa mensagem genérica pt-BR para erro sem código conhecido', async () => {
    server.use(usersOk, balanceErr('WHATEVER_UNKNOWN', 500));
    const { result } = renderHook(() => useBalance('2026-06'), { wrapper });
    await waitFor(() => expect(result.current.error).toBe('Erro ao carregar o saldo do mês.'));
  });
});
