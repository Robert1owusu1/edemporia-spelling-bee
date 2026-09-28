import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BeeMascot from '../components/BeeMascot';
import HexagonBadge from '../components/common/HexagonBadge';
import { Map, Calendar, Sparkles, Flame, Heart, ArrowRight } from 'lucide-react';

export default function HomeDashboardPage() {
  const navigate = useNavigate();
  const { activeStudent } = useAuth();

  const studentName = activeStudent?.name || 'Speller';
  const tier = activeStudent?.currentTier || 1;
  // The header "streak" chip and the stat card both mean consecutive practice
  // days (`dailyStreak`); `streak` is the round combo and doesn't belong here.
  const streak = activeStudent?.dailyStreak || 0;
  const hearts = activeStudent?.hearts ?? 5;
  const points = activeStudent?.points || 0;

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-navy-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased">
      <Navbar />

      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="bg-slate-900 dark:bg-navy-800 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 dark:border-navy-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2.5 z-10 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-slate-800/80 dark:bg-navy-800/80 border border-slate-700/80 dark:border-navy-600/80 px-3 py-1 rounded-full text-xs font-semibold text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Tier {tier} Speller • {activeStudent?.className || 'Grade 3'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Welcome back, {studentName}!</h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed font-normal">
              Ready to expand your vocabulary? Practice spoken spelling, complete daily challenges, protect your streak,
              and earn badges.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-4 z-10 bg-slate-800/60 dark:bg-navy-800/60 border border-slate-700/60 dark:border-navy-600/60 p-4 rounded-xl">
            <BeeMascot variant="emoji" size="md" expression="happy" />
            <div className="space-y-1 text-left">
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Learner Stats
              </p>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="text-amber-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {streak}d Streak
                </span>
                <span className="text-slate-600 dark:text-slate-400">•</span>
                <span className="text-rose-400 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  {hearts} Lives
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Core Navigation Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tile 1: Trail Map */}
          <button
            type="button"
            onClick={() => navigate('/trail')}
            className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 hover:border-amber-400/80 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-5 group text-left w-full"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 border border-amber-200/80 dark:border-amber-500/30 dark:text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Map className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/30 px-2.5 py-0.5 rounded-md">
                Tier {tier} Level
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-700 transition-colors">
                Spelling Trail Map
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed font-normal">
                Follow progressive word levels, practice voice input, and master key vocabulary sets.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-amber-700">
              <span>Explore Trail</span>
              <ArrowRight
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
                focusable="false"
              />
            </div>
          </button>

          {/* Tile 2: Daily Challenge */}
          <button
            type="button"
            onClick={() => navigate('/daily-challenge')}
            className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 hover:border-indigo-400/80 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-5 group text-left w-full"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200/60 px-2.5 py-0.5 rounded-md">
                Featured Word
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 transition-colors">
                Daily Challenge
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed font-normal">
                Spell today's featured word correctly to double your streak bonus points.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-700">
              <span>Start Daily Word</span>
              <ArrowRight
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
                focusable="false"
              />
            </div>
          </button>
        </div>

        {/* Stats & Badges Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 p-6 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Spelling Badges</h2>
              <button
                type="button"
                onClick={() => navigate('/badges')}
                className="text-xs font-semibold text-amber-600 hover:underline cursor-pointer"
              >
                View All →
              </button>
            </div>
            <div className="flex items-center gap-3">
              <HexagonBadge active color="amber" size="md">
                🐝
              </HexagonBadge>
              <HexagonBadge active color="indigo" size="md">
                🔥
              </HexagonBadge>
              <HexagonBadge active color="emerald" size="md">
                ⭐
              </HexagonBadge>
              <HexagonBadge active={false} color="slate" size="md">
                🏆
              </HexagonBadge>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 p-6 rounded-2xl shadow-xs space-y-4 md:col-span-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Overall Progress</h2>
              <button
                type="button"
                onClick={() => navigate('/leaderboard')}
                className="text-xs font-semibold text-amber-600 hover:underline cursor-pointer"
              >
                Leaderboard Standings →
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 dark:bg-navy-700 border border-slate-200/80 dark:border-navy-700 p-3.5 rounded-xl">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Points
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{points}</p>
              </div>
              <div className="bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/30 p-3.5 rounded-xl">
                <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  Streak Days
                </p>
                <p className="text-xl font-bold text-amber-700 mt-1">{streak}d</p>
              </div>
              <div className="bg-rose-50/70 dark:bg-rose-500/10 border border-rose-200/80 p-3.5 rounded-xl">
                <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                  Hearts Left
                </p>
                <p className="text-xl font-bold text-rose-700 mt-1">{hearts}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
