import React, { useEffect, useState } from 'react';
import { Plus, CalendarDays, Wallet, Trash2, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '../components/Sidebar';
import EmptyState from '../components/EmptyState';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { incomeService, Income as IncomeRecord, IncomeType } from '../services/incomeService';
import { useUser } from '../hooks/useUser';
import { useCompetences } from '../hooks/useCompetence';
import { formatCompetence } from '../utils/formatCompetence';

const TYPE_LABELS: Record<IncomeType, string> = {
  SALARY: 'Salário',
  FREELANCE: 'Freelance',
  INVESTMENT: 'Investimento',
  RENTAL: 'Aluguel',
  OTHER: 'Outro',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const Income: React.FC = () => {
  const { currentUser } = useUser();
  const { availableCompetences } = useCompetences();
  const [competence, setCompetence] = useState(new Date().toISOString().substring(0, 7));
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  // Modal de criação/edição é a HF-40; aqui só preparamos o gatilho.
  const [, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IncomeRecord | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    setLoading(true);
    incomeService
      .getIncomes(currentUser.id, competence)
      .then(({ data }) => {
        if (active) setIncomes(data ?? []);
      })
      .catch(() => {
        if (active) toast.error('Erro ao carregar receitas');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [competence, currentUser]);

  const refetch = async () => {
    if (!currentUser) return;
    const { data } = await incomeService.getIncomes(currentUser.id, competence);
    setIncomes(data ?? []);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !currentUser) return;
    const { error } = await incomeService.deleteIncome(deleteTarget.id, currentUser.id);
    setDeleteTarget(null);
    if (!error) {
      toast.success('Receita excluída com sucesso');
      refetch();
    } else {
      toast.error('Erro ao excluir receita');
    }
  };

  const total = incomes.reduce((acc, i) => acc + Number(i.amount), 0);

  return (
    <div className="flex min-h-screen bg-background-dark text-white">
      <Sidebar />

      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Receitas</h2>
            <p className="text-text-secondary mt-1">Gerencie sua renda mensal</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                <CalendarDays size={18} />
              </div>
              <select
                aria-label="Selecionar competência"
                value={competence}
                onChange={(e) => setCompetence(e.target.value)}
                className="bg-surface-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary block pl-10 pr-4 py-2.5 appearance-none cursor-pointer"
              >
                {availableCompetences.map((c) => (
                  <option key={c} value={c}>{formatCompetence(c)}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary-strong hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center font-medium transition-colors shadow-lg shadow-blue-900/20"
            >
              <Plus className="mr-2" size={20} />
              Nova Receita
            </button>
          </div>
        </header>

        <div className="bg-surface-dark border border-border-dark rounded-xl p-6 mb-6 flex items-center justify-between">
          <span className="text-text-secondary text-sm font-medium uppercase tracking-wider">Total de Receitas</span>
          <span className="text-2xl font-bold text-emerald-400">{formatCurrency(total)}</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-text-secondary">Carregando receitas...</div>
        ) : incomes.length > 0 ? (
          <div className="bg-surface-dark border border-border-dark rounded-xl divide-y divide-border-dark/50">
            {incomes.map((income) => (
              <div key={income.id} className="flex items-center justify-between px-6 py-4 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{income.description}</p>
                      {income.recurrent && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary-text px-1.5 py-0.5 rounded border border-primary/20 font-bold uppercase">
                          <Repeat size={10} /> Recorrente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary">
                      {TYPE_LABELS[income.type] ?? income.type} · {new Date(income.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-white">{formatCurrency(Number(income.amount))}</span>
                  <button
                    onClick={() => setDeleteTarget(income)}
                    aria-label={`Excluir receita ${income.description}`}
                    className="p-2 text-text-secondary hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-dark border border-border-dark border-dashed rounded-xl">
            <EmptyState
              icon={<Wallet size={40} />}
              title={`Nenhuma receita em ${formatCompetence(competence)}.`}
              description="Registre sua primeira receita do mês."
              actionLabel="Nova Receita"
              onAction={() => setIsModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* IncomeModal (criação/edição) será entregue na HF-40. */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Excluir Receita"
        message="Tem certeza que deseja excluir esta receita? Esta ação não pode ser desfeita."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Income;
