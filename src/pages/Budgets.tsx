import React, { useState } from 'react';
import {
  Plus,
  CalendarDays,
  Target,
  Trash2,
  Pencil,
  TrendingUp,
  AlertTriangle,
  Copy
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import BudgetModal from '../components/BudgetModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import EmptyState from '../components/EmptyState';
import { toast } from 'sonner';
import { financeService, BudgetStatus } from '../services/financeService';
import { useUser } from '../hooks/useUser';
import { useCompetences } from '../hooks/useCompetence';
import { useBudgets } from '../contexts/BudgetsContext';
import { formatCompetence } from '../utils/formatCompetence';
import { getBudgetState } from '../utils/budgetAlert';
import { messageForError } from '../utils/errorMessage';

const Budgets: React.FC = () => {
  const { currentUser } = useUser();
  const { availableCompetences, refreshCompetences } = useCompetences();
  const { competence, setCompetence, budgetStatuses: budgets, loading, refresh } = useBudgets();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetStatus | null>(null);
  const [copying, setCopying] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleCopyFromPrevious = async () => {
    if (!currentUser) return;
    setCopying(true);
    const { data, error } = await financeService.copyBudgetsFromPrevious(currentUser.id, competence);
    setCopying(false);
    if (error) {
      toast.error(messageForError(error, 'Erro ao copiar orçamentos'));
      return;
    }
    if (data && data.copied === 0) {
      toast.info('Nenhum orçamento novo para copiar do mês anterior');
    } else if (data) {
      toast.success(`${data.copied} orçamento(s) copiado(s) com sucesso`);
      refresh();
      refreshCompetences();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !currentUser) return;
    const { error } = await financeService.deleteBudget(deleteTarget, currentUser.id);
    setDeleteTarget(null);
    if (!error) {
      refresh();
      toast.success('Orçamento excluído com sucesso');
    } else {
      toast.error(messageForError(error, 'Erro ao excluir orçamento'));
    }
  };

  const openCreate = () => {
    setEditTarget(null);
    setIsModalOpen(true);
  };

  const openEdit = (budget: BudgetStatus) => {
    setEditTarget(budget);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditTarget(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="flex min-h-screen bg-background-dark text-white">
      <Sidebar />

      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Budgets</h2>
            <p className="text-text-secondary mt-1">Plan and track your spending by category</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
                <CalendarDays size={18} />
              </div>
              <select
                aria-label="Selecionar competência"
                value={competence}
                onChange={(e) => setCompetence(e.target.value)}
                className="bg-surface-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary block pl-10 pr-4 py-2.5 appearance-none cursor-pointer"
              >
                {availableCompetences.map(c => (
                  <option key={c} value={c}>{formatCompetence(c)}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCopyFromPrevious}
              disabled={copying}
              className="border border-border-dark hover:border-primary/50 text-text-secondary hover:text-white px-4 py-2.5 rounded-lg flex items-center font-medium transition-colors disabled:opacity-50"
            >
              <Copy className="mr-2" size={18} />
              {copying ? 'Copiando...' : 'Copiar mês anterior'}
            </button>
            <button
              onClick={openCreate}
              className="bg-primary-strong hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center font-medium transition-colors shadow-lg shadow-blue-900/20"
            >
              <Plus className="mr-2" size={20} />
              Set Budget
            </button>
          </div>
        </header>

        {loading ? (
          <div className="py-12 text-center text-text-secondary">Loading budgets...</div>
        ) : budgets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {budgets.map((budget) => {
              const { percentage, isExceeded, isAlert } = getBudgetState(budget);

              return (
                <div key={budget.id} className="bg-surface-dark border border-border-dark rounded-xl p-6 hover:border-primary/50 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary-text">
                      <Target size={24} />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => openEdit(budget)}
                        aria-label={`Editar orçamento de ${budget.category_name}`}
                        className="p-2 text-text-secondary hover:text-primary-text hover:bg-primary/10 rounded-lg transition-all"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(budget.id)}
                        aria-label={`Excluir orçamento de ${budget.category_name}`}
                        className="p-2 text-text-secondary hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-1">{budget.category_name}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">{formatCurrency(budget.amount)}</span>
                      <span className="text-sm text-text-secondary">limit per month</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Spent so far</span>
                      <span className={`font-semibold ${isExceeded ? 'text-rose-500' : 'text-white'}`}>
                        {formatCurrency(budget.current_spending)}
                      </span>
                    </div>

                    <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ease-out ${
                          isExceeded ? 'bg-rose-500' : isAlert ? 'bg-orange-400' : 'bg-primary'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        {isExceeded ? (
                          <>
                            <AlertTriangle size={14} className="text-rose-500" />
                            <span className="text-rose-500">Exceeded by {formatCurrency(budget.current_spending - budget.amount)}</span>
                          </>
                        ) : isAlert ? (
                          <>
                            <AlertTriangle size={14} className="text-orange-400" />
                            <span className="text-orange-400">Alerta: {budget.alert_threshold}% atingido</span>
                          </>
                        ) : (
                          <>
                            <TrendingUp size={14} className="text-emerald-500" />
                            <span className="text-emerald-500">{formatCurrency(budget.amount - budget.current_spending)} remaining</span>
                          </>
                        )}
                      </div>
                      <span className="text-xs text-text-secondary font-bold">{percentage}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-surface-dark border border-border-dark border-dashed rounded-xl">
            <EmptyState
              icon={<Target size={40} />}
              title={`Nenhum orçamento definido para ${formatCompetence(competence)}.`}
              actionLabel="Novo Orçamento"
              onAction={openCreate}
            />
          </div>
        )}
      </main>

      <BudgetModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSuccess={() => {
          refresh();
          refreshCompetences();
        }}
        competence={competence}
        budget={editTarget}
      />
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Excluir Orçamento"
        message="Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Budgets;
