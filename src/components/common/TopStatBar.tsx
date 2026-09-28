interface TopStatBarProps {
  hearts: number;
  /** Consecutive practice days (`Student.dailyStreak`), not the round combo. */
  streakDays: number;
  points: number;
  tier?: number;
}

export default function TopStatBar({ hearts, streakDays, points, tier }: TopStatBarProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-2.5 bg-slate-800/90 border border-slate-700/80 px-3 py-1 rounded-xl">
      {/* Hearts */}
      <div
        className="flex items-center gap-1 text-xs font-bold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-800/60"
        title="Active Hearts (Lives)"
      >
        <span className="text-xs">❤️</span>
        <span>{hearts}</span>
      </div>

      {/* Streak */}
      <div
        className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-800/60"
        title="Spelling Streak Days"
      >
        <span className="text-xs">🔥</span>
        <span>{streakDays}d</span>
      </div>

      {/* Points */}
      <div
        className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-700/80"
        title="Total Points Earned"
      >
        <span className="text-xs">⭐</span>
        <span>{points.toLocaleString()}</span>
      </div>

      {/* Tier Badge */}
      {tier !== undefined && (
        <div
          className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-800/60"
          title="Current Difficulty Tier"
        >
          <span>Tier {tier}</span>
        </div>
      )}
    </div>
  );
}
