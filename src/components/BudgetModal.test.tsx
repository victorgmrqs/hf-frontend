import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import BudgetModal from './BudgetModal';
import { server } from '../test/msw/server';
import type { BudgetStatus } from '../services/financeService';

// useUser é colaborador, não a unidade sob teste — fixar o currentUser evita o
// bootstrap assíncrono do provider e isola o comportamento do modal.
vi.mock('../hooks/useUser', () => ({
  useUser: () => ({ currentUser: { id: 'u1', name: 'Ana', email: 'a@a.com' } }),
}));

function categoriesHandler() {
  return http.get('*/categories', () =>
    HttpResponse.json({ data: [{ id: 'c1', name: 'Mercado', color: '#fff' }], error: null }),
  );
}

describe('BudgetModal — criação', () => {
  it('mostra o campo "Alerta em (%)" com valor padrão 80', async () => {
    server.use(categoriesHandler());
    render(<BudgetModal isOpen onClose={() => {}} onSuccess={() => {}} competence="2026-06" />);

    expect(screen.getByLabelText('Alerta em (%)')).toHaveValue(80);
  });

  it('bloqueia o envio quando o alerta está fora de 1–100', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(categoriesHandler());
    render(<BudgetModal isOpen onClose={() => {}} onSuccess={onSuccess} competence="2026-06" />);

    await user.type(screen.getByLabelText('Monthly Limit'), '500');
    const alert = screen.getByLabelText('Alerta em (%)');
    await user.clear(alert);
    await user.type(alert, '150');
    await user.click(screen.getByRole('button', { name: /save budget/i }));

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('envia alert_threshold no corpo ao criar', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    let body: Record<string, unknown> | undefined;
    server.use(
      categoriesHandler(),
      http.post('*/budgets', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: { id: 'b1' }, error: null }, { status: 201 });
      }),
    );
    render(<BudgetModal isOpen onClose={() => {}} onSuccess={onSuccess} competence="2026-06" />);

    await user.selectOptions(await screen.findByLabelText('Category'), 'c1');
    await user.type(screen.getByLabelText('Monthly Limit'), '1000');
    const alert = screen.getByLabelText('Alerta em (%)');
    await user.clear(alert);
    await user.type(alert, '70');
    await user.click(screen.getByRole('button', { name: /save budget/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(body).toMatchObject({ alert_threshold: 70, amount: 1000, category_id: 'c1' });
  });
});

describe('BudgetModal — edição', () => {
  const budget: BudgetStatus = {
    id: 'b9',
    category_name: 'Lazer',
    amount: 500,
    current_spending: 100,
    alert_threshold: 60,
  };

  it('pré-preenche o alerta e envia o novo valor no update', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    let body: Record<string, unknown> | undefined;
    server.use(
      http.put('*/budgets/b9', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: { id: 'b9' }, error: null });
      }),
    );
    render(
      <BudgetModal isOpen onClose={() => {}} onSuccess={onSuccess} competence="2026-06" budget={budget} />,
    );

    expect(screen.getByLabelText('Alerta em (%)')).toHaveValue(60);
    expect(screen.getByText('Lazer')).toBeInTheDocument();

    const alert = screen.getByLabelText('Alerta em (%)');
    await user.clear(alert);
    await user.type(alert, '90');
    await user.click(screen.getByRole('button', { name: /save budget/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(body).toMatchObject({ alert_threshold: 90, amount: 500 });
  });
});
