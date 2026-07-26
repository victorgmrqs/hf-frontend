export interface SharedUserSplit {
  user_id: string;
  split_pct: number;
}

export interface SharedAmount {
  user_id: string;
  divided_amount: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Percentuais igualitários com 2 casas somando exatamente 100 (resto do arredondamento no último). */
export function equalSplit(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(10000 / count) / 100;
  const splits = new Array<number>(count).fill(base);
  splits[count - 1] = round2(100 - base * (count - 1));
  return splits;
}

/**
 * Rebalanceia os demais participantes proporcionalmente aos percentuais anteriores
 * após `changedId` assumir `newPct`, mantendo a soma em exatamente 100.
 */
export function rebalance(
  ids: string[],
  splits: Record<string, number>,
  changedId: string,
  newPct: number,
): Record<string, number> {
  const others = ids.filter(id => id !== changedId);
  const result: Record<string, number> = { [changedId]: round2(newPct) };
  const remaining = round2(100 - result[changedId]);
  const prevOf = (id: string) => (Number.isFinite(splits[id]) && splits[id] > 0 ? splits[id] : 0);
  const prevSum = others.reduce((acc, id) => acc + prevOf(id), 0);
  let allocated = 0;
  others.forEach((id, i) => {
    if (i === others.length - 1) {
      result[id] = round2(remaining - allocated);
      return;
    }
    const share = prevSum > 0 ? prevOf(id) / prevSum : 1 / others.length;
    const pct = round2(remaining * share);
    result[id] = pct;
    allocated = round2(allocated + pct);
  });
  return result;
}

/** Soma dos percentuais dos participantes, ignorando campos vazios/inválidos. */
export function sumSplits(ids: string[], splits: Record<string, number>): number {
  return round2(ids.reduce((acc, id) => acc + (Number.isFinite(splits[id]) ? splits[id] : 0), 0));
}

/** True quando os percentuais equivalem à divisão igualitária padrão (independente da ordem). */
export function isEqualSplit(ids: string[], splits: Record<string, number>): boolean {
  if (ids.length === 0) return false;
  const expected = [...equalSplit(ids.length)].sort((a, b) => a - b);
  const actual = ids.map(id => (Number.isFinite(splits[id]) ? splits[id] : 0)).sort((a, b) => a - b);
  return actual.every((pct, i) => Math.abs(pct - expected[i]) < 0.005);
}

/** Deriva percentuais a partir dos valores absolutos de uma despesa existente, garantindo soma 100. */
export function percentsFromAmounts(total: number, shares: SharedAmount[]): Record<string, number> {
  const result: Record<string, number> = {};
  if (total <= 0 || shares.length === 0) return result;
  let allocated = 0;
  shares.forEach((share, i) => {
    if (i === shares.length - 1) {
      result[share.user_id] = round2(100 - allocated);
      return;
    }
    const pct = round2((share.divided_amount / total) * 100);
    result[share.user_id] = pct;
    allocated = round2(allocated + pct);
  });
  return result;
}

/**
 * Payload de `shared_user_ids`: array de strings quando o rateio é o igualitário
 * padrão (o backend divide — DSP-11/CAL-04) ou objetos `{user_id, split_pct}`
 * quando o usuário customizou os percentuais (DSP-10).
 */
export function buildSharedUserIds(
  ids: string[],
  splits: Record<string, number>,
  touched: boolean,
): string[] | SharedUserSplit[] {
  if (!touched || isEqualSplit(ids, splits)) return [...ids];
  return ids.map(id => ({ user_id: id, split_pct: splits[id] }));
}
