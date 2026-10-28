import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../lib/i18n';
import { LogOut, Wifi, WifiOff, Shield, User, BarChart3, Calendar, Users } from 'lucide-react';

interface HeaderProps {
  currentTab?: 'daily' | 'dashboard' | 'users';
  onTabChange?: (tab: 'daily' | 'dashboard' | 'users') => void;
  onOpenTasks?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab = 'daily', onTabChange, onOpenTasks }) => {
  const { profile, role, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="min-h-[48px] safe-pt border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-30">
      
      {/* Brand & 1-Line Title */}
      <div className="flex items-center gap-2.5 min-w-0 py-1.5">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 text-xs shrink-0">
          ₹
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <span className="font-extrabold text-sm sm:text-base text-white tracking-tight whitespace-nowrap truncate">
            {t('appTitle')}
          </span>

          {/* User Role Tag */}
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-300 whitespace-nowrap shrink-0">
            {role === 'admin' ? 'Admin' : profile?.full_name || 'Operator'}
          </span>
        </div>
      </div>

      {/* Right Controls: Compact Language + Signout */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 py-1">
        {/* TaskMatrix OS Switcher Pill */}
        {onOpenTasks && (
          <button
            type="button"
            onClick={onOpenTasks}
            className="min-h-[36px] px-2.5 py-1 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-950 to-slate-900 border border-indigo-500/40 text-cyan-300 hover:text-white hover:border-cyan-400 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Open TaskMatrix OS"
          >
            <span className="text-cyan-400">⚡</span>
            <span className="hidden xs:inline sm:inline">Tasks</span>
          </button>
        )}

        {/* Language Switcher Pill */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-0.5 flex items-center shadow-inner">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`min-h-[36px] px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              language === 'en'
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('te')}
            className={`min-h-[36px] px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              language === 'te'
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            తె
          </button>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={signOut}
          title={t('signOut')}
          className="min-h-[36px] px-2.5 py-1 text-xs font-bold rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden xs:inline sm:inline">Logout</span>
        </button>
      </div>

    </header>
  );
};
