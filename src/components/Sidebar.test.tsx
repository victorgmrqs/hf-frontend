import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';
import type { BudgetStatus } from '../services/financeService';

type TestUser = { id: string; name: string; email: string };

const ana: TestUser = { id: 'u1', name: 'Ana', email: 'ana@hf.com' };
const bruno: TestUser = { id: 'u2', name: 'Bruno', email: 'bruno@hf.com' };

const userHolder = vi.hoisted(() => ({
  currentUser: { id: 'u1', name: 'Ana', email: 'ana@hf.com' } as
    | { id: string; name: string; email: string }
    | null,
  allUsers: [] as { id: string; name: string; email: string }[],
  setCurrentUser: vi.fn(),
}));
vi.mock('../hooks/useUser', () => ({
  useUser: () => ({
    currentUser: userHolder.currentUser,
    allUsers: userHolder.allUsers,
    setCurrentUser: userHolder.setCurrentUser,
  }),
}));

const holder = vi.hoisted(() => ({ statuses: [] as BudgetStatus[] }));
vi.mock('../contexts/BudgetsContext', () => ({
  useBudgets: () => ({ budgetStatuses: holder.statuses }),
}));

beforeEach(() => {
  holder.statuses = [];
  userHolder.currentUser = ana;
  userHolder.allUsers = [];
  userHolder.setCurrentUser.mockClear();
});

const renderSidebar = (route = '/') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Sidebar />
    </MemoryRouter>,
  );

describe('Sidebar — badge de orçamentos em alerta', () => {
  it('exibe a contagem de orçamentos em alerta/excedidos', () => {
    holder.statuses = [
      { id: '1', category_name: 'A', amount: 1000, current_spending: 400, alert_threshold: 50 }, // normal
      { id: '2', category_name: 'B', amount: 1000, current_spending: 600, alert_threshold: 50 }, // alert
      { id: '3', category_name: 'C', amount: 1000, current_spending: 1000, alert_threshold: 80 }, // exceeded
    ];
    renderSidebar();

    expect(screen.getByLabelText('2 orçamento(s) em alerta')).toHaveTextContent('2');
  });

  it('não exibe badge quando não há orçamentos em alerta', () => {
    holder.statuses = [
      { id: '1', category_name: 'A', amount: 1000, current_spending: 100, alert_threshold: 80 },
    ];
    renderSidebar();

    expect(screen.queryByLabelText(/orçamento\(s\) em alerta/)).not.toBeInTheDocument();
  });
});

describe('Sidebar — navegação', () => {
  it('marca como ativo apenas o item da rota atual', () => {
    renderSidebar('/expenses');

    expect(screen.getByRole('link', { name: 'Expenses' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('marca o Dashboard como ativo somente na rota raiz exata', () => {
    renderSidebar('/');

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Budgets' })).not.toHaveAttribute('aria-current');
  });
});

describe('Sidebar — menu de troca de usuário', () => {
  it('abre o menu, troca o usuário selecionado e fecha o menu', async () => {
    userHolder.allUsers = [ana, bruno];
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole('button', { name: /ana@hf\.com/ }));
    expect(screen.getByText('Switch User')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Bruno/ }));

    expect(userHolder.setCurrentUser).toHaveBeenCalledWith(bruno);
    expect(screen.queryByText('Switch User')).not.toBeInTheDocument();
  });

  it('fecha o menu ao clicar novamente no usuário atual', async () => {
    userHolder.allUsers = [ana, bruno];
    const user = userEvent.setup();
    renderSidebar();

    const trigger = screen.getByRole('button', { name: /ana@hf\.com/ });
    await user.click(trigger);
    expect(screen.getByText('Switch User')).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.queryByText('Switch User')).not.toBeInTheDocument();
  });

  it('mostra placeholder enquanto não há usuário carregado', () => {
    userHolder.currentUser = null;
    renderSidebar();

    expect(screen.getByText('?')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
