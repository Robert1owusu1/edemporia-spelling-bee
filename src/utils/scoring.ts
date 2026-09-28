// Single source of truth for how many points a spelled word is worth.
// The floating XP animation (SpellingInteraction), the awarded points shown in
// the feedback card (GameLoopPage) and the round summary (RoundResultPage) all
// call this so the learner never sees three different numbers for one word —
// and so those numbers agree with what the SERVER actually writes.
//
// This mirrors backend/src/controllers/roundController.js exactly:
//   earned = Math.round(tier * 10 * (1 + Math.min(streak, 10) * 0.1))
// where `streak` is the stored combo BEFORE this word increments it, the
// combo is capped at MAX_STUDENT_STREAK (50) and the round total at
// MAX_POINTS_PER_ROUND (2000).

/** Upper bound on the combo multiplier, so a long streak can't run away. */
const COMBO_CAP = 10;

/** Hard cap on the stored combo — mirrors MAX_STUDENT_STREAK in roundController. */
export const MAX_COMBO = 50;

/** Per-round points ceiling — mirrors MAX_POINTS_PER_ROUND in roundController. */
export const MAX_POINTS_PER_ROUND = 2000;

/**
 * Points awarded for a single word.
 *
 * @param tier    The word's difficulty tier (1-6); harder words pay more.
 * @param combo   The round combo *before* this word counts (0 on the first
 *                correct answer of a fresh streak) — the same value the
 *                backend scores on before it increments the stored streak.
 * @param correct Whether the learner spelled the word correctly.
 */
export function scoreWord(tier: number, combo: number, correct: boolean): number {
  if (!correct) return 0;
  const effectiveTier = Number.isFinite(tier) && tier > 0 ? tier : 1;
  // A non-finite combo (NaN from a bad hand-off, Infinity from tampering)
  // scores as "no combo" instead of poisoning the result with NaN.
  const safeCombo = Number.isFinite(combo) ? Math.max(combo, 0) : 0;
  const comboBonus = Math.min(safeCombo, COMBO_CAP) * 0.1;
  return Math.round(effectiveTier * 10 * (1 + comboBonus));
}

/**
 * Total points for a finished round, using `scoreWord` for every word and
 * applying the same per-round ceiling the server enforces.
 */
export function scoreRound(results: Array<{ tier: number; combo: number; correct: boolean }>): number {
  const total = results.reduce((sum, result) => sum + scoreWord(result.tier, result.combo, result.correct), 0);
  return Math.min(total, MAX_POINTS_PER_ROUND);
}
