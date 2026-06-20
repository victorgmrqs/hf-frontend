import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import CategoryDonutChart from './CategoryDonutChart';
import type { CategoryTotal } from '../services/financeService';

const data: CategoryTotal[] = [
  { category_id: 'c1', category_name: 'Mercado', total: '150.00', percentage: '75.00' },
  { category_id: 'c2', category_name: 'Lazer', total: '50.00', percentage: '25.00' },
];

describe('CategoryDonutChart', () => {
  it('mostra a legenda com nome, valor e percentual de cada categoria', () => {
    render(<CategoryDonutChart data={data} />);
    expect(screen.getByText('Mercado')).toBeInTheDocument();
    expect(screen.getByText('Lazer')).toBeInTheDocument();
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('mostra o total no centro por padrão e os detalhes da categoria ao passar o mouse', async () => {
    const user = userEvent.setup();
    render(<CategoryDonutChart data={data} />);

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('R$ 200,00')).toBeInTheDocument(); // 150 + 50

    await user.hover(screen.getByRole('button', { name: /Mercado/ }));
    // centro passa a mostrar a categoria ativa (rótulo "Mercado" no centro)
    const mercadoLabels = screen.getAllByText('Mercado');
    expect(mercadoLabels.length).toBeGreaterThan(1); // legenda + centro
  });

  it('mostra empty state quando não há gastos', () => {
    render(<CategoryDonutChart data={[]} />);
    expect(screen.getByText('Sem gastos por categoria neste mês.')).toBeInTheDocument();
  });
});
