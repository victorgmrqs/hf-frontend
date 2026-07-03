import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PaymentMethodModal from './PaymentMethodModal';
import { server } from '../test/msw/server';
import { toast } from 'sonner';
import type { PaymentMethod } from '../services/financeService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const { mockUserCtx } = vi.hoisted(() => ({ mockUserCtx: { currentUser: { id: 'u1', name: 'Ana', email: 'a@a.com' } } }));
vi.mock('../hooks/useUser', () => ({ useUser: () => mockUserCtx }));

beforeEach(() => {
  vi.clearAllMocks();
  server.use(http.get('*/users', () => HttpResponse.json({ data: [{ id: 'u1', name: 'Ana', email: 'a@a.com' }], error: null })));
});
const noop = () => {};

describe('PaymentMethodModal', () => {
  it('cria forma de pagamento com sucesso', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(http.post('*/payment-methods', () => HttpResponse.json({ data: { id: 'p1' }, error: null }, { status: 201 })));
    render(<PaymentMethodModal isOpen onClose={noop} onSuccess={onSuccess} />);

    await user.type(screen.getByPlaceholderText(/Nubank Card/), 'Nubank');
    await user.click(screen.getByRole('button', { name: 'Create Method' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Forma de pagamento criada com sucesso');
  });

  it('erro de envelope: toast.error sem onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(http.post('*/payment-methods', () => HttpResponse.json({ data: null, error: { code: 'FPG-001' } }, { status: 400 })));
    render(<PaymentMethodModal isOpen onClose={noop} onSuccess={onSuccess} />);

    await user.type(screen.getByPlaceholderText(/Nubank Card/), 'Nubank');
    await user.click(screen.getByRole('button', { name: 'Create Method' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro ao criar forma de pagamento'));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('não renderiza nada quando isOpen é false', () => {
    render(<PaymentMethodModal isOpen={false} onClose={noop} onSuccess={noop} />);
    expect(screen.queryByRole('heading', { name: 'New Payment Method' })).not.toBeInTheDocument();
  });

  it('chama onClose ao clicar em Cancel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PaymentMethodModal isOpen onClose={onClose} onSuccess={noop} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('seleciona o tipo PIX e envia no payload', async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post('*/payment-methods', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: { id: 'p1' }, error: null }, { status: 201 });
      }),
    );
    render(<PaymentMethodModal isOpen onClose={noop} onSuccess={noop} />);

    await user.type(screen.getByPlaceholderText(/Nubank Card/), 'Chave PIX');
    await user.click(screen.getByRole('button', { name: 'PIX' }));
    await user.click(screen.getByRole('button', { name: 'Create Method' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Forma de pagamento criada com sucesso'));
    expect(body?.type).toBe('PIX');
    expect(body?.user_ids).toEqual(['u1']);
  });

  it('método compartilhado: vincula outro usuário e envia user_ids', async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> | undefined;
    server.use(
      http.get('*/users', () =>
        HttpResponse.json({
          data: [
            { id: 'u1', name: 'Ana', email: 'a@a.com' },
            { id: 'u2', name: 'Bruno', email: 'b@b.com' },
          ],
          error: null,
        }),
      ),
      http.post('*/payment-methods', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: { id: 'p1' }, error: null }, { status: 201 });
      }),
    );
    render(<PaymentMethodModal isOpen onClose={noop} onSuccess={noop} />);

    await user.type(screen.getByPlaceholderText(/Nubank Card/), 'Conta Conjunta');
    await user.click(screen.getByRole('checkbox'));
    expect(await screen.findByText('Linked Users:')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /Bruno/ }));
    await user.click(screen.getByRole('button', { name: 'Create Method' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(body?.shared).toBe(true);
    expect(body?.user_ids).toEqual(['u1', 'u2']);
  });

  it('clicar novamente em um usuário vinculado remove o vínculo', async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> | undefined;
    server.use(
      http.get('*/users', () =>
        HttpResponse.json({
          data: [
            { id: 'u1', name: 'Ana', email: 'a@a.com' },
            { id: 'u2', name: 'Bruno', email: 'b@b.com' },
          ],
          error: null,
        }),
      ),
      http.post('*/payment-methods', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: { id: 'p1' }, error: null }, { status: 201 });
      }),
    );
    render(<PaymentMethodModal isOpen onClose={noop} onSuccess={noop} />);

    await user.type(screen.getByPlaceholderText(/Nubank Card/), 'Conta Conjunta');
    await user.click(screen.getByRole('checkbox'));
    const brunoBtn = await screen.findByRole('button', { name: /Bruno/ });
    await user.click(brunoBtn);
    await user.click(brunoBtn);
    await user.click(screen.getByRole('button', { name: 'Create Method' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(body?.user_ids).toEqual(['u1']);
  });

  it('exibe lista de usuários vinculados vazia quando /users retorna erro', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/users', () =>
        HttpResponse.json({ data: null, error: { code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 }),
      ),
    );
    render(<PaymentMethodModal isOpen onClose={noop} onSuccess={noop} />);

    await user.click(screen.getByRole('checkbox'));

    expect(await screen.findByText('Linked Users:')).toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
  });

  it('modo edição pré-preenche nome, shared e usuários vinculados', async () => {
    const user = userEvent.setup();
    const pm: PaymentMethod = {
      id: 'p2',
      name: 'Conta Conjunta',
      type: 'BANK_ACCOUNT',
      shared: true,
      users: [
        { id: 'u1', name: 'Ana', email: 'a@a.com' },
        { id: 'u2', name: 'Bruno', email: 'b@b.com' },
      ],
    };
    let body: Record<string, unknown> | undefined;
    server.use(
      http.get('*/users', () =>
        HttpResponse.json({
          data: [
            { id: 'u1', name: 'Ana', email: 'a@a.com' },
            { id: 'u2', name: 'Bruno', email: 'b@b.com' },
          ],
          error: null,
        }),
      ),
      http.put('*/payment-methods/p2', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: { id: 'p2' }, error: null });
      }),
    );
    render(<PaymentMethodModal isOpen onClose={noop} onSuccess={noop} paymentMethod={pm} />);

    expect(screen.getByDisplayValue('Conta Conjunta')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(await screen.findByText('Linked Users:')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Forma de pagamento atualizada'));
    expect(body?.user_ids).toEqual(['u1', 'u2']);
  });

  it('erro no PUT exibe mensagem pt-BR mapeada do error.code', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const pm: PaymentMethod = { id: 'p9', name: 'Cartão', type: 'CREDIT_CARD', shared: false };
    server.use(
      http.put('*/payment-methods/p9', () =>
        HttpResponse.json({ data: null, error: { code: 'VALIDATION_ERROR' } }, { status: 400 }),
      ),
    );
    render(<PaymentMethodModal isOpen onClose={noop} onSuccess={onSuccess} paymentMethod={pm} />);

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Alguns dados são inválidos. Verifique e tente novamente.'),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('modo edição usa updatePaymentMethod', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const pm: PaymentMethod = { id: 'p9', name: 'Cartão', type: 'CREDIT_CARD', shared: false };
    let method = '';
    server.use(http.put('*/payment-methods/p9', () => { method = 'PUT'; return HttpResponse.json({ data: { id: 'p9' }, error: null }); }));
    render(<PaymentMethodModal isOpen onClose={noop} onSuccess={onSuccess} paymentMethod={pm} />);

    expect(screen.getByRole('heading', { name: 'Edit Payment Method' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(method).toBe('PUT');
    expect(toast.success).toHaveBeenCalledWith('Forma de pagamento atualizada');
  });
});
