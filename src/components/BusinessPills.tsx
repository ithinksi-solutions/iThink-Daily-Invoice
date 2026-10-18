import React from 'react';
import { BusinessName } from '../types/database';
import { formatINR } from '../lib/formatters';
import { Layers, Sparkles, Building2 } from 'lucide-react';

export type BusinessFilter = 'ALL' | BusinessName;

interface BusinessPillsProps {
  selected: BusinessFilter;
  onChange: (b: BusinessFilter) => void;
  totals?: {
    ALL: number;
    STAR: number;
    'ARBO PLAST': number;
  };
}

export const BusinessPills: React.FC<BusinessPillsProps> = ({ selected, onChange, totals }) => {
  const options: { id: BusinessFilter; label: string; icon: any }[] = [
    { id: 'ALL', label: 'All Businesses', icon: Layers },
    { id: 'STAR', label: 'STAR', icon: Sparkles },
    { id: 'ARBO PLAST', label: 'ARBO PLAST', icon: Building2 },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800/80 overflow-x-auto shadow-inner">
      {options.map((opt) => {
        const isSelected = selected === opt.id;
        const Icon = opt.icon;
        const total = totals ? totals[opt.id] : undefined;

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              isSelected
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-bold scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSelected ? 'text-slate-950' : 'text-slate-500'}`} />
            <span>{opt.label}</span>
            {total !== undefined && (
              <span
                className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md ${
                  isSelected
                    ? 'bg-slate-950/20 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {formatINR(total, false)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
