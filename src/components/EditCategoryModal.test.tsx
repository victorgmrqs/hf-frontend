import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditCategoryModal from './EditCategoryModal';
import { server } from '../test/msw/server';
import { toast } from 'sonner';
import type { Expense } from '../services/financeService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const { mockUserCtx } = vi.hoisted(() => ({ mockUserCtx: { currentUser: { id: 'u1', name: 'Ana', email: 'a@a.com' } } }));
vi.mock('../hooks/useUser', () => ({ useUser: () => mockUserCtx }));

beforeEach(() => vi.clearAllMocks());
const noop = () => {};

const expense: Expense = {
  id: 'e1',
  description: 'Mercado',
  value: 50,
  date: '2026-06-01',
  competence: '2026-06',
  type: 'PERSONAL',
  user_id: 'u1',
  payment_method: { id: 'p1', name: 'Cartão', type: 'CREDIT_CARD', shared: false },
};

describe('EditCategoryModal', () => {
  it('carrega categorias no select e atualiza com sucesso', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(
      http.get('*/categories', () => HttpResponse.json({ data: [{ id: 'c1', name: 'Casa', color: '#fff' }], error: null })),
      http.patch('*/expenses/e1/category', () => HttpResponse.json({ data: { id: 'e1' }, error: null })),
    );
    render(<EditCategoryModal isOpen expense={expense} onClose={noop} onSuccess={onSuccess} />);

    const select = await screen.findByRole('combobox', { name: /Select Category/ });
    await waitFor(() => expect(screen.getByRole('option', { name: 'Casa' })).toBeInTheDocument());
    await user.selectOptions(select, 'c1');
    await user.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Categoria atualizada com sucesso');
  });

  it('erro de envelope: toast.error e não chama onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(
      http.get('*/categories', () => HttpResponse.json({ data: [], error: null })),
      http.patch('*/expenses/e1/category', () => HttpResponse.json({ data: null, error: { code: 'DSP-001' } }, { status: 400 })),
    );
    render(<EditCategoryModal isOpen expense={expense} onClose={noop} onSuccess={onSuccess} />);

    await user.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao atualizar categoria'));
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
