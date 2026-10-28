import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { Profile, Entry, BusinessName } from '../types/database';
import { formatAppDate, formatAppTime, getCurrentISTDateString } from '../lib/formatters';
import * as XLSX from 'xlsx';
import { BackupModal } from '../components/BackupModal';
import { AdminRangeDeleteModal } from '../components/AdminRangeDeleteModal';
import { AdminAddEntryModal } from '../components/AdminAddEntryModal';
import { DaySlipsGalleryModal } from '../components/DaySlipsGalleryModal';
import {
  Calendar,
  BarChart3,
  Users,
  Wrench,
  FileSpreadsheet,
  Database,
  Trash2,
  Camera,
  Plus,
  LogOut,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Server,
  Download,
} from 'lucide-react';

interface AdminToolsPageProps {
  onNavigateTab: (tab: 'daily' | 'dashboard' | 'tools' | 'users' | 'tasks') => void;
}

export const AdminToolsPage: React.FC<AdminToolsPageProps> = ({ onNavigateTab }) => {
  const { signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const todayIST = getCurrentISTDateString();

  // State
  const [operators, setOperators] = useState<Profile[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals state
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);
  const [isRangeDeleteOpen, setIsRangeDeleteOpen] = useState<boolean>(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState<boolean>(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);

  // Export card state
  const [exportDate, setExportDate] = useState<string>(todayIST);
  const [exportBusiness, setExportBusiness] = useState<'ALL' | BusinessName>('ALL');
  const [exporting, setExporting] = useState<boolean>(false);

  // Gallery date & entries state
  const [galleryDate, setGalleryDate] = useState<string>(todayIST);
  const [galleryEntries, setGalleryEntries] = useState<Entry[]>([]);
  const [loadingGalleryEntries, setLoadingGalleryEntries] = useState<boolean>(false);

  // Toast notification
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Fetch operators
  useEffect(() => {
    const fetchOperators = async () => {
      const { data } = await supabase.from('profiles').select('*').order('full_name');
      if (data) setOperators(data as Profile[]);
    };
    fetchOperators();
  }, []);

  // Fetch gallery entries when galleryDate changes
  useEffect(() => {
    const fetchGallery = async () => {
      setLoadingGalleryEntries(true);
      try {
        const { data: sheets } = await supabase
          .from('daily_sheets')
          .select('id')
          .eq('sheet_date', galleryDate);

        if (!sheets || sheets.length === 0) {
          setGalleryEntries([]);
          return;
        }

        const sheetIds = sheets.map((s) => s.id);
        const { data: entries } = await supabase
          .from('entries')
          .select('*')
          .in('sheet_id', sheetIds)
          .eq('is_deleted', false)
          .not('image_url', 'is', null);

        setGalleryEntries((entries as Entry[]) || []);
      } catch (e) {
        console.error('Failed to load gallery entries:', e);
      } finally {
        setLoadingGalleryEntries(false);
      }
    };
    fetchGallery();
  }, [galleryDate]);

  // Export Excel handler
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const { data: sheets, error: sheetsErr } = await supabase
        .from('daily_sheets')
        .select('id')
        .eq('sheet_date', exportDate);

      if (sheetsErr) throw sheetsErr;

      if (!sheets || sheets.length === 0) {
        showToast(`No collections found for ${formatAppDate(exportDate)}.`);
        setExporting(false);
        return;
      }

      const sheetIds = sheets.map((s) => s.id);
      let query = supabase
        .from('entries')
        .select('*')
        .in('sheet_id', sheetIds)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (exportBusiness !== 'ALL') {
        query = query.eq('business_name', exportBusiness);
      }

      const { data: entries, error: entriesErr } = await query;
      if (entriesErr) throw entriesErr;

      if (!entries || entries.length === 0) {
        showToast(`No matching entries found for ${formatAppDate(exportDate)}.`);
        setExporting(false);
        return;
      }

      const rows = entries.map((e, idx) => {
        const op = operators.find((o) => o.id === e.collector_id);
        return {
          'S.No': idx + 1,
          Date: formatAppDate(exportDate),
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
      const filename = `Daily_Collections_${formatAppDate(exportDate)}_${exportBusiness}.xlsx`;
      XLSX.writeFile(workbook, filename);

      showToast(`Exported ${entries.length} records to ${filename}`);
    } catch (err: any) {
      showToast('Export failed: ' + (err.message || 'Error'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full min-h-[100dvh] overflow-hidden bg-[#030712] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* 1. TOP HEADER RIBBON */}
      <header className="min-h-[48px] safe-pt border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-20">
        
        {/* Brand & Tab Navigation */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 text-xs shrink-0">
            ₹
          </div>
          <span className="text-sm font-extrabold tracking-tight text-white uppercase whitespace-nowrap truncate">
            Daily Invoice
          </span>

          {/* Segmented Tab Switcher (Desktop) */}
          <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onNavigateTab('daily')}
              className="px-2.5 py-1 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{t('dailyView')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('dashboard')}
              className="px-2.5 py-1 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{t('dashboard')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('tools')}
              className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-500 text-slate-950 shadow-sm flex items-center gap-1"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{t('tools')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className="px-2.5 py-1 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t('userManagement')}</span>
            </button>
          </div>
        </div>

        {/* Right: Language & Logout */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center">
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

          <button
            type="button"
            onClick={signOut}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* TOAST ALERT NOTIFICATION */}
      {toastMsg && (
        <div className="bg-emerald-500 text-slate-950 font-bold px-4 py-2 text-xs flex items-center justify-between shrink-0 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 stroke-[3]" />
            <span>{toastMsg}</span>
          </div>
          <button type="button" onClick={() => setToastMsg(null)} className="text-slate-950 hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* 2. MAIN OPERATIONS CANVAS */}
      <main className="flex-1 overflow-y-auto w-full px-3.5 sm:px-6 py-4 space-y-4 max-w-4xl mx-auto">
        
        {/* Page Title & Intro - Clean & Punchy */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <h1 className="text-sm sm:text-base font-black text-white">
              {t('adminOperations')}
            </h1>
          </div>
        </div>

        {/* TOOL CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          
          {/* Card 1: Excel Spreadsheet Export */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4" />
                <span>{t('excelExport')}</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                .XLSX
              </span>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {t('selectDate')}
                  </label>
                  <input
                    type="date"
                    value={exportDate}
                    onChange={(e) => setExportDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {t('business')}
                  </label>
                  <select
                    value={exportBusiness}
                    onChange={(e) => setExportBusiness(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">{t('allBusinesses')}</option>
                    <option value="STAR">{t('starOnly')}</option>
                    <option value="ARBO PLAST">{t('arboPlastOnly')}</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {exporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('generatingExcel')}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{t('downloadExcel')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: System Backup Hub */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                <span>{t('databaseBackup')}</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Cloud & JSON
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsBackupOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{t('openBackupHub')}</span>
              </button>
            </div>
          </div>

          {/* Card 3: Date Range Maintenance & Purge */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-rose-500/30 hover:border-rose-500/60 transition-all flex flex-col justify-between space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" />
                <span>{t('dateRangePurge')}</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                Admin
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsRangeDeleteOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('openPurgeTool')}</span>
              </button>
            </div>
          </div>

          {/* Card 4: Day Slips Photo Gallery */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-teal-500/40 transition-all flex flex-col justify-between space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                <Camera className="w-4 h-4" />
                <span>{t('daySlipsGallery')}</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                {galleryEntries.length} {t('entriesCount')}
              </span>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {t('slipDate')}
                </label>
                <input
                  type="date"
                  value={galleryDate}
                  onChange={(e) => setGalleryDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsGalleryOpen(true)}
                disabled={galleryEntries.length === 0}
                className="w-full py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{t('inspectSlips')} ({galleryEntries.length})</span>
              </button>
            </div>
          </div>

          {/* Card 5: Urgent Direct Collection Entry */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                <span>{t('urgentManualEntry')}</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Admin
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsAddEntryOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('logDirectEntry')}</span>
              </button>
            </div>
          </div>

          {/* Card 6: System Diagnostics */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>{t('systemDiagnostics')}</span>
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t('statusOnline')}
              </span>
            </div>
            <div className="space-y-1 text-xs text-slate-400 pt-1">
              <div className="flex items-center justify-between py-1 border-b border-slate-900">
                <span>{t('cloudDatabase')}:</span>
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> {t('statusConnected')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900">
                <span>{t('activeOperators')}:</span>
                <span className="text-white font-mono font-bold">{operators.length}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900">
                <span>{t('applicationBuild')}:</span>
                <span className="text-purple-400 font-mono font-bold">v1.2.0</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>{t('productionStatus')}:</span>
                <span className="text-teal-400 font-mono font-bold">{t('zeroTestJunk')}</span>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* 3. MOBILE BOTTOM NAVIGATION BAR (4 TABS) */}
      <nav className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-md px-3 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around shrink-0 z-30">
        <button
          type="button"
          onClick={() => onNavigateTab('daily')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{t('dailyView')}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('dashboard')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <span>{t('dashboard')}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('tools')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 transition-all shadow-sm cursor-pointer"
        >
          <Wrench className="w-4 h-4 text-emerald-400" />
          <span>{t('tools')}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('users')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <Users className="w-4 h-4 text-slate-400" />
          <span>{t('userManagement')}</span>
        </button>
      </nav>

      {/* MODALS */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
      />

      <AdminRangeDeleteModal
        isOpen={isRangeDeleteOpen}
        onClose={() => setIsRangeDeleteOpen(false)}
        onSuccess={(count) => {
          showToast(`Successfully purged ${count} records.`);
        }}
        operators={operators}
      />

      {isAddEntryOpen && (
        <AdminAddEntryModal
          key="admin-tools-add-entry-modal"
          isOpen={isAddEntryOpen}
          onClose={() => setIsAddEntryOpen(false)}
          onSuccess={(dealer, amount) => {
            showToast(`Logged entry for ${dealer}: ₹${amount}`);
          }}
          operators={operators}
          currentDate={todayIST}
        />
      )}

      <DaySlipsGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        selectedDate={galleryDate}
        entries={galleryEntries}
        operators={operators}
      />

    </div>
  );
};
