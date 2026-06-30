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

  it('renderiza a seção Visão Familiar com os totais de cada usuário da família', async () => {
    const totalsByUser: Record<string, { total_personal: number; total_shared: number; total_general: number }> = {
      u1: { total_personal: 100, total_shared: 50, total_general: 150 },
      u2: { total_personal: 200, total_shared: 30, total_general: 230 },
    };
    server.use(
      http.get('*/users', () =>
        HttpResponse.json({
          data: [
            { id: 'u1', name: 'Ana', email: 'ana@hf.com' },
            { id: 'u2', name: 'Bia', email: 'bia@hf.com' },
          ],
          error: null,
        }),
      ),
      http.get('*/expenses/user/:id/totals', ({ params }) =>
        HttpResponse.json({ data: totalsByUser[params.id as string], error: null }),
      ),
    );
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('Visão Familiar')).toBeInTheDocument();
    expect(await screen.findByText('Bia')).toBeInTheDocument();
    expect(screen.getByText('Total Família')).toBeInTheDocument();
    // 150 + 230 = 380
    expect(screen.getByText('R$ 380,00')).toBeInTheDocument();
  });

  it('exibe erro pt-BR na Visão Familiar quando uma das chamadas paralelas falha', async () => {
    server.use(
      http.get('*/users', () =>
        HttpResponse.json({
          data: [
            { id: 'u1', name: 'Ana', email: 'ana@hf.com' },
            { id: 'u2', name: 'Bia', email: 'bia@hf.com' },
          ],
          error: null,
        }),
      ),
      http.get('*/expenses/user/:id/totals', ({ params }) =>
        params.id === 'u2'
          ? HttpResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'boom' } }, { status: 500 })
          : HttpResponse.json({ data: { total_personal: 100, total_shared: 50, total_general: 150 }, error: null }),
      ),
    );
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('Erro interno ao carregar visão familiar.')).toBeInTheDocument();
  });

  it('renderiza os cards de saldo (Hoje e Projetado) vindos do /balance', async () => {
    server.use(
      http.get('*/balance', () =>
        HttpResponse.json({
          data: {
            user_id: 'u1', competence: currentMonth, total_income: '7500.00', total_personal: '1800.00',
            total_shared: '1400.00', total_expenses: '3200.00', balance_today: '4300.00',
            committed_bills: '850.00', projected_balance: '3450.00', is_projected_negative: false,
          },
          error: null,
        }),
      ),
    );
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('Saldo Hoje')).toBeInTheDocument();
    expect(await screen.findByText('R$ 4.300,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 3.450,00')).toBeInTheDocument();
  });

  it('sinaliza alerta no card de Saldo Projetado quando negativo (SAL-05)', async () => {
    server.use(
      http.get('*/balance', () =>
        HttpResponse.json({
          data: {
            user_id: 'u1', competence: currentMonth, total_income: '1000.00', total_personal: '800.00',
            total_shared: '400.00', total_expenses: '1200.00', balance_today: '-200.00',
            committed_bills: '300.00', projected_balance: '-500.00', is_projected_negative: true,
          },
          error: null,
        }),
      ),
    );
    renderWithProviders(<Dashboard />);

    expect(await screen.findByLabelText('Saldo projetado negativo')).toBeInTheDocument();
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
