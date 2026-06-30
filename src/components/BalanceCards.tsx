import React from 'react';
import { Wallet, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { useBalance } from '../hooks/useBalance';

interface BalanceCardsProps {
  competence: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const TOOLTIP =
  'Saldo Hoje é a receita do mês menos os gastos já realizados. ' +
  'Saldo Projetado desconta também as contas a pagar ainda em aberto até o fim do mês.';

const BalanceCards: React.FC<BalanceCardsProps> = ({ competence }) => {
  const { data, loading, error } = useBalance(competence);

  return (
    <section className="mb-8" aria-labelledby="saldo-mes-title">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 text-primary-text rounded-lg">
          <Wallet size={20} />
        </div>
        <h3 id="saldo-mes-title" className="font-bold text-xl text-white">Saldo do Mês</h3>
        <span
          className="text-text-secondary cursor-help"
          tabIndex={0}
          role="img"
          aria-label={TOOLTIP}
          title={TOOLTIP}
        >
          <Info size={16} />
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div
              key={i}
              data-testid="balance-card-skeleton"
              className="bg-surface-dark rounded-xl p-6 border border-border-dark/50 h-32 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="bg-surface-dark rounded-xl border border-rose-500/30 p-6 text-center text-rose-400">
          {error}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Saldo Hoje */}
          <div className="bg-surface-dark rounded-xl p-6 border border-border-dark/50 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Wallet size={64} className="text-emerald-400" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-text-secondary text-sm font-medium uppercase tracking-wider">Saldo Hoje</h4>
              <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2 py-1 rounded">Disponível</span>
            </div>
            <span className="text-3xl font-bold text-white">{formatCurrency(data.balance_today)}</span>
            <p className="text-[10px] text-text-secondary mt-2 leading-relaxed">
              Receita do mês menos os gastos já realizados.
            </p>
          </div>

          {/* Saldo Projetado — alerta visual quando negativo (SAL-05) */}
          <div
            data-testid="projected-card"
            className={`bg-surface-dark rounded-xl p-6 border shadow-sm relative overflow-hidden group ${
              data.is_projected_negative ? 'border-rose-500 border-2' : 'border-border-dark/50'
            }`}
          >
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp size={64} className={data.is_projected_negative ? 'text-rose-400' : 'text-primary-text'} />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-text-secondary text-sm font-medium uppercase tracking-wider">Saldo Projetado</h4>
              {data.is_projected_negative ? (
                <span className="flex items-center gap-1 bg-rose-500/10 text-rose-400 text-xs font-semibold px-2 py-1 rounded">
                  <AlertTriangle size={12} aria-hidden="true" /> Atenção
                </span>
              ) : (
                <span className="bg-primary/10 text-primary-text text-xs font-semibold px-2 py-1 rounded">Fim do mês</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {data.is_projected_negative && (
                <AlertTriangle size={24} className="text-rose-400" aria-label="Saldo projetado negativo" />
              )}
              <span className={`text-3xl font-bold ${data.is_projected_negative ? 'text-rose-400' : 'text-white'}`}>
                {formatCurrency(data.projected_balance)}
              </span>
            </div>
            <p className="text-[10px] text-text-secondary mt-2 leading-relaxed">
              Saldo de hoje menos as contas a pagar ainda em aberto no mês.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default BalanceCards;
