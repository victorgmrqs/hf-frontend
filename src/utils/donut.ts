import type { CategoryTotal } from '../services/financeService';

// Paleta determinística para as fatias do donut (cicla por índice).
export const DONUT_PALETTE = [
  '#137fec', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#64748b',
];

export interface CategorySlice {
  category_id: string;
  category_name: string;
  total: number;
  percentage: number;
  color: string;
}

export interface DonutSegment {
  color: string;
  /** stroke-dasharray: "<comprimento> <resto>" para um círculo de dada circunferência. */
  dashArray: string;
  /** stroke-dashoffset acumulado (negativo → desenha no sentido horário). */
  dashOffset: number;
}

/** Converte a resposta (strings) em fatias tipadas com cor da paleta. */
export function toCategorySlices(data: ReadonlyArray<CategoryTotal>): CategorySlice[] {
  return data.map((d, i) => ({
    category_id: d.category_id,
    category_name: d.category_name,
    total: parseFloat(d.total) || 0,
    percentage: parseFloat(d.percentage) || 0,
    color: DONUT_PALETTE[i % DONUT_PALETTE.length],
  }));
}

/**
 * Geometria do donut: cada segmento ocupa uma fração proporcional ao seu `total`
 * (preciso, independente de arredondamento do percentual do backend).
 */
export function buildDonutSegments(
  slices: ReadonlyArray<CategorySlice>,
  circumference: number,
): DonutSegment[] {
  const sum = slices.reduce((acc, s) => acc + s.total, 0);
  if (sum <= 0) return [];

  let offset = 0;
  return slices.map((s) => {
    const length = (s.total / sum) * circumference;
    const segment: DonutSegment = {
      color: s.color,
      dashArray: `${length} ${circumference - length}`,
      dashOffset: -offset,
    };
    offset += length;
    return segment;
  });
}
