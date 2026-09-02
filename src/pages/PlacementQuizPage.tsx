import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import BeeMascot from '../components/game/BeeMascot';
import SpellingInteraction from '../components/SpellingInteraction';
import { Word } from '../api/types';
import { Sparkles, Trophy, ArrowRight } from 'lucide-react';

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

  const currentWord = QUIZ_WORDS[currentIndex];

  const handleSpellingSubmit = async (spelledText: string) => {
    const isCorrect = spelledText.toLowerCase() === currentWord.text.toLowerCase();
    const newCorrect = isCorrect ? correctCount + 1 : correctCount;
    setCorrectCount(newCorrect);

    if (currentIndex < QUIZ_WORDS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Calculate final placement tier
      let finalTier = 1;
      if (newCorrect === 3) finalTier = 3;
      else if (newCorrect === 2) finalTier = 2;
      else finalTier = 1;

      setEvaluatedTier(finalTier);
      setQuizFinished(true);

      if (activeStudent) {
        await updateStudentTierLocallyOrApi(finalTier);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-navy-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 flex flex-col justify-center items-center">
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

            <SpellingInteraction word={currentWord} onSubmit={handleSpellingSubmit} />
          </div>
        ) : (
          <div className="bg-white dark:bg-navy-800 border border-slate-200/80 dark:border-navy-700 rounded-2xl p-8 shadow-xs text-center space-y-6 max-w-md w-full animate-fade-in">
            <BeeMascot size="xl" expression="celebrating" className="mx-auto" />

            <div className="space-y-2">
              <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-500/30 text-xs font-semibold px-3 py-1 rounded-md inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Placement Complete!
              </span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Placed in Tier {evaluatedTier}!
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                You spelled {correctCount} out of {QUIZ_WORDS.length} placement words correctly.
                Your learning trail is customized for your level.
              </p>
            </div>

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
