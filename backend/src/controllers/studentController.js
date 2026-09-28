const prisma = require("../db/prismaClient");
// Aliased so it does not shadow Node's global `crypto` (WebCrypto). See the
// same pattern in authController.
const nodeCrypto = require("node:crypto");
const { presentStudent, presentStudents } = require("../services/studentPresenter");

const AVATAR_COLORS = ["#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];

// ST-XXXXXXX codes are the learner's login credential, so they come from a CSPRNG
// (nodeCrypto.randomInt) rather than Math.random, and the 7-digit space is large
// enough that guesses don't find a code before the per-IP lockout kicks in.
function createStudentCode() {
  return `ST-${nodeCrypto.randomInt(1000000, 10000000)}`;
}

// ---------------------------------------------------------------------------
// Classroom attachment -- the rule, for EVERY role, on create AND update:
//
//   ADMIN   -> may attach a learner to any classroom.
//   TEACHER -> only to classrooms they own (classroom.teacherId === their id).
//   PARENT  -> only to classrooms owned by an administrator (classes no
//              teacher owns yet); NEVER to a teacher's classroom.
//
// The class *name* is not a credential -- it used to be the only check, which
// meant any parent could attach their child to any classroom on the platform
// by typing its name. A caller may pass an explicit `classroomId` (checked
// against the same rule); otherwise the name resolves to the earliest match.
// When the caller may not claim the resolved classroom, create returns 403
// and update unlinks the learner (never a silent transfer).
// ---------------------------------------------------------------------------
async function resolveClassroom(req, { classroomId, className }) {
  if (classroomId) {
    const byId = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: { teacher: { select: { role: true } } },
    });
    if (byId) return byId;
    // An unknown id means "no classroom" rather than an error, matching how
    // an unknown name behaves below.
    return null;
  }
  if (!className) return null;
  return prisma.classroom.findFirst({
    where: { name: className },
    orderBy: { createdAt: "asc" },
    include: { teacher: { select: { role: true } } },
  });
}

async function classroomIsClaimable(req, classroom) {
  if (!classroom) return true; // nothing matched: the learner simply stays unlinked
  if (req.user.role === "ADMIN") return true;
  if (req.user.role === "TEACHER") return classroom.teacherId === req.user.id;
  const owner =
    classroom.teacher ||
    (await prisma.account.findUnique({ where: { id: classroom.teacherId }, select: { role: true } }));
  return owner?.role === "ADMIN";
}

async function teacherClassMessage(req) {
  const classes = await prisma.classroom.findMany({ where: { teacherId: req.user.id }, select: { name: true } });
  const classList = classes.map((item) => item.name).join(", ") || "none assigned yet";
  return `You can only register learners in your assigned class (${classList}). Ask the school administrator if this class is yours.`;
}

// Returns an error message when the caller may not claim `classroom`, or null
// when the attachment is allowed (including "no classroom matched").
async function classroomDenialReason(req, classroom) {
  if (req.user.role === "ADMIN") return null;
  if (req.user.role === "TEACHER") {
    if (classroom && classroom.teacherId === req.user.id) return null;
    return teacherClassMessage(req);
  }
  if (!classroom) return null;
  return (await classroomIsClaimable(req, classroom))
    ? null
    : "That class belongs to a teacher. Ask the teacher or the school administrator to enrol your child.";
}

// GET /students -- every profile under the authenticated account
async function listStudents(req, res) {
  let where;
  if (req.user.role === "ADMIN") where = {};
  else if (req.user.role === "TEACHER") where = { classroom: { teacherId: req.user.id } };
  else where = req.user.studentId ? { id: req.user.studentId } : { accountId: req.user.id };
  const students = await prisma.student.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });
  // One batched presenter call: O(1) queries regardless of how many learners
  // the account has (admins can see the whole platform here).
  return res.json(await presentStudents(students, true));
}

// POST /students -- Body: { name, age, className, classroomId? }
// Called from the app's "add a child" flow, and once during onboarding
// for the first profile.
async function createStudent(req, res) {
  const { name, age, className, currentTier } = req.body;
  const parsedAge = Number(age);
  if (!name?.trim() || !className?.trim() || !Number.isInteger(parsedAge) || parsedAge < 3 || parsedAge > 120)
    return res.status(400).json({ error: "name, a valid age, and className are required" });
  if (req.user.studentId) return res.status(403).json({ error: "Student sessions cannot create profiles" });
  const count = await prisma.student.count({ where: { accountId: req.user.id } });

  const requestedClass = className.trim();
  const classroom = await resolveClassroom(req, {
    classroomId:
      typeof req.body.classroomId === "string" && req.body.classroomId.trim() ? req.body.classroomId.trim() : undefined,
    className: requestedClass,
  });
  const denial = await classroomDenialReason(req, classroom);
  if (denial) return res.status(403).json({ error: denial });

  // ST-XXXXX codes are random; retry a couple of times if the (rare)
  // collision with an existing student happens.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const student = await prisma.student.create({
        data: {
          accountId: req.user.id,
          studentCode: createStudentCode(),
          name: name.trim(),
          age: parsedAge,
          className: requestedClass,
          classroomId: classroom?.id,
          currentTier: Math.min(6, Math.max(1, Number(currentTier) || 1)),
          avatarColor: AVATAR_COLORS[count % AVATAR_COLORS.length],
        },
      });
      return res.status(201).json(await presentStudent(student, true));
    } catch (error) {
      if (error.code !== "P2002") throw error;
    }
  }
  return res.status(500).json({ error: "Could not generate a unique student code. Please try again." });
}

// PATCH /students/:studentId -- ownership was already checked by the
// requireOwnStudent route middleware (req.student), so this only handles the
// field-level rules.
async function updateStudent(req, res) {
  const student = req.student;
  // Student-code sessions are for learning only. Parents, teachers assigned
  // to the class, and admins manage profile details.
  if (req.user.studentId)
    return res.status(403).json({ error: "Student profiles can only be edited by a parent, teacher, or admin" });
  const data = {};
  if (typeof req.body.name === "string" && req.body.name.trim().length >= 2)
    data.name = req.body.name.trim().slice(0, 80);
  if (
    req.body.age !== undefined &&
    Number.isInteger(Number(req.body.age)) &&
    Number(req.body.age) >= 3 &&
    Number(req.body.age) <= 120
  )
    data.age = Number(req.body.age);
  if (typeof req.body.className === "string" && req.body.className.trim()) {
    data.className = req.body.className.trim();
    const classroom = await resolveClassroom(req, {
      classroomId:
        typeof req.body.classroomId === "string" && req.body.classroomId.trim()
          ? req.body.classroomId.trim()
          : undefined,
      className: data.className,
    });
    // A classroom the caller may not claim (another teacher's class, or any
    // teacher's class for a parent) unlinks the learner instead of silently
    // transferring them -- same rule as on create, documented above.
    data.classroomId = (await classroomIsClaimable(req, classroom)) ? classroom?.id || null : null;
  }
  // Tier and hearts are gameplay state, not profile details. Only teachers,
  // org admins, and platform admins may adjust them (the supervisor portal);
  // a parent must never set them directly, because tier progression and hearts
  // are earned through gameplay.
  const mayAdjustGameplay = ["TEACHER", "ADMIN"].includes(req.user.role);
  if (req.body.currentTier !== undefined) {
    if (!mayAdjustGameplay)
      return res
        .status(403)
        .json({ error: "A learner's tier is earned through gameplay and can only be adjusted by a teacher or admin" });
    const tier = Number(req.body.currentTier);
    if (!Number.isInteger(tier)) return res.status(400).json({ error: "currentTier must be a whole number" });
    data.currentTier = Math.min(6, Math.max(1, tier));
  }
  if (req.body.hearts !== undefined) {
    if (!mayAdjustGameplay)
      return res
        .status(403)
        .json({ error: "Hearts are earned through gameplay and can only be refilled by a teacher or admin" });
    const hearts = Number(req.body.hearts);
    if (!Number.isInteger(hearts)) return res.status(400).json({ error: "hearts must be a whole number" });
    data.hearts = Math.max(0, Math.min(5, hearts));
    // Any supervisor adjustment restarts the regeneration clock, so neither a
    // refill to 5 nor a manual reduction can inherit time banked earlier.
    data.heartsUpdatedAt = new Date();
  }
  const updated = await prisma.student.update({ where: { id: student.id }, data });
  return res.json(await presentStudent(updated, true));
}

// POST /students/:studentId/placement -- Body: { tier }
// One-time onboarding: the learner answers a short placement quiz and is given
// a starting tier. A student-code session may only set their own tier this way
// (parents can't, because tier is earned through gameplay), and tiers are
// clamped to 1-6. Placement is genuinely ONE-SHOT: `placementCompleted` is
// claimed atomically in the UPDATE below and any later attempt gets 409, so
// it cannot be replayed to re-place and jump tiers -- plus the route carries
// its own rate limit.
async function completePlacement(req, res) {
  const tier = Number(req.body.tier);
  if (!Number.isInteger(tier) || tier < 1 || tier > 6) {
    return res.status(400).json({ error: "tier must be a whole number between 1 and 6" });
  }
  const student = await prisma.student.findUnique({ where: { id: req.params.studentId } });
  if (!student) return res.status(404).json({ error: "Student not found" });
  // Only the learner's own student-code session may run placement.
  if (req.user.studentId !== student.id) {
    return res.status(403).json({ error: "Placement is only available to the learner themselves" });
  }
  if (student.placementCompleted) {
    return res.status(409).json({ error: "Placement has already been completed for this learner" });
  }
  // The WHERE clause claims the one-time slot, so two concurrent submissions
  // can never both succeed (only one UPDATE matches placementCompleted:false).
  const claimed = await prisma.student.updateMany({
    where: { id: student.id, placementCompleted: false },
    data: { currentTier: tier, placementCompleted: true },
  });
  if (claimed.count === 0) {
    return res.status(409).json({ error: "Placement has already been completed for this learner" });
  }
  const updated = await prisma.student.findUnique({ where: { id: student.id } });
  return res.json(await presentStudent(updated, true));
}

// DELETE /students/:studentId -- ownership was already checked by the
// requireOwnStudent route middleware (req.student).
async function deleteStudent(req, res) {
  // Student-code sessions are for learning only -- a learner must never be
  // able to delete their own (or a sibling's) profile.
  if (req.user.studentId)
    return res.status(403).json({ error: "Student profiles can only be deleted by a parent, teacher, or admin" });
  // Progress, badges, preferences, daily completions and practice sessions all
  // cascade from Student in the schema, so no hand-rolled child list here.
  await prisma.student.delete({ where: { id: req.student.id } });
  return res.status(204).end();
}

module.exports = { listStudents, createStudent, updateStudent, deleteStudent, completePlacement };
