import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../lib/i18n';
import {
  formatAppDate,
  formatAppTime,
  formatINR,
  getCurrentISTDateString,
  toISODateString,
} from '../lib/formatters';
import { CashBadge, UpiBadge } from '../components/PaymentLogos';
import * as XLSX from 'xlsx';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Users,
  Smartphone,
  Banknote,
  ArrowRight,
  RefreshCw,
  LogOut,
  BarChart3,
  Activity,
  Wrench,
  Download,
  Filter,
  ChevronDown,
  X,
  Sparkles,
  Zap,
} from 'lucide-react';

interface DashboardProps {
  onNavigateTab: (tab: 'daily' | 'dashboard' | 'tools' | 'users' | 'tasks') => void;
  onSelectDate: (dateStr: string) => void;
}

interface EnrichedEntry {
  id: string;
  collector_id: string;
  sheet_id: string;
  cash_amount: number;
  phonepe_amount: number;
  total_collected: number;
  balance_owed?: number;
  business_name: string;
  dealer_name: string;
  status: string;
  note?: string;
  image_url?: string;
  created_at: string;
  sheet_date: string;
  collector_name: string;
}

interface Profile {
  id: string;
  full_name: string;
  role?: string;
}

export const AdminDashboardPage: React.FC<DashboardProps> = ({ onNavigateTab, onSelectDate }) => {
  const { signOut } = useAuth();
  const { language, setLanguage } = useLanguage();

  const todayIST = getCurrentISTDateString();

  // Helper date offset functions
  const getDateOffset = useCallback(
    (offsetDays: number): string => {
      const d = new Date(`${todayIST}T00:00:00`);
      d.setDate(d.getDate() + offsetDays);
      return toISODateString(d);
    },
    [todayIST]
  );

  const getFirstDayOfMonth = useCallback((): string => {
    const [year, month] = todayIST.split('-');
    return `${year}-${month}-01`;
  }, [todayIST]);

  // Filters State
  const [datePreset, setDatePreset] = useState<string>('7days');
  const [startDate, setStartDate] = useState<string>(() => getDateOffset(-6));
  const [endDate, setEndDate] = useState<string>(todayIST);
  const [selectedBusiness, setSelectedBusiness] = useState<'ALL' | 'STAR' | 'ARBO PLAST'>('ALL');
  const [filterOperator, setFilterOperator] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [searchDealer, setSearchDealer] = useState<string>('');

  // Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [allEntries, setAllEntries] = useState<EnrichedEntry[]>([]);
  const [operators, setOperators] = useState<Profile[]>([]);

  // Load All Relevant Data from Supabase
  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .order('full_name');
      if (profiles) {
        setOperators(profiles as Profile[]);
      }

      // 2. Fetch daily sheets
      const { data: sheets } = await supabase
        .from('daily_sheets')
        .select('id, sheet_date, collector_id');

      // 3. Fetch non-deleted entries
      const { data: entries } = await supabase
        .from('entries')
        .select(
          'id, collector_id, sheet_id, cash_amount, phonepe_amount, total_collected, balance_owed, business_name, dealer_name, status, note, image_url, created_at'
        )
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      const opMap = new Map<string, string>();
      profiles?.forEach((p) => opMap.set(p.id, p.full_name));

      const sheetDateMap = new Map<string, string>();
      sheets?.forEach((s) => sheetDateMap.set(s.id, s.sheet_date));

      const enriched: EnrichedEntry[] = (entries || []).map((e: any) => ({
        ...e,
        cash_amount: Number(e.cash_amount) || 0,
        phonepe_amount: Number(e.phonepe_amount) || 0,
        total_collected: Number(e.total_collected) || 0,
        balance_owed: Number(e.balance_owed) || 0,
        sheet_date:
          sheetDateMap.get(e.sheet_id) || (e.created_at ? e.created_at.split('T')[0] : todayIST),
        collector_name: opMap.get(e.collector_id) || 'Operator',
      }));

      setAllEntries(enriched);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [todayIST]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Handle Preset Changes
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset === 'today') {
      setStartDate(todayIST);
      setEndDate(todayIST);
    } else if (preset === 'yesterday') {
      const y = getDateOffset(-1);
      setStartDate(y);
      setEndDate(y);
    } else if (preset === '7days') {
      setStartDate(getDateOffset(-6));
      setEndDate(todayIST);
    } else if (preset === '15days') {
      setStartDate(getDateOffset(-14));
      setEndDate(todayIST);
    } else if (preset === '30days') {
      setStartDate(getDateOffset(-29));
      setEndDate(todayIST);
    } else if (preset === 'this_month') {
      setStartDate(getFirstDayOfMonth());
      setEndDate(todayIST);
    }
  };

  const handleCustomDateChange = (from: string, to: string) => {
    setDatePreset('custom');
    if (from && to) {
      if (from > to) {
        setStartDate(from);
        setEndDate(from);
      } else {
        setStartDate(from);
        setEndDate(to);
      }
    } else if (from) {
      setStartDate(from);
    } else if (to) {
      setEndDate(to);
    }
  };

  const handleResetFilters = () => {
    setSelectedBusiness('ALL');
    setFilterOperator('ALL');
    setFilterMode('ALL');
    setSearchDealer('');
    setDatePreset('7days');
    setStartDate(getDateOffset(-6));
    setEndDate(todayIST);
  };

  // Step 1: Filter entries by active date range
  const dateFilteredEntries = useMemo(() => {
    return allEntries.filter((e) => e.sheet_date >= startDate && e.sheet_date <= endDate);
  }, [allEntries, startDate, endDate]);

  // Step 2: Scoped entries for business pills (scoped to selected operator and active date range)
  const scopedEntries = useMemo(() => {
    return filterOperator === 'ALL'
      ? dateFilteredEntries
      : dateFilteredEntries.filter((e) => e.collector_id === filterOperator);
  }, [dateFilteredEntries, filterOperator]);

  // Business Totals for Pills (Live & Reactive to selected Operator & Date Range)
  const businessTotals = useMemo(() => {
    return {
      ALL: scopedEntries.reduce((acc, curr) => acc + (curr.total_collected || 0), 0),
      STAR: scopedEntries
        .filter((e) => e.business_name === 'STAR')
        .reduce((acc, curr) => acc + (curr.total_collected || 0), 0),
      'ARBO PLAST': scopedEntries
        .filter((e) => e.business_name === 'ARBO PLAST')
        .reduce((acc, curr) => acc + (curr.total_collected || 0), 0),
    };
  }, [scopedEntries]);

  // Step 3: Final Filtered entries (applying business, mode, and search)
  const filteredEntries = useMemo(() => {
    return scopedEntries.filter((e) => {
      if (selectedBusiness !== 'ALL' && e.business_name !== selectedBusiness) return false;
      if (searchDealer.trim() && !e.dealer_name.toLowerCase().includes(searchDealer.toLowerCase()))
        return false;
      if (filterMode === 'CASH_ONLY' && (e.cash_amount === 0 || e.phonepe_amount > 0)) return false;
      if (filterMode === 'PHONEPE_ONLY' && (e.phonepe_amount === 0 || e.cash_amount > 0))
        return false;
      if (filterMode === 'SPLIT' && (e.cash_amount === 0 || e.phonepe_amount === 0)) return false;
      return true;
    });
  }, [scopedEntries, selectedBusiness, searchDealer, filterMode]);

  // Period Metrics
  const filteredTotal = useMemo(
    () => filteredEntries.reduce((acc, curr) => acc + curr.total_collected, 0),
    [filteredEntries]
  );
  const filteredCash = useMemo(
    () => filteredEntries.reduce((acc, curr) => acc + curr.cash_amount, 0),
    [filteredEntries]
  );
  const filteredPhonePe = useMemo(
    () => filteredEntries.reduce((acc, curr) => acc + curr.phonepe_amount, 0),
    [filteredEntries]
  );

  const filteredStar = useMemo(
    () =>
      filteredEntries
        .filter((e) => e.business_name === 'STAR')
        .reduce((acc, curr) => acc + curr.total_collected, 0),
    [filteredEntries]
  );
  const filteredArbo = useMemo(
    () =>
      filteredEntries
        .filter((e) => e.business_name === 'ARBO PLAST')
        .reduce((acc, curr) => acc + curr.total_collected, 0),
    [filteredEntries]
  );

  const cashPercent = filteredTotal > 0 ? Math.round((filteredCash / filteredTotal) * 100) : 0;
  const phonePePercent = filteredTotal > 0 ? 100 - cashPercent : 0;

  const starArboCombined = filteredStar + filteredArbo;
  const starPercent = starArboCombined > 0 ? Math.round((filteredStar / starArboCombined) * 100) : 0;
  const arboPercent = starArboCombined > 0 ? 100 - starPercent : 0;

  // Period Days Calculation
  const sD = new Date(`${startDate}T00:00:00`);
  const eD = new Date(`${endDate}T00:00:00`);
  const diffTime = Math.abs(eD.getTime() - sD.getTime());
  const periodDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const isSingleDay = startDate === endDate;

  // Yesterday Comparison Benchmark (for single-day)
  const yesterdayTotal = useMemo(() => {
    const yDate = getDateOffset(-1);
    return allEntries
      .filter((e) => e.sheet_date === yDate)
      .reduce((sum, e) => sum + e.total_collected, 0);
  }, [allEntries, getDateOffset]);

  const variancePercent = useMemo(() => {
    if (yesterdayTotal > 0 && isSingleDay) {
      return Math.round(((filteredTotal - yesterdayTotal) / yesterdayTotal) * 100);
    }
    return 0;
  }, [yesterdayTotal, filteredTotal, isSingleDay]);

  // Rolling Trend Data
  const trendData = useMemo(() => {
    const list: string[] = [];
    const cur = new Date(sD);
    const count = Math.min(periodDays, 31);
    for (let i = 0; i < count; i++) {
      list.push(toISODateString(cur));
      cur.setDate(cur.getDate() + 1);
    }

    return list.map((dStr) => {
      const dayEntries = filteredEntries.filter((e) => e.sheet_date === dStr);
      const total = dayEntries.reduce((sum, e) => sum + e.total_collected, 0);
      const cash = dayEntries.reduce((sum, e) => sum + e.cash_amount, 0);
      const phonepe = dayEntries.reduce((sum, e) => sum + e.phonepe_amount, 0);
      return { date: dStr, total, cash, phonepe, count: dayEntries.length };
    });
  }, [sD, periodDays, filteredEntries]);

  const maxDailyTotal = useMemo(
    () => Math.max(...trendData.map((t) => t.total), 1),
    [trendData]
  );

  // Operator Performance Breakdown
  const operatorLeaderboard = useMemo(() => {
    const opMap: {
      [id: string]: { name: string; total: number; cash: number; phonepe: number; count: number };
    } = {};

    operators.forEach((op) => {
      opMap[op.id] = { name: op.full_name, total: 0, cash: 0, phonepe: 0, count: 0 };
    });

    dateFilteredEntries.forEach((e) => {
      if (selectedBusiness !== 'ALL' && e.business_name !== selectedBusiness) return;
      if (searchDealer.trim() && !e.dealer_name.toLowerCase().includes(searchDealer.toLowerCase()))
        return;
      if (filterMode === 'CASH_ONLY' && (e.cash_amount === 0 || e.phonepe_amount > 0)) return;
      if (filterMode === 'PHONEPE_ONLY' && (e.phonepe_amount === 0 || e.cash_amount > 0))
        return;
      if (filterMode === 'SPLIT' && (e.cash_amount === 0 || e.phonepe_amount === 0)) return;

      if (!opMap[e.collector_id]) {
        opMap[e.collector_id] = {
          name: e.collector_name || 'Operator',
          total: 0,
          cash: 0,
          phonepe: 0,
          count: 0,
        };
      }
      opMap[e.collector_id].total += e.total_collected;
      opMap[e.collector_id].cash += e.cash_amount;
      opMap[e.collector_id].phonepe += e.phonepe_amount;
      opMap[e.collector_id].count += 1;
    });

    return Object.entries(opMap)
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => b.total - a.total);
  }, [operators, dateFilteredEntries, selectedBusiness, searchDealer, filterMode]);

  const maxOpTotal = useMemo(
    () => Math.max(...operatorLeaderboard.map((o) => o.total), 1),
    [operatorLeaderboard]
  );

  // Excel Export
  const handleExportExcel = () => {
    if (filteredEntries.length === 0) {
      alert('No collection entries found to export for the active filters.');
      return;
    }

    const rows = filteredEntries.map((e, idx) => ({
      'S.No': idx + 1,
      Date: formatAppDate(e.sheet_date),
      Time: formatAppTime(e.created_at),
      Operator: e.collector_name,
      Business: e.business_name,
      'Dealer Name': e.dealer_name,
      'Cash (INR)': e.cash_amount,
      'PhonePe (INR)': e.phonepe_amount,
      'Total Collected (INR)': e.total_collected,
      'Balance Owed (INR)': e.balance_owed ?? 0,
      Status: e.status === 'approved' ? 'Money Received' : 'Pending Handover',
      Note: e.note || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics_Ledger');

    const opLabel =
      filterOperator !== 'ALL'
        ? `_${operatorLeaderboard.find((o) => o.id === filterOperator)?.name || 'User'}`
        : '';
    const bizLabel = selectedBusiness !== 'ALL' ? `_${selectedBusiness.replace(' ', '_')}` : '';
    const filename = isSingleDay
      ? `Analytics_Collections_${formatAppDate(startDate)}${opLabel}${bizLabel}.xlsx`
      : `Analytics_Collections_${startDate}_to_${endDate}${opLabel}${bizLabel}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  const handleDrilldown = (dateStr: string) => {
    onSelectDate(dateStr);
  };

  const getPeriodTitle = () => {
    if (datePreset === 'today') return "Today's Total";
    if (datePreset === 'yesterday') return "Yesterday's Close";
    if (datePreset === '7days') return 'This Week (7D)';
    if (datePreset === '15days') return 'Last 15 Days';
    if (datePreset === '30days') return 'Last 30 Days';
    if (datePreset === 'this_month') return 'This Month (MTD)';
    return `Period (${periodDays}D)`;
  };

  const getShortDateRangeLabel = () => {
    if (startDate === endDate) return formatAppDate(startDate);
    return `${formatAppDate(startDate)} - ${formatAppDate(endDate)}`;
  };

  const hasActiveFilters =
    selectedBusiness !== 'ALL' ||
    filterOperator !== 'ALL' ||
    filterMode !== 'ALL' ||
    searchDealer.trim() !== '' ||
    datePreset !== '7days';

  return (
    <div className="h-[100dvh] w-full min-h-[100dvh] overflow-hidden bg-[#030712] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* 1. TOP RIBBON (BRAND, TABS, ACTIONS) */}
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
              className="px-2.5 py-1 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('dashboard')}
              className="px-2.5 py-1 text-xs font-bold rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('tools')}
              className="px-2.5 py-1 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Tools</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className="px-2.5 py-1 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Operators</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('tasks')}
              className="px-2.5 py-1 text-xs font-bold rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition-colors flex items-center gap-1 ml-1 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>TaskMatrix</span>
            </button>
          </div>
        </div>

        {/* Center: Live Date & Engine Tag */}
        <div className="hidden lg:flex items-center gap-2 font-mono text-xs font-bold bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Analytics Engine • {getShortDateRangeLabel()}</span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Prominent Excel Download Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md hover:shadow-emerald-500/20 cursor-pointer shrink-0"
            title="Download Excel spreadsheet for active filters"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={loadAnalytics}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Language Switcher */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-1.5 py-0.5 text-[11px] font-bold rounded cursor-pointer ${
                language === 'en' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('te')}
              className={`px-1.5 py-0.5 text-[11px] font-bold rounded cursor-pointer ${
                language === 'te' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              తె
            </button>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
            title="Sign Out / Log Out"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* 2. POWER BI FILTER SLICERS TOOLBAR */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-3 sm:px-4 py-2 shrink-0 z-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Dealer Search Slicer */}
            <div className="relative">
              <input
                type="text"
                placeholder="Filter dealer..."
                value={searchDealer}
                onChange={(e) => setSearchDealer(e.target.value)}
                className="w-32 sm:w-36 pl-2.5 pr-6 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
              />
              {searchDealer && (
                <button
                  type="button"
                  onClick={() => setSearchDealer('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Business Filter Pills (ALL / STAR / ARBO PLAST) */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-bold shadow-inner shrink-0">
              <button
                type="button"
                onClick={() => setSelectedBusiness('ALL')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  selectedBusiness === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Show all businesses"
              >
                <span>All Business</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedBusiness('STAR')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                  selectedBusiness === 'STAR'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Filter STAR collections only"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>STAR</span>
                <span className="text-[10px] font-mono opacity-85">
                  ({formatINR(businessTotals.STAR)})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedBusiness('ARBO PLAST')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                  selectedBusiness === 'ARBO PLAST'
                    ? 'bg-teal-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Filter ARBO PLAST collections only"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                <span>ARBO PLAST</span>
                <span className="text-[10px] font-mono opacity-85">
                  ({formatINR(businessTotals['ARBO PLAST'])})
                </span>
              </button>
            </div>

            {/* Operator Dropdown */}
            <div className="relative inline-flex items-center">
              <select
                value={filterOperator}
                onChange={(e) => setFilterOperator(e.target.value)}
                className="appearance-none pl-2.5 pr-7 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 hover:border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-inner"
              >
                <option value="ALL" className="bg-slate-950 text-white">
                  All Operators
                </option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id} className="bg-slate-950 text-white">
                    {op.full_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
            </div>

            {/* Date Filter & Multi/Custom Range Selector */}
            <div className="relative inline-flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-0.5 shadow-inner">
              <div className="flex items-center gap-1 pl-2 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>

              <div className="relative inline-flex items-center">
                <select
                  value={datePreset}
                  onChange={(e) => handleDatePresetChange(e.target.value)}
                  className="appearance-none pl-1 pr-6 py-1 bg-transparent border-0 text-xs font-bold text-emerald-300 hover:text-emerald-200 focus:outline-none cursor-pointer"
                  title="Select date range"
                >
                  <option value="today" className="bg-slate-950 text-white">
                    Today
                  </option>
                  <option value="yesterday" className="bg-slate-950 text-white">
                    Yesterday
                  </option>
                  <option value="7days" className="bg-slate-950 text-white">
                    Last 7 Days
                  </option>
                  <option value="15days" className="bg-slate-950 text-white">
                    Last 15 Days
                  </option>
                  <option value="30days" className="bg-slate-950 text-white">
                    Last 30 Days
                  </option>
                  <option value="this_month" className="bg-slate-950 text-white">
                    This Month
                  </option>
                  <option value="custom" className="bg-slate-950 text-white">
                    Custom Range...
                  </option>
                </select>
                <ChevronDown className="w-3 h-3 text-emerald-400/80 absolute right-1 pointer-events-none" />
              </div>

              {/* Custom Date Pickers (Inline when Custom is selected) */}
              {datePreset === 'custom' && (
                <div className="flex items-center gap-1 pl-1.5 border-l border-slate-800 text-xs">
                  <input
                    type="date"
                    value={startDate}
                    max={endDate}
                    onChange={(e) =>
                      e.target.value && handleCustomDateChange(e.target.value, endDate)
                    }
                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    title="From Date"
                  />
                  <span className="text-slate-500 font-bold">➔</span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) =>
                      e.target.value && handleCustomDateChange(startDate, e.target.value)
                    }
                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    title="To Date"
                  />
                </div>
              )}
            </div>

            {/* Payment Mode Slicer */}
            <div className="relative inline-flex items-center">
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="appearance-none pl-2.5 pr-7 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-slate-200 hover:border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-inner"
              >
                <option value="ALL" className="bg-slate-950 text-white">
                  All Modes
                </option>
                <option value="CASH_ONLY" className="bg-slate-950 text-white">
                  Cash Only
                </option>
                <option value="PHONEPE_ONLY" className="bg-slate-950 text-white">
                  UPI Only
                </option>
                <option value="SPLIT" className="bg-slate-950 text-white">
                  Split Only
                </option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
            </div>

            {/* Clear Filters Reset Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="Reset all filters to defaults"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Right Slicer Info / Quick Range Pill */}
          <div className="hidden xl:flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-emerald-400 font-bold">{filteredEntries.length}</span> records
            <span className="text-slate-600">|</span>
            <span>{getShortDateRangeLabel()}</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD CANVAS */}
      <main className="flex-1 overflow-y-auto w-full px-3 sm:px-4 py-2.5 space-y-3">
        {/* KPI Scorecards Strip (4 Reactive Tiles) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Card 1: Active Period Net Collections */}
          <div
            onClick={() => handleDrilldown(startDate)}
            role="button"
            tabIndex={0}
            title="Click to inspect ledger for this period"
            className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 hover:border-emerald-400 cursor-pointer transition-all flex flex-col justify-between group shadow-sm"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                {getPeriodTitle()}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="font-mono text-lg sm:text-xl font-black text-white mt-1">
              {formatINR(filteredTotal)}
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold mt-1 text-slate-400">
              <span>{filteredEntries.length} collections</span>
              {periodDays > 1 ? (
                <span className="text-emerald-300 font-mono">
                  Avg {formatINR(filteredTotal / periodDays)}/d
                </span>
              ) : (
                variancePercent !== 0 && (
                  <span className={variancePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {variancePercent >= 0 ? `+${variancePercent}%` : `${variancePercent}%`} vs yday
                  </span>
                )
              )}
            </div>
          </div>

          {/* Card 2: Cash in-hand */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <CashBadge size="xs" />
                <span>Cash in-hand</span>
              </span>
              <span className="text-emerald-400 font-mono text-xs">{cashPercent}%</span>
            </div>
            <div className="font-mono text-lg sm:text-xl font-black text-slate-100 mt-1">
              {formatINR(filteredCash)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
              <span>{filteredEntries.filter((e) => e.cash_amount > 0).length} cash entries</span>
              <span className="text-emerald-400 font-mono">{cashPercent}% share</span>
            </div>
          </div>

          {/* Card 3: UPI Digital */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <UpiBadge size="xs" />
                <span>UPI Digital</span>
              </span>
              <span className="text-purple-400 font-mono text-xs">{phonePePercent}%</span>
            </div>
            <div className="font-mono text-lg sm:text-xl font-black text-slate-100 mt-1">
              {formatINR(filteredPhonePe)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
              <span>{filteredEntries.filter((e) => e.phonepe_amount > 0).length} UPI entries</span>
              <span className="text-purple-400 font-mono">{phonePePercent}% share</span>
            </div>
          </div>

          {/* Card 4: Business Split Summary */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                <span>Business Split</span>
              </span>
              <span className="text-teal-400 font-mono text-xs">
                {selectedBusiness !== 'ALL' ? selectedBusiness : 'Dual Hub'}
              </span>
            </div>
            <div className="font-mono text-xs sm:text-sm font-black text-slate-100 mt-1 flex items-center justify-between">
              <span className="text-emerald-400">STAR: {formatINR(filteredStar)}</span>
              <span className="text-teal-400">ARBO: {formatINR(filteredArbo)}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
              <span>{starPercent}% STAR</span>
              <span>{arboPercent}% ARBO PLAST</span>
            </div>
          </div>
        </div>

        {/* 2x2 Analytics Tiles Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Tile 1: Payment Mode Split */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                Payment Mode Split ({getShortDateRangeLabel()})
              </span>
              <span className="font-mono font-bold text-xs text-slate-300">
                {formatINR(filteredTotal)}
              </span>
            </div>

            {/* Split Progress Bar */}
            <div className="my-2.5 w-full h-3.5 rounded-full overflow-hidden bg-slate-950 flex p-0.5 border border-slate-800">
              <div
                style={{ width: `${phonePePercent}%` }}
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
              />
              <div
                style={{ width: `${cashPercent}%` }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-950 border border-purple-500/20">
                <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1.5">
                  <UpiBadge size="xs" />
                  <span>UPI ({phonePePercent}%)</span>
                </span>
                <div className="font-mono font-bold text-sm text-white mt-0.5">
                  {formatINR(filteredPhonePe)}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-emerald-500/20">
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1.5">
                  <CashBadge size="xs" />
                  <span>Cash ({cashPercent}%)</span>
                </span>
                <div className="font-mono font-bold text-sm text-white mt-0.5">
                  {formatINR(filteredCash)}
                </div>
              </div>
            </div>
          </div>

          {/* Tile 2: Dual Business Distribution */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Dual Business Distribution ({getShortDateRangeLabel()})
              </span>
              <span className="font-mono font-bold text-xs text-slate-300">
                {formatINR(starArboCombined)}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="my-2.5 w-full h-3.5 rounded-full overflow-hidden bg-slate-950 flex p-0.5 border border-slate-800">
              <div
                style={{
                  width: `${starArboCombined > 0 ? starPercent : 50}%`,
                }}
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              />
              <div
                style={{
                  width: `${starArboCombined > 0 ? arboPercent : 50}%`,
                }}
                className="h-full rounded-full bg-teal-400 transition-all duration-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-950 border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-400">STAR Wholesale</span>
                  <span className="text-[10px] font-mono text-slate-400">{starPercent}%</span>
                </div>
                <div className="font-mono font-bold text-sm text-white mt-0.5">
                  {formatINR(filteredStar)}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-teal-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-teal-400">ARBO PLAST</span>
                  <span className="text-[10px] font-mono text-slate-400">{arboPercent}%</span>
                </div>
                <div className="font-mono font-bold text-sm text-white mt-0.5">
                  {formatINR(filteredArbo)}
                </div>
              </div>
            </div>
          </div>

          {/* Tile 3: Rolling Trend Chart */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Daily Trend ({trendData.length} Days)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Tap bar to inspect ledger</span>
            </div>

            <div
              className="grid gap-1 items-end h-28 pt-3"
              style={{
                gridTemplateColumns: `repeat(${trendData.length}, minmax(0, 1fr))`,
              }}
            >
              {trendData.map((d) => {
                const heightPercent =
                  d.total > 0
                    ? Math.max(Math.round((d.total / maxDailyTotal) * 100), 8)
                    : 4;
                const isToday = d.date === todayIST;

                return (
                  <div
                    key={d.date}
                    onClick={() => handleDrilldown(d.date)}
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                    title={`${formatAppDate(d.date)}: ${formatINR(d.total)} (${d.count} entries)\nCash: ${formatINR(d.cash)} | UPI: ${formatINR(d.phonepe)}\nClick to inspect in Daily Invoice`}
                  >
                    <div className="w-full bg-slate-950 rounded-t h-20 flex items-end justify-center p-0.5">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t transition-all group-hover:scale-105 ${
                          isToday
                            ? 'bg-emerald-400 shadow-emerald-500/30 shadow-sm'
                            : d.total > 0
                            ? 'bg-slate-600 group-hover:bg-teal-400'
                            : 'bg-slate-800/40'
                        }`}
                      />
                    </div>
                    <span className="text-[8px] font-mono text-slate-400 truncate max-w-full">
                      {d.date.split('-').slice(1).join('/')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tile 4: Operator Performance Leaderboard */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                Operator Performance ({getShortDateRangeLabel()})
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {filterOperator !== 'ALL' ? 'Filtered Operator' : 'All Operators'}
              </span>
            </div>

            <div className="space-y-1.5 py-1 max-h-48 overflow-y-auto pr-1">
              {operatorLeaderboard.filter((o) => o.total > 0 || filterOperator === o.id).length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No operator collections recorded for this filter
                </div>
              ) : (
                operatorLeaderboard
                  .filter((o) => o.total > 0 || filterOperator === o.id)
                  .map((op) => {
                    const isSelected = filterOperator === op.id;
                    const sharePercent =
                      filteredTotal > 0 ? Math.round((op.total / filteredTotal) * 100) : 0;

                    return (
                      <div
                        key={op.id}
                        onClick={() => setFilterOperator(isSelected ? 'ALL' : op.id)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/50 shadow-sm'
                            : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                        }`}
                        title={`Click to filter by ${op.name}`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-semibold flex items-center gap-1.5 ${
                              isSelected ? 'text-emerald-300 font-bold' : 'text-slate-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-emerald-400' : 'bg-slate-500'
                              }`}
                            />
                            {op.name}
                            {isSelected && (
                              <span className="text-[10px] text-emerald-400 font-mono">(Active)</span>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500">
                              {sharePercent}%
                            </span>
                            <span className="font-mono font-bold text-emerald-400">
                              {formatINR(op.total)}
                            </span>
                          </div>
                        </div>
                        {/* Mini Share Bar */}
                        <div className="w-full bg-slate-900 rounded-full h-1 mt-1.5 overflow-hidden">
                          <div
                            style={{ width: `${Math.round((op.total / maxOpTotal) * 100)}%` }}
                            className={`h-full rounded-full ${
                              isSelected ? 'bg-emerald-400' : 'bg-slate-600'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        {/* Empty State Banner (When 0 records match the active filter) */}
        {filteredEntries.length === 0 && !loading && (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center flex flex-col items-center justify-center my-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              <Filter className="w-6 h-6 text-slate-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                No Collections Found for {getShortDateRangeLabel()}
              </h3>
              <p className="text-xs text-slate-400 max-w-md">
                No records match the active filter criteria (Operator, Business, Mode, or Date Range).
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {selectedBusiness !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedBusiness('ALL')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs hover:bg-emerald-500/25 transition-all cursor-pointer"
                >
                  View All Business
                </button>
              )}
              {filterOperator !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setFilterOperator('ALL')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-xs hover:bg-indigo-500/25 transition-all cursor-pointer"
                >
                  View All Operators
                </button>
              )}
              {(datePreset === 'today' || datePreset === 'yesterday' || datePreset === '7days') && (
                <button
                  type="button"
                  onClick={() => handleDatePresetChange('15days')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold text-xs hover:bg-cyan-500/25 transition-all cursor-pointer"
                >
                  Expand to Last 15 Days
                </button>
              )}
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 4. STATUS BAR (Desktop only) */}
      <footer className="hidden md:flex h-7 bg-slate-950 border-t border-slate-800/80 px-3 sm:px-4 items-center justify-between text-[11px] text-slate-400 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Analytics Engine Active</span>
          <span className="text-slate-600">•</span>
          <span>
            Range: {startDate} to {endDate} ({periodDays}d)
          </span>
          {filterOperator !== 'ALL' && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400">
                Operator:{' '}
                {operatorLeaderboard.find((o) => o.id === filterOperator)?.name || filterOperator}
              </span>
            </>
          )}
          {selectedBusiness !== 'ALL' && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-teal-400">Business: {selectedBusiness}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-slate-300">Net Volume: {formatINR(filteredTotal)}</span>
          <span className="text-slate-600">•</span>
          <span className="font-mono text-slate-400">{filteredEntries.length} records</span>
        </div>
      </footer>

      {/* 5. MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-md px-3 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around shrink-0 z-30">
        <button
          type="button"
          onClick={() => onNavigateTab('daily')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Daily</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('dashboard')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-purple-400 bg-purple-500/15 border border-purple-500/30 transition-all shadow-sm cursor-pointer"
        >
          <BarChart3 className="w-4 h-4 text-purple-400" />
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
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer"
        >
          <Zap className="w-4 h-4 text-indigo-400" />
          <span>TaskMatrix</span>
        </button>
      </nav>
    </div>
  );
};

export default AdminDashboardPage;
