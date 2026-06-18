import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';
import type { BudgetStatus } from '../services/financeService';

vi.mock('../hooks/useUser', () => ({
  useUser: () => ({
    currentUser: { id: 'u1', name: 'Ana', email: 'a@a.com' },
    allUsers: [],
    setCurrentUser: () => {},
  }),
}));

const holder = vi.hoisted(() => ({ statuses: [] as BudgetStatus[] }));
vi.mock('../contexts/BudgetsContext', () => ({
  useBudgets: () => ({ budgetStatuses: holder.statuses }),
}));

const renderSidebar = () =>
  render(
    <MemoryRouter>
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
