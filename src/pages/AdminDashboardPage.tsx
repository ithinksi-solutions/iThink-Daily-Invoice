import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import { Header } from '../components/Header';
import { formatAppDate, formatINR, getCurrentISTDateString, toISODateString } from '../lib/formatters';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Sparkles,
  Building2,
  Users,
  Smartphone,
  Banknote,
  ArrowRight,
} from 'lucide-react';

interface DashboardProps {
  onNavigateTab: (tab: 'daily' | 'dashboard' | 'users') => void;
  onSelectDate: (dateStr: string) => void;
}

export const AdminDashboardPage: React.FC<DashboardProps> = ({ onNavigateTab, onSelectDate }) => {
  const { t } = useLanguage();

  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<{
    todayTotal: number;
    yesterdayTotal: number;
    variancePercent: number;
    thisWeekTotal: number;
    thisMonthTotal: number;
    lastMonthTotal: number;
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
    lastMonthTotal: 0,
    cashShare: 0,
    phonePeShare: 0,
    starTotal: 0,
    arboTotal: 0,
    operatorTotals: {},
    dailyTrend: [],
  });

  const todayIST = getCurrentISTDateString();

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        // Fetch last 35 days of sheets & entries
        const { data: sheets } = await supabase
          .from('daily_sheets')
          .select('id, sheet_date, collector_id');

        const { data: entries } = await supabase
          .from('entries')
          .select('*')
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

        // Compute Dates
        const todayDate = new Date(todayIST);
        const yDate = new Date(todayDate);
        yDate.setDate(yDate.getDate() - 1);
        const yesterdayIST = toISODateString(yDate);

        let todaySum = 0;
        let yesterdaySum = 0;
        let weekSum = 0;
        let monthSum = 0;
        let lastMonthSum = 0;
        let cashSum = 0;
        let phonePeSum = 0;
        let starSum = 0;
        let arboSum = 0;
        const opTotals: { [name: string]: number } = {};

        // 7-day trend bucket
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
          const amount = entry.total_collected || 0;
          const cash = entry.cash_amount || 0;
          const phonepe = entry.phonepe_amount || 0;
          const opName = opMap[entry.collector_id] || 'Operator';

          // Business totals
          if (entry.business_name === 'STAR') starSum += amount;
          if (entry.business_name === 'ARBO PLAST') arboSum += amount;

          // Today & Yesterday
          if (date === todayIST) {
            todaySum += amount;
            cashSum += cash;
            phonePeSum += phonepe;
            opTotals[opName] = (opTotals[opName] || 0) + amount;
          }
          if (date === yesterdayIST) {
            yesterdaySum += amount;
          }

          // Trend
          if (trendMap[date]) {
            trendMap[date].total += amount;
            trendMap[date].cash += cash;
            trendMap[date].phonepe += phonepe;
          }

          // Month
          const eDate = new Date(date);
          if (eDate.getMonth() === nowMonth && eDate.getFullYear() === nowYear) {
            monthSum += amount;
          }
          // Last Month
          const lastM = nowMonth === 0 ? 11 : nowMonth - 1;
          const lastMY = nowMonth === 0 ? nowYear - 1 : nowYear;
          if (eDate.getMonth() === lastM && eDate.getFullYear() === lastMY) {
            lastMonthSum += amount;
          }
        });

        // Variance %
        let variance = 0;
        if (yesterdaySum > 0) {
          variance = ((todaySum - yesterdaySum) / yesterdaySum) * 100;
        } else if (todaySum > 0) {
          variance = 100;
        }

        const dailyTrend = Object.entries(trendMap).map(([dStr, val]) => ({
          date: dStr,
          total: val.total,
          cash: val.cash,
          phonepe: val.phonepe,
        }));

        const totalCashPhonePe = cashSum + phonePeSum || 1;
        const cashShare = Math.round((cashSum / totalCashPhonePe) * 100);
        const phonePeShare = 100 - cashShare;

        setMetrics({
          todayTotal: todaySum,
          yesterdayTotal: yesterdaySum,
          variancePercent: parseFloat(variance.toFixed(1)),
          thisWeekTotal: Object.values(trendMap).reduce((a, b) => a + b.total, 0),
          thisMonthTotal: monthSum,
          lastMonthTotal: lastMonthSum,
          cashShare,
          phonePeShare,
          starTotal: starSum,
          arboTotal: arboSum,
          operatorTotals: opTotals,
          dailyTrend,
        });
      } catch (err) {
        console.error('Analytics load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [todayIST]);

  const handleDrilldown = (dateStr: string) => {
    onSelectDate(dateStr);
    onNavigateTab('daily');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-24">
      <Header currentTab="dashboard" onTabChange={onNavigateTab} />

      <main className="max-w-7xl 2xl:max-w-[1500px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5 space-y-6">
        
        {/* Dashboard Title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Executive Analytics & Performance
            </h2>
            <p className="text-xs text-slate-400">
              Live intelligence across STAR and ARBO PLAST collections
            </p>
          </div>
          <div className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            {formatAppDate(todayIST)}
          </div>
        </div>

        {/* 4 Executive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Today */}
          <div
            onClick={() => handleDrilldown(todayIST)}
            className="cursor-pointer rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 p-4 shadow-glow-brand hover:border-emerald-500 transition-all group"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
              <span>{t('today')}</span>
              <ArrowRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="font-mono text-2xl font-black text-white">
              {formatINR(metrics.todayTotal)}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {metrics.variancePercent >= 0 ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{metrics.variancePercent}% {t('varianceVsYesterday')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {metrics.variancePercent}% {t('varianceVsYesterday')}
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
            className="cursor-pointer rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-glass hover:border-slate-700 transition-all group"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
              <span>{t('yesterday')}</span>
              <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="font-mono text-2xl font-black text-slate-200">
              {formatINR(metrics.yesterdayTotal)}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Previous Day Close</p>
          </div>

          {/* Card 3: This Week */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-glass">
            <span className="text-xs text-slate-400 font-semibold block mb-1">{t('thisWeek')}</span>
            <div className="font-mono text-2xl font-black text-slate-200">
              {formatINR(metrics.thisWeekTotal)}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Past 7 Days Rolling</p>
          </div>

          {/* Card 4: This Month */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-glass">
            <span className="text-xs text-slate-400 font-semibold block mb-1">{t('thisMonth')}</span>
            <div className="font-mono text-2xl font-black text-slate-200">
              {formatINR(metrics.thisMonthTotal)}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Month-to-Date Cumulative</p>
          </div>
        </div>

        {/* Visual Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Chart 1: Payment Mode Split (Cash vs PhonePe) */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-glass space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-400" />
                Payment Mode Breakdown (Today)
              </h3>
              <span className="text-xs font-mono text-slate-400 font-bold">
                {formatINR(metrics.todayTotal)}
              </span>
            </div>

            {/* Split Progress Bar */}
            <div className="w-full h-4 rounded-full overflow-hidden bg-slate-950 flex p-0.5 border border-slate-800">
              <div
                style={{ width: `${metrics.phonePeShare}%` }}
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                title={`PhonePe: ${metrics.phonePeShare}%`}
              ></div>
              <div
                style={{ width: `${metrics.cashShare}%` }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                title={`Cash: ${metrics.cashShare}%`}
              ></div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-slate-950 border border-purple-500/20">
                <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  PhonePe / UPI ({metrics.phonePeShare}%)
                </div>
                <div className="font-mono text-lg font-black text-white mt-1">
                  {formatINR(metrics.todayTotal * (metrics.phonePeShare / 100))}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/20">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Cash ({metrics.cashShare}%)
                </div>
                <div className="font-mono text-lg font-black text-white mt-1">
                  {formatINR(metrics.todayTotal * (metrics.cashShare / 100))}
                </div>
              </div>
            </div>
          </div>

          {/* Chart 2: Business Breakdown (STAR vs ARBO PLAST) */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-glass space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Dual-Business Distribution
              </h3>
              <span className="text-xs text-slate-400 font-mono">Cumulative</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  STAR
                </div>
                <div className="font-mono text-xl font-extrabold text-white mt-2">
                  {formatINR(metrics.starTotal)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Primary Wholesale Line</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
                  <Building2 className="w-4 h-4" />
                  ARBO PLAST
                </div>
                <div className="font-mono text-xl font-extrabold text-white mt-2">
                  {formatINR(metrics.arboTotal)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Plastics & Polymers</p>
              </div>
            </div>

            {/* Operator Tally */}
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Today's Operator Collections
              </span>
              <div className="space-y-1.5">
                {Object.entries(metrics.operatorTotals).map(([opName, opTotal]) => (
                  <div
                    key={opName}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                  >
                    <span className="font-bold text-white flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      {opName}
                    </span>
                    <span className="font-mono font-extrabold text-emerald-400">
                      {formatINR(opTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Trend Chart with Tap-to-Drilldown */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-glass space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-white">7-Day Collection History</h3>
              <p className="text-xs text-slate-400">Tap any day bar to open its complete daily register</p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-4">
            {metrics.dailyTrend.map((day) => {
              const maxVal = Math.max(...metrics.dailyTrend.map((d) => d.total), 1);
              const heightPercent = Math.max(Math.round((day.total / maxVal) * 100), 12);
              const isToday = day.date === todayIST;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => handleDrilldown(day.date)}
                  className="group flex flex-col items-center gap-2 focus:outline-none"
                >
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-emerald-400 transition-colors">
                    {formatINR(day.total, false).replace('₹ ', '')}
                  </span>

                  <div className="w-full h-36 bg-slate-950 rounded-xl p-1 flex items-end border border-slate-800 group-hover:border-emerald-500 transition-colors">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-lg transition-all duration-300 ${
                        isToday
                          ? 'bg-gradient-to-t from-emerald-600 via-emerald-400 to-teal-300 shadow-glow-brand'
                          : 'bg-gradient-to-t from-slate-700 to-slate-500 group-hover:from-emerald-700 group-hover:to-emerald-500'
                      }`}
                    ></div>
                  </div>

                  <span className={`text-[11px] font-bold ${isToday ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {day.date.split('-')[2]} {formatAppDate(day.date).split('-')[1]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};
