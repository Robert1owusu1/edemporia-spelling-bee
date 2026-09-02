const prisma = require("../db/prismaClient");
const { evaluateBadgesForStudent } = require("./badgeController");

const MAX_ROUND_RESULTS = 100;
const MAX_ATTEMPTS_PER_WORD = 10;
// Economy caps: the client necessarily holds the word bank (it must read each
// word aloud), so a scripted client can auto-submit the correct spelling. The
// per-round points ceiling and the hard student-wide cap bound the damage a
// tampered client can do to points/streak without hurting normal play.
const MAX_POINTS_PER_ROUND = 2000;
const MAX_STUDENT_POINTS = 500000;
const MAX_STUDENT_STREAK = 50;
const MAX_DURATION_SECONDS = 8 * 60 * 60;

// Matches the client's own comparison (SpellingInteraction) so the score the
// student sees is exactly what the server awards.
const normalizeSpelling = (value) => String(value || "").trim().toLowerCase();

// POST /rounds -- Body: { studentId, wordId, correct, attempts, results? }
// requireOwnStudent middleware has already verified studentId belongs to
// this account and attached it as req.student.
// This is the authoritative version of scoring -- the app also scores
// locally for instant feedback, but this is what actually updates
// points/streak/hearts so progress can't just be edited on-device.
// The client's `correct` flag is deliberately ignored: the server re-grades
// every word from the student's actual spelling against the authoritative
// word bank, so a tampered client can't claim correct answers it never spelled.
async function submitRound(req, res) {
  const { wordId, correct, attempts, results, tier, durationSeconds, source } = req.body;
  const student = req.student;

  const rawResults = Array.isArray(results) && results.length ? results : [{ wordId, correct, attempts }];
  if (rawResults.length > MAX_ROUND_RESULTS) return res.status(400).json({ error: `A round can contain at most ${MAX_ROUND_RESULTS} results` });
  if (!rawResults.every((item) => item.wordId)) return res.status(400).json({ error: "wordId is required for each result" });
  if (new Set(rawResults.map((item) => item.wordId)).size !== rawResults.length) return res.status(400).json({ error: "Each word can only be submitted once per round" });
  const words = await prisma.word.findMany({ where: { id: { in: rawResults.map((item) => item.wordId) } } });
  if (words.length !== new Set(rawResults.map((item) => item.wordId)).size) return res.status(404).json({ error: "One or more words were not found" });

  // Server-side grading: correctness comes from spelling the word, never from
  // a client-supplied boolean. Unverifiable results (no spelling) are scored
  // as incorrect so tampered payloads can't mint points.
  const roundResults = rawResults.map((result) => {
    const word = words.find((item) => item.id === result.wordId);
    const attemptsValue = Math.min(Math.max(1, Math.round(Number(result.attempts) || 1)), MAX_ATTEMPTS_PER_WORD);
    const isCorrect = Boolean(result.spelling) && normalizeSpelling(result.spelling) === normalizeSpelling(word.text);
    return { wordId: result.wordId, correct: isCorrect, attempts: attemptsValue, spelling: String(result.spelling || "") };
  });

  let updated;
  let pointsEarned = 0;
  let tierAdvanced = false;
  try {
    await prisma.$transaction(async (tx) => {
      // Row-level lock on the learner: concurrent rounds serialize here, so the
      // points/streak/hearts below build on the latest committed values instead
      // of a stale pre-transaction snapshot (an unlocked re-read could still
      // clobber a parallel submission's points).
      const lockedStudent = await tx.$queryRaw`
        SELECT points, streak, hearts, "currentTier"
        FROM "Student" WHERE id = ${student.id} FOR UPDATE`;
      const freshStudent = lockedStudent[0];
      if (!freshStudent) {
        const error = new Error("Student not found");
        error.statusCode = 404;
        throw error;
      }

      let nextPoints = Number(freshStudent.points);
      let nextStreak = Number(freshStudent.streak);
      let nextHearts = Number(freshStudent.hearts);
      for (const result of roundResults) {
        const word = words.find((item) => item.id === result.wordId);
        if (result.correct) {
          // Points scale with the word's tier and the learner's current combo,
          // so pointsEarned must be computed with the same evolving streak that
          // the transaction uses -- otherwise a mixed round reports a number
          // that never matches the points actually added.
          let earned = Math.round(word.tier * 10 * (1 + Math.min(nextStreak, 10) * 0.1));
          // Clamp the round total as it accrues so the reported pointsEarned is
          // exactly the delta written to the row.
          if (pointsEarned + earned > MAX_POINTS_PER_ROUND) earned = Math.max(0, MAX_POINTS_PER_ROUND - pointsEarned);
          nextPoints += earned;
          pointsEarned += earned;
          nextStreak += 1;
        } else {
          nextStreak = 0;
          nextHearts = Math.max(0, nextHearts - 1);
        }
      }
      // Hard ceilings: a learner can never hold more than MAX_STUDENT_POINTS,
      // and the streak counter is capped so the combo multiplier stays bounded.
      nextPoints = Math.min(nextPoints, MAX_STUDENT_POINTS);
      nextStreak = Math.min(nextStreak, MAX_STUDENT_STREAK);

      await tx.progress.createMany({ data: roundResults.map((result) => ({ studentId: student.id, wordId: result.wordId, correct: result.correct, attempts: Math.max(1, Number(result.attempts) || 1) })) });

      updated = await tx.student.update({
        where: { id: student.id },
        data: { points: nextPoints, streak: nextStreak, hearts: nextHearts, lastActiveAt: new Date() },
      });

      // Automatic tier progression runs inside the transaction on the locked
      // row, so two concurrent rounds can't both read currentTier=N and advance
      // the learner two tiers from a single stage.
      const correctCount = roundResults.filter((result) => result.correct).length;
      const playedTier = Number(tier);
      const accuracy = roundResults.length ? correctCount / roundResults.length : 0;
      // The claimed tier is only trusted when every submitted word actually
      // belongs to it -- otherwise a learner could farm easy tier-1 words while
      // claiming a higher tier and auto-advance without ever playing that tier.
      const wordsMatchClaimedTier = words.every((word) => word.tier === playedTier);
      if (
        Number.isInteger(playedTier)
        && playedTier === Number(freshStudent.currentTier)
        && wordsMatchClaimedTier
        && roundResults.length >= 5
        && accuracy >= 0.8
        && Number(freshStudent.currentTier) < 6
      ) {
        updated = await tx.student.update({ where: { id: student.id }, data: { currentTier: { increment: 1 } } });
        tierAdvanced = true;
      }
    });
  } catch (error) {
    if (error && error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    throw error;
  }

  const earnedBadges = await evaluateBadgesForStudent(student.id);
  const correctCount = roundResults.filter((item) => item.correct).length;

  // Time tracking: log how long this learner spent on this round. When the
  // measured duration is missing, fall back to an estimate of 30s per word so
  // the "hours spent" stats are never silently zero. Best-effort -- a failed
  // session insert must not roll back the learner's scoring.
  try {
    const measured = Math.max(0, Math.round(Number(durationSeconds) || 0));
    const estimate = roundResults.length * 30;
    const total = Math.min(measured || estimate, MAX_DURATION_SECONDS);
    await prisma.practiceSession.create({
      data: {
        studentId: student.id,
        source: ["PRACTICE", "TIER", "ACTIVITY"].includes(source) ? source : "PRACTICE",
        durationSeconds: total,
        startedAt: new Date(Date.now() - total * 1000),
        endedAt: new Date(),
      },
    });
  } catch {
    // ignore -- scoring already succeeded
  }

  // Entire-project total: every practice session summed so the result screen
  // can show how many hours the learner has spent across all activities.
  let totalSpentSeconds = 0;
  try {
    const timeAgg = await prisma.practiceSession.aggregate({ where: { studentId: student.id }, _sum: { durationSeconds: true } });
    totalSpentSeconds = timeAgg._sum.durationSeconds || 0;
  } catch {
    // ignore -- best-effort stat
  }

  return res.json({
    points: updated.points,
    streak: updated.streak,
    hearts: updated.hearts,
    pointsEarned,
    totalPoints: updated.points,
    streakDays: updated.streak,
    heartsRemaining: updated.hearts,
    currentTier: updated.currentTier,
    tierAdvanced,
    earnedBadge: earnedBadges[0] || undefined,
    earnedBadges,
    totalSpentSeconds,
  });
}

module.exports = { submitRound };
