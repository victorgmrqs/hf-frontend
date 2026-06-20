import React, { useState } from 'react';
import { PieChart } from 'lucide-react';
import { CategoryTotal } from '../services/financeService';
import { buildDonutSegments, toCategorySlices } from '../utils/donut';

interface CategoryDonutChartProps {
  data: CategoryTotal[];
}

const SIZE = 180;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({ data }) => {
  const slices = toCategorySlices(data);
  const segments = buildDonutSegments(slices, CIRCUMFERENCE);
  const [active, setActive] = useState<number | null>(null);

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-text-secondary">
        <PieChart size={36} className="mb-3 opacity-60" />
        <p className="text-sm">Sem gastos por categoria neste mês.</p>
      </div>
    );
  }

  const total = slices.reduce((acc, s) => acc + s.total, 0);
  const current = active !== null ? slices[active] : null;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Gastos por categoria">
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {segments.map((seg, i) => (
              <circle
                key={slices[i].category_id}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={active === i ? STROKE + 4 : STROKE}
                strokeDasharray={seg.dashArray}
                strokeDashoffset={seg.dashOffset}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                <title>{`${slices[i].category_name}: ${formatCurrency(slices[i].total)} (${slices[i].percentage}%)`}</title>
              </circle>
            ))}
          </g>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-text-secondary text-[11px] uppercase tracking-wider">
            {current ? current.category_name : 'Total'}
          </span>
          <span className="text-white font-bold text-lg">
            {formatCurrency(current ? current.total : total)}
          </span>
          {current && <span className="text-text-secondary text-xs">{current.percentage}%</span>}
        </div>
        </svg>
      </div>

      <ul className="flex-1 w-full space-y-2">
        {slices.map((s, i) => (
          <li key={s.category_id}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className="w-full flex items-center gap-3 text-left rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors"
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="flex-1 text-sm text-white truncate">{s.category_name}</span>
              <span className="text-sm font-medium text-white">{formatCurrency(s.total)}</span>
              <span className="text-xs text-text-secondary w-12 text-right">{s.percentage}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategoryDonutChart;
