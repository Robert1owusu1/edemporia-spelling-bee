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
// Criteria strings are simple rules, e.g. "streak:7", "points:500",
// "rounds:50" (rule id kept for compatibility; "rounds" counts completed
// spelling-word rows, including daily-challenge words -- the seed describes
// them as "Complete N spelling words").
//   streak:N -> dailyStreak >= N (consecutive PRACTICE DAYS, which is what
//               the seeded descriptions promise: "3-day practice streak").
//   points:N -> points >= N
//   rounds:N -> words completed >= N
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
    if (!Number.isInteger(target)) {
      // Never skip a malformed rule silently: a typo would mean the badge is
      // unreachable and learners grind forever for it with zero feedback.
      // A loud warning (with the offending row) is the only way to notice.
      console.warn(`[badges] Skipping badge "${badge.name}" (${badge.id}): malformed criteria "${badge.criteria}"`);
      continue;
    }

    let satisfied = false;
    if (rule === "streak" && student.dailyStreak >= target) satisfied = true;
    else if (rule === "points" && student.points >= target) satisfied = true;
    else if (rule === "rounds" && rounds >= target) satisfied = true;
    else if (!["streak", "points", "rounds"].includes(rule)) {
      console.warn(
        `[badges] Skipping badge "${badge.name}" (${badge.id}): unknown rule "${rule}" in criteria "${badge.criteria}"`,
      );
      continue;
    }
    if (!satisfied) continue;

    await prisma.studentBadge.createMany({ data: [{ studentId, badgeId: badge.id }], skipDuplicates: true });
    newlyEarned.push({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      earnedAt: new Date().toISOString(),
    });
  }
  return newlyEarned;
}

module.exports = { getStudentBadges, evaluateBadgesForStudent };
