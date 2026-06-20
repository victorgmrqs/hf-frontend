import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Expenses from './Expenses';
import { renderWithProviders } from '../test/renderWithProviders';
import { pageHandlers } from '../test/msw/pageHandlers';
import { server } from '../test/msw/server';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const currentMonth = new Date().toISOString().substring(0, 7);
const expense = {
  id: 'e1', description: 'Mercado Pão de Açúcar', value: 250, date: `${currentMonth}-05`,
  competence: currentMonth, type: 'PERSONAL', user_id: 'u1',
  payment_method: { id: 'p1', name: 'Cartão', type: 'CREDIT_CARD', shared: false },
};

beforeEach(() => {
  vi.clearAllMocks();
  server.use(...pageHandlers);
});

describe('Expenses (integração)', () => {
  it('renderiza a lista de despesas vinda da API', async () => {
    server.use(http.get('*/expenses/user/:id', () => HttpResponse.json({ data: [expense], error: null })));
    renderWithProviders(<Expenses />);

    expect(await screen.findByText('Mercado Pão de Açúcar')).toBeInTheDocument();
  });

  it('mostra estado vazio e abre o modal pela ação "Nova Despesa"', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Expenses />);
    expect(await screen.findByText(/Nenhuma despesa em/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Nova Despesa' }));
    expect(await screen.findByRole('heading', { name: 'Add New Expense' })).toBeInTheDocument();
  });

  it('em erro de envelope, degrada para o estado vazio sem quebrar', async () => {
    server.use(
      http.get('*/expenses/user/:id', () => HttpResponse.json({ data: null, error: { code: 'DSP-500' } }, { status: 500 })),
    );
    renderWithProviders(<Expenses />);
    expect(await screen.findByText(/Nenhuma despesa em/)).toBeInTheDocument();
  });

  it('exclui despesa: confirma e chama deleteExpense', async () => {
    const user = userEvent.setup();
    let deleted = false;
    server.use(
      http.get('*/expenses/user/:id', () => HttpResponse.json({ data: [expense], error: null })),
      http.delete('*/expenses/e1', () => { deleted = true; return HttpResponse.json({ data: null, error: null }); }),
    );
    renderWithProviders(<Expenses />);

    await user.click(await screen.findByRole('button', { name: 'Delete Expense' }));
    await user.click(await screen.findByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(deleted).toBe(true));
  });

  it('filtra por tipo (refetch com type) e some quando o servidor não retorna', async () => {
    const user = userEvent.setup();
    // Filtro é server-side: o refetch envia ?type=...; simula vazio quando filtrado.
    server.use(
      http.get('*/expenses/user/:id', ({ request }) => {
        const hasType = new URL(request.url).searchParams.has('type');
        return HttpResponse.json({ data: hasType ? [] : [expense], error: null });
      }),
    );
    renderWithProviders(<Expenses />);

    await screen.findByText('Mercado Pão de Açúcar');
    await user.selectOptions(screen.getByLabelText('Filtrar por tipo'), 'SHARED');

    await waitFor(() => expect(screen.queryByText('Mercado Pão de Açúcar')).not.toBeInTheDocument());
  });

  it('renderiza despesa compartilhada de outro usuário (badge + paga por)', async () => {
    const shared = {
      ...expense, id: 'e2', description: 'Jantar', type: 'SHARED', user_id: 'u2',
      payment_method: { id: 'p2', name: 'Conta Conjunta', type: 'BANK_ACCOUNT', shared: true },
    };
    server.use(http.get('*/expenses/user/:id', () => HttpResponse.json({ data: [shared], error: null })));
    renderWithProviders(<Expenses />);

    expect(await screen.findByText('Jantar')).toBeInTheDocument();
    expect(screen.getByText('Joint')).toBeInTheDocument();
  });

  it('abre o modal de edição completa da despesa', async () => {
    const user = userEvent.setup();
    server.use(http.get('*/expenses/user/:id', () => HttpResponse.json({ data: [expense], error: null })));
    renderWithProviders(<Expenses />);

    await user.click(await screen.findByRole('button', { name: 'Edit Full Expense' }));
    expect(await screen.findByRole('heading', { name: 'Edit Expense' })).toBeInTheDocument();
  });

  it('busca por descrição sem resultado mostra empty de busca', async () => {
    const user = userEvent.setup();
    server.use(http.get('*/expenses/user/:id', () => HttpResponse.json({ data: [expense], error: null })));
    renderWithProviders(<Expenses />);

    await screen.findByText('Mercado Pão de Açúcar');
    await user.type(screen.getByPlaceholderText(/Buscar/), 'zzz');

    expect(await screen.findByText(/Nenhuma despesa encontrada para "zzz"/)).toBeInTheDocument();

    // limpar a busca restaura a lista
    await user.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(await screen.findByText('Mercado Pão de Açúcar')).toBeInTheDocument();
  });

  it('renderiza controles de paginação com muitas despesas', async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      ...expense, id: `e${i}`, description: `Despesa ${i}`,
    }));
    server.use(http.get('*/expenses/user/:id', () => HttpResponse.json({ data: many, error: null })));
    renderWithProviders(<Expenses />);

    expect(await screen.findByText(/Página/)).toBeInTheDocument();
  });

  it('abre o modal de editar categoria da linha', async () => {
    const user = userEvent.setup();
    server.use(http.get('*/expenses/user/:id', () => HttpResponse.json({ data: [expense], error: null })));
    renderWithProviders(<Expenses />);

    await user.click(await screen.findByRole('button', { name: 'Edit Category' }));
    expect(await screen.findByRole('heading', { name: 'Edit Category' })).toBeInTheDocument();
  });

  it('abre o modal de nova despesa', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Expenses />);
    await user.click(await screen.findByRole('button', { name: 'Add Expense' }));
    expect(await screen.findByRole('heading', { name: 'Add New Expense' })).toBeInTheDocument();
  });
});
