import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountPayableModal from './AccountPayableModal';
import { server } from '../test/msw/server';
import { toast } from 'sonner';
import type { AccountPayable } from '../services/financeService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const { mockUserCtx } = vi.hoisted(() => ({ mockUserCtx: { currentUser: { id: 'u1', name: 'Ana', email: 'a@a.com' } } }));
vi.mock('../hooks/useUser', () => ({ useUser: () => mockUserCtx }));

beforeEach(() => vi.clearAllMocks());
const noop = () => {};

describe('AccountPayableModal', () => {
  it('valor inválido bloqueia o envio', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<AccountPayableModal isOpen onClose={noop} onSuccess={onSuccess} />);

    await user.type(screen.getByPlaceholderText('0,00'), 'abc');
    await user.type(screen.getByPlaceholderText(/Electricity/), 'Luz');
    await user.click(screen.getByRole('button', { name: /Save|Create|Account/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Informe um valor válido'));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('cria conta a pagar com sucesso', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(http.post('*/accounts-payable', () => HttpResponse.json({ data: { id: 'a1' }, error: null }, { status: 201 })));
    render(<AccountPayableModal isOpen onClose={noop} onSuccess={onSuccess} />);

    await user.type(screen.getByPlaceholderText('0,00'), '150,50');
    await user.type(screen.getByPlaceholderText(/Electricity/), 'Luz');
    await user.click(screen.getByRole('button', { name: /Save|Create|Account/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Conta a pagar criada com sucesso');
  });

  it('erro de envelope: toast.error sem onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(http.post('*/accounts-payable', () => HttpResponse.json({ data: null, error: { code: 'CTP-001' } }, { status: 400 })));
    render(<AccountPayableModal isOpen onClose={noop} onSuccess={onSuccess} />);

    await user.type(screen.getByPlaceholderText('0,00'), '10');
    await user.type(screen.getByPlaceholderText(/Electricity/), 'Luz');
    await user.click(screen.getByRole('button', { name: /Save|Create|Account/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao criar conta a pagar'));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('modo edição usa updateAccountPayable', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const account: AccountPayable = {
      id: 'a9', description: 'Internet', amount: 99, due_date: '2026-06-10', status: 'PENDING', recurrence: 'MONTHLY',
    };
    let method = '';
    server.use(http.put('*/accounts-payable/a9', () => { method = 'PUT'; return HttpResponse.json({ data: { id: 'a9' }, error: null }); }));
    render(<AccountPayableModal isOpen onClose={noop} onSuccess={onSuccess} account={account} />);

    expect(screen.getByRole('heading', { name: 'Edit Account Payable' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Save|Update|Account/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(method).toBe('PUT');
    expect(toast.success).toHaveBeenCalledWith('Conta atualizada com sucesso');
  });
});
