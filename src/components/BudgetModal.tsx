import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { financeService, Category, BudgetStatus } from '../services/financeService';
import { useUser } from '../hooks/useUser';
import { DEFAULT_ALERT_THRESHOLD } from '../utils/budgetAlert';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  competence: string;
  /** Quando presente, o modal abre em modo edição (amount + alerta). */
  budget?: BudgetStatus | null;
}

const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose, onSuccess, competence, budget }) => {
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form state
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [alertThreshold, setAlertThreshold] = useState(String(DEFAULT_ALERT_THRESHOLD));

  const isEditing = !!budget;

  useEffect(() => {
    if (!isOpen) return;
    if (isEditing && budget) {
      setAmount(String(budget.amount));
      setAlertThreshold(String(budget.alert_threshold || DEFAULT_ALERT_THRESHOLD));
    } else {
      setAmount('');
      setCategoryId('');
      setAlertThreshold(String(DEFAULT_ALERT_THRESHOLD));
      financeService.getCategories().then(({ data }) => {
        if (data) setCategories(data);
      });
    }
  }, [isOpen, isEditing, budget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    const parsedThreshold = parseInt(alertThreshold, 10);
    if (isNaN(parsedThreshold) || parsedThreshold < 1 || parsedThreshold > 100) {
      toast.error('O alerta deve ser um percentual entre 1 e 100');
      return;
    }

    setLoading(true);
    const { error } = isEditing && budget
      ? await financeService.updateBudget(budget.id, currentUser.id, {
          amount: parsedAmount,
          alert_threshold: parsedThreshold,
        })
      : await financeService.createBudget({
          user_id: currentUser.id,
          category_id: categoryId,
          competence,
          amount: parsedAmount,
          alert_threshold: parsedThreshold,
        });

    if (!error) {
      toast.success(isEditing ? 'Orçamento atualizado com sucesso' : 'Orçamento criado com sucesso');
      onSuccess();
      onClose();
    } else {
      toast.error(isEditing ? 'Erro ao atualizar orçamento' : 'Erro ao criar orçamento');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <form onSubmit={handleSubmit} className="relative z-50 w-full max-w-[400px] flex flex-col bg-surface-dark rounded-xl shadow-2xl border border-border-dark overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-dark bg-surface-dark">
          <div>
            <h2 className="text-white text-xl font-bold tracking-tight">{isEditing ? 'Edit Budget' : 'New Budget'}</h2>
            <p className="text-text-secondary text-sm">For {competence}</p>
          </div>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-white transition-colors p-1 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="budget-category" className="text-text-secondary text-sm font-medium">Category</label>
            {isEditing && budget ? (
              <div id="budget-category" className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 flex items-center text-white">
                {budget.category_name}
              </div>
            ) : (
              <div className="relative">
                <select
                  id="budget-category"
                  required
                  className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 text-white appearance-none cursor-pointer outline-none"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                  <ChevronDown size={20} />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="budget-amount" className="text-text-secondary text-sm font-medium">Monthly Limit</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-semibold text-xl">R$</span>
              <input
                id="budget-amount"
                required
                className="w-full bg-input-dark border border-border-dark rounded-lg py-4 pl-12 pr-4 text-white text-2xl font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="budget-alert" className="text-text-secondary text-sm font-medium">Alerta em (%)</label>
            <input
              id="budget-alert"
              type="number"
              min={1}
              max={100}
              required
              className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
            />
            <span className="text-xs text-text-secondary">Você será alertado ao atingir esse percentual do limite (padrão 80%).</span>
          </div>
        </div>

        <div className="px-6 py-5 border-t border-border-dark bg-surface-dark flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg text-white font-medium hover:bg-white/5 border border-transparent hover:border-border-dark">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-primary-strong hover:bg-blue-700 text-white font-semibold shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Save Budget
          </button>
        </div>
      </form>
    </div>
  );
};

export default BudgetModal;
