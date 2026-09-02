const prisma = require("../db/prismaClient");
const crypto = require("crypto");
const { presentStudent } = require("../services/studentPresenter");

const AVATAR_COLORS = ["#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];

// ST-XXXXXXX codes are the learner's login credential, so they come from a CSPRNG
// (crypto.randomInt) rather than Math.random, and the 7-digit space is large
// enough that guesses don't find a code before the per-IP lockout kicks in.
function createStudentCode() { return `ST-${crypto.randomInt(1000000, 10000000)}`; }

// Matches a classroom by name so a learner registers into the right class and
// becomes visible to that class's teacher.
async function findClassroomByName(name) {
  return prisma.classroom.findFirst({ where: { name }, orderBy: { createdAt: "asc" } });
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
  return res.json(await Promise.all(students.map((student) => presentStudent(student, true))));
}

// POST /students -- Body: { name, age, className }
// Called from the app's "add a child" flow, and once during onboarding
// for the first profile.
async function createStudent(req, res) {
  const { name, age, className, currentTier } = req.body;
  const parsedAge = Number(age);
  if (!name?.trim() || !className?.trim() || !Number.isInteger(parsedAge) || parsedAge < 3 || parsedAge > 120) return res.status(400).json({ error: "name, a valid age, and className are required" });
  if (req.user.studentId) return res.status(403).json({ error: "Student sessions cannot create profiles" });
  const count = await prisma.student.count({ where: { accountId: req.user.id } });

  const requestedClass = className.trim();
  // A teacher may only register learners in the class the school assigned to
  // them. A parent can enrol a child by entering the class name supplied by
  // the teacher, which makes the learner visible to that class's teacher.
  let classroom = await findClassroomByName(requestedClass);
  if (req.user.role === "TEACHER") {
    const assigned = await prisma.classroom.findFirst({ where: { teacherId: req.user.id, name: requestedClass } });
    if (!assigned) {
      const classes = await prisma.classroom.findMany({ where: { teacherId: req.user.id }, select: { name: true } });
      const classList = classes.map((item) => item.name).join(", ") || "none assigned yet";
      return res.status(403).json({ error: `You can only register learners in your assigned class (${classList}). Ask the school administrator if this class is yours.` });
    }
    classroom = assigned;
  }

  // ST-XXXXX codes are random; retry a couple of times if the (rare)
  // collision with an existing student happens.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const student = await prisma.student.create({
        data: { accountId: req.user.id, studentCode: createStudentCode(), name: name.trim(), age: parsedAge, className: requestedClass, classroomId: classroom?.id, currentTier: Math.min(6, Math.max(1, Number(currentTier) || 1)), avatarColor: AVATAR_COLORS[count % AVATAR_COLORS.length] },
      });
      return res.status(201).json(await presentStudent(student, true));
    } catch (error) {
      if (error.code !== "P2002") throw error;
    }
  }
  return res.status(500).json({ error: "Could not generate a unique student code. Please try again." });
}

async function updateStudent(req, res) {
  const student = await prisma.student.findUnique({ where: { id: req.params.studentId } });
  const permitted = student && (req.user.role === "ADMIN" || req.user.studentId === student.id || student.accountId === req.user.id || (req.user.role === "TEACHER" && student.classroomId && (await prisma.classroom.count({ where: { id: student.classroomId, teacherId: req.user.id } })) > 0));
  if (!permitted) return res.status(403).json({ error: "Not authorized for this student profile" });
  // Student-code sessions are for learning only. Parents, teachers assigned
  // to the class, and admins manage profile details.
  if (req.user.studentId) return res.status(403).json({ error: "Student profiles can only be edited by a parent, teacher, or admin" });
  const data = {};
  if (typeof req.body.name === "string" && req.body.name.trim().length >= 2) data.name = req.body.name.trim().slice(0, 80);
  if (req.body.age !== undefined && Number.isInteger(Number(req.body.age)) && Number(req.body.age) >= 3 && Number(req.body.age) <= 120) data.age = Number(req.body.age);
  if (typeof req.body.className === "string" && req.body.className.trim()) {
    data.className = req.body.className.trim();
    let classroom = await findClassroomByName(data.className);
    // A teacher may only move a learner between their OWN classes -- a class
    // name that belongs to another teacher (or another school) unlinks the
    // student from any classroom instead of silently transferring them.
    if (req.user.role === "TEACHER" && classroom) {
      const mine = await prisma.classroom.findFirst({ where: { id: classroom.id, teacherId: req.user.id } });
      classroom = mine || null;
    }
    data.classroomId = classroom?.id || null;
  }
  // Tier and hearts are gameplay state, not profile details. Only teachers,
  // org admins, and platform admins may adjust them (the supervisor portal);
  // a parent must never set them directly, because tier progression and hearts
  // are earned through gameplay.
  const mayAdjustGameplay = ["TEACHER", "ADMIN"].includes(req.user.role);
  if (req.body.currentTier !== undefined) {
    if (!mayAdjustGameplay) return res.status(403).json({ error: "A learner's tier is earned through gameplay and can only be adjusted by a teacher or admin" });
    const tier = Number(req.body.currentTier);
    if (!Number.isInteger(tier)) return res.status(400).json({ error: "currentTier must be a whole number" });
    data.currentTier = Math.min(6, Math.max(1, tier));
  }
  if (req.body.hearts !== undefined) {
    if (!mayAdjustGameplay) return res.status(403).json({ error: "Hearts are earned through gameplay and can only be refilled by a teacher or admin" });
    const hearts = Number(req.body.hearts);
    if (!Number.isInteger(hearts)) return res.status(400).json({ error: "hearts must be a whole number" });
    data.hearts = Math.max(0, Math.min(5, hearts));
  }
  const updated = await prisma.student.update({ where: { id: student.id }, data });
  return res.json(await presentStudent(updated, true));
}

// POST /students/:studentId/placement -- Body: { tier }
// One-time onboarding: the learner answers a short placement quiz and is given
// a starting tier. A student-code session may only set their own tier this way
// (parents can't, because tier is earned through gameplay), and only upward is
// blocked below by clamping to 1-6. Once gameplay starts the tier is advanced
// by the round controller, so this cannot be used to skip ahead repeatedly.
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
  const updated = await prisma.student.update({ where: { id: student.id }, data: { currentTier: tier } });
  return res.json(await presentStudent(updated, true));
}

async function deleteStudent(req, res) {
  const student = await prisma.student.findUnique({ where: { id: req.params.studentId } });
  // Student-code sessions are for learning only -- a learner must never be
  // able to delete their own (or a sibling's) profile.
  if (req.user.studentId) return res.status(403).json({ error: "Student profiles can only be deleted by a parent, teacher, or admin" });
  const permitted = student && (req.user.role === "ADMIN" || student.accountId === req.user.id || (req.user.role === "TEACHER" && student.classroomId && (await prisma.classroom.count({ where: { id: student.classroomId, teacherId: req.user.id } })) > 0));
  if (!permitted) return res.status(403).json({ error: "Not authorized to delete this student profile" });
  await prisma.$transaction(async (tx) => {
    await tx.progress.deleteMany({ where: { studentId: student.id } });
    await tx.studentBadge.deleteMany({ where: { studentId: student.id } });
    await tx.studentPreference.deleteMany({ where: { studentId: student.id } });
    await tx.dailyChallengeCompletion.deleteMany({ where: { studentId: student.id } });
    await tx.practiceSession.deleteMany({ where: { studentId: student.id } });
    await tx.student.delete({ where: { id: student.id } });
  });
  return res.status(204).end();
}

module.exports = { listStudents, createStudent, updateStudent, deleteStudent, completePlacement };
