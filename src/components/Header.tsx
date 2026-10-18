import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../lib/i18n';
import { LogOut, Wifi, WifiOff, Shield, User, BarChart3, Calendar, Users } from 'lucide-react';

interface HeaderProps {
  currentTab?: 'daily' | 'dashboard' | 'users';
  onTabChange?: (tab: 'daily' | 'dashboard' | 'users') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab = 'daily', onTabChange }) => {
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
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 transition-all duration-200">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 p-0.5 shadow-glow-brand flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-bold text-emerald-400 text-lg tracking-wider">
                ₹
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  {t('appTitle')}
                </span>
                {/* Network Status Badge */}
                <span
                  title={isOnline ? 'Online' : 'Offline'}
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    isOnline
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                  }`}
                >
                  {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  <span className="hidden sm:inline">{isOnline ? 'Live' : 'Offline'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {t('brandTag')} • {profile?.full_name || (role === 'admin' ? 'Admin' : 'Operator')}
              </p>
            </div>
          </div>

          {/* Right Controls: Language Toggle & User Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher Pill */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  language === 'en'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('te')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  language === 'te'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                తెలుగు
              </button>
            </div>

            {/* Role Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
              {role === 'admin' ? (
                <Shield className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <User className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{role === 'admin' ? 'Admin' : profile?.full_name || 'Operator'}</span>
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={signOut}
              title={t('signOut')}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition-all duration-150"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        {role === 'admin' && onTabChange && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center gap-1 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => onTabChange('daily')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'daily'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {t('dailyView')}
            </button>
            <button
              type="button"
              onClick={() => onTabChange('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              {t('dashboard')}
            </button>
            <button
              type="button"
              onClick={() => onTabChange('users')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'users'
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              {t('userManagement')}
            </button>
          </div>
        )}

      </div>
    </header>
  );
};
