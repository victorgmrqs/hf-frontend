import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExpenseModal from './ExpenseModal';
import { server } from '../test/msw/server';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const { mockUserCtx } = vi.hoisted(() => ({
  mockUserCtx: { currentUser: { id: 'u1', name: 'Ana', email: 'a@a.com' }, allUsers: [{ id: 'u1', name: 'Ana', email: 'a@a.com' }] },
}));
vi.mock('../hooks/useUser', () => ({ useUser: () => mockUserCtx }));

beforeEach(() => {
  vi.clearAllMocks();
  server.use(
    http.get('*/categories', () => HttpResponse.json({ data: [{ id: 'c1', name: 'Mercado', color: '#fff' }], error: null })),
    http.get('*/payment-methods/user/*', () => HttpResponse.json({ data: [{ id: 'p1', name: 'Cartão', type: 'CREDIT_CARD', shared: false }], error: null })),
  );
});
const noop = () => {};

describe('ExpenseModal', () => {
  it('valida campos obrigatórios e não envia', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<ExpenseModal isOpen onClose={noop} onSuccess={onSuccess} />);

    await user.click(screen.getByRole('button', { name: 'Save Expense' }));

    expect(await screen.findByText('A descrição é obrigatória')).toBeInTheDocument();
    expect(screen.getByText('Informe um valor válido maior que zero')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('cria despesa com sucesso', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(http.post('*/expenses', () => HttpResponse.json({ data: { id: 'e1' }, error: null }, { status: 201 })));
    render(<ExpenseModal isOpen onClose={noop} onSuccess={onSuccess} />);

    // aguarda a forma de pagamento carregar (define o default obrigatório)
    await waitFor(() => expect(screen.getByRole('option', { name: 'Cartão' })).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText('0,00'), '100');
    await user.type(screen.getByPlaceholderText(/Weekly Groceries/), 'Mercado');
    await user.click(screen.getByRole('button', { name: 'Save Expense' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Despesa criada com sucesso');
  });

  it('erro de envelope mostra banner e não chama onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(http.post('*/expenses', () => HttpResponse.json({ data: null, error: { code: 'DSP-010' } }, { status: 400 })));
    render(<ExpenseModal isOpen onClose={noop} onSuccess={onSuccess} />);

    await waitFor(() => expect(screen.getByRole('option', { name: 'Cartão' })).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText('0,00'), '100');
    await user.type(screen.getByPlaceholderText(/Weekly Groceries/), 'Mercado');
    await user.click(screen.getByRole('button', { name: 'Save Expense' }));

    expect(await screen.findByText(/Erro ao criar despesa/)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
