import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Word, RoundResultResponse } from '../api/types';
import Navbar from '../components/Navbar';
import SpellingInteraction from '../components/SpellingInteraction';
import SuccessStarOverlay from '../components/SuccessStarOverlay';
import BeeMascot from '../components/BeeMascot';
import { WordBankSkeleton } from '../components/common/Skeletons';
import { audioFx } from '../utils/audioEffects';
import { Heart, ArrowLeft, Flame, Trophy, Zap, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

interface WordFeedback {
  word: Word;
  isCorrect: boolean;
  userSpelling: string;
  attempts: number;
  xpEarned: number;
}

export default function GameLoopPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeStudent, updateActiveStudentState } = useAuth();

  const tierParam = Number(searchParams.get('tier')) || activeStudent?.currentTier || 1;

  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gamification states
  const [comboStreak, setComboStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [wordResults, setWordResults] = useState<{ word: Word; isCorrect: boolean; userSpelling: string }[]>([]);
  const [feedback, setFeedback] = useState<WordFeedback | null>(null);

  // Success Modal Star Burst state
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [overlayPoints, setOverlayPoints] = useState(0);
  // When the round's words loaded, so the backend can log how long this
  // learner actually spent spelling (feeds the teacher's hours-spent stats).
  const roundStartedAtRef = useRef<number | null>(null);
  // Pending "navigate to results" timers. If the user leaves the page while
  // the success overlay is showing, unmounting must cancel them -- otherwise
  // a stale timer fires navigate() and yanks the user out of wherever they
  // went to next.
  const timersRef = useRef<number[]>([]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const delayThenNavigate = (callback: () => void) => {
    timersRef.current.push(window.setTimeout(callback, 2800));
  };

  useEffect(() => {
    async function loadWords() {
      setIsLoading(true);
      try {
        const fetched = await apiClient.getWordsByTier(tierParam, activeStudent?.id);
        setWords(fetched.slice(0, 5));
        roundStartedAtRef.current = Date.now();
      } finally {
        setIsLoading(false);
      }
    }
    loadWords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierParam]);

  const currentWord = words[currentIndex];

  const handleWordSubmit = (spelledText: string, attemptsCount: number) => {
    if (!currentWord) return;

    const isCorrect = spelledText.toLowerCase() === currentWord.text.toLowerCase();

    // Score and combo update (mirrors the backend's formula so the numbers the
    // learner sees in the feedback panel match what the round will award).
    let newCombo = comboStreak;
    let updatedScore = score;
    if (isCorrect) {
      newCombo += 1;
      updatedScore += 1;
      setComboStreak(newCombo);
      setScore(updatedScore);
      if (newCombo > 1) audioFx.playCombo(newCombo);
      else audioFx.playCorrect();
    } else {
      newCombo = 0;
      setComboStreak(0);
      audioFx.playIncorrect();
    }
    const xpEarned = isCorrect
      ? Math.round(currentWord.tier * 10 * (1 + Math.min(newCombo, 10) * 0.1))
      : 0;

    setWordResults((prev) => [...prev, { word: currentWord, isCorrect, userSpelling: spelledText }]);
    setFeedback({ word: currentWord, isCorrect, userSpelling: spelledText, attempts: attemptsCount, xpEarned });
  };

  const finishRound = async (results: { word: Word; isCorrect: boolean; userSpelling: string }[], finalScore: number) => {
    setIsSubmitting(true);
    setShowSuccessOverlay(true);
    setOverlayPoints(results.filter((r) => r.isCorrect).length);
    audioFx.playVictory();

    const durationSeconds = roundStartedAtRef.current ? Math.max(1, Math.round((Date.now() - roundStartedAtRef.current) / 1000)) : undefined;

    try {
      if (activeStudent) {
        const apiResult: RoundResultResponse = await apiClient.submitRound({
          studentId: activeStudent.id,
          results: results.map((result) => ({ wordId: result.word.id, correct: result.isCorrect, attempts: 1, spelling: result.userSpelling })),
          tier: tierParam,
          durationSeconds,
        });

        updateActiveStudentState({
          hearts: apiResult.heartsRemaining ?? activeStudent.hearts,
          points: apiResult.totalPoints ?? activeStudent.points + apiResult.pointsEarned,
          streak: apiResult.streakDays ?? activeStudent.streak,
          currentTier: apiResult.currentTier ?? activeStudent.currentTier,
        });
        setOverlayPoints(apiResult.pointsEarned || 0);

        delayThenNavigate(() => {
          setShowSuccessOverlay(false);
          navigate('/round-result', {
            state: {
              tier: tierParam,
              score: finalScore,
              totalWords: words.length,
              pointsEarned: apiResult.pointsEarned || 0,
              streakDays: apiResult.streakDays || activeStudent.streak,
              heartsRemaining: apiResult.heartsRemaining || activeStudent.hearts,
              tierAdvanced: apiResult.tierAdvanced,
              earnedBadges: apiResult.earnedBadges || [],
              totalSpentSeconds: apiResult.totalSpentSeconds,
              results,
            },
          });
        });
      } else {
        delayThenNavigate(() => {
          setShowSuccessOverlay(false);
          navigate('/round-result', {
            state: {
              tier: tierParam,
              score: finalScore,
              totalWords: words.length,
              pointsEarned: results.filter((r) => r.isCorrect).length * 10,
              streakDays: 1,
              heartsRemaining: 3,
              earnedBadges: [],
              results,
            },
          });
        });
      }
    } catch {
      // A network hiccup shouldn't lose the learner's progress: keep the
      // round local and finish the game. The results carry the learner's
      // actual spelling so nothing important is lost.
      delayThenNavigate(() => {
        setShowSuccessOverlay(false);
        navigate('/round-result', {
          state: {
            tier: tierParam,
            score: finalScore,
            totalWords: words.length,
            pointsEarned: results.filter((r) => r.isCorrect).length * 10,
            streakDays: activeStudent?.streak || 1,
            heartsRemaining: activeStudent?.hearts || 3,
            earnedBadges: [],
            results,
            syncError: true,
          },
        });
      });
    }
  };

  const handleFeedbackContinue = () => {
    audioFx.playClick();
    if (!feedback) return;
    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setFeedback(null);
    } else {
      const finalResults = wordResults;
      const finalScore = score;
      setFeedback(null);
      void finishRound(finalResults, finalScore);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-navy-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased">
        <Navbar />
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
          <WordBankSkeleton />
        </main>
      </div>
    );
  }

  if (!words.length) {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-navy-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased">
        <Navbar />
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
          <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-6 text-center shadow-xs">
            <h1 className="text-lg font-bold text-amber-950 dark:text-amber-300">No words are available for this round</h1>
            <p className="mt-2 text-sm text-amber-900 dark:text-amber-300">Choose another tier or ask a supervisor to add words to the word bank.</p>
            <button type="button" onClick={() => navigate('/trail')} className="mt-5 min-tap rounded-xl bg-slate-900 dark:bg-navy-700 px-4 py-2 text-sm font-bold text-amber-400">Back to trail</button>
          </div>
        </main>
      </div>
    );
  }

  const completedWords = currentIndex + (feedback ? 1 : 0);
  const progressPercent = Math.round((completedWords / words.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-navy-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Top Game Round Header & Gamified Status */}
        <div className="bg-slate-900 dark:bg-navy-700 border border-slate-800 dark:border-navy-700 text-white rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                audioFx.playClick();
                navigate('/trail');
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer min-tap"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Exit Practice</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {comboStreak > 1 && (
                <div className="flex items-center gap-1 text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3 py-1 rounded-full shadow-xs animate-pulse">
                  <Flame className="w-4 h-4 text-yellow-200 fill-current" />
                  <span>{comboStreak}x Streak!</span>
                </div>
              )}

              <span className="text-xs font-extrabold text-amber-300 bg-slate-800 dark:bg-navy-800 border border-slate-700 dark:border-navy-600 px-3 py-1 rounded-lg">
                Tier {tierParam} Level
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-black text-rose-300 bg-rose-950/80 px-3 py-1 rounded-lg border border-rose-800">
              <Heart className="w-4 h-4 fill-current text-rose-400" />
              <span>{activeStudent?.hearts ?? 3}</span>
            </div>
          </div>

          {/* Honey XP Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span>Word Progress: {completedWords} of {words.length}</span>
              <span className="text-amber-400 font-extrabold">{progressPercent}% Completed</span>
            </div>
            <div className="w-full bg-slate-800 dark:bg-navy-800 h-3 rounded-full overflow-hidden border border-slate-700 dark:border-navy-600 p-0.5">
              <div
                className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {feedback ? (
          /* ---- Per-word result feedback ---- */
          <div
            className={`rounded-2xl p-6 sm:p-8 shadow-md max-w-2xl mx-auto relative overflow-hidden border-2 ${
              feedback.isCorrect
                ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-400'
                : 'bg-gradient-to-br from-rose-50 to-orange-50 border-rose-300'
            }`}
          >
            {feedback.isCorrect && (
              <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-300/30 blur-2xl" />
            )}
            <div className="relative z-10 flex flex-col items-center gap-5 text-center">
              <BeeMascot size="lg" expression={feedback.isCorrect ? 'celebrating' : 'cheering'} className="animate-float" />

              <div className="space-y-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                    feedback.isCorrect
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {feedback.isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {feedback.isCorrect ? 'Correct!' : 'Not quite!'}
                </span>

                <h2 className="text-2xl sm:text-4xl font-black tracking-widest uppercase text-slate-900 break-words leading-tight">
                  {feedback.word.text}
                </h2>

                {!feedback.isCorrect && (
                  <p className="text-sm font-semibold text-rose-700">
                    You spelled: “{feedback.userSpelling || '—'}”
                  </p>
                )}

                {feedback.isCorrect && feedback.xpEarned > 0 && (
                  <div className="inline-flex items-center gap-1.5 bg-amber-400 text-slate-950 font-black text-sm px-4 py-1.5 rounded-full shadow-sm animate-pop">
                    <Zap className="w-4 h-4 fill-current" />
                    +{feedback.xpEarned} XP
                  </div>
                )}
                {feedback.isCorrect && feedback.xpEarned === 0 && (
                  <p className="text-xs font-bold text-emerald-700">Nicely done! No points this round.</p>
                )}
              </div>

              <p className="text-xs font-medium text-slate-600 max-w-md">
                {feedback.isCorrect
                  ? 'Brilliant spelling! You are on a roll.'
                  : `The correct spelling is shown above. Take a deep breath and try the next one — you've got this!`}
              </p>

              <button
                type="button"
                onClick={handleFeedbackContinue}
                className="w-full sm:w-auto min-tap bg-slate-900 dark:bg-navy-700 hover:bg-slate-800 dark:hover:bg-navy-800 text-amber-400 font-extrabold text-xs uppercase tracking-wider py-3 px-8 rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {currentIndex < words.length - 1 ? (
                  <>
                    <span>Next Word</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4" />
                    <span>Finish Round</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          currentWord && (
            <SpellingInteraction
              word={currentWord}
              onSubmit={handleWordSubmit}
              isSubmitting={isSubmitting}
              comboStreak={comboStreak}
            />
          )
        )}
      </main>

      {/* Success Star Burst Overlay Modal */}
      {showSuccessOverlay && (
        <SuccessStarOverlay
          score={score}
          totalWords={words.length}
          pointsEarned={overlayPoints}
          onClose={() => setShowSuccessOverlay(false)}
        />
      )}
    </div>
  );
}
