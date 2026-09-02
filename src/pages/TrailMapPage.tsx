import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BeeMascot from '../components/game/BeeMascot';
import HexagonBadge from '../components/common/HexagonBadge';
import { audioFx } from '../utils/audioEffects';
import { Map, Lock, Play, CheckCircle2, Sparkles, Star, Trophy, Flame } from 'lucide-react';

export default function TrailMapPage() {
  const navigate = useNavigate();
  const { activeStudent } = useAuth();

  const currentTier = activeStudent?.currentTier || 1;

  const formatHours = (seconds: number) => {
    if (!seconds) return '0h';
    const hours = seconds / 3600;
    if (seconds < 60) return `${seconds}s`;
    if (hours < 1) return `${Math.round(seconds / 60)} min`;
    return `${hours.toFixed(1)} hrs`;
  };

  const TIERS = [
    {
      tier: 1,
      title: 'Tier 1: Beginner Buzz',
      description: 'Core phonemes, 3-5 letter foundational vocabulary words.',
      wordCount: '15 Words',
      color: 'amber' as const,
    },
    {
      tier: 2,
      tierRequired: 2,
      title: 'Tier 2: Intermediate Hive',
      description: 'Blend sounds, silent vowels, 6-8 letter spelling words.',
      wordCount: '20 Words',
      color: 'indigo' as const,
    },
    {
      tier: 3,
      tierRequired: 3,
      title: 'Tier 3: Advanced Honeycomb',
      description: 'Complex roots, prefixes, suffixes, 8+ letter challenging words.',
      wordCount: '25 Words',
      color: 'emerald' as const,
    },
    {
      tier: 4,
      tierRequired: 4,
      title: 'Tier 4: Word Explorer (Age 9-11)',
      description: 'Longer everyday words: brilliant, journey, discovery, community & temperature.',
      wordCount: '30 Words',
      color: 'amber' as const,
    },
    {
      tier: 5,
      tierRequired: 5,
      title: 'Tier 5: Story Seeker (Age 11-13)',
      description: 'Richer vocabulary! Master appreciation, atmosphere, exploration, cooperation & magnificent.',
      wordCount: '35 Words',
      color: 'indigo' as const,
    },
    {
      tier: 6,
      tierRequired: 6,
      title: 'Tier 6: Bee Champion (Age 13-15)',
      description: 'Grandmaster spelling! Conquer extraordinary, perseverance, responsibility & conscientious.',
      wordCount: '40 Words',
      color: 'emerald' as const,
    },
    {
      tier: 7,
      tierRequired: 6,
      title: 'Special Node: Hive Legend',
      description: 'Bonus challenge words for confident learners ready for the toughest spelling puzzles.',
      wordCount: '12 Bonus Words',
      color: 'indigo' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-navy-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Gamified Map Header */}
        <div className="bg-slate-900 dark:bg-navy-800 border border-slate-800 dark:border-navy-700 text-white rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-300 bg-amber-950/80 border border-amber-800/80 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Current Level: Tier {currentTier} Explorer</span>
            </div>
            <h1 className="text-2xl font-black text-white">Spelling Adventure Trail</h1>
            <p className="text-xs text-slate-400 font-medium">
              Travel along the honey trail to unlock grandmaster spelling achievements!
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Points</span>
              <span className="text-amber-400 font-black text-lg">{activeStudent?.points || 0} XP</span>
            </div>
            <div className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Hours Spent</span>
              <span className="text-amber-400 font-black text-lg">{formatHours(activeStudent?.totalSpentSeconds || 0)}</span>
            </div>
            <BeeMascot size="md" expression="cheering" />
          </div>
        </div>

        {/* Vertical Trail Path */}
        <div className="space-y-6 relative before:absolute before:left-8 sm:before:left-12 before:top-8 before:bottom-8 before:w-1.5 before:bg-amber-200/80 z-0">
          {TIERS.map((t) => {
            // `tierRequired` is the currentTier the learner must reach for this
            // node to open (the Special Node uses 6 even though its own `tier`
            // is 7), so it unlocks exactly when it should and can never be
            // permanently locked because currentTier caps at 6.
            const requiredTier = t.tierRequired ?? t.tier;
            const isCurrent = currentTier === requiredTier && currentTier < t.tier;
            const isUnlocked = currentTier >= requiredTier;
            const isCompleted = currentTier > requiredTier;

            return (
              <div
                key={t.tier}
                className={`relative z-10 flex items-start gap-4 sm:gap-6 bg-white dark:bg-navy-800 border rounded-2xl p-6 shadow-xs transition-all ${
                  isCurrent
                    ? 'border-2 border-amber-500 ring-4 ring-amber-400/20 shadow-md'
                    : isUnlocked
                    ? 'border-slate-200 dark:border-navy-700 hover:border-amber-300'
                    : 'border-slate-200 dark:border-navy-700 opacity-60 bg-slate-50 dark:bg-navy-700'
                }`}
              >
                {/* Node Hexagon Badge */}
                <div className="shrink-0 relative">
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap animate-bounce">
                      🐝 Active Stage
                    </div>
                  )}
                  <HexagonBadge
                    active={isUnlocked}
                    color={t.color}
                    size="lg"
                    className="shadow-xs"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    ) : isUnlocked ? (
                      <Star className="w-7 h-7 text-amber-500 fill-amber-400" />
                    ) : (
                      <Lock className="w-6 h-6 text-slate-400" />
                    )}
                  </HexagonBadge>
                </div>

                {/* Node Content */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{t.title}</h3>
                      {isCompleted && (
                        <span className="flex items-center text-amber-500 text-xs">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-navy-700 border border-slate-200 dark:border-navy-700 px-2.5 py-0.5 rounded-md">
                      {t.wordCount}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    {t.description}
                  </p>

            <div className="pt-2">
              {isUnlocked ? (
                <button
                  type="button"
                  onClick={() => {
                    audioFx.playClick();
                    // The game engine supports tiers 1-6, so the Special Node's
                    // bonus challenge is served from the hardest real tier.
                    navigate(`/game?tier=${Math.min(t.tier, 6)}`);
                  }}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs uppercase tracking-wider py-3 min-tap px-4 rounded-xl transition-all cursor-pointer shadow-xs inline-flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play {t.tier > 6 ? 'Special Challenge' : `Tier ${t.tier} Challenge`}</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Locked: Complete Tier {requiredTier} first</span>
                </div>
              )}
            </div>
                  </div>
                </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}

