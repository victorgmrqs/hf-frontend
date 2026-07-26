import { apiFetch } from './api';
import { config } from '../config';

export type IncomeType = 'SALARY' | 'FREELANCE' | 'INVESTMENT' | 'RENTAL' | 'OTHER';

/**
 * Saldo do mês calculado pelo hf-income-service (domínio SAL). O backend é a
 * autoridade do cálculo — o frontend só exibe. Valores monetários chegam como
 * string ("4300.00") no envelope; `getBalance` os converte para number.
 */
export interface Balance {
  user_id: string;
  competence: string;
  total_income: number;
  total_personal: number;
  total_shared: number;
  total_expenses: number;
  /** Saldo Hoje = receita − gastos realizados (SAL-04). */
  balance_today: number;
  committed_bills: number;
  /** Saldo Projetado = saldo hoje − contas a vencer (SAL-03/04). */
  projected_balance: number;
  /** SAL-05: sinaliza alerta visual quando projected_balance < 0. */
  is_projected_negative: boolean;
}

/** Resposta crua do /balance — valores monetários como string. */
interface RawBalance {
  user_id: string;
  competence: string;
  total_income: string;
  total_personal: string;
  total_shared: string;
  total_expenses: string;
  balance_today: string;
  committed_bills: string;
  projected_balance: string;
  is_projected_negative: boolean;
}

export interface Income {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: IncomeType;
  date: string;
  competence: string;
  recurrent: boolean;
  /** Preenchido em registros propagados (cópia recorrente) — imutável (REC-03). */
  origin_id?: string | null;
}

/**
 * Teto global mensal (domínio ORC — HF-43/HF-44 no backend). `ceiling` chega
 * como string decimal no envelope; o cliente converte para number.
 * `auto_adjusted` indica teto definido pelo job de auto-ajuste (ORC-03/05).
 */
export interface GlobalBudget {
  id: string;
  user_id: string;
  competence: string;
  ceiling: number;
  auto_adjusted: boolean;
}

/** Resposta crua de /budgets/global — ceiling como string. */
interface RawGlobalBudget {
  id: string;
  user_id: string;
  competence: string;
  ceiling: string;
  auto_adjusted: boolean;
}

const toGlobalBudget = (raw: RawGlobalBudget): GlobalBudget => ({
  id: raw.id,
  user_id: raw.user_id,
  competence: raw.competence,
  ceiling: Number(raw.ceiling),
  auto_adjusted: raw.auto_adjusted,
});

/**
 * Meta de redução por categoria (domínio MET — HF-68/69/70/71 no backend).
 * Valores monetários chegam como string no envelope; o cliente converte para
 * number. `previous_amount` é null sem snapshot e `achieved` é null até o
 * fechamento do mês (MET-06).
 */
export interface ReductionGoal {
  id: string;
  user_id: string;
  category_id: string;
  competence: string;
  target_amount: number;
  previous_amount: number | null;
  achieved: boolean | null;
}

interface RawReductionGoal {
  id: string;
  user_id: string;
  category_id: string;
  competence: string;
  target_amount: string;
  previous_amount: string | null;
  achieved: boolean | null;
}

const toReductionGoal = (raw: RawReductionGoal): ReductionGoal => ({
  id: raw.id,
  user_id: raw.user_id,
  category_id: raw.category_id,
  competence: raw.competence,
  target_amount: Number(raw.target_amount),
  previous_amount: raw.previous_amount === null ? null : Number(raw.previous_amount),
  achieved: raw.achieved,
});

/**
 * Linha do comparativo mensal (MET-05/07). Os cálculos — inclusive o texto
 * `variation_label` em pt-BR — vêm prontos do backend. Campos null indicam
 * degradação (hf-transaction-service indisponível) ou ausência de base de
 * comparação; a UI exibe placeholder.
 */
export interface GoalComparisonItem {
  category_id: string;
  category_name: string | null;
  previous_month_amount: number | null;
  current_month_amount: number | null;
  target_amount: number;
  on_track: boolean | null;
  variation_pct: number | null;
  variation_label: string | null;
  target_progress_pct: number | null;
}

interface RawGoalComparisonItem {
  category_id: string;
  category_name: string | null;
  previous_month_amount: string | null;
  current_month_amount: string | null;
  target_amount: string;
  on_track: boolean | null;
  variation_pct: number | null;
  variation_label: string | null;
  target_progress_pct: number | null;
}

const toGoalComparisonItem = (raw: RawGoalComparisonItem): GoalComparisonItem => ({
  category_id: raw.category_id,
  category_name: raw.category_name,
  previous_month_amount: raw.previous_month_amount === null ? null : Number(raw.previous_month_amount),
  current_month_amount: raw.current_month_amount === null ? null : Number(raw.current_month_amount),
  target_amount: Number(raw.target_amount),
  on_track: raw.on_track,
  variation_pct: raw.variation_pct,
  variation_label: raw.variation_label,
  target_progress_pct: raw.target_progress_pct,
});

const base = config.incomeApi.baseUrl;

// Cliente do hf-income-service (serviço separado). Reusa o envelope { data, error }
// do apiFetch, apontando para o base URL do income.
export const incomeService = {
  getIncomes: async (userId: string, competence: string, type?: string) => {
    const params = new URLSearchParams({ user_id: userId, competence });
    if (type) params.append('type', type);
    const result = await apiFetch<Income[] | { items: Income[] }>(`/income?${params.toString()}`, undefined, base);

    if (result.error) {
      return { data: null, error: result.error };
    }

    let incomeList: Income[] = [];
    if (result.data) {
      if (Array.isArray(result.data)) {
        incomeList = result.data;
      } else if (typeof result.data === 'object' && 'items' in result.data) {
        const nestedItems = (result.data as { items: Income[] }).items;
        if (Array.isArray(nestedItems)) {
          incomeList = nestedItems;
        }
      }
    }

    return { data: incomeList, error: null };
  },
  createIncome: (data: Record<string, unknown>) =>
    apiFetch<Income>('/income', { method: 'POST', body: JSON.stringify(data) }, base),
  updateIncome: (id: string, data: Record<string, unknown>) =>
    apiFetch<Income>(`/income/${id}`, { method: 'PUT', body: JSON.stringify(data) }, base),
  deleteIncome: (id: string, requesterId: string) =>
    apiFetch<void>(`/income/${id}?requester_id=${requesterId}`, { method: 'DELETE' }, base),

  // Saldo do mês (SAL-04/05). Converte os valores string do envelope em number;
  // sem reimplementar cálculo — o backend já entrega balance_today/projected_balance.
  getBalance: async (userId: string, competence: string) => {
    const params = new URLSearchParams({ user_id: userId, competence });
    const { data, error } = await apiFetch<RawBalance>(`/balance?${params.toString()}`, undefined, base);
    if (!data) return { data: null as Balance | null, error };
    return {
      data: {
        user_id: data.user_id,
        competence: data.competence,
        total_income: Number(data.total_income),
        total_personal: Number(data.total_personal),
        total_shared: Number(data.total_shared),
        total_expenses: Number(data.total_expenses),
        balance_today: Number(data.balance_today),
        committed_bills: Number(data.committed_bills),
        projected_balance: Number(data.projected_balance),
        is_projected_negative: data.is_projected_negative,
      } as Balance,
      error,
    };
  },

  // Teto global do mês (ORC). GET responde 404 BUDGET_NOT_FOUND quando não há
  // teto para a competência — o chamador trata como estado "sem teto definido".
  getGlobalBudget: async (userId: string, competence: string) => {
    const params = new URLSearchParams({ user_id: userId, competence });
    const { data, error } = await apiFetch<RawGlobalBudget>(
      `/budgets/global?${params.toString()}`,
      undefined,
      base,
    );
    if (!data) return { data: null as GlobalBudget | null, error };
    return { data: toGlobalBudget(data), error };
  },

  createGlobalBudget: async (userId: string, competence: string, ceiling: number) => {
    const { data, error } = await apiFetch<RawGlobalBudget>(
      '/budgets/global',
      {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, competence, ceiling }),
      },
      base,
    );
    if (!data) return { data: null as GlobalBudget | null, error };
    return { data: toGlobalBudget(data), error };
  },

  // Edição manual do teto — o backend seta auto_adjusted=false (ORC-05).
  updateGlobalBudget: async (id: string, ceiling: number) => {
    const { data, error } = await apiFetch<RawGlobalBudget>(
      `/budgets/global/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ ceiling }),
      },
      base,
    );
    if (!data) return { data: null as GlobalBudget | null, error };
    return { data: toGlobalBudget(data), error };
  },

  // --- Metas de redução (MET — HF-47) ---

  getReductionGoals: async (userId: string, competence: string) => {
    const params = new URLSearchParams({ user_id: userId, competence });
    const { data, error } = await apiFetch<RawReductionGoal[]>(
      `/goals/reduction?${params.toString()}`,
      undefined,
      base,
    );
    if (!data) return { data: null as ReductionGoal[] | null, error };
    return { data: data.map(toReductionGoal), error };
  },

  // Comparativo mensal (MET-05/07): responde 200 mesmo com degradação parcial.
  getGoalComparison: async (userId: string, competence: string) => {
    const params = new URLSearchParams({ user_id: userId, competence });
    const { data, error } = await apiFetch<RawGoalComparisonItem[]>(
      `/goals/reduction/comparison?${params.toString()}`,
      undefined,
      base,
    );
    if (!data) return { data: null as GoalComparisonItem[] | null, error };
    return { data: data.map(toGoalComparisonItem), error };
  },

  // 409 GOAL_ALREADY_EXISTS quando já há meta para (usuário, categoria, mês) — MET-04.
  createReductionGoal: async (userId: string, categoryId: string, competence: string, targetAmount: number) => {
    const { data, error } = await apiFetch<RawReductionGoal>(
      '/goals/reduction',
      {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          category_id: categoryId,
          competence,
          target_amount: targetAmount,
        }),
      },
      base,
    );
    if (!data) return { data: null as ReductionGoal | null, error };
    return { data: toReductionGoal(data), error };
  },

  // Somente target_amount é editável (MET-04).
  updateReductionGoal: async (id: string, targetAmount: number) => {
    const { data, error } = await apiFetch<RawReductionGoal>(
      `/goals/reduction/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ target_amount: targetAmount }),
      },
      base,
    );
    if (!data) return { data: null as ReductionGoal | null, error };
    return { data: toReductionGoal(data), error };
  },

  deleteReductionGoal: (id: string) =>
    apiFetch<void>(`/goals/reduction/${id}`, { method: 'DELETE' }, base),
};

