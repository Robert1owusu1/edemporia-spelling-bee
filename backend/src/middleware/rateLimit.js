const buckets = new Map();

// Periodically drop expired buckets so the map doesn't grow without bound.
// Runs on a timer; unref keeps the process from staying alive because of it.
const CLEANUP_INTERVAL = 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of buckets) {
    if (record.resetAt <= now) buckets.delete(key);
  }
}, CLEANUP_INTERVAL).unref();

// Optional shared store for multi-instance deployments. The default in-memory
// store is per-process, so each instance keeps its own budgets. When REDIS_URL
// is set (and the `redis` package is installed) limits are enforced against a
// single Redis-backed set, so a cluster enforces the same budget globally.
// Redis is required dynamically: if the package is absent the limiter stays
// in-memory (a deployment that wants shared limits installs `redis` and sets
// REDIS_URL -- nothing else changes).
const REDIS_URL = process.env.REDIS_URL;
let redisAvailable = false;
let redis;
if (REDIS_URL) {
  try {
    // eslint-disable-next-line global-require
    const redisModule = require("redis");
    if (redisModule && typeof redisModule.createClient === "function") {
      redis = redisModule.createClient({ url: REDIS_URL });
      redis.on("error", (err) => console.error("[rate-limit] Redis error:", err.message));
      redis.connect().catch(() => { redisAvailable = false; });
      redisAvailable = true;
    }
  } catch {
    console.warn("[rate-limit] REDIS_URL is set but the 'redis' package is not installed. Falling back to in-memory (per-process) rate limiting.");
  }
}

// Every limiter instance namespaces its own budget (window + max) so separate
// limiters on the same key (e.g. rounds vs hints for one account) no longer
// share one bucket. Returns true when the request exceeds the budget.
async function checkBudget(key, windowMs, max) {
  const now = Date.now();
  if (redisAvailable) {
    try {
      const redisKey = `rl:${windowMs}:${max}:${key}`;
      const member = `${now}:${Math.random().toString(16).slice(2)}`;
      const results = await redis
        .multi()
        .zremrangebyscore(redisKey, 0, now - windowMs)
        .zadd(redisKey, now, member)
        .zcard(redisKey)
        .expire(redisKey, Math.ceil(windowMs / 1000) + 60)
        .exec();
      const count = Number(results && results[2]) || 0;
      return count > max;
    } catch {
      // A Redis hiccup must never lock everyone out -- fail open.
      return false;
    }
  }

  const memoryKey = `${windowMs}:${max}:${key}`;
  const record = buckets.get(memoryKey);
  if (!record || record.resetAt <= now) {
    buckets.set(memoryKey, { count: 1, resetAt: now + windowMs });
    return false;
  }
  record.count += 1;
  return record.count > max;
}

function rateLimit({ windowMs = 15 * 60 * 1000, max = 100, key = (req) => req.ip } = {}) {
  return async (req, res, next) => {
    const bucketKey = key(req);
    const exceeded = await checkBudget(bucketKey, windowMs, max);
    if (exceeded) return res.status(429).json({ error: "Too many requests. Please try again shortly." });
    next();
  };
}

module.exports = { rateLimit };