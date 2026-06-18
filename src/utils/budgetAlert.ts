// MET-03: estado de alerta de um orçamento a partir do gasto x limite x percentual.
// A regra de negócio (limiares) é do backend; aqui é apenas apresentação/UX.

export const DEFAULT_ALERT_THRESHOLD = 80;

export type BudgetState = 'normal' | 'alert' | 'exceeded';

export interface BudgetStateResult {
  /** Percentual gasto (0–100, arredondado e limitado a 100 para a barra). */
  percentage: number;
  state: BudgetState;
  isAlert: boolean;
  isExceeded: boolean;
}

interface BudgetStateInput {
  amount: number;
  current_spending: number;
  alert_threshold?: number;
}

/**
 * - `exceeded`: gasto >= 100% do limite (vermelho)
 * - `alert`: gasto >= limite * (threshold/100) e ainda não excedido (amarelo)
 * - `normal`: abaixo do limiar (verde)
 * `alert_threshold` ausente/zero usa o padrão 80%.
 */
export function getBudgetState({
  amount,
  current_spending,
  alert_threshold,
}: BudgetStateInput): BudgetStateResult {
  const threshold = alert_threshold && alert_threshold > 0 ? alert_threshold : DEFAULT_ALERT_THRESHOLD;

  if (amount <= 0) {
    return { percentage: 0, state: 'normal', isAlert: false, isExceeded: false };
  }

  const ratio = (current_spending / amount) * 100;
  const percentage = Math.min(Math.round(ratio), 100);

  const isExceeded = current_spending >= amount;
  const isAlert = !isExceeded && ratio >= threshold;
  const state: BudgetState = isExceeded ? 'exceeded' : isAlert ? 'alert' : 'normal';

  return { percentage, state, isAlert, isExceeded };
}

/** Conta orçamentos em alerta ou excedidos (para o badge da Sidebar). */
export function countBudgetsInAlert(
  budgets: ReadonlyArray<BudgetStateInput>,
): number {
  return budgets.reduce((acc, b) => {
    const { state } = getBudgetState(b);
    return state === 'normal' ? acc : acc + 1;
  }, 0);
}
