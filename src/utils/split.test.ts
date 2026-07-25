import { describe, expect, it } from 'vitest';
import {
  buildSharedUserIds,
  equalSplit,
  isEqualSplit,
  percentsFromAmounts,
  rebalance,
  sumSplits,
} from './split';

describe('equalSplit', () => {
  it('equalSplit_TwoUsers_50_50', () => {
    expect(equalSplit(2)).toEqual([50, 50]);
  });

  it('equalSplit_ThreeUsers_SumsExactly100', () => {
    const splits = equalSplit(3);
    expect(splits).toEqual([33.33, 33.33, 33.34]);
    expect(splits.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });

  it('retorna vazio para contagem inválida', () => {
    expect(equalSplit(0)).toEqual([]);
    expect(equalSplit(-1)).toEqual([]);
  });
});

describe('rebalance', () => {
  it('rebalance_ProportionalAndSums100', () => {
    // Ana 50 / Bruno 25 / Carla 25 → Ana vira 60; Bruno e Carla dividem 40 na proporção 1:1
    const result = rebalance(['a', 'b', 'c'], { a: 50, b: 25, c: 25 }, 'a', 60);
    expect(result).toEqual({ a: 60, b: 20, c: 20 });
    expect(sumSplits(['a', 'b', 'c'], result)).toBe(100);
  });

  it('rebalance_RoundingRemainderGoesToLastParticipant', () => {
    // 100 - 50 = 50 dividido por 3 proporcionais iguais → 16.67 / 16.67 / 16.66
    const result = rebalance(['a', 'b', 'c', 'd'], { a: 25, b: 25, c: 25, d: 25 }, 'a', 50);
    expect(result.a).toBe(50);
    expect(result.b).toBe(16.67);
    expect(result.c).toBe(16.67);
    expect(result.d).toBe(16.66);
    expect(sumSplits(['a', 'b', 'c', 'd'], result)).toBe(100);
  });

  it('dois participantes: o outro recebe o complemento exato', () => {
    expect(rebalance(['a', 'b'], { a: 50, b: 50 }, 'a', 70)).toEqual({ a: 70, b: 30 });
  });

  it('distribui igualmente quando os demais estavam zerados/vazios', () => {
    const result = rebalance(['a', 'b', 'c'], { a: 100, b: NaN, c: 0 }, 'a', 40);
    expect(result).toEqual({ a: 40, b: 30, c: 30 });
  });
});

describe('isEqualSplit', () => {
  it('reconhece divisão igualitária independente da ordem do resto', () => {
    expect(isEqualSplit(['a', 'b'], { a: 50, b: 50 })).toBe(true);
    expect(isEqualSplit(['a', 'b', 'c'], { a: 33.34, b: 33.33, c: 33.33 })).toBe(true);
  });

  it('rejeita divisão customizada e lista vazia', () => {
    expect(isEqualSplit(['a', 'b'], { a: 70, b: 30 })).toBe(false);
    expect(isEqualSplit([], {})).toBe(false);
  });
});

describe('percentsFromAmounts', () => {
  it('deriva percentuais de valores absolutos garantindo soma 100', () => {
    const result = percentsFromAmounts(200, [
      { user_id: 'a', divided_amount: 140 },
      { user_id: 'b', divided_amount: 60 },
    ]);
    expect(result).toEqual({ a: 70, b: 30 });
  });

  it('joga o resto do arredondamento no último participante', () => {
    const result = percentsFromAmounts(300, [
      { user_id: 'a', divided_amount: 100 },
      { user_id: 'b', divided_amount: 100 },
      { user_id: 'c', divided_amount: 100 },
    ]);
    expect(result).toEqual({ a: 33.33, b: 33.33, c: 33.34 });
    expect(sumSplits(['a', 'b', 'c'], result)).toBe(100);
  });

  it('retorna vazio para total inválido', () => {
    expect(percentsFromAmounts(0, [{ user_id: 'a', divided_amount: 10 }])).toEqual({});
  });
});

describe('buildSharedUserIds', () => {
  it('buildSharedPayload_Untouched_ReturnsStringArray', () => {
    expect(buildSharedUserIds(['a', 'b'], { a: 50, b: 50 }, false)).toEqual(['a', 'b']);
  });

  it('volta para strings quando tocado mas equivalente ao igualitário', () => {
    expect(buildSharedUserIds(['a', 'b'], { a: 50, b: 50 }, true)).toEqual(['a', 'b']);
  });

  it('buildSharedPayload_Custom_ReturnsObjectsWithSplitPct', () => {
    expect(buildSharedUserIds(['a', 'b'], { a: 70, b: 30 }, true)).toEqual([
      { user_id: 'a', split_pct: 70 },
      { user_id: 'b', split_pct: 30 },
    ]);
  });
});
