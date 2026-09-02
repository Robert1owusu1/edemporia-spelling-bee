const prisma = require("../db/prismaClient");

// Returns a word queue for the given student, weighted toward words they've
// gotten wrong before or haven't seen yet, within their current tier.
// Simple frequency-based weighting for v1 -- swap for a proper
// spaced-repetition algorithm (e.g. SM-2) once there's real usage data.
async function getNextWordQueue(studentId, tier, limit = 10) {
  const words = await prisma.word.findMany({ where: { tier } });
  const pastProgress = await prisma.progress.findMany({ where: { studentId } });

  const missCount = {};
  for (const p of pastProgress) {
    if (!p.correct) {
      missCount[p.wordId] = (missCount[p.wordId] || 0) + 1;
    }
  }

  const weighted = words
    .map((word) => ({ word, weight: 1 + (missCount[word.id] || 0) * 2 }))
    .sort((a, b) => b.weight - a.weight);

  return weighted.slice(0, limit).map((w) => w.word);
}

module.exports = { getNextWordQueue };
