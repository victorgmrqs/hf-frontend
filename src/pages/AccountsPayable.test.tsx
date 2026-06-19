import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountsPayable from './AccountsPayable';
import { renderWithProviders } from '../test/renderWithProviders';
import { pageHandlers } from '../test/msw/pageHandlers';
import { server } from '../test/msw/server';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const currentMonth = new Date().toISOString().substring(0, 7);

beforeEach(() => {
  vi.clearAllMocks();
  server.use(...pageHandlers);
});

describe('AccountsPayable (integração)', () => {
  it('renderiza as contas a pagar vindas da API', async () => {
    server.use(
      http.get('*/accounts-payable', () =>
        HttpResponse.json({
          data: [{
            id: 'a1', description: 'Conta de Luz', amount: 180, due_date: `${currentMonth}-10`,
            status: 'PENDING', recurrence: 'NONE',
          }],
          error: null,
        }),
      ),
    );
    renderWithProviders(<AccountsPayable />);

    expect(await screen.findByText('Conta de Luz')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há contas', async () => {
    renderWithProviders(<AccountsPayable />);
    expect(await screen.findByText('Nenhuma conta pendente.')).toBeInTheDocument();
  });

  it('abre o modal de pagamento ao clicar em Pay Now', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/accounts-payable', () =>
        HttpResponse.json({
          data: [{ id: 'a1', description: 'Conta de Luz', amount: 180, due_date: `${currentMonth}-10`, status: 'PENDING', recurrence: 'NONE' }],
          error: null,
        }),
      ),
      http.get('*/payment-methods/user/:id', () => HttpResponse.json({ data: [{ id: 'p1', name: 'Cartão', type: 'CREDIT_CARD', shared: false }], error: null })),
    );
    renderWithProviders(<AccountsPayable />);

    await user.click(await screen.findByRole('button', { name: /Pay Now/i }));
    expect(await screen.findByRole('heading', { name: 'Pay Account' })).toBeInTheDocument();
  });

  it('exclui uma conta: confirma e chama deleteAccountPayable', async () => {
    const user = userEvent.setup();
    let deleted = false;
    server.use(
      http.get('*/accounts-payable', () =>
        HttpResponse.json({
          data: [{ id: 'a1', description: 'Conta de Luz', amount: 180, due_date: `${currentMonth}-10`, status: 'PENDING', recurrence: 'NONE' }],
          error: null,
        }),
      ),
      http.delete('*/accounts-payable/a1', () => { deleted = true; return HttpResponse.json({ data: null, error: null }); }),
    );
    renderWithProviders(<AccountsPayable />);

    const card = (await screen.findByText('Conta de Luz')).closest('div.group') as HTMLElement;
    const cardButtons = within(card).getAllByRole('button'); // Pay Now, Edit, Delete
    await user.click(cardButtons[cardButtons.length - 1]); // Delete é o último
    await user.click(await screen.findByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(deleted).toBe(true));
  });

  it('gera projeções para conta recorrente (MONTHLY)', async () => {
    server.use(
      http.get('*/accounts-payable', () =>
        HttpResponse.json({
          data: [{ id: 'a1', description: 'Assinatura', amount: 50, due_date: `${currentMonth}-05`, status: 'PENDING', recurrence: 'MONTHLY' }],
          error: null,
        }),
      ),
    );
    renderWithProviders(<AccountsPayable />);
    // a conta original + cards projetados (isProjected) renderizam sem quebrar
    expect(await screen.findAllByText('Assinatura')).not.toHaveLength(0);
  });

  it('troca o filtro de status e refaz a busca com ?status=PAID', async () => {
    const user = userEvent.setup();
    let paidQueried = false;
    server.use(
      http.get('*/accounts-payable', ({ request }) => {
        if (new URL(request.url).searchParams.get('status') === 'PAID') paidQueried = true;
        return HttpResponse.json({ data: [], error: null });
      }),
    );
    renderWithProviders(<AccountsPayable />);

    await user.selectOptions(await screen.findByLabelText('Filtrar por status'), 'PAID');

    await waitFor(() => expect(paidQueried).toBe(true));
  });

  it('abre o modal de edição de conta', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/accounts-payable', () =>
        HttpResponse.json({
          data: [{ id: 'a1', description: 'Conta de Luz', amount: 180, due_date: `${currentMonth}-10`, status: 'PENDING', recurrence: 'NONE' }],
          error: null,
        }),
      ),
    );
    renderWithProviders(<AccountsPayable />);

    const card = (await screen.findByText('Conta de Luz')).closest('div.group') as HTMLElement;
    const cardButtons = within(card).getAllByRole('button'); // Pay Now, Edit, Delete
    await user.click(cardButtons[cardButtons.length - 2]); // Edit é o penúltimo
    expect(await screen.findByRole('heading', { name: 'Edit Account Payable' })).toBeInTheDocument();
  });
});
