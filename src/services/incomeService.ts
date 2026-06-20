import { apiFetch } from './api';
import { config } from '../config';

export type IncomeType = 'SALARY' | 'FREELANCE' | 'INVESTMENT' | 'RENTAL' | 'OTHER';

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

const base = config.incomeApi.baseUrl;

// Cliente do hf-income-service (serviço separado). Reusa o envelope { data, error }
// do apiFetch, apontando para o base URL do income.
export const incomeService = {
  getIncomes: (userId: string, competence: string, type?: string) => {
    const params = new URLSearchParams({ user_id: userId, competence });
    if (type) params.append('type', type);
    return apiFetch<Income[]>(`/income?${params.toString()}`, undefined, base);
  },
  deleteIncome: (id: string, requesterId: string) =>
    apiFetch<void>(`/income/${id}?requester_id=${requesterId}`, { method: 'DELETE' }, base),
};
