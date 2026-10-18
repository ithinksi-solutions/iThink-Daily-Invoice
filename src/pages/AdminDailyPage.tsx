import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import { Entry, Profile, BusinessName } from '../types/database';
import { Header } from '../components/Header';
import { BusinessPills, BusinessFilter } from '../components/BusinessPills';
import { SummaryCards } from '../components/SummaryCard';
import { formatAppDate, formatAppTime, formatINR, getCurrentISTDateString, toISODateString } from '../lib/formatters';
import * as XLSX from 'xlsx';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Filter,
  Edit2,
  Trash2,
  Image,
  RefreshCw,
  Plus,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';

interface AdminDailyPageProps {
  onNavigateTab: (tab: 'daily' | 'dashboard' | 'users') => void;
  initialDate?: string;
}

export const AdminDailyPage: React.FC<AdminDailyPageProps> = ({ onNavigateTab, initialDate }) => {
  const { t } = useLanguage();

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getCurrentISTDateString());
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessFilter>('ALL');

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterOperator, setFilterOperator] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<string>('ALL');

  // Data state
  const [entries, setEntries] = useState<Entry[]>([]);
  const [operators, setOperators] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editReason, setEditReason] = useState<string>('');
  const [editCash, setEditCash] = useState<string>('');
  const [editPhonePe, setEditPhonePe] = useState<string>('');
  const [editBalOwed, setEditBalOwed] = useState<string>('');
  const [editDealer, setEditDealer] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [editBusiness, setEditBusiness] = useState<BusinessName>('STAR');

  const [deletingEntry, setDeletingEntry] = useState<Entry | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Fetch operators list for filtering
  useEffect(() => {
    async function fetchOperators() {
      const { data } = await supabase.from('profiles').select('*').order('full_name');
      if (data) setOperators(data as Profile[]);
    }
    fetchOperators();
  }, []);

  // Fetch entries for the selected date
  const loadDailyEntries = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get sheets for the selected date
      const { data: sheets, error: sheetsErr } = await supabase
        .from('daily_sheets')
        .select('id, collector_id')
        .eq('sheet_date', selectedDate);

      if (sheetsErr) {
        console.error('Error fetching sheets:', sheetsErr);
        setEntries([]);
        setLoading(false);
        return;
      }

      if (!sheets || sheets.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const sheetIds = sheets.map((s) => s.id);

      // 2. Fetch non-deleted entries under these sheets
      const { data: entriesData, error: entriesErr } = await supabase
        .from('entries')
        .select('*')
        .in('sheet_id', sheetIds)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (entriesErr) {
        console.error('Error fetching entries:', entriesErr);
        setEntries([]);
      } else {
        setEntries((entriesData as Entry[]) || []);
      }
    } catch (err) {
      console.error('Load daily entries failed:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadDailyEntries();
  }, [loadDailyEntries]);

  // Date Navigation Helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(toISODateString(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(toISODateString(d));
  };

  const handleToday = () => {
    setSelectedDate(getCurrentISTDateString());
  };

  // Filter application
  const filteredEntries = entries.filter((e) => {
    // 1. Business
    if (selectedBusiness !== 'ALL' && e.business_name !== selectedBusiness) return false;

    // 2. Operator
    if (filterOperator !== 'ALL' && e.collector_id !== filterOperator) return false;

    // 3. Dealer Search
    if (searchQuery.trim() && !e.dealer_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // 4. Payment Mode
    if (filterMode === 'CASH_ONLY' && (e.cash_amount === 0 || e.phonepe_amount > 0)) return false;
    if (filterMode === 'PHONEPE_ONLY' && (e.phonepe_amount === 0 || e.cash_amount > 0)) return false;
    if (filterMode === 'SPLIT' && (e.cash_amount === 0 || e.phonepe_amount === 0)) return false;

    return true;
  });

  // Calculate Subtotals & Grand Totals
  const totals = {
    ALL: entries.reduce((acc, curr) => acc + (curr.total_collected || 0), 0),
    STAR: entries
      .filter((e) => e.business_name === 'STAR')
      .reduce((acc, curr) => acc + (curr.total_collected || 0), 0),
    'ARBO PLAST': entries
      .filter((e) => e.business_name === 'ARBO PLAST')
      .reduce((acc, curr) => acc + (curr.total_collected || 0), 0),
  };

  const visibleCash = filteredEntries.reduce((acc, curr) => acc + (curr.cash_amount || 0), 0);
  const visiblePhonePe = filteredEntries.reduce((acc, curr) => acc + (curr.phonepe_amount || 0), 0);
  const visibleGrand = visibleCash + visiblePhonePe;

  // Group entries by Collector / Operator
  const groupedByOperator: { [collectorId: string]: { operator: Profile | undefined; items: Entry[] } } = {};
  filteredEntries.forEach((entry) => {
    if (!groupedByOperator[entry.collector_id]) {
      const op = operators.find((o) => o.id === entry.collector_id);
      groupedByOperator[entry.collector_id] = { operator: op, items: [] };
    }
    groupedByOperator[entry.collector_id].items.push(entry);
  });

  // Edit Handlers
  const handleStartEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setEditDealer(entry.dealer_name);
    setEditCash(String(entry.cash_amount));
    setEditPhonePe(String(entry.phonepe_amount));
    setEditBalOwed(entry.balance_owed !== null ? String(entry.balance_owed) : '');
    setEditNote(entry.note || '');
    setEditBusiness(entry.business_name);
    setEditReason('');
  };

  const handleSaveEdit = async () => {
    if (!editingEntry || !editReason.trim()) {
      alert('A reason for editing is required for the audit log.');
      return;
    }

    const nCash = parseFloat(editCash) || 0;
    const nPhonePe = parseFloat(editPhonePe) || 0;
    const nBalOwed = editBalOwed.trim() ? parseFloat(editBalOwed) : null;

    if (nCash + nPhonePe <= 0) {
      alert('Total collected must be greater than zero.');
      return;
    }

    try {
      const { error } = await supabase
        .from('entries')
        .update({
          dealer_name: editDealer.trim(),
          cash_amount: nCash,
          phonepe_amount: nPhonePe,
          balance_owed: nBalOwed,
          note: editNote.trim() || null,
          business_name: editBusiness,
          note_audit: editReason.trim(), // intercepted by audit trigger
        })
        .eq('id', editingEntry.id);

      if (error) {
        alert('Update failed: ' + error.message);
      } else {
        setEditingEntry(null);
        loadDailyEntries();
      }
    } catch (err: any) {
      alert('Error updating: ' + err.message);
    }
  };

  // Soft Delete Handlers
  const handleConfirmDelete = async () => {
    if (!deletingEntry || !deleteReason.trim()) {
      alert('A reason for deletion is required for the audit log.');
      return;
    }

    try {
      const { error } = await supabase
        .from('entries')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          note: `Deleted by Admin: ${deleteReason.trim()}`,
        })
        .eq('id', deletingEntry.id);

      if (error) {
        alert('Delete failed: ' + error.message);
      } else {
        setDeletingEntry(null);
        loadDailyEntries();
      }
    } catch (err: any) {
      alert('Error deleting: ' + err.message);
    }
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredEntries.length === 0) {
      alert('No entries to export for this date.');
      return;
    }

    const rows = filteredEntries.map((e, idx) => {
      const op = operators.find((o) => o.id === e.collector_id);
      return {
        'S.No': idx + 1,
        Date: formatAppDate(selectedDate),
        Time: formatAppTime(e.created_at),
        Operator: op?.full_name || 'Operator',
        Business: e.business_name,
        'Dealer Name': e.dealer_name,
        'Cash (INR)': e.cash_amount,
        'PhonePe (INR)': e.phonepe_amount,
        'Total Collected (INR)': e.total_collected,
        'Balance Owed (INR)': e.balance_owed ?? 0,
        Note: e.note || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Collections');
    XLSX.writeFile(workbook, `Daily_Collections_${formatAppDate(selectedDate)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-32">
      <Header currentTab="daily" onTabChange={onNavigateTab} />

      <main className="max-w-7xl 2xl:max-w-[1500px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5 space-y-5">
        
        {/* Date Navigator Bar */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 shadow-glass flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t('prevDay')}</span>
            </button>

            {/* Date Input Box */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-mono font-bold text-sm outline-none cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-emerald-400 hidden sm:inline">
                ({formatAppDate(selectedDate)})
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <span className="hidden sm:inline">{t('nextDay')}</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 transition-all"
            >
              {t('today')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>{t('exportExcel')}</span>
            </button>
            <button
              type="button"
              onClick={loadDailyEntries}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Business Selector Pill Switcher */}
        <BusinessPills
          selected={selectedBusiness}
          onChange={setSelectedBusiness}
          totals={totals}
        />

        {/* Summary Cards */}
        <SummaryCards
          cashTotal={visibleCash}
          phonePeTotal={visiblePhonePe}
          grandTotal={visibleGrand}
          entryCount={filteredEntries.length}
        />

        {/* Filters & Search Row */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Dealer Search */}
          <div className="relative">
            <input
              type="text"
              placeholder={t('searchDealer')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2 pl-9 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Operator Filter */}
          <div>
            <select
              value={filterOperator}
              onChange={(e) => setFilterOperator(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="ALL">{t('allOperators')}</option>
              {operators.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode Filter */}
          <div>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="ALL">{t('allModes')}</option>
              <option value="CASH_ONLY">{t('cashOnly')}</option>
              <option value="PHONEPE_ONLY">{t('phonePeOnly')}</option>
              <option value="SPLIT">{t('splitOnly')}</option>
            </select>
          </div>
        </div>

        {/* Grouped Table by Operator */}
        <div className="space-y-6 pt-2">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm animate-pulse">
              Loading collections for {formatAppDate(selectedDate)}...
            </div>
          ) : Object.keys(groupedByOperator).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/30">
              <p className="text-sm text-slate-400">{t('noEntriesDate')}</p>
            </div>
          ) : (
            Object.entries(groupedByOperator).map(([collectorId, group]) => {
              const opCash = group.items.reduce((acc, curr) => acc + curr.cash_amount, 0);
              const opPhonePe = group.items.reduce((acc, curr) => acc + curr.phonepe_amount, 0);
              const opTotal = opCash + opPhonePe;

              return (
                <div
                  key={collectorId}
                  className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-glass"
                >
                  {/* Operator Subtotal Header Banner */}
                  <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                        {group.operator?.full_name || 'Operator'}
                      </h3>
                      <span className="text-xs text-slate-400">({group.items.length} {t('entriesCount')})</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-emerald-400">
                        Cash: <strong>{formatINR(opCash)}</strong>
                      </span>
                      <span className="text-purple-400">
                        PhonePe: <strong>{formatINR(opPhonePe)}</strong>
                      </span>
                      <span className="text-white font-bold bg-slate-950 px-2 py-1 rounded-md border border-slate-700">
                        Subtotal: {formatINR(opTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Desktop / Tablet Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Time</th>
                          <th className="py-2.5 px-3">Business</th>
                          <th className="py-2.5 px-3">Dealer Name</th>
                          <th className="py-2.5 px-3 font-mono">Cash (₹)</th>
                          <th className="py-2.5 px-3 font-mono">PhonePe (₹)</th>
                          <th className="py-2.5 px-3 font-mono">Total (₹)</th>
                          <th className="py-2.5 px-3 font-mono">Bal. Owed</th>
                          <th className="py-2.5 px-3">Slip</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {group.items.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                              {formatAppTime(entry.created_at)}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                                  entry.business_name === 'STAR'
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                }`}
                              >
                                {entry.business_name}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-white max-w-[200px] truncate">
                              <div>{entry.dealer_name}</div>
                              {entry.note && (
                                <div className="text-[11px] text-slate-400 italic font-normal truncate">
                                  {entry.note}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-emerald-400 whitespace-nowrap font-bold">
                              {entry.cash_amount > 0 ? formatINR(entry.cash_amount) : '-'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-purple-400 whitespace-nowrap font-bold">
                              {entry.phonepe_amount > 0 ? formatINR(entry.phonepe_amount) : '-'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-white font-extrabold whitespace-nowrap">
                              {formatINR(entry.total_collected)}
                            </td>
                            <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                              {entry.balance_owed !== null ? (
                                <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[11px]">
                                  {formatINR(entry.balance_owed)}
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {entry.image_url ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImageUrl(entry.image_url)}
                                  className="p-1 rounded bg-slate-800 text-emerald-400 hover:text-white"
                                  title="View Slip"
                                >
                                  <Image className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(entry)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                                  title="Edit Entry"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingEntry(entry)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                  title="Soft Delete Entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* FIXED BOTTOM GRAND TOTAL BAR */}
      <div className="fixed bottom-0 inset-x-0 z-30 p-3 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 shadow-2xl">
        <div className="max-w-7xl 2xl:max-w-[1500px] mx-auto flex flex-wrap items-center justify-between gap-3 px-4 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Grand Total ({filteredEntries.length} {t('entriesCount')}):
            </span>
          </div>

          <div className="flex items-center gap-4 font-mono text-sm sm:text-base font-bold">
            <span className="text-emerald-400">
              Cash: <strong>{formatINR(visibleCash)}</strong>
            </span>
            <span className="text-purple-400">
              PhonePe: <strong>{formatINR(visiblePhonePe)}</strong>
            </span>
            <span className="text-white text-base sm:text-lg font-black bg-gradient-to-r from-emerald-400 via-teal-300 to-white bg-clip-text text-transparent">
              Grand: {formatINR(visibleGrand)}
            </span>
          </div>
        </div>
      </div>

      {/* EDIT ENTRY MODAL */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-white">Edit Collection Entry</h3>
                <p className="text-xs text-slate-400">Will be logged in immutable audit trail</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="text-slate-400 hover:text-white"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase">Dealer Name</label>
                <input
                  type="text"
                  value={editDealer}
                  onChange={(e) => setEditDealer(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-emerald-400 uppercase">Cash (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editCash}
                    onChange={(e) => setEditCash(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-purple-400 uppercase">PhonePe (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editPhonePe}
                    onChange={(e) => setEditPhonePe(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase">Balance Owed (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={editBalOwed}
                  onChange={(e) => setEditBalOwed(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Reason for Edit * (Required for Audit Log)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Corrected typo in dealer cash amount"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/50 rounded-xl text-white text-sm focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editReason.trim()}
                className="flex-1 py-3 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-glow-brand hover:brightness-110 disabled:opacity-50"
              >
                Save & Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOFT DELETE CONFIRMATION MODAL */}
      {deletingEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-lg text-white">{t('confirmDelete')}</h3>
            </div>

            <p className="text-xs text-slate-400">
              {t('deleteWarning')}
            </p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div>Dealer: <strong className="text-white">{deletingEntry.dealer_name}</strong></div>
              <div>Amount: <strong className="text-emerald-400 font-mono">{formatINR(deletingEntry.total_collected)}</strong></div>
            </div>

            <div>
              <label className="text-xs font-semibold text-rose-400 uppercase tracking-wider block mb-1">
                {t('reasonForDelete')} *
              </label>
              <input
                type="text"
                placeholder="e.g. Duplicate entry made by mistake"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-rose-500/50 rounded-xl text-white text-sm focus:border-rose-400"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={!deleteReason.trim()}
                className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-extrabold text-xs shadow-lg hover:bg-rose-500 disabled:opacity-50"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slip Image Fullscreen Modal */}
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
