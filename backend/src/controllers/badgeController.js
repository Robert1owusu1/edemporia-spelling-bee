const prisma = require("../db/prismaClient");

// GET /students/:studentId/badges -- badges a student has already earned.
// requireOwnStudent has verified ownership.
async function getStudentBadges(req, res) {
  const studentBadges = await prisma.studentBadge.findMany({
    where: { studentId: req.student.id },
    include: { badge: true },
    orderBy: { earnedAt: "desc" },
  });
  return res.json(studentBadges.map((sb) => ({ ...sb.badge, earnedAt: sb.earnedAt.toISOString() })));
}

// Called after a round/daily-challenge update -- not a route, just a helper.
// Criteria strings are simple rules, e.g. "streak:7", "points:500", "rounds:50".
// Returns the badges that were newly awarded so callers can surface them.
async function evaluateBadgesForStudent(studentId) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return [];
  const allBadges = await prisma.badge.findMany();
  const earned = await prisma.studentBadge.findMany({ where: { studentId } });
  const earnedIds = new Set(earned.map((e) => e.badgeId));
  const rounds = await prisma.progress.count({ where: { studentId } });
  const newlyEarned = [];

  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue;

    const [rule, value] = badge.criteria.split(":");
    const target = parseInt(value, 10);
    if (!Number.isInteger(target)) continue;

    let satisfied = false;
    if (rule === "streak" && student.streak >= target) satisfied = true;
    if (rule === "points" && student.points >= target) satisfied = true;
    if (rule === "rounds" && rounds >= target) satisfied = true;
    if (!satisfied) continue;

    await prisma.studentBadge.createMany({ data: [{ studentId, badgeId: badge.id }], skipDuplicates: true });
    newlyEarned.push({ id: badge.id, name: badge.name, description: badge.description, earnedAt: new Date().toISOString() });
  }
  return newlyEarned;
}

module.exports = { getStudentBadges, evaluateBadgesForStudent };
