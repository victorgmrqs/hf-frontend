import { useEffect, useState } from 'react';
import { financeService, User } from '../services/financeService';
import { messageForError } from '../utils/errorMessage';
import { useUser } from './useUser';

export interface UserTotals {
  total_personal: number;
  total_shared: number;
  total_general: number;
}

export interface FamilyTotal {
  user: User;
  totals: UserTotals;
}

const FAMILY_TOTALS_FALLBACK = 'Erro ao carregar visão familiar.';

/**
 * Busca, em paralelo, os totais de despesa de todos os usuários da família para
 * a competência informada. Resolve a "Visão Familiar" do Dashboard (HF-23).
 * Estados: loading, error (mensagem pt-BR já mapeada) e data por usuário.
 */
export function useFamilyTotals(competence: string) {
  const { allUsers } = useUser();
  const [data, setData] = useState<FamilyTotal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (allUsers.length === 0) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(
      allUsers.map((user) =>
        financeService.getTotals(user.id, competence).then((res) => ({ user, res })),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const failed = results.find((r) => r.res.error || !r.res.data);
        if (failed) {
          setError(messageForError(failed.res.error, FAMILY_TOTALS_FALLBACK));
          setData([]);
          return;
        }
        setData(results.map((r) => ({ user: r.user, totals: r.res.data as UserTotals })));
      })
      .catch(() => {
        if (cancelled) return;
        setError(FAMILY_TOTALS_FALLBACK);
        setData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [allUsers, competence]);

  return { data, loading, error };
}
