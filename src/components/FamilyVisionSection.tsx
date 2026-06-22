import React from 'react';
import { Users, User as UserIcon } from 'lucide-react';
import { useFamilyTotals, FamilyTotal } from '../hooks/useFamilyTotals';

interface FamilyVisionSectionProps {
  competence: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const UserCard: React.FC<{ item: FamilyTotal }> = ({ item }) => (
  <div className="bg-surface-dark rounded-xl p-6 border border-border-dark/50 shadow-sm">
    <div className="flex items-center gap-2 mb-4">
      <div className="p-2 bg-primary/10 text-primary-text rounded-lg">
        <UserIcon size={18} />
      </div>
      <h4 className="font-semibold text-white">{item.user.name}</h4>
    </div>
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-text-secondary text-sm">Pessoal</span>
        <span className="text-white font-medium">{formatCurrency(item.totals.total_personal)}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-text-secondary text-sm">Compartilhado (sua parte)</span>
        <span className="text-white font-medium">{formatCurrency(item.totals.total_shared)}</span>
      </div>
      <div className="h-px bg-border-dark/50 my-1" />
      <div className="flex justify-between items-center">
        <span className="text-primary-text font-bold text-sm">Total</span>
        <span className="text-primary-text font-bold text-lg">{formatCurrency(item.totals.total_general)}</span>
      </div>
    </div>
  </div>
);

const FamilyVisionSection: React.FC<FamilyVisionSectionProps> = ({ competence }) => {
  const { data, loading, error } = useFamilyTotals(competence);

  const familyTotal = data.reduce((acc, item) => acc + Number(item.totals.total_general), 0);

  return (
    <section className="mb-8" aria-labelledby="visao-familiar-title">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 text-primary-text rounded-lg">
          <Users size={20} />
        </div>
        <h3 id="visao-familiar-title" className="font-bold text-xl text-white">Visão Familiar</h3>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              data-testid="family-card-skeleton"
              className="bg-surface-dark rounded-xl p-6 border border-border-dark/50 h-40 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="bg-surface-dark rounded-xl border border-rose-500/30 p-6 text-center text-rose-400">
          {error}
        </div>
      ) : data.length < 2 ? (
        <div className="bg-surface-dark rounded-xl border border-border-dark/50 p-6 text-center text-text-secondary italic">
          Adicione mais um membro para ver a visão familiar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.map((item) => (
            <UserCard key={item.user.id} item={item} />
          ))}

          <div className="bg-surface-dark rounded-xl p-6 border border-emerald-500/30 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Users size={18} />
              </div>
              <h4 className="font-semibold text-white">Total Família</h4>
            </div>
            <p className="text-3xl font-bold text-emerald-400">{formatCurrency(familyTotal)}</p>
            <p className="text-[10px] text-text-secondary mt-1">Soma dos gastos totais de todos os membros.</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default FamilyVisionSection;
