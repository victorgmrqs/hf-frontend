import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { financeService, BudgetStatus } from '../services/financeService';
import { useUser } from '../hooks/useUser';

interface BudgetsContextType {
  /** Competência selecionada (YYYY-MM); compartilhada entre a página Budgets e a Sidebar. */
  competence: string;
  setCompetence: (competence: string) => void;
  budgetStatuses: BudgetStatus[];
  loading: boolean;
  /** Recarrega o status da competência atual (após criar/editar/excluir). */
  refresh: () => Promise<void>;
}

const BudgetsContext = createContext<BudgetsContextType | undefined>(undefined);

const currentMonth = () => new Date().toISOString().substring(0, 7);

export const BudgetsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useUser();
  const [competence, setCompetence] = useState<string>(currentMonth());
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!currentUser) {
      setBudgetStatuses([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await financeService.getBudgetStatus(currentUser.id, competence);
      setBudgetStatuses(data ?? []);
    } catch {
      toast.error('Erro ao carregar orçamentos');
      setBudgetStatuses([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, competence]);

  useEffect(() => {
    let active = true;
    if (!currentUser) {
      setBudgetStatuses([]);
      return;
    }
    setLoading(true);
    financeService
      .getBudgetStatus(currentUser.id, competence)
      .then(({ data }) => {
        if (active) setBudgetStatuses(data ?? []);
      })
      .catch(() => {
        if (active) {
          toast.error('Erro ao carregar orçamentos');
          setBudgetStatuses([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentUser, competence]);

  return (
    <BudgetsContext.Provider
      value={{ competence, setCompetence, budgetStatuses, loading, refresh }}
    >
      {children}
    </BudgetsContext.Provider>
  );
};

export const useBudgets = () => {
  const context = useContext(BudgetsContext);
  if (context === undefined) {
    throw new Error('useBudgets must be used within a BudgetsProvider');
  }
  return context;
};
