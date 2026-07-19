import React, { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { GlobalBudget, incomeService } from '../services/incomeService';
import { messageForError } from '../utils/errorMessage';
import { useUser } from '../hooks/useUser';
import { formatCompetence } from '../utils/formatCompetence';

interface GlobalBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  competence: string;
  /** Teto existente (edição via PUT) ou null (criação via POST). */
  budget: GlobalBudget | null;
}

/**
 * Modal "Ajustar Teto" (ORC — HF-45). Validação de valor > 0 é cortesia de UX;
 * a autoridade é o backend (INVALID_CEILING / BUDGET_ALREADY_EXISTS).
 */
const GlobalBudgetModal: React.FC<GlobalBudgetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  competence,
  budget,
}) => {
  const { currentUser } = useUser();
  const [ceiling, setCeiling] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Pré-preenche no formato de digitação pt-BR (vírgula decimal).
      setCeiling(budget ? String(budget.ceiling).replace('.', ',') : '');
      setFieldError('');
      setApiError('');
    }
  }, [isOpen, budget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || saving) return;

    const parsed = parseFloat(ceiling.replace(',', '.'));
    if (!ceiling || isNaN(parsed) || parsed <= 0) {
      setFieldError('Informe um teto válido maior que zero');
      return;
    }
    setFieldError('');
    setApiError('');
    setSaving(true);

    const { error } = budget
      ? await incomeService.updateGlobalBudget(budget.id, parsed)
      : await incomeService.createGlobalBudget(currentUser.id, competence, parsed);

    setSaving(false);
    if (error) {
      setApiError(
        messageForError(
          error,
          budget ? 'Erro ao atualizar o teto global.' : 'Erro ao definir o teto global.',
        ),
      );
      return;
    }
    toast.success(budget ? 'Teto global atualizado com sucesso' : 'Teto global definido com sucesso');
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative z-50 w-full max-w-[440px] bg-surface-dark rounded-xl shadow-2xl border border-border-dark overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-dark">
          <h2 className="text-white text-xl font-bold tracking-tight">
            {budget ? 'Ajustar Teto Global' : 'Definir Teto Global'}
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
            Limite total de gastos para {formatCompetence(competence)}.
          </p>

          {apiError && (
            <div className="px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
              <p className="text-rose-400 text-sm">{apiError}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="global-budget-ceiling" className="text-text-secondary text-sm font-medium">
              Teto do mês
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-semibold text-xl">
                R$
              </span>
              <input
                id="global-budget-ceiling"
                className={`w-full bg-input-dark border rounded-lg py-4 pl-12 pr-4 text-white text-2xl font-bold focus:ring-1 outline-none ${
                  fieldError
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-border-dark focus:border-primary focus:ring-primary'
                }`}
                placeholder="0,00"
                value={ceiling}
                onChange={(e) => {
                  setCeiling(e.target.value);
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
            Salvar Teto
          </button>
        </div>
      </form>
    </div>
  );
};

export default GlobalBudgetModal;
