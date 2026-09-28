import type { RoundResultState } from '../api/types';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BeeMascot from '../components/BeeMascot';
import Confetti from '../components/Confetti';
import { formatHours, starsFor } from '../utils/format';
import { scoreWord } from '../utils/scoring';
import { Trophy, CheckCircle2, XCircle, ArrowRight, RotateCcw, Map, Unlock, Star, Zap, Medal } from 'lucide-react';

export default function RoundResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // A refresh or a deep link has no round to show — never invent numbers for
  // a round that didn't happen, send the learner back to the dashboard.
  if (!location.state) {
    return <Navigate to="/home" replace />;
  }

  const state = location.state as RoundResultState;
  const {
    tier = 1,
    score = 0,
    totalWords = 5,
    pointsEarned = 0,
    streakDays = 0,
    heartsRemaining = 5,
    tierAdvanced = false,
    results = [],
    syncError = false,
    earnedBadges = [],
    totalSpentSeconds = 0,
  } = state;

  const stars = starsFor(score, totalWords);
  const accuracy = totalWords > 0 ? Math.round((score / totalWords) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-navy-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased">
      <Navbar />

      {stars >= 2 && <Confetti count={72} />}

      <main id="main-content" className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
        {syncError && (
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-3 text-xs font-bold text-indigo-900 dark:text-indigo-300">
            This round's results could not be saved because the connection dropped. Try the round again when you are
            back online.
          </div>
        )}
        {tierAdvanced && (
          <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-md animate-bounce">
              <Unlock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-amber-950">Tier {tier + 1} unlocked!</p>
              <p className="text-xs text-amber-900/80">
                You scored at least 80% on Tier {tier}. The next stage of the trail is now open.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-navy-800 border border-slate-200/80 dark:border-navy-700 rounded-2xl p-6 sm:p-8 shadow-md text-center space-y-6 relative overflow-hidden">
          {stars >= 2 && (
            <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-200/40 blur-2xl" />
          )}
          <BeeMascot variant="emoji" size="lg" expression="celebrating" className="mx-auto animate-float" />

          <div className="space-y-2">
            <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-500/30 text-xs font-semibold px-3 py-1 rounded-md inline-block">
              Tier {tier} Round Complete!
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Round Summary</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              You correctly spelled {score} out of {totalWords} words!
            </p>
          </div>

          {/* One polite live region for the whole summary: score, XP, streak,
              hearts and any new badge are read out together when this page
              mounts rather than as four separate fragments. */}
          <p className="sr-only" role="status">
            {[
              `Round complete. You spelled ${score} out of ${totalWords} words correctly.`,
              `${pointsEarned} XP earned.`,
              `Daily streak ${streakDays} days.`,
              `${heartsRemaining} hearts remaining.`,
              earnedBadges.length > 0 ? `New badge earned: ${earnedBadges[0].name}.` : '',
            ]
              .filter(Boolean)
              .join(' ')}
          </p>

          {/* Star Rating */}
          <div className="flex items-center justify-center gap-2" role="img" aria-label={`${stars} out of 3 stars`}>
            {[1, 2, 3].map((position) => (
              <Star
                key={position}
                aria-hidden="true"
                focusable="false"
                className={`w-9 h-9 sm:w-11 sm:h-11 ${
                  position <= stars ? 'text-amber-500 fill-amber-400 drop-shadow-sm' : 'text-slate-200 fill-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/30 p-3 rounded-xl">
              <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                XP Earned
              </p>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-1 flex items-center justify-center gap-1">
                <Zap className="w-4 h-4 fill-current" />+{pointsEarned}
              </p>
            </div>
            <div className="bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/30 p-3 rounded-xl">
              <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Accuracy
              </p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">{accuracy}%</p>
            </div>
            <div className="bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/30 p-3 rounded-xl">
              <p className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                Daily Streak
              </p>
              <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300 mt-1">{streakDays} Days</p>
            </div>
            <div className="bg-rose-50/70 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/30 p-3 rounded-xl">
              <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                Hearts Left
              </p>
              <p className="text-lg font-bold text-rose-700 dark:text-rose-300 mt-1">{heartsRemaining}</p>
            </div>
            <div className="bg-slate-900 dark:bg-navy-700 border border-slate-800 dark:border-navy-700 p-3 rounded-xl">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Hours Spent
              </p>
              <p className="text-lg font-bold text-amber-400 mt-1">{formatHours(totalSpentSeconds || 0)}</p>
            </div>
          </div>

          {/* Earned Badge */}
          {earnedBadges.length > 0 && (
            <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 text-left flex items-center gap-3 animate-pop">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-md">
                <Medal className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">New Badge Earned!</p>
                <p className="text-sm font-extrabold text-amber-950 truncate">{earnedBadges[0].name}</p>
                <p className="text-[11px] text-amber-900/70 leading-snug">{earnedBadges[0].description}</p>
              </div>
            </div>
          )}

          {/* Word Results List */}
          {results.length > 0 && (
            <div className="space-y-2 text-left pt-2">
              <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Word Review Breakdown:
              </h2>
              <div className="space-y-2">
                {results.map((r, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium ${
                      r.isCorrect
                        ? 'bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                        : 'bg-rose-50/80 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-950 dark:text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {r.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-300 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className="font-bold uppercase tracking-wide break-all">{r.word.text}</span>
                        {!r.isCorrect && (
                          <span className="text-[11px] text-rose-700 dark:text-rose-300 block mt-0.5 break-words">
                            Your spelling: "{r.userSpelling}"
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[11px] font-bold shrink-0">
                      {r.isCorrect
                        ? `+${r.xpEarned ?? scoreWord(r.word.tier, Math.max(r.combo - 1, 0), true)} pts`
                        : '0 pts'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => navigate(`/game?tier=${tier}`)}
              className="flex-1 min-tap bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-navy-700 font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Practice Again</span>
            </button>

            {tierAdvanced ? (
              <button
                type="button"
                onClick={() => navigate(`/game?tier=${tier + 1}`)}
                className="flex-1 min-tap bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                <span>Play Tier {tier + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/trail')}
                className="flex-1 min-tap bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
              >
                <Map className="w-4 h-4" />
                <span>Back to Trail Map</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
