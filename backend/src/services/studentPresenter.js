const prisma = require("../db/prismaClient");
const { Prisma } = require("@prisma/client");
const { computeHearts } = require("./studentStateService");

// Midnight of the CURRENT UTC day -- the same day boundary the streak and the
// daily challenge use (utcDayKey), so "today" stats and the practice-day
// streak always agree. A local-timezone midnight would shift the counts by
// the server's offset relative to every other day calculation in the backend.
function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Most recent activity rows for a whole batch of learners in ONE query: the
// window function keeps the newest 10 rows per student instead of running a
// findMany per student. `createdAt` is rendered by Postgres as an ISO string
// (the column holds UTC values) so the timezone round-trip is explicit.
async function recentProgressFor(studentIds) {
  if (!studentIds.length) return [];
  return prisma.$queryRaw`
    SELECT p."id", p."studentId", p."correct",
           to_char(p."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
           w."text" AS "wordText", w."tier" AS "wordTier"
    FROM (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY "studentId" ORDER BY "createdAt" DESC) AS "rn"
      FROM "Progress"
      WHERE "studentId" IN (${Prisma.join(studentIds)})
    ) p
    JOIN "Word" w ON w."id" = p."wordId"
    WHERE p."rn" <= 10
    ORDER BY p."createdAt" DESC`;
}

// Batched presenter: a FIXED number of queries (students' aggregates in
// 3 groupBys + 1 window-function query for recent activity) no matter how
// many learners are passed in. It used to run 4-5 queries per student, and
// it is called for every learner on login and on GET /students.
//
// Only measured values are reported: time totals come from the
// PracticeSession ledger (totalSpentSeconds); the old "count * 2 minutes"
// and "2 minutes per activity" estimates are gone.
async function presentStudents(students, includeLogs = false) {
  if (!students.length) return [];
  const ids = students.map((student) => student.id);
  const today = startOfToday();

  const [progressByDay, timeByStudent, recent] = await Promise.all([
    prisma.progress.groupBy({
      by: ["studentId", "correct"],
      where: { studentId: { in: ids }, createdAt: { gte: today } },
      _count: { _all: true },
      _sum: { attempts: true },
    }),
    prisma.practiceSession.groupBy({
      by: ["studentId"],
      where: { studentId: { in: ids } },
      _sum: { durationSeconds: true },
    }),
    includeLogs ? recentProgressFor(ids) : [],
  ]);

  const totals = new Map();
  for (const row of progressByDay) {
    const entry = totals.get(row.studentId) || { attempted: 0, attempts: 0, correct: 0 };
    entry.attempted += row._count._all;
    entry.attempts += row._sum.attempts || 0;
    if (row.correct) entry.correct = row._count._all;
    totals.set(row.studentId, entry);
  }
  const secondsByStudent = new Map(timeByStudent.map((row) => [row.studentId, row._sum.durationSeconds || 0]));
  const recentByStudent = new Map();
  for (const entry of recent) {
    const list = recentByStudent.get(entry.studentId) || [];
    list.push(entry);
    recentByStudent.set(entry.studentId, list);
  }

  return students.map((student) => {
    const stats = totals.get(student.id) || { attempted: 0, attempts: 0, correct: 0 };
    const totalSpentSeconds = secondsByStudent.get(student.id) || 0;
    const hearts = computeHearts(student);
    return {
      id: student.id,
      studentCode: student.studentCode,
      name: student.name,
      age: student.age,
      className: student.className,
      currentTier: student.currentTier,
      hearts: hearts.hearts,
      // Alias kept for older payloads (the round/daily responses spell it the
      // same way) -- always the same regenerated value as `hearts`.
      heartsRemaining: hearts.hearts,
      streak: student.streak,
      dailyStreak: student.dailyStreak,
      streakDays: student.dailyStreak, // alias of dailyStreak (consecutive practice days)
      points: student.points,
      avatarColor: student.avatarColor || undefined,
      avatarUrl: student.avatarUrl || undefined,
      isIndependent: student.age >= 15,
      supervisorAccountId: student.accountId,
      lastActiveAt: student.lastActiveAt.toISOString(),
      isLoggedInToday: student.lastActiveAt >= today,
      // Real practice time only: minutes derived from the measured ledger.
      totalTimeSpentMinutes: Math.floor(totalSpentSeconds / 60),
      totalSpentSeconds,
      wordsSpelledToday: stats.correct,
      totalWordsAttemptedToday: stats.attempts || stats.attempted,
      activityLogs: (recentByStudent.get(student.id) || []).map((entry) => ({
        id: entry.id,
        timestamp: entry.createdAt,
        action: "round_completed",
        details: `Practiced ${entry.wordText} (${entry.correct ? "correct" : "needs practice"})`,
        wordCount: 1,
        correctCount: entry.correct ? 1 : 0,
        tier: entry.wordTier,
      })),
    };
  });
}

// Single-student convenience wrapper (create/update/placement responses).
async function presentStudent(student, includeLogs = false) {
  return (await presentStudents([student], includeLogs))[0];
}

module.exports = { presentStudent, presentStudents };
