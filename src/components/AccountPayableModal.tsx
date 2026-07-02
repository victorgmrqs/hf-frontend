import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { financeService, AccountPayable } from '../services/financeService';
import { messageForError } from '../utils/errorMessage';
import { useUser } from '../hooks/useUser';

interface AccountPayableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account?: AccountPayable | null;
}

const AccountPayableModal: React.FC<AccountPayableModalProps> = ({ isOpen, onClose, onSuccess, account }) => {
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(false);
  const isEditing = !!account;

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurrence, setRecurrence] = useState('NONE');

  useEffect(() => {
    if (isOpen && account) {
      setDescription(account.description);
      setAmount(String(account.amount));
      setDueDate(account.due_date.split('T')[0]);
      setRecurrence(account.recurrence || 'NONE');
    } else if (isOpen) {
      setDescription('');
      setAmount('');
      setDueDate(new Date().toISOString().split('T')[0]);
      setRecurrence('NONE');
    }
  }, [isOpen, account]);

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
      description,
      amount: parsedAmount,
      due_date: new Date(dueDate).toISOString(),
      recurrence: recurrence === 'NONE' ? '' : recurrence,
    };

    const { error } = isEditing && account
      ? await financeService.updateAccountPayable(account.id, currentUser.id, data)
      : await financeService.createAccountPayable(data);

    if (!error) {
      toast.success(isEditing ? 'Conta atualizada com sucesso' : 'Conta a pagar criada com sucesso');
      onSuccess();
      onClose();
    } else {
      toast.error(messageForError(error, isEditing ? 'Erro ao atualizar conta' : 'Erro ao criar conta a pagar'));
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <form onSubmit={handleSubmit} className="relative z-50 w-full max-w-[500px] flex flex-col bg-surface-dark rounded-xl shadow-2xl border border-border-dark overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-dark bg-surface-dark">
          <h2 className="text-white text-xl font-bold tracking-tight">
            {isEditing ? 'Edit Account Payable' : 'New Account Payable'}
          </h2>
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
              <label htmlFor="ap-recurrence" className="text-text-secondary text-sm font-medium">Recurrence</label>
              <select
                id="ap-recurrence"
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
            className="px-6 py-2.5 rounded-lg bg-primary-strong hover:bg-blue-700 text-white font-semibold shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AccountPayableModal;
