import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Loader2, Tag } from 'lucide-react';
import { financeService, Category, Expense } from '../services/financeService';
import { useUser } from '../hooks/useUser';

interface EditCategoryModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EditCategoryModal: React.FC<EditCategoryModalProps> = ({ expense, isOpen, onClose, onSuccess }) => {
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (expense?.category) {
        setSelectedCategoryId(expense.category.id);
      } else {
        setSelectedCategoryId('');
      }
    }
  }, [isOpen, expense]);

  const loadCategories = async () => {
    const { data } = await financeService.getCategories();
    if (data) setCategories(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense || !currentUser) return;
    setLoading(true);

    const { error } = await financeService.updateExpenseCategory(expense.id, currentUser.id, selectedCategoryId || null);
    
    if (!error) {
      onSuccess();
      onClose();
    } else {
      alert('Error updating category: ' + (error.message || 'Unknown error'));
    }
    setLoading(false);
  };

  if (!isOpen || !expense) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <form onSubmit={handleSubmit} className="relative z-50 w-full max-w-[400px] flex flex-col bg-surface-dark rounded-xl shadow-2xl border border-border-dark overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-dark bg-surface-dark">
          <div>
            <h2 className="text-white text-xl font-bold tracking-tight">Edit Category</h2>
            <p className="text-text-secondary text-sm truncate max-w-[250px]">{expense.description}</p>
          </div>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-white transition-colors p-1 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-text-secondary text-sm font-medium flex items-center gap-2">
              <Tag size={16} /> Select Category
            </label>
            <div className="relative">
              <select 
                className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 text-white appearance-none cursor-pointer outline-none"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                <option value="">Uncategorized</option>
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
            className="px-6 py-2.5 rounded-lg bg-primary hover:bg-blue-600 text-white font-semibold shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Update
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCategoryModal;
