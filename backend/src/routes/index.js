const express = require("express");
const router = express.Router();

// Express 4 does not forward rejected promises from async controllers. Wrap
// route callbacks once so database/configuration failures become JSON errors
// instead of terminating the Node process.
for (const method of ["get", "post", "patch", "put", "delete"]) {
  const original = router[method].bind(router);
  router[method] = (path, ...handlers) =>
    original(
      path,
      ...handlers.map((handler) => {
        if (typeof handler !== "function") return handler;
        return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
      }),
    );
}

const authMiddleware = require("../middleware/authMiddleware");
const { rateLimit } = require("../middleware/rateLimit");
const roleMiddleware = require("../middleware/roleMiddleware");
const requireOwnStudent = require("../middleware/studentOwnership");

const authController = require("../controllers/authController");
const studentController = require("../controllers/studentController");
const userController = require("../controllers/userController");
const wordController = require("../controllers/wordController");
const roundController = require("../controllers/roundController");
const badgeController = require("../controllers/badgeController");
const leaderboardController = require("../controllers/leaderboardController");
const dailyChallengeController = require("../controllers/dailyChallengeController");
const hintController = require("../controllers/hintController");
const classroomController = require("../controllers/classroomController");
const preferenceController = require("../controllers/preferenceController");
const adminWordController = require("../controllers/adminWordController");
const adminAccountController = require("../controllers/adminAccountController");

// Rate-limit buckets. Gameplay routes are keyed to the session (declared first
// so every limiter below is in scope). All write endpoints carry a bounded
// budget -- the auth routes use per-IP buckets.
const sessionKey = (req) => (req.user?.id ? `${req.user.id}` : req.ip);
const roundLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, key: sessionKey });
const hintLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, key: sessionKey });
const dailyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, key: sessionKey });
const createStudentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: sessionKey });
const studentWriteLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, key: sessionKey });
// Reads carry their own budgets too: GET /students renders the whole roster
// (aggregates per learner) and placement is a one-time quiz that must not be
// hammered.
const studentListLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, key: sessionKey });
const placementLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: sessionKey });
// CSV imports and dictionary lookups call an external service (up to 8s per
// word), so they get their own strict budgets on top of the bounded, time-boxed
// processing inside the controllers.
const importLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: sessionKey });
const lookupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, key: sessionKey });

// Auth (no token required)
router.post("/auth/signup", rateLimit({ max: 10, key: (req) => `signup:${req.ip}` }), authController.signup);
router.post("/auth/login", rateLimit({ max: 10, key: (req) => `login:${req.ip}` }), authController.login);
router.post(
  "/auth/student-login",
  rateLimit({ max: 20, key: (req) => `student-login:${req.ip}` }),
  authController.loginWithStudentCode,
);
// In-app password recovery: the user asks here, the school administrator
// fulfils it in the admin portal (no email, no token links).
router.post(
  "/auth/password-reset/request",
  rateLimit({ max: 5, key: (req) => `reset:${req.ip}` }),
  authController.requestPasswordReset,
);
router.post(
  "/auth/change-password",
  authMiddleware,
  rateLimit({ max: 10, key: (req) => `change-password:${req.user?.id || req.ip}` }),
  authController.changePassword,
);
router.post(
  "/auth/refresh",
  authMiddleware,
  rateLimit({ max: 60, key: (req) => `refresh:${req.user?.id || req.ip}` }),
  authController.refresh,
);
router.post("/auth/revoke-all-sessions", authMiddleware, authController.revokeAllSessions);

// Account-level (the logged-in parent/teacher, not a specific student)
router.get("/users/me", authMiddleware, userController.getMe);
router.get("/users/me/preferences", authMiddleware, userController.getPreferences);
router.patch("/users/me/preferences", authMiddleware, userController.updatePreferences);
router.patch("/users/me/profile", authMiddleware, userController.updateProfile);

// Student profiles under the account
router.get("/students", authMiddleware, studentListLimiter, studentController.listStudents);
router.post("/students", authMiddleware, createStudentLimiter, studentController.createStudent);
// Ownership is enforced ONCE by requireOwnStudent (see
// src/middleware/studentOwnership.js) -- the controllers consume req.student.
router.patch(
  "/students/:studentId",
  authMiddleware,
  requireOwnStudent,
  studentWriteLimiter,
  studentController.updateStudent,
);
router.post("/students/:studentId/placement", authMiddleware, placementLimiter, studentController.completePlacement);
router.delete("/students/:studentId", authMiddleware, requireOwnStudent, studentController.deleteStudent);

// Word content -- not student-specific, just needs a logged-in account.
// When a learner is named the same ownership rule applies as elsewhere.
router.get(
  "/wordlists/:tier",
  authMiddleware,
  (req, res, next) => {
    if (req.query.studentId || req.user.studentId) return requireOwnStudent(req, res, next);
    return next();
  },
  wordController.getWordsByTier,
);

router.get(
  "/daily-challenge",
  authMiddleware,
  (req, res, next) => {
    // Without a studentId this is just "word of the day" for everyone. Once a
    // learner is named, that student must belong to the caller (or be the
    // caller's own student session) before we report their completion status.
    if (req.query.studentId || req.user.studentId) return requireOwnStudent(req, res, next);
    return next();
  },
  dailyChallengeController.getDailyChallenge,
);
router.post(
  "/daily-challenge/complete",
  authMiddleware,
  requireOwnStudent,
  dailyLimiter,
  dailyChallengeController.completeDailyChallenge,
);
router.post("/hints", authMiddleware, hintLimiter, hintController.getHint);

// Everything below acts on a specific child's data, so it goes through
// requireOwnStudent after authMiddleware -- confirms the studentId in
// the request actually belongs to this account.
router.post("/rounds", authMiddleware, requireOwnStudent, roundLimiter, roundController.submitRound);
router.get("/students/:studentId/badges", authMiddleware, requireOwnStudent, badgeController.getStudentBadges);
router.get("/students/:studentId/preferences", authMiddleware, requireOwnStudent, preferenceController.getPreferences);
router.patch(
  "/students/:studentId/preferences",
  authMiddleware,
  requireOwnStudent,
  preferenceController.updatePreferences,
);

// Classrooms -- teachers and administrators manage classes and their learners
router.get("/classrooms", authMiddleware, roleMiddleware(["TEACHER", "ADMIN"]), classroomController.listClassrooms);
router.post(
  "/classrooms",
  authMiddleware,
  roleMiddleware(["TEACHER", "ADMIN"]),
  studentWriteLimiter,
  classroomController.createClassroom,
);
router.patch(
  "/classrooms/:id",
  authMiddleware,
  roleMiddleware(["TEACHER", "ADMIN"]),
  studentWriteLimiter,
  classroomController.updateClassroom,
);
router.post(
  "/classrooms/:id/students",
  authMiddleware,
  roleMiddleware(["TEACHER", "ADMIN"]),
  studentWriteLimiter,
  classroomController.assignStudent,
);

router.get("/leaderboard", authMiddleware, leaderboardController.getLeaderboard);

// Admin-only account management
router.get("/admin/accounts", authMiddleware, roleMiddleware(["ADMIN"]), adminAccountController.listAccounts);
router.post(
  "/admin/accounts",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  studentWriteLimiter,
  adminAccountController.createAccount,
);
router.patch(
  "/admin/accounts/:id",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  studentWriteLimiter,
  adminAccountController.updateAccount,
);
// Fulfil an in-app "I forgot my password" request: sets the default password
// and clears the request flag the portal badge is driven by.
router.post(
  "/admin/accounts/:id/reset-password",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  studentWriteLimiter,
  adminAccountController.resetPasswordToDefault,
);
router.delete(
  "/admin/accounts/:id",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  studentWriteLimiter,
  adminAccountController.deleteAccount,
);

// Admin/teacher word bank management
router.get("/admin/words", authMiddleware, roleMiddleware(["ADMIN", "TEACHER"]), adminWordController.listWords);
router.post(
  "/admin/words",
  authMiddleware,
  roleMiddleware(["ADMIN", "TEACHER"]),
  studentWriteLimiter,
  adminWordController.createWord,
);
router.post(
  "/admin/words/lookup",
  authMiddleware,
  roleMiddleware(["ADMIN", "TEACHER"]),
  lookupLimiter,
  adminWordController.lookupDictionaryWord,
);
router.post(
  "/admin/words/from-dictionary",
  authMiddleware,
  roleMiddleware(["ADMIN", "TEACHER"]),
  studentWriteLimiter,
  adminWordController.createWordFromDictionary,
);
router.post(
  "/admin/words/import-csv",
  authMiddleware,
  roleMiddleware(["ADMIN", "TEACHER"]),
  importLimiter,
  adminWordController.importWordsFromCSV,
); // CSV Import route
router.patch(
  "/admin/words/:id",
  authMiddleware,
  roleMiddleware(["ADMIN", "TEACHER"]),
  studentWriteLimiter,
  adminWordController.updateWord,
);
router.delete(
  "/admin/words/:id",
  authMiddleware,
  roleMiddleware(["ADMIN", "TEACHER"]),
  studentWriteLimiter,
  adminWordController.deleteWord,
);

module.exports = router;
