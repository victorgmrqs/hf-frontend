import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PaymentMethodModal from './PaymentMethodModal';
import { server } from '../test/msw/server';
import { toast } from 'sonner';
import type { PaymentMethod } from '../services/financeService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const { mockUserCtx } = vi.hoisted(() => ({ mockUserCtx: { currentUser: { id: 'u1', name: 'Ana', email: 'a@a.com' } } }));
vi.mock('../hooks/useUser', () => ({ useUser: () => mockUserCtx }));

beforeEach(() => {
  vi.clearAllMocks();
  server.use(http.get('*/users', () => HttpResponse.json({ data: [{ id: 'u1', name: 'Ana', email: 'a@a.com' }], error: null })));
});
const noop = () => {};

describe('PaymentMethodModal', () => {
  it('cria forma de pagamento com sucesso', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(http.post('*/payment-methods', () => HttpResponse.json({ data: { id: 'p1' }, error: null }, { status: 201 })));
    render(<PaymentMethodModal isOpen onClose={noop} onSuccess={onSuccess} />);

    await user.type(screen.getByPlaceholderText(/Nubank Card/), 'Nubank');
    await user.click(screen.getByRole('button', { name: 'Create Method' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Forma de pagamento criada com sucesso');
  });

  it('erro de envelope: toast.error sem onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(http.post('*/payment-methods', () => HttpResponse.json({ data: null, error: { code: 'FPG-001' } }, { status: 400 })));
    render(<PaymentMethodModal isOpen onClose={noop} onSuccess={onSuccess} />);

    await user.type(screen.getByPlaceholderText(/Nubank Card/), 'Nubank');
    await user.click(screen.getByRole('button', { name: 'Create Method' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao criar forma de pagamento'));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('modo edição usa updatePaymentMethod', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const pm: PaymentMethod = { id: 'p9', name: 'Cartão', type: 'CREDIT_CARD', shared: false };
    let method = '';
    server.use(http.put('*/payment-methods/p9', () => { method = 'PUT'; return HttpResponse.json({ data: { id: 'p9' }, error: null }); }));
    render(<PaymentMethodModal isOpen onClose={noop} onSuccess={onSuccess} paymentMethod={pm} />);

    expect(screen.getByRole('heading', { name: 'Edit Payment Method' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(method).toBe('PUT');
    expect(toast.success).toHaveBeenCalledWith('Forma de pagamento atualizada');
  });
});
