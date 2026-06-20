import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Settings from './Settings';
import { renderWithProviders } from '../test/renderWithProviders';
import { pageHandlers } from '../test/msw/pageHandlers';
import { server } from '../test/msw/server';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  server.use(...pageHandlers);
});

describe('Settings (integração)', () => {
  it('renderiza categorias e formas de pagamento vindas da API', async () => {
    server.use(
      http.get('*/categories', () => HttpResponse.json({ data: [{ id: 'c1', name: 'Casa', color: '#fff' }], error: null })),
      http.get('*/payment-methods/user/:id', () =>
        HttpResponse.json({ data: [{ id: 'p1', name: 'Cartão Nubank', type: 'CREDIT_CARD', shared: false }], error: null }),
      ),
    );
    renderWithProviders(<Settings />);

    expect(await screen.findByText('Casa')).toBeInTheDocument();
    expect(await screen.findByText('Cartão Nubank')).toBeInTheDocument();
  });

  it('mostra estado vazio de categorias quando não há dados', async () => {
    renderWithProviders(<Settings />);
    expect(await screen.findByText('Nenhuma categoria criada ainda.')).toBeInTheDocument();
  });

  it('exclui uma categoria: confirma e chama deleteCategory', async () => {
    const user = userEvent.setup();
    let deleted = false;
    server.use(
      http.get('*/categories', () => HttpResponse.json({ data: [{ id: 'c1', name: 'Casa', color: '#fff' }], error: null })),
      http.delete('*/categories/c1', () => { deleted = true; return HttpResponse.json({ data: null, error: null }); }),
    );
    renderWithProviders(<Settings />);

    const row = (await screen.findByText('Casa')).closest('div.group') as HTMLElement;
    await user.click(within(row).getByRole('button'));
    await user.click(await screen.findByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(deleted).toBe(true));
  });

  it('abre o modal de nova categoria', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Settings />);
    await user.click(await screen.findByRole('button', { name: /Add Category/i }));
    expect(await screen.findByRole('heading', { name: 'New Category' })).toBeInTheDocument();
  });

  it('abre o modal de nova forma de pagamento', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Settings />);
    await user.click(await screen.findByRole('button', { name: /Add Method/i }));
    expect(await screen.findByRole('heading', { name: 'New Payment Method' })).toBeInTheDocument();
  });

  it('exclui uma forma de pagamento: confirma e chama deletePaymentMethod', async () => {
    const user = userEvent.setup();
    let deleted = false;
    server.use(
      http.get('*/payment-methods/user/:id', () => HttpResponse.json({ data: [{ id: 'p1', name: 'Cartão Nubank', type: 'CREDIT_CARD', shared: false }], error: null })),
      http.delete('*/payment-methods/p1', () => { deleted = true; return HttpResponse.json({ data: null, error: null }); }),
    );
    renderWithProviders(<Settings />);

    const row = (await screen.findByText('Cartão Nubank')).closest('div.group') as HTMLElement;
    await user.click(within(row).getByRole('button'));
    await user.click(await screen.findByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(deleted).toBe(true));
  });
});
