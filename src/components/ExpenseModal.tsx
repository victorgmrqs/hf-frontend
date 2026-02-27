import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Check, Loader2 } from 'lucide-react';
import { financeService, Category, PaymentMethod, Expense } from '../services/financeService';
import { useUser } from '../hooks/useUser';

interface ExpenseModalProps {
  expense?: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({ expense, isOpen, onClose, onSuccess }) => {
  const { currentUser, allUsers } = useUser();
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [payerId, setPayerId] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadInitialData();
      if (expense) {
        setAmount(expense.value.toString());
        setDescription(expense.description);
        setDate(expense.date);
        setCategoryId(expense.category?.id || '');
        setPaymentMethodId(expense.payment_method.id);
        setPayerId(expense.user_id);
        setIsShared(expense.type === 'SHARED');
        // Extract shared users except the payer
        const otherParticipants = expense.shared_with
          ?.map(p => p.user_id)
          .filter(uid => uid !== expense.user_id) || [];
        setSelectedUserIds(otherParticipants);
      } else {
        setAmount('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setCategoryId('');
        if (paymentMethods.length > 0) setPaymentMethodId(paymentMethods[0].id);
        setPayerId(currentUser.id);
        setIsShared(false);
        setSelectedUserIds([]);
      }
    }
  }, [isOpen, expense, currentUser]);

  const loadInitialData = async () => {
    if (!currentUser) return;
    const [cats, pms] = await Promise.all([
      financeService.getCategories(),
      financeService.getPaymentMethods(currentUser.id)
    ]);
    
    if (cats.data) setCategories(cats.data);
    if (pms.data) {
      setPaymentMethods(pms.data);
      if (!expense && pms.data.length > 0) setPaymentMethodId(pms.data[0].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    
    if (isNaN(parsedAmount)) {
      alert('Please enter a valid amount.');
      setLoading(false);
      return;
    }

    const expenseData = {
      description,
      amount: parsedAmount,
      date,
      competence: date.substring(0, 7),
      type: isShared ? 'SHARED' : 'PERSONAL',
      user_id: payerId,
      category_id: categoryId || null,
      payment_method_id: paymentMethodId,
      shared_user_ids: isShared ? Array.from(new Set([...selectedUserIds, payerId])) : []
    };

    const { error } = expense
      ? await financeService.updateExpense(expense.id, currentUser.id, expenseData)
      : await financeService.createExpense(expenseData);
    
    if (!error) {
      onSuccess();
      onClose();
    } else {
      alert(`Error ${expense ? 'updating' : 'creating'} expense: ` + (error.message || 'Unknown error'));
    }
    setLoading(false);
  };

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <form onSubmit={handleSubmit} className="relative z-50 w-full max-w-[600px] flex flex-col bg-surface-dark rounded-xl shadow-2xl border border-border-dark overflow-hidden max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-dark bg-surface-dark">
          <h2 className="text-white text-xl font-bold tracking-tight">{expense ? 'Edit Expense' : 'Add New Expense'}</h2>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-white transition-colors p-1 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-text-secondary text-sm font-medium">Amount</label>
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
            <label className="text-text-secondary text-sm font-medium">Description</label>
            <input 
              required
              className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
              placeholder="e.g. Weekly Groceries" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Date</label>
              <input 
                required
                type="date" 
                className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none [color-scheme:dark]" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Paid by</label>
              <div className="relative">
                <select 
                  required
                  className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 text-white appearance-none cursor-pointer outline-none"
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                >
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} {u.id === currentUser?.id ? '(Me)' : ''}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                  <ChevronDown size={20} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Category</label>
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
          </div>

          <div className="h-px bg-border-dark w-full my-2"></div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-white text-base font-semibold">Shared Expense?</span>
                <span className="text-text-secondary text-sm">Split this cost with family members</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                />
                <div className="w-11 h-6 bg-input-dark rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border-dark"></div>
              </label>
            </div>

            {isShared && (
              <div className="bg-input-dark/50 rounded-lg p-4 border border-border-dark/50 mt-1">
                <label className="text-text-secondary text-sm font-medium mb-3 block">Split with:</label>
                <div className="flex flex-wrap gap-2">
                  {allUsers.filter(u => u.id !== payerId).map(user => (
                    <button 
                      key={user.id}
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      className={`flex items-center gap-2 border rounded-full pl-1 pr-3 py-1 transition-all ${
                        selectedUserIds.includes(user.id) 
                          ? 'bg-primary/20 border-primary/50 text-primary' 
                          : 'bg-surface-dark border-border-dark text-text-secondary'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-[10px] text-white font-bold uppercase">
                        {user.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium">{user.name}</span>
                      {selectedUserIds.includes(user.id) && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
            Save Expense
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseModal;
