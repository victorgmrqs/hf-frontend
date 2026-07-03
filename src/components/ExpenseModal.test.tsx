import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExpenseModal from './ExpenseModal';
import type { Expense } from '../services/financeService';
import { server } from '../test/msw/server';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const { mockUserCtx } = vi.hoisted(() => ({
  mockUserCtx: {
    currentUser: { id: 'u1', name: 'Ana', email: 'a@a.com' },
    allUsers: [
      { id: 'u1', name: 'Ana', email: 'a@a.com' },
      { id: 'u2', name: 'Bruno', email: 'b@b.com' },
    ],
  },
}));
vi.mock('../hooks/useUser', () => ({ useUser: () => mockUserCtx }));

const sharedExpense: Expense = {
  id: 'e1',
  description: 'Jantar em família',
  value: 200,
  date: '2026-06-15',
  competence: '2026-06',
  type: 'SHARED',
  user_id: 'u1',
  category: { id: 'c1', name: 'Mercado', color: '#fff' },
  payment_method: { id: 'p1', name: 'Cartão', type: 'CREDIT_CARD', shared: false },
  shared_with: [
    { user_id: 'u1', name: 'Ana', divided_amount: 100 },
    { user_id: 'u2', name: 'Bruno', divided_amount: 100 },
  ],
};

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

  it('não renderiza nada quando isOpen é false', () => {
    render(<ExpenseModal isOpen={false} onClose={noop} onSuccess={noop} />);

    expect(screen.queryByText('Add New Expense')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save Expense' })).toBeNull();
  });

  it('botão Cancel chama onClose sem enviar nada', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    render(<ExpenseModal isOpen onClose={onClose} onSuccess={onSuccess} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('modo edição pré-preenche os campos e atualiza a despesa via PUT', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    let putUrl = '';
    server.use(
      http.put('*/expenses/:id', ({ request }) => {
        putUrl = request.url;
        return HttpResponse.json({ data: { id: 'e1' }, error: null });
      }),
    );
    render(<ExpenseModal expense={sharedExpense} isOpen onClose={noop} onSuccess={onSuccess} />);

    expect(screen.getByText('Edit Expense')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Jantar em família')).toBeInTheDocument();
    expect(screen.getByDisplayValue('200')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-06-15')).toBeInTheDocument();
    // SHARED: toggle ligado e o participante que não é o pagador aparece como chip
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('button', { name: /Bruno/ })).toBeInTheDocument();

    await waitFor(() => expect(screen.getByRole('option', { name: 'Cartão' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Save Expense' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(putUrl).toContain('/expenses/e1');
    expect(toast.success).toHaveBeenCalledWith('Despesa atualizada com sucesso');
  });

  it('modo edição com erro de envelope no PUT mostra banner e não chama onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(http.put('*/expenses/:id', () => HttpResponse.json({ data: null, error: { code: 'DSP-010' } }, { status: 400 })));
    render(<ExpenseModal expense={sharedExpense} isOpen onClose={noop} onSuccess={onSuccess} />);

    await waitFor(() => expect(screen.getByRole('option', { name: 'Cartão' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Save Expense' }));

    expect(await screen.findByText(/Erro ao atualizar despesa/)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('marcar Shared mostra chips e desmarcar o único participante bloqueia o envio', async () => {
    const user = userEvent.setup();
    render(<ExpenseModal isOpen onClose={noop} onSuccess={noop} />);

    await user.click(screen.getByRole('checkbox'));

    // pagador (Ana) fica fora dos chips; Bruno entra pré-selecionado
    expect(screen.getByText('Split with:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bruno/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ana/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: /Bruno/ }));

    expect(await screen.findByText('Despesas compartilhadas precisam de pelo menos 2 participantes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Expense' })).toBeDisabled();
  });

  it('POST de despesa compartilhada envia type SHARED, participantes e valor com vírgula convertido', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    let body: Record<string, unknown> = {};
    server.use(
      http.get('*/payment-methods/user/*', () =>
        HttpResponse.json({
          data: [
            { id: 'p1', name: 'Cartão', type: 'CREDIT_CARD', shared: false },
            { id: 'p2', name: 'Pix', type: 'PIX', shared: false },
          ],
          error: null,
        }),
      ),
      http.post('*/expenses', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: { id: 'e2' }, error: null }, { status: 201 });
      }),
    );
    render(<ExpenseModal isOpen onClose={noop} onSuccess={onSuccess} />);

    await waitFor(() => expect(screen.getByRole('option', { name: 'Pix' })).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText('0,00'), '120,50');
    await user.type(screen.getByPlaceholderText(/Weekly Groceries/), 'Compras do mês');
    await user.selectOptions(screen.getByLabelText('Category'), 'Mercado');
    await user.selectOptions(screen.getByLabelText('Payment Method'), 'Pix');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Save Expense' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(body.type).toBe('SHARED');
    expect(body.shared_user_ids).toEqual(expect.arrayContaining(['u1', 'u2']));
    expect(body.amount).toBe(120.5);
    expect(body.category_id).toBe('c1');
    expect(body.payment_method_id).toBe('p2');
  });

  it('DSP-07: trocar o pagador move o pagador anterior para participante e remove o novo', async () => {
    const user = userEvent.setup();
    render(<ExpenseModal isOpen onClose={noop} onSuccess={noop} />);

    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: /Bruno/ })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Paid by'), 'u2');

    // Bruno virou pagador (sai dos chips) e Ana, pagadora anterior, vira participante
    expect(screen.getByRole('button', { name: /Ana/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Bruno/ })).toBeNull();
    // continua válido: com Ana selecionada não há erro de participantes
    expect(screen.queryByText('Despesas compartilhadas precisam de pelo menos 2 participantes')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save Expense' })).toBeEnabled();
  });
});
