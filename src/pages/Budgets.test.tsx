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
