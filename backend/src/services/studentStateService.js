// Shared gameplay-state rules: lazy hearts regeneration, the daily-practice
// streak and the economy caps. Every path that reads or writes a learner's
// state goes through these helpers so login, GET /students, round submit and
// the daily challenge can never report different numbers for the same row.

const MAX_HEARTS = 5;
const HEART_REGEN_INTERVAL_MS = 15 * 60 * 1000;

// Economy ceilings (see roundController): a tampered client can submit
// auto-correct answers for the whole word bank, so both totals are bounded.
const MAX_STUDENT_POINTS = 500000;
const MAX_STUDENT_STREAK = 50; // round combo cap

// Pure UTC calendar day (YYYY-MM-DD). This is the day key used for
// dailyStreak bookkeeping and for DailyChallengeCompletion.date -- a single
// string, independent of the server's local timezone and DST.
function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// The UTC day before `dayKey`.
function previousUtcDay(dayKey) {
  return new Date(Date.parse(`${dayKey}T00:00:00Z`) - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function toMillis(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

// Lazy hearts regeneration: 1 heart per 15 minutes since heartsUpdatedAt,
// capped at MAX_HEARTS. Pure function over the stored row -- read paths use it
// to report the current value without writing, write paths persist its result.
// A lost heart restarts the clock (write paths stamp heartsUpdatedAt on the
// loss), so time can never be "banked" while the learner is full.
function computeHearts(student, now = Date.now()) {
  const current = Math.max(0, Math.min(MAX_HEARTS, Number(student.hearts) || 0));
  const stamp = toMillis(student.heartsUpdatedAt);
  if (current >= MAX_HEARTS || stamp === null) {
    return { hearts: current, heartsUpdatedAt: new Date(stamp === null ? now : stamp) };
  }
  const gained = Math.floor((Math.max(now, stamp) - stamp) / HEART_REGEN_INTERVAL_MS);
  if (gained <= 0) return { hearts: current, heartsUpdatedAt: new Date(stamp) };
  return {
    hearts: Math.min(MAX_HEARTS, current + gained),
    // Keep the remainder so partial intervals are not lost on every apply.
    heartsUpdatedAt: new Date(stamp + gained * HEART_REGEN_INTERVAL_MS),
  };
}

// Consecutive practice days. Called once per scored activity (round submit or
// daily-challenge completion) with the row already locked for the transaction:
//   same UTC day  -> unchanged
//   yesterday     -> +1
//   gap or none   -> restart at 1
// This is NOT the round combo (`streak`), which still resets on a wrong word.
function nextDailyStreak(student, dayKey = utcDayKey()) {
  const current = Number(student.dailyStreak) || 0;
  if (student.lastPracticeDay === dayKey) return { dailyStreak: current, lastPracticeDay: dayKey };
  if (student.lastPracticeDay && student.lastPracticeDay === previousUtcDay(dayKey)) {
    return { dailyStreak: current + 1, lastPracticeDay: dayKey };
  }
  return { dailyStreak: 1, lastPracticeDay: dayKey };
}

module.exports = {
  MAX_HEARTS,
  HEART_REGEN_INTERVAL_MS,
  MAX_STUDENT_POINTS,
  MAX_STUDENT_STREAK,
  utcDayKey,
  previousUtcDay,
  computeHearts,
  nextDailyStreak,
};
