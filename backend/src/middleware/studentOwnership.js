const prisma = require("../db/prismaClient");

// Every gameplay endpoint (rounds, hints, daily challenge, preferences,
// badges, practice sessions...) acts on a
// specific child's data, so each one needs to confirm the studentId in
// the request actually belongs to the logged-in account -- otherwise
// one parent's token could submit scores for another family's child.
// Reads studentId from the body first (POST endpoints), falling back to
// route params (GET/PATCH by :studentId) and query strings (GET reads).
async function requireOwnStudent(req, res, next) {
  const studentId = req.body.studentId || req.params.studentId || req.query.studentId || req.user.studentId;
  if (!studentId) {
    return res.status(400).json({ error: "studentId is required" });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  const teacherOwnsClass =
    student?.classroomId && req.user.role === "TEACHER"
      ? (await prisma.classroom.count({ where: { id: student.classroomId, teacherId: req.user.id } })) > 0
      : false;
  // A student-code session may ONLY act on its own profile. Its req.user.id is
  // the parent/teacher account behind the learner, so the `accountId` check
  // must be skipped for student sessions -- otherwise a learner could submit
  // rounds or read progress as a sibling sharing the same account.
  const ownsAccount = !req.user.studentId && student?.accountId === req.user.id;
  if (
    !student ||
    !(req.user.role === "ADMIN" || req.user.studentId === student.id || ownsAccount || teacherOwnsClass)
  ) {
    return res.status(403).json({ error: "Not authorized for this student profile" });
  }

  req.student = student;
  next();
}

module.exports = requireOwnStudent;
