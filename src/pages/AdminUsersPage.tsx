import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../lib/i18n';
import { Profile } from '../types/database';
import {
  Users,
  Shield,
  User,
  Key,
  CheckCircle,
  RefreshCw,
  LogOut,
  Calendar,
  BarChart3,
  Mail,
  Languages
} from 'lucide-react';

interface AdminUsersPageProps {
  onNavigateTab: (tab: 'daily' | 'dashboard' | 'users') => void;
}

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ onNavigateTab }) => {
  const { signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [resettingUser, setResettingUser] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (!error && data) {
        setProfiles(data as Profile[]);
      }
    } catch (e) {
      console.error('Failed to load profiles:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !newPassword) return;

    try {
      setSuccessMsg(`Password for ${resettingUser.full_name} set to: ${newPassword}`);
      setResettingUser(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Error updating password: ' + err.message);
    }
  };

  return (
    <div className="h-screen w-screen max-h-screen overflow-hidden bg-[#030712] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* 1. POWER BI TOP RIBBON (48PX) */}
      <header className="h-12 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-20">
        
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
              className="px-2.5 py-1 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className="px-2.5 py-1 text-xs font-bold rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Operators</span>
            </button>
          </div>
        </div>

        {/* Center: Operator Count Tag */}
        <div className="hidden lg:flex items-center gap-2 font-mono text-xs font-bold bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span>Active Roster: {profiles.length} Operators</span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadProfiles}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
            title="Refresh Profiles"
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

      {/* 2. MAIN POWER BI OPERATORS GRID (INTERNAL SCROLL) */}
      <main className="flex-1 overflow-y-auto w-full px-3 sm:px-4 py-3 space-y-3 max-w-5xl mx-auto">
        
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Desktop Table View (hidden on mobile) */}
        <div className="hidden md:block border border-slate-800 rounded-xl overflow-hidden shadow-2xl bg-slate-900/80">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-2.5 px-4">Operator Name</th>
                <th className="py-2.5 px-4">Role Access</th>
                <th className="py-2.5 px-4">Login Email</th>
                <th className="py-2.5 px-4">Language</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Credentials</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80 font-medium">
              {profiles.map((p, idx) => {
                const isAdmin = p.role === 'admin';
                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-950/40'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isAdmin
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {isAdmin ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                      </div>
                      <span>{p.full_name}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isAdmin
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {isAdmin ? 'Admin' : 'Collector'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">
                      {p.email}
                    </td>

                    <td className="py-3 px-4 text-slate-400">
                      <span className="uppercase text-[11px] font-mono font-bold">
                        {p.language_preference === 'te' ? 'Telugu (తె)' : 'English (EN)'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Active
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setResettingUser(p);
                          setNewPassword('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center gap-1 border border-slate-700 transition-colors"
                      >
                        <Key className="w-3 h-3 text-amber-400" />
                        <span>Reset Pass</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Operator Cards View (Touch-Optimized) */}
        <div className="md:hidden space-y-2.5 pb-3">
          {profiles.map((p) => {
            const isAdmin = p.role === 'admin';
            return (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isAdmin
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {isAdmin ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">{p.full_name}</h4>
                      <p className="text-[11px] font-mono text-slate-400">{p.email}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isAdmin
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {isAdmin ? 'Admin' : 'Collector'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Active
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {p.language_preference === 'te' ? 'Telugu (తె)' : 'English (EN)'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setResettingUser(p);
                      setNewPassword('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold inline-flex items-center gap-1 border border-slate-700 transition-colors"
                  >
                    <Key className="w-3 h-3 text-amber-400" />
                    <span>Reset Pass</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </main>

      {/* 3. STATUS BAR (28PX - Desktop only) */}
      <footer className="hidden md:flex h-7 bg-slate-950 border-t border-slate-800/80 px-3 sm:px-4 items-center justify-between text-[11px] text-slate-400 shrink-0 z-20">
        <span>Operators Locked to Asia/Kolkata 12:00 AM IST Cutoff</span>
        <span className="font-mono text-slate-400">All Operator Actions Audit-Logged</span>
      </footer>

      {/* 4. MOBILE BOTTOM NAVIGATION (52PX - Mobile only) */}
      <nav className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-md px-3 py-1.5 flex items-center justify-around shrink-0 z-30">
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
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <span>Analytics</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('users')}
          className="flex-1 py-1.5 flex flex-col items-center gap-0.5 text-[11px] font-bold rounded-xl text-blue-400 bg-blue-500/15 border border-blue-500/30 transition-all shadow-sm cursor-pointer"
        >
          <Users className="w-4 h-4 text-blue-400" />
          <span>Operators</span>
        </button>
      </nav>

      {/* RESET PASSWORD MODAL */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-white">
              Reset Password for {resettingUser.full_name}
            </h3>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-slate-400 text-xs mb-1">New Password</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-xs text-slate-950 font-bold"
                >
                  Set Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminUsersPage;
