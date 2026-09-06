const prisma = require("../db/prismaClient");
const { getNextWordQueue } = require("../services/adaptiveDifficultyService");

// GET /wordlists/:tier -- the mobile app downloads this once per tier
// and caches it locally, so gameplay works offline afterwards.
// With ?studentId= (owned by the caller) the word order is re-weighted by
// the adaptive difficulty service so words the learner has missed before
// surface earlier in practice rounds.
async function getWordsByTier(req, res) {
  const tier = parseInt(req.params.tier, 10);
  if (!Number.isInteger(tier) || tier < 1 || tier > 6) {
    return res.status(400).json({ error: "tier must be between 1 and 6" });
  }

  const select = {
    id: true,
    text: true,
    tier: true,
    category: true,
    definition: true,
    exampleSentence: true,
  };
  let words = await prisma.word.findMany({ where: { tier }, select });

  const studentId = req.query.studentId;
  if (studentId) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    const teacherOwnsClass = student?.classroomId && req.user.role === "TEACHER"
      ? await prisma.classroom.count({ where: { id: student.classroomId, teacherId: req.user.id } }) > 0
      : false;
    if (!student || !(req.user.role === "ADMIN" || req.user.studentId === student.id || student.accountId === req.user.id || teacherOwnsClass)) {
      return res.status(403).json({ error: "Not authorized for this student profile" });
    }

    const prioritized = await getNextWordQueue(student.id, tier, words.length);
    const prioritizedIds = new Set(prioritized.map((item) => item.id));
    words = [...prioritized, ...words.filter((item) => !prioritizedIds.has(item.id))];
  }

  return res.json({ tier, count: words.length, words });
}

module.exports = { getWordsByTier };
