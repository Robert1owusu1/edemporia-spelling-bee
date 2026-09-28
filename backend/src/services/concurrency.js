// Runs `worker(item, index)` over every item with at most `limit` concurrent
// in-flight workers, preserving input order in the returned array. Used by the
// CSV word imports so a big batch no longer performs strictly sequential
// (up-to-8s) dictionary lookups that could occupy a request for minutes.
async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));
  const runners = Array.from({ length: workerCount }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  });
  await Promise.all(runners);
  return results;
}

module.exports = { runWithConcurrency };
