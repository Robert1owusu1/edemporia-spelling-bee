import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BeeMascot from '../components/BeeMascot';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  Mail,
  Lock,
  LogIn,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  School,
  KeyRound,
  UserCheck,
} from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
}

type AuthMode = 'login_account' | 'login_student_code' | 'register';

export default function AuthPage({ initialMode = 'login' }: AuthPageProps) {
  const navigate = useNavigate();
  const { login, loginWithStudentCode, isLoading, authError, clearAuthError } = useAuth();

  const [authMode, setAuthMode] = useState<AuthMode>(initialMode === 'register' ? 'register' : 'login_account');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentCodeInput, setStudentCodeInput] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSwitchTab = (mode: AuthMode) => {
    clearAuthError();
    setValidationError(null);
    setAuthMode(mode);
    if (mode === 'register') navigate('/signup', { replace: true });
    else navigate('/login', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setValidationError(null);

    if (authMode === 'login_student_code') {
      const code = studentCodeInput.trim().toUpperCase();
      if (!code) {
        setValidationError('Please enter your 5-digit Student ID (e.g. ST-84920)');
        return;
      }
      try {
        await loginWithStudentCode(code);
        navigate('/home');
      } catch {
        // Error set in context
      }
      return;
    }

    if (!email || !password) {
      setValidationError('Email and password are required');
      return;
    }
    try {
      await login(email, password);
      navigate('/home');
    } catch {
      // Error set in context
    }
  };

  // Demo credentials only exist in local dev builds: `import.meta.env.DEV` is
  // statically replaced at build time, so production bundles resolve these to
  // empty strings and no shared password ships in the shipped JS.
  const DEMO_EMAIL = import.meta.env.DEV ? 'demo@spellingbee.local' : '';
  const DEMO_PASSWORD = import.meta.env.DEV ? 'demo123' : '';

  const handleDemoAccess = async () => {
    if (!DEMO_EMAIL || !DEMO_PASSWORD) return;
    await login(DEMO_EMAIL, DEMO_PASSWORD);
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans text-slate-900 antialiased dark:bg-navy-900 dark:text-slate-100">
      <Navbar />

      <main
        id="main-content"
        className="flex-1 max-w-md w-full mx-auto px-4 py-8 sm:py-12 flex flex-col justify-center items-center"
      >
        {/* Main High-End Card Container */}
        <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all space-y-6 dark:bg-navy-800 dark:border-navy-700">
          {/* Top Header Branding */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-amber-50 border border-amber-200/60 shadow-xs mb-1 dark:bg-amber-500/10 dark:border-amber-500/30">
              <BeeMascot variant="emoji" size="md" className="mx-auto" />
            </div>

            <div className="flex justify-center">
              <span className="bg-slate-900 text-amber-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-slate-800 shadow-xs inline-flex items-center gap-1 dark:bg-navy-700 dark:border-navy-700">
                <Sparkles className="w-3 h-3" />
                Spelling Bee
              </span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {authMode === 'register'
                ? 'Account Registration'
                : authMode === 'login_student_code'
                  ? 'Student Login with ID'
                  : 'Welcome Back Speller!'}
            </h1>
            <p className="text-xs text-slate-500 font-normal leading-relaxed max-w-xs mx-auto dark:text-slate-400">
              {authMode === 'register'
                ? 'Parent and teacher accounts are created and approved by your school administrator.'
                : authMode === 'login_student_code'
                  ? 'Enter the 5-digit Student Code provided by your teacher or parent.'
                  : 'Sign in to access your spelling trail, daily challenges, and supervisor monitor.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-xl text-[11px] font-semibold text-slate-600 dark:bg-navy-700 dark:text-slate-400">
            <button
              type="button"
              onClick={() => handleSwitchTab('login_account')}
              className={`py-2 px-1 rounded-lg transition-all text-center cursor-pointer ${
                authMode === 'login_account'
                  ? 'bg-white text-slate-900 shadow-xs font-bold dark:bg-navy-800 dark:text-slate-100'
                  : 'hover:text-slate-900'
              }`}
            >
              Email Login
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab('login_student_code')}
              className={`py-2 px-1 rounded-lg transition-all text-center cursor-pointer ${
                authMode === 'login_student_code'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              Student ID
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab('register')}
              className={`py-2 px-1 rounded-lg transition-all text-center cursor-pointer ${
                authMode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs font-bold dark:bg-navy-800 dark:text-slate-100'
                  : 'hover:text-slate-900'
              }`}
            >
              Register
            </button>
          </div>

          {/* Error Alert */}
          {(authError || validationError) && (
            <div
              role="alert"
              className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2.5 animate-fade-in dark:bg-rose-500/10 dark:text-rose-300"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" focusable="false" />
              <span>{authError || validationError}</span>
            </div>
          )}

          {/* Registration closed notice */}
          {authMode === 'register' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 dark:bg-navy-900 dark:border-navy-700">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 shrink-0 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Self-registration is closed</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed dark:text-slate-400">
                      Your school administrator creates and approves every parent and teacher account. Ask them to set
                      up your account, then come back and sign in.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-center dark:bg-navy-800 dark:border-navy-700">
                    <ShieldCheck className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider dark:text-slate-300">
                      Parent
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">
                      Monitor your child's practice
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-center dark:bg-navy-800 dark:border-navy-700">
                    <School className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider dark:text-slate-300">
                      Teacher
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">Manage your assigned class</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSwitchTab('login_account')}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />I already have an account
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Login Form (not in register mode) */}
          {authMode !== 'register' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. STUDENT CODE LOGIN MODE */}
              {authMode === 'login_student_code' && (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="auth-student-code"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 dark:text-slate-300"
                    >
                      Your 5-Digit Student ID Code
                    </label>
                    <div className="relative">
                      <KeyRound
                        className="w-4 h-4 text-amber-500 absolute left-3.5 top-3.5"
                        aria-hidden="true"
                        focusable="false"
                      />
                      <input
                        id="auth-student-code"
                        type="text"
                        required
                        autoComplete="off"
                        value={studentCodeInput}
                        onChange={(e) => setStudentCodeInput(e.target.value)}
                        placeholder="e.g. ST-84920"
                        className="w-full bg-amber-50/50 border-2 border-amber-300 rounded-xl pl-10 pr-4 py-3 text-base font-mono font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-amber-500 focus:bg-white uppercase tracking-wider transition-all dark:bg-amber-500/10 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-navy-800"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal mt-1.5 dark:text-slate-400">
                      Don't have a code? Ask your teacher or parent to generate one from their Supervisor Portal.
                    </p>
                  </div>
                </div>
              )}

              {/* EMAIL AND PASSWORD FIELDS FOR ACCOUNT LOGIN */}
              {authMode === 'login_account' && (
                <>
                  <div>
                    <label
                      htmlFor="auth-email"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 dark:text-slate-300"
                    >
                      Account Email
                    </label>
                    <div className="relative">
                      <Mail
                        className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 dark:text-slate-500"
                        aria-hidden="true"
                        focusable="false"
                      />
                      <input
                        id="auth-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. parent@example.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-medium placeholder-slate-400 outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all dark:bg-navy-900 dark:border-navy-600 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-navy-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 dark:text-slate-300"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock
                        className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 dark:text-slate-500"
                        aria-hidden="true"
                        focusable="false"
                      />
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 font-medium placeholder-slate-400 outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all dark:bg-navy-900 dark:border-navy-600 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-navy-800"
                      />
                      {/* Icon-only control: the changing label is what tells a
                          screen-reader user whether the password is shown. */}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer dark:text-slate-500"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" aria-hidden="true" focusable="false" />
                        ) : (
                          <Eye className="w-4 h-4" aria-hidden="true" focusable="false" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <Link to="/reset-password" className="text-xs font-semibold text-indigo-700 hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-bold text-xs uppercase tracking-wider py-3.5 px-5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {isLoading
                    ? 'Processing...'
                    : authMode === 'login_student_code'
                      ? 'Log In with Student Code'
                      : 'Sign In to Account'}
                </span>
              </button>

              {/* Quick Demo Access (development builds only: production has no
                  demo account, so no credential-skipping button is shipped) */}
              {import.meta.env.DEV && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleDemoAccess}
                    className="w-full bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200/80 font-bold text-xs py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Instant Demo Access (Skip Login)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Footer Switching Links */}
          <div className="text-center pt-3 border-t border-slate-100 text-xs text-slate-500 font-normal dark:border-navy-700 dark:text-slate-400">
            {authMode === 'register' ? (
              <span>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchTab('login_account')}
                  className="text-amber-600 font-bold hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </span>
            ) : (
              <span>
                Need an account?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchTab('register')}
                  className="text-amber-600 font-bold hover:underline cursor-pointer"
                >
                  Ask your administrator
                </button>
              </span>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
