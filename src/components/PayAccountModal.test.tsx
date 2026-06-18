import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PayAccountModal from './PayAccountModal';
import { server } from '../test/msw/server';
import { toast } from 'sonner';
import type { AccountPayable } from '../services/financeService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const { mockUserCtx } = vi.hoisted(() => ({ mockUserCtx: { currentUser: { id: 'u1', name: 'Ana', email: 'a@a.com' } } }));
vi.mock('../hooks/useUser', () => ({ useUser: () => mockUserCtx }));

beforeEach(() => {
  vi.clearAllMocks();
  server.use(
    http.get('*/payment-methods/user/*', () => HttpResponse.json({ data: [{ id: 'p1', name: 'Cartão', type: 'CREDIT_CARD', shared: false }], error: null })),
    http.get('*/categories', () => HttpResponse.json({ data: [], error: null })),
  );
});
const noop = () => {};
const account: AccountPayable = {
  id: 'a1', description: 'Internet', amount: 99, due_date: '2026-06-10', status: 'PENDING', recurrence: 'NONE',
};

describe('PayAccountModal', () => {
  it('registra pagamento com sucesso', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(http.post('*/accounts-payable/a1/pay', () => HttpResponse.json({ data: { id: 'a1' }, error: null })));
    render(<PayAccountModal isOpen account={account} onClose={noop} onSuccess={onSuccess} />);

    // espera a forma de pagamento carregar (define o default)
    await waitFor(() => expect(screen.getByRole('option', { name: 'Cartão' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Confirm Payment' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Pagamento registrado com sucesso');
  });

  it('erro de envelope: toast.error sem onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(http.post('*/accounts-payable/a1/pay', () => HttpResponse.json({ data: null, error: { code: 'CTP-009' } }, { status: 400 })));
    render(<PayAccountModal isOpen account={account} onClose={noop} onSuccess={onSuccess} />);

    await waitFor(() => expect(screen.getByRole('option', { name: 'Cartão' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Confirm Payment' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao registrar pagamento'));
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
