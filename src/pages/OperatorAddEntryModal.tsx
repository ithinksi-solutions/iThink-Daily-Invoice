import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../lib/i18n';
import { BusinessName } from '../types/database';
import { AutocompleteInput } from '../components/AutocompleteInput';
import { ImageCapture } from '../components/ImageCaptureModal';
import { formatINR } from '../lib/formatters';
import { X, Sparkles, Building2, AlertCircle, Loader2 } from 'lucide-react';

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (dealer: string, amount: number) => void;
  sheetId: string;
}

export const OperatorAddEntryModal: React.FC<AddEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sheetId,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [businessName, setBusinessName] = useState<BusinessName>('STAR');
  const [dealerName, setDealerName] = useState<string>('');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [phonePeAmount, setPhonePeAmount] = useState<string>('');
  const [balanceOwed, setBalanceOwed] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

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

    if (!dealerName.trim()) {
      setErrorMsg('Dealer name is required');
      return;
    }

    if (dynamicTotal <= 0) {
      setErrorMsg('Please enter either Cash amount or PhonePe amount (or both)');
      return;
    }

    if (!navigator.onLine) {
      setErrorMsg(t('offlineSaveBlock'));
      return;
    }

    setSaving(true);
    try {
      const parsedBalOwed = balanceOwed.trim() ? parseFloat(balanceOwed) : null;

      const { data, error } = await supabase
        .from('entries')
        .insert({
          sheet_id: sheetId,
          collector_id: user.id,
          dealer_name: dealerName.trim(),
          cash_amount: numCash,
          phonepe_amount: numPhonePe,
          balance_owed: parsedBalOwed,
          note: note.trim() || null,
          image_url: imageUrl,
          business_name: businessName,
          status: 'submitted',
        })
        .select()
        .single();

      if (error) {
        console.error('Save entry failed:', error);
        setErrorMsg(error.message || 'Failed to save entry');
        setSaving(false);
        return;
      }

      // Reset and trigger callback
      setDealerName('');
      setCashAmount('');
      setPhonePeAmount('');
      setBalanceOwed('');
      setNote('');
      setImageUrl(null);
      setSaving(false);
      onSuccess(dealerName, dynamicTotal);
    } catch (err: any) {
      console.error('Submit error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative w-full sm:max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] max-h-[90dvh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {t('addNewEntry')}
            </h3>
            <p className="text-xs text-slate-400">Log collection for today</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Business Line Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              {t('selectBusiness')} *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBusinessName('STAR')}
                className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  businessName === 'STAR'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                STAR
              </button>
              <button
                type="button"
                onClick={() => setBusinessName('ARBO PLAST')}
                className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  businessName === 'ARBO PLAST'
                    ? 'bg-purple-500/15 border-purple-500/50 text-purple-400 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Building2 className="w-4 h-4" />
                ARBO PLAST
              </button>
            </div>
          </div>

          {/* Dealer Name with Autocomplete */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              {t('dealerName')} *
            </label>
            <AutocompleteInput
              value={dealerName}
              onChange={setDealerName}
              placeholder="e.g. ANGLI LAHT, MDVD KHAN..."
              required
            />
          </div>

          {/* Split Payment Amounts */}
          <div className="grid grid-cols-2 gap-3">
            {/* Cash */}
            <div>
              <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">
                {t('cash')} (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base font-bold placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* PhonePe */}
            <div>
              <label className="block text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1.5">
                {t('phonepe')} (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={phonePeAmount}
                  onChange={(e) => setPhonePeAmount(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base font-bold placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Computed Total Highlight */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/70 to-teal-950/70 border border-emerald-500/30 flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-300">
              {t('totalCollected')}
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-emerald-300">
              {formatINR(dynamicTotal)}
            </span>
          </div>

          {/* Balance Owed (Snapshot observation) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t('balanceOwed')} (₹)
              </label>
              <span className="text-[11px] text-slate-500">{t('remainingOwed')}</span>
            </div>
            <input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              placeholder="e.g. 72370.00 or leave blank if 0"
              value={balanceOwed}
              onChange={(e) => setBalanceOwed(e.target.value)}
              className="w-full px-3.5 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              {t('note')} ({t('optional')})
            </label>
            <input
              type="text"
              placeholder="e.g. Circled R.P.P on slip, QR scan"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Slip Photo Attachment */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              {t('slipPhoto')} ({t('optional')})
            </label>
            <ImageCapture
              currentImageUrl={imageUrl}
              onImageUploaded={setImageUrl}
              onRemoveImage={() => setImageUrl(null)}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || dynamicTotal <= 0}
              className="w-full min-h-[56px] flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-slate-950 font-extrabold text-base shadow-glow-brand hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('saving')}</span>
                </>
              ) : (
                <span>{t('saveEntry')} ({formatINR(dynamicTotal)})</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
