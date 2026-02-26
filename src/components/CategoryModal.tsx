import React, { useState, useEffect } from 'react';
import { X, Loader2, Palette } from 'lucide-react';
import { financeService, Category } from '../services/financeService';

interface CategoryModalProps {
  category?: Category | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ category, isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setName(category.name);
        setDescription(category.description || '');
        setColor(category.color);
      } else {
        setName('');
        setDescription('');
        setColor('#3b82f6');
      }
    }
  }, [isOpen, category]);

  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#64748b'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      name,
      description,
      color
    };

    const { error } = category 
      ? await financeService.updateCategory(category.id, data)
      : await financeService.createCategory(data);
    
    if (!error) {
      onSuccess();
      onClose();
    } else {
      alert(`Error ${category ? 'updating' : 'creating'} category: ` + (error.message || 'Unknown error'));
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <form onSubmit={handleSubmit} className="relative z-50 w-full max-w-[450px] flex flex-col bg-surface-dark rounded-xl shadow-2xl border border-border-dark overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-dark bg-surface-dark">
          <h2 className="text-white text-xl font-bold tracking-tight">
            {category ? 'Edit Category' : 'New Category'}
          </h2>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-white transition-colors p-1 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-text-secondary text-sm font-medium">Name</label>
            <input 
              required
              className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
              placeholder="e.g. Health, Education, Pets" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-text-secondary text-sm font-medium">Description (Optional)</label>
            <textarea 
              className="w-full bg-input-dark border border-border-dark rounded-lg p-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none h-24" 
              placeholder="What is this category for?" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-text-secondary text-sm font-medium flex items-center gap-2">
              <Palette size={16} /> Color Tag
            </label>
            <div className="flex flex-wrap gap-3">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input 
                type="color" 
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-full bg-transparent border-none cursor-pointer p-0 overflow-hidden"
              />
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
            Create Category
          </button>
        </div>
      </form>
    </div>
  );
};

export default CategoryModal;
