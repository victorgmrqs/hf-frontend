import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FamilyVisionSection from './FamilyVisionSection';
import * as useFamilyTotalsModule from '../hooks/useFamilyTotals';
import type { FamilyTotal } from '../hooks/useFamilyTotals';

const spy = vi.spyOn(useFamilyTotalsModule, 'useFamilyTotals');

const mockReturn = (over: Partial<ReturnType<typeof useFamilyTotalsModule.useFamilyTotals>>) =>
  spy.mockReturnValue({ data: [], loading: false, error: null, ...over });

const twoUsers: FamilyTotal[] = [
  { user: { id: 'u1', name: 'Ana', email: 'ana@hf.com' }, totals: { total_personal: 100, total_shared: 50, total_general: 150 } },
  { user: { id: 'u2', name: 'Bia', email: 'bia@hf.com' }, totals: { total_personal: 200, total_shared: 30, total_general: 230 } },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FamilyVisionSection', () => {
  it('renderiza skeletons no estado de carregamento', () => {
    mockReturn({ loading: true });
    render(<FamilyVisionSection competence="2026-06" />);

    expect(screen.getAllByTestId('family-card-skeleton')).toHaveLength(3);
  });

  it('renderiza a mensagem de erro pt-BR quando há erro', () => {
    mockReturn({ error: 'Erro interno ao carregar visão familiar.' });
    render(<FamilyVisionSection competence="2026-06" />);

    expect(screen.getByText('Erro interno ao carregar visão familiar.')).toBeInTheDocument();
  });

  it('renderiza estado vazio quando há menos de 2 usuários', () => {
    mockReturn({ data: [twoUsers[0]] });
    render(<FamilyVisionSection competence="2026-06" />);

    expect(screen.getByText('Adicione mais um membro para ver a visão familiar.')).toBeInTheDocument();
  });

  it('renderiza um card por usuário com seu nome e o card Total Família', () => {
    mockReturn({ data: twoUsers });
    render(<FamilyVisionSection competence="2026-06" />);

    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Bia')).toBeInTheDocument();
    expect(screen.getByText('Total Família')).toBeInTheDocument();
  });

  it('exibe o Total Família como soma dos total_general de todos os membros', () => {
    mockReturn({ data: twoUsers });
    render(<FamilyVisionSection competence="2026-06" />);

    // 150 + 230 = 380
    expect(screen.getByText('R$ 380,00')).toBeInTheDocument();
  });
});
