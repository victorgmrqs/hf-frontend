import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard';
import { renderWithProviders } from '../test/renderWithProviders';
import { pageHandlers } from '../test/msw/pageHandlers';
import { server } from '../test/msw/server';
import { formatCompetence } from '../utils/formatCompetence';
import type { Expense } from '../services/financeService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const currentMonth = new Date().toISOString().substring(0, 7);

const pixPessoal = { id: 'p1', name: 'Pix', type: 'PIX', shared: false };
const cartaoFamilia = { id: 'p3', name: 'Cartão Família', type: 'CREDIT_CARD', shared: true };

const makeExpense = (
  overrides: Partial<Expense> & Pick<Expense, 'id' | 'description' | 'value'>,
): Expense => ({
  date: `${currentMonth}-05`,
  competence: currentMonth,
  type: 'PERSONAL',
  user_id: 'u1',
  payment_method: pixPessoal,
  ...overrides,
});

const okExpenses = (expenses: Expense[]) =>
  http.get('*/expenses/user/:id', () => HttpResponse.json({ data: expenses, error: null }));

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
          ? HttpResponse.json({ data: null, error: { code: 'INTERNAL_SERVER_ERROR', message: 'boom' } }, { status: 500 })
          : HttpResponse.json({ data: { total_personal: 100, total_shared: 50, total_general: 150 }, error: null }),
      ),
    );
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('Erro interno no servidor. Tente novamente mais tarde.')).toBeInTheDocument();
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

describe('Dashboard — acerto mensal (settlement)', () => {
  it('calcula crédito a receber quando eu pago despesa compartilhada com método pessoal', async () => {
    server.use(
      okExpenses([
        makeExpense({
          id: 'e1',
          description: 'Mercado',
          value: 300,
          type: 'SHARED',
          shared_with: [
            { user_id: 'u1', name: 'Ana', divided_amount: 100 },
            { user_id: 'u2', name: 'Bruno', divided_amount: 200 },
          ],
        }),
        // Sem shared_with: minha parte vira o valor integral e não gera crédito
        makeExpense({ id: 'e2', description: 'Assinatura', value: 50, type: 'SHARED' }),
      ]),
    );
    renderWithProviders(<Dashboard />);

    // Saiu do meu caixa: 300 + 50
    expect(await screen.findByText('R$ 350,00')).toBeInTheDocument();
    // Crédito: 300 pagos − 100 da minha parte = 200
    expect(screen.getByText('R$ 200,00')).toBeInTheDocument();
    expect(screen.getByText('You have credit to receive from others.')).toBeInTheDocument();
  });

  it('calcula débito e mostra quem pagou quando outro usuário pagou despesa compartilhada', async () => {
    server.use(
      http.get('*/users', () =>
        HttpResponse.json({
          data: [
            { id: 'u1', name: 'Ana', email: 'ana@hf.com' },
            { id: 'u2', name: 'Bruno', email: 'bruno@hf.com' },
          ],
          error: null,
        }),
      ),
      okExpenses([
        makeExpense({
          id: 'e1',
          description: 'Farmácia',
          value: 120,
          type: 'SHARED',
          user_id: 'u2',
          payment_method: { id: 'p2', name: 'Cartão Bruno', type: 'CREDIT_CARD', shared: false },
          shared_with: [
            { user_id: 'u1', name: 'Ana', divided_amount: 60 },
            { user_id: 'u2', name: 'Bruno', divided_amount: 60 },
          ],
        }),
      ]),
    );
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('Paid by Bruno')).toBeInTheDocument();
    // Devo minha parte (60) ao Bruno
    expect(screen.getByText('R$ 60,00')).toBeInTheDocument();
    expect(screen.getByText('You spent less than your share. You owe others.')).toBeInTheDocument();
  });

  it('exclui métodos compartilhados do acerto e marca as despesas com o badge Joint', async () => {
    server.use(
      okExpenses([
        makeExpense({
          id: 'e1',
          description: 'Compras da casa',
          value: 400,
          type: 'SHARED',
          payment_method: cartaoFamilia,
          shared_with: [
            { user_id: 'u1', name: 'Ana', divided_amount: 200 },
            { user_id: 'u2', name: 'Bruno', divided_amount: 200 },
          ],
        }),
        makeExpense({
          id: 'e2',
          description: 'Streaming',
          value: 80,
          type: 'SHARED',
          user_id: 'u2',
          payment_method: cartaoFamilia,
          shared_with: [
            { user_id: 'u1', name: 'Ana', divided_amount: 40 },
            { user_id: 'u2', name: 'Bruno', divided_amount: 40 },
          ],
        }),
      ]),
    );
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('Compras da casa')).toBeInTheDocument();
    expect(screen.getAllByText('Joint')).toHaveLength(2);
    // Pagador u2 não está entre os usuários conhecidos → fallback "Other"
    expect(screen.getByText('Paid by Other')).toBeInTheDocument();
    // Nada saiu do caixa pessoal e ninguém deve a ninguém: o acerto zera.
    // (asserção pelo VALOR — a mensagem sozinha também apareceria com saldo > 0)
    const finalBalanceCard = screen.getByText('Final Balance').closest('div') as HTMLElement;
    expect(within(finalBalanceCard).getByText(/R\$\s0,00/)).toBeInTheDocument();
    const paidByYou = screen.getByText('Total Paid by You').closest('div') as HTMLElement;
    expect(within(paidByYou).getByText(/R\$\s0,00/)).toBeInTheDocument();
    expect(screen.getByText('You have credit to receive from others.')).toBeInTheDocument();
  });
});

describe('Dashboard — despesas recentes', () => {
  it('renderiza o ícone/badge de cada categoria e Uncategorized para despesa sem categoria', async () => {
    server.use(
      okExpenses([
        makeExpense({ id: 'e1', description: 'Feira do mês', value: 100, category: { id: 'c1', name: 'Alimentação', color: '#f00' } }),
        makeExpense({ id: 'e2', description: 'Gasolina', value: 200, category: { id: 'c2', name: 'Transporte', color: '#0f0' } }),
        makeExpense({ id: 'e3', description: 'Cinema', value: 40, category: { id: 'c3', name: 'Lazer', color: '#00f' } }),
        makeExpense({ id: 'e4', description: 'Presente', value: 60 }),
      ]),
    );
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('Feira do mês')).toBeInTheDocument();
    expect(screen.getByText('Gasolina')).toBeInTheDocument();
    expect(screen.getByText('Cinema')).toBeInTheDocument();
    expect(screen.getByText('Presente')).toBeInTheDocument();
    expect(screen.getByText('Alimentação')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
    expect(screen.getByText('Lazer')).toBeInTheDocument();
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });
});

describe('Dashboard — status de orçamento e contas a pagar', () => {
  it('pinta a barra de progresso conforme a severidade (>90 vermelho, >70 laranja, normal azul)', async () => {
    server.use(
      http.get('*/budgets/status', () =>
        HttpResponse.json({
          data: [
            { id: 'b1', category_name: 'Moradia', amount: 1000, current_spending: 950, alert_threshold: 80 },
            { id: 'b2', category_name: 'Educação', amount: 1000, current_spending: 800, alert_threshold: 80 },
            { id: 'b3', category_name: 'Mercado', amount: 1000, current_spending: 500, alert_threshold: 80 },
          ],
          error: null,
        }),
      ),
    );
    const { container } = renderWithProviders(<Dashboard />);

    expect(await screen.findByText('Moradia')).toBeInTheDocument();
    expect(screen.getByText('Educação')).toBeInTheDocument();
    expect(screen.getByText('Mercado')).toBeInTheDocument();
    // Barras de progresso com a cor de severidade correspondente a 95%, 80% e 50%
    expect(container.querySelector('.bg-rose-500')).not.toBeNull();
    expect(container.querySelector('.bg-orange-400')).not.toBeNull();
    expect(container.querySelector('.bg-primary')).not.toBeNull();
  });

  it('mostra estados vazios de orçamento e de contas a pagar', async () => {
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('No budgets set for this period.')).toBeInTheDocument();
    expect(screen.getByText('No pending payments.')).toBeInTheDocument();
  });

  it('lista contas a pagar vencidas e futuras com seus valores', async () => {
    server.use(
      http.get('*/accounts-payable', () =>
        HttpResponse.json({
          data: [
            { id: 'a1', description: 'Internet', amount: 99.9, due_date: '2099-01-15', status: 'PENDING', recurrence: 'NONE' },
            { id: 'a2', description: 'Luz', amount: 150, due_date: '2020-01-10', status: 'PENDING', recurrence: 'NONE' },
          ],
          error: null,
        }),
      ),
    );
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('Luz')).toBeInTheDocument();
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
    expect(screen.getByText('Internet')).toBeInTheDocument();
    expect(screen.getByText('R$ 99,90')).toBeInTheDocument();
  });
});

describe('Dashboard — interações e erros', () => {
  it('recarrega os dados ao trocar a competência no seletor', async () => {
    const feiraDeMarco = makeExpense({
      id: 'e1',
      description: 'Feira de março',
      value: 250,
      date: '2025-03-05',
      competence: '2025-03',
    });
    server.use(
      http.get('*/expenses/user/:id', ({ request }) => {
        const competence = new URL(request.url).searchParams.get('competence');
        if (competence === '2025-03') return HttpResponse.json({ data: [feiraDeMarco], error: null });
        if (competence) return HttpResponse.json({ data: [], error: null });
        // Sem filtro: chamada usada para montar as competências disponíveis
        return HttpResponse.json({ data: [feiraDeMarco], error: null });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);

    await screen.findByRole('option', { name: formatCompetence('2025-03') });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Selecionar competência' }), '2025-03');

    expect(await screen.findByText('Summary for 2025-03')).toBeInTheDocument();
    expect(await screen.findByText('Feira de março')).toBeInTheDocument();
  });

  it('abre o modal de nova despesa pelo botão New Expense', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);
    await screen.findByText('No expenses found for this period.');

    await user.click(screen.getByRole('button', { name: /New Expense/ }));

    expect(await screen.findByText('Add New Expense')).toBeInTheDocument();
  });

  it('mostra toast de erro pt-BR quando os dados do dashboard não podem ser processados', async () => {
    server.use(
      // Payload malformado (não-lista) faz o processamento do dashboard falhar
      http.get('*/accounts-payable', () =>
        HttpResponse.json({ data: { inesperado: true }, error: null }),
      ),
    );
    renderWithProviders(<Dashboard />);

    await waitFor(() =>
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Erro ao carregar dados do dashboard'),
    );
  });
});
