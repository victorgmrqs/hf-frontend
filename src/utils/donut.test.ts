import { describe, expect, it } from 'vitest';
import { buildDonutSegments, toCategorySlices, DONUT_PALETTE } from './donut';
import type { CategoryTotal } from '../services/financeService';

const raw: CategoryTotal[] = [
  { category_id: 'c1', category_name: 'Mercado', total: '150.00', percentage: '75.00' },
  { category_id: 'c2', category_name: 'Lazer', total: '50.00', percentage: '25.00' },
];

describe('toCategorySlices', () => {
  it('converte strings em números e atribui cor da paleta por índice', () => {
    const slices = toCategorySlices(raw);
    expect(slices[0]).toMatchObject({ category_name: 'Mercado', total: 150, percentage: 75, color: DONUT_PALETTE[0] });
    expect(slices[1]).toMatchObject({ total: 50, percentage: 25, color: DONUT_PALETTE[1] });
  });

  it('cicla a paleta quando há mais categorias que cores', () => {
    const many: CategoryTotal[] = Array.from({ length: DONUT_PALETTE.length + 1 }, (_, i) => ({
      category_id: `c${i}`, category_name: `Cat ${i}`, total: '10', percentage: '5',
    }));
    const slices = toCategorySlices(many);
    expect(slices[DONUT_PALETTE.length].color).toBe(DONUT_PALETTE[0]);
  });

  it('trata valores malformados como 0', () => {
    const slices = toCategorySlices([{ category_id: 'x', category_name: 'X', total: 'abc', percentage: '' }]);
    expect(slices[0].total).toBe(0);
    expect(slices[0].percentage).toBe(0);
  });
});

describe('buildDonutSegments', () => {
  it('comprimentos dos segmentos somam a circunferência (proporcional ao total)', () => {
    const C = 100;
    const segs = buildDonutSegments(toCategorySlices(raw), C);
    const lengths = segs.map((s) => parseFloat(s.dashArray.split(' ')[0]));
    expect(lengths[0]).toBeCloseTo(75);
    expect(lengths[1]).toBeCloseTo(25);
    expect(lengths.reduce((a, b) => a + b, 0)).toBeCloseTo(C);
  });

  it('offsets são cumulativos (negativos, sentido horário)', () => {
    const segs = buildDonutSegments(toCategorySlices(raw), 100);
    expect(segs[0].dashOffset).toBe(-0);
    expect(segs[1].dashOffset).toBeCloseTo(-75);
  });

  it('retorna [] quando a soma é zero ou a lista é vazia', () => {
    expect(buildDonutSegments([], 100)).toEqual([]);
    expect(buildDonutSegments(toCategorySlices([{ category_id: 'z', category_name: 'Z', total: '0', percentage: '0' }]), 100)).toEqual([]);
  });
});
