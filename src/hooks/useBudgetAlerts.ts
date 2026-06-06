import { useState, useEffect } from 'react';
import { financeService } from '../services/financeService';
import { useUser } from './useUser';

export function useBudgetAlerts(): number {
  const { currentUser } = useUser();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    const competence = new Date().toISOString().substring(0, 7);
    financeService.getBudgetStatus(currentUser.id, competence).then(({ data }) => {
      if (!data) return;
      const count = data.filter(b => {
        const pct = Math.round((b.current_spending / b.amount) * 100);
        return pct >= (b.alert_threshold ?? 80);
      }).length;
      setAlertCount(count);
    });
  }, [currentUser]);

  return alertCount;
}
