import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExpenseModal from './ExpenseModal';
import AccountPayableModal from './AccountPayableModal';
import PayAccountModal from './PayAccountModal';
import EditCategoryModal from './EditCategoryModal';
import { server } from '../test/msw/server';
import type { AccountPayable, Expense } from '../services/financeService';

// useUser é colaborador; fixá-lo isola os modais. A referência precisa ser ESTÁVEL
// entre renders — modais com useEffect dep [currentUser] entrariam em loop se o
// objeto mudasse a cada chamada.
const { mockUserCtx } = vi.hoisted(() => {
  const u = { id: 'u1', name: 'Ana', email: 'ana@hf.com' };
  return { mockUserCtx: { currentUser: u, allUsers: [u] } };
});
vi.mock('../hooks/useUser', () => ({ useUser: () => mockUserCtx }));

beforeEach(() => {
  server.use(
    http.get('*/categories', () => HttpResponse.json({ data: [], error: null })),
    http.get('*/payment-methods/user/*', () => HttpResponse.json({ data: [], error: null })),
  );
});

const noop = () => {};

const account: AccountPayable = {
  id: 'a1',
  description: 'Conta',
  amount: 100,
  due_date: '2026-06-01',
  status: 'PENDING',
  recurrence: 'NONE',
};

const expense: Expense = {
  id: 'e1',
  description: 'Compra',
  value: 50,
  date: '2026-06-01',
  competence: '2026-06',
  type: 'PERSONAL',
  user_id: 'u1',
  payment_method: { id: 'p1', name: 'Cartão', type: 'CREDIT_CARD', shared: false },
};

// Cada select de modal deve ter nome acessível (corrige select-name — HF-85).
describe('a11y dos selects em modais (nome acessível)', () => {
  it('ExpenseModal: Paid by, Category e Payment Method', async () => {
    render(<ExpenseModal isOpen onClose={noop} onSuccess={noop} />);
    expect(await screen.findByRole('combobox', { name: 'Paid by' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Category' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Payment Method' })).toBeInTheDocument();
  });

  it('AccountPayableModal: Recurrence', () => {
    render(<AccountPayableModal isOpen onClose={noop} onSuccess={noop} />);
    expect(screen.getByRole('combobox', { name: 'Recurrence' })).toBeInTheDocument();
  });

  it('PayAccountModal: Payment Method e Category', async () => {
    render(<PayAccountModal account={account} isOpen onClose={noop} onSuccess={noop} />);
    expect(await screen.findByRole('combobox', { name: 'Payment Method' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Category/ })).toBeInTheDocument();
  });

  it('EditCategoryModal: Select Category', async () => {
    render(<EditCategoryModal expense={expense} isOpen onClose={noop} onSuccess={noop} />);
    expect(await screen.findByRole('combobox', { name: /Select Category/ })).toBeInTheDocument();
  });
});
