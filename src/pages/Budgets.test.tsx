import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Budgets from './Budgets';
import { renderWithProviders } from '../test/renderWithProviders';
import { pageHandlers } from '../test/msw/pageHandlers';
import { server } from '../test/msw/server';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const budget = { id: 'b1', category_name: 'Mercado', amount: 1000, current_spending: 500, alert_threshold: 80 };

beforeEach(() => {
  vi.clearAllMocks();
  server.use(...pageHandlers);
});

describe('Budgets (integração)', () => {
  it('renderiza os orçamentos vindos da API (via BudgetsContext)', async () => {
    server.use(
      http.get('*/budgets/status', () =>
        HttpResponse.json({
          data: [{ id: 'b1', category_name: 'Mercado', amount: 1000, current_spending: 500, alert_threshold: 80 }],
          error: null,
        }),
      ),
    );
    renderWithProviders(<Budgets />);

    expect(await screen.findByRole('heading', { name: 'Mercado' })).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há orçamentos', async () => {
    renderWithProviders(<Budgets />);
    // O EmptyState pisca (aparece antes do currentUser, some no loading, reaparece);
    // waitFor re-consulta o DOM atual a cada poll, evitando asserir num nó destacado.
    await waitFor(() =>
      expect(screen.getByText(/Nenhum orçamento definido para/)).toBeInTheDocument(),
    );
  });

  it('exclui um orçamento: confirma e chama deleteBudget', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/budgets/status', () => HttpResponse.json({ data: [budget], error: null })),
      http.delete('*/budgets/b1', () => HttpResponse.json({ data: null, error: null })),
    );
    renderWithProviders(<Budgets />);

    await user.click(await screen.findByRole('button', { name: 'Excluir orçamento de Mercado' }));
    await user.click(await screen.findByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Orçamento excluído com sucesso'));
  });

  it('copia orçamentos do mês anterior', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('*/budgets/copy-from-previous', () => HttpResponse.json({ data: { copied: 2, skipped: 0 }, error: null })),
    );
    renderWithProviders(<Budgets />);

    await user.click(await screen.findByRole('button', { name: /Copiar mês anterior/ }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('2 orçamento(s) copiado(s) com sucesso'));
  });

  it('informa quando não há orçamentos para copiar', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('*/budgets/copy-from-previous', () => HttpResponse.json({ data: { copied: 0, skipped: 0 }, error: null })),
    );
    renderWithProviders(<Budgets />);

    await user.click(await screen.findByRole('button', { name: /Copiar mês anterior/ }));

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith('Nenhum orçamento novo para copiar do mês anterior'));
  });

  it('renderiza orçamento excedido e abre o modal de edição', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/budgets/status', () =>
        HttpResponse.json({ data: [{ ...budget, current_spending: 1200 }], error: null }),
      ),
    );
    renderWithProviders(<Budgets />);

    expect(await screen.findByRole('heading', { name: 'Mercado' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Editar orçamento de Mercado' }));
    expect(await screen.findByRole('heading', { name: 'Edit Budget' })).toBeInTheDocument();
  });

  it('abre o modal de novo orçamento', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Budgets />);
    await user.click(await screen.findByRole('button', { name: 'Set Budget' }));
    expect(await screen.findByRole('heading', { name: 'New Budget' })).toBeInTheDocument();
  });
});

describe('Budgets — Teto Global do Mês (HF-45)', () => {
  const rawGlobalBudget = (overrides: Record<string, unknown> = {}) => ({
    id: 'gb1', user_id: 'u1', competence: '2026-07', ceiling: '2500.00',
    auto_adjusted: false, ...overrides,
  });

  it('exibe o card com teto e gasto do mês vindos da API', async () => {
    server.use(
      http.get('*/budgets/global', () => HttpResponse.json({ data: rawGlobalBudget(), error: null })),
      http.get('*/balance', () =>
        HttpResponse.json({
          data: {
            user_id: 'u1', competence: '2026-07', total_income: '5000.00', total_personal: '800.00',
            total_shared: '400.00', total_expenses: '2000.00', balance_today: '3000.00',
            committed_bills: '0', projected_balance: '3000.00', is_projected_negative: false,
          },
          error: null,
        }),
      ),
    );
    renderWithProviders(<Budgets />);

    expect(await screen.findByRole('heading', { name: 'Teto Global do Mês' })).toBeInTheDocument();
    expect(await screen.findByText('R$ 2.500,00')).toBeInTheDocument();
    expect(await screen.findByText('R$ 2.000,00')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('sem teto (404): CTA "Definir Teto" cria o teto e o card passa a exibi-lo', async () => {
    const user = userEvent.setup();
    let created = false;
    server.use(
      http.get('*/budgets/global', () =>
        created
          ? HttpResponse.json({ data: rawGlobalBudget({ ceiling: '1800.00' }), error: null })
          : HttpResponse.json({ data: null, error: { code: 'BUDGET_NOT_FOUND' } }, { status: 404 }),
      ),
      http.post('*/budgets/global', () => {
        created = true;
        return HttpResponse.json({ data: rawGlobalBudget({ ceiling: '1800.00' }), error: null }, { status: 201 });
      }),
    );
    renderWithProviders(<Budgets />);

    expect(await screen.findByText(/Nenhum teto definido para este mês/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Definir Teto/ }));
    await user.type(await screen.findByLabelText('Teto do mês'), '1800');
    await user.click(screen.getByRole('button', { name: 'Salvar Teto' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Teto global definido com sucesso'));
    // Teto e Restante (gasto 0 no handler padrão) exibem o novo valor.
    expect(await screen.findAllByText('R$ 1.800,00')).toHaveLength(2);
    expect(screen.queryByText(/Nenhum teto definido para este mês/)).not.toBeInTheDocument();
  });

  it('badge Auto-ajustado aparece quando o teto veio do auto-ajuste', async () => {
    server.use(
      http.get('*/budgets/global', () =>
        HttpResponse.json({ data: rawGlobalBudget({ auto_adjusted: true }), error: null }),
      ),
    );
    renderWithProviders(<Budgets />);

    expect(await screen.findByText('Auto-ajustado')).toBeInTheDocument();
  });
});
