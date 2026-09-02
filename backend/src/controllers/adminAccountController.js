const bcrypt = require("bcryptjs");
const prisma = require("../db/prismaClient");
const { audit } = require("../services/auditService");
const { invalidateAccountTokens, clearAccountCache } = require("../middleware/authMiddleware");

// GET /admin/accounts
// Every parent/teacher account on the platform, with approval status and any
// classroom assignments. Used by the admin portal to register and verify
// accounts (self-registration is closed).
async function listAccounts(req, res) {
  const accounts = await prisma.account.findMany({
    where: { role: { in: ["PARENT", "TEACHER", "ADMIN"] } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      approvedAt: true,
      emailVerifiedAt: true,
      createdAt: true,
      classrooms: { select: { id: true, name: true, grade: true } },
      _count: { select: { students: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  // Roles are surfaced lowercase to match the frontend's AdminAccount type.
  return res.json(accounts.map(({ _count, ...account }) => ({ ...account, role: account.role.toLowerCase(), studentCount: _count.students })));
}

// POST /admin/accounts -- Body: { email, password, name, role, classroomIds? }
// Registers a parent or teacher account on behalf of the school. The account
// is verified immediately (the administrator created it deliberately) and can
// sign in once approved. A teacher can be linked to classrooms here.
async function createAccount(req, res) {
  const { email, password, name, role, classroomIds } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });
  if (!["parent", "teacher"].includes(role)) return res.status(400).json({ error: "role must be 'parent' or 'teacher'" });
  if (String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return res.status(400).json({ error: "Enter a valid email address" });

  const existing = await prisma.account.findUnique({ where: { email: normalizedEmail } });
  if (existing) return res.status(409).json({ error: "An account with this email already exists" });

  const classroomIdsArray = Array.isArray(classroomIds) ? classroomIds.filter(Boolean) : [];
  let classrooms = [];
  if (classroomIdsArray.length) {
    classrooms = await prisma.classroom.findMany({ where: { id: { in: classroomIdsArray } } });
    if (classrooms.length !== new Set(classroomIdsArray).size) return res.status(400).json({ error: "One or more classrooms were not found" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const account = await prisma.account.create({
    data: {
      email: normalizedEmail,
      name: name?.trim() || null,
      passwordHash,
      role: role === "teacher" ? "TEACHER" : "PARENT",
      emailVerifiedAt: new Date(),
      ...(classrooms.length ? { classrooms: { connect: classrooms.map((classroom) => ({ id: classroom.id })) } } : {}),
    },
  });
  await audit(req.user.id, "account.admin_created", account.id, { role: account.role, email: account.email });
  return res.status(201).json(await presentAdminAccount(account.id));
}

// PATCH /admin/accounts/:id -- Body: any of { name, email, password, role, classroomIds, approve }
// Approves (verified) or suspends an account, updates class assignments, edits
// profile details and resets the password. Administrator accounts are managed
// through the bootstrap configuration instead.
async function updateAccount(req, res) {
  const target = await prisma.account.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "Account not found" });
  if (target.role === "ADMIN") return res.status(400).json({ error: "Administrator accounts are managed through the bootstrap configuration" });

  const data = {};
  if (typeof req.body.name === "string" && req.body.name.trim().length >= 2) data.name = req.body.name.trim().slice(0, 80);
  if (req.body.role === "parent" || req.body.role === "teacher") data.role = req.body.role === "teacher" ? "TEACHER" : "PARENT";
  if (req.body.approve === true) data.approvedAt = new Date();
  if (req.body.approve === false) data.approvedAt = null;

  if (typeof req.body.email === "string" && req.body.email.trim()) {
    const normalizedEmail = String(req.body.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return res.status(400).json({ error: "Enter a valid email address" });
    const clash = await prisma.account.findUnique({ where: { email: normalizedEmail } });
    if (clash && clash.id !== target.id) return res.status(409).json({ error: "An account with this email already exists" });
    if (normalizedEmail !== target.email) {
      // A new address needs a fresh verification before it can be used in
      // production, and any outstanding reset/verify tokens become invalid.
      data.email = normalizedEmail;
      data.emailVerifiedAt = null;
      data.verificationTokenHash = null;
      data.verificationExpiresAt = null;
      data.passwordResetTokenHash = null;
      data.passwordResetExpiresAt = null;
    }
  }

  if (typeof req.body.password === "string" && req.body.password.length) {
    if (req.body.password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    data.passwordHash = await bcrypt.hash(req.body.password, 10);
    data.passwordResetTokenHash = null;
    data.passwordResetExpiresAt = null;
  }

  if (Array.isArray(req.body.classroomIds)) {
    const classroomIds = req.body.classroomIds.filter(Boolean);
    const classrooms = classroomIds.length ? await prisma.classroom.findMany({ where: { id: { in: classroomIds } } }) : [];
    if (classrooms.length !== new Set(classroomIds).size) return res.status(400).json({ error: "One or more classrooms were not found" });
    await prisma.account.update({ where: { id: target.id }, data: { classrooms: { set: classrooms.map((classroom) => ({ id: classroom.id })) } } });
  }

  const updated = await prisma.account.update({ where: { id: target.id }, data });
  // Suspending an account (approve:false), resetting its password or changing
  // its email must kill every session the account still holds.
  if (data.approvedAt === null || data.passwordHash || data.email) {
    await invalidateAccountTokens(target.id);
  }
  await audit(req.user.id, "account.admin_updated", target.id, { role: data.role, approved: data.approvedAt !== undefined ? Boolean(data.approvedAt) : undefined, email: data.email });
  return res.json(await presentAdminAccount(updated.id));
}

// DELETE /admin/accounts/:id
// Removes a parent or teacher account and everything attached to it: the
// learners under the account (and their gameplay data), content the account
// authored, and any classes it was the teacher of. Admin accounts are managed
// through the bootstrap configuration and can never be deleted here.
async function deleteAccount(req, res) {
  const target = await prisma.account.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "Account not found" });
  if (target.role === "ADMIN") return res.status(400).json({ error: "Administrator accounts are managed through the bootstrap configuration" });
  if (target.id === req.user.id) return res.status(400).json({ error: "You cannot delete your own account" });

  await prisma.$transaction(async (tx) => {
    const ownedClassroomIds = (await tx.classroom.findMany({ where: { teacherId: target.id }, select: { id: true } })).map((classroom) => classroom.id);

    if (ownedClassroomIds.length) {
      // Unassign every learner from the class (Student.classroomId is optional),
      // then remove the class rows themselves.
      await tx.student.updateMany({ where: { classroomId: { in: ownedClassroomIds } }, data: { classroomId: null } });
      await tx.classroom.deleteMany({ where: { id: { in: ownedClassroomIds } } });
    }

    // The learners under this account, with the same full cleanup a student
    // delete performs (progress, badges, preferences, completions).
    const studentIds = (await tx.student.findMany({ where: { accountId: target.id }, select: { id: true } })).map((student) => student.id);
    if (studentIds.length) {
      await tx.progress.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.studentBadge.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.studentPreference.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.dailyChallengeCompletion.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.practiceSession.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.student.deleteMany({ where: { id: { in: studentIds } } });
    }

    await tx.accountPreference.deleteMany({ where: { accountId: target.id } });
    await tx.auditLog.deleteMany({ where: { accountId: target.id } });
    await tx.account.delete({ where: { id: target.id } });
  });

  // The row is gone; drop the in-memory auth cache so a deleted account's JWT
  // stops authenticating immediately instead of lingering for up to 30s.
  clearAccountCache(target.id);
  await audit(req.user.id, "account.admin_deleted", target.id, { email: target.email, role: target.role });
  return res.status(204).end();
}

async function presentAdminAccount(accountId) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      approvedAt: true,
      emailVerifiedAt: true,
      createdAt: true,
      classrooms: { select: { id: true, name: true, grade: true } },
      _count: { select: { students: true } },
    },
  });
  const { _count, ...rest } = account;
  return { ...rest, role: rest.role.toLowerCase(), studentCount: _count.students };
}

module.exports = { listAccounts, createAccount, updateAccount, deleteAccount };
