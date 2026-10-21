import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { formatINR } from '../lib/formatters';

interface SavedToastProps {
  show: boolean;
  dealerName: string;
  totalAmount: number;
  onClose: () => void;
}

export const SavedToast: React.FC<SavedToastProps> = ({
  show,
  dealerName,
  totalAmount,
  onClose,
}) => {
  useEffect(() => {
    if (show) {
      // 1. Tactile mobile vibration
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([80, 40, 80]);
        } catch {
          // ignore
        }
      }

      // 2. Auto-dismiss timer
      const timer = setTimeout(() => {
        onClose();
      }, 2600);

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-x-4 top-20 z-50 max-w-md mx-auto animate-in slide-in-from-top-4 fade-in duration-200">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-400/50 p-4 shadow-2xl flex items-center justify-between gap-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">
              Collection Saved Successfully!
            </h4>
            <p className="text-xs text-emerald-300 font-medium truncate max-w-[220px]">
              {dealerName} • <span className="font-mono font-bold">{formatINR(totalAmount)}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
