const bcrypt = require("bcryptjs");
const prisma = require("../db/prismaClient");
const { audit } = require("../services/auditService");
const { invalidateAccountTokens, clearAccountCache } = require("../middleware/authMiddleware");

// Default password an administrator's one-click reset sets. Deliberately simple
// and shared: the administrator relays it out-of-band and the owner replaces it
// from their dashboard (the response returns it so the portal can show it).
const DEFAULT_RESET_PASSWORD = process.env.DEFAULT_RESET_PASSWORD || "SpellingBee123";

// GET /admin/accounts
// Every parent/teacher account on the platform, with approval status, any
// classroom assignments and outstanding password-reset requests. Used by the
// admin portal to register and approve accounts (self-registration is closed).
async function listAccounts(req, res) {
  const accounts = await prisma.account.findMany({
    where: { role: { in: ["PARENT", "TEACHER", "ADMIN"] } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      approvedAt: true,
      passwordResetRequestedAt: true,
      createdAt: true,
      classrooms: { select: { id: true, name: true, grade: true } },
      _count: { select: { students: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  // Roles are surfaced lowercase to match the frontend's AdminAccount type.
  return res.json(
    accounts.map(({ _count, ...account }) => ({
      ...account,
      role: account.role.toLowerCase(),
      studentCount: _count.students,
    })),
  );
}

// POST /admin/accounts -- Body: { email, password, name, role, classroomIds? }
// Registers a parent or teacher account on behalf of the school. There is no
// email verification: the administrator created it deliberately, so the row is
// simply ready to go (it still needs approval). A teacher can be linked to
// classrooms here.
async function createAccount(req, res) {
  const { email, password, name, role, classroomIds } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });
  if (!["parent", "teacher"].includes(role))
    return res.status(400).json({ error: "role must be 'parent' or 'teacher'" });
  if (String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
    return res.status(400).json({ error: "Enter a valid email address" });

  const existing = await prisma.account.findUnique({ where: { email: normalizedEmail } });
  if (existing) return res.status(409).json({ error: "An account with this email already exists" });

  const classroomIdsArray = Array.isArray(classroomIds) ? classroomIds.filter(Boolean) : [];
  let classrooms = [];
  if (classroomIdsArray.length) {
    classrooms = await prisma.classroom.findMany({ where: { id: { in: classroomIdsArray } } });
    if (classrooms.length !== new Set(classroomIdsArray).size)
      return res.status(400).json({ error: "One or more classrooms were not found" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let account;
  try {
    account = await prisma.account.create({
      data: {
        email: normalizedEmail,
        name: name?.trim() || null,
        passwordHash,
        role: role === "teacher" ? "TEACHER" : "PARENT",
        ...(classrooms.length
          ? { classrooms: { connect: classrooms.map((classroom) => ({ id: classroom.id })) } }
          : {}),
      },
    });
  } catch (error) {
    // Two admins racing past the findUnique check above: the unique index on
    // Account.email is the authority -- answer 409, not a 500.
    if (error.code === "P2002") return res.status(409).json({ error: "An account with this email already exists" });
    throw error;
  }
  await audit(req.user.id, "account.admin_created", account.id, { role: account.role, email: account.email });
  const presented = await presentAdminAccount(account.id);
  if (!presented) return res.status(404).json({ error: "Account not found" });
  return res.status(201).json(presented);
}

// PATCH /admin/accounts/:id -- Body: any of { name, email, password, role, classroomIds, approve }
// Approves or suspends an account, updates class assignments, edits profile
// details and resets the password. Administrator accounts are managed through
// the bootstrap configuration instead.
async function updateAccount(req, res) {
  const target = await prisma.account.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "Account not found" });
  if (target.role === "ADMIN")
    return res.status(400).json({ error: "Administrator accounts are managed through the bootstrap configuration" });

  const data = {};
  if (typeof req.body.name === "string" && req.body.name.trim().length >= 2)
    data.name = req.body.name.trim().slice(0, 80);
  if (req.body.role === "parent" || req.body.role === "teacher")
    data.role = req.body.role === "teacher" ? "TEACHER" : "PARENT";
  if (req.body.approve === true) data.approvedAt = new Date();
  if (req.body.approve === false) data.approvedAt = null;

  if (typeof req.body.email === "string" && req.body.email.trim()) {
    const normalizedEmail = String(req.body.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
      return res.status(400).json({ error: "Enter a valid email address" });
    const clash = await prisma.account.findUnique({ where: { email: normalizedEmail } });
    if (clash && clash.id !== target.id)
      return res.status(409).json({ error: "An account with this email already exists" });
    if (normalizedEmail !== target.email) {
      // There is no email verification to redo; the address is admin-managed.
      // Outstanding reset requests stay (they belong to the account, not the
      // address) until a password is actually set below.
      data.email = normalizedEmail;
    }
  }

  if (typeof req.body.password === "string" && req.body.password.length) {
    if (req.body.password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    data.passwordHash = await bcrypt.hash(req.body.password, 12);
    // A password was just set, so any pending "I forgot my password" request
    // is satisfied and the portal badge should clear.
    data.passwordResetRequestedAt = null;
  }

  let classroomSet;
  if (Array.isArray(req.body.classroomIds)) {
    const classroomIds = req.body.classroomIds.filter(Boolean);
    const classrooms = classroomIds.length
      ? await prisma.classroom.findMany({ where: { id: { in: classroomIds } } })
      : [];
    if (classrooms.length !== new Set(classroomIds).size)
      return res.status(400).json({ error: "One or more classrooms were not found" });
    classroomSet = classrooms.map((classroom) => ({ id: classroom.id }));
  }

  // Classroom reassignment and the profile edit must land together: two
  // sequential updates could fail halfway and leave new classes with the old
  // profile (or vice versa).
  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      if (classroomSet !== undefined) {
        await tx.account.update({ where: { id: target.id }, data: { classrooms: { set: classroomSet } } });
      }
      return tx.account.update({ where: { id: target.id }, data });
    });
  } catch (error) {
    // Email uniqueness is decided by the DB when two admins race.
    if (error.code === "P2002") return res.status(409).json({ error: "An account with this email already exists" });
    throw error;
  }
  // Suspending an account (approve:false), resetting its password or changing
  // its email must kill every session the account still holds.
  if (data.approvedAt === null || data.passwordHash || data.email) {
    await invalidateAccountTokens(target.id);
  }
  await audit(req.user.id, "account.admin_updated", target.id, {
    role: data.role,
    approved: data.approvedAt !== undefined ? Boolean(data.approvedAt) : undefined,
    email: data.email,
  });
  const presented = await presentAdminAccount(updated.id);
  if (!presented) return res.status(404).json({ error: "Account not found" });
  return res.json(presented);
}

// DELETE /admin/accounts/:id
// Removes a parent or teacher account and everything attached to it: the
// learners under the account (and, via schema cascades, their gameplay data),
// and any classes it was the teacher of. Admin accounts are managed
// through the bootstrap configuration and can never be deleted here.
async function deleteAccount(req, res) {
  const target = await prisma.account.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "Account not found" });
  if (target.role === "ADMIN")
    return res.status(400).json({ error: "Administrator accounts are managed through the bootstrap configuration" });
  if (target.id === req.user.id) return res.status(400).json({ error: "You cannot delete your own account" });

  await prisma.$transaction(async (tx) => {
    // RESTRICT still dictates the order here: Account -> Student and
    // Account -> Classroom are RESTRICT, so learners and classes must go
    // first. Everything under a learner (progress, badges, preferences,
    // daily completions, practice sessions) cascades from Student in the
    // schema, and AccountPreference/AuditLog cascade from Account -- no
    // hand-rolled child lists are needed any more.
    await tx.student.deleteMany({ where: { accountId: target.id } });
    // Any learner ANOTHER account still has in one of these classrooms gets
    // classroomId set to null by the SET NULL FK.
    await tx.classroom.deleteMany({ where: { teacherId: target.id } });
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
      passwordResetRequestedAt: true,
      createdAt: true,
      classrooms: { select: { id: true, name: true, grade: true } },
      _count: { select: { students: true } },
    },
  });
  // The row can be gone by the time we re-read it (concurrent delete) -- do
  // not destructure null.
  if (!account) return null;
  const { _count, ...rest } = account;
  return { ...rest, role: rest.role.toLowerCase(), studentCount: _count.students };
}

// POST /admin/accounts/:id/reset-password -- Body: { password? }
// Fulfils an in-app forgot-password request: sets the default password (or a
// custom one the admin supplies), clears the request flag the portal badge is
// driven by, and revokes every live session so the old password dies with the
// reset. Returns the password that was set so the admin can relay it.
async function resetPasswordToDefault(req, res) {
  const target = await prisma.account.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "Account not found" });
  if (target.role === "ADMIN")
    return res.status(400).json({ error: "Administrator accounts are managed through the bootstrap configuration" });

  let password = DEFAULT_RESET_PASSWORD;
  if (req.body.password !== undefined) {
    if (typeof req.body.password !== "string" || req.body.password.length < 8)
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    password = req.body.password;
  } else if (password.length < 8) {
    // Misconfigured DEFAULT_RESET_PASSWORD: refuse rather than hand out an
    // account with a password that fails the normal minimum everywhere else.
    return res.status(500).json({ error: "DEFAULT_RESET_PASSWORD must be at least 8 characters" });
  }

  await prisma.account.update({
    where: { id: target.id },
    data: { passwordHash: await bcrypt.hash(password, 12), passwordResetRequestedAt: null },
  });
  await invalidateAccountTokens(target.id);
  await audit(req.user.id, "account.admin_password_reset", target.id, { email: target.email });
  const presented = await presentAdminAccount(target.id);
  if (!presented) return res.status(404).json({ error: "Account not found" });
  return res.json({ ...presented, password });
}

module.exports = { listAccounts, createAccount, updateAccount, deleteAccount, resetPasswordToDefault };
