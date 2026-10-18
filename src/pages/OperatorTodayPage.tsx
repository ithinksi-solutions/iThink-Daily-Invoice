import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../lib/i18n';
import { Entry, BusinessName } from '../types/database';
import { Header } from '../components/Header';
import { OperatorAddEntryModal } from './OperatorAddEntryModal';
import { ImageCapture } from '../components/ImageCaptureModal';
import { SavedToast } from '../components/SavedToast';
import { formatAppDate, formatAppTime, formatINR, getCurrentISTDateString } from '../lib/formatters';
import {
  Plus,
  Image as ImageIcon,
  Calendar,
  RefreshCw,
  Camera,
  X,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const OperatorTodayPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  const [sheetId, setSheetId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBusiness, setSelectedBusiness] = useState<'ALL' | 'STAR' | 'ARBO PLAST'>('ALL');

  // Modal & Toast states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [savedToastInfo, setSavedToastInfo] = useState<{ show: boolean; dealer: string; amount: number }>({
    show: false,
    dealer: '',
    amount: 0,
  });

  // Attach slip to existing entry state
  const [attachingEntry, setAttachingEntry] = useState<Entry | null>(null);
  const [updatingSlip, setUpdatingSlip] = useState<boolean>(false);

  // Selected image preview modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const todayIST = getCurrentISTDateString();

  // Load or create sheet and fetch entries
  const loadTodayData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: sId, error: sheetErr } = await supabase.rpc('get_or_create_daily_sheet', {
        p_collector_id: user.id,
        p_date: todayIST,
      });

      if (sheetErr) {
        setLoading(false);
        return;
      }

      setSheetId(sId);

      const { data: entriesData, error: entriesErr } = await supabase
        .from('entries')
        .select('*')
        .eq('collector_id', user.id)
        .eq('sheet_id', sId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (!entriesErr && entriesData) {
        setEntries(entriesData as Entry[]);
      }
    } catch (err) {
      console.error('Failed to load today data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, todayIST]);

  useEffect(() => {
    loadTodayData();
  }, [loadTodayData]);

  // Totals
  const totals = {
    ALL: entries.reduce((acc, curr) => acc + (curr.total_collected || 0), 0),
    STAR: entries
      .filter((e) => e.business_name === 'STAR')
      .reduce((acc, curr) => acc + (curr.total_collected || 0), 0),
    'ARBO PLAST': entries
      .filter((e) => e.business_name === 'ARBO PLAST')
      .reduce((acc, curr) => acc + (curr.total_collected || 0), 0),
  };

  const filteredEntries = entries.filter((e) => {
    if (selectedBusiness === 'ALL') return true;
    return e.business_name === selectedBusiness;
  });

  const cashTotal = filteredEntries.reduce((acc, curr) => acc + (curr.cash_amount || 0), 0);
  const phonePeTotal = filteredEntries.reduce((acc, curr) => acc + (curr.phonepe_amount || 0), 0);
  const grandTotal = cashTotal + phonePeTotal;

  const handleEntryAdded = (dealer: string, amount: number) => {
    setIsAddModalOpen(false);
    loadTodayData();
    setSavedToastInfo({ show: true, dealer, amount });
  };

  const handleSaveAttachedSlip = async (url: string) => {
    if (!attachingEntry) return;
    try {
      setUpdatingSlip(true);
      const { error } = await supabase
        .from('entries')
        .update({ image_url: url })
        .eq('id', attachingEntry.id);

      if (error) {
        alert('Failed to attach slip: ' + error.message);
      } else {
        setAttachingEntry(null);
        loadTodayData();
      }
    } catch (err: any) {
      alert('Error attaching slip: ' + err.message);
    } finally {
      setUpdatingSlip(false);
    }
  };

  return (
    <div className="h-screen w-screen max-h-screen overflow-hidden bg-[#030712] text-slate-100 flex flex-col justify-between">
      <Header />

      {/* Success Confetti Toast */}
      <SavedToast
        show={savedToastInfo.show}
        dealerName={savedToastInfo.dealer}
        totalAmount={savedToastInfo.amount}
        onClose={() => setSavedToastInfo((prev) => ({ ...prev, show: false }))}
      />

      {/* COMPACT POWER BI SCORECARD & CONTROLS STRIP */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2 shrink-0 z-10">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          
          {/* Today Date & Business Pills */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono font-bold">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{formatAppDate(todayIST)}</span>
            </div>

            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setSelectedBusiness('ALL')}
                className={`px-2 py-0.5 rounded ${
                  selectedBusiness === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'text-slate-400'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedBusiness('STAR')}
                className={`px-2 py-0.5 rounded ${
                  selectedBusiness === 'STAR'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'text-slate-400'
                }`}
              >
                STAR
              </button>
              <button
                type="button"
                onClick={() => setSelectedBusiness('ARBO PLAST')}
                className={`px-2 py-0.5 rounded ${
                  selectedBusiness === 'ARBO PLAST'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'text-slate-400'
                }`}
              >
                ARBO
              </button>
            </div>
          </div>

          {/* Compact KPI Numbers */}
          <div className="flex items-center gap-3 font-mono font-bold">
            <span className="text-emerald-400">Cash: {formatINR(cashTotal)}</span>
            <span className="text-slate-700">|</span>
            <span className="text-purple-400">PhonePe: {formatINR(phonePeTotal)}</span>
            <span className="text-slate-700">|</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Total: {formatINR(grandTotal)}
            </span>
            <button
              type="button"
              onClick={loadTodayData}
              className="p-1 text-slate-400 hover:text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

        </div>
      </div>

      {/* MAIN DATA LIST (INTERNAL SCROLL, NO WINDOW OVERFLOW) */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 max-w-4xl mx-auto w-full space-y-2.5">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs animate-pulse">
            Loading today's collections...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 text-center p-6">
            <p className="text-xs text-slate-400">{t('noEntriesToday')}</p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-glow-brand"
            >
              <Plus className="w-4 h-4" /> Add First Collection
            </button>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSplit = entry.cash_amount > 0 && entry.phonepe_amount > 0;
            return (
              <div
                key={entry.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-800/80 p-3.5 shadow-glass flex flex-col gap-2 hover:border-slate-700 transition-all"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        entry.business_name === 'STAR'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      }`}
                    >
                      {entry.business_name}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {formatAppTime(entry.created_at)}
                    </span>
                  </div>

                  <span className="font-mono text-base font-black text-white">
                    {formatINR(entry.total_collected)}
                  </span>
                </div>

                {/* Middle Row */}
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    {entry.dealer_name}
                  </h4>
                  {entry.balance_owed !== null && (
                    <span className="text-[11px] font-mono text-amber-400">
                      Bal Owed: {formatINR(entry.balance_owed)}
                    </span>
                  )}
                </div>

                {entry.note && (
                  <p className="text-[11px] text-slate-400 italic">
                    "{entry.note}"
                  </p>
                )}

                {/* Footer Details & Direct Slip Upload/View */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    {entry.cash_amount > 0 && (
                      <span className="text-emerald-400">Cash: {formatINR(entry.cash_amount)}</span>
                    )}
                    {entry.phonepe_amount > 0 && (
                      <span className="text-purple-400">PhonePe: {formatINR(entry.phonepe_amount)}</span>
                    )}
                  </div>

                  {/* Slip Action Button */}
                  <div>
                    {entry.image_url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImageUrl(entry.image_url)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 text-[11px] font-bold"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>View Slip</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAttachingEntry(entry)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium"
                      >
                        <Camera className="w-3.5 h-3.5 text-teal-400" />
                        <span>+ Attach Slip</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </main>

      {/* FIXED BOTTOM ACTION BAR - Big Touch Target (56px) for One-Handed Operation */}
      <div className="p-3 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 shrink-0 z-20">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            disabled={!sheetId}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-slate-950 text-sm font-black shadow-glow-brand hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('addNewEntry')}</span>
          </button>
        </div>
      </div>

      {/* Add Entry Modal */}
      {sheetId && (
        <OperatorAddEntryModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleEntryAdded}
          sheetId={sheetId}
        />
      )}

      {/* Quick Attach Slip to Existing Entry Modal */}
      {attachingEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Attach Slip Photo</h3>
              <button
                type="button"
                onClick={() => setAttachingEntry(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Attach bill slip for <strong className="text-white">{attachingEntry.dealer_name}</strong> ({formatINR(attachingEntry.total_collected)}).
            </p>

            <ImageCapture
              onImageUploaded={handleSaveAttachedSlip}
            />

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setAttachingEntry(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slip Fullscreen Preview Modal */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-12 right-0 p-2 text-white bg-slate-800/80 rounded-full hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImageUrl}
              alt="Slip"
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain border border-slate-800 shadow-2xl"
            />
            <div className="mt-3">
              <a
                href={previewImageUrl}
                target="_blank"
                rel="noreferrer"
                download={`Slip_${todayIST}.jpg`}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Image</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OperatorTodayPage;
