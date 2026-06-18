import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CategoryModal from './CategoryModal';
import { server } from '../test/msw/server';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());
const noop = () => {};

describe('CategoryModal', () => {
  it('cria categoria: submit chama createCategory e dispara sucesso', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(http.post('*/categories', () => HttpResponse.json({ data: { id: 'c1' }, error: null }, { status: 201 })));
    render(<CategoryModal isOpen onClose={noop} onSuccess={onSuccess} />);

    await user.type(screen.getByPlaceholderText(/Health, Education/), 'Pets');
    await user.click(screen.getByRole('button', { name: /Create Category/ }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Categoria criada com sucesso');
  });

  it('erro de envelope: toast.error e não chama onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(http.post('*/categories', () => HttpResponse.json({ data: null, error: { code: 'CAT-001' } }, { status: 400 })));
    render(<CategoryModal isOpen onClose={noop} onSuccess={onSuccess} />);

    await user.type(screen.getByPlaceholderText(/Health, Education/), 'Pets');
    await user.click(screen.getByRole('button', { name: /Create Category/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao criar categoria'));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('modo edição: título Edit Category e usa updateCategory', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    let method = '';
    server.use(
      http.put('*/categories/c1', () => {
        method = 'PUT';
        return HttpResponse.json({ data: { id: 'c1' }, error: null });
      }),
    );
    render(
      <CategoryModal
        isOpen
        onClose={noop}
        onSuccess={onSuccess}
        category={{ id: 'c1', name: 'Casa', color: '#fff' }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Edit Category' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Create Category/ }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(method).toBe('PUT');
    expect(toast.success).toHaveBeenCalledWith('Categoria atualizada com sucesso');
  });
});
