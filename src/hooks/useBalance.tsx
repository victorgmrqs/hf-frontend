import { useEffect, useState } from 'react';
import { incomeService, Balance } from '../services/incomeService';
import { messageForError } from '../utils/errorMessage';
import { useUser } from './useUser';

const BALANCE_FALLBACK = 'Erro ao carregar o saldo do mês.';

/**
 * Busca o saldo do mês (Saldo Hoje / Saldo Projetado) do hf-income-service para
 * o usuário logado e a competência informada (HF-42, SAL-04/05). Estados:
 * loading, error (mensagem pt-BR já mapeada) e data. Cancela respostas obsoletas
 * ao desmontar ou trocar de competência.
 */
export function useBalance(competence: string) {
  const { currentUser } = useUser();
  const [data, setData] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    incomeService
      .getBalance(currentUser.id, competence)
      .then((res) => {
        if (cancelled) return;
        if (res.error || !res.data) {
          setError(messageForError(res.error, BALANCE_FALLBACK));
          setData(null);
          return;
        }
        setData(res.data);
      })
      .catch(() => {
        if (cancelled) return;
        setError(BALANCE_FALLBACK);
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, competence]);

  return { data, loading, error };
}
