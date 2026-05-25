import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { financeService } from '../services/financeService';
import { useUser } from '../hooks/useUser';

interface AccountPayableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AccountPayableModal: React.FC<AccountPayableModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurrence, setRecurrence] = useState('NONE');

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

    const data = {
      user_id: currentUser.id,
      description,
      amount: parsedAmount,
      due_date: new Date(dueDate).toISOString(),
      recurrence: recurrence === 'NONE' ? '' : recurrence
    };

    const { error } = await financeService.createAccountPayable(data);
    
    if (!error) {
      onSuccess();
      onClose();
      // Reset form
      setAmount('');
      setDescription('');
      setRecurrence('NONE');
    } else {
      alert('Error creating account payable: ' + (error.message || 'Unknown error'));
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <form onSubmit={handleSubmit} className="relative z-50 w-full max-w-[500px] flex flex-col bg-surface-dark rounded-xl shadow-2xl border border-border-dark overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-dark bg-surface-dark">
          <h2 className="text-white text-xl font-bold tracking-tight">New Account Payable</h2>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-white transition-colors p-1 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
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
              placeholder="e.g. Electricity Bill" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Due Date</label>
              <input 
                required
                type="date" 
                className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none [color-scheme:dark]" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Recurrence</label>
              <select 
                className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 text-white appearance-none cursor-pointer outline-none"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
              >
                <option value="NONE">No Recurrence</option>
                <option value="MONTHLY">Monthly</option>
                <option value="WEEKLY">Weekly</option>
              </select>
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
            Create
          </button>
        </div>
      </form>
    </div>
  );
};

export default AccountPayableModal;
