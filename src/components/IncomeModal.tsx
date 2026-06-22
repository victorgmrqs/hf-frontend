import React, { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { incomeService, Income, IncomeType } from '../services/incomeService';
import { useUser } from '../hooks/useUser';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  competence: string;
  /** Presente = modo edição. */
  income?: Income | null;
}

const TYPE_OPTIONS: { value: IncomeType; label: string }[] = [
  { value: 'SALARY', label: 'Salário' },
  { value: 'FREELANCE', label: 'Freelance' },
  { value: 'INVESTMENT', label: 'Investimento' },
  { value: 'RENTAL', label: 'Aluguel' },
  { value: 'OTHER', label: 'Outro' },
];

// Mapa mínimo error.code → pt-BR (centralização é a HF-87).
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_AMOUNT: 'O valor deve ser maior que zero.',
  MISSING_REQUIRED_FIELD: 'Preencha os campos obrigatórios.',
  INVALID_INCOME_TYPE: 'Tipo de receita inválido.',
  INVALID_COMPETENCE: 'Competência inválida.',
  CANNOT_EDIT_PROPAGATED_INCOME: 'Receitas recorrentes propagadas não podem ser editadas.',
};

const messageForError = (error: unknown): string => {
  const code = (error as { code?: string } | null)?.code;
  return (code && ERROR_MESSAGES[code]) || 'Erro ao salvar receita.';
};

const IncomeModal: React.FC<IncomeModalProps> = ({ isOpen, onClose, onSuccess, competence, income }) => {
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(false);
  const isEditing = !!income;

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<IncomeType>('SALARY');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurrent, setRecurrent] = useState(false);
  const [errors, setErrors] = useState<{ description?: string; amount?: string }>({});

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (income) {
      setDescription(income.description);
      setAmount(String(income.amount));
      setType(income.type);
      setDate(income.date.split('T')[0]);
      setRecurrent(income.recurrent);
    } else {
      setDescription('');
      setAmount('');
      setType('SALARY');
      setDate(new Date().toISOString().split('T')[0]);
      setRecurrent(false);
    }
  }, [isOpen, income]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const newErrors: { description?: string; amount?: string } = {};
    if (!description.trim()) newErrors.description = 'A descrição é obrigatória';
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) newErrors.amount = 'Informe um valor maior que zero';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    const { error } = isEditing && income
      ? await incomeService.updateIncome(income.id, {
          requester_id: currentUser.id,
          description,
          amount: parsedAmount,
          recurrent,
        })
      : await incomeService.createIncome({
          user_id: currentUser.id,
          description,
          amount: parsedAmount,
          type,
          date,
          competence,
          recurrent,
        });

    if (!error) {
      toast.success(isEditing ? 'Receita atualizada com sucesso' : 'Receita criada com sucesso');
      onSuccess();
      onClose();
    } else {
      toast.error(messageForError(error));
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <form onSubmit={handleSubmit} className="relative z-50 w-full max-w-[440px] flex flex-col bg-surface-dark rounded-xl shadow-2xl border border-border-dark overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-dark">
          <h2 className="text-white text-xl font-bold tracking-tight">{isEditing ? 'Editar Receita' : 'Nova Receita'}</h2>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-white transition-colors p-1 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {isEditing && recurrent && (
            <div className="px-4 py-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-primary-text text-xs">
                Esta alteração vale a partir deste mês — o histórico não será alterado.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="income-description" className="text-text-secondary text-sm font-medium">Descrição</label>
            <input
              id="income-description"
              className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="ex.: Salário Empresa X"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: undefined })); }}
            />
            {errors.description && <p className="text-rose-400 text-xs">{errors.description}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="income-amount" className="text-text-secondary text-sm font-medium">Valor</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-semibold">R$</span>
              <input
                id="income-amount"
                className="w-full bg-input-dark border border-border-dark rounded-lg h-12 pl-12 pr-4 text-white font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="0,00"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: undefined })); }}
              />
            </div>
            {errors.amount && <p className="text-rose-400 text-xs">{errors.amount}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="income-type" className="text-text-secondary text-sm font-medium">Tipo</label>
              <select
                id="income-type"
                disabled={isEditing}
                value={type}
                onChange={(e) => setType(e.target.value as IncomeType)}
                className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 text-white outline-none disabled:opacity-60"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="income-date" className="text-text-secondary text-sm font-medium">Data</label>
              <input
                id="income-date"
                type="date"
                disabled={isEditing}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-input-dark border border-border-dark rounded-lg h-12 px-4 text-white outline-none [color-scheme:dark] disabled:opacity-60"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={recurrent}
              onChange={(e) => setRecurrent(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-white">Repetir todo mês</span>
          </label>
        </div>

        <div className="px-6 py-5 border-t border-border-dark flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg text-white font-medium hover:bg-white/5 border border-transparent hover:border-border-dark">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-primary-strong hover:bg-blue-700 text-white font-semibold shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
};

export default IncomeModal;
