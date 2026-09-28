import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Badge } from '../api/types';
import Navbar from '../components/Navbar';
import HexagonBadge from '../components/common/HexagonBadge';
import { BadgesGridSkeleton } from '../components/common/Skeletons';
import { Award, Lock, CheckCircle2 } from 'lucide-react';

// Static fallback shown while loading / if the API has no badge records yet.
// These must NOT carry an `unlockedAt`: the card's "Unlocked" state is driven
// by that field, so a hardcoded timestamp would claim badges the learner never
// earned. Only the server's badge records set unlockedAt.
const DEFAULT_BADGES: Badge[] = [
  {
    id: 'b-1',
    code: 'first_word',
    name: 'First Bee Flight',
    description: 'Completed your very first spelling word.',
    icon: '🐝',
  },
  {
    id: 'b-2',
    code: 'streak_3',
    name: 'Streak Pioneer',
    description: 'Maintained a 3-day consecutive spelling streak.',
    icon: '🔥',
  },
  {
    id: 'b-3',
    code: 'tier_1_master',
    name: 'Tier 1 Graduate',
    description: 'Successfully completed all Tier 1 word sets.',
    icon: '🎓',
  },
  {
    id: 'b-4',
    code: 'perfect_round',
    name: 'Perfect Speller',
    description: 'Scored 100% accuracy in a 5-word round.',
    icon: '⭐',
  },
  {
    id: 'b-5',
    code: 'daily_challenger',
    name: 'Daily Word Wiz',
    description: 'Completed a Daily Word Challenge.',
    icon: '📅',
  },
  {
    id: 'b-6',
    code: 'word_collector',
    name: 'Word Collector',
    description: 'Spelled 100 words in total across all tiers.',
    icon: '📚',
  },
  {
    id: 'b-7',
    code: 'hive_master',
    name: 'Hive Master',
    description: 'Reached Tier 6 and conquered the hardest word sets.',
    icon: '👑',
  },
];

export default function BadgesPage() {
  const { activeStudent } = useAuth();
  const [badges, setBadges] = useState<Badge[]>(DEFAULT_BADGES);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchBadges() {
      if (!activeStudent) return;
      setIsLoading(true);
      try {
        const fetched = await apiClient.getStudentBadges(activeStudent.id);
        if (Array.isArray(fetched) && fetched.length > 0) {
          setBadges(fetched);
        }
      } catch {
        // Keep default
      } finally {
        setIsLoading(false);
      }
    }
    fetchBadges();
  }, [activeStudent]);

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-navy-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased">
      <Navbar />

      <main id="main-content" className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="bg-white dark:bg-navy-800 border border-slate-200/80 dark:border-navy-700 rounded-2xl p-6 shadow-xs text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/30 px-3 py-1 rounded-md">
            <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" />
            <span>Student Achievements</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Spelling Badges & Medals</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            Earn custom honeycomb badges by completing word sets, maintaining streaks, and mastering the daily
            challenge.
          </p>
        </div>

        {isLoading ? (
          <BadgesGridSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {badges.map((b) => {
              const isUnlocked = !!b.unlockedAt;

              return (
                <div
                  key={b.id || b.code}
                  className={`bg-white dark:bg-navy-800 border rounded-2xl p-6 shadow-xs flex flex-col items-center text-center space-y-3 transition-all ${
                    isUnlocked
                      ? 'border-slate-200/80 dark:border-navy-700 hover:border-amber-400'
                      : 'border-slate-200 dark:border-navy-700 opacity-60'
                  }`}
                >
                  <HexagonBadge
                    active={isUnlocked}
                    color={isUnlocked ? 'amber' : 'slate'}
                    size="lg"
                    className="shadow-xs"
                  >
                    <span className="text-2xl">{b.icon || '🏅'}</span>
                  </HexagonBadge>

                  <div className="space-y-1">
                    <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">{b.name}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                      {b.description}
                    </p>
                  </div>

                  <div className="pt-2">
                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-200/60 dark:border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
                        <span>Unlocked</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-navy-700 px-2.5 py-1 rounded-md border border-slate-200 dark:border-navy-700">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Locked</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
