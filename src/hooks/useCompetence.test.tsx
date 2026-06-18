import { renderHook, act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ReactNode } from 'react';
import { UserProvider } from './useUser';
import { useCompetences } from './useCompetence';
import { server } from '../test/msw/server';

const wrapper = ({ children }: { children: ReactNode }) => <UserProvider>{children}</UserProvider>;
const currentMonth = () => new Date().toISOString().substring(0, 7);

function userOk() {
  return http.get('*/users', () =>
    HttpResponse.json({ data: [{ id: 'u1', name: 'Ana', email: 'a@a.com' }], error: null }),
  );
}
function expensesWith(competences: string[]) {
  return http.get('*/expenses/user/*', () =>
    HttpResponse.json({ data: competences.map((c) => ({ competence: c })), error: null }),
  );
}

describe('useCompetences', () => {
  it('mantém o default [mês atual] e não busca quando não há usuário', async () => {
    // Sem usuário (data vazia) → currentUser null → fetch não dispara.
    server.use(http.get('*/users', () => HttpResponse.json({ data: [], error: null })));
    const { result } = renderHook(() => useCompetences(), { wrapper });

    await waitFor(() => expect(result.current.loadingCompetences).toBe(false));
    expect(result.current.availableCompetences).toEqual([currentMonth()]);
  });

  it('popula com as competências do serviço (com o mês atual incluído e ordenado desc)', async () => {
    server.use(userOk(), expensesWith(['2026-02', '2026-04']));
    const { result } = renderHook(() => useCompetences(), { wrapper });

    const expected = Array.from(new Set(['2026-02', '2026-04', currentMonth()])).sort().reverse();
    await waitFor(() => expect(result.current.availableCompetences).toEqual(expected));
  });

  it('refreshCompetences refaz a busca', async () => {
    server.use(userOk(), expensesWith(['2026-01']));
    const { result } = renderHook(() => useCompetences(), { wrapper });
    await waitFor(() => expect(result.current.availableCompetences).toContain('2026-01'));

    server.use(expensesWith(['2026-09']));
    await act(async () => {
      await result.current.refreshCompetences();
    });

    expect(result.current.availableCompetences).toContain('2026-09');
    expect(result.current.availableCompetences).not.toContain('2026-01');
  });
});
