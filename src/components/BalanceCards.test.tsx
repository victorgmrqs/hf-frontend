import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BalanceCards from './BalanceCards';
import * as useBalanceModule from '../hooks/useBalance';
import type { Balance } from '../services/incomeService';

const spy = vi.spyOn(useBalanceModule, 'useBalance');

const mockReturn = (over: Partial<ReturnType<typeof useBalanceModule.useBalance>>) =>
  spy.mockReturnValue({ data: null, loading: false, error: null, ...over });

const balance = (over: Partial<Balance> = {}): Balance => ({
  user_id: 'u1', competence: '2026-06', total_income: 7500, total_personal: 1800,
  total_shared: 1400, total_expenses: 3200, balance_today: 4300, committed_bills: 850,
  projected_balance: 3450, is_projected_negative: false, ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('BalanceCards', () => {
  it('renderiza skeletons no estado de carregamento', () => {
    mockReturn({ loading: true });
    render(<BalanceCards competence="2026-06" />);

    expect(screen.getAllByTestId('balance-card-skeleton')).toHaveLength(2);
  });

  it('renderiza a mensagem de erro pt-BR quando há erro', () => {
    mockReturn({ error: 'Serviço de despesas indisponível. Tente novamente.' });
    render(<BalanceCards competence="2026-06" />);

    expect(screen.getByText('Serviço de despesas indisponível. Tente novamente.')).toBeInTheDocument();
  });

  it('renderiza Saldo Hoje e Saldo Projetado formatados em BRL', () => {
    mockReturn({ data: balance() });
    render(<BalanceCards competence="2026-06" />);

    expect(screen.getByText('Saldo Hoje')).toBeInTheDocument();
    expect(screen.getByText('Saldo Projetado')).toBeInTheDocument();
    expect(screen.getByText('R$ 4.300,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 3.450,00')).toBeInTheDocument();
  });

  it('aplica alerta visual (borda vermelha + ícone) quando o saldo projetado é negativo (SAL-05)', () => {
    mockReturn({ data: balance({ projected_balance: -200, is_projected_negative: true }) });
    render(<BalanceCards competence="2026-06" />);

    expect(screen.getByTestId('projected-card').className).toMatch(/border-rose-500/);
    expect(screen.getByLabelText('Saldo projetado negativo')).toBeInTheDocument();
    expect(screen.getByText('-R$ 200,00')).toBeInTheDocument();
  });

  it('não exibe alerta quando o saldo projetado é positivo', () => {
    mockReturn({ data: balance() });
    render(<BalanceCards competence="2026-06" />);

    expect(screen.getByTestId('projected-card').className).not.toMatch(/border-rose-500/);
    expect(screen.queryByLabelText('Saldo projetado negativo')).not.toBeInTheDocument();
  });

  it('expõe tooltip explicando a diferença entre os dois saldos', () => {
    mockReturn({ data: balance() });
    render(<BalanceCards competence="2026-06" />);

    expect(screen.getByLabelText(/Saldo Hoje é a receita do mês/i)).toBeInTheDocument();
  });
});
