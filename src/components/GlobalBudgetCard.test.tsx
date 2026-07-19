import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalBudgetCard from './GlobalBudgetCard';
import * as useGlobalBudgetModule from '../hooks/useGlobalBudget';
import * as useBalanceModule from '../hooks/useBalance';
import type { Balance, GlobalBudget } from '../services/incomeService';

vi.mock('../hooks/useUser', () => ({
  useUser: () => ({
    currentUser: { id: 'u1', name: 'Ana', email: 'a@a.com' },
    allUsers: [{ id: 'u1', name: 'Ana', email: 'a@a.com' }],
  }),
}));

const budgetSpy = vi.spyOn(useGlobalBudgetModule, 'useGlobalBudget');
const balanceSpy = vi.spyOn(useBalanceModule, 'useBalance');

const budget = (over: Partial<GlobalBudget> = {}): GlobalBudget => ({
  id: 'gb1', user_id: 'u1', competence: '2026-07', ceiling: 2500, auto_adjusted: false, ...over,
});

const balance = (over: Partial<Balance> = {}): Balance => ({
  user_id: 'u1', competence: '2026-07', total_income: 7500, total_personal: 1800,
  total_shared: 1400, total_expenses: 2000, balance_today: 5500, committed_bills: 850,
  projected_balance: 4650, is_projected_negative: false, ...over,
});

const mockBudget = (over: Partial<ReturnType<typeof useGlobalBudgetModule.useGlobalBudget>>) =>
  budgetSpy.mockReturnValue({
    budget: null, loading: false, error: null, notFound: false, refresh: vi.fn(), ...over,
  });

const mockBalance = (data: Balance | null) =>
  balanceSpy.mockReturnValue({ data, loading: false, error: null });

beforeEach(() => {
  vi.clearAllMocks();
  mockBalance(balance());
});

describe('GlobalBudgetCard', () => {
  it('mostra skeleton durante o carregamento', () => {
    mockBudget({ loading: true });
    render(<GlobalBudgetCard competence="2026-07" />);

    expect(screen.getByLabelText('Carregando teto global')).toBeInTheDocument();
    expect(screen.queryByText('Definir Teto')).not.toBeInTheDocument();
  });

  it('mostra a mensagem de erro pt-BR quando o hook falha', () => {
    mockBudget({ error: 'Serviço temporariamente indisponível. Tente novamente.' });
    render(<GlobalBudgetCard competence="2026-07" />);

    expect(
      screen.getByText('Serviço temporariamente indisponível. Tente novamente.'),
    ).toBeInTheDocument();
  });

  it('sem teto definido (404) mostra o convite e o botão Definir Teto abre o modal', async () => {
    const user = userEvent.setup();
    mockBudget({ notFound: true });
    render(<GlobalBudgetCard competence="2026-07" />);

    expect(screen.getByText(/Nenhum teto definido para este mês/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Definir Teto/ }));
    expect(screen.getByRole('heading', { name: 'Definir Teto Global' })).toBeInTheDocument();
  });

  it('com teto exibe teto, total gasto, restante e percentual utilizado', () => {
    mockBudget({ budget: budget({ ceiling: 2500 }) });
    mockBalance(balance({ total_expenses: 2000 }));
    render(<GlobalBudgetCard competence="2026-07" />);

    expect(screen.getByRole('heading', { name: 'Teto Global do Mês' })).toBeInTheDocument();
    expect(screen.getByText('R$ 2.500,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 2.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 500,00')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ajustar Teto/ })).toBeInTheDocument();
  });

  it('gasto acima do teto mostra alerta de estouro com o valor excedido', () => {
    mockBudget({ budget: budget({ ceiling: 1500 }) });
    mockBalance(balance({ total_expenses: 2000 }));
    render(<GlobalBudgetCard competence="2026-07" />);

    // Restante negativo em vermelho + alerta com o valor absoluto excedido
    expect(screen.getByText('-R$ 500,00')).toBeInTheDocument();
    expect(screen.getByText(/Teto estourado em/)).toHaveTextContent('Teto estourado em R$ 500,00');
    expect(screen.getByLabelText('Teto global estourado')).toBeInTheDocument();
  });

  it('badge Auto-ajustado aparece só quando auto_adjusted=true, com tooltip explicativo', () => {
    mockBudget({ budget: budget({ auto_adjusted: true }) });
    const { rerender } = render(<GlobalBudgetCard competence="2026-07" />);

    const badge = screen.getByText('Auto-ajustado');
    expect(badge).toBeInTheDocument();
    expect(screen.getByLabelText(/Teto definido automaticamente/)).toBeInTheDocument();

    mockBudget({ budget: budget({ auto_adjusted: false }) });
    rerender(<GlobalBudgetCard competence="2026-07" />);
    expect(screen.queryByText('Auto-ajustado')).not.toBeInTheDocument();
  });

  it('sem dados do /balance mostra "—" em gasto/restante e omite a barra', () => {
    mockBudget({ budget: budget() });
    mockBalance(null);
    render(<GlobalBudgetCard competence="2026-07" />);

    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByText(/do teto utilizado/)).not.toBeInTheDocument();
  });

  it('botão Ajustar Teto abre o modal em modo edição com o valor atual', async () => {
    const user = userEvent.setup();
    mockBudget({ budget: budget({ ceiling: 2500 }) });
    render(<GlobalBudgetCard competence="2026-07" />);

    await user.click(screen.getByRole('button', { name: /Ajustar Teto/ }));
    expect(screen.getByRole('heading', { name: 'Ajustar Teto Global' })).toBeInTheDocument();
    expect(screen.getByLabelText('Teto do mês')).toHaveValue('2500');
  });
});
