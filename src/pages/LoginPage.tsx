import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../lib/i18n';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Receipt,
  Camera,
  BarChart3,
  Sparkles,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [email, setEmail] = useState<string>(() => localStorage.getItem('last_login_email') || 'admin@ithinkai.in');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setErrorMsg(error.message || 'Invalid email or password. Please verify your credentials.');
        setLoading(false);
      } else {
        localStorage.setItem('last_login_email', email.trim());
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection error. Please try again.');
      setLoading(false);
    }
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
      <header className="relative z-10 w-full px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between border-b border-white/[0.06] bg-slate-950/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-300 p-0.5 shadow-glow-brand flex items-center justify-center">
            <div className="w-full h-full bg-[#030712] rounded-[10px] flex items-center justify-center font-black text-emerald-400 text-sm tracking-wider">
              ₹
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-white whitespace-nowrap">
              Daily Invoice
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

      {/* MAIN VIEWPORT CONTENT */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex items-center overflow-y-auto lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-10 w-full items-center my-auto">
          
          {/* LEFT COLUMN: ENTERPRISE OVERVIEW (Tablet / Desktop) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-5 pr-4">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold w-fit tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Digital Fiscal Register</span>
            </div>

            {/* Main Headline */}
            <div>
              <h1 className="text-2xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Daily Invoice & Slip Reconciliation Desk
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

          {/* RIGHT COLUMN: EXECUTIVE LOGIN CONSOLE (Mobile / Tablet / Desktop) */}
          <div className="col-span-1 lg:col-span-5 flex flex-col justify-center max-w-md mx-auto w-full">
            
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-7 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
              
              {/* Top Accent Gradient Border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />

              {/* Mobile-only brand badge */}
              <div className="lg:hidden flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  ₹
                </div>
                <span className="text-sm font-bold text-white uppercase tracking-wider whitespace-nowrap">
                  Daily Invoice
                </span>
              </div>

              {/* Console Title */}
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {t('loginTitle')}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your credentials to access the terminal
                </p>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="leading-snug">{errorMsg}</span>
                </div>
              )}

              {/* Secure Form Controls (No hardcoded credentials, optimized for touch keyboards) */}
              <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      {t('email')}
                    </label>
                    {email !== 'admin@ithinkai.in' && (
                      <button
                        type="button"
                        onClick={() => setEmail('admin@ithinkai.in')}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                      >
                        Reset Admin
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-3 pl-10 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium transition-all"
                      placeholder="e.g. admin@ithinkai.in"
                    />
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Fast 1-Tap Account Selector (Zero Typing on Mobile) */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setEmail('admin@ithinkai.in')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        email === 'admin@ithinkai.in'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmail('operator1@ithinkai.in')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        email === 'operator1@ithinkai.in'
                          ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      Operator 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmail('operator2@ithinkai.in')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        email === 'operator2@ithinkai.in'
                          ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      Operator 2
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-3 pl-10 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium transition-all font-mono"
                      placeholder="••••••••••••"
                    />
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    
                    {/* Password Show/Hide Toggle for Mobile & Tablet touch ease */}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-500/20 text-sm font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer min-h-[46px]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>{t('signingIn')}</span>
                    </span>
                  ) : (
                    <>
                      <span>Authorize Terminal Access</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Security Badge */}
              <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
                <span>SSL Encrypted • Strict Role Authentication</span>
              </div>

            </div>

          </div>

        </div>
      </main>

      {/* FOOTER BAR (COMPACT & CLEAN) */}
      <footer className="relative z-10 w-full px-4 sm:px-6 lg:px-10 py-2.5 border-t border-white/[0.06] bg-slate-950/60 backdrop-blur-md flex items-center justify-between text-[11px] text-slate-500 shrink-0">
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
