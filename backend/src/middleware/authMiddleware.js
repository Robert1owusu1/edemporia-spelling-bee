const jwt = require("jsonwebtoken");
const prisma = require("../db/prismaClient");

// Short-TTL in-memory cache of validated accounts. Entries are keyed by
// account id AND the tokenVersion carried by the presented JWT, so a cache
// entry can only ever authenticate sessions from that version: once
// tokenVersion is bumped (password change / "logout everywhere"), no entry
// written before the bump can be reused. The TTL is a real expiry --
// `fetchedAt` is only set when the row is fetched, never refreshed on read --
// so even a hot entry is re-validated against the DB at least every 30s.
// Bounded: entries are evicted after the TTL and the map is capped.
const accountCache = new Map();
const ACCOUNT_CACHE_TTL_MS = 30 * 1000;
const ACCOUNT_CACHE_MAX = 2000;

function cacheKey(accountId, tokenVersion) {
  return `${accountId}:${tokenVersion}`;
}

function deleteCachedVersions(accountId) {
  const prefix = `${accountId}:`;
  for (const key of accountCache.keys()) {
    if (key.startsWith(prefix)) accountCache.delete(key);
  }
}

async function getAccountRecord(accountId, tokenVersion) {
  const now = Date.now();
  const key = cacheKey(accountId, tokenVersion);
  const cached = accountCache.get(key);
  if (cached && now - cached.fetchedAt < ACCOUNT_CACHE_TTL_MS && cached.account.tokenVersion === tokenVersion) {
    return cached.account;
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      role: true,
      approvedAt: true,
      tokenVersion: true,
    },
  });

  // Only cache rows that actually match the presented token's version; a
  // mismatch is a revoked session and must be re-checked on every request.
  if (account && account.tokenVersion === tokenVersion) {
    accountCache.set(key, { account, fetchedAt: now });
    if (accountCache.size > ACCOUNT_CACHE_MAX) {
      const oldestKey = accountCache.keys().next().value;
      accountCache.delete(oldestKey);
    }
  }
  return account;
}

// After password changes / logout-everywhere the cache must not resurrect a
// stale (lower) tokenVersion, so drop every cached version of the account and
// bump the version in the DB.
async function invalidateAccountTokens(accountId, prismaClient) {
  clearAccountCache(accountId);
  const db = prismaClient || prisma;
  return db.account.update({
    where: { id: accountId },
    data: { tokenVersion: { increment: 1 } },
  });
}

function clearAccountCache(accountId) {
  deleteCachedVersions(accountId);
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed token" });
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (!payload || typeof payload.id !== "string" || !payload.id) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    let account;
    try {
      account = await getAccountRecord(payload.id, payload.tokenVersion);
    } catch (error) {
      // Log (never swallow): a silent DB failure here used to look exactly
      // like a healthy server that mysteriously returns 503.
      console.error(`[auth] Could not load account ${payload.id} from the database:`, error);
      account = undefined;
    }

    // Every request validates against the DB row so revoked tokens (bumped
    // tokenVersion), suspended orgs and other state changes take effect
    // immediately, not on the next login.
    if (account === undefined) {
      // The DB itself is unreachable (DNS/connection failure, outage, etc.).
      // This is a transient infrastructure problem, NOT a revoked session, so
      // respond 503 instead of 401. The frontend only forces a logout on 401;
      // returning 401 here would kick every logged-in user out on a hiccup.
      return res
        .status(503)
        .json({ error: "The server could not reach its data store. Please try again in a moment." });
    }
    if (!account || account.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ error: "Session has been revoked, please log in again" });
    }

    // Un-approving an account (approve:false) revokes every session it holds.
    if (!account.approvedAt) {
      return res
        .status(401)
        .json({ error: "Your account has not been approved yet. Contact your school administrator to approve it." });
    }

    // Student-code sessions carry a studentId in the token (and a STUDENT
    // role). They must NEVER be treated as the parent/teacher account that
    // owns the learner: keep the STUDENT role and the studentId so role
    // middleware and requireOwnStudent scope them to that one child and a
    // /auth/refresh cannot escalate a student token into a full account token.
    req.user = {
      id: account.id,
      role: payload.studentId ? "STUDENT" : account.role,
      approvedAt: account.approvedAt,
    };
    if (payload.studentId) {
      req.user.studentId = payload.studentId;
    }
    next();
  } catch {
    // Any failure here means the token itself is unusable; the message is
    // deliberately identical for expired, malformed and forged tokens.
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;
module.exports.getAccountRecord = getAccountRecord;
module.exports.invalidateAccountTokens = invalidateAccountTokens;
module.exports.clearAccountCache = clearAccountCache;
