// Small pure display formatters shared by the trail map and round summary.

/** Human-readable practice time: "42s", "7 min", "1.5 hrs". */
export function formatHours(seconds: number): string {
  if (!seconds) return '0h';
  const hours = seconds / 3600;
  if (seconds < 60) return `${seconds}s`;
  if (hours < 1) return `${Math.round(seconds / 60)} min`;
  return `${hours.toFixed(1)} hrs`;
}

/** Star rating (0-3) for a round's accuracy. */
export function starsFor(score: number, totalWords: number): number {
  const accuracy = totalWords > 0 ? score / totalWords : 0;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.6) return 2;
  if (accuracy >= 0.3) return 1;
  return 0;
}
