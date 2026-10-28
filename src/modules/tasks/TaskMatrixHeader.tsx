import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, LogOut, CheckCircle2, Shield, User, LayoutGrid, Clock } from 'lucide-react';

interface TaskMatrixHeaderProps {
  currentView: 'tasks' | 'vault';
  onViewChange?: (view: 'tasks' | 'vault') => void;
  onBackToBilling?: () => void;
  isAdmin: boolean;
}

export const TaskMatrixHeader: React.FC<TaskMatrixHeaderProps> = ({
  currentView,
  onViewChange,
  onBackToBilling,
  isAdmin,
}) => {
  const { profile, signOut } = useAuth();

  return (
    <header className="min-h-[56px] border-b border-indigo-500/20 bg-[#07090E]/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-30 shadow-lg shadow-indigo-950/20">
      
      {/* Brand & Mode Indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/30 shrink-0">
          <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center font-black text-cyan-300 text-xs tracking-wider">
            ⚡
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="flex flex-col">
            <span className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-1.5 whitespace-nowrap">
              TaskMatrix <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">OS</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider">
              {isAdmin ? 'Enterprise Operations Command' : 'Frontline Task Terminal'}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Mode Switcher: Tasks vs Credential Vault */}
      {isAdmin && onViewChange && (
        <div className="hidden sm:flex items-center bg-[#0F1422] border border-indigo-500/20 rounded-xl p-1 shadow-inner">
          <button
            type="button"
            onClick={() => onViewChange('tasks')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              currentView === 'tasks'
                ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Task Operations</span>
          </button>
          <button
            type="button"
            onClick={() => onViewChange('vault')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              currentView === 'vault'
                ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>10-User Credential Vault</span>
          </button>
        </div>
      )}

      {/* Right Controls: Switch to Billing Ledger + User Badge + Logout */}
      <div className="flex items-center gap-2 shrink-0">
        {onBackToBilling && (
          <button
            type="button"
            onClick={onBackToBilling}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Return to Collections & Invoices"
          >
            <span>₹</span>
            <span className="hidden md:inline">Daily Ledger</span>
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>{isAdmin ? 'Admin' : profile?.full_name || 'Worker'}</span>
        </div>

        <button
          type="button"
          onClick={signOut}
          title="Sign Out"
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-500/20"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

    </header>
  );
};
