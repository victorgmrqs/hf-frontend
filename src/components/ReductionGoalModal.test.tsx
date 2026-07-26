import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReductionGoalModal from './ReductionGoalModal';
import type { ReductionGoal } from '../services/incomeService';
import { server } from '../test/msw/server';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const { mockUserCtx } = vi.hoisted(() => ({
  mockUserCtx: {
    currentUser: { id: 'u1', name: 'Ana', email: 'a@a.com' },
    allUsers: [{ id: 'u1', name: 'Ana', email: 'a@a.com' }],
  },
}));
vi.mock('../hooks/useUser', () => ({ useUser: () => mockUserCtx }));

const existingGoal: ReductionGoal = {
  id: 'g1',
  user_id: 'u1',
  category_id: 'c1',
  competence: '2026-07',
  target_amount: 400,
  previous_amount: 520,
  achieved: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  server.use(
    http.get('*/categories', () =>
      HttpResponse.json({ data: [{ id: 'c1', name: 'Mercado', color: '#fff' }], error: null }),
    ),
  );
});
const noop = () => {};

describe('ReductionGoalModal', () => {
  it('Create_Success', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    let body: Record<string, unknown> = {};
    server.use(
      http.post('*/goals/reduction', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { data: { id: 'g9', user_id: 'u1', category_id: 'c1', competence: '2026-07', target_amount: '400', previous_amount: null, achieved: null }, error: null },
          { status: 201 },
        );
      }),
    );
    render(<ReductionGoalModal isOpen onClose={noop} onSuccess={onSuccess} competence="2026-07" goal={null} />);

    await waitFor(() => expect(screen.getByRole('option', { name: 'Mercado' })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText('Categoria'), 'Mercado');
    await user.type(screen.getByPlaceholderText('0,00'), '400');
    await user.click(screen.getByRole('button', { name: 'Salvar Meta' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(body).toEqual({ user_id: 'u1', category_id: 'c1', competence: '2026-07', target_amount: 400 });
    expect(toast.success).toHaveBeenCalledWith('Meta criada com sucesso');
  });

  it('Create_ParsesThousandSeparatorPtBr', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    let body: Record<string, unknown> = {};
    server.use(
      http.post('*/goals/reduction', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { data: { id: 'g9', user_id: 'u1', category_id: 'c1', competence: '2026-07', target_amount: '1200', previous_amount: null, achieved: null }, error: null },
          { status: 201 },
        );
      }),
    );
    render(<ReductionGoalModal isOpen onClose={noop} onSuccess={onSuccess} competence="2026-07" goal={null} />);

    await waitFor(() => expect(screen.getByRole('option', { name: 'Mercado' })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText('Categoria'), 'Mercado');
    await user.type(screen.getByPlaceholderText('0,00'), '1.200,00');
    await user.click(screen.getByRole('button', { name: 'Salvar Meta' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    // "1.200,00" (pt-BR) deve virar 1200 — não 1.2
    expect(body.target_amount).toBe(1200);
  });

  it('Create_GoalAlreadyExists_ShowsPtBrMessage', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    server.use(
      http.post('*/goals/reduction', () =>
        HttpResponse.json({ data: null, error: { code: 'GOAL_ALREADY_EXISTS' } }, { status: 409 }),
      ),
    );
    render(<ReductionGoalModal isOpen onClose={noop} onSuccess={onSuccess} competence="2026-07" goal={null} />);

    await waitFor(() => expect(screen.getByRole('option', { name: 'Mercado' })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText('Categoria'), 'Mercado');
    await user.type(screen.getByPlaceholderText('0,00'), '400');
    await user.click(screen.getByRole('button', { name: 'Salvar Meta' }));

    expect(
      await screen.findByText('Já existe uma meta para esta categoria neste mês. Edite a meta atual.'),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('InvalidTarget_BlocksSubmit', async () => {
    const user = userEvent.setup();
    let called = false;
    server.use(
      http.post('*/goals/reduction', () => {
        called = true;
        return HttpResponse.json({ data: null, error: null });
      }),
    );
    render(<ReductionGoalModal isOpen onClose={noop} onSuccess={noop} competence="2026-07" goal={null} />);

    await user.click(screen.getByRole('button', { name: 'Salvar Meta' }));

    expect(await screen.findByText('Informe uma meta válida maior que zero')).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it('Edit_UpdatesOnlyTargetAmount', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    let body: Record<string, unknown> = {};
    let putUrl = '';
    server.use(
      http.put('*/goals/reduction/:id', async ({ request }) => {
        putUrl = request.url;
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: { ...existingGoal, target_amount: '350' }, error: null });
      }),
    );
    render(<ReductionGoalModal isOpen onClose={noop} onSuccess={onSuccess} competence="2026-07" goal={existingGoal} />);

    // Em edição a categoria é fixa (MET-04: só target_amount é editável)
    expect(screen.queryByLabelText('Categoria')).toBeNull();
    const input = screen.getByPlaceholderText('0,00');
    await user.clear(input);
    await user.type(input, '350');
    await user.click(screen.getByRole('button', { name: 'Salvar Meta' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(putUrl).toContain('/goals/reduction/g1');
    expect(body).toEqual({ target_amount: 350 });
    expect(toast.success).toHaveBeenCalledWith('Meta atualizada com sucesso');
  });
});
