const prisma = require("../db/prismaClient");
const { evaluateBadgesForStudent } = require("./badgeController");

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function wordOfTheDay(words) {
  const seed = [...startOfToday().toISOString().slice(0, 10)].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return words[seed % words.length];
}

// The daily word always comes from the shared school word bank -- the same
// single-school words for every learner.
async function dailyWordPool() {
  return prisma.word.findMany();
}

// Matches the client's comparison so the screen and the ledger agree.
const normalizeSpelling = (value) => String(value || "").trim().toLowerCase();

// The advertised daily-challenge reward. Spelled correctly, the learner
// pockets these bonus points and extends their streak fire by a day on top
// of the round they play afterwards.
const DAILY_CHALLENGE_BONUS_POINTS = 50;

// GET /daily-challenge?studentId=...
// Deterministic "word of the day" -- same word for everyone, picked by
// date so it doesn't need a cron job or extra table to manage.
// When a studentId is provided (and owned by the caller), also reports
// whether that learner has already completed today's challenge.
async function getDailyChallenge(req, res) {
  const studentId = req.query.studentId;
  const student = studentId ? await prisma.student.findUnique({ where: { id: studentId } }) : null;
  const words = await dailyWordPool();
  if (words.length === 0) {
    return res.status(404).json({ error: "No words available yet" });
  }

  const word = wordOfTheDay(words);
  const today = startOfToday();
  const payload = { date: today.toISOString().slice(0, 10), word };

  if (studentId) {
    const teacherOwnsClass = student?.classroomId && req.user.role === "TEACHER"
      ? await prisma.classroom.count({ where: { id: student.classroomId, teacherId: req.user.id } }) > 0
      : false;
    if (!student || !(req.user.role === "ADMIN" || req.user.studentId === student.id || student.accountId === req.user.id || teacherOwnsClass)) {
      return res.status(403).json({ error: "Not authorized for this student profile" });
    }
    const completion = await prisma.dailyChallengeCompletion.findUnique({ where: { studentId_date: { studentId: student.id, date: today } } });
    payload.completedToday = Boolean(completion);
    payload.correctToday = completion ? completion.correct : undefined;
  } else {
    payload.completedToday = false;
  }

  return res.json(payload);
}

// POST /daily-challenge/complete -- Body: { studentId, wordId, spelling }
// requireOwnStudent has verified the student belongs to this account.
// Records the day (once per learner per day), writes the Progress row and,
// when correct, grants the advertised +50 bonus points and +1 streak day in
// a single transaction so a mid-request failure can't half-apply a reward.
// Correctness is graded here from the student's spelling -- the client only
// reports what the learner typed, it can't declare itself correct.
async function completeDailyChallenge(req, res) {
  const student = await prisma.student.findUnique({ where: { id: req.student.id } });
  const words = await dailyWordPool();
  if (!words.length) return res.status(404).json({ error: "No words available yet" });
  const today = startOfToday();
  const word = wordOfTheDay(words);
  if (req.body.wordId !== word.id || typeof req.body.spelling !== "string" || !req.body.spelling.trim()) {
    return res.status(400).json({ error: "Invalid daily challenge completion" });
  }
  const isCorrect = normalizeSpelling(req.body.spelling) === normalizeSpelling(word.text);
  let completion;
  try {
    completion = await prisma.$transaction(async (tx) => {
      const created = await tx.dailyChallengeCompletion.create({ data: { studentId: student.id, date: today, wordId: word.id, correct: isCorrect } });
      await tx.progress.create({ data: { studentId: student.id, wordId: word.id, correct: isCorrect, attempts: 1 } });
      if (isCorrect) {
        await tx.student.update({ where: { id: student.id }, data: { points: { increment: DAILY_CHALLENGE_BONUS_POINTS }, streak: { increment: 1 }, lastActiveAt: new Date() } });
      }
      return created;
    });
  } catch (error) {
    // Only a genuine duplicate (already completed today) is a 409 -- a DB
    // outage or other failure must surface as its real error, not masquerade
    // as "already completed".
    if (error && error.code === "P2002") {
      return res.status(409).json({ error: "Today's challenge has already been completed" });
    }
    throw error;
  }
  const earnedBadges = await evaluateBadgesForStudent(student.id);
  const updated = await prisma.student.findUnique({ where: { id: student.id }, select: { points: true, streak: true, hearts: true, currentTier: true } });
  return res.status(201).json({
    ...completion,
    correct: completion.correct,
    pointsAwarded: completion.correct ? DAILY_CHALLENGE_BONUS_POINTS : 0,
    streakDays: updated.streak,
    heartsRemaining: updated.hearts,
    totalPoints: updated.points,
    currentTier: updated.currentTier,
    earnedBadge: earnedBadges[0] || undefined,
  });
}

module.exports = { getDailyChallenge, completeDailyChallenge };
