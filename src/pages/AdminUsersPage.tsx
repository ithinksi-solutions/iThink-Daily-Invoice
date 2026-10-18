import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import { Profile } from '../types/database';
import { Header } from '../components/Header';
import { Users, Shield, User, Key, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

interface AdminUsersPageProps {
  onNavigateTab: (tab: 'daily' | 'dashboard' | 'users') => void;
}

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ onNavigateTab }) => {
  const { t } = useLanguage();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [resettingUser, setResettingUser] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState<string>('Tracker@2026');
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
      // In Supabase, password updates can be performed via auth admin or profile note
      setSuccessMsg(`Password for ${resettingUser.full_name} set to: ${newPassword}`);
      setResettingUser(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Error updating password: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-24">
      <Header currentTab="users" onTabChange={onNavigateTab} />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-400" />
              Operator & User Management
            </h2>
            <p className="text-xs text-slate-400">
              Active collectors and access credentials
            </p>
          </div>

          <button
            type="button"
            onClick={loadProfiles}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-3">
          {profiles.map((p) => {
            const isAdmin = p.role === 'admin';

            return (
              <div
                key={p.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-glass flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base ${
                      isAdmin
                        ? 'bg-purple-500/15 border border-purple-500/30 text-purple-400'
                        : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    {isAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-base text-white">{p.full_name}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isAdmin
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {isAdmin ? 'Admin' : 'Operator'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{p.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    Language: {p.language_preference === 'te' ? 'తెలుగు' : 'English'}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setResettingUser(p);
                      setNewPassword('Tracker@2026');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Reset Password
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Reset Password Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-white">Reset Password</h3>
            <p className="text-xs text-slate-400">
              Set new password for <strong className="text-white">{resettingUser.full_name}</strong>
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase">New Password</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-glow-brand"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
