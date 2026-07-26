import React, { useEffect, useState } from 'react';
import { ChevronDown, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Category, financeService } from '../services/financeService';
import { ReductionGoal, incomeService } from '../services/incomeService';
import { messageForError } from '../utils/errorMessage';
import { parseAmountBR } from '../utils/parseAmount';
import { useUser } from '../hooks/useUser';
import { formatCompetence } from '../utils/formatCompetence';

interface ReductionGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  competence: string;
  /** Meta existente (edição via PUT — só target_amount) ou null (criação via POST). */
  goal: ReductionGoal | null;
}

/**
 * Modal de meta de redução por categoria (MET — HF-47). Validação de valor > 0
 * é cortesia de UX; a autoridade é o backend (INVALID_TARGET_AMOUNT /
 * GOAL_ALREADY_EXISTS — MET-04).
 */
const ReductionGoalModal: React.FC<ReductionGoalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  competence,
  goal,
}) => {
  const { currentUser } = useUser();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCategoryId(goal ? goal.category_id : '');
    setAmount(goal ? String(goal.target_amount).replace('.', ',') : '');
    setFieldError('');
    setApiError('');
    financeService.getCategories().then(({ data }) => {
      if (data) setCategories(data);
    });
  }, [isOpen, goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || saving) return;

    const parsed = parseAmountBR(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setFieldError('Informe uma meta válida maior que zero');
      return;
    }
    if (!goal && !categoryId) {
      setFieldError('Selecione uma categoria');
      return;
    }
    setFieldError('');
    setApiError('');
    setSaving(true);

    const { error } = goal
      ? await incomeService.updateReductionGoal(goal.id, parsed)
      : await incomeService.createReductionGoal(currentUser.id, categoryId, competence, parsed);

    setSaving(false);
    if (error) {
      setApiError(
        messageForError(
          error,
          goal ? 'Erro ao atualizar a meta de redução.' : 'Erro ao criar a meta de redução.',
        ),
      );
      return;
    }
    toast.success(goal ? 'Meta atualizada com sucesso' : 'Meta criada com sucesso');
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  const editCategoryName =
    goal && (categories.find((c) => c.id === goal.category_id)?.name ?? 'Categoria');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative z-50 w-full max-w-[440px] bg-surface-dark rounded-xl shadow-2xl border border-border-dark overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-dark">
          <h2 className="text-white text-xl font-bold tracking-tight">
            {goal ? 'Editar Meta de Redução' : 'Nova Meta de Redução'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-text-secondary hover:text-white transition-colors p-1 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          <p className="text-text-secondary text-sm">
            Quanto você quer gastar no máximo nesta categoria em {formatCompetence(competence)}.
          </p>

          {apiError && (
            <div className="px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
              <p className="text-rose-400 text-sm">{apiError}</p>
            </div>
          )}

          {goal ? (
            <div className="flex flex-col gap-2">
              <span className="text-text-secondary text-sm font-medium">Categoria</span>
              <p className="text-white font-semibold">{editCategoryName}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label htmlFor="reduction-goal-category" className="text-text-secondary text-sm font-medium">
                Categoria
              </label>
              <div className="relative">
                <select
                  id="reduction-goal-category"
                  className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 text-white appearance-none cursor-pointer outline-none"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setFieldError('');
                  }}
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                  <ChevronDown size={20} />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="reduction-goal-amount" className="text-text-secondary text-sm font-medium">
              Meta do mês
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-semibold text-xl">
                R$
              </span>
              <input
                id="reduction-goal-amount"
                className={`w-full bg-input-dark border rounded-lg py-4 pl-12 pr-4 text-white text-2xl font-bold focus:ring-1 outline-none ${
                  fieldError
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-border-dark focus:border-primary focus:ring-primary'
                }`}
                placeholder="0,00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setFieldError('');
                }}
              />
            </div>
            {fieldError && <p className="text-rose-400 text-xs mt-1">{fieldError}</p>}
          </div>
        </div>

        <div className="px-6 py-5 border-t border-border-dark flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg text-white font-medium hover:bg-white/5 border border-transparent hover:border-border-dark"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-primary-strong hover:bg-blue-700 text-white font-semibold shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 size={18} className="animate-spin" />}
            Salvar Meta
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReductionGoalModal;
