const prisma = require("../db/prismaClient");

// The organisation scope for a leaderboard request: students whose account or
// classroom belongs to the caller's organisation. Admins see the whole
// platform. A school must never see another school's learners' names and
// points on the same board, and an org-less caller must never match every
// org-less student platform-wide -- a parent sees their own learners, a
// teacher their own classes, and an org-less learner their classmates/siblings.
// The leaderboard scope for a request: administrators see the whole school,
// a parent sees their own learners, a teacher their own classes, and a
// learner (student session) their classmates/siblings.
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

  const where = { ...(await callerStudentScope(req) || {}) };
  if (className) where.className = className;

  const students = await prisma.student.findMany({
    where,
    orderBy: { points: "desc" },
    take: 50,
    select: { id: true, name: true, currentTier: true, points: true, streak: true, className: true },
  });

  // The frontend's LeaderboardEntry expects `studentId` (unique key) and `tier`,
  // so map the row's id/currentTier to those field names.
  return res.json(students.map(({ id, currentTier, ...rest }) => ({
    ...rest,
    studentId: id,
    tier: currentTier,
  })));
}

module.exports = { getLeaderboard };
