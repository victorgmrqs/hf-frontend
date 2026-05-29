import { useState, useEffect, useCallback } from 'react';
import { financeService } from '../services/financeService';
import { useUser } from './useUser';

export const useCompetences = () => {
  const { currentUser } = useUser();
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [availableCompetences, setAvailableCompetences] = useState<string[]>([currentMonth]);
  const [loadingCompetences, setLoadingCompetences] = useState(false);

  const fetchCompetences = useCallback(async () => {
    if (!currentUser) return;
    setLoadingCompetences(true);
    try {
      const months = await financeService.getAvailableCompetences(currentUser.id);
      setAvailableCompetences(months);
    } catch (error) {
      console.error("Failed to fetch available competences:", error);
    } finally {
      setLoadingCompetences(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchCompetences();
  }, [fetchCompetences]);

  return { 
    availableCompetences, 
    loadingCompetences, 
    refreshCompetences: fetchCompetences 
  };
};
