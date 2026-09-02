const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../db/prismaClient");
const { sendEmail } = require("../services/emailService");
const { audit } = require("../services/auditService");
const { invalidateAccountTokens, clearAccountCache } = require("../middleware/authMiddleware");

// Fixed bcrypt hash (cost 10) compared against whenever the supplied email has
// no account, so login timing does not reveal which emails are registered.
const DUMMY_HASH = "$2a$10$DY4GtOHIofse4juSB.CDb.cEmcrb6oH3Ey4.wb/UEE2ltVCw0le2q";

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
setInterval(() => {
  const now = Date.now();
  for (const [ip, state] of studentLoginFailures) {
    if (state.lockUntil === 0 && now - state.windowStart > STUDENT_CODE_WINDOW_MS) studentLoginFailures.delete(ip);
  }
  while (studentLoginFailures.size > STUDENT_FAILURES_MAX_ENTRIES) {
    studentLoginFailures.delete(studentLoginFailures.keys().next().value);
  }
}, 60 * 1000).unref();

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

function signToken(account, studentId) {
  return jwt.sign(
    { id: account.id, role: account.role, studentId, tokenVersion: account.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: "7d" }
  );
}

const { presentStudent } = require("../services/studentPresenter");
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");
const newToken = () => crypto.randomBytes(32).toString("hex");

async function issueVerification(account) {
  const token = newToken();
  await prisma.account.update({ where: { id: account.id }, data: { verificationTokenHash: tokenHash(token), verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
  const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
  await sendEmail({ to: account.email, subject: "Verify your Spelling Bee email", html: `<p>Verify your email by opening <a href="${verificationUrl}">this link</a>.</p>` });
  return process.env.NODE_ENV === "production" ? undefined : verificationUrl;
}

// POST /auth/signup
// Self-registration is closed. Parent and teacher accounts are created and
// verified by the school administrator (see adminAccountController), and
// learner profiles are added by those accounts via POST /students.
async function signup(req, res) {
  return res.status(403).json({
    error: "Self-registration is closed. Ask your school administrator to create and verify your parent or teacher account.",
    registrationClosed: true,
  });
}

// POST /auth/login -- Body: { email, password }
// Returns the account's students too -- this is the endpoint the Login
// screen's onLoginSuccess(email, students) is meant to call.
async function login(req, res) {
  const email = String(req.body.email || "").trim().toLowerCase();
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

  const valid = await bcrypt.compare(password, account.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Accounts are created by the school administrator and only usable once
  // they have been approved/verified by that administrator.
  if (!account.approvedAt) {
    return res.status(403).json({ error: "Your account has not been approved yet. Contact your school administrator to verify it.", approvalRequired: true });
  }

  // Production enforces email verification so accounts can't be used before
  // the owner confirms the address. Development keeps the flow friction-free.
  if (process.env.NODE_ENV === "production" && !account.emailVerifiedAt) {
    return res.status(403).json({ error: "Please verify your email address before signing in.", verificationRequired: true });
  }

  const token = signToken(account);
  // A fresh login must not inherit a stale cached account row, so drop
  // the cache entry and let the next request re-fetch current state.
  clearAccountCache(account.id);
  await audit(account.id, "account.login", account.id);
  return res.json({
    token,
    account: { id: account.id, email: account.email, name: account.name, avatarUrl: account.avatarUrl, role: account.role.toLowerCase() },
    students: await Promise.all(account.students.map((student) => presentStudent(student, true))),
  });
}

async function verifyEmail(req, res) {
  const token = String(req.body.token || "");
  const account = await prisma.account.findFirst({ where: { verificationTokenHash: tokenHash(token), verificationExpiresAt: { gt: new Date() } } });
  if (!account) return res.status(400).json({ error: "This verification link is invalid or has expired" });
  await prisma.account.update({ where: { id: account.id }, data: { emailVerifiedAt: new Date(), verificationTokenHash: null, verificationExpiresAt: null } });
  await audit(account.id, "account.email_verified", account.id);
  return res.json({ message: "Email verified" });
}

async function requestPasswordReset(req, res) {
  const email = String(req.body.email || "").trim().toLowerCase();
  const account = await prisma.account.findUnique({ where: { email } });
  if (account) {
    const token = newToken();
    await prisma.account.update({ where: { id: account.id }, data: { passwordResetTokenHash: tokenHash(token), passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    await sendEmail({ to: account.email, subject: "Reset your Spelling Bee password", html: `<p>Reset your password by opening <a href="${resetUrl}">this link</a>. It expires in one hour.</p>` });
    await audit(account.id, "account.password_reset_requested", account.id);
    return res.json({ message: "If the email exists, a reset link has been sent.", ...(process.env.NODE_ENV === "production" ? {} : { resetUrl }) });
  }
  return res.json({ message: "If the email exists, a reset link has been sent." });
}

async function resetPassword(req, res) {
  const token = String(req.body.token || ""); const password = String(req.body.password || "");
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const account = await prisma.account.findFirst({ where: { passwordResetTokenHash: tokenHash(token), passwordResetExpiresAt: { gt: new Date() } } });
  if (!account) return res.status(400).json({ error: "This reset link is invalid or has expired" });
  await prisma.account.update({ where: { id: account.id }, data: { passwordHash: await bcrypt.hash(password, 12), passwordResetTokenHash: null, passwordResetExpiresAt: null } });
  // Rotate tokenVersion so every previously issued session dies with the old
  // password -- no other device keeps working after a self-service reset.
  await invalidateAccountTokens(account.id);
  await audit(account.id, "account.password_reset", account.id);
  return res.json({ message: "Password updated. You can now sign in." });
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
  const studentCode = String(req.body.studentCode || "").trim().toUpperCase();
  if (!studentCode) return res.status(400).json({ error: "studentCode is required" });

  const locked = studentLockState(req.ip);
  if (locked) {
    const minutesLeft = Math.ceil((locked.lockUntil - Date.now()) / 60000);
    return res.status(429).json({ error: `Too many attempts. Please try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.` });
  }

  const student = await prisma.student.findUnique({
    where: { studentCode },
    include: { account: true },
  });
  if (!student) {
    recordStudentLoginFailure(req.ip);
    return res.status(401).json({ error: "Invalid student code" });
  }

  clearStudentLoginFailures(req.ip);
  await prisma.student.update({ where: { id: student.id }, data: { lastActiveAt: new Date() } });
  const token = signToken({ ...student.account, role: "STUDENT" }, student.id);
  clearAccountCache(student.accountId);
  return res.json({ token, account: { id: student.accountId, name: student.name, avatarUrl: student.avatarUrl, role: "student", studentId: student.id }, students: [await presentStudent({ ...student, lastActiveAt: new Date() }, true)] });
}

// POST /auth/refresh -- re-issues a token for an already-valid session.
// A student-code session stays scoped to the same learner: the refreshed
// token keeps the STUDENT role and the studentId so it can never read
// sibling profiles under the parent's account.
async function refresh(req, res) {
  if (req.user.studentId) {
    const student = await prisma.student.findUnique({ where: { id: req.user.studentId }, include: { account: true } });
    if (!student) return res.status(401).json({ error: "Student no longer exists" });
    const token = signToken({ ...student.account, role: "STUDENT" }, student.id);
    return res.json({ token });
  }
  const account = await prisma.account.findUnique({ where: { id: req.user.id } });
  if (!account) {
    return res.status(401).json({ error: "Account no longer exists" });
  }
  const token = signToken(account);
  return res.json({ token });
}

module.exports = { signup, login, loginWithStudentCode, refresh, revokeAllSessions, verifyEmail, requestPasswordReset, resetPassword };
