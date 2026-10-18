import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../lib/i18n';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [email, setEmail] = useState<string>('admin@ithinkai.in');
  const [password, setPassword] = useState<string>('Tracker@2026');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error } = await signIn(email.trim(), password);
    if (error) {
      setErrorMsg(error.message || 'Login failed. Please check credentials.');
      setLoading(false);
    }
  };

  const setFastLogin = (accEmail: string) => {
    setEmail(accEmail);
    setPassword('Tracker@2026');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Top Header Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center shadow-inner">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              language === 'en' ? 'bg-emerald-500 text-white' : 'text-slate-400'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('te')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              language === 'te' ? 'bg-emerald-500 text-white' : 'text-slate-400'
            }`}
          >
            తెలుగు
          </button>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 p-0.5 shadow-glow-brand flex items-center justify-center mb-4">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-emerald-400 text-2xl tracking-wider">
            ₹
          </div>
        </div>

        <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {t('loginTitle')}
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-400">
          {t('loginSubtitle')}
        </p>

        {/* Quick Demo Selector */}
        <div className="mt-5 p-2 bg-slate-900/80 rounded-2xl border border-slate-800 text-center">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            One-Click Account Switcher
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => setFastLogin('admin@ithinkai.in')}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                email === 'admin@ithinkai.in'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => setFastLogin('operator1@ithinkai.in')}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                email === 'operator1@ithinkai.in'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Op 1
            </button>
            <button
              type="button"
              onClick={() => setFastLogin('operator2@ithinkai.in')}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                email === 'operator2@ithinkai.in'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Op 2
            </button>
            <button
              type="button"
              onClick={() => setFastLogin('operator3@ithinkai.in')}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                email === 'operator3@ithinkai.in'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Op 3
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 py-8 px-5 sm:px-10 shadow-2xl rounded-3xl border border-slate-800/80 backdrop-blur-xl">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t('email')}
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 pl-11 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium transition-all"
                  placeholder="operator1@ithinkai.in"
                />
                <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t('password')}
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pl-11 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium transition-all"
                  placeholder="••••••••••••"
                />
                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[52px] flex items-center justify-center gap-2 px-6 py-3.5 border border-transparent rounded-xl shadow-glow-brand text-base font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>{t('signingIn')}</span>
              ) : (
                <>
                  <span>{t('signIn')}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-500">
            Protected by PostgreSQL Row Level Security (RLS)
          </div>
        </div>
      </div>
    </div>
  );
};
