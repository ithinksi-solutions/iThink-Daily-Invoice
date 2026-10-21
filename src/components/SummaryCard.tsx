import React from 'react';
import { formatINR } from '../lib/formatters';
import { CashBadge, UpiBadge } from './PaymentLogos';
import { Banknote, Smartphone, IndianRupee } from 'lucide-react';

interface SummaryCardsProps {
  cashTotal: number;
  phonePeTotal: number;
  grandTotal: number;
  entryCount?: number;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  cashTotal,
  phonePeTotal,
  grandTotal,
  entryCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Cash Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-emerald-500/20 p-4 shadow-glass hover:border-emerald-500/40 transition-all duration-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-emerald-400/90 tracking-wide uppercase flex items-center gap-1.5">
            <CashBadge size="xs" />
            Cash / నగదు
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Banknote className="w-4 h-4" />
          </div>
        </div>
        <div className="font-mono text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          {formatINR(cashTotal)}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">Physical Currency Collected</p>
      </div>

      {/* UPI Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-purple-500/20 p-4 shadow-glass hover:border-purple-500/40 transition-all duration-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-purple-400/90 tracking-wide uppercase flex items-center gap-1.5">
            <UpiBadge size="xs" />
            UPI / యూపీఐ
          </span>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Smartphone className="w-4 h-4" />
          </div>
        </div>
        <div className="font-mono text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          {formatINR(phonePeTotal)}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">UPI & QR Settlements</p>
      </div>

      {/* Grand Total Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-emerald-950 via-slate-900 to-teal-950 border border-emerald-400/40 p-4 shadow-glow-brand">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-teal-300 tracking-wide uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            Grand Total / మొత్తం
          </span>
          <div className="w-8 h-8 rounded-lg bg-teal-400/10 border border-teal-400/30 flex items-center justify-center text-teal-300">
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>
        <div className="font-mono text-2xl sm:text-3xl font-black bg-gradient-to-r from-emerald-300 via-teal-200 to-white bg-clip-text text-transparent tracking-tight">
          {formatINR(grandTotal)}
        </div>
        <div className="flex items-center justify-between mt-1 text-[11px] text-teal-400/80 font-medium">
          <span>Combined Total</span>
          {entryCount !== undefined && <span>{entryCount} Entries</span>}
        </div>
      </div>
    </div>
  );
};
