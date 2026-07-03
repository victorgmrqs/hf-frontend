import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Settings from './Settings';
import { renderWithProviders } from '../test/renderWithProviders';
import { pageHandlers } from '../test/msw/pageHandlers';
import { server } from '../test/msw/server';
import { toast } from 'sonner';
import { financeService } from '../services/financeService';

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

  it('mostra estado vazio de formas de pagamento quando não há dados', async () => {
    renderWithProviders(<Settings />);
    expect(await screen.findByText('No payment methods found.')).toBeInTheDocument();
  });

  it('estado vazio de categorias: botão Nova Categoria abre o modal de criação', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Settings />);

    await user.click(await screen.findByRole('button', { name: /Nova Categoria/i }));

    expect(await screen.findByRole('heading', { name: 'New Category' })).toBeInTheDocument();
  });

  it('clicar em uma categoria abre o modal de edição pré-preenchido', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/categories', () => HttpResponse.json({ data: [{ id: 'c1', name: 'Casa', color: '#fff' }], error: null })),
    );
    renderWithProviders(<Settings />);

    await user.click(await screen.findByText('Casa'));

    expect(await screen.findByRole('heading', { name: 'Edit Category' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Casa')).toBeInTheDocument();
  });

  it('clicar em uma forma de pagamento compartilhada abre o modal de edição e mostra selo Shared', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/payment-methods/user/:id', () =>
        HttpResponse.json({ data: [{ id: 'p1', name: 'Conta Conjunta', type: 'BANK_ACCOUNT', shared: true }], error: null }),
      ),
    );
    renderWithProviders(<Settings />);

    expect(await screen.findByText('Shared')).toBeInTheDocument();
    await user.click(screen.getByText('Conta Conjunta'));

    expect(await screen.findByRole('heading', { name: 'Edit Payment Method' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Conta Conjunta')).toBeInTheDocument();
  });

  it('cancelar a exclusão fecha o modal sem chamar a API', async () => {
    const user = userEvent.setup();
    let deleted = false;
    server.use(
      http.get('*/categories', () => HttpResponse.json({ data: [{ id: 'c1', name: 'Casa', color: '#fff' }], error: null })),
      http.delete('*/categories/c1', () => { deleted = true; return HttpResponse.json({ data: null, error: null }); }),
    );
    renderWithProviders(<Settings />);

    const row = (await screen.findByText('Casa')).closest('div.group') as HTMLElement;
    await user.click(within(row).getByRole('button'));
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument());
    expect(deleted).toBe(false);
  });

  it('erro ao excluir categoria exibe mensagem pt-BR mapeada do error.code', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/categories', () => HttpResponse.json({ data: [{ id: 'c1', name: 'Casa', color: '#fff' }], error: null })),
      http.delete('*/categories/c1', () =>
        HttpResponse.json({ data: null, error: { code: 'CATEGORY_NOT_FOUND' } }, { status: 404 }),
      ),
    );
    renderWithProviders(<Settings />);

    const row = (await screen.findByText('Casa')).closest('div.group') as HTMLElement;
    await user.click(within(row).getByRole('button'));
    await user.click(await screen.findByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Categoria não encontrada.'));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('erro ao excluir forma de pagamento exibe mensagem pt-BR mapeada do error.code', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/payment-methods/user/:id', () =>
        HttpResponse.json({ data: [{ id: 'p1', name: 'Cartão Nubank', type: 'CREDIT_CARD', shared: false }], error: null }),
      ),
      http.delete('*/payment-methods/p1', () =>
        HttpResponse.json({ data: null, error: { code: 'PAYMENT_METHOD_NOT_FOUND' } }, { status: 404 }),
      ),
    );
    renderWithProviders(<Settings />);

    const row = (await screen.findByText('Cartão Nubank')).closest('div.group') as HTMLElement;
    await user.click(within(row).getByRole('button'));
    await user.click(await screen.findByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Forma de pagamento não encontrada.'));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('fecha os modais de categoria e forma de pagamento ao clicar em Cancel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Settings />);

    await user.click(await screen.findByRole('button', { name: /Add Category/i }));
    expect(await screen.findByRole('heading', { name: 'New Category' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'New Category' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Add Method/i }));
    expect(await screen.findByRole('heading', { name: 'New Payment Method' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'New Payment Method' })).not.toBeInTheDocument(),
    );
  });

  it('falha inesperada ao carregar dados exibe toast de erro de carregamento', async () => {
    const spy = vi.spyOn(financeService, 'getCategories').mockRejectedValueOnce(new Error('network down'));
    renderWithProviders(<Settings />);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao carregar configurações'));
    spy.mockRestore();
  });
});
