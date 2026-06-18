import { describe, expect, it } from 'vitest';
import { countBudgetsInAlert, DEFAULT_ALERT_THRESHOLD, getBudgetState } from './budgetAlert';

describe('getBudgetState', () => {
  it('usa o threshold do orçamento (não o 80 fixo) para o estado de alerta', () => {
    // threshold 50: 60% gasto já é alerta (com o 80 antigo, seria normal)
    const r = getBudgetState({ amount: 1000, current_spending: 600, alert_threshold: 50 });
    expect(r.state).toBe('alert');
    expect(r.isAlert).toBe(true);
    expect(r.isExceeded).toBe(false);
    expect(r.percentage).toBe(60);
  });

  it('marca normal abaixo do threshold configurado', () => {
    const r = getBudgetState({ amount: 1000, current_spending: 400, alert_threshold: 50 });
    expect(r.state).toBe('normal');
  });

  it('marca exceeded quando gasto >= 100% do limite', () => {
    const r = getBudgetState({ amount: 1000, current_spending: 1000, alert_threshold: 80 });
    expect(r.state).toBe('exceeded');
    expect(r.isExceeded).toBe(true);
    expect(r.percentage).toBe(100);
  });

  it('limita o percentual a 100 quando estoura o limite', () => {
    const r = getBudgetState({ amount: 1000, current_spending: 1500, alert_threshold: 80 });
    expect(r.percentage).toBe(100);
    expect(r.state).toBe('exceeded');
  });

  it('cai no threshold padrão 80 quando alert_threshold é ausente ou zero', () => {
    expect(getBudgetState({ amount: 100, current_spending: 80 }).state).toBe('alert');
    expect(getBudgetState({ amount: 100, current_spending: 79 }).state).toBe('normal');
    expect(getBudgetState({ amount: 100, current_spending: 80, alert_threshold: 0 }).state).toBe(
      'alert',
    );
    expect(DEFAULT_ALERT_THRESHOLD).toBe(80);
  });

  it('não divide por zero quando o limite é 0', () => {
    const r = getBudgetState({ amount: 0, current_spending: 50, alert_threshold: 80 });
    expect(r).toEqual({ percentage: 0, state: 'normal', isAlert: false, isExceeded: false });
  });
});

describe('countBudgetsInAlert', () => {
  it('conta orçamentos em alerta e excedidos, ignorando os normais', () => {
    const n = countBudgetsInAlert([
      { amount: 1000, current_spending: 400, alert_threshold: 50 }, // normal
      { amount: 1000, current_spending: 600, alert_threshold: 50 }, // alert
      { amount: 1000, current_spending: 1000, alert_threshold: 80 }, // exceeded
    ]);
    expect(n).toBe(2);
  });

  it('retorna 0 para lista vazia', () => {
    expect(countBudgetsInAlert([])).toBe(0);
  });
});
