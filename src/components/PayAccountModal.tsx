import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Loader2 } from 'lucide-react';
import { financeService, PaymentMethod, Category, AccountPayable } from '../services/financeService';
import { useUser } from '../hooks/useUser';

interface PayAccountModalProps {
  account: AccountPayable | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PayAccountModal: React.FC<PayAccountModalProps> = ({ account, isOpen, onClose, onSuccess }) => {
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form state
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadInitialData();
    }
  }, [isOpen, currentUser]);

  const loadInitialData = async () => {
    if (!currentUser) return;
    const [pms, cats] = await Promise.all([
      financeService.getPaymentMethods(currentUser.id),
      financeService.getCategories()
    ]);
    
    if (pms.data) {
      setPaymentMethods(pms.data);
      if (pms.data.length > 0) setPaymentMethodId(pms.data[0].id);
    }
    if (cats.data) setCategories(cats.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !currentUser) return;
    setLoading(true);

    const payData = {
      payment_method_id: paymentMethodId,
      category_id: categoryId || null,
      date: new Date(date).toISOString(),
      competence: date.substring(0, 7)
    };

    const { error } = await financeService.payAccountPayable(account.id, currentUser.id, payData);
    
    if (!error) {
      onSuccess();
      onClose();
    } else {
      alert('Error paying account: ' + (error.message || 'Unknown error'));
    }
    setLoading(false);
  };

  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <form onSubmit={handleSubmit} className="relative z-50 w-full max-w-[500px] flex flex-col bg-surface-dark rounded-xl shadow-2xl border border-border-dark overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-dark bg-surface-dark">
          <div>
            <h2 className="text-white text-xl font-bold tracking-tight">Pay Account</h2>
            <p className="text-text-secondary text-sm">{account.description}</p>
          </div>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-white transition-colors p-1 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex justify-between items-center">
            <span className="text-text-secondary">Amount to pay:</span>
            <span className="text-white font-bold text-xl">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.amount)}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-text-secondary text-sm font-medium">Payment Date</label>
            <input 
              required
              type="date" 
              className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none [color-scheme:dark]" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-text-secondary text-sm font-medium">Payment Method</label>
            <div className="relative">
              <select 
                required
                className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 text-white appearance-none cursor-pointer outline-none"
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
              >
                {paymentMethods.map(pm => (
                  <option key={pm.id} value={pm.id}>{pm.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                <ChevronDown size={20} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-text-secondary text-sm font-medium">Category (Optional)</label>
            <div className="relative">
              <select 
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
        </div>

        <div className="px-6 py-5 border-t border-border-dark bg-surface-dark flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg text-white font-medium hover:bg-white/5 border border-transparent hover:border-border-dark">
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Confirm Payment
          </button>
        </div>
      </form>
    </div>
  );
};

export default PayAccountModal;
