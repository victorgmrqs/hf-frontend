import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard';
import { renderWithProviders } from '../test/renderWithProviders';
import { pageHandlers } from '../test/msw/pageHandlers';
import { server } from '../test/msw/server';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const currentMonth = new Date().toISOString().substring(0, 7);

beforeEach(() => {
  vi.clearAllMocks();
  server.use(...pageHandlers);
});

describe('Dashboard (integração)', () => {
  it('renderiza as despesas recentes vindas da API', async () => {
    server.use(
      http.get('*/expenses/user/:id', () =>
        HttpResponse.json({
          data: [{
            id: 'e1', description: 'Aluguel', value: 1500, date: `${currentMonth}-02`,
            competence: currentMonth, type: 'PERSONAL', user_id: 'u1',
            payment_method: { id: 'p1', name: 'Pix', type: 'PIX', shared: false },
          }],
          error: null,
        }),
      ),
    );
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('Aluguel')).toBeInTheDocument();
  });

  it('mostra estado vazio de despesas quando não há dados', async () => {
    renderWithProviders(<Dashboard />);
    expect(await screen.findByText('No expenses found for this period.')).toBeInTheDocument();
  });

  it('renderiza totais, status de orçamento e contas futuras com dados ricos', async () => {
    server.use(
      http.get('*/expenses/user/:id/totals', () =>
        HttpResponse.json({ data: { total_personal: 100, total_shared: 60, total_general: 160 }, error: null }),
      ),
      http.get('*/expenses/user/:id', () =>
        HttpResponse.json({
          data: [{
            id: 'e1', description: 'Supermercado', value: 200, date: `${currentMonth}-03`,
            competence: currentMonth, type: 'SHARED', user_id: 'u1',
            payment_method: { id: 'p1', name: 'Cartão', type: 'CREDIT_CARD', shared: true },
          }],
          error: null,
        }),
      ),
      http.get('*/budgets/status', () =>
        HttpResponse.json({ data: [{ id: 'b1', category_name: 'Alimentação', amount: 800, current_spending: 700, alert_threshold: 80 }], error: null }),
      ),
      http.get('*/accounts-payable', () =>
        HttpResponse.json({ data: [{ id: 'a1', description: 'Aluguel', amount: 1500, due_date: `${currentMonth}-10`, status: 'PENDING', recurrence: 'NONE' }], error: null }),
      ),
    );
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('Supermercado')).toBeInTheDocument();
    expect(await screen.findByText('Alimentação')).toBeInTheDocument();
    expect(await screen.findByText('Aluguel')).toBeInTheDocument();
  });

  it('renderiza o gráfico de gastos por categoria com dados do endpoint', async () => {
    server.use(
      http.get('*/expenses/totals/by-category', () =>
        HttpResponse.json({
          data: [
            { category_id: 'c1', category_name: 'Transporte', total: '300.00', percentage: '60.00' },
            { category_id: 'c2', category_name: 'Saúde', total: '200.00', percentage: '40.00' },
          ],
          error: null,
        }),
      ),
    );
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('Gastos por Categoria')).toBeInTheDocument();
    expect(await screen.findByText('Transporte')).toBeInTheDocument();
    expect(await screen.findByText('Saúde')).toBeInTheDocument();
  });
});
