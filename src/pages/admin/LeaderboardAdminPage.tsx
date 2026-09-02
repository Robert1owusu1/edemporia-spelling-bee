import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';
import type { LeaderboardEntry } from '../../api/types';

export default function LeaderboardAdminPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient.getLeaderboard();
        setEntries([...data].sort((a, b) => b.points - a.points));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load leaderboard.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const rankedEntries = useMemo(() => entries.map((entry, index) => ({ ...entry, rank: index + 1 })), [entries]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Oversight</p>
        <h2 className="text-2xl font-semibold text-[#0A1128] dark:text-slate-100">Leaderboard</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">A read-only view of learner progress for staff oversight.</p>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div> : null}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-10 text-center text-sm text-slate-600 dark:text-slate-400">Loading leaderboard…</div>
      ) : rankedEntries.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-10 text-center text-sm text-slate-600 dark:text-slate-400">No leaderboard data yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-navy-700 text-sm">
            <thead className="bg-slate-50 dark:bg-navy-700 text-left text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Rank</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Points</th>
                <th className="px-4 py-3 font-semibold">Streak</th>
                <th className="px-4 py-3 font-semibold">Class</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-navy-700">
              {rankedEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 font-semibold text-[#0A1128] dark:text-slate-100">#{entry.rank}</td>
                  <td className="px-4 py-3">{entry.name}</td>
                  <td className="px-4 py-3">{entry.points}</td>
                  <td className="px-4 py-3">{entry.streak} day{entry.streak === 1 ? '' : 's'}</td>
                  <td className="px-4 py-3">{entry.className || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
