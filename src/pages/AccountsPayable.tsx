import React, { useState, useEffect } from 'react';
import {
  Plus,
  CalendarDays,
  Filter,
  CreditCard,
  CheckCircle2,
  Clock,
  Trash2,
  TrendingUp,
  History,
  Pencil
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import AccountPayableModal from '../components/AccountPayableModal';
import PayAccountModal from '../components/PayAccountModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import EmptyState from '../components/EmptyState';
import { toast } from 'sonner';
import { financeService, AccountPayable } from '../services/financeService';
import { useUser } from '../hooks/useUser';

const AccountsPayable: React.FC = () => {
  const { currentUser } = useUser();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountPayable | null>(null);
  const [editingAccount, setEditingAccount] = useState<AccountPayable | null>(null);
  
  const [accounts, setAccounts] = useState<AccountPayable[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [loading, setLoading] = useState(true);
  const [projectionMonths, setProjectionMonths] = useState(3);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      fetchAccounts();
    }
  }, [statusFilter, currentUser]);

  const fetchAccounts = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { data } = await financeService.getAccountsPayable(currentUser.id, statusFilter || undefined);
      if (data) setAccounts(data);
    } catch {
      toast.error('Erro ao carregar contas a pagar');
    } finally {
      setLoading(false);
    }
  };

  const getProjectedAccounts = () => {
    const projected: (AccountPayable & { isProjected?: boolean })[] = [...accounts];
    
    // Only project pending recurring accounts
    const recurring = accounts.filter(a => a.status === 'PENDING' && a.recurrence === 'MONTHLY');
    
    recurring.forEach(account => {
      const baseDate = new Date(account.due_date);
      for (let i = 1; i <= projectionMonths; i++) {
        const nextDate = new Date(baseDate);
        nextDate.setMonth(baseDate.getMonth() + i);
        
        projected.push({
          ...account,
          id: `proj-${account.id}-${i}`,
          due_date: nextDate.toISOString(),
          isProjected: true
        });
      }
    });

    return projected.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !currentUser) return;
    const { error } = await financeService.deleteAccountPayable(deleteTarget, currentUser.id);
    setDeleteTarget(null);
    if (!error) {
      fetchAccounts();
      toast.success('Conta excluída com sucesso');
    } else {
      toast.error('Erro ao excluir conta a pagar');
    }
  };

  const handleEdit = (account: AccountPayable) => {
    setEditingAccount(account);
    setIsEditModalOpen(true);
  };

  const handlePay = (account: AccountPayable) => {
    setSelectedAccount(account);
    setIsPayModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getDaysUntilDue = (dueDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex min-h-screen bg-background-dark text-white">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Accounts Payable</h2>
            <p className="text-text-secondary mt-1">Manage your future financial obligations</p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary-strong hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            <Plus className="mr-2" size={20} />
            New Account
          </button>
        </header>

        {/* Filters Bar */}
        <div className="bg-surface-dark border border-border-dark rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Filter size={16} />
                <span>Status:</span>
              </div>
              <select
                aria-label="Filtrar por status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-input-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary px-4 py-2 outline-none cursor-pointer"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
              </select>
            </div>

            <div className="h-8 w-px bg-border-dark/50 hidden md:block"></div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <TrendingUp size={16} />
                <span>Projection:</span>
              </div>
              <select
                aria-label="Meses de projeção"
                value={projectionMonths}
                onChange={(e) => setProjectionMonths(Number(e.target.value))}
                className="bg-input-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary px-4 py-2 outline-none cursor-pointer"
              >
                <option value={0}>None</option>
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>1 Year</option>
              </select>
            </div>
          </div>
          
          <div className="text-sm text-text-secondary">
            Showing <span className="text-white font-medium">{getProjectedAccounts().length}</span> items
          </div>
        </div>

        {/* Accounts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-text-secondary">Loading accounts...</div>
          ) : getProjectedAccounts().length > 0 ? (
            getProjectedAccounts().map(account => {
              const isOverdue = new Date(account.due_date) < new Date() && account.status === 'PENDING' && !account.isProjected;
              const days = getDaysUntilDue(account.due_date);
              const showUrgency = account.status === 'PENDING' && !account.isProjected;
              const urgencyBadge = showUrgency
                ? days < 0
                  ? { label: 'Vencida', cls: 'bg-rose-900/40 text-rose-400 border border-rose-800/50' }
                  : days === 0
                    ? { label: 'Vence hoje', cls: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' }
                    : days <= 3
                      ? { label: `Vence em ${days} dia${days > 1 ? 's' : ''}`, cls: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' }
                      : days <= 7
                        ? { label: `Vence em ${days} dias`, cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' }
                        : null
                : null;
              
              return (
                <div key={account.id} className={`bg-surface-dark border rounded-xl p-5 transition-all group relative overflow-hidden ${
                  account.isProjected 
                    ? 'border-dashed border-border-dark/60 opacity-70 grayscale-[0.5] hover:grayscale-0 hover:opacity-100' 
                    : 'border-border-dark hover:border-primary/50'
                }`}>
                  {account.isProjected && (
                    <div className="absolute top-0 right-0 bg-primary/10 text-primary-text text-[10px] font-black uppercase px-3 py-1 rounded-bl-lg tracking-widest border-l border-b border-primary/20">
                      Projected
                    </div>
                  )}
                  
                  {urgencyBadge && (
                    <div className={`absolute top-0 left-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-br-lg ${urgencyBadge.cls}`}>
                      {urgencyBadge.label}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-lg ${
                      account.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' : 
                      account.isProjected ? 'bg-white/5 text-slate-400' : 'bg-primary/10 text-primary-text'
                    }`}>
                      {account.status === 'PAID' ? <CheckCircle2 size={24} /> : 
                       account.isProjected ? <History size={24} /> : <Clock size={24} />}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-white block">{formatCurrency(account.amount)}</span>
                      <span className="text-xs text-text-secondary uppercase tracking-wider">Amount</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div>
                      <h4 className="text-white font-semibold text-lg line-clamp-1">{account.description}</h4>
                      <div className="flex items-center gap-1.5 text-sm text-text-secondary mt-1">
                        <CalendarDays size={14} />
                        <span className={isOverdue ? 'text-rose-500 font-medium' : ''}>
                          Due: {new Date(account.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    {account.recurrence && (
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        account.isProjected ? 'bg-white/5 text-slate-500' : 'bg-purple-500/10 text-purple-400'
                      }`}>
                        Recurrence: {account.recurrence}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {account.isProjected ? (
                      <div className="flex-1 bg-white/5 text-slate-500 text-xs font-medium py-2 rounded-lg text-center italic">
                        Future recurrence
                      </div>
                    ) : account.status === 'PENDING' ? (
                      <button
                        onClick={() => handlePay(account)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <CreditCard size={16} />
                        Pay Now
                      </button>
                    ) : (
                      <div className="flex-1 bg-white/5 text-emerald-500 text-sm font-semibold py-2 rounded-lg text-center flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} />
                        Paid
                      </div>
                    )}

                    {!account.isProjected && account.status === 'PENDING' && (
                      <button
                        onClick={() => handleEdit(account)}
                        className="p-2 text-text-secondary hover:text-primary-text hover:bg-primary/10 rounded-lg transition-all"
                      >
                        <Pencil size={18} />
                      </button>
                    )}

                    {!account.isProjected && (
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="p-2 text-text-secondary hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-surface-dark border border-border-dark border-dashed rounded-xl">
              <EmptyState
                icon={<Clock size={40} />}
                title="Nenhuma conta pendente."
                actionLabel="Nova Conta"
                onAction={() => setIsCreateModalOpen(true)}
              />
            </div>
          )}
        </div>
      </main>

      <AccountPayableModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchAccounts}
      />

      <AccountPayableModal
        isOpen={isEditModalOpen}
        account={editingAccount}
        onClose={() => { setIsEditModalOpen(false); setEditingAccount(null); }}
        onSuccess={fetchAccounts}
      />

      <PayAccountModal 
        account={selectedAccount}
        isOpen={isPayModalOpen} 
        onClose={() => {
          setIsPayModalOpen(false);
          setSelectedAccount(null);
        }} 
        onSuccess={fetchAccounts}
      />
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Excluir Conta a Pagar"
        message="Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default AccountsPayable;
