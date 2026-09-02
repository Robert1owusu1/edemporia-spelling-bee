const prisma = require("../db/prismaClient");

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

async function presentStudent(student, includeLogs = false) {
  const today = startOfToday();
  const progress = await prisma.progress.aggregate({
    where: { studentId: student.id, createdAt: { gte: today } },
    _count: { _all: true },
    _sum: { attempts: true },
  });
  const correctToday = await prisma.progress.count({ where: { studentId: student.id, correct: true, createdAt: { gte: today } } });
  // Entire-project practice time from the session ledger (spelling rounds,
  // tier plays and practice sessions) so any screen with the student object
  // can show total hours spent.
  const timeAgg = await prisma.practiceSession.aggregate({ where: { studentId: student.id }, _sum: { durationSeconds: true } });
  const recentProgress = includeLogs ? await prisma.progress.findMany({
    where: { studentId: student.id }, orderBy: { createdAt: "desc" }, take: 10, include: { word: true },
  }) : [];

  return {
    id: student.id, studentCode: student.studentCode, name: student.name, age: student.age,
    className: student.className, currentTier: student.currentTier, hearts: student.hearts,
    streak: student.streak, points: student.points, avatarColor: student.avatarColor || undefined, avatarUrl: student.avatarUrl || undefined,
    isIndependent: student.age >= 15, supervisorAccountId: student.accountId,
    lastActiveAt: student.lastActiveAt.toISOString(),
    isLoggedInToday: student.lastActiveAt >= today,
    totalTimeSpentMinutes: progress._count._all * 2,
    totalSpentSeconds: timeAgg._sum.durationSeconds || 0,
    wordsSpelledToday: correctToday,
    totalWordsAttemptedToday: progress._sum.attempts || progress._count._all,
    activityLogs: recentProgress.map((entry) => ({
      id: entry.id, timestamp: entry.createdAt.toISOString(), action: "round_completed",
      details: `Practiced ${entry.word.text} (${entry.correct ? "correct" : "needs practice"})`,
      wordCount: 1, correctCount: entry.correct ? 1 : 0, durationMinutes: 2, tier: entry.word.tier,
    })),
  };
}

module.exports = { presentStudent };
