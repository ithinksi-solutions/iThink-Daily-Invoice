import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { formatINR, getCurrentISTDateString } from '../lib/formatters';
import { BusinessName, Profile } from '../types/database';
import {
  X,
  Trash2,
  Calendar,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Building2,
  Filter,
} from 'lucide-react';

interface AdminRangeDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deletedCount: number) => void;
  operators: Profile[];
}

export const AdminRangeDeleteModal: React.FC<AdminRangeDeleteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  operators,
}) => {
  const todayIST = getCurrentISTDateString();
  const [fromDate, setFromDate] = useState<string>(todayIST);
  const [toDate, setToDate] = useState<string>(todayIST);
  const [selectedBusiness, setSelectedBusiness] = useState<'ALL' | BusinessName>('ALL');
  const [selectedOperator, setSelectedOperator] = useState<string>('ALL');

  // Pre-flight preview state
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewCash, setPreviewCash] = useState<number>(0);
  const [previewPhonePe, setPreviewPhonePe] = useState<number>(0);
  const [previewTotal, setPreviewTotal] = useState<number>(0);
  const [starCount, setStarCount] = useState<number>(0);
  const [arboCount, setArboCount] = useState<number>(0);

  // Safety confirmation
  const [confirmText, setConfirmText] = useState<string>('');
  const [deleting, setDeleting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dismiss on Android Hardware Back Button
  useEffect(() => {
    if (!isOpen) return;
    const handleDismiss = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    window.addEventListener('dismissActiveModal', handleDismiss);
    return () => window.removeEventListener('dismissActiveModal', handleDismiss);
  }, [isOpen, onClose]);

  // Pre-flight count fetcher using daily_sheets and entries
  const fetchRangePreview = useCallback(async () => {
    if (!fromDate || !toDate) return;
    if (fromDate > toDate) {
      setErrorMsg('From Date cannot be later than To Date.');
      setPreviewCount(null);
      return;
    }

    setLoadingPreview(true);
    setErrorMsg(null);

    try {
      const { data: sheets, error: sheetsErr } = await supabase
        .from('daily_sheets')
        .select('id, sheet_date, collector_id')
        .gte('sheet_date', fromDate)
        .lte('sheet_date', toDate);

      if (sheetsErr) throw sheetsErr;

      if (!sheets || sheets.length === 0) {
        setPreviewCount(0);
        setPreviewCash(0);
        setPreviewPhonePe(0);
        setPreviewTotal(0);
        setStarCount(0);
        setArboCount(0);
        return;
      }

      const sheetIds = sheets.map((s) => s.id);

      let query = supabase
        .from('entries')
        .select('id, cash_amount, phonepe_amount, total_collected, business_name, collector_id')
        .in('sheet_id', sheetIds)
        .eq('is_deleted', false);

      if (selectedBusiness !== 'ALL') {
        query = query.eq('business_name', selectedBusiness);
      }
      if (selectedOperator !== 'ALL') {
        query = query.eq('collector_id', selectedOperator);
      }

      const { data: records, error: entriesErr } = await query;
      if (entriesErr) throw entriesErr;

      const data = records || [];
      const cash = data.reduce((sum, r) => sum + (Number(r.cash_amount) || 0), 0);
      const phonePe = data.reduce((sum, r) => sum + (Number(r.phonepe_amount) || 0), 0);
      const grand = data.reduce((sum, r) => sum + (Number(r.total_collected) || 0), 0);
      const star = data.filter((r) => r.business_name === 'STAR').length;
      const arbo = data.filter((r) => r.business_name === 'ARBO PLAST').length;

      setPreviewCount(data.length);
      setPreviewCash(cash);
      setPreviewPhonePe(phonePe);
      setPreviewTotal(grand);
      setStarCount(star);
      setArboCount(arbo);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to scan records in selected range');
      setPreviewCount(null);
    } finally {
      setLoadingPreview(false);
    }
  }, [fromDate, toDate, selectedBusiness, selectedOperator]);

  useEffect(() => {
    if (isOpen) {
      fetchRangePreview();
      setConfirmText('');
    }
  }, [isOpen, fetchRangePreview]);

  if (!isOpen) return null;

  const handleDeleteRange = async () => {
    if (confirmText.trim() !== 'DELETE') {
      setErrorMsg('Please type DELETE in capital letters to confirm.');
      return;
    }

    if (!previewCount || previewCount === 0) {
      setErrorMsg('No records to delete in this date range.');
      return;
    }

    setDeleting(true);
    setErrorMsg(null);

    try {
      const { data: sheets, error: sheetsErr } = await supabase
        .from('daily_sheets')
        .select('id, sheet_date')
        .gte('sheet_date', fromDate)
        .lte('sheet_date', toDate);

      if (sheetsErr) throw sheetsErr;

      if (!sheets || sheets.length === 0) {
        onClose();
        return;
      }

      const sheetIds = sheets.map((s) => s.id);

      let deleteQuery = supabase
        .from('entries')
        .delete()
        .in('sheet_id', sheetIds);

      if (selectedBusiness !== 'ALL') {
        deleteQuery = deleteQuery.eq('business_name', selectedBusiness);
      }
      if (selectedOperator !== 'ALL') {
        deleteQuery = deleteQuery.eq('collector_id', selectedOperator);
      }

      const { error: delErr } = await deleteQuery;
      if (delErr) throw delErr;

      onSuccess(previewCount);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete records in date range');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        
        {/* Header */}
        <header className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>Date Range Maintenance & Purge</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  Admin Only
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Permanently purge invalid or test collection batches across a custom date window
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-400 hover:text-rose-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Date Range Selection Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>From Date</span>
              </label>
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>To Date</span>
              </label>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Optional Sub-Filters (Business & Operator) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-teal-400" />
                <span>Target Business</span>
              </label>
              <select
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="ALL">All Businesses (STAR & ARBO)</option>
                <option value="STAR">STAR Collections Only</option>
                <option value="ARBO PLAST">ARBO PLAST Collections Only</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-purple-400" />
                <span>Target Operator</span>
              </label>
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="ALL">All Operators</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.full_name} ({op.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pre-Flight Audit Impact Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Pre-Flight Scope Assessment</span>
              </span>
              <button
                type="button"
                onClick={fetchRangePreview}
                disabled={loadingPreview}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                title="Recalculate Scope"
              >
                <RefreshCw className={`w-3 h-3 ${loadingPreview ? 'animate-spin' : ''}`} />
                <span>Recalculate</span>
              </button>
            </div>

            {loadingPreview ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                <span className="text-xs font-mono">Scanning collection entries in date range...</span>
              </div>
            ) : previewCount === null ? (
              <div className="py-4 text-center text-xs text-slate-500">
                Adjust dates to view affected records.
              </div>
            ) : previewCount === 0 ? (
              <div className="py-4 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-slate-200">0 Records Found</p>
                <p className="text-[11px] text-slate-400">
                  There are no collection entries in this selected date window.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="block text-[9px] uppercase font-bold text-slate-400">Collections</span>
                    <span className="font-mono text-sm font-black text-rose-400">{previewCount}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="block text-[9px] uppercase font-bold text-slate-400">Cash Total</span>
                    <span className="font-mono text-xs font-bold text-emerald-400">{formatINR(previewCash)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="block text-[9px] uppercase font-bold text-slate-400">PhonePe Total</span>
                    <span className="font-mono text-xs font-bold text-purple-400">{formatINR(previewPhonePe)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="block text-[9px] uppercase font-bold text-slate-400">Grand Total</span>
                    <span className="font-mono text-xs font-black text-white">{formatINR(previewTotal)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>STAR: <strong className="text-emerald-400 font-mono">{starCount}</strong> records</span>
                  <span>ARBO PLAST: <strong className="text-teal-400 font-mono">{arboCount}</strong> records</span>
                  <span>Date Window: <strong className="text-white font-mono">{fromDate}</strong> to <strong className="text-white font-mono">{toDate}</strong></span>
                </div>

                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] leading-relaxed">
                  ⚠️ <strong>Warning:</strong> Deleting these {previewCount} collection records will permanently remove their financial entries, subtotal records, and physical slip linkages from Supabase. This operation cannot be undone.
                </div>

                {/* Safety Confirmation Input Barrier */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <label className="block text-xs font-bold text-rose-300">
                    To confirm permanent deletion, type <span className="font-mono bg-rose-500/20 px-1 py-0.5 rounded text-rose-200">DELETE</span> below:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full px-3 py-2 bg-slate-900 border border-rose-500/40 focus:border-rose-500 rounded-lg text-white font-mono font-bold text-xs outline-none"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <footer className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDeleteRange}
            disabled={deleting || previewCount === 0 || previewCount === null || confirmText.trim() !== 'DELETE'}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-rose-600/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {deleting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting Records...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanently Delete {previewCount || 0} Records</span>
              </>
            )}
          </button>
        </footer>

      </div>
    </div>
  );
};
