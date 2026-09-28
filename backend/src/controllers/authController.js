const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../db/prismaClient");
const { audit } = require("../services/auditService");
const { invalidateAccountTokens, clearAccountCache } = require("../middleware/authMiddleware");

// Fixed bcrypt hash (cost 12, matching every other hash the app writes)
// compared against whenever the supplied email has no account, so login
// timing does not reveal which emails are registered.
const DUMMY_HASH = "$2a$12$PUYwEg/MpEDx/wH4qqrgg.7dqSfWBWLaEFQXXThM0kMFZEK4ScTNq";

// Failed student-code login lockout. There is no separate password, so a wrong
// guess can't be tied to a student id -- the lock keys on the client IP
// instead. After 5 failed guesses within a window the IP is frozen for 15
// minutes so the 7-digit code space can't be brute-forced (on top of the
// per-IP request rate limit).
const studentLoginFailures = new Map();
const STUDENT_CODE_MAX_ATTEMPTS = 5;
const STUDENT_CODE_LOCK_MS = 15 * 60 * 1000;
const STUDENT_CODE_WINDOW_MS = 10 * 60 * 1000;
// The map must stay bounded: with TRUST_PROXY set a client controls its
// reported IP, so unbounded entries would let anyone grow memory without
// bound. Counters expire with their window and the map is size-capped.
const STUDENT_FAILURES_MAX_ENTRIES = 10000;

// Per-account password-login lockout. Keyed by ACCOUNT (not by IP): password
// guessing is spread across IPs to dodge per-IP limits, so the account itself
// must freeze. After 10 failed passwords within 15 minutes the account is
// locked for 15 minutes for every source. Same bounded/cleanup pattern as the
// student-code lockout above; the per-IP request rate limit still applies on
// top of this.
const accountLoginFailures = new Map();
const ACCOUNT_LOGIN_MAX_ATTEMPTS = 10;
const ACCOUNT_LOGIN_LOCK_MS = 15 * 60 * 1000;
const ACCOUNT_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_FAILURES_MAX_ENTRIES = 10000;

setInterval(() => {
  const now = Date.now();
  for (const [ip, state] of studentLoginFailures) {
    if (state.lockUntil === 0 && now - state.windowStart > STUDENT_CODE_WINDOW_MS) studentLoginFailures.delete(ip);
  }
  while (studentLoginFailures.size > STUDENT_FAILURES_MAX_ENTRIES) {
    studentLoginFailures.delete(studentLoginFailures.keys().next().value);
  }
  for (const [accountId, state] of accountLoginFailures) {
    if (state.lockUntil === 0 && now - state.windowStart > ACCOUNT_LOGIN_WINDOW_MS)
      accountLoginFailures.delete(accountId);
  }
  while (accountLoginFailures.size > ACCOUNT_FAILURES_MAX_ENTRIES) {
    accountLoginFailures.delete(accountLoginFailures.keys().next().value);
  }
}, 60 * 1000).unref();

function minutesLeft(lockUntil) {
  return Math.max(1, Math.ceil((lockUntil - Date.now()) / 60000));
}

function studentLockState(ip) {
  const now = Date.now();
  const state = studentLoginFailures.get(ip);
  if (!state) return null;
  // A lock is only "expired" once one has actually been set (lockUntil > 0).
  // Entries created purely to count failures keep lockUntil at 0 and must
  // never be treated as an expired lock -- otherwise the first check after a
  // failure deletes the counter and the lockout never engages.
  if (state.lockUntil > 0 && now >= state.lockUntil) {
    studentLoginFailures.delete(ip);
    return null;
  }
  // Only an active lock blocks; a failure counter with no lockUntil set is
  // not a lock.
  return state.lockUntil > 0 ? state : null;
}

function recordStudentLoginFailure(ip) {
  const now = Date.now();
  const current = studentLoginFailures.get(ip) || { failures: 0, windowStart: now, lockUntil: 0 };
  if (now - current.windowStart > STUDENT_CODE_WINDOW_MS) {
    current.failures = 0;
    current.windowStart = now;
  }
  current.failures += 1;
  if (current.failures >= STUDENT_CODE_MAX_ATTEMPTS) {
    current.lockUntil = now + STUDENT_CODE_LOCK_MS;
  }
  studentLoginFailures.set(ip, current);
}

function clearStudentLoginFailures(ip) {
  studentLoginFailures.delete(ip);
}

// Same shape as the student-code lockout, but keyed by account id: only a
// password check can reach these counters, so they can be tied to the target
// account directly (and a distributed guessing attack on one email locks that
// account no matter which IPs it comes from).
function accountLockState(accountId) {
  const now = Date.now();
  const state = accountLoginFailures.get(accountId);
  if (!state) return null;
  if (state.lockUntil > 0 && now >= state.lockUntil) {
    accountLoginFailures.delete(accountId);
    return null;
  }
  return state.lockUntil > 0 ? state : null;
}

function recordAccountLoginFailure(accountId) {
  const now = Date.now();
  const current = accountLoginFailures.get(accountId) || { failures: 0, windowStart: now, lockUntil: 0 };
  if (now - current.windowStart > ACCOUNT_LOGIN_WINDOW_MS) {
    current.failures = 0;
    current.windowStart = now;
  }
  current.failures += 1;
  if (current.failures >= ACCOUNT_LOGIN_MAX_ATTEMPTS) {
    current.lockUntil = now + ACCOUNT_LOGIN_LOCK_MS;
  }
  accountLoginFailures.set(accountId, current);
}

function clearAccountLoginFailures(accountId) {
  accountLoginFailures.delete(accountId);
}

// The JWT carries id, studentId and tokenVersion only. The role claim was
// removed deliberately: authMiddleware derives the role from the DB row (and
// forces STUDENT whenever a studentId is present), so no token claim can
// influence authorisation -- nothing in the backend or frontend ever read it.
function signToken(account, studentId) {
  return jwt.sign({ id: account.id, studentId, tokenVersion: account.tokenVersion || 0 }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "7d",
  });
}

const { presentStudent, presentStudents } = require("../services/studentPresenter");

// POST /auth/signup
// Self-registration is closed. Parent and teacher accounts are created and
// approved by the school administrator (see adminAccountController), and
// learner profiles are added by those accounts via POST /students.
async function signup(req, res) {
  return res.status(403).json({
    error:
      "Self-registration is closed. Ask your school administrator to create and approve your parent or teacher account.",
    registrationClosed: true,
  });
}

// POST /auth/login -- Body: { email, password }
// Returns the account's students too -- this is the endpoint the Login
// screen's onLoginSuccess(email, students) is meant to call.
async function login(req, res) {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body.password || "");

  const account = await prisma.account.findUnique({
    where: { email },
    include: { students: true },
  });
  if (!account || !account.passwordHash) {
    // Run bcrypt against a fixed hash anyway so the "no such account" path
    // takes as long as a real password check -- otherwise response timing
    // tells an attacker which emails are registered (an enumeration oracle).
    await bcrypt.compare(password, DUMMY_HASH);
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Per-account lockout: too many failed passwords freezes THIS account for
  // 15 minutes regardless of which IP the attempts came from.
  const locked = accountLockState(account.id);
  if (locked) {
    const wait = minutesLeft(locked.lockUntil);
    res.setHeader("Retry-After", String(wait * 60));
    return res.status(429).json({
      error: `Too many failed attempts. This account is locked for another ${wait} minute${wait === 1 ? "" : "s"}.`,
    });
  }

  const valid = await bcrypt.compare(password, account.passwordHash);
  if (!valid) {
    recordAccountLoginFailure(account.id);
    return res.status(401).json({ error: "Invalid credentials" });
  }
  clearAccountLoginFailures(account.id);

  // Accounts are created by the school administrator and only usable once
  // they have been approved by that administrator. There is no email
  // verification step: the administrator vouches for the address at creation.
  if (!account.approvedAt) {
    return res.status(403).json({
      error: "Your account has not been approved yet. Contact your school administrator to approve it.",
      approvalRequired: true,
    });
  }

  const token = signToken(account);
  // A fresh login must not inherit a stale cached account row, so drop
  // the cache entry and let the next request re-fetch current state.
  clearAccountCache(account.id);
  await audit(account.id, "account.login", account.id);
  return res.json({
    token,
    account: {
      id: account.id,
      email: account.email,
      name: account.name,
      avatarUrl: account.avatarUrl,
      role: account.role.toLowerCase(),
    },
    students: await presentStudents(account.students, true),
  });
}

// POST /auth/password-reset/request -- Body: { email }
// In-app forgot password: flags the account so the school administrator sees
// a "reset requested" badge in the admin portal, then resets it to a default
// password there. The response is deliberately identical whether or not the
// address exists so the form cannot be used to enumerate accounts.
async function requestPasswordReset(req, res) {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const account = email ? await prisma.account.findUnique({ where: { email } }) : null;
  if (account && !account.passwordResetRequestedAt) {
    await prisma.account.update({ where: { id: account.id }, data: { passwordResetRequestedAt: new Date() } });
    await audit(account.id, "account.password_reset_requested", account.id);
  }
  return res.json({
    message: "If an account exists for that email, your school administrator has been asked to reset it.",
  });
}

// POST /auth/change-password -- Body: { currentPassword, newPassword }
// Self-service password change from the dashboard. Sessions live on the JWT,
// so tokenVersion is bumped to kill every other device, then a fresh token is
// issued for this one -- the caller stays signed in while the old sessions die.
async function changePassword(req, res) {
  // Students sign in with a school code and have no password of their own:
  // the account row behind a student session belongs to their parent/teacher.
  if (req.user.studentId) {
    return res
      .status(403)
      .json({ error: "Student profiles do not have a password. Ask your teacher or parent to change it." });
  }

  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  if (newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  if (newPassword === currentPassword)
    return res.status(400).json({ error: "The new password must be different from the current one." });

  const account = await prisma.account.findUnique({ where: { id: req.user.id } });
  if (!account) return res.status(404).json({ error: "Account not found" });

  const valid = await bcrypt.compare(currentPassword, account.passwordHash);
  // 400, not 401: the session itself is fine, only the supplied current
  // password is wrong -- and the frontend's 401 handler logs the user out.
  if (!valid) return res.status(400).json({ error: "Your current password is incorrect." });

  const tokenVersion = (account.tokenVersion || 0) + 1;
  await prisma.account.update({
    where: { id: account.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 12),
      tokenVersion,
      // The request that got the user here is now satisfied.
      passwordResetRequestedAt: null,
    },
  });
  clearAccountCache(account.id);
  await audit(account.id, "account.password_changed", account.id);
  return res.json({
    message: "Password updated.",
    token: signToken({ id: account.id, tokenVersion }),
  });
}

// POST /auth/revoke-all-sessions -- "log out everywhere". Bumps tokenVersion
// so all JWTs (including the caller's) are rejected by the middleware.
async function revokeAllSessions(req, res) {
  await invalidateAccountTokens(req.user.id);
  clearAccountCache(req.user.id);
  await audit(req.user.id, "account.sessions_revoked", req.user.id);
  return res.json({ message: "All sessions have been logged out." });
}

async function loginWithStudentCode(req, res) {
  const studentCode = String(req.body.studentCode || "")
    .trim()
    .toUpperCase();
  if (!studentCode) return res.status(400).json({ error: "studentCode is required" });

  const locked = studentLockState(req.ip);
  if (locked) {
    const minutesLeft = Math.ceil((locked.lockUntil - Date.now()) / 60000);
    return res
      .status(429)
      .json({ error: `Too many attempts. Please try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.` });
  }

  const student = await prisma.student.findUnique({
    where: { studentCode },
    include: { account: true },
  });
  if (!student) {
    recordStudentLoginFailure(req.ip);
    return res.status(401).json({ error: "Invalid student code" });
  }

  // Same gate as password login: the school code is only usable once the
  // account behind it has been approved by the administrator. The code itself
  // was correct, so this is not a failed guess -- the IP counter is cleared
  // below, once the login has fully succeeded.
  if (!student.account.approvedAt) {
    return res.status(403).json({
      error: "Your account has not been approved yet. Contact your school administrator to approve it.",
      approvalRequired: true,
    });
  }

  clearStudentLoginFailures(req.ip);
  await prisma.student.update({ where: { id: student.id }, data: { lastActiveAt: new Date() } });
  // Carrying studentId is what makes authMiddleware force the STUDENT role
  // for this token; the role itself is derived there, never trusted from the
  // token payload.
  const token = signToken(student.account, student.id);
  clearAccountCache(student.accountId);
  return res.json({
    token,
    account: {
      id: student.accountId,
      name: student.name,
      avatarUrl: student.avatarUrl,
      role: "student",
      studentId: student.id,
    },
    students: [await presentStudent({ ...student, lastActiveAt: new Date() }, true)],
  });
}

// POST /auth/refresh -- re-issues a token for an already-valid session.
// A student-code session stays scoped to the same learner: the refreshed
// token keeps the STUDENT role and the studentId so it can never read
// sibling profiles under the parent's account.
async function refresh(req, res) {
  if (req.user.studentId) {
    const student = await prisma.student.findUnique({ where: { id: req.user.studentId }, include: { account: true } });
    if (!student) return res.status(401).json({ error: "Student no longer exists" });
    // The studentId in the token keeps the refreshed session scoped to this
    // learner (authMiddleware forces the STUDENT role from it).
    const token = signToken(student.account, student.id);
    return res.json({ token });
  }
  const account = await prisma.account.findUnique({ where: { id: req.user.id } });
  if (!account) {
    return res.status(401).json({ error: "Account no longer exists" });
  }
  const token = signToken(account);
  return res.json({ token });
}

module.exports = {
  signup,
  login,
  loginWithStudentCode,
  refresh,
  revokeAllSessions,
  requestPasswordReset,
  changePassword,
};
