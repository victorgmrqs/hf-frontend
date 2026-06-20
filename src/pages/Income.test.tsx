import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Income from './Income';
import { renderWithProviders } from '../test/renderWithProviders';
import { pageHandlers } from '../test/msw/pageHandlers';
import { server } from '../test/msw/server';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const currentMonth = new Date().toISOString().substring(0, 7);
const income = {
  id: 'i1', user_id: 'u1', description: 'Salário', amount: 7500, type: 'SALARY' as const,
  date: `${currentMonth}-05`, competence: currentMonth, recurrent: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  server.use(...pageHandlers);
});

describe('Income (integração)', () => {
  it('lista receitas, badge recorrente e total somado', async () => {
    server.use(
      http.get('*/income', () =>
        HttpResponse.json({
          data: [
            income,
            { ...income, id: 'i2', description: 'Aluguel sala', amount: 1200, type: 'RENTAL', recurrent: false },
          ],
          error: null,
        }),
      ),
    );
    renderWithProviders(<Income />);

    expect(await screen.findByText('Salário')).toBeInTheDocument();
    expect(screen.getByText('Aluguel sala')).toBeInTheDocument();
    expect(screen.getByText('Recorrente')).toBeInTheDocument();
    expect(screen.getByText('R$ 8.700,00')).toBeInTheDocument(); // 7500 + 1200
  });

  it('mostra empty state quando não há receitas', async () => {
    server.use(http.get('*/income', () => HttpResponse.json({ data: [], error: null })));
    renderWithProviders(<Income />);
    expect(await screen.findByText(/Nenhuma receita em/)).toBeInTheDocument();
  });

  it('em erro de envelope, degrada sem quebrar (empty)', async () => {
    server.use(http.get('*/income', () => HttpResponse.json({ data: null, error: { code: 'REC-01' } }, { status: 400 })));
    renderWithProviders(<Income />);
    expect(await screen.findByText(/Nenhuma receita em/)).toBeInTheDocument();
  });

  it('exclui uma receita: confirma e chama deleteIncome', async () => {
    const user = userEvent.setup();
    let deleted = false;
    server.use(
      http.get('*/income', () => HttpResponse.json({ data: [income], error: null })),
      http.delete('*/income/i1', () => { deleted = true; return HttpResponse.json({ data: null, error: null }); }),
    );
    renderWithProviders(<Income />);

    await user.click(await screen.findByRole('button', { name: 'Excluir receita Salário' }));
    await user.click(await screen.findByRole('button', { name: 'Excluir' })); // confirmar no modal

    await waitFor(() => expect(deleted).toBe(true));
  });
});
