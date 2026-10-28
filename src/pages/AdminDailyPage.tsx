import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../lib/i18n';
import { Entry, Profile, BusinessName } from '../types/database';
import { BackupModal } from '../components/BackupModal';
import { DaySlipsGalleryModal } from '../components/DaySlipsGalleryModal';
import { AdminSlipDigitizerModal } from '../components/AdminSlipDigitizerModal';
import { AdminAddEntryModal } from '../components/AdminAddEntryModal';
import { AdminRangeDeleteModal } from '../components/AdminRangeDeleteModal';
import { CashBadge, UpiBadge } from '../components/PaymentLogos';
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
  Check,
  Sparkles,
  Plus,
  CheckCircle2,
  Receipt,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  RotateCw,
  RotateCcw,
  ZoomOut,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ArrowLeft,
  CalendarX,
  Wrench,
} from 'lucide-react';

export type SortField = 'created_at' | 'collector' | 'business_name' | 'dealer_name' | 'cash_amount' | 'phonepe_amount' | 'total_collected' | 'balance_owed';
export type SortOrder = 'asc' | 'desc';

interface AdminDailyPageProps {
  onNavigateTab: (tab: 'daily' | 'dashboard' | 'tools' | 'users' | 'tasks') => void;
  initialDate?: string;
  isDrilldown?: boolean;
  onClearDrilldown?: () => void;
}

export const AdminDailyPage: React.FC<AdminDailyPageProps> = ({
  onNavigateTab,
  initialDate,
  isDrilldown,
  onClearDrilldown,
}) => {
  const { user, profile, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getCurrentISTDateString());
  const [selectedBusiness, setSelectedBusiness] = useState<'ALL' | 'STAR' | 'ARBO PLAST'>('ALL');

  // Interactive Sorting State
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterOperator, setFilterOperator] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'approved' | 'submitted'>('ALL');

  // Data state
  const [entries, setEntries] = useState<Entry[]>([]);
  const [operators, setOperators] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileVisibleCount, setMobileVisibleCount] = useState<number>(30);

  // Modals state
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);
  const [isRangeDeleteOpen, setIsRangeDeleteOpen] = useState<boolean>(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [isDigitizerOpen, setIsDigitizerOpen] = useState<boolean>(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState<boolean>(false);

  // Sync initialDate on incoming drilldown navigation
  useEffect(() => {
    if (initialDate && initialDate !== selectedDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // Toggle Column Sort
  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'created_at' ? 'desc' : 'asc');
    }
  };

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Single slip image lightbox preview & inspection suite
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewEntry, setPreviewEntry] = useState<Entry | null>(null);
  const [previewRotation, setPreviewRotation] = useState<number>(0);
  const [previewZoom, setPreviewZoom] = useState<number>(1);

  // Operational Yesterday Comparison
  const [yesterdayTotal, setYesterdayTotal] = useState<number | null>(null);

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

  // Operational comparison: fetch previous day total
  useEffect(() => {
    async function fetchYesterdayTotal() {
      try {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        const yDateStr = d.toISOString().split('T')[0];

        const { data: ySheets } = await supabase
          .from('daily_sheets')
          .select('id')
          .eq('sheet_date', yDateStr);

        if (!ySheets || ySheets.length === 0) {
          setYesterdayTotal(null);
          return;
        }

        const yIds = ySheets.map((s) => s.id);
        const { data: yEntries } = await supabase
          .from('entries')
          .select('total_collected')
          .in('sheet_id', yIds)
          .eq('is_deleted', false);

        if (yEntries && yEntries.length > 0) {
          const sum = yEntries.reduce((acc, row) => acc + Number(row.total_collected || 0), 0);
          setYesterdayTotal(sum);
        } else {
          setYesterdayTotal(null);
        }
      } catch (err) {
        console.error('Fetch yesterday total failed:', err);
        setYesterdayTotal(null);
      }
    }
    fetchYesterdayTotal();
  }, [selectedDate]);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
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
    if (filterStatus !== 'ALL' && e.status !== filterStatus) return false;
    return true;
  });

  // Sorted Entries (multi-column interactive sorting)
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    let valA: any = a[sortField as keyof Entry];
    let valB: any = b[sortField as keyof Entry];

    if (sortField === 'collector') {
      const opA = operators.find((o) => o.id === a.collector_id)?.full_name || '';
      const opB = operators.find((o) => o.id === b.collector_id)?.full_name || '';
      valA = opA.toLowerCase();
      valB = opB.toLowerCase();
    } else if (sortField === 'total_collected') {
      valA = (Number(a.cash_amount) || 0) + (Number(a.phonepe_amount) || 0);
      valB = (Number(b.cash_amount) || 0) + (Number(b.phonepe_amount) || 0);
    } else if (sortField === 'cash_amount' || sortField === 'phonepe_amount' || sortField === 'balance_owed') {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    } else if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = (valB || '').toLowerCase();
    }

    if (valA === null || valA === undefined) valA = 0;
    if (valB === null || valB === undefined) valB = 0;

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const visibleCash = filteredEntries.reduce((acc, curr) => acc + (curr.cash_amount || 0), 0);
  const visiblePhonePe = filteredEntries.reduce((acc, curr) => acc + (curr.phonepe_amount || 0), 0);
  const visibleGrand = visibleCash + visiblePhonePe;
  const visibleBalOwed = filteredEntries.reduce((acc, curr) => acc + (curr.balance_owed || 0), 0);
  const daySlipsCount = entries.filter((e) => Boolean(e.image_url)).length;

  const cashCount = filteredEntries.filter((e) => e.cash_amount > 0).length;
  const phonePeCount = filteredEntries.filter((e) => e.phonepe_amount > 0).length;

  // Status Metrics (Money Received vs Pending Handover)
  const pendingEntries = entries.filter((e) => e.status === 'submitted');
  const approvedEntries = entries.filter((e) => e.status === 'approved');
  const pendingTotal = pendingEntries.reduce((acc, curr) => acc + (curr.total_collected || 0), 0);
  const approvedTotal = approvedEntries.reduce((acc, curr) => acc + (curr.total_collected || 0), 0);

  const visiblePendingEntries = filteredEntries.filter((e) => e.status === 'submitted');
  const visibleApprovedEntries = filteredEntries.filter((e) => e.status === 'approved');
  const visiblePendingTotal = visiblePendingEntries.reduce((acc, curr) => acc + (curr.total_collected || 0), 0);
  const visibleApprovedTotal = visibleApprovedEntries.reduce((acc, curr) => acc + (curr.total_collected || 0), 0);

  // Approval / Money Received Action Handlers
  const handleToggleApproval = async (entry: Entry) => {
    const nextStatus: 'approved' | 'submitted' = entry.status === 'approved' ? 'submitted' : 'approved';

    // Optimistic local state update
    setEntries((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, status: nextStatus } : item))
    );

    try {
      const { error } = await supabase
        .from('entries')
        .update({
          status: nextStatus,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entry.id);

      if (error) {
        console.error('Failed to toggle approval status:', error);
        // Rollback
        setEntries((prev) =>
          prev.map((item) => (item.id === entry.id ? { ...item, status: entry.status } : item))
        );
        alert('Failed to update status: ' + error.message);
      } else {
        showToast(
          nextStatus === 'approved'
            ? `✓ Money Received: ${entry.dealer_name} (${formatINR(entry.total_collected)})`
            : `Marked ${entry.dealer_name} as Pending Handover.`
        );
      }
    } catch (err: any) {
      console.error('Toggle status error:', err);
      setEntries((prev) =>
        prev.map((item) => (item.id === entry.id ? { ...item, status: entry.status } : item))
      );
      alert('Error updating status: ' + err.message);
    }
  };

  const handleApproveAllPending = async () => {
    const targets = filteredEntries.filter((e) => e.status === 'submitted');
    if (targets.length === 0) {
      showToast('No pending entries to approve.');
      return;
    }

    const targetIds = targets.map((e) => e.id);
    const sumTotal = targets.reduce((acc, curr) => acc + (curr.total_collected || 0), 0);

    // Optimistic local state update
    setEntries((prev) =>
      prev.map((item) => (targetIds.includes(item.id) ? { ...item, status: 'approved' } : item))
    );

    try {
      const { error } = await supabase
        .from('entries')
        .update({
          status: 'approved',
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .in('id', targetIds);

      if (error) {
        console.error('Bulk approve failed:', error);
        loadDailyEntries();
        alert('Failed to approve entries: ' + error.message);
      } else {
        showToast(`✓ Approved ${targets.length} pending collections (${formatINR(sumTotal)})!`);
      }
    } catch (err: any) {
      console.error('Bulk approve error:', err);
      loadDailyEntries();
      alert('Error approving entries: ' + err.message);
    }
  };

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
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingEntry.id);

      if (error) {
        alert('Update failed: ' + error.message);
      } else {
        setEditingEntry(null);
        showToast(`Updated entry for ${editDealer.trim()}`);
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
        showToast('Entry deleted successfully (audit logged).');
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
    <div className="h-[100dvh] w-full min-h-[100dvh] overflow-hidden bg-[#030712] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-14 right-4 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span className="text-xs">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-emerald-600/30 rounded-lg text-slate-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. POWER BI TOP RIBBON (UNIFIED CONTROLS IN 48PX BAR + SAFE AREA) */}
      <header className="min-h-[48px] safe-pt border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-20">
        
        {/* Brand & Tab Navigation */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 text-xs shrink-0 shadow-sm shadow-emerald-500/10">
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
              onClick={() => onNavigateTab('tools')}
              className="px-2.5 py-1 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Tools</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className="px-2.5 py-1 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Operators</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('tasks')}
              className="px-2.5 py-1 text-xs font-bold rounded-md bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 text-cyan-300 hover:text-white border border-indigo-500/30 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
              title="Launch TaskMatrix OS Enterprise Checklist Terminal"
            >
              <span className="text-cyan-400">⚡</span>
              <span>TaskMatrix</span>
            </button>
          </div>
        </div>

        {/* Center: Power BI Date Navigator & Business Pills (Desktop) */}
        <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
          {/* Date Navigator */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-sm">
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

          {/* Business Filter Pills (Visible on large displays 2xl to prevent header overflow) */}
          <div className="hidden 2xl:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-bold shadow-sm">
            <button
              type="button"
              onClick={() => setSelectedBusiness('ALL')}
              className={`px-2 py-1 rounded transition-all ${
                selectedBusiness === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({formatINR(totals.ALL)})
            </button>
            <button
              type="button"
              onClick={() => setSelectedBusiness('STAR')}
              className={`px-2 py-1 rounded transition-all ${
                selectedBusiness === 'STAR'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              STAR ({formatINR(totals.STAR)})
            </button>
            <button
              type="button"
              onClick={() => setSelectedBusiness('ARBO PLAST')}
              className={`px-2 py-1 rounded transition-all ${
                selectedBusiness === 'ARBO PLAST'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ARBO ({formatINR(totals['ARBO PLAST'])})
            </button>
          </div>
        </div>

        {/* Right: Actions (HITL Digitizer, Direct Add, Gallery, Backup, Export, Language, SignOut) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* AI SLIP DIGITIZER (HITL) BUTTON */}
          <button
            type="button"
            onClick={() => setIsDigitizerOpen(true)}
            className="px-2.5 sm:px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            title="Upload physical handwritten slip, extract entries, and verify with Human-In-The-Loop review"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline">{t('digitizeSlip')}</span>
            <span className="xl:hidden">Slip</span>
          </button>

          {/* Direct Manual Entry Button (Desktop) */}
          <button
            type="button"
            onClick={() => setIsAddEntryOpen(true)}
            className="hidden xl:flex px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold items-center gap-1.5 transition-all shadow-sm"
            title="Record a single urgent collection directly as Admin"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Entry</span>
          </button>

          {/* Day Slips Gallery Button */}
          <button
            type="button"
            onClick={() => setIsGalleryOpen(true)}
            className="px-2 sm:px-2.5 py-1 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="View All Uploaded Slips for this Date"
          >
            <Camera className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="hidden 2xl:inline">{t('daySlips')}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-teal-400 text-slate-950">
              {daySlipsCount}
            </span>
          </button>

          {/* Direct Backup Hub Button (Available in Tools tab, visible on 2xl) */}
          <button
            type="button"
            onClick={() => setIsBackupOpen(true)}
            className="hidden 2xl:flex px-2 sm:px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 text-xs font-bold items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Download Backup & Cloud Sync (Also in Tools tab)"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('backup')}</span>
          </button>

          {/* Custom Date Range Purge Button (Available in Tools tab, visible on 2xl) */}
          <button
            type="button"
            onClick={() => setIsRangeDeleteOpen(true)}
            className="hidden 2xl:flex px-2 sm:px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-xs font-bold items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Purge / Delete Records by Date Range (Also in Tools tab)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Purge Range</span>
          </button>

          {/* Export Excel (Desktop - Visible on 2xl) */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="hidden 2xl:flex px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white border border-slate-700 text-slate-200 text-xs font-bold items-center gap-1 transition-all"
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
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-1.5 py-0.5 text-[11px] font-bold rounded ${
                language === 'en' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('te')}
              className={`px-1.5 py-0.5 text-[11px] font-bold rounded ${
                language === 'te' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400'
              }`}
            >
              తె
            </button>
          </div>

          {/* Sign Out (Clearly Visible Red Pill with Label) */}
          <button
            type="button"
            onClick={signOut}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
            title="Sign Out / Log Out"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Logout</span>
          </button>
        </div>

      </header>

      {/* ANALYTICS DRILL-THROUGH BANNER */}
      {isDrilldown && (
        <div className="bg-gradient-to-r from-purple-950/90 via-slate-900 to-slate-950 border-b border-purple-500/40 px-3 sm:px-4 py-2 flex items-center justify-between gap-3 text-xs shrink-0 z-20 shadow-md">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/25 text-purple-300 border border-purple-500/40 shrink-0">
              Analytics Drill-Through
            </span>
            <span className="text-slate-300 truncate text-[11px] sm:text-xs">
              Inspecting ledger for <strong className="text-white font-mono">{selectedDate}</strong> ({filteredEntries.length} collections • {formatINR(visibleGrand)})
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onClearDrilldown) onClearDrilldown();
              onNavigateTab('dashboard');
            }}
            className="px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-purple-500/20 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
            <span>Return to Analytics</span>
          </button>
        </div>
      )}

      {/* MOBILE CONTROLS & DATE NAV BAR (md:hidden) */}
      <div className="md:hidden bg-slate-900/95 border-b border-slate-800 px-3 py-2 space-y-2 shrink-0 z-10">
        
        {/* Row 1: Date Navigator + Fast Action */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 flex-1 shadow-inner">
            <button
              type="button"
              onClick={handlePrevDay}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
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
              className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            >
              Today
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddEntryOpen(true)}
            className="p-1.5 px-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1"
            title="Manual Entry"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Entry</span>
          </button>

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
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-bold shadow-inner">
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

        {/* Row 3: Quick Search & Operator Filter */}
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

          <select
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [f, o] = e.target.value.split('-') as [SortField, SortOrder];
              setSortField(f);
              setSortOrder(o);
            }}
            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-[11px] text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
            title="Sort records"
          >
            <option value="created_at-desc">Sort: Newest</option>
            <option value="created_at-asc">Sort: Oldest</option>
            <option value="dealer_name-asc">Sort: Dealer (A-Z)</option>
            <option value="dealer_name-desc">Sort: Dealer (Z-A)</option>
            <option value="total_collected-desc">Sort: High ₹</option>
            <option value="total_collected-asc">Sort: Low ₹</option>
            <option value="cash_amount-desc">Sort: Cash</option>
            <option value="phonepe_amount-desc">Sort: UPI</option>
          </select>
        </div>

        {/* Row 4: Money Received / Approval Filter & Bulk Action (Revolut Style) */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[10px] font-bold shadow-inner">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-2 py-0.5 rounded transition-all ${
                filterStatus === 'ALL'
                  ? 'bg-slate-700 text-white font-black'
                  : 'text-slate-400'
              }`}
            >
              All ({entries.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('submitted')}
              className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                filterStatus === 'submitted'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-amber-400'
              }`}
            >
              <span>Pending</span>
              <span className="font-mono">({pendingEntries.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('approved')}
              className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                filterStatus === 'approved'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-emerald-400'
              }`}
            >
              <span>Received</span>
              <span className="font-mono">({approvedEntries.length})</span>
            </button>
          </div>

          {pendingEntries.length > 0 && (
            <button
              type="button"
              onClick={handleApproveAllPending}
              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
              title="Mark All Pending as Money Received"
            >
              <Check className="w-3 h-3 stroke-[3]" />
              <span>Approve All</span>
            </button>
          )}
        </div>

      </div>

      {/* 2. POWER BI EXECUTIVE SCORECARD STRIP & INLINE FILTERS (HEIGHT 48PX - Desktop only) */}
      <div className="hidden md:flex h-12 bg-slate-900/90 border-b border-slate-800 px-3 sm:px-4 items-center justify-between gap-3 shrink-0 text-xs z-10 shadow-sm">
        
        {/* Power BI KPI Executive Tiles */}
        <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap">
          {/* Cash Scorecard */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800/80">
            <CashBadge size="xs" />
            <div>
              <span className="block text-slate-400 uppercase text-[9px] font-bold leading-none">Cash In-Hand</span>
              <span className="font-mono font-black text-emerald-400 text-xs leading-none">
                {formatINR(visibleCash)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono ml-1">({cashCount})</span>
          </div>

          {/* UPI Scorecard */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800/80">
            <UpiBadge size="xs" />
            <div>
              <span className="block text-slate-400 uppercase text-[9px] font-bold leading-none">UPI Digital</span>
              <span className="font-mono font-black text-purple-400 text-xs leading-none">
                {formatINR(visiblePhonePe)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono ml-1">({phonePeCount})</span>
          </div>

          {/* Grand Total Scorecard */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
            <div>
              <span className="block text-emerald-300 uppercase text-[9px] font-black leading-none">Net Collections</span>
              <span className="font-mono font-black text-white text-xs leading-none">
                {formatINR(visibleGrand)}
              </span>
            </div>
          </div>

          {/* Operational Comparison Chip vs Yesterday (Executive 5-Second Story) */}
          {yesterdayTotal !== null && yesterdayTotal > 0 && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold ${
                visibleGrand >= yesterdayTotal
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
              title={`Previous Day: ${formatINR(yesterdayTotal)}`}
            >
              {visibleGrand >= yesterdayTotal ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span>
                {visibleGrand >= yesterdayTotal ? '+' : ''}
                {(((visibleGrand - yesterdayTotal) / yesterdayTotal) * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 font-normal hidden lg:inline">
                vs Prev ({formatINR(yesterdayTotal)})
              </span>
            </div>
          )}

          {/* Total Balances Owed */}
          {visibleBalOwed > 0 && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <div>
                <span className="block text-amber-300 uppercase text-[9px] font-bold leading-none">Balance Owed</span>
                <span className="font-mono font-black text-amber-400 text-xs leading-none">
                  {formatINR(visibleBalOwed)}
                </span>
              </div>
            </div>
          )}

          {/* Received Scorecard */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <div>
              <span className="block text-slate-400 uppercase text-[9px] font-bold leading-none">Received</span>
              <span className="font-mono font-black text-emerald-400 text-xs leading-none">
                {formatINR(approvedTotal)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono ml-0.5">({approvedEntries.length})</span>
          </div>

          {/* Pending Handover Scorecard */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <div>
              <span className="block text-amber-300 uppercase text-[9px] font-bold leading-none">Pending Handover</span>
              <span className="font-mono font-black text-amber-400 text-xs leading-none">
                {formatINR(pendingTotal)}
              </span>
            </div>
            <span className="text-[10px] text-amber-500/80 font-mono ml-0.5">({pendingEntries.length})</span>
          </div>

          {pendingEntries.length > 0 && (
            <button
              type="button"
              onClick={handleApproveAllPending}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer active:scale-95"
              title="Mark all pending collections as received"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Approve All ({pendingEntries.length})</span>
            </button>
          )}

          <span className="text-slate-700">|</span>

          <span className="font-mono text-slate-400 text-[11px]">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {/* In-Line Power BI Filter Controls (Enterprise Styled Slicers) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Dealer Quick Search with Smooth Width Expansion and Clear CTA */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter dealer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-32 lg:w-44 focus:w-56 transition-all duration-200 px-2.5 py-1 pl-7 pr-6 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-white"
                title="Clear filter"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Operator Dropdown with Custom Chevron and Dark Theme Styling */}
          <div className="relative inline-flex items-center">
            <select
              value={filterOperator}
              onChange={(e) => setFilterOperator(e.target.value)}
              className="appearance-none pl-2.5 pr-7 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-slate-200 hover:border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-inner"
            >
              <option value="ALL" className="bg-slate-950 text-white">All Operators</option>
              {operators.map((op) => (
                <option key={op.id} value={op.id} className="bg-slate-950 text-white">
                  {op.full_name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* Payment Mode Dropdown with Custom Chevron */}
          <div className="relative hidden sm:inline-flex items-center">
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="appearance-none pl-2.5 pr-7 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-slate-200 hover:border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-inner"
            >
              <option value="ALL" className="bg-slate-950 text-white">All Modes</option>
              <option value="CASH_ONLY" className="bg-slate-950 text-white">Cash Only</option>
              <option value="PHONEPE_ONLY" className="bg-slate-950 text-white">UPI Only</option>
              <option value="SPLIT" className="bg-slate-950 text-white">Split Only</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* Status Dropdown with Custom Chevron */}
          <div className="relative hidden lg:inline-flex items-center">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="appearance-none pl-2.5 pr-7 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-amber-400 hover:border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-inner"
            >
              <option value="ALL" className="bg-slate-950 text-white">All Status ({entries.length})</option>
              <option value="submitted" className="bg-slate-950 text-amber-400">Pending Handover ({pendingEntries.length})</option>
              <option value="approved" className="bg-slate-950 text-emerald-400">Money Received ({approvedEntries.length})</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
          </div>
        </div>

      </div>

      {/* 3. POWER BI DATA CANVAS (REMAINDER VIEWPORT HEIGHT - STRICT INTERNAL SCROLL) */}
      <main className="flex-1 overflow-y-auto w-full px-2 sm:px-4 py-2 relative">
        
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs animate-pulse gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Loading collection records for {formatAppDate(selectedDate)}...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          
          /* ENHANCED EXECUTIVE EMPTY STATE ACTION DESK */
          <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-2xl bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-center space-y-6">
              
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
                <Receipt className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  No Collections Logged for {formatAppDate(selectedDate)}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No records found under the current filters. Did an operator hand over a physical handwritten slip? Or would you like to record a direct manual collection?
                </p>
              </div>

              {/* ACTION TILES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                
                {/* Tile 1: AI Slip Digitizer (HITL) */}
                <button
                  type="button"
                  onClick={() => setIsDigitizerOpen(true)}
                  className="p-4 rounded-2xl bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 border border-emerald-500/30 hover:border-emerald-500/60 text-slate-100 transition-all group flex flex-col justify-between gap-3 text-left shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      HITL Review
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {t('uploadOperatorSlip')}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Operator handed over paper slip? Upload photo, AI extracts entries, inspect side-by-side, edit and approve to ledger.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                    <span>{t('digitizeSlip')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>

                {/* Tile 2: Direct Manual Entry */}
                <button
                  type="button"
                  onClick={() => setIsAddEntryOpen(true)}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 transition-all group flex flex-col justify-between gap-3 text-left shadow-lg cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                      Direct Log
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-slate-200 transition-colors">
                      {t('manualAdminEntry')}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Quickly log a collection entry directly on behalf of any operator without switching accounts.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-300 group-hover:translate-x-1 transition-transform">
                    <span>{t('addNewEntry')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>

              </div>

              {/* Quick Jump Bar */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
                <span>Quick Jump:</span>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500 text-slate-300 font-bold hover:text-white"
                >
                  Today
                </button>
              </div>

            </div>
          </div>

        ) : (
          <>
            {/* Desktop Table View (Power BI Financial Data Grid) */}
            <div className="hidden md:block border border-slate-800 rounded-2xl shadow-2xl bg-slate-900/80 backdrop-blur-sm overflow-y-auto max-h-[calc(100dvh-155px)]">
            <table className="w-full text-left border-collapse text-xs">
              
              {/* Sticky Table Header */}
              {/* Sticky Table Header (Interactive Column Sorting) */}
              <thead className="sticky top-0 z-20 bg-slate-950 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 backdrop-blur-md select-none">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">#</th>

                  {/* Time */}
                  <th
                    onClick={() => handleToggleSort('created_at')}
                    className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors"
                    title="Click to sort by Time"
                  >
                    <div className="flex items-center gap-1">
                      <span>Time</span>
                      {sortField === 'created_at' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600 hover:text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* Operator */}
                  <th
                    onClick={() => handleToggleSort('collector')}
                    className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors"
                    title="Click to sort by Operator"
                  >
                    <div className="flex items-center gap-1">
                      <span>Operator</span>
                      {sortField === 'collector' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600 hover:text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* Business */}
                  <th
                    onClick={() => handleToggleSort('business_name')}
                    className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors"
                    title="Click to sort by Business"
                  >
                    <div className="flex items-center gap-1">
                      <span>Business</span>
                      {sortField === 'business_name' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600 hover:text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* Dealer / Shop Name */}
                  <th
                    onClick={() => handleToggleSort('dealer_name')}
                    className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors"
                    title="Click to sort by Dealer Name"
                  >
                    <div className="flex items-center gap-1">
                      <span>Dealer / Shop Name</span>
                      {sortField === 'dealer_name' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600 hover:text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* Cash (₹) */}
                  <th
                    onClick={() => handleToggleSort('cash_amount')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors"
                    title="Click to sort by Cash Amount"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <CashBadge size="xs" />
                      <span>Cash (₹)</span>
                      {sortField === 'cash_amount' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600 hover:text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* UPI (₹) */}
                  <th
                    onClick={() => handleToggleSort('phonepe_amount')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors"
                    title="Click to sort by UPI Amount"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <UpiBadge size="xs" />
                      <span>UPI (₹)</span>
                      {sortField === 'phonepe_amount' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600 hover:text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* Total (₹) */}
                  <th
                    onClick={() => handleToggleSort('total_collected')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors"
                    title="Click to sort by Total Amount"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total (₹)</span>
                      {sortField === 'total_collected' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600 hover:text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* Bal Owed */}
                  <th
                    onClick={() => handleToggleSort('balance_owed')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors"
                    title="Click to sort by Balance Owed"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Bal Owed</span>
                      {sortField === 'balance_owed' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600 hover:text-slate-400" />
                      )}
                    </div>
                  </th>

                  <th className="py-2.5 px-3 text-center">Slip Proof</th>
                  <th className="py-2.5 px-3">Note / Audit</th>
                  <th className="py-2.5 px-3 text-center min-w-[125px]">Money Received</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-800/80 font-medium">
                {sortedEntries.map((e, idx) => {
                  const op = operators.find((o) => o.id === e.collector_id);
                  return (
                    <tr
                      key={e.id}
                      className={`hover:bg-slate-800/60 transition-colors ${
                        idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-950/40'
                      }`}
                    >
                      {/* S.No */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500 text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Time */}
                      <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {formatAppTime(e.created_at)}
                      </td>

                      {/* Operator */}
                      <td className="py-2.5 px-3 text-slate-300 font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 flex items-center justify-center">
                            {(op?.full_name || 'Op').charAt(0)}
                          </span>
                          <span>{op?.full_name || 'Operator'}</span>
                        </div>
                      </td>

                      {/* Business Tag */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            e.business_name === 'STAR'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                          }`}
                        >
                          {e.business_name}
                        </span>
                      </td>

                      {/* Dealer Name */}
                      <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                        {e.dealer_name}
                      </td>

                      {/* Cash */}
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">
                        {e.cash_amount > 0 ? formatINR(e.cash_amount) : '-'}
                      </td>

                      {/* PhonePe */}
                      <td className="py-2.5 px-3 text-right font-mono text-purple-400 font-bold">
                        {e.phonepe_amount > 0 ? formatINR(e.phonepe_amount) : '-'}
                      </td>

                      {/* Total */}
                      <td className="py-2.5 px-3 text-right font-mono font-black text-white bg-slate-800/30">
                        {formatINR(e.total_collected)}
                      </td>

                      {/* Balance Owed */}
                      <td className="py-2.5 px-3 text-right font-mono text-amber-400">
                        {e.balance_owed !== null ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[11px]">
                            {formatINR(e.balance_owed)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Slip Photo Column with Thumbnail */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {e.image_url ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewImageUrl(e.image_url);
                              setPreviewEntry(e);
                              setPreviewRotation(0);
                              setPreviewZoom(1);
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 transition-all text-[11px] font-bold"
                            title="Click to inspect full slip"
                          >
                            <img
                              src={e.image_url}
                              alt="Slip"
                              className="w-5 h-5 rounded object-cover border border-slate-700"
                            />
                            <span>View</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 font-mono text-[11px]">-</span>
                        )}
                      </td>

                      {/* Note / Audit */}
                      <td className="py-2.5 px-3 text-slate-400 max-w-[170px]" title={e.note_audit ? `Audit: ${e.note_audit} | Note: ${e.note || ''}` : (e.note || '')}>
                        <div className="flex flex-col gap-0.5">
                          {e.note && <span className="text-slate-300 text-xs truncate">{e.note}</span>}
                          {e.note_audit && (
                            <span className="text-amber-400/90 text-[11px] font-mono truncate flex items-center gap-1" title={e.note_audit}>
                              ✎ {e.note_audit}
                            </span>
                          )}
                          {!e.note && !e.note_audit && <span className="text-slate-600 font-mono text-[11px]">-</span>}
                        </div>
                      </td>

                      {/* Status / Money Received Interactive Checkbox */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleApproval(e)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                            e.status === 'approved'
                              ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25 shadow-sm shadow-emerald-500/10'
                              : 'bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 ring-1 ring-amber-500/30'
                          }`}
                          title={
                            e.status === 'approved'
                              ? 'Money Received! Click to mark Pending Handover'
                              : 'Pending Handover! Click to mark Money Received'
                          }
                        >
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center text-[10px] transition-colors ${
                              e.status === 'approved'
                                ? 'bg-emerald-500 text-slate-950 font-black'
                                : 'border-2 border-amber-400 bg-slate-950'
                            }`}
                          >
                            {e.status === 'approved' && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <span>{e.status === 'approved' ? 'Received' : 'Pending'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(e)}
                            className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
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
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
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

              {/* Table Footer with Pinned Column Sums */}
              <tfoot className="sticky bottom-0 z-20 bg-slate-950 border-t-2 border-slate-800 font-bold text-xs backdrop-blur-md">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-400">
                    Day Totals ({filteredEntries.length} Records):
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-black">
                    {formatINR(visibleCash)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-purple-400 font-black">
                    {formatINR(visiblePhonePe)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-white font-black bg-slate-800/40">
                    {formatINR(visibleGrand)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-400 font-black">
                    {visibleBalOwed > 0 ? formatINR(visibleBalOwed) : '-'}
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>

            </table>
            </div>

            {/* Mobile Card List View for Admin (Touch-Optimized Revolut Style) */}
            <div className="md:hidden space-y-2.5 pb-6">
              {(searchQuery.trim() ? sortedEntries : sortedEntries.slice(0, mobileVisibleCount)).map((e) => {
                const op = operators.find((o) => o.id === e.collector_id);
                return (
                  <div
                    key={e.id}
                    className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            e.business_name === 'STAR'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                          }`}
                        >
                          {e.business_name}
                        </span>
                        <span className="text-slate-400 font-semibold">{op?.full_name || 'Operator'}</span>
                        <span className="text-slate-500 font-mono text-[11px]">{formatAppTime(e.created_at)}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold inline-flex items-center gap-1 ${
                            e.status === 'approved'
                              ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30'
                              : 'text-amber-300 bg-amber-500/15 border border-amber-500/30'
                          }`}
                        >
                          {e.status === 'approved' ? (
                            <>
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                              <span>Received</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-2.5 h-2.5" />
                              <span>Pending</span>
                            </>
                          )}
                        </span>
                      </div>
                      <span className="font-mono text-base font-black text-white">
                        {formatINR(e.total_collected)}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="text-sm font-bold text-white tracking-tight">{e.dealer_name}</h4>
                      {e.balance_owed !== null && (
                        <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          Bal: {formatINR(e.balance_owed)}
                        </span>
                      )}
                    </div>

                    {e.note && <p className="text-[11px] text-slate-400 italic">"{e.note}"</p>}
                    {e.note_audit && (
                      <p className="text-[11px] text-amber-400/90 font-mono flex items-center gap-1">
                        <span>✎ Audit:</span>
                        <span className="italic">{e.note_audit}</span>
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        {e.cash_amount > 0 && (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CashBadge size="xs" />
                            <span>{formatINR(e.cash_amount)}</span>
                          </span>
                        )}
                        {e.phonepe_amount > 0 && (
                          <span className="text-purple-400 flex items-center gap-1">
                            <UpiBadge size="xs" />
                            <span>{formatINR(e.phonepe_amount)}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Money Received / Approval Interactive Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleApproval(e)}
                          className={`min-h-[34px] px-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition-all select-none cursor-pointer ${
                            e.status === 'approved'
                              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                              : 'bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-sm'
                          }`}
                          title={
                            e.status === 'approved'
                              ? 'Money Received! Tap to toggle'
                              : 'Pending Handover! Tap to mark Money Received'
                          }
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] ${
                              e.status === 'approved'
                                ? 'bg-emerald-500 text-slate-950 font-black'
                                : 'border-2 border-amber-400 bg-slate-950'
                            }`}
                          >
                            {e.status === 'approved' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                          <span>{e.status === 'approved' ? 'Received' : 'Mark Recv'}</span>
                        </button>

                        {e.image_url && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewImageUrl(e.image_url);
                              setPreviewEntry(e);
                              setPreviewRotation(0);
                              setPreviewZoom(1);
                            }}
                            className="min-h-[34px] px-2.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                            title="Inspect Slip"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Slip</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(e)}
                          className="min-w-[34px] min-h-[34px] rounded-xl bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-emerald-400 flex items-center justify-center active:scale-95 transition-all"
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
                          className="min-w-[34px] min-h-[34px] rounded-xl bg-slate-800/80 border border-rose-500/30 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center active:scale-95 transition-all ml-0.5"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!searchQuery.trim() && filteredEntries.length > mobileVisibleCount && (
                <div className="pt-3 pb-2 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileVisibleCount((prev) => prev + 50)}
                    className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-emerald-400 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]"
                  >
                    <span>Load 50 More (Showing {Math.min(mobileVisibleCount, filteredEntries.length)} of {filteredEntries.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileVisibleCount(filteredEntries.length)}
                    className="text-xs text-slate-400 hover:text-white font-semibold underline py-1"
                  >
                    Show All {filteredEntries.length} Collections
                  </button>
                </div>
              )}
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
          <span className="text-slate-700">•</span>
          <span>Slips Attached: <strong className="text-teal-400 font-mono">{daySlipsCount}</strong></span>
        </div>
        <div className="flex items-center gap-4 font-mono font-bold text-xs">
          <span className="flex items-center gap-1.5"><CashBadge size="xs" /> Cash: <strong className="text-emerald-400">{formatINR(visibleCash)}</strong></span>
          <span className="flex items-center gap-1.5"><UpiBadge size="xs" /> UPI: <strong className="text-purple-400">{formatINR(visiblePhonePe)}</strong></span>
          <span>Total: <strong className="text-white">{formatINR(visibleGrand)}</strong></span>
        </div>
      </footer>

      {/* 5. MOBILE BOTTOM NAVIGATION (52PX + SAFE AREA - Mobile only) */}
      <nav className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-md px-3 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around shrink-0 z-30">
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
          onClick={() => onNavigateTab('tools')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <Wrench className="w-4 h-4 text-slate-400" />
          <span>Tools</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('users')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <Users className="w-4 h-4 text-slate-400" />
          <span>Operators</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('tasks')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-cyan-300 hover:text-white transition-all cursor-pointer"
        >
          <span className="text-cyan-400 text-xs font-black">⚡</span>
          <span>Tasks</span>
        </button>
        <button
          type="button"
          onClick={signOut}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>Exit</span>
        </button>
      </nav>

      {/* AI SLIP DIGITIZER & HITL REVIEW MODAL */}
      <AdminSlipDigitizerModal
        isOpen={isDigitizerOpen}
        onClose={() => setIsDigitizerOpen(false)}
        onSuccess={(count, total, date) => {
          setSelectedDate(date);
          showToast(`Successfully verified & committed ${count} entries from slip (${formatINR(total)})`);
          loadDailyEntries();
        }}
        operators={operators}
        initialDate={selectedDate}
      />

      {/* DIRECT MANUAL ENTRY MODAL (Unmounted when closed to guarantee virgin clean fields) */}
      {isAddEntryOpen && (
        <AdminAddEntryModal
          key="admin-add-entry-modal"
          isOpen={isAddEntryOpen}
          onClose={() => setIsAddEntryOpen(false)}
          onSuccess={(dealer, amount) => {
            showToast(`Saved collection entry for ${dealer} (${formatINR(amount)})`);
            loadDailyEntries();
          }}
          operators={operators}
          currentDate={selectedDate}
        />
      )}

      {/* BACKUP & CLOUD SYNC HUB MODAL */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
      />

      {/* DATE RANGE MAINTENANCE & PURGE MODAL (ADMIN ONLY) */}
      <AdminRangeDeleteModal
        isOpen={isRangeDeleteOpen}
        onClose={() => setIsRangeDeleteOpen(false)}
        onSuccess={(deletedCount) => {
          showToast(`Successfully purged ${deletedCount} records across selected date range.`);
          loadDailyEntries();
        }}
        operators={operators}
      />

      {/* DAY SLIPS GALLERY MODAL */}
      <DaySlipsGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        selectedDate={selectedDate}
        entries={entries}
        operators={operators}
      />

      {/* ENTERPRISE SLIP INSPECTION SUITE (WITH ROTATION & ZOOM) */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-60 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            
            {/* Workbench Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/90">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{previewEntry?.dealer_name || 'Physical Slip Proof'}</span>
                    {previewEntry && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {formatINR(previewEntry.total_collected)}
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {previewEntry?.business_name} • Logged at {previewEntry?.created_at ? formatAppTime(previewEntry.created_at) : 'Today'}
                  </p>
                </div>
              </div>

              {/* Inspection Controls: Rotate 90°, Zoom, Reset, Close */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewRotation((r) => (r + 90) % 360)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/80"
                  title="Rotate 90° Clockwise"
                >
                  <RotateCw className="w-3.5 h-3.5 text-teal-400" />
                  <span className="hidden sm:inline">Rotate 90°</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.min(z + 0.25, 3))}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700/80"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4 text-emerald-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.max(z - 0.25, 0.5))}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700/80"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4 text-slate-300" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewRotation(0);
                    setPreviewZoom(1);
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700/80"
                  title="Reset View"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <div className="h-4 w-px bg-slate-800 mx-1"></div>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewImageUrl(null);
                    setPreviewEntry(null);
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700/80"
                  title="Close Inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Slip Image Viewport with Transform */}
            <div className="flex-1 overflow-hidden min-h-[350px] max-h-[70vh] flex items-center justify-center p-4 bg-slate-950/90 relative">
              <img
                src={previewImageUrl}
                alt="Bill Slip"
                style={{
                  transform: `rotate(${previewRotation}deg) scale(${previewZoom})`,
                  transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
                }}
                className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain shadow-2xl select-none"
              />
            </div>

            {/* Workbench Footer Bar */}
            <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="font-mono">Zoom: {Math.round(previewZoom * 100)}%</span>
                <span>•</span>
                <span className="font-mono">Angle: {previewRotation}°</span>
              </div>
              <a
                href={previewImageUrl}
                target="_blank"
                rel="noreferrer"
                download={`Slip_${selectedDate}.jpg`}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Proof</span>
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
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <CashBadge size="xs" />
                  <span>Cash (₹)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editCash}
                  onChange={(e) => setEditCash(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <UpiBadge size="xs" />
                  <span>UPI (₹)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editPhonePe}
                  onChange={(e) => setEditPhonePe(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-purple-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Balance Owed (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editBalOwed}
                  onChange={(e) => setEditBalOwed(e.target.value)}
                  placeholder="Optional"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Remarks</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Optional note"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-400 mb-1">
                Reason for Edit * (Required for Audit Trail)
              </label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="e.g. Corrected miskeyed cash amount per physical slip"
                rows={2}
                className="w-full p-2.5 bg-slate-950 border border-amber-500/40 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                Save Audit Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/30 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Soft Delete Collection Entry</span>
              </h3>
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to delete the entry for{' '}
              <strong className="text-white">{deletingEntry.dealer_name}</strong> of{' '}
              <strong className="text-emerald-400 font-mono">
                {formatINR(deletingEntry.total_collected)}
              </strong>
              ?
            </p>

            <div>
              <label className="block text-xs font-bold text-rose-400 mb-1">
                Reason for Deletion * (Required for Audit Trail)
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Duplicate entry logged in error"
                rows={2}
                className="w-full p-2.5 bg-slate-950 border border-rose-500/40 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs"
              >
                Confirm Soft Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
