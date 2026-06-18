import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BudgetsProvider, useBudgets } from './BudgetsContext';
import { UserProvider } from '../hooks/useUser';
import { server } from '../test/msw/server';

function Probe() {
  const { competence, budgetStatuses, loading } = useBudgets();
  return (
    <div>
      <span data-testid="competence">{competence}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="count">{budgetStatuses.length}</span>
    </div>
  );
}

function renderWithProviders() {
  return render(
    <UserProvider>
      <BudgetsProvider>
        <Probe />
      </BudgetsProvider>
    </UserProvider>,
  );
}

describe('BudgetsContext', () => {
  it('carrega o status de orçamentos do usuário para a competência atual', async () => {
    server.use(
      http.get('*/users', () =>
        HttpResponse.json({ data: [{ id: 'u1', name: 'Ana', email: 'a@a.com' }], error: null }),
      ),
      http.get('*/budgets/status', () =>
        HttpResponse.json({
          data: [
            { id: 'b1', category_name: 'Mercado', amount: 1000, current_spending: 900, alert_threshold: 80 },
          ],
          error: null,
        }),
      ),
    );

    renderWithProviders();

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(screen.getByTestId('competence')).toHaveTextContent(/^\d{4}-\d{2}$/);
  });

  it('lança erro se useBudgets for usado fora do provider', () => {
    expect(() => render(<Probe />)).toThrow(/useBudgets must be used within a BudgetsProvider/);
  });
});
