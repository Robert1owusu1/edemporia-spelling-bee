// Unit tests for scoring.ts — the single source of truth for XP/points.
//
// GameLoopPage (feedback card + local fallback total), RoundResultPage (the
// per-word "+N pts" line) and SpellingInteraction (floating XP) all read from
// these helpers, so every number a learner can see is pinned here — and so is
// its agreement with the server:
//
//   points = round(tier * 10 * (1 + clamp(combo, 0, 10) * 0.1))
//
// Per the module contract (mirroring backend/src/controllers/roundController.js),
// `combo` is the streak BEFORE this word counts (0 on the first correct answer
// of a fresh streak), the bonus is capped at combo 10 (2x base), a wrong
// answer always scores 0, the stored combo is capped at 50 (MAX_COMBO) and a
// round total at 2000 (MAX_POINTS_PER_ROUND).

import { describe, expect, it } from 'vitest';

import { MAX_COMBO, MAX_POINTS_PER_ROUND, scoreRound, scoreWord } from '../scoring';

describe('scoreWord', () => {
  describe('base score and tier influence (fresh streak, combo 0)', () => {
    it.each([
      {
        tier: 1,
        expected: 10,
        contract: 'tier 1 first correct word pays plain 10 — no bonus before the streak exists',
      },
      { tier: 2, expected: 20, contract: 'tier 2 first correct word pays plain 20' },
      { tier: 3, expected: 30, contract: 'tier 3 first correct word pays plain 30' },
      { tier: 4, expected: 40, contract: 'tier 4 first correct word pays plain 40' },
      { tier: 5, expected: 50, contract: 'tier 5 first correct word pays plain 50' },
      { tier: 6, expected: 60, contract: 'tier 6 (hardest) first correct word pays plain 60' },
    ])('scoreWord($tier, 0, true) = $expected — $contract', ({ tier, expected }) => {
      expect(scoreWord(tier, 0, true)).toBe(expected);
    });

    it('harder tiers pay strictly more than easier ones at the same combo', () => {
      for (let tier = 1; tier < 6; tier++) {
        expect(
          scoreWord(tier + 1, 3, true),
          `tier ${tier + 1} must out-earn tier ${tier} at combo 3 (difficulty must be worth something)`,
        ).toBeGreaterThan(scoreWord(tier, 3, true));
      }
    });
  });

  describe('combo scaling and the combo cap (combo = streak before this word)', () => {
    it.each([
      { tier: 1, combo: 0, expected: 10, contract: 'first correct word: no combo yet, plain base' },
      { tier: 1, combo: 1, expected: 11, contract: 'second correct word adds a 10% bonus' },
      { tier: 1, combo: 2, expected: 12, contract: 'third correct word adds a 20% bonus' },
      { tier: 1, combo: 4, expected: 14, contract: 'combo 4 adds a 40% bonus' },
      { tier: 1, combo: 9, expected: 19, contract: 'combo 9 adds a 90% bonus' },
      { tier: 3, combo: 5, expected: 45, contract: 'the combo bonus multiplies the tier base (3 × 10 × 1.5)' },
    ])('scoreWord($tier, $combo, true) = $expected — $contract', ({ tier, combo, expected }) => {
      expect(scoreWord(tier, combo, true)).toBe(expected);
    });

    it.each([
      { tier: 1, combo: 10, expected: 20, contract: 'at combo 10 the bonus reaches its 2x ceiling' },
      { tier: 1, combo: 11, expected: 20, contract: 'combo 11 must NOT out-earn the capped combo 10' },
      {
        tier: 1,
        combo: MAX_COMBO,
        expected: 20,
        contract: 'the backend allows streaks up to 50 — the cap still holds at 2x',
      },
      { tier: 6, combo: 10, expected: 120, contract: 'cap applies to the hardest tier too (6 × 10 × 2)' },
      {
        tier: 6,
        combo: MAX_COMBO,
        expected: 120,
        contract: 'a runaway tier-6 streak can never exceed 120 points a word',
      },
    ])('scoreWord($tier, $combo, true) = $expected — $contract', ({ tier, combo, expected }) => {
      expect(scoreWord(tier, combo, true)).toBe(expected);
    });

    it('the combo bonus grows monotonically but never past the cap', () => {
      let previous = 0;
      for (let combo = 0; combo <= 20; combo++) {
        const points = scoreWord(2, combo, true);
        expect(points, `combo ${combo} must not pay less than combo ${combo - 1}`).toBeGreaterThanOrEqual(previous);
        expect(points, `combo ${combo} must respect the 2x cap (max 40 at tier 2)`).toBeLessThanOrEqual(40);
        previous = points;
      }
    });
  });

  describe('combo edge cases', () => {
    it.each([
      { tier: 1, combo: -5, contract: 'a negative combo is clamped to "no combo" instead of underpaying' },
      { tier: 6, combo: -1, contract: 'a negative combo on the hardest tier clamps to tier 6 base' },
    ])('scoreWord($tier, $combo, true) matches the combo-0 score — $contract', ({ tier, combo }) => {
      expect(scoreWord(tier, combo, true), `combo ${combo} must clamp to 0, not crash or underpay`).toBe(
        scoreWord(tier, 0, true),
      );
      expect(scoreWord(tier, combo, true), `tier ${tier} combo ${combo} must still pay the plain base`).toBe(tier * 10);
    });

    it.each([
      { combo: Number.NaN, contract: 'a NaN combo scores as "no combo" instead of poisoning the result with NaN' },
      {
        combo: Number.POSITIVE_INFINITY,
        contract: 'an infinite combo scores as "no combo" instead of paying Infinity',
      },
      { combo: Number.NEGATIVE_INFINITY, contract: 'a -Infinity combo scores as "no combo"' },
    ])('scoreWord(3, $combo, true) stays a finite number — $contract', ({ combo }) => {
      const points = scoreWord(3, combo, true);
      expect(Number.isFinite(points), `combo ${combo} must never produce ${points}`).toBe(true);
      expect(points).toBe(30);
    });
  });

  describe('tier edge cases', () => {
    it.each([
      { tier: 0, contract: 'tier 0 is not a real difficulty — falls back to tier 1' },
      { tier: -3, contract: 'a negative tier falls back to tier 1' },
      { tier: Number.NaN, contract: 'a NaN tier falls back to tier 1 instead of poisoning the score' },
      { tier: Number.POSITIVE_INFINITY, contract: 'an infinite tier falls back to tier 1 instead of paying Infinity' },
    ])('scoreWord($tier, 0, true) equals scoreWord(1, 0, true) — $contract', ({ tier }) => {
      expect(scoreWord(tier, 0, true)).toBe(10);
    });
  });

  describe('rounding', () => {
    it('always returns a whole number of points (no fractional XP is ever shown)', () => {
      for (let tier = 1; tier <= 6; tier++) {
        for (let combo = 0; combo <= 12; combo++) {
          expect(
            Number.isInteger(scoreWord(tier, combo, true)),
            `scoreWord(${tier}, ${combo}, true) must be an integer — learners can only earn whole points`,
          ).toBe(true);
        }
      }
    });

    it('rounds half-way values up (Math.round), absorbing floating-point noise', () => {
      // 2.5 × 10 × 1.1 = 27.5 → 28, and 3 × 10 × 1.1 = 33.00000000000001 → 33.
      expect(scoreWord(2.5, 1, true), '27.5 must round up to 28 (Math.round halves upward)').toBe(28);
      expect(scoreWord(3, 1, true), 'float noise from 1.1 × 30 must not surface as 33.00000000000001').toBe(33);
    });
  });

  describe('wrong answers', () => {
    it.each([
      { tier: 1, combo: 1, contract: 'an easy first-word mistake' },
      { tier: 3, combo: 5, contract: 'a mid-streak mistake must not pay the accumulated combo' },
      { tier: 6, combo: 10, contract: 'even the hardest word at full combo pays 0 when wrong' },
      { tier: 6, combo: MAX_COMBO, contract: 'a runaway streak pays nothing on a wrong word' },
      { tier: 1, combo: 0, contract: 'wrong + combo 0 stays 0' },
    ])('scoreWord($tier, $combo, false) = 0 — $contract', ({ tier, combo }) => {
      expect(scoreWord(tier, combo, false), `wrong answer at tier ${tier}/combo ${combo} must score 0`).toBe(0);
    });
  });
});

describe('scoreRound', () => {
  it('an empty round is worth 0 points', () => {
    expect(scoreRound([]), 'a round with no results must total 0').toBe(0);
  });

  it('a round of only wrong answers is worth 0 points', () => {
    const results = [
      { tier: 1, combo: 0, correct: false },
      { tier: 4, combo: 0, correct: false },
      { tier: 6, combo: 0, correct: false },
    ];
    expect(scoreRound(results), 'wrong answers must never contribute to the round total').toBe(0);
  });

  it('totals a representative mixed round exactly (pre-increment combo per word)', () => {
    // Fresh streak: word 1 scores at combo 0, word 2 at combo 1, word 3 at
    // combo 2 (the wrong word reset the streak for word 4).
    const results = [
      { tier: 1, combo: 0, correct: true }, // 10
      { tier: 3, combo: 1, correct: true }, // round(30 × 1.1) = 33
      { tier: 6, combo: 2, correct: true }, // round(60 × 1.2) = 72
      { tier: 2, combo: 0, correct: false }, // 0
    ];
    expect(
      scoreRound(results),
      'the round summary must equal 10 + 33 + 72 + 0 — the number RoundResultPage shows the learner',
    ).toBe(115);
  });

  it('always equals the sum of scoreWord over the round’s results', () => {
    const results = [
      { tier: 1, combo: 0, correct: true },
      { tier: 2, combo: 1, correct: true },
      { tier: 2, combo: 2, correct: false },
      { tier: 4, combo: 3, correct: true },
      { tier: 6, combo: 10, correct: true },
      { tier: 5, combo: 0, correct: true },
    ];
    const sumOfWords = results.reduce(
      (total, result) => total + scoreWord(result.tier, result.combo, result.correct),
      0,
    );
    expect(
      scoreRound(results),
      'scoreRound must be exactly the sum of scoreWord — GameLoopPage relies on this to keep the local fallback total identical to the per-word feedback',
    ).toBe(sumOfWords);
  });

  it(`never exceeds the server's ${MAX_POINTS_PER_ROUND}-point round ceiling`, () => {
    // A tampered or absurd round (40 hardest-tier words at full combo) must
    // clamp exactly where roundController clamps.
    const results = Array.from({ length: 40 }, () => ({ tier: 6, combo: 10, correct: true }));
    const uncapped = results.length * 120;
    expect(uncapped, 'precondition: the round really would exceed the ceiling').toBeGreaterThan(MAX_POINTS_PER_ROUND);
    expect(scoreRound(results), 'the local fallback total must apply MAX_POINTS_PER_ROUND like the server does').toBe(
      MAX_POINTS_PER_ROUND,
    );
  });
});
