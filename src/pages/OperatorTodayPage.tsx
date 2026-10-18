import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../lib/i18n';
import { Entry, BusinessName } from '../types/database';
import { Header } from '../components/Header';
import { BusinessPills, BusinessFilter } from '../components/BusinessPills';
import { SummaryCards } from '../components/SummaryCard';
import { OperatorAddEntryModal } from './OperatorAddEntryModal';
import { SavedToast } from '../components/SavedToast';
import { formatAppDate, formatAppTime, formatINR, getCurrentISTDateString } from '../lib/formatters';
import { Plus, Image, Calendar, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

export const OperatorTodayPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  const [sheetId, setSheetId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessFilter>('ALL');

  // Modal & Toast states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [savedToastInfo, setSavedToastInfo] = useState<{ show: boolean; dealer: string; amount: number }>({
    show: false,
    dealer: '',
    amount: 0,
  });

  // Selected image preview modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const todayIST = getCurrentISTDateString();

  // Load or create sheet and fetch entries
  const loadTodayData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Get or create sheet for today via RPC
      const { data: sId, error: sheetErr } = await supabase.rpc('get_or_create_daily_sheet', {
        p_collector_id: user.id,
        p_date: todayIST,
      });

      if (sheetErr) {
        console.error('Error getting sheet:', sheetErr);
        setLoading(false);
        return;
      }

      setSheetId(sId);

      // 2. Fetch today's entries for this operator
      const { data: entriesData, error: entriesErr } = await supabase
        .from('entries')
        .select('*')
        .eq('collector_id', user.id)
        .eq('sheet_id', sId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (entriesErr) {
        console.error('Error fetching entries:', entriesErr);
      } else {
        setEntries((entriesData as Entry[]) || []);
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

  // Compute business subtotals
  const totals = {
    ALL: entries.reduce((acc, curr) => acc + (curr.total_collected || 0), 0),
    STAR: entries
      .filter((e) => e.business_name === 'STAR')
      .reduce((acc, curr) => acc + (curr.total_collected || 0), 0),
    'ARBO PLAST': entries
      .filter((e) => e.business_name === 'ARBO PLAST')
      .reduce((acc, curr) => acc + (curr.total_collected || 0), 0),
  };

  // Filter entries based on business pill selection
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-28">
      {/* Fortune 5 Top Header */}
      <Header />

      {/* Success Confetti Toast */}
      <SavedToast
        show={savedToastInfo.show}
        dealerName={savedToastInfo.dealer}
        totalAmount={savedToastInfo.amount}
        onClose={() => setSavedToastInfo((prev) => ({ ...prev, show: false }))}
      />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-4 space-y-4">
        
        {/* Date & Operator Banner (NO date picker for operators!) */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 p-4 shadow-glass flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t('today')} (IST)
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {formatAppDate(todayIST)}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={loadTodayData}
            title="Refresh Collections"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Business Selector Pill Switcher */}
        <BusinessPills
          selected={selectedBusiness}
          onChange={setSelectedBusiness}
          totals={totals}
        />

        {/* Live Summary Cards */}
        <SummaryCards
          cashTotal={cashTotal}
          phonePeTotal={phonePeTotal}
          grandTotal={grandTotal}
          entryCount={filteredEntries.length}
        />

        {/* Today's Entries Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Today's Collections ({filteredEntries.length})
            </h3>
            {selectedBusiness !== 'ALL' && (
              <span className="text-xs text-emerald-400 font-medium">
                Filtering: {selectedBusiness}
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm animate-pulse">
              Loading today's collections...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center bg-slate-900/30">
              <p className="text-sm text-slate-400">{t('noEntriesToday')}</p>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300"
              >
                <Plus className="w-4 h-4" /> Add the first collection now
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredEntries.map((entry) => {
                const isSplit = entry.cash_amount > 0 && entry.phonepe_amount > 0;
                const isPhonePeOnly = entry.cash_amount === 0 && entry.phonepe_amount > 0;
                const isCashOnly = entry.cash_amount > 0 && entry.phonepe_amount === 0;

                return (
                  <div
                    key={entry.id}
                    className="relative rounded-2xl bg-slate-900/90 border border-slate-800/80 p-4 shadow-glass hover:border-slate-700 transition-all flex flex-col gap-2"
                  >
                    {/* Top Row: Business Badge, Time, and Status */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase ${
                            entry.business_name === 'STAR'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {entry.business_name}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {formatAppTime(entry.created_at)}
                        </span>
                      </div>

                      {/* Payment Mode Tag */}
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          isSplit
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            : isPhonePeOnly
                            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {isSplit ? 'Split' : isPhonePeOnly ? 'PhonePe' : 'Cash'}
                      </span>
                    </div>

                    {/* Middle Row: Dealer Name & Total */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-extrabold text-white tracking-tight">
                          {entry.dealer_name}
                        </h4>
                        {entry.note && (
                          <p className="text-xs text-slate-400 italic mt-0.5">
                            "{entry.note}"
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-lg font-black text-white">
                          {formatINR(entry.total_collected)}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Details Row: Cash/PhonePe Split, Balance Owed, Slip thumbnail */}
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-3">
                        {entry.cash_amount > 0 && (
                          <span>
                            Cash: <strong className="text-emerald-400 font-mono">{formatINR(entry.cash_amount)}</strong>
                          </span>
                        )}
                        {entry.phonepe_amount > 0 && (
                          <span>
                            PhonePe: <strong className="text-purple-400 font-mono">{formatINR(entry.phonepe_amount)}</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {entry.balance_owed !== null && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-mono">
                            Bal: {formatINR(entry.balance_owed)}
                          </span>
                        )}

                        {entry.image_url && (
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(entry.image_url)}
                            className="p-1 rounded-md bg-slate-800 text-emerald-400 hover:text-white"
                            title="View Slip Photo"
                          >
                            <Image className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* FIXED BOTTOM ACTION BAR - Big Touch Target (56px) for One-Handed Operation */}
      <div className="fixed bottom-0 inset-x-0 z-30 p-4 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            disabled={!sheetId}
            className="w-full min-h-[56px] flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-slate-950 text-base font-black shadow-glow-brand hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
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

      {/* Image Preview Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-lg w-full max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800"
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>
            <img
              src={previewImageUrl}
              alt="Slip"
              className="rounded-2xl max-h-[85vh] object-contain border border-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
};
