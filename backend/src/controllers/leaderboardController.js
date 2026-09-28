const prisma = require("../db/prismaClient");

// The leaderboard scope for a request: administrators see every learner on
// the platform, a parent sees their own learners, a teacher their own
// classes, and a learner (student session) their classmates/siblings. A
// school-wide board must never leak names/points from outside the caller's
// scope, and an unscoped caller must never match every learner platform-wide.
async function callerStudentScope(req) {
  if (req.user.role === "ADMIN") return null;
  if (req.user.studentId) {
    const student = await prisma.student.findUnique({ where: { id: req.user.studentId } });
    if (!student) return { id: req.user.studentId };
    if (student.classroomId) return { classroomId: student.classroomId };
    return { accountId: req.user.id };
  }
  if (req.user.role === "TEACHER") return { classroom: { teacherId: req.user.id } };
  return { accountId: req.user.id };
}

// GET /leaderboard?className=Primary%203
// Student *is* the learner table now, so there's no role filter needed
// the way there was when learners were User rows with role=LEARNER.
async function getLeaderboard(req, res) {
  const { className } = req.query;

  const where = { ...((await callerStudentScope(req)) || {}) };
  if (className) where.className = className;

  const students = await prisma.student.findMany({
    where,
    orderBy: { points: "desc" },
    take: 50,
    select: { id: true, name: true, currentTier: true, points: true, streak: true, dailyStreak: true, className: true },
  });

  // The frontend's LeaderboardEntry expects `studentId` (unique key) and `tier`,
  // so map the row's id/currentTier to those field names. `streak` is the round
  // combo; `dailyStreak`/`streakDays` are the consecutive practice days.
  return res.json(
    students.map(({ id, currentTier, dailyStreak, ...rest }) => ({
      ...rest,
      dailyStreak,
      streakDays: dailyStreak,
      studentId: id,
      tier: currentTier,
    })),
  );
}

module.exports = { getLeaderboard };
