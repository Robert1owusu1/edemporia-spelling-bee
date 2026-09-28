import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Word } from '../api/types';
import Navbar from '../components/Navbar';
import SpellingInteraction from '../components/SpellingInteraction';
import SuccessStarOverlay from '../components/SuccessStarOverlay';
import { WordBankSkeleton } from '../components/common/Skeletons';
import { audioFx } from '../utils/audioEffects';
import { Calendar, Trophy, ArrowRight, AlertCircle, RefreshCw, Home } from 'lucide-react';

interface WrongAnswer {
  heard: string;
  word: string;
}

export default function DailyChallengePage() {
  const navigate = useNavigate();
  const { activeStudent, updateActiveStudentState } = useAuth();

  const [dailyWord, setDailyWord] = useState<Word | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // A failed fetch is its own state: it must never fall through to the
  // "Daily Challenge Completed!" card below.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [wrongAnswer, setWrongAnswer] = useState<WrongAnswer | null>(null);
  const overlayTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDaily() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const fetched = await apiClient.getDailyChallenge(activeStudent?.id, { signal: controller.signal });
        setDailyWord(fetched.word);
        setIsCompleted(fetched.completedToday);
      } catch (err) {
        if (controller.signal.aborted) return;
        setDailyWord(null);
        setIsCompleted(false);
        setLoadError(err instanceof Error ? err.message : 'Could not load today’s challenge.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    fetchDaily();
    return () => {
      controller.abort();
      // The success overlay must not outlive the page.
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
    };
  }, [activeStudent?.id, loadAttempt]);

  const handleSubmit = async (spelledText: string) => {
    if (!dailyWord || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const isCorrect = spelledText.toLowerCase() === dailyWord.text.toLowerCase();

    if (activeStudent) {
      try {
        // The backend records the day, writes the progress row and -- when
        // correct -- awards the advertised +50 bonus points and streak day
        // in one transaction, so a dropped connection can't half-apply it.
        const result = await apiClient.completeDailyChallenge(activeStudent.id, dailyWord.id, spelledText);
        if (isCorrect) {
          updateActiveStudentState({
            points: result.totalPoints ?? activeStudent.points,
            dailyStreak:
              result.dailyStreak ?? result.streakDays ?? activeStudent.dailyStreak ?? activeStudent.streakDays,
            hearts: result.heartsRemaining ?? activeStudent.hearts,
          });
        }
      } catch (error) {
        setSubmitting(false);
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Unable to record today’s challenge. Check your connection and try again.',
        );
        return;
      }
    }

    // This page owns its answer sounds (SpellingInteraction deliberately plays
    // none, otherwise every jingle would fire twice).
    if (isCorrect) audioFx.playCorrect();
    else audioFx.playIncorrect();

    if (isCorrect) {
      setShowSuccessOverlay(true);
      setIsCompleted(true);
      setJustCompleted(true);

      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = window.setTimeout(() => {
        overlayTimerRef.current = null;
        setShowSuccessOverlay(false);
      }, 3000);
    } else {
      // Inline feedback instead of a blocking alert: the challenge is already
      // recorded, so tell the learner what happened and let them choose.
      setWrongAnswer({ heard: spelledText, word: dailyWord.text });
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-navy-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased">
        <Navbar />
        <main id="main-content" className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
          {/* Transient skeleton state: keep the route's single h1 present so
              assistive tech never lands on a heading-less page. */}
          <h1 className="sr-only">Daily Spelling Challenge</h1>
          <WordBankSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-navy-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased">
      <Navbar />

      <main id="main-content" className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="bg-white dark:bg-navy-800 border border-slate-200/80 dark:border-navy-700 rounded-2xl p-6 shadow-xs text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/30 px-3 py-1 rounded-md">
            <Calendar className="w-3.5 h-3.5" />
            <span>Word of the Day • +50 Bonus Streak Points</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Daily Spelling Challenge</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            Spell today's featured word correctly to extend your daily streak fire!
          </p>
        </div>

        {loadError ? (
          /* Request failed: show the error and offer a retry, never "completed" */
          <div
            role="alert"
            className="bg-white dark:bg-navy-800 border border-rose-200 dark:border-rose-500/30 rounded-2xl p-8 shadow-xs text-center space-y-5 max-w-md mx-auto"
          >
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">We couldn't load today's word</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">{loadError}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try again</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="flex-1 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-navy-700 font-semibold text-xs py-3 px-5 rounded-xl transition-colors cursor-pointer"
              >
                Back to home
              </button>
            </div>
          </div>
        ) : wrongAnswer ? (
          /* Recorded-but-incorrect outcome, shown inline (replaces the old alert).
             role="status" announces the recorded result without interrupting. */
          <div
            role="status"
            className="bg-white dark:bg-navy-800 border border-slate-200/80 dark:border-navy-700 rounded-2xl p-8 shadow-xs text-center space-y-6 max-w-md mx-auto"
          >
            <Trophy className="w-14 h-14 text-slate-300 mx-auto" />
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Today's challenge is recorded</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                We heard “{wrongAnswer.heard || '—'}”. Today's word was “{wrongAnswer.word}”. A new challenge arrives
                tomorrow.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Return Home</span>
            </button>
          </div>
        ) : !isCompleted && dailyWord ? (
          <>
            {submitError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" focusable="false" />
                <span>{submitError}</span>
              </div>
            )}
            <SpellingInteraction word={dailyWord} onSubmit={handleSubmit} isSubmitting={submitting} showXp={false} />
          </>
        ) : (
          <div
            role="status"
            className="bg-white dark:bg-navy-800 border border-slate-200/80 dark:border-navy-700 rounded-2xl p-8 shadow-xs text-center space-y-6 max-w-md mx-auto"
          >
            <Trophy className="w-14 h-14 text-amber-500 mx-auto" />
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Daily Challenge Completed!</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                {justCompleted
                  ? 'You earned 50 bonus points and extended your daily streak!'
                  : 'You already completed today’s challenge. A new word arrives tomorrow.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <span>Return Home</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {showSuccessOverlay && (
        <SuccessStarOverlay score={1} totalWords={1} onClose={() => setShowSuccessOverlay(false)} />
      )}
    </div>
  );
}
