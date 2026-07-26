import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, TrendingDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ReductionGoalModal from './ReductionGoalModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import EmptyState from './EmptyState';
import { financeService } from '../services/financeService';
import {
  GoalComparisonItem,
  ReductionGoal,
  incomeService,
} from '../services/incomeService';
import { messageForError } from '../utils/errorMessage';
import { useUser } from '../hooks/useUser';
import { formatCompetence } from '../utils/formatCompetence';

interface ReductionGoalsSectionProps {
  competence: string;
}

/** Linha pronta para exibição: comparativo + meta correspondente (id/achieved). */
interface GoalRow {
  item: GoalComparisonItem;
  goal: ReductionGoal;
  categoryName: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

/**
 * Seção "Metas de Redução" da página Budgets (MET-07 — HF-47). Exibe por
 * categoria: meta, gasto atual, mês anterior, variação e progresso — tudo
 * calculado pelo backend (comparativo MET-05). Campos null (degradação ou sem
 * base de comparação) exibem placeholder.
 */
const ReductionGoalsSection: React.FC<ReductionGoalsSectionProps> = ({ competence }) => {
  const { currentUser } = useUser();
  const [rows, setRows] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ReductionGoal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReductionGoal | null>(null);

  const load = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setLoadError('');
    const [goalsRes, comparisonRes, categoriesRes] = await Promise.all([
      incomeService.getReductionGoals(currentUser.id, competence),
      incomeService.getGoalComparison(currentUser.id, competence),
      financeService.getCategories(),
    ]);
    setLoading(false);

    if (goalsRes.error || comparisonRes.error) {
      setLoadError(
        messageForError(goalsRes.error ?? comparisonRes.error, 'Erro ao carregar as metas de redução.'),
      );
      setRows([]);
      return;
    }

    const goals = goalsRes.data ?? [];
    const items = comparisonRes.data ?? [];
    const categoryNames = new Map((categoriesRes.data ?? []).map((c) => [c.id, c.name]));

    const merged: GoalRow[] = [];
    for (const item of items) {
      const goal = goals.find((g) => g.category_id === item.category_id);
      if (!goal) continue;
      merged.push({
        item,
        goal,
        // category_name vem null quando a categoria não tem despesas no mês —
        // resolve pelo catálogo de categorias do transaction-service.
        categoryName: item.category_name ?? categoryNames.get(item.category_id) ?? 'Categoria',
      });
    }
    setRows(merged);
  }, [currentUser, competence]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await incomeService.deleteReductionGoal(deleteTarget.id);
    setDeleteTarget(null);
    if (error) {
      toast.error(messageForError(error, 'Erro ao excluir a meta'));
      return;
    }
    toast.success('Meta excluída com sucesso');
    load();
  };

  const openCreate = () => {
    setEditTarget(null);
    setIsModalOpen(true);
  };

  return (
    <section aria-label="Metas de Redução" className="mt-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Metas de Redução</h3>
          <p className="text-text-secondary text-sm mt-1">
            Reduza gastos por categoria comparando com o mês anterior
          </p>
        </div>
        <button
          onClick={openCreate}
          className="border border-border-dark hover:border-primary/50 text-text-secondary hover:text-white px-4 py-2.5 rounded-lg flex items-center font-medium transition-colors"
        >
          <TrendingDown className="mr-2" size={18} />
          Nova Meta
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-text-secondary">Carregando metas...</div>
      ) : loadError ? (
        <div className="px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
          <p className="text-rose-400 text-sm">{loadError}</p>
        </div>
      ) : rows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {rows.map(({ item, goal, categoryName }) => {
            const progress = item.target_progress_pct;
            const exceeded = item.on_track === false;
            return (
              <div
                key={goal.id}
                className="bg-surface-dark border border-border-dark rounded-xl p-6 hover:border-primary/50 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-white">{categoryName}</h4>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">
                        {formatCurrency(item.target_amount)}
                      </span>
                      <span className="text-sm text-text-secondary">de meta</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => {
                        setEditTarget(goal);
                        setIsModalOpen(true);
                      }}
                      aria-label={`Editar meta de ${categoryName}`}
                      className="p-2 text-text-secondary hover:text-primary-text hover:bg-primary/10 rounded-lg transition-all"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(goal)}
                      aria-label={`Excluir meta de ${categoryName}`}
                      className="p-2 text-text-secondary hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Gasto neste mês</span>
                    <span className={`font-semibold ${exceeded ? 'text-rose-500' : 'text-white'}`}>
                      {item.current_month_amount === null ? '—' : formatCurrency(item.current_month_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Mês anterior</span>
                    <span className="text-white">
                      {item.previous_month_amount === null ? '—' : formatCurrency(item.previous_month_amount)}
                    </span>
                  </div>

                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all duration-1000 ease-out ${
                        exceeded ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(progress ?? 0, 100)}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span
                      className={`text-xs font-medium ${
                        item.variation_pct !== null && item.variation_pct > 0
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {item.variation_label ?? 'Sem comparação com o mês anterior'}
                    </span>
                    <span className="text-xs text-text-secondary font-bold">
                      {progress === null ? '—' : `${progress}%`}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {goal.achieved !== null ? (
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          goal.achieved
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {goal.achieved ? 'Meta atingida' : 'Meta não atingida'}
                      </span>
                    ) : item.on_track !== null ? (
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          item.on_track
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {item.on_track ? 'Dentro da meta' : 'Meta estourada'}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface-dark border border-border-dark border-dashed rounded-xl">
          <EmptyState
            icon={<TrendingDown size={40} />}
            title={`Nenhuma meta de redução para ${formatCompetence(competence)}.`}
            actionLabel="Nova Meta"
            onAction={openCreate}
          />
        </div>
      )}

      <ReductionGoalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditTarget(null);
        }}
        onSuccess={load}
        competence={competence}
        goal={editTarget}
      />
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Excluir Meta"
        message="Tem certeza que deseja excluir esta meta de redução? Esta ação não pode ser desfeita."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
};

export default ReductionGoalsSection;
