import { useCallback, useEffect, useState } from 'react';
import { GlobalBudget, incomeService } from '../services/incomeService';
import { messageForError } from '../utils/errorMessage';
import { useUser } from './useUser';

const GLOBAL_BUDGET_FALLBACK = 'Erro ao carregar o teto global do mês.';

/** Lê error.code sem lançar, para distinguir 404 (sem teto) de erro real. */
const isNotFound = (error: unknown): boolean =>
  !!error &&
  typeof error === 'object' &&
  'code' in error &&
  (error as { code?: unknown }).code === 'BUDGET_NOT_FOUND';

/**
 * Teto global do mês (ORC — HF-45) para o usuário logado e a competência.
 * `notFound` indica 404 BUDGET_NOT_FOUND (estado "sem teto definido", não é
 * erro para a UI). `refresh` refaz a busca após criar/editar via modal.
 * Cancela respostas obsoletas ao desmontar ou trocar competência/usuário.
 */
export function useGlobalBudget(competence: string) {
  const { currentUser } = useUser();
  const [budget, setBudget] = useState<GlobalBudget | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!currentUser) {
      setBudget(null);
      setError(null);
      setNotFound(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    incomeService
      .getGlobalBudget(currentUser.id, competence)
      .then((res) => {
        if (cancelled) return;
        if (res.data) {
          setBudget(res.data);
          return;
        }
        setBudget(null);
        if (isNotFound(res.error)) {
          setNotFound(true);
        } else {
          setError(messageForError(res.error, GLOBAL_BUDGET_FALLBACK));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setBudget(null);
        setError(GLOBAL_BUDGET_FALLBACK);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, competence, version]);

  return { budget, loading, error, notFound, refresh };
}
