import React, { useState, useEffect } from 'react';
import { X, Loader2, CreditCard, Wallet, Landmark, Smartphone, Users } from 'lucide-react';
import { financeService, User, PaymentMethod } from '../services/financeService';
import { useUser } from '../hooks/useUser';

interface PaymentMethodModalProps {
  paymentMethod?: PaymentMethod | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({ paymentMethod, isOpen, onClose, onSuccess }) => {
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  
  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('CREDIT_CARD');
  const [isShared, setIsShared] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadUsers();
      if (paymentMethod) {
        setName(paymentMethod.name);
        setType(paymentMethod.type);
        setIsShared(paymentMethod.shared);
        if (paymentMethod.users) {
          setSelectedUserIds(paymentMethod.users.map(u => u.id));
        } else {
          setSelectedUserIds([currentUser.id]);
        }
      } else {
        setName('');
        setType('CREDIT_CARD');
        setIsShared(false);
        setSelectedUserIds([currentUser.id]);
      }
    }
  }, [isOpen, paymentMethod, currentUser]);

  const loadUsers = async () => {
    const { data } = await financeService.getUsers();
    if (data) {
      setAvailableUsers(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);

    const data = {
      name,
      type,
      shared: isShared,
      user_ids: isShared ? selectedUserIds : [currentUser.id]
    };

    const { error } = paymentMethod
      ? await financeService.updatePaymentMethod(paymentMethod.id, data)
      : await financeService.createPaymentMethod(data);
    
    if (!error) {
      onSuccess();
      onClose();
    } else {
      alert(`Error ${paymentMethod ? 'updating' : 'creating'} payment method: ` + (error.message || 'Unknown error'));
    }
    setLoading(false);
  };

  const toggleUser = (userId: string) => {
    if (!currentUser) return;
    if (userId === currentUser.id) return; // Always keep current user
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  if (!isOpen) return null;

  const types = [
    { value: 'CREDIT_CARD', label: 'Credit Card', icon: <CreditCard size={18} /> },
    { value: 'DEBIT_CARD', label: 'Debit Card', icon: <Smartphone size={18} /> },
    { value: 'BANK_ACCOUNT', label: 'Bank Account', icon: <Landmark size={18} /> },
    { value: 'CASH', label: 'Cash', icon: <Wallet size={18} /> },
    { value: 'PIX', label: 'PIX', icon: <Smartphone size={18} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <form onSubmit={handleSubmit} className="relative z-50 w-full max-w-[500px] flex flex-col bg-surface-dark rounded-xl shadow-2xl border border-border-dark overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-dark bg-surface-dark">
          <h2 className="text-white text-xl font-bold tracking-tight">
            {paymentMethod ? 'Edit Payment Method' : 'New Payment Method'}
          </h2>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-white transition-colors p-1 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-text-secondary text-sm font-medium">Method Name</label>
            <input 
              required
              className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
              placeholder="e.g. Nubank Card, Shared Savings" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-text-secondary text-sm font-medium">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {types.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                    type === t.value 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-input-dark border-border-dark text-text-secondary hover:border-border-dark/80'
                  }`}
                >
                  {t.icon}
                  <span className="text-sm font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-border-dark w-full my-2"></div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-white text-base font-semibold flex items-center gap-2">
                  <Users size={18} /> Shared Method?
                </span>
                <span className="text-text-secondary text-sm">Allow multiple users to use this method</span>
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
              <div className="bg-input-dark/50 rounded-lg p-4 border border-border-dark/50 space-y-3">
                <label className="text-text-secondary text-sm font-medium block">Linked Users:</label>
                <div className="flex flex-wrap gap-2">
                  {availableUsers.map(user => (
                    <button 
                      key={user.id}
                      type="button"
                      disabled={user.id === currentUser?.id}
                      onClick={() => toggleUser(user.id)}
                      className={`flex items-center gap-2 border rounded-full pl-1 pr-3 py-1 transition-all ${
                        selectedUserIds.includes(user.id) 
                          ? 'bg-primary/20 border-primary/50 text-primary' 
                          : 'bg-surface-dark border-border-dark text-text-secondary'
                      } ${user.id === currentUser?.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-[10px] text-white font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium">{user.name}</span>
                      {user.id === currentUser?.id && <span className="text-[10px] bg-primary/20 px-1 rounded ml-1">You</span>}
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
            {paymentMethod ? 'Save Changes' : 'Create Method'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentMethodModal;
