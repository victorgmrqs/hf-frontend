import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalBudgetModal from './GlobalBudgetModal';
import { server } from '../test/msw/server';
import { toast } from 'sonner';
import type { GlobalBudget } from '../services/incomeService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../hooks/useUser', () => ({
  useUser: () => ({
    currentUser: { id: 'u1', name: 'Ana', email: 'a@a.com' },
    allUsers: [{ id: 'u1', name: 'Ana', email: 'a@a.com' }],
  }),
}));

const existing: GlobalBudget = {
  id: 'gb1', user_id: 'u1', competence: '2026-07', ceiling: 2500, auto_adjusted: true,
};

const rawBudget = (ceiling: string) => ({
  id: 'gb1', user_id: 'u1', competence: '2026-07', ceiling, auto_adjusted: false,
});

const noop = () => {};

beforeEach(() => vi.clearAllMocks());

describe('GlobalBudgetModal', () => {
  it('não renderiza nada quando isOpen é false', () => {
    render(
      <GlobalBudgetModal isOpen={false} onClose={noop} onSuccess={noop} competence="2026-07" budget={null} />,
    );
    expect(screen.queryByText(/Teto Global/)).not.toBeInTheDocument();
  });

  it('valida teto vazio/zero e não envia', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(
      <GlobalBudgetModal isOpen onClose={noop} onSuccess={onSuccess} competence="2026-07" budget={null} />,
    );

    await user.click(screen.getByRole('button', { name: 'Salvar Teto' }));
    expect(await screen.findByText('Informe um teto válido maior que zero')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Teto do mês'), '0');
    await user.click(screen.getByRole('button', { name: 'Salvar Teto' }));
    expect(await screen.findByText('Informe um teto válido maior que zero')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('cria o teto via POST com user_id, competence e valor com vírgula convertido', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    let seenBody: Record<string, unknown> | undefined;
    server.use(
      http.post('*/budgets/global', async ({ request }) => {
        seenBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: rawBudget('1800.50'), error: null }, { status: 201 });
      }),
    );
    render(
      <GlobalBudgetModal isOpen onClose={noop} onSuccess={onSuccess} competence="2026-07" budget={null} />,
    );

    await user.type(screen.getByLabelText('Teto do mês'), '1800,50');
    await user.click(screen.getByRole('button', { name: 'Salvar Teto' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(seenBody).toEqual({ user_id: 'u1', competence: '2026-07', ceiling: 1800.5 });
    expect(toast.success).toHaveBeenCalledWith('Teto global definido com sucesso');
  });

  it('edita o teto existente via PUT pré-preenchendo o valor atual', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    let seenBody: Record<string, unknown> | undefined;
    server.use(
      http.put('*/budgets/global/gb1', async ({ request }) => {
        seenBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: rawBudget('3200.00'), error: null });
      }),
    );
    render(
      <GlobalBudgetModal isOpen onClose={noop} onSuccess={onSuccess} competence="2026-07" budget={existing} />,
    );

    const input = screen.getByLabelText('Teto do mês');
    expect(input).toHaveValue('2500');
    await user.clear(input);
    await user.type(input, '3200');
    await user.click(screen.getByRole('button', { name: 'Salvar Teto' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(seenBody).toEqual({ ceiling: 3200 });
    expect(toast.success).toHaveBeenCalledWith('Teto global atualizado com sucesso');
  });

  it('BUDGET_ALREADY_EXISTS (409) mostra a mensagem pt-BR no banner e não chama onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(
      http.post('*/budgets/global', () =>
        HttpResponse.json({ data: null, error: { code: 'BUDGET_ALREADY_EXISTS' } }, { status: 409 }),
      ),
    );
    render(
      <GlobalBudgetModal isOpen onClose={noop} onSuccess={onSuccess} competence="2026-07" budget={null} />,
    );

    await user.type(screen.getByLabelText('Teto do mês'), '1000');
    await user.click(screen.getByRole('button', { name: 'Salvar Teto' }));

    expect(
      await screen.findByText('Já existe um teto definido para este mês. Edite o valor atual.'),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('INVALID_CEILING no PUT mostra a mensagem pt-BR no banner', async () => {
    const user = userEvent.setup();
    server.use(
      http.put('*/budgets/global/gb1', () =>
        HttpResponse.json({ data: null, error: { code: 'INVALID_CEILING' } }, { status: 400 }),
      ),
    );
    render(
      <GlobalBudgetModal isOpen onClose={noop} onSuccess={noop} competence="2026-07" budget={existing} />,
    );

    await user.clear(screen.getByLabelText('Teto do mês'));
    await user.type(screen.getByLabelText('Teto do mês'), '10');
    await user.click(screen.getByRole('button', { name: 'Salvar Teto' }));

    expect(
      await screen.findByText('O teto deve ser um valor maior que zero.'),
    ).toBeInTheDocument();
  });

  it('botão Cancelar chama onClose sem enviar nada', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    render(
      <GlobalBudgetModal isOpen onClose={onClose} onSuccess={onSuccess} competence="2026-07" budget={null} />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
