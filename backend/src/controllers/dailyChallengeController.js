const prisma = require("../db/prismaClient");
const { evaluateBadgesForStudent } = require("./badgeController");
const {
  computeHearts,
  nextDailyStreak,
  utcDayKey,
  MAX_STUDENT_POINTS,
  MAX_STUDENT_STREAK,
} = require("../services/studentStateService");

// The daily word always comes from the shared school word bank -- the same
// single-school words for every learner.
// Deterministic "word of the day": the pure-UTC day key is the seed and the
// pool order is `id ASC`, so every server (and every restart) picks the same
// word for a given day. The choice is cached briefly so the endpoint does not
// scan the word bank on every request.
const DAILY_POOL_TTL_MS = 60 * 1000;
let wordOfTheDayCache = { day: null, at: 0, word: null };

async function wordOfTheDay() {
  const day = utcDayKey();
  const now = Date.now();
  if (wordOfTheDayCache.word && wordOfTheDayCache.day === day && now - wordOfTheDayCache.at < DAILY_POOL_TTL_MS) {
    return wordOfTheDayCache.word;
  }
  const count = await prisma.word.count();
  if (!count) {
    wordOfTheDayCache = { day, at: now, word: null };
    return null;
  }
  const seed = [...day].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const [word] = await prisma.word.findMany({ orderBy: { id: "asc" }, skip: seed % count, take: 1 });
  wordOfTheDayCache = { day, at: now, word: word || null };
  return wordOfTheDayCache.word;
}

// Matches the client's comparison so the screen and the ledger agree.
const normalizeSpelling = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

// The advertised daily-challenge reward. Spelled correctly, the learner
// pockets these bonus points on top of the round they play afterwards.
const DAILY_CHALLENGE_BONUS_POINTS = 50;

// GET /daily-challenge[?studentId=...]
// The route runs requireOwnStudent whenever a learner is named -- either via
// ?studentId= or for a student session that omits the query parameter -- and
// attaches them as req.student. Without a learner this is just "word of the
// day" for everyone.
async function getDailyChallenge(req, res) {
  const student = req.student || null;
  const word = await wordOfTheDay();
  if (!word) {
    return res.status(404).json({ error: "No words available yet" });
  }

  const day = utcDayKey();
  const payload = { date: day, word };

  if (student) {
    const completion = await prisma.dailyChallengeCompletion.findUnique({
      where: { studentId_date: { studentId: student.id, date: day } },
    });
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
// when correct, grants the advertised +50 bonus points in a single
// transaction so a mid-request failure can't half-apply a reward.
// Correctness is graded here from the student's spelling -- the client only
// reports what the learner typed, it can't declare itself correct.
// The daily challenge advances `dailyStreak` (consecutive practice days) --
// it never touches the round combo (`streak`) and it is never blocked by
// hearts.
async function completeDailyChallenge(req, res) {
  const student = await prisma.student.findUnique({ where: { id: req.student.id } });
  const word = await wordOfTheDay();
  if (!word) return res.status(404).json({ error: "No words available yet" });
  const day = utcDayKey();
  if (req.body.wordId !== word.id || typeof req.body.spelling !== "string" || !req.body.spelling.trim()) {
    return res.status(400).json({ error: "Invalid daily challenge completion" });
  }
  const isCorrect = normalizeSpelling(req.body.spelling) === normalizeSpelling(word.text);
  const now = Date.now();
  let completion;
  let pointsAwarded = 0;
  try {
    completion = await prisma.$transaction(async (tx) => {
      // Lock the learner so concurrent rounds/dailies can't double-spend the
      // point cap or the daily-streak bookkeeping.
      const lockedStudent = await tx.$queryRaw`
        SELECT points, streak, hearts, "dailyStreak", "lastPracticeDay",
               (EXTRACT(EPOCH FROM "heartsUpdatedAt") * 1000.0)::double precision AS "heartsUpdatedAtMs"
        FROM "Student" WHERE id = ${student.id} FOR UPDATE`;
      const fresh = lockedStudent[0];
      if (!fresh) {
        const error = new Error("Student not found");
        error.statusCode = 404;
        throw error;
      }

      const daily = nextDailyStreak(fresh, day);
      const regen = computeHearts({ hearts: fresh.hearts, heartsUpdatedAt: fresh.heartsUpdatedAtMs }, now);
      const studentData = {
        hearts: regen.hearts,
        heartsUpdatedAt: regen.heartsUpdatedAt,
        dailyStreak: daily.dailyStreak,
        lastPracticeDay: daily.lastPracticeDay,
        lastActiveAt: new Date(now),
      };
      if (isCorrect) {
        const before = Number(fresh.points);
        const after = Math.min(before + DAILY_CHALLENGE_BONUS_POINTS, MAX_STUDENT_POINTS);
        pointsAwarded = Math.max(0, after - before);
        studentData.points = after;
        // The combo is not part of the daily challenge; the cap is applied
        // defensively so the same ceilings hold on every write path.
        studentData.streak = Math.min(Number(fresh.streak), MAX_STUDENT_STREAK);
      }

      const created = await tx.dailyChallengeCompletion.create({
        data: { studentId: student.id, date: day, wordId: word.id, correct: isCorrect },
      });
      await tx.progress.create({ data: { studentId: student.id, wordId: word.id, correct: isCorrect, attempts: 1 } });
      await tx.student.update({ where: { id: student.id }, data: studentData });
      return created;
    });
  } catch (error) {
    // Only a genuine duplicate (already completed today) is a 409 -- a DB
    // outage or other failure must surface as its real error, not masquerade
    // as "already completed".
    if (error && error.code === "P2002") {
      return res.status(409).json({ error: "Today's challenge has already been completed" });
    }
    if (error && error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    throw error;
  }
  const earnedBadges = await evaluateBadgesForStudent(student.id);
  const updated = await prisma.student.findUnique({
    where: { id: student.id },
    select: { points: true, streak: true, hearts: true, currentTier: true, dailyStreak: true },
  });
  return res.status(201).json({
    ...completion,
    correct: completion.correct,
    pointsAwarded, // real delta after the MAX_STUDENT_POINTS cap
    streak: updated.streak, // round combo -- unchanged by the daily challenge
    streakDays: updated.dailyStreak, // alias of dailyStreak
    dailyStreak: updated.dailyStreak,
    hearts: updated.hearts,
    heartsRemaining: updated.hearts,
    points: updated.points,
    totalPoints: updated.points,
    currentTier: updated.currentTier,
    earnedBadge: earnedBadges[0] || undefined,
  });
}

module.exports = { getDailyChallenge, completeDailyChallenge };
