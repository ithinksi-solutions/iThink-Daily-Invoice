import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../lib/i18n';
import { Entry, Profile, BusinessName } from '../types/database';
import { BackupModal } from '../components/BackupModal';
import { DaySlipsGalleryModal } from '../components/DaySlipsGalleryModal';
import { formatAppDate, formatAppTime, formatINR, getCurrentISTDateString } from '../lib/formatters';
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
  Image as ImageIcon,
  RefreshCw,
  FileSpreadsheet,
  Database,
  Camera,
  AlertCircle,
  X,
  ExternalLink,
  ZoomIn,
  LogOut,
  BarChart3,
  Users,
  Shield,
  Clock,
  Building2,
  Check
} from 'lucide-react';

interface AdminDailyPageProps {
  onNavigateTab: (tab: 'daily' | 'dashboard' | 'users') => void;
  initialDate?: string;
}

export const AdminDailyPage: React.FC<AdminDailyPageProps> = ({ onNavigateTab, initialDate }) => {
  const { user, profile, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getCurrentISTDateString());
  const [selectedBusiness, setSelectedBusiness] = useState<'ALL' | 'STAR' | 'ARBO PLAST'>('ALL');

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterOperator, setFilterOperator] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<string>('ALL');

  // Data state
  const [entries, setEntries] = useState<Entry[]>([]);
  const [operators, setOperators] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);

  // Edit modal
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editReason, setEditReason] = useState<string>('');
  const [editCash, setEditCash] = useState<string>('');
  const [editPhonePe, setEditPhonePe] = useState<string>('');
  const [editBalOwed, setEditBalOwed] = useState<string>('');
  const [editDealer, setEditDealer] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [editBusiness, setEditBusiness] = useState<BusinessName>('STAR');

  // Delete modal
  const [deletingEntry, setDeletingEntry] = useState<Entry | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');

  // Single slip image lightbox preview
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Fetch operators list
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
      const { data: sheets, error: sheetsErr } = await supabase
        .from('daily_sheets')
        .select('id, collector_id')
        .eq('sheet_date', selectedDate);

      if (sheetsErr || !sheets || sheets.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const sheetIds = sheets.map((s) => s.id);

      const { data: entriesData, error: entriesErr } = await supabase
        .from('entries')
        .select('*')
        .in('sheet_id', sheetIds)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (entriesErr) {
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

  // Date Navigator Helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(getCurrentISTDateString());
  };

  // Business Totals
  const totals = {
    ALL: entries.reduce((acc, curr) => acc + (curr.total_collected || 0), 0),
    STAR: entries
      .filter((e) => e.business_name === 'STAR')
      .reduce((acc, curr) => acc + (curr.total_collected || 0), 0),
    'ARBO PLAST': entries
      .filter((e) => e.business_name === 'ARBO PLAST')
      .reduce((acc, curr) => acc + (curr.total_collected || 0), 0),
  };

  // Filtered Entries
  const filteredEntries = entries.filter((e) => {
    if (selectedBusiness !== 'ALL' && e.business_name !== selectedBusiness) return false;
    if (searchQuery.trim() && !e.dealer_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterOperator !== 'ALL' && e.collector_id !== filterOperator) return false;
    if (filterMode === 'CASH_ONLY' && (e.cash_amount === 0 || e.phonepe_amount > 0)) return false;
    if (filterMode === 'PHONEPE_ONLY' && (e.phonepe_amount === 0 || e.cash_amount > 0)) return false;
    if (filterMode === 'SPLIT' && (e.cash_amount === 0 || e.phonepe_amount === 0)) return false;
    return true;
  });

  const visibleCash = filteredEntries.reduce((acc, curr) => acc + (curr.cash_amount || 0), 0);
  const visiblePhonePe = filteredEntries.reduce((acc, curr) => acc + (curr.phonepe_amount || 0), 0);
  const visibleGrand = visibleCash + visiblePhonePe;

  const daySlipsCount = entries.filter((e) => Boolean(e.image_url)).length;

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
          note_audit: editReason.trim(),
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

  // Delete Handlers
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

  // Export Daily Excel
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
        'Slip Photo URL': e.image_url || 'No Slip',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Collections');
    XLSX.writeFile(workbook, `Daily_Collections_${formatAppDate(selectedDate)}.xlsx`);
  };

  return (
    <div className="h-screen w-screen max-h-screen overflow-hidden bg-[#030712] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* 1. POWER BI TOP RIBBON (UNIFIED CONTROLS IN 48PX BAR) */}
      <header className="h-12 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-20">
        
        {/* Brand & Tab Navigation */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 text-xs shrink-0">
            ₹
          </div>
          <span className="text-sm font-extrabold tracking-tight text-white uppercase whitespace-nowrap truncate">
            Daily Invoice
          </span>

          {/* Power BI Segmented Page Switcher (Desktop) */}
          <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onNavigateTab('daily')}
              className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm flex items-center gap-1"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('dashboard')}
              className="px-2.5 py-1 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className="px-2.5 py-1 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Operators</span>
            </button>
          </div>
        </div>

        {/* Center: Power BI Date Navigator & Business Pills (Desktop) */}
        <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
          {/* Date Navigator */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="Previous Day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-transparent text-white font-mono font-bold text-xs px-1.5 outline-none cursor-pointer"
            />
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="Next Day"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            >
              Today
            </button>
          </div>

          {/* Business Filter Pills */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setSelectedBusiness('ALL')}
              className={`px-2 py-1 rounded ${
                selectedBusiness === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({formatINR(totals.ALL)})
            </button>
            <button
              type="button"
              onClick={() => setSelectedBusiness('STAR')}
              className={`px-2 py-1 rounded ${
                selectedBusiness === 'STAR'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              STAR ({formatINR(totals.STAR)})
            </button>
            <button
              type="button"
              onClick={() => setSelectedBusiness('ARBO PLAST')}
              className={`px-2 py-1 rounded ${
                selectedBusiness === 'ARBO PLAST'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ARBO ({formatINR(totals['ARBO PLAST'])})
            </button>
          </div>
        </div>

        {/* Right: Actions (Gallery, Backup, Export, Language, SignOut) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Day Slips Gallery Button */}
          <button
            type="button"
            onClick={() => setIsGalleryOpen(true)}
            className="px-2 sm:px-2.5 py-1 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="View All Uploaded Slips for this Date"
          >
            <Camera className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Day Slips</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-teal-400 text-slate-950">
              {daySlipsCount}
            </span>
          </button>

          {/* Direct Backup Hub Button */}
          <button
            type="button"
            onClick={() => setIsBackupOpen(true)}
            className="px-2 sm:px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Download Backup & Cloud Sync"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Backup</span>
          </button>

          {/* Export Excel (Desktop) */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="hidden lg:flex px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white border border-slate-700 text-slate-200 text-xs font-bold items-center gap-1 transition-all"
            title="Download Excel for Selected Date"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel</span>
          </button>

          {/* Refresh (Desktop) */}
          <button
            type="button"
            onClick={loadDailyEntries}
            className="hidden md:flex p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Language Toggle */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-1.5 py-0.5 text-[11px] font-bold rounded ${
                language === 'en' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('te')}
              className={`px-1.5 py-0.5 text-[11px] font-bold rounded ${
                language === 'te' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              తె
            </button>
          </div>

          {/* Sign Out */}
          <button
            type="button"
            onClick={signOut}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

      </header>

      {/* MOBILE CONTROLS & KPI BAR (md:hidden) */}
      <div className="md:hidden bg-slate-900/95 border-b border-slate-800 px-3 py-2 space-y-2 shrink-0 z-10">
        
        {/* Row 1: Date Navigator + Refresh */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 flex-1">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="Previous Day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-transparent text-white font-mono font-bold text-xs px-1.5 outline-none cursor-pointer flex-1 text-center"
            />
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="Next Day"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            >
              Today
            </button>
          </div>

          <button
            type="button"
            onClick={loadDailyEntries}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Row 2: Business Segment Switcher */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setSelectedBusiness('ALL')}
            className={`flex-1 py-1 rounded transition-all text-center ${
              selectedBusiness === 'ALL'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400'
            }`}
          >
            All ({formatINR(totals.ALL)})
          </button>
          <button
            type="button"
            onClick={() => setSelectedBusiness('STAR')}
            className={`flex-1 py-1 rounded transition-all text-center ${
              selectedBusiness === 'STAR'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400'
            }`}
          >
            STAR ({formatINR(totals.STAR)})
          </button>
          <button
            type="button"
            onClick={() => setSelectedBusiness('ARBO PLAST')}
            className={`flex-1 py-1 rounded transition-all text-center ${
              selectedBusiness === 'ARBO PLAST'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400'
            }`}
          >
            ARBO ({formatINR(totals['ARBO PLAST'])})
          </button>
        </div>

        {/* Row 3: Micro KPI Scorecards Strip */}
        <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
          <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="block text-[9px] font-sans font-bold uppercase text-slate-400">Cash</span>
            <span className="text-xs font-black text-emerald-400">{formatINR(visibleCash)}</span>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="block text-[9px] font-sans font-bold uppercase text-slate-400">PhonePe</span>
            <span className="text-xs font-black text-purple-400">{formatINR(visiblePhonePe)}</span>
          </div>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
            <span className="block text-[9px] font-sans font-bold uppercase text-emerald-300">Grand Total</span>
            <span className="text-xs font-black text-emerald-400">{formatINR(visibleGrand)}</span>
          </div>
        </div>

        {/* Row 4: Quick Search & Operator Filter */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search dealer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1 pl-6 bg-slate-950 border border-slate-800 rounded-md text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
          </div>

          <select
            value={filterOperator}
            onChange={(e) => setFilterOperator(e.target.value)}
            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-[11px] text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Operators</option>
            {operators.map((op) => (
              <option key={op.id} value={op.id}>
                {op.full_name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* 2. POWER BI COMPACT KPI STRIP & INLINE FILTERS (HEIGHT 42PX - Desktop only) */}
      <div className="hidden md:flex h-10 bg-slate-900/90 border-b border-slate-800 px-3 sm:px-4 items-center justify-between gap-3 shrink-0 text-xs z-10">
        
        {/* KPI Scorecards Strip */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Cash:</span>
            <span className="font-mono font-black text-emerald-400 text-xs">
              {formatINR(visibleCash)}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 uppercase text-[10px] font-bold">PhonePe:</span>
            <span className="font-mono font-black text-purple-400 text-xs">
              {formatINR(visiblePhonePe)}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-emerald-300 uppercase text-[10px] font-bold">Grand Total:</span>
            <span className="font-mono font-black text-emerald-400 text-xs">
              {formatINR(visibleGrand)}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          <span className="font-mono text-slate-400 text-[11px]">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {/* In-Line Power BI Filter Dropdowns */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Dealer Quick Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter dealer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-32 sm:w-44 px-2 py-1 pl-6 bg-slate-950 border border-slate-800 rounded-md text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
          </div>

          {/* Operator Dropdown */}
          <select
            value={filterOperator}
            onChange={(e) => setFilterOperator(e.target.value)}
            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-[11px] text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Operators</option>
            {operators.map((op) => (
              <option key={op.id} value={op.id}>
                {op.full_name}
              </option>
            ))}
          </select>

          {/* Mode Dropdown */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-[11px] text-white focus:outline-none focus:border-emerald-500 hidden sm:inline-block"
          >
            <option value="ALL">All Modes</option>
            <option value="CASH_ONLY">Cash Only</option>
            <option value="PHONEPE_ONLY">PhonePe Only</option>
            <option value="SPLIT">Split Only</option>
          </select>
        </div>

      </div>

      {/* 3. POWER BI DATA CANVAS (REMAINDER VIEWPORT HEIGHT - STRICT INTERNAL SCROLL) */}
      <main className="flex-1 overflow-y-auto w-full px-2 sm:px-4 py-2 relative">
        
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs animate-pulse">
            Loading collection records for {formatAppDate(selectedDate)}...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
            <Calendar className="w-10 h-10 text-slate-600 mb-2" />
            <h4 className="text-sm font-bold text-slate-300">No Collections Recorded</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              No entries found for {formatAppDate(selectedDate)} under current filters.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Power BI Data Grid) */}
            <div className="hidden md:block border border-slate-800 rounded-xl overflow-hidden shadow-2xl bg-slate-900/80">
            <table className="w-full text-left border-collapse text-xs">
              
              {/* Sticky Table Header */}
              <thead className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Operator</th>
                  <th className="py-2.5 px-3">Business</th>
                  <th className="py-2.5 px-3">Dealer Name</th>
                  <th className="py-2.5 px-3 text-right">Cash (₹)</th>
                  <th className="py-2.5 px-3 text-right">PhonePe (₹)</th>
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                  <th className="py-2.5 px-3 text-right">Bal Owed</th>
                  <th className="py-2.5 px-3 text-center">Slip Photo</th>
                  <th className="py-2.5 px-3">Note</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-800/80 font-medium">
                {filteredEntries.map((e, idx) => {
                  const op = operators.find((o) => o.id === e.collector_id);
                  return (
                    <tr
                      key={e.id}
                      className={`hover:bg-slate-800/60 transition-colors ${
                        idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-950/40'
                      }`}
                    >
                      {/* Time */}
                      <td className="py-2 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {formatAppTime(e.created_at)}
                      </td>

                      {/* Operator */}
                      <td className="py-2 px-3 text-slate-300 font-semibold whitespace-nowrap">
                        {op?.full_name || 'Operator'}
                      </td>

                      {/* Business Tag */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            e.business_name === 'STAR'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                          }`}
                        >
                          {e.business_name}
                        </span>
                      </td>

                      {/* Dealer Name */}
                      <td className="py-2 px-3 font-bold text-white whitespace-nowrap">
                        {e.dealer_name}
                      </td>

                      {/* Cash */}
                      <td className="py-2 px-3 text-right font-mono text-emerald-400">
                        {e.cash_amount > 0 ? formatINR(e.cash_amount) : '-'}
                      </td>

                      {/* PhonePe */}
                      <td className="py-2 px-3 text-right font-mono text-purple-400">
                        {e.phonepe_amount > 0 ? formatINR(e.phonepe_amount) : '-'}
                      </td>

                      {/* Total */}
                      <td className="py-2 px-3 text-right font-mono font-black text-white">
                        {formatINR(e.total_collected)}
                      </td>

                      {/* Balance Owed */}
                      <td className="py-2 px-3 text-right font-mono text-amber-400">
                        {e.balance_owed !== null ? formatINR(e.balance_owed) : '-'}
                      </td>

                      {/* Slip Photo Column with Thumbnail */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {e.image_url ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(e.image_url)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 transition-all text-[11px]"
                            title="Click to view full slip"
                          >
                            <img
                              src={e.image_url}
                              alt="Slip"
                              className="w-5 h-5 rounded object-cover border border-slate-700"
                            />
                            <span>View</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 font-mono">-</span>
                        )}
                      </td>

                      {/* Note */}
                      <td className="py-2 px-3 text-slate-400 truncate max-w-[140px]" title={e.note || ''}>
                        {e.note || '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(e)}
                            className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                            title="Edit Record (Audit Logged)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingEntry(e);
                              setDeleteReason('');
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                            title="Soft Delete (Audit Logged)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>

            {/* Mobile Card List View for Admin (Touch-Optimized) */}
            <div className="md:hidden space-y-2 pb-6">
              {filteredEntries.map((e) => {
                const op = operators.find((o) => o.id === e.collector_id);
                return (
                  <div
                    key={e.id}
                    className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            e.business_name === 'STAR'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                          }`}
                        >
                          {e.business_name}
                        </span>
                        <span className="text-slate-400 font-semibold">{op?.full_name || 'Operator'}</span>
                        <span className="text-slate-500 font-mono text-[11px]">{formatAppTime(e.created_at)}</span>
                      </div>
                      <span className="font-mono text-base font-black text-white">
                        {formatINR(e.total_collected)}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="text-sm font-bold text-white tracking-tight">{e.dealer_name}</h4>
                      {e.balance_owed !== null && (
                        <span className="text-[11px] font-mono text-amber-400">
                          Bal: {formatINR(e.balance_owed)}
                        </span>
                      )}
                    </div>

                    {e.note && <p className="text-[11px] text-slate-400 italic">"{e.note}"</p>}

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        {e.cash_amount > 0 && <span className="text-emerald-400">Cash: {formatINR(e.cash_amount)}</span>}
                        {e.phonepe_amount > 0 && <span className="text-purple-400">PhonePe: {formatINR(e.phonepe_amount)}</span>}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {e.image_url && (
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(e.image_url)}
                            className="p-1 px-2 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 text-[11px] font-bold flex items-center gap-1"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>Slip</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(e)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-emerald-400"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingEntry(e);
                            setDeleteReason('');
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </main>

      {/* 4. POWER BI COMPACT STATUS BAR (HEIGHT 28PX - Desktop only) */}
      <footer className="hidden md:flex h-7 bg-slate-950 border-t border-slate-800/80 px-3 sm:px-4 items-center justify-between text-[11px] text-slate-400 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span>Date: <strong className="text-white font-mono">{formatAppDate(selectedDate)}</strong></span>
          <span className="text-slate-700">•</span>
          <span>Showing: <strong className="text-emerald-400 font-mono">{filteredEntries.length}</strong> collections</span>
        </div>
        <div className="flex items-center gap-4 font-mono font-bold text-xs">
          <span>Cash: <strong className="text-emerald-400">{formatINR(visibleCash)}</strong></span>
          <span>PhonePe: <strong className="text-purple-400">{formatINR(visiblePhonePe)}</strong></span>
          <span>Total: <strong className="text-white">{formatINR(visibleGrand)}</strong></span>
        </div>
      </footer>

      {/* 5. MOBILE BOTTOM NAVIGATION (52PX - Mobile only) */}
      <nav className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-md px-3 py-1.5 flex items-center justify-around shrink-0 z-30">
        <button
          type="button"
          onClick={() => onNavigateTab('daily')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 transition-all shadow-sm cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>Daily</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('dashboard')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <span>Analytics</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('users')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <Users className="w-4 h-4 text-slate-400" />
          <span>Operators</span>
        </button>
      </nav>

      {/* BACKUP & CLOUD SYNC HUB MODAL */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
      />

      {/* DAY SLIPS GALLERY MODAL */}
      <DaySlipsGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        selectedDate={selectedDate}
        entries={entries}
        operators={operators}
      />

      {/* SINGLE IMAGE LIGHTBOX MODAL */}
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
              alt="Bill Slip"
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain border border-slate-800 shadow-2xl"
            />
            <div className="mt-3 flex items-center gap-3">
              <a
                href={previewImageUrl}
                target="_blank"
                rel="noreferrer"
                download={`Slip_${selectedDate}.jpg`}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:brightness-110"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download High-Res Slip</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Edit Collection Entry (Audited)</h3>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Business</label>
                <select
                  value={editBusiness}
                  onChange={(e) => setEditBusiness(e.target.value as BusinessName)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold"
                >
                  <option value="STAR">STAR</option>
                  <option value="ARBO PLAST">ARBO PLAST</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Dealer Name</label>
                <input
                  type="text"
                  value={editDealer}
                  onChange={(e) => setEditDealer(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-emerald-400 mb-1">Cash (₹)</label>
                <input
                  type="number"
                  value={editCash}
                  onChange={(e) => setEditCash(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-purple-400 mb-1">PhonePe (₹)</label>
                <input
                  type="number"
                  value={editPhonePe}
                  onChange={(e) => setEditPhonePe(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-amber-400 mb-1">Balance Owed (₹)</label>
                <input
                  type="number"
                  value={editBalOwed}
                  onChange={(e) => setEditBalOwed(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Note</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-rose-400 text-xs font-bold mb-1">
                Reason for Edit * (Required for Audit Trail)
              </label>
              <input
                type="text"
                placeholder="e.g. Corrected typo in dealer name / cash amount"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-rose-500/50 rounded-lg text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 text-xs text-slate-950 font-bold"
              >
                Save & Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/40 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Confirm Soft Deletion</span>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to delete collection from{' '}
              <strong className="text-white">{deletingEntry.dealer_name}</strong> for{' '}
              <strong className="text-emerald-400 font-mono">
                {formatINR(deletingEntry.total_collected)}
              </strong>
              ? This action will be recorded in the audit log.
            </p>

            <div>
              <label className="block text-rose-400 text-xs font-bold mb-1">
                Reason for Deletion * (Required)
              </label>
              <input
                type="text"
                placeholder="e.g. Duplicate entry made by operator"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-rose-500/50 rounded-lg text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-500 text-xs text-white font-bold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDailyPage;
