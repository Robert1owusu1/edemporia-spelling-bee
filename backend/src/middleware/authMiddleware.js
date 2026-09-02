const jwt = require("jsonwebtoken");
const prisma = require("../db/prismaClient");

// Short-TTL in-memory cache of validated accounts keyed by account id. The
// tokenVersion (bumped on password change / "logout everywhere") is re-checked
// against the DB on every request; the cache only avoids re-fetching the
// unchanged row. Bounded: entries are evicted after 30s and the map is capped.
const accountCache = new Map();
const ACCOUNT_CACHE_TTL_MS = 30 * 1000;
const ACCOUNT_CACHE_MAX = 2000;

function cacheKey(accountId, tokenVersion) {
  return `${accountId}:${tokenVersion}`;
}

async function getAccountRecord(accountId) {
  const now = Date.now();
  const cached = accountCache.get(accountId);
  if (cached && now - cached.fetchedAt < ACCOUNT_CACHE_TTL_MS) {
    cached.fetchedAt = now;
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

  if (account) {
    accountCache.set(accountId, { account, fetchedAt: now });
    if (accountCache.size > ACCOUNT_CACHE_MAX) {
      const oldestKey = accountCache.keys().next().value;
      accountCache.delete(oldestKey);
    }
  }
  return account;
}

// After password changes / logout-everywhere the cache must not resurrect a
// stale (lower) tokenVersion, so drop the entry and bump the version in the DB.
async function invalidateAccountTokens(accountId, prismaClient) {
  accountCache.delete(accountId);
  const db = prismaClient || prisma;
  return db.account.update({
    where: { id: accountId },
    data: { tokenVersion: { increment: 1 } },
  });
}

function clearAccountCache(accountId) {
  accountCache.delete(accountId);
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
      account = await getAccountRecord(payload.id);
    } catch {
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
      return res.status(401).json({ error: "Your account has not been approved yet. Contact your school administrator to verify it." });
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
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;
module.exports.getAccountRecord = getAccountRecord;
module.exports.invalidateAccountTokens = invalidateAccountTokens;
module.exports.clearAccountCache = clearAccountCache;
