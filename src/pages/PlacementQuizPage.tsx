import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import Navbar from '../components/Navbar';
import BeeMascot from '../components/BeeMascot';
import SpellingInteraction from '../components/SpellingInteraction';
import { audioFx } from '../utils/audioEffects';
import { Word } from '../api/types';
import { Sparkles, ArrowRight, AlertCircle } from 'lucide-react';

const QUIZ_WORDS: Word[] = [
  {
    id: 'quiz-1',
    tier: 1,
    text: 'bee',
    definition: 'A yellow and black flying insect that makes honey.',
    exampleSentence: 'The busy bee gathered pollen from the flower.',
  },
  {
    id: 'quiz-2',
    tier: 2,
    text: 'planet',
    definition: 'A large celestial body orbiting a star.',
    exampleSentence: 'Earth is the third planet from the Sun.',
  },
  {
    id: 'quiz-3',
    tier: 3,
    text: 'dinosaur',
    definition: 'A prehistoric reptile that lived millions of years ago.',
    exampleSentence: 'The museum featured a huge dinosaur fossil.',
  },
];

export default function PlacementQuizPage() {
  const navigate = useNavigate();
  const { activeStudent, updateStudentTierLocallyOrApi } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [evaluatedTier, setEvaluatedTier] = useState(1);
  const [placementNotice, setPlacementNotice] = useState<string | null>(null);
  const [placementError, setPlacementError] = useState<string | null>(null);

  const currentWord = QUIZ_WORDS[currentIndex];

  const handleSpellingSubmit = async (spelledText: string) => {
    const isCorrect = spelledText.toLowerCase() === currentWord.text.toLowerCase();
    const newCorrect = isCorrect ? correctCount + 1 : correctCount;
    setCorrectCount(newCorrect);

    // This page owns its answer sounds (SpellingInteraction plays none).
    if (isCorrect) audioFx.playCorrect();
    else audioFx.playIncorrect();

    if (currentIndex < QUIZ_WORDS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Calculate final placement tier: 3/3 answers → tier 3, 2/3 → tier 2.
      const finalTier = newCorrect === 3 ? 3 : newCorrect === 2 ? 2 : 1;

      setEvaluatedTier(finalTier);
      setQuizFinished(true);

      if (activeStudent) {
        try {
          await updateStudentTierLocallyOrApi(finalTier);
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            // Placement was already completed earlier — the learner already has
            // a tier, so acknowledge it and carry on to the trail.
            setPlacementNotice('You already completed your placement, so your existing tier stays as it is.');
            return;
          }
          setPlacementError(
            err instanceof Error
              ? `We couldn't save your placement tier: ${err.message}`
              : "We couldn't save your placement tier. Please try again from your profile.",
          );
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-navy-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased">
      <Navbar />

      <main
        id="main-content"
        className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 flex flex-col justify-center items-center"
      >
        {!quizFinished ? (
          <div className="w-full space-y-6">
            <div className="bg-white dark:bg-navy-800 border border-slate-200/80 dark:border-navy-700 rounded-2xl p-6 text-center space-y-2 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-navy-700 pb-3">
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  Placement Quiz • Word {currentIndex + 1} of {QUIZ_WORDS.length}
                </span>
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-200/60 dark:border-indigo-500/30">
                  Assessing Tier Level
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Let's find your starting spelling tier!
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Listen to the word below and spell it aloud.
              </p>
            </div>

            <SpellingInteraction word={currentWord} onSubmit={handleSpellingSubmit} showXp={false} />
          </div>
        ) : (
          <div className="bg-white dark:bg-navy-800 border border-slate-200/80 dark:border-navy-700 rounded-2xl p-8 shadow-xs text-center space-y-6 max-w-md w-full animate-fade-in">
            <BeeMascot variant="emoji" size="xl" expression="celebrating" className="mx-auto" />

            <div className="space-y-2">
              <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-500/30 text-xs font-semibold px-3 py-1 rounded-md inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Placement Complete!
              </span>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Placed in Tier {evaluatedTier}!</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                You spelled {correctCount} out of {QUIZ_WORDS.length} placement words correctly. Your learning trail is
                customized for your level.
              </p>
            </div>

            {placementError && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-800 dark:text-rose-300 flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{placementError}</span>
              </div>
            )}
            {placementNotice && (
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-3 text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-start gap-2 text-left">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{placementNotice}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate('/trail')}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <span>Explore Trail Map</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
