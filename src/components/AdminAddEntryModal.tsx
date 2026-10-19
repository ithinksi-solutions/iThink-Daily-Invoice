import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, BusinessName } from '../types/database';
import { formatINR, getCurrentISTDateString } from '../lib/formatters';
import { X, Check, AlertCircle, RefreshCw, Plus, Building2, UserCheck, DollarSign } from 'lucide-react';

interface AdminAddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (dealer: string, amount: number) => void;
  operators: Profile[];
  currentDate: string;
}

export const AdminAddEntryModal: React.FC<AdminAddEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  operators,
  currentDate,
}) => {
  const [operatorId, setOperatorId] = useState<string>(operators[0]?.id || '');
  const [entryDate, setEntryDate] = useState<string>(currentDate || getCurrentISTDateString());
  const [businessName, setBusinessName] = useState<BusinessName>('STAR');
  const [dealerName, setDealerName] = useState<string>('');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [phonePeAmount, setPhonePeAmount] = useState<string>('');
  const [balanceOwed, setBalanceOwed] = useState<string>('');
  const [note, setNote] = useState<string>('');
  
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hardware Back Button Dismissal Listener
  useEffect(() => {
    if (!isOpen) return;
    const handleDismiss = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    window.addEventListener('dismissActiveModal', handleDismiss);
    return () => window.removeEventListener('dismissActiveModal', handleDismiss);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const numCash = parseFloat(cashAmount) || 0;
  const numPhonePe = parseFloat(phonePeAmount) || 0;
  const dynamicTotal = numCash + numPhonePe;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!operatorId) {
      setErrorMsg('Please select an operator');
      return;
    }

    if (!dealerName.trim()) {
      setErrorMsg('Dealer / Shop name is required');
      return;
    }

    if (dynamicTotal <= 0) {
      setErrorMsg('Please enter either Cash amount or PhonePe amount');
      return;
    }

    setSaving(true);
    try {
      // 1. Find or create daily sheet
      let sheetId: string;
      const { data: existingSheet } = await supabase
        .from('daily_sheets')
        .select('id')
        .eq('sheet_date', entryDate)
        .eq('collector_id', operatorId)
        .maybeSingle();

      if (existingSheet) {
        sheetId = existingSheet.id;
      } else {
        const { data: newSheet, error: sheetErr } = await supabase
          .from('daily_sheets')
          .insert({
            sheet_date: entryDate,
            collector_id: operatorId,
            notes: 'Created via Admin direct entry',
          })
          .select('id')
          .single();

        if (sheetErr || !newSheet) {
          throw new Error('Failed to create daily sheet: ' + (sheetErr?.message || 'Error'));
        }
        sheetId = newSheet.id;
      }

      // 2. Insert entry
      const parsedBalOwed = balanceOwed.trim() ? parseFloat(balanceOwed) : null;
      const { error: entryErr } = await supabase.from('entries').insert({
        sheet_id: sheetId,
        collector_id: operatorId,
        dealer_name: dealerName.trim(),
        cash_amount: numCash,
        phonepe_amount: numPhonePe,
        balance_owed: parsedBalOwed,
        note: note.trim() ? `${note.trim()} [Admin Logged]` : '[Admin Direct Entry]',
        business_name: businessName,
        status: 'approved',
        is_deleted: false,
      });

      if (entryErr) {
        throw new Error(entryErr.message);
      }

      onSuccess(dealerName.trim(), dynamicTotal);
      onClose();
    } catch (err: any) {
      console.error('Admin add entry failed:', err);
      setErrorMsg(err.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] max-h-[90dvh] overflow-y-auto text-slate-100 space-y-4 animate-in fade-in-50 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Record Single Collection Entry</span>
            </h3>
            <p className="text-xs text-slate-400">Directly log collection on behalf of an operator</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Operator & Date Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Operator *</label>
              <select
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:border-emerald-500 outline-none"
              >
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.full_name} ({op.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Date *</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold focus:border-emerald-500 outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Business Line */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Business Line *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBusinessName('STAR')}
                className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                  businessName === 'STAR'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                STAR Wholesale
              </button>
              <button
                type="button"
                onClick={() => setBusinessName('ARBO PLAST')}
                className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                  businessName === 'ARBO PLAST'
                    ? 'bg-purple-500/15 border-purple-500/50 text-purple-400 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                ARBO PLAST
              </button>
            </div>
          </div>

          {/* Dealer Name */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Dealer / Shop Name *</label>
            <input
              type="text"
              placeholder="e.g. ANGLI LAHT, MDVD KHAN, MPL MAHESWARA"
              value={dealerName}
              onChange={(e) => setDealerName(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Amounts: Cash & PhonePe */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Cash Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono font-bold focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">PhonePe Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={phonePeAmount}
                onChange={(e) => setPhonePeAmount(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-purple-400 font-mono font-bold focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Live Dynamic Total Banner */}
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <span className="text-slate-300 font-bold uppercase text-[10px]">Total Collected</span>
            <span className="font-mono font-black text-sm text-emerald-400">{formatINR(dynamicTotal)}</span>
          </div>

          {/* Balance Owed */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Balance Owed (Optional)</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 72370.00"
              value={balanceOwed}
              onChange={(e) => setBalanceOwed(e.target.value)}
              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-400 font-mono focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Remarks / Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Handwritten note from operator"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save Entry ({formatINR(dynamicTotal)})</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
