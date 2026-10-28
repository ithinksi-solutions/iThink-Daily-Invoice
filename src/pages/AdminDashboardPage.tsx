import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../lib/i18n';
import { formatAppDate, formatINR, getCurrentISTDateString, toISODateString } from '../lib/formatters';
import { CashBadge, UpiBadge } from '../components/PaymentLogos';
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
  Shield,
  Activity,
  CheckCircle2,
  Wrench,
} from 'lucide-react';

interface DashboardProps {
  onNavigateTab: (tab: 'daily' | 'dashboard' | 'tools' | 'users' | 'tasks') => void;
  onSelectDate: (dateStr: string) => void;
}

export const AdminDashboardPage: React.FC<DashboardProps> = ({ onNavigateTab, onSelectDate }) => {
  const { signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<{
    todayTotal: number;
    yesterdayTotal: number;
    variancePercent: number;
    thisWeekTotal: number;
    thisMonthTotal: number;
    cashShare: number;
    phonePeShare: number;
    starTotal: number;
    arboTotal: number;
    operatorTotals: { [name: string]: number };
    dailyTrend: { date: string; total: number; cash: number; phonepe: number }[];
  }>({
    todayTotal: 0,
    yesterdayTotal: 0,
    variancePercent: 0,
    thisWeekTotal: 0,
    thisMonthTotal: 0,
    cashShare: 0,
    phonePeShare: 0,
    starTotal: 0,
    arboTotal: 0,
    operatorTotals: {},
    dailyTrend: [],
  });

  const todayIST = getCurrentISTDateString();

  const loadAnalytics = useCallback(async () => {
      setLoading(true);
      try {
        const { data: sheets } = await supabase
          .from('daily_sheets')
          .select('id, sheet_date, collector_id');

        const { data: entries } = await supabase
          .from('entries')
          .select('id, collector_id, sheet_id, cash_amount, phonepe_amount, total_collected, business_name, created_at')
          .eq('is_deleted', false);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name');

        const opMap: { [id: string]: string } = {};
        profiles?.forEach((p) => {
          opMap[p.id] = p.full_name;
        });

        const sheetDateMap: { [sheetId: string]: string } = {};
        sheets?.forEach((s) => {
          sheetDateMap[s.id] = s.sheet_date;
        });

        const todayDate = new Date(todayIST);
        const yDate = new Date(todayDate);
        yDate.setDate(yDate.getDate() - 1);
        const yesterdayIST = toISODateString(yDate);

        let todaySum = 0;
        let yesterdaySum = 0;
        let weekSum = 0;
        let monthSum = 0;
        let cashSum = 0;
        let phonePeSum = 0;
        let starSum = 0;
        let arboSum = 0;
        const opTotals: { [name: string]: number } = {};

        const trendMap: { [date: string]: { total: number; cash: number; phonepe: number } } = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(todayDate);
          d.setDate(d.getDate() - i);
          const ds = toISODateString(d);
          trendMap[ds] = { total: 0, cash: 0, phonepe: 0 };
        }

        const nowMonth = todayDate.getMonth();
        const nowYear = todayDate.getFullYear();

        entries?.forEach((entry: any) => {
          const date = sheetDateMap[entry.sheet_id] || entry.created_at.split('T')[0];
          const amount = Number(entry.total_collected) || 0;
          const cash = Number(entry.cash_amount) || 0;
          const phonepe = Number(entry.phonepe_amount) || 0;
          const opName = opMap[entry.collector_id] || 'Operator';

          if (date === todayIST) {
            todaySum += amount;
            cashSum += cash;
            phonePeSum += phonepe;
            if (entry.business_name === 'STAR') starSum += amount;
            if (entry.business_name === 'ARBO PLAST') arboSum += amount;
          }

          if (date === yesterdayIST) {
            yesterdaySum += amount;
          }

          const eDate = new Date(date);
          const diffDays = Math.floor((todayDate.getTime() - eDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 7) {
            weekSum += amount;
          }

          if (eDate.getMonth() === nowMonth && eDate.getFullYear() === nowYear) {
            monthSum += amount;
          }

          if (trendMap[date]) {
            trendMap[date].total += amount;
            trendMap[date].cash += cash;
            trendMap[date].phonepe += phonepe;
          }

          opTotals[opName] = (opTotals[opName] || 0) + amount;
        });

        let variance = 0;
        if (yesterdaySum > 0) {
          variance = Math.round(((todaySum - yesterdaySum) / yesterdaySum) * 100);
        } else if (todaySum > 0) {
          variance = 100;
        }

        const todayCombined = cashSum + phonePeSum;
        const cShare = todayCombined > 0 ? Math.round((cashSum / todayCombined) * 100) : 0;
        const pShare = todayCombined > 0 ? 100 - cShare : 0;

        const trendArray = Object.entries(trendMap).map(([date, d]) => ({
          date,
          total: d.total,
          cash: d.cash,
          phonepe: d.phonepe,
        }));

        setMetrics({
          todayTotal: todaySum,
          yesterdayTotal: yesterdaySum,
          variancePercent: variance,
          thisWeekTotal: weekSum,
          thisMonthTotal: monthSum,
          cashShare: cShare,
          phonePeShare: pShare,
          starTotal: starSum,
          arboTotal: arboSum,
          operatorTotals: opTotals,
          dailyTrend: trendArray,
        });
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
  }, [todayIST]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleDrilldown = (dateStr: string) => {
    onSelectDate(dateStr);
  };

  return (
    <div className="h-[100dvh] w-full min-h-[100dvh] overflow-hidden bg-[#030712] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* 1. POWER BI TOP RIBBON (48PX + SAFE AREA) */}
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
              <span>Daily</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('dashboard')}
              className="px-2.5 py-1 text-xs font-bold rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-sm flex items-center gap-1"
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
          </div>
        </div>

        {/* Center: Live Date Tag */}
        <div className="hidden lg:flex items-center gap-2 font-mono text-xs font-bold bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Analytics Engine • {formatAppDate(todayIST)}</span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            type="button"
            onClick={loadAnalytics}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Language Switcher */}
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

      {/* 2. MAIN POWER BI DASHBOARD CANVAS (ZERO PAGE OVERFLOW) */}
      <main className="flex-1 overflow-y-auto w-full px-3 sm:px-4 py-2.5 space-y-3">
        
        {/* KPI Scorecards Strip (Height ~64px) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Card 1: Today */}
          <div
            onClick={() => handleDrilldown(todayIST)}
            role="button"
            tabIndex={0}
            title="Inspect Today's Ledger"
            className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 hover:border-emerald-400 cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Today's Total</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="font-mono text-lg sm:text-xl font-black text-white mt-1">
              {formatINR(metrics.todayTotal)}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold mt-1">
              {metrics.variancePercent >= 0 ? (
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +{metrics.variancePercent}% vs yesterday
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" /> {metrics.variancePercent}% vs yesterday
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Yesterday */}
          <div
            onClick={() => {
              const y = new Date(todayIST);
              y.setDate(y.getDate() - 1);
              handleDrilldown(toISODateString(y));
            }}
            role="button"
            tabIndex={0}
            title="Inspect Yesterday's Ledger"
            className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Yesterday Close</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="font-mono text-lg sm:text-xl font-black text-slate-200 mt-1">
              {formatINR(metrics.yesterdayTotal)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1">Previous Day Verified</span>
          </div>

          {/* Card 3: This Week */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">This Week (7D)</span>
            <div className="font-mono text-lg sm:text-xl font-black text-slate-200 mt-1">
              {formatINR(metrics.thisWeekTotal)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1">7-Day Rolling Volume</span>
          </div>

          {/* Card 4: This Month */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">This Month (MTD)</span>
            <div className="font-mono text-lg sm:text-xl font-black text-slate-200 mt-1">
              {formatINR(metrics.thisMonthTotal)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1">Month-to-Date Volume</span>
          </div>
        </div>

        {/* 2x2 Analytics Tiles Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          
          {/* Tile 1: Payment Mode Split */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                Payment Mode Split (Today)
              </span>
              <span className="font-mono font-bold text-xs text-slate-300">
                {formatINR(metrics.todayTotal)}
              </span>
            </div>

            {/* Split Progress Bar */}
            <div className="my-2.5 w-full h-3.5 rounded-full overflow-hidden bg-slate-950 flex p-0.5 border border-slate-800">
              <div
                style={{ width: `${metrics.phonePeShare}%` }}
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
              />
              <div
                style={{ width: `${metrics.cashShare}%` }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-950 border border-purple-500/20">
                <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1.5">
                  <UpiBadge size="xs" />
                  <span>UPI ({metrics.phonePeShare}%)</span>
                </span>
                <div className="font-mono font-bold text-sm text-white mt-0.5">
                  {formatINR(metrics.todayTotal * (metrics.phonePeShare / 100))}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-emerald-500/20">
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1.5">
                  <CashBadge size="xs" />
                  <span>Cash ({metrics.cashShare}%)</span>
                </span>
                <div className="font-mono font-bold text-sm text-white mt-0.5">
                  {formatINR(metrics.todayTotal * (metrics.cashShare / 100))}
                </div>
              </div>
            </div>
          </div>

          {/* Tile 2: Dual Business Distribution */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Dual Business Distribution (STAR & ARBO)
              </span>
              <span className="font-mono font-bold text-xs text-slate-300">
                {formatINR(metrics.starTotal + metrics.arboTotal)}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="my-2.5 w-full h-3.5 rounded-full overflow-hidden bg-slate-950 flex p-0.5 border border-slate-800">
              <div
                style={{
                  width: `${
                    metrics.starTotal + metrics.arboTotal > 0
                      ? Math.round((metrics.starTotal / (metrics.starTotal + metrics.arboTotal)) * 100)
                      : 50
                  }%`,
                }}
                className="h-full rounded-full bg-emerald-500"
              />
              <div
                style={{
                  width: `${
                    metrics.starTotal + metrics.arboTotal > 0
                      ? Math.round((metrics.arboTotal / (metrics.starTotal + metrics.arboTotal)) * 100)
                      : 50
                  }%`,
                }}
                className="h-full rounded-full bg-teal-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-950 border border-emerald-500/20">
                <span className="text-[10px] font-bold text-emerald-400">STAR Wholesale</span>
                <div className="font-mono font-bold text-sm text-white mt-0.5">
                  {formatINR(metrics.starTotal)}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-teal-500/20">
                <span className="text-[10px] font-bold text-teal-400">ARBO PLAST</span>
                <div className="font-mono font-bold text-sm text-white mt-0.5">
                  {formatINR(metrics.arboTotal)}
                </div>
              </div>
            </div>
          </div>

          {/* Tile 3: 7-Day Trend Chart */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                7-Day Rolling Trend
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Tap day to inspect</span>
            </div>

            <div className="grid grid-cols-7 gap-1 items-end h-24 pt-3">
              {metrics.dailyTrend.map((d) => {
                const maxVal = Math.max(...metrics.dailyTrend.map((t) => t.total), 1);
                const heightPercent = Math.max(Math.round((d.total / maxVal) * 100), 10);
                const isToday = d.date === todayIST;

                return (
                  <div
                    key={d.date}
                    onClick={() => handleDrilldown(d.date)}
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                  >
                    <div className="w-full bg-slate-950 rounded-t h-16 flex items-end justify-center p-0.5">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t transition-all ${
                          isToday ? 'bg-emerald-400' : 'bg-slate-700 group-hover:bg-teal-400'
                        }`}
                        title={`${d.date}: ${formatINR(d.total)}`}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 truncate">
                      {d.date.split('-').slice(1).join('/')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tile 4: Operator Leaderboard */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                Operator Performance (Cumulative)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Real-time ledger</span>
            </div>

            <div className="space-y-1.5 py-1">
              {Object.entries(metrics.operatorTotals).length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500">No operator entries yet</div>
              ) : (
                Object.entries(metrics.operatorTotals).map(([name, sum]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80 text-xs"
                  >
                    <span className="font-semibold text-slate-300">{name}</span>
                    <span className="font-mono font-bold text-emerald-400">{formatINR(sum)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </main>

      {/* 3. STATUS BAR (28PX - Desktop only) */}
      <footer className="hidden md:flex h-7 bg-slate-950 border-t border-slate-800/80 px-3 sm:px-4 items-center justify-between text-[11px] text-slate-400 shrink-0 z-20">
        <span>Analytics Engine Active</span>
        <span className="font-mono text-slate-400">7-Day Rolling Volume: {formatINR(metrics.thisWeekTotal)}</span>
      </footer>

      {/* 4. MOBILE BOTTOM NAVIGATION (52PX + SAFE AREA - Mobile only) */}
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
      </nav>

    </div>
  );
};

export default AdminDashboardPage;
