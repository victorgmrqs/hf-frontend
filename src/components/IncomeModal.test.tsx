import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IncomeModal from './IncomeModal';
import { server } from '../test/msw/server';
import { toast } from 'sonner';
import type { Income } from '../services/incomeService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
const { mockUserCtx } = vi.hoisted(() => ({ mockUserCtx: { currentUser: { id: 'u1', name: 'Ana', email: 'a@a.com' } } }));
vi.mock('../hooks/useUser', () => ({ useUser: () => mockUserCtx }));

beforeEach(() => vi.clearAllMocks());
const noop = () => {};
const baseIncome: Income = {
  id: 'i1', user_id: 'u1', description: 'Salário', amount: 7500, type: 'SALARY',
  date: '2026-06-05', competence: '2026-06', recurrent: true,
};

describe('IncomeModal — criação', () => {
  it('cria receita: envia o corpo e dispara sucesso', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    let body: Record<string, unknown> | undefined;
    server.use(http.post('*/income', async ({ request }) => { body = (await request.json()) as Record<string, unknown>; return HttpResponse.json({ data: { id: 'x' }, error: null }, { status: 201 }); }));
    render(<IncomeModal isOpen onClose={noop} onSuccess={onSuccess} competence="2026-06" />);

    await user.type(screen.getByLabelText('Descrição'), 'Freela');
    await user.type(screen.getByLabelText('Valor'), '1800');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Receita criada com sucesso');
    expect(body).toMatchObject({ description: 'Freela', amount: 1800, competence: '2026-06', recurrent: false });
  });

  it('valida descrição e valor (>0) e bloqueia o envio', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<IncomeModal isOpen onClose={noop} onSuccess={onSuccess} competence="2026-06" />);

    await user.type(screen.getByLabelText('Valor'), '0');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('A descrição é obrigatória')).toBeInTheDocument();
    expect(screen.getByText('Informe um valor maior que zero')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('mapeia error.code INVALID_AMOUNT para mensagem pt-BR', async () => {
    const user = userEvent.setup();
    server.use(http.post('*/income', () => HttpResponse.json({ data: null, error: { code: 'INVALID_AMOUNT' } }, { status: 400 })));
    render(<IncomeModal isOpen onClose={noop} onSuccess={noop} competence="2026-06" />);

    await user.type(screen.getByLabelText('Descrição'), 'X');
    await user.type(screen.getByLabelText('Valor'), '10');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('O valor deve ser maior que zero.'));
  });
});

describe('IncomeModal — edição', () => {
  it('pré-preenche, deixa tipo/data read-only, mostra aviso de recorrente e atualiza', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    let body: Record<string, unknown> | undefined;
    server.use(http.put('*/income/i1', async ({ request }) => { body = (await request.json()) as Record<string, unknown>; return HttpResponse.json({ data: { id: 'i1' }, error: null }); }));
    render(<IncomeModal isOpen onClose={noop} onSuccess={onSuccess} competence="2026-06" income={baseIncome} />);

    expect(screen.getByLabelText('Descrição')).toHaveValue('Salário');
    expect(screen.getByLabelText('Tipo')).toBeDisabled();
    expect(screen.getByLabelText('Data')).toBeDisabled();
    expect(screen.getByText(/vale a partir deste mês/)).toBeInTheDocument();

    const amount = screen.getByLabelText('Valor');
    await user.clear(amount);
    await user.type(amount, '8200');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(body).toMatchObject({ requester_id: 'u1', description: 'Salário', amount: 8200, recurrent: true });
    expect(body).not.toHaveProperty('type');
  });

  it('mapeia CANNOT_EDIT_PROPAGATED_INCOME para pt-BR', async () => {
    const user = userEvent.setup();
    server.use(http.put('*/income/i1', () => HttpResponse.json({ data: null, error: { code: 'CANNOT_EDIT_PROPAGATED_INCOME' } }, { status: 400 })));
    render(<IncomeModal isOpen onClose={noop} onSuccess={noop} competence="2026-06" income={baseIncome} />);

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Receitas recorrentes propagadas não podem ser editadas.'));
  });
});
