import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Word } from '../api/types';
import Navbar from '../components/Navbar';
import SpellingInteraction from '../components/SpellingInteraction';
import SuccessStarOverlay from '../components/SuccessStarOverlay';
import { WordBankSkeleton } from '../components/common/Skeletons';
import { Calendar, Sparkles, Trophy, ArrowRight } from 'lucide-react';

export default function DailyChallengePage() {
  const navigate = useNavigate();
  const { activeStudent, updateActiveStudentState } = useAuth();

  const [dailyWord, setDailyWord] = useState<Word | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchDaily() {
      setIsLoading(true);
      try {
        const fetched = await apiClient.getDailyChallenge(activeStudent?.id);
        setDailyWord(fetched.word);
        setIsCompleted(fetched.completedToday);
      } catch {
        setDailyWord(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDaily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudent?.id]);

  const handleSubmit = async (spelledText: string) => {
    if (!dailyWord || submitting) return;
    setSubmitting(true);

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
            streak: result.streakDays ?? activeStudent.streak,
            hearts: result.heartsRemaining ?? activeStudent.hearts,
          });
        }
      } catch (error) {
        setSubmitting(false);
        alert(error instanceof Error ? error.message : 'Unable to record today’s challenge. Check your connection and try again.');
        return;
      }
    }

    if (isCorrect) {
      setShowSuccessOverlay(true);
      setIsCompleted(true);
      setJustCompleted(true);

      setTimeout(() => {
        setShowSuccessOverlay(false);
      }, 3000);
    } else {
      setSubmitting(false);
      alert(`We heard "${spelledText}". Today's word is "${dailyWord.text}". This daily challenge has been recorded, so a new challenge will be available tomorrow.`);
      navigate('/home');
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

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-navy-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
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

        {!isCompleted && dailyWord ? (
          <SpellingInteraction word={dailyWord} onSubmit={handleSubmit} />
        ) : (
          <div className="bg-white dark:bg-navy-800 border border-slate-200/80 dark:border-navy-700 rounded-2xl p-8 shadow-xs text-center space-y-6 max-w-md mx-auto">
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
        <SuccessStarOverlay
          score={1}
          totalWords={1}
          onClose={() => setShowSuccessOverlay(false)}
        />
      )}
    </div>
  );
}
