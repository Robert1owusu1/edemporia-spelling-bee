import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BeeMascot from '../components/BeeMascot';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ArrowRight, Sparkles, Volume2, Mic, Trophy } from 'lucide-react';

export default function HeroLandingPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [demoError, setDemoError] = useState('');

  // Demo credentials only exist in local dev builds (`import.meta.env.DEV` is
  // statically replaced, so production ships neither the password nor a CTA
  // that silently logs anyone in).
  const DEMO_EMAIL = import.meta.env.DEV ? 'demo@spellingbee.local' : '';
  const DEMO_PASSWORD = import.meta.env.DEV ? 'demo123' : '';
  const isDemoBuild = Boolean(DEMO_EMAIL && DEMO_PASSWORD);

  const handleDemoAccess = async () => {
    if (!isDemoBuild) {
      // Production: send the visitor to the real sign-in screen instead of
      // auto-authenticating with a hardcoded shared account.
      navigate('/login');
      return;
    }
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
      navigate('/home');
    } catch (error) {
      setDemoError(error instanceof Error ? error.message : 'Demo access is unavailable right now.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans text-slate-900 antialiased dark:bg-navy-900 dark:text-slate-100">
      <Navbar />

      <main
        id="main-content"
        className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col justify-center items-center text-center space-y-10"
      >
        {/* Hero Mascot */}
        <div className="relative">
          <BeeMascot variant="emoji" size="xl" className="transform hover:scale-105 transition-transform" />
          <div className="absolute -top-2 -right-4 bg-amber-50 border border-amber-200/80 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold shadow-xs flex items-center gap-1 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Voice-First Learning</span>
          </div>
        </div>

        {/* Hero Text */}
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight dark:text-slate-100">
            Spelling practice, made accessible for every learner.
          </h1>
          <p className="text-sm text-slate-600 font-normal leading-relaxed max-w-xl mx-auto dark:text-slate-400">
            A gamified spelling bee app that helps kids master letters and words by speaking them aloud, then progress
            through difficulty tiers with streaks, hearts, points, and badges.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
          <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs space-y-2 text-left dark:bg-navy-800 dark:border-navy-700">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 dark:text-amber-300 border border-amber-200/60 flex items-center justify-center font-bold dark:bg-amber-500/10 dark:border-amber-500/30">
              <Mic className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Speak Letters Aloud</h2>
            <p className="text-xs text-slate-500 font-normal leading-relaxed dark:text-slate-400">
              Natural voice recognition matches spoken letter phonemes with instant feedback.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs space-y-2 text-left dark:bg-navy-800 dark:border-navy-700">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center font-bold dark:bg-indigo-500/10 dark:text-indigo-300">
              <Volume2 className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Audio Pronunciation</h2>
            <p className="text-xs text-slate-500 font-normal leading-relaxed dark:text-slate-400">
              Listen to native audio pronunciation, definitions, and sentence examples.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs space-y-2 text-left dark:bg-navy-800 dark:border-navy-700">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 flex items-center justify-center font-bold dark:bg-emerald-500/10 dark:border-emerald-500/30">
              <Trophy className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Tiered Trail Map</h2>
            <p className="text-xs text-slate-500 font-normal leading-relaxed dark:text-slate-400">
              Unlock Tier 1 to Tier 3 word sets while earning streak flames, hearts, and badges.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => void handleDemoAccess()}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
          >
            <span>{isDemoBuild ? 'Explore App (Quick Demo)' : 'Explore App'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-xs py-3 px-6 rounded-xl transition-colors cursor-pointer dark:bg-navy-800 dark:hover:bg-navy-700 dark:text-slate-200 dark:border-navy-700"
          >
            Guided Onboarding Quiz
          </button>
        </div>

        {demoError && (
          <p className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-xs text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
            {demoError}
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}
