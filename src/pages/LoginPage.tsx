import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../lib/i18n';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Receipt,
  Camera,
  BarChart3,
  Sparkles
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [email, setEmail] = useState<string>('admin@ithinkai.in');
  const [password, setPassword] = useState<string>('Admin@2026');
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
    if (accEmail === 'admin@ithinkai.in') {
      setPassword('Admin@2026');
    } else {
      setPassword('Tracker@2026');
    }
    setErrorMsg(null);
  };

  return (
    <div className="h-screen w-screen max-h-screen overflow-hidden bg-[#030712] text-slate-100 flex flex-col justify-between relative selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-5%] w-[450px] h-[450px] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] left-[30%] w-[350px] h-[350px] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />

      {/* Subtle Grid Backdrop Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* TOP HEADER BAR */}
      <header className="relative z-10 w-full px-5 lg:px-10 py-3 flex items-center justify-between border-b border-white/[0.06] bg-slate-950/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-300 p-0.5 shadow-glow-brand flex items-center justify-center">
            <div className="w-full h-full bg-[#030712] rounded-[10px] flex items-center justify-center font-black text-emerald-400 text-sm tracking-wider">
              ₹
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-black tracking-tight text-white uppercase">
              iThink AI
            </span>
            <span className="hidden sm:inline text-xs text-slate-400 font-medium">
              | Daily Collection Terminal
            </span>
          </div>
        </div>

        {/* Bilingual Language Switcher */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 flex items-center shadow-inner">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              language === 'en'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
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
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            తెలుగు
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT CONTENT (ZERO SCROLL FIT FOR 15" LAPTOPS) */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex items-center overflow-y-auto lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-10 w-full items-center my-auto">
          
          {/* LEFT COLUMN: ENTERPRISE OVERVIEW */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-5 pr-4">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold w-fit tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Digital Fiscal Register</span>
            </div>

            {/* Main Headline */}
            <div>
              <h1 className="text-2xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Daily Collection & Slip Reconciliation Desk
              </h1>
              <p className="mt-2 text-xs xl:text-sm text-slate-400 leading-relaxed max-w-xl">
                Replaces handwritten collection sheets with fast daily receipts, split payment tracking, and automated reconciliation.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="space-y-3 pt-1 max-w-xl">
              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Split Payment Tracking</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Record Cash, PhonePe, or split transactions in a single verified collection entry.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0 mt-0.5">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Digital Slip Archival</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Capture and attach physical slip receipts directly from mobile camera or gallery.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0 mt-0.5">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Reconciliation & Export</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Real-time daily subtotals grouped by operator with 1-click Excel and CSV exports.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: EXECUTIVE LOGIN CONSOLE */}
          <div className="col-span-1 lg:col-span-5 flex flex-col justify-center max-w-md mx-auto w-full">
            
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 xl:p-6 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
              
              {/* Top Accent Gradient Border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />

              {/* Mobile-only brand badge */}
              <div className="lg:hidden flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  ₹
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Daily Collection Tracker
                </span>
              </div>

              {/* Console Title */}
              <div>
                <h2 className="text-lg xl:text-xl font-bold text-white tracking-tight">
                  {t('loginTitle')}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Authorize terminal via role or credentials
                </p>
              </div>

              {/* ONE-CLICK ROLE SELECTOR (Admin + 3 Operators) */}
              <div className="mt-3.5 p-2 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">
                  <span>Fast Role Switcher</span>
                  <span className="text-emerald-400">1-Tap Preset</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFastLogin('admin@ithinkai.in')}
                    className={`px-1.5 py-1.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                      email === 'admin@ithinkai.in'
                        ? 'bg-purple-600 text-white shadow-md ring-1 ring-purple-400/50'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="text-[10px] tracking-tight">Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFastLogin('operator1@ithinkai.in')}
                    className={`px-1.5 py-1.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                      email === 'operator1@ithinkai.in'
                        ? 'bg-emerald-500 text-slate-950 shadow-md ring-1 ring-emerald-300/60'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span className="text-[10px] tracking-tight">Op 1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFastLogin('operator2@ithinkai.in')}
                    className={`px-1.5 py-1.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                      email === 'operator2@ithinkai.in'
                        ? 'bg-emerald-500 text-slate-950 shadow-md ring-1 ring-emerald-300/60'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span className="text-[10px] tracking-tight">Op 2</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFastLogin('operator3@ithinkai.in')}
                    className={`px-1.5 py-1.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                      email === 'operator3@ithinkai.in'
                        ? 'bg-emerald-500 text-slate-950 shadow-md ring-1 ring-emerald-300/60'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span className="text-[10px] tracking-tight">Op 3</span>
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="truncate">{errorMsg}</span>
                </div>
              )}

              {/* Form Controls */}
              <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    {t('email')}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2.5 pl-9 bg-slate-950/90 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs sm:text-sm font-medium transition-all"
                      placeholder="operator1@ithinkai.in"
                    />
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    {t('password')}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2.5 pl-9 bg-slate-950/90 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs sm:text-sm font-medium transition-all"
                      placeholder="••••••••••••"
                    />
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl shadow-glow-brand text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <span>{t('signingIn')}</span>
                  ) : (
                    <>
                      <span>Authorize Terminal Access</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

            </div>

          </div>

        </div>
      </main>

      {/* FOOTER BAR (COMPACT & CLEAN) */}
      <footer className="relative z-10 w-full px-5 lg:px-10 py-2.5 border-t border-white/[0.06] bg-slate-950/60 backdrop-blur-md flex items-center justify-between text-[11px] text-slate-500 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">iThink AI Technologies</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500">© 2026 All Rights Reserved</span>
        </div>
      </footer>

    </div>
  );
};

export default LoginPage;
