import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReductionGoalsSection from './ReductionGoalsSection';
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

const goal = (overrides: Record<string, unknown> = {}) => ({
  id: 'g1', user_id: 'u1', category_id: 'c1', competence: '2026-07',
  target_amount: '400.00', previous_amount: '520.00', achieved: null,
  ...overrides,
});

const comparisonItem = (overrides: Record<string, unknown> = {}) => ({
  category_id: 'c1', category_name: 'Alimentação', previous_month_amount: '800.00',
  current_month_amount: '620.00', target_amount: '700.00', on_track: true,
  variation_pct: -22.5, variation_label: '22,5% menor que o mês passado', target_progress_pct: 88.6,
  ...overrides,
});

function mockEndpoints(goals: unknown[], comparison: unknown[]) {
  server.use(
    http.get('*/goals/reduction', () => HttpResponse.json({ data: goals, error: null })),
    http.get('*/goals/reduction/comparison', () => HttpResponse.json({ data: comparison, error: null })),
    http.get('*/categories', () =>
      HttpResponse.json({ data: [{ id: 'c1', name: 'Mercado', color: '#fff' }], error: null }),
    ),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ReductionGoalsSection', () => {
  it('Loading_Empty_And_ErrorStates', async () => {
    mockEndpoints([], []);
    const { unmount } = render(<ReductionGoalsSection competence="2026-07" />);

    expect(screen.getByText('Carregando metas...')).toBeInTheDocument();
    expect(
      await screen.findByText(/Nenhuma meta de redução para/),
    ).toBeInTheDocument();
    unmount();

    server.use(
      http.get('*/goals/reduction', () =>
        HttpResponse.json({ data: null, error: { code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 }),
      ),
    );
    render(<ReductionGoalsSection competence="2026-07" />);
    expect(
      await screen.findByText('Erro interno no servidor. Tente novamente mais tarde.'),
    ).toBeInTheDocument();
  });

  it('RendersComparisonFields', async () => {
    mockEndpoints([goal({ target_amount: '700.00' })], [comparisonItem()]);
    render(<ReductionGoalsSection competence="2026-07" />);

    expect(await screen.findByText('Alimentação')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?700,00/)).toBeInTheDocument(); // meta
    expect(screen.getByText(/R\$\s?620,00/)).toBeInTheDocument(); // gasto atual
    expect(screen.getByText(/R\$\s?800,00/)).toBeInTheDocument(); // mês anterior
    expect(screen.getByText('22,5% menor que o mês passado')).toBeInTheDocument();
    expect(screen.getByText('88.6%')).toBeInTheDocument();
    expect(screen.getByText('Dentro da meta')).toBeInTheDocument();
  });

  it('DegradedItem_ShowsPlaceholders', async () => {
    mockEndpoints(
      [goal({ previous_amount: null })],
      [comparisonItem({
        category_name: null, previous_month_amount: null, current_month_amount: null,
        on_track: null, variation_pct: null, variation_label: null, target_progress_pct: null,
        target_amount: '400.00',
      })],
    );
    render(<ReductionGoalsSection competence="2026-07" />);

    // Nome resolvido pelo catálogo de categorias quando o comparativo vem null
    expect(await screen.findByText('Mercado')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Sem comparação com o mês anterior')).toBeInTheDocument();
    expect(screen.queryByText('Dentro da meta')).toBeNull();
    expect(screen.queryByText('Meta estourada')).toBeNull();
  });

  it('AchievedBadge_WhenMonthClosed', async () => {
    mockEndpoints([goal({ achieved: true })], [comparisonItem()]);
    render(<ReductionGoalsSection competence="2026-07" />);

    expect(await screen.findByText('Meta atingida')).toBeInTheDocument();
    // badge de fechamento substitui o de on_track
    expect(screen.queryByText('Dentro da meta')).toBeNull();
  });

  it('OpenCreate_OpensModalEmpty', async () => {
    const user = userEvent.setup();
    mockEndpoints([goal()], [comparisonItem()]);
    render(<ReductionGoalsSection competence="2026-07" />);

    await user.click(await screen.findByRole('button', { name: 'Nova Meta' }));

    expect(screen.getByText('Nova Meta de Redução')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0,00')).toHaveValue('');
  });

  it('OpenEdit_OpensModalPrefilled', async () => {
    const user = userEvent.setup();
    mockEndpoints([goal({ target_amount: '400.00' })], [comparisonItem()]);
    render(<ReductionGoalsSection competence="2026-07" />);

    await user.click(await screen.findByRole('button', { name: 'Editar meta de Alimentação' }));

    expect(screen.getByText('Editar Meta de Redução')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0,00')).toHaveValue('400');
  });

  it('Delete_Flow_WithConfirm', async () => {
    const user = userEvent.setup();
    let deleted = '';
    mockEndpoints([goal()], [comparisonItem()]);
    server.use(
      http.delete('*/goals/reduction/:id', ({ params }) => {
        deleted = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    render(<ReductionGoalsSection competence="2026-07" />);

    await user.click(await screen.findByRole('button', { name: 'Excluir meta de Alimentação' }));
    expect(screen.getByText('Excluir Meta')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(deleted).toBe('g1'));
    expect(toast.success).toHaveBeenCalledWith('Meta excluída com sucesso');
  });
});
