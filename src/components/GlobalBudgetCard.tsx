import React, { useState } from 'react';
import { AlertTriangle, Gauge, Info, Pencil, Plus } from 'lucide-react';
import { useGlobalBudget } from '../hooks/useGlobalBudget';
import { useBalance } from '../hooks/useBalance';
import GlobalBudgetModal from './GlobalBudgetModal';

const AUTO_ADJUSTED_TOOLTIP =
  'Teto definido automaticamente no início do mês a partir do gasto do mês anterior. ' +
  'Você pode ajustá-lo manualmente quando quiser.';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface GlobalBudgetCardProps {
  competence: string;
}

/**
 * Card "Teto Global do Mês" (ORC — HF-45). Teto vem de GET /budgets/global e o
 * gasto do mês de GET /balance (total_expenses) — a barra/restante são
 * apresentação sobre esses dois números do backend. Quando o backend entregar
 * ORC-06/07 (ceiling_usage_pct / ceiling_exceeded no /balance), migrar a
 * porcentagem e o alerta para os campos calculados por ele.
 */
const GlobalBudgetCard: React.FC<GlobalBudgetCardProps> = ({ competence }) => {
  const { budget, loading, error, notFound, refresh } = useGlobalBudget(competence);
  const { data: balance } = useBalance(competence);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const spent = balance?.total_expenses ?? null;
  const remaining = budget && spent !== null ? budget.ceiling - spent : null;
  const usagePct = budget && spent !== null && budget.ceiling > 0 ? (spent / budget.ceiling) * 100 : null;
  const isExceeded = remaining !== null && remaining < 0;

  return (
    <section aria-labelledby="teto-global-title" className="mb-8">
      <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary-text rounded-lg">
              <Gauge size={24} />
            </div>
            <h3 id="teto-global-title" className="font-bold text-xl text-white">
              Teto Global do Mês
            </h3>
            {budget?.auto_adjusted && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary-text border border-primary/30"
                title={AUTO_ADJUSTED_TOOLTIP}
              >
                <Info size={12} aria-label={AUTO_ADJUSTED_TOOLTIP} />
                Auto-ajustado
              </span>
            )}
          </div>
          {!loading && !error && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary-strong hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-medium transition-colors text-sm"
            >
              {budget ? <Pencil className="mr-2" size={16} /> : <Plus className="mr-2" size={16} />}
              {budget ? 'Ajustar Teto' : 'Definir Teto'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3" aria-label="Carregando teto global">
            <div className="h-8 w-48 bg-white/10 rounded"></div>
            <div className="h-3 w-full bg-white/10 rounded-full"></div>
          </div>
        ) : error ? (
          <p className="text-rose-400 text-sm">{error}</p>
        ) : notFound ? (
          <p className="text-text-secondary text-sm">
            Nenhum teto definido para este mês. Defina um limite total para acompanhar seus gastos.
          </p>
        ) : budget ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-text-secondary text-xs uppercase font-bold tracking-widest mb-1">
                  Teto definido
                </p>
                <p className="text-2xl font-bold text-white">{formatCurrency(budget.ceiling)}</p>
              </div>
              <div>
                <p className="text-text-secondary text-xs uppercase font-bold tracking-widest mb-1">
                  Total gasto
                </p>
                <p className={`text-2xl font-bold ${isExceeded ? 'text-rose-400' : 'text-white'}`}>
                  {spent !== null ? formatCurrency(spent) : '—'}
                </p>
              </div>
              <div>
                <p className="text-text-secondary text-xs uppercase font-bold tracking-widest mb-1">
                  Restante
                </p>
                {remaining !== null ? (
                  <p className={`text-2xl font-bold ${isExceeded ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {formatCurrency(remaining)}
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-text-secondary">—</p>
                )}
              </div>
            </div>

            {usagePct !== null && (
              <div className="space-y-2">
                <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-out ${
                      isExceeded ? 'bg-rose-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(100, usagePct)}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  {isExceeded ? (
                    <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                      <AlertTriangle size={14} aria-label="Teto global estourado" />
                      Teto estourado em {formatCurrency(Math.abs(remaining ?? 0))}
                    </span>
                  ) : (
                    <span className="text-text-secondary">do teto utilizado</span>
                  )}
                  <span className="text-text-secondary font-bold">{Math.round(usagePct)}%</span>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <GlobalBudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refresh}
        competence={competence}
        budget={budget}
      />
    </section>
  );
};

export default GlobalBudgetCard;
