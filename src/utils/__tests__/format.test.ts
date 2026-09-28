// Unit tests for format.ts — the pure display formatters behind the trail map
// and round summary.
//
// formatHours feeds RoundResultPage ("time spent" on the summary card) and
// TrailMapPage (practice-time badge); starsFor feeds RoundResultPage and
// SuccessStarOverlay (the 0-3 star rating shown after a round). Both must
// render deterministic strings/bands for every input a page can pass,
// including the zero defaults the pages use (`totalSpentSeconds || 0`).

import { describe, expect, it } from 'vitest';

import { formatHours, starsFor } from '../format';

describe('formatHours', () => {
  describe('zero', () => {
    it('renders 0 seconds as the "0h" placeholder used by empty totals', () => {
      expect(formatHours(0), 'zero practice time must show "0h" (the pages pass `totalSpentSeconds || 0`)').toBe('0h');
    });
  });

  describe('sub-hour values', () => {
    it.each([
      { seconds: 42, expected: '42s', contract: 'a few seconds render as raw seconds' },
      { seconds: 1, expected: '1s', contract: 'the smallest nonzero value still renders' },
      { seconds: 59, expected: '59s', contract: '59s is the last second-denominated value' },
      { seconds: 60, expected: '1 min', contract: 'exactly one minute switches to the minutes format' },
      { seconds: 89, expected: '1 min', contract: '89 seconds round down to 1 min' },
      { seconds: 90, expected: '2 min', contract: '90 seconds round up to 2 min' },
      { seconds: 1800, expected: '30 min', contract: 'half an hour renders as 30 min' },
      { seconds: 3540, expected: '59 min', contract: '59 minutes is the last whole-minute value' },
      { seconds: 3599, expected: '60 min', contract: 'the minute branch wins below 1h even when it rounds to 60 min' },
    ])('formatHours($seconds) = "$expected" — $contract', ({ seconds, expected }) => {
      expect(formatHours(seconds), `formatHours(${seconds}) must render "${expected}"`).toBe(expected);
    });
  });

  describe('hours values', () => {
    it.each([
      { seconds: 3600, expected: '1.0 hrs', contract: 'exactly one hour switches to the hours format' },
      { seconds: 3601, expected: '1.0 hrs', contract: 'just past the hour still reads 1.0 hrs' },
      { seconds: 3960, expected: '1.1 hrs', contract: 'hours are shown to one decimal place' },
      { seconds: 5400, expected: '1.5 hrs', contract: 'an hour and a half reads 1.5 hrs' },
      { seconds: 36000, expected: '10.0 hrs', contract: 'ten hours keeps the trailing .0 for a stable look' },
      { seconds: 360000, expected: '100.0 hrs', contract: 'a hundred hours does not switch units again' },
      {
        seconds: 3600000,
        expected: '1000.0 hrs',
        contract: 'very large totals render in full, without exponent notation',
      },
    ])('formatHours($seconds) = "$expected" — $contract', ({ seconds, expected }) => {
      expect(formatHours(seconds), `formatHours(${seconds}) must render "${expected}"`).toBe(expected);
    });

    it('renders exactly one unit per string (s | min | hrs)', () => {
      const formats = [/^\d+s$/, /^\d+ min$/, /^\d+\.\d+ hrs$/, /^0h$/];
      for (const seconds of [0, 42, 1800, 3599, 3600, 5400, 3600000]) {
        const rendered = formatHours(seconds);
        expect(
          formats.some((format) => format.test(rendered)),
          `formatHours(${seconds}) = "${rendered}" must match one unit format exactly (Ns | N min | N.N hrs) — never a mix like "60s min"`,
        ).toBe(true);
      }
    });
  });
});

describe('starsFor', () => {
  describe('accuracy bands', () => {
    it.each([
      { score: 10, total: 10, expected: 3, contract: 'a perfect round gets 3 stars' },
      { score: 9, total: 10, expected: 3, contract: 'the 90% boundary itself is 3 stars (>= 0.9)' },
      { score: 8, total: 10, expected: 2, contract: 'just under 90% drops to 2 stars' },
      { score: 6, total: 10, expected: 2, contract: 'the 60% boundary itself is 2 stars (>= 0.6)' },
      { score: 5, total: 10, expected: 1, contract: 'just under 60% drops to 1 star' },
      { score: 3, total: 10, expected: 1, contract: 'the 30% boundary itself is 1 star (>= 0.3)' },
      { score: 2, total: 10, expected: 0, contract: 'just under 30% gets no stars' },
      { score: 0, total: 10, expected: 0, contract: 'an all-wrong round gets no stars' },
      { score: 27, total: 30, expected: 3, contract: '90% on a 30-word sample is still 3 stars' },
      { score: 18, total: 30, expected: 2, contract: '60% on a 30-word sample is still 2 stars' },
      { score: 12, total: 30, expected: 1, contract: '40% on a 30-word sample is still 1 star' },
    ])('starsFor($score, $total) = $expected — $contract', ({ score, total, expected }) => {
      expect(starsFor(score, total), `accuracy ${score}/${total} must map to ${expected} star(s)`).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it.each([
      { score: 0, total: 0, expected: 0, contract: 'a round with no words must not divide by zero' },
      { score: 5, total: 0, expected: 0, contract: 'a nonsensical score with no words still renders 0 stars' },
      { score: 12, total: 10, expected: 3, contract: 'score above total (over-credit) clamps to the 3-star ceiling' },
      { score: -1, total: 10, expected: 0, contract: 'a negative score renders 0 stars, never a negative rating' },
    ])('starsFor($score, $total) = $expected — $contract', ({ score, total, expected }) => {
      expect(starsFor(score, total), `starsFor(${score}, ${total}) must be ${expected}`).toBe(expected);
    });
  });
});
