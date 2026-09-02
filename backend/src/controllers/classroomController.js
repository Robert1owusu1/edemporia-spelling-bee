const prisma = require("../db/prismaClient");
const { audit } = require("../services/auditService");

async function listClassrooms(req, res) {
  const where = req.user.role === "ADMIN" ? {} : { teacherId: req.user.id };
  const classrooms = await prisma.classroom.findMany({ where, include: { teacher: { select: { name: true, email: true } }, _count: { select: { students: true } } }, orderBy: { createdAt: "desc" } });
  return res.json(classrooms.map(({ _count, ...classroom }) => ({ ...classroom, studentCount: _count.students })));
}
async function createClassroom(req, res) {
  const name = String(req.body.name || "").trim(); const grade = String(req.body.grade || "").trim() || null;
  if (!name) return res.status(400).json({ error: "Classroom name is required" });
  // Classrooms are provisioned by the school administrator. An optional
  // teacherId assigns a teacher to the class.
  const teacherId = req.user.role === "ADMIN" && req.body.teacherId ? String(req.body.teacherId) : req.user.id;
  if (req.user.role === "ADMIN" && req.body.teacherId) {
    const teacher = await prisma.account.findFirst({ where: { id: teacherId, role: "TEACHER" } });
    if (!teacher) return res.status(400).json({ error: "Assign an existing teacher account to this classroom" });
  }
  const classroom = await prisma.classroom.create({ data: { name, grade, teacherId } });
  await audit(req.user.id, "classroom.created", classroom.id, { name, teacherId });
  return res.status(201).json({ ...classroom, studentCount: 0 });
}

async function updateClassroom(req, res) {
  const existing = await prisma.classroom.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Classroom not found" });
  if (req.user.role !== "ADMIN" && existing.teacherId !== req.user.id) return res.status(403).json({ error: "Not authorized to edit this classroom" });

  const data = {};
  if (typeof req.body.name === "string" && req.body.name.trim()) data.name = req.body.name.trim();
  if (typeof req.body.grade === "string") data.grade = req.body.grade.trim() || null;
  if (req.user.role === "ADMIN" && req.body.teacherId !== undefined) {
    if (!req.body.teacherId) data.teacherId = existing.teacherId;
    else {
      const teacher = await prisma.account.findFirst({ where: { id: req.body.teacherId, role: "TEACHER" } });
      if (!teacher) return res.status(400).json({ error: "Assign an existing teacher account to this classroom" });
      data.teacherId = teacher.id;
    }
  }
  if (!Object.keys(data).length) return res.status(400).json({ error: "No valid fields to update" });

  const classroom = await prisma.classroom.update({ where: { id: existing.id }, data });
  await audit(req.user.id, "classroom.updated", classroom.id, data);
  return res.json(classroom);
}
async function assignStudent(req, res) {
  const classroom = await prisma.classroom.findFirst({ where: req.user.role === "ADMIN" ? { id: req.params.id } : { id: req.params.id, teacherId: req.user.id } });
  const student = await prisma.student.findUnique({ where: { id: req.body.studentId } });
  if (!classroom) return res.status(404).json({ error: "Classroom not found" });
  if (!student) return res.status(404).json({ error: "Student not found" });
  if (req.user.role !== "ADMIN" && student.accountId !== req.user.id && student.classroomId !== classroom.id) return res.status(403).json({ error: "A parent must enrol this learner using the classroom name" });
  const updated = await prisma.student.update({ where: { id: student.id }, data: { classroomId: classroom.id, className: classroom.grade ? `${classroom.name} · ${classroom.grade}` : classroom.name } });
  await audit(req.user.id, "classroom.student_assigned", classroom.id, { studentId: student.id });
  return res.json(updated);
}

module.exports = { listClassrooms, createClassroom, updateClassroom, assignStudent };
