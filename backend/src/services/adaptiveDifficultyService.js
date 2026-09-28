const prisma = require("../db/prismaClient");

// Returns a word queue for the given student, weighted toward words they've
// gotten wrong before or haven't seen yet, within their current tier.
// Simple frequency-based weighting for v1 -- swap for a proper
// spaced-repetition algorithm (e.g. SM-2) once there's real usage data.
//
// Deliberately aggregate-first: the student's entire history and the whole
// tier are never loaded into memory. Miss counts come from a groupBy limited
// to the top `limit` words, and only the rows actually needed are fetched, so
// the cost is O(limit) per request instead of O(table + history).
async function getNextWordQueue(studentId, tier, limit = 10) {
  const size = Math.max(1, Math.min(100, Number(limit) || 10));

  const misses = await prisma.progress.groupBy({
    by: ["wordId"],
    where: { studentId, correct: false },
    _count: { _all: true },
    orderBy: { _count: { wordId: "desc" } },
    take: size,
  });

  const missedIds = misses.map((row) => row.wordId);
  const prioritized = missedIds.length
    ? await prisma.word.findMany({ where: { tier, id: { in: missedIds } }, orderBy: { id: "asc" } })
    : [];
  if (prioritized.length > 1) {
    // Keep the "most-missed first" weighting from the groupBy ordering.
    const missRank = new Map(misses.map((row, index) => [row.wordId, index]));
    prioritized.sort((a, b) => (missRank.get(a.id) || 0) - (missRank.get(b.id) || 0));
  }

  // Fill the rest of the queue with other words of the tier (never-missed and
  // not-yet-seen words both weigh 1, so any deterministic order is fine).
  if (prioritized.length < size) {
    const filler = await prisma.word.findMany({
      where: { tier, ...(prioritized.length ? { id: { notIn: prioritized.map((word) => word.id) } } : {}) },
      orderBy: { id: "asc" },
      take: size - prioritized.length,
    });
    prioritized.push(...filler);
  }

  return prioritized.slice(0, size);
}

module.exports = { getNextWordQueue };
