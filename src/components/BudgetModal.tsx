import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { financeService, Category } from '../services/financeService';
import { useUser } from '../hooks/useUser';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  competence: string;
}

const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose, onSuccess, competence }) => {
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [alertThreshold, setAlertThreshold] = useState(80);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    const { data } = await financeService.getCategories();
    if (data) setCategories(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    
    if (isNaN(parsedAmount)) {
      toast.error('Informe um valor válido');
      setLoading(false);
      return;
    }

    const data = {
      user_id: currentUser.id,
      category_id: categoryId,
      competence,
      amount: parsedAmount,
      alert_threshold: alertThreshold,
    };

    const { error } = await financeService.createBudget(data);
    
    if (!error) {
      toast.success('Orçamento criado com sucesso');
      onSuccess();
      onClose();
      setAmount('');
      setCategoryId('');
      setAlertThreshold(80);
    } else {
      toast.error('Erro ao criar orçamento');
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
            <h2 className="text-white text-xl font-bold tracking-tight">New Budget</h2>
            <p className="text-text-secondary text-sm">For {competence}</p>
          </div>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-white transition-colors p-1 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-text-secondary text-sm font-medium">Category</label>
            <div className="relative">
              <select 
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
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-text-secondary text-sm font-medium">Monthly Limit</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-semibold text-xl">R$</span>
              <input
                required
                className="w-full bg-input-dark border border-border-dark rounded-lg py-4 pl-12 pr-4 text-white text-2xl font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-text-secondary text-sm font-medium">
              Alerta em (%) <span className="text-text-secondary font-normal">— padrão: 80%</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={100}
                required
                className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 pr-10 text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Math.min(100, Math.max(1, Number(e.target.value))))}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary font-medium">%</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 border-t border-border-dark bg-surface-dark flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg text-white font-medium hover:bg-white/5 border border-transparent hover:border-border-dark">
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-primary hover:bg-blue-600 text-white font-semibold shadow-lg flex items-center gap-2 disabled:opacity-50"
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
