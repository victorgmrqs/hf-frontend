import React, { useState, useEffect } from 'react';
import { 
  Plus,
  CalendarDays,
  Target,
  Trash2,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import BudgetModal from '../components/BudgetModal';
import { financeService } from '../services/financeService';
import { useUser } from '../hooks/useUser';

interface BudgetStatus {
  id: string;
  category_name: string;
  amount: number;
  current_spending: number;
}

const Budgets: React.FC = () => {
  const { currentUser } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [competence, setCompetence] = useState('2026-02');
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchBudgets();
    }
  }, [competence, currentUser]);

  const fetchBudgets = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { data } = await financeService.getBudgetStatus(currentUser.id, competence);
      if (data) setBudgets(data);
    } catch (error) {
      console.error("Failed to fetch budgets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    if (confirm('Are you sure you want to delete this budget?')) {
      const { error } = await financeService.deleteBudget(id, currentUser.id);
      if (!error) {
        fetchBudgets();
      } else {
        alert('Error deleting budget: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="flex min-h-screen bg-background-dark text-white">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Budgets</h2>
            <p className="text-text-secondary mt-1">Plan and track your spending by category</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
                <CalendarDays size={18} />
              </div>
              <select 
                value={competence}
                onChange={(e) => setCompetence(e.target.value)}
                className="bg-surface-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary block pl-10 pr-4 py-2.5 appearance-none cursor-pointer"
              >
                <option value="2026-02">2026-02</option>
                <option value="2026-01">2026-01</option>
              </select>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg flex items-center font-medium transition-colors shadow-lg shadow-blue-900/20"
            >
              <Plus className="mr-2" size={20} />
              Set Budget
            </button>
          </div>
        </header>

        {loading ? (
          <div className="py-12 text-center text-text-secondary">Loading budgets...</div>
        ) : budgets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {budgets.map((budget) => {
              const percentage = Math.min(Math.round((budget.current_spending / budget.amount) * 100), 100);
              const isExceeded = budget.current_spending > budget.amount;
              const isNearLimit = percentage > 80 && !isExceeded;

              return (
                <div key={budget.id} className="bg-surface-dark border border-border-dark rounded-xl p-6 hover:border-primary/50 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary">
                      <Target size={24} />
                    </div>
                    <button 
                      onClick={() => handleDelete(budget.id)}
                      className="p-2 text-text-secondary hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-1">{budget.category_name}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">{formatCurrency(budget.amount)}</span>
                      <span className="text-sm text-text-secondary">limit per month</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Spent so far</span>
                      <span className={`font-semibold ${isExceeded ? 'text-rose-500' : 'text-white'}`}>
                        {formatCurrency(budget.current_spending)}
                      </span>
                    </div>
                    
                    <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ease-out ${
                          isExceeded ? 'bg-rose-500' : isNearLimit ? 'bg-orange-400' : 'bg-primary'
                        }`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        {isExceeded ? (
                          <>
                            <AlertTriangle size={14} className="text-rose-500" />
                            <span className="text-rose-500">Exceeded by {formatCurrency(budget.current_spending - budget.amount)}</span>
                          </>
                        ) : (
                          <>
                            <TrendingUp size={14} className="text-emerald-500" />
                            <span className="text-emerald-500">{formatCurrency(budget.amount - budget.current_spending)} remaining</span>
                          </>
                        )}
                      </div>
                      <span className="text-xs text-text-secondary font-bold">{percentage}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-surface-dark border border-border-dark border-dashed rounded-xl py-20 text-center">
            <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-text-secondary">
              <Target size={40} />
            </div>
            <h3 className="text-white font-semibold text-xl mb-2">No budgets set yet</h3>
            <p className="text-text-secondary mb-8 max-w-sm mx-auto">
              Setting a budget helps you control your spending by category and stay on track with your financial goals.
            </p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20"
            >
              Set Your First Budget
            </button>
          </div>
        )}
      </main>

      <BudgetModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchBudgets}
        competence={competence}
      />
    </div>
  );
};

export default Budgets;
