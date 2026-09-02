import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { LeaderboardEntry } from '../api/types';
import Navbar from '../components/Navbar';
import { LeaderboardSkeleton } from '../components/common/Skeletons';
import { Trophy } from 'lucide-react';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRanks() {
      setIsLoading(true);
      try {
        const data = await apiClient.getLeaderboard();
        if (Array.isArray(data)) {
          setEntries(data);
        } else {
          setEntries([]);
        }
      } catch {
        setEntries([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRanks();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans text-slate-900 antialiased dark:bg-navy-900 dark:text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs text-center space-y-2 dark:bg-navy-800 dark:border-navy-700">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200/60 px-3 py-1 rounded-md dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30">
            <Trophy className="w-3.5 h-3.5 text-amber-600" />
            <span>Spelling Champions</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Student Leaderboard</h1>
          <p className="text-xs text-slate-500 font-normal dark:text-slate-400">
            Recognizing top spellers based on points earned and daily streak commitment.
          </p>
        </div>

        {isLoading ? (
          <LeaderboardSkeleton />
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3 dark:bg-navy-800 dark:border-navy-700">
            <div className="hidden sm:grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 pb-3 border-b border-slate-100 dark:text-slate-400 dark:border-navy-700">
              <span className="col-span-2">Rank</span>
              <span className="col-span-5">Student</span>
              <span className="col-span-2 text-center">Tier</span>
              <span className="col-span-3 text-right">Points</span>
            </div>

            <div className="space-y-2">
              {entries.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Trophy className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No leaderboard yet</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Points appear here as students practice and build streaks.
                  </p>
                </div>
              ) : (
                entries.map((entry, idx) => {
                const rank = idx + 1;
                let rankBadge = `${rank}`;
                let rankBg = 'bg-slate-100 text-slate-600 dark:bg-navy-700 dark:text-slate-300';

                if (rank === 1) {
                  rankBadge = '🥇';
                  rankBg = 'bg-amber-50 border border-amber-200 text-amber-900 font-bold dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300';
                } else if (rank === 2) {
                  rankBadge = '🥈';
                  rankBg = 'bg-slate-100 border border-slate-200 text-slate-900 font-bold dark:bg-navy-700 dark:border-navy-600 dark:text-slate-100';
                } else if (rank === 3) {
                  rankBadge = '🥉';
                  rankBg = 'bg-amber-100/60 border border-amber-300/80 text-amber-950 font-bold dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300';
                }

                return (
                  <div
                    key={entry.studentId || idx}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 bg-slate-50/70 border border-slate-200/60 rounded-xl hover:border-amber-400 transition-colors dark:bg-navy-900/70 dark:border-navy-700"
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${rankBg}`}>
                      {rankBadge}
                    </span>

                    <span className="font-bold text-sm text-slate-900 min-w-0 flex-1 truncate dark:text-slate-100">
                      {entry.name}
                    </span>

                    {entry.streak > 0 && (
                      <span className="shrink-0 text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200/60 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30">
                        🔥 {entry.streak}d
                      </span>
                    )}

                    <span className="shrink-0 text-right font-bold text-sm text-slate-900 dark:text-slate-100">
                      ⭐ {entry.points.toLocaleString()}
                    </span>

                    <span className="w-full sm:w-auto text-left sm:text-center">
                      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 dark:text-slate-300 dark:bg-navy-700 dark:border-navy-600">
                        Tier {entry.tier}
                      </span>
                    </span>
                  </div>
                );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
