const prisma = require("../db/prismaClient");

async function getPreferences(req, res) {
  const preference = await prisma.studentPreference.findUnique({ where: { studentId: req.student.id } });
  return res.json(preference || { darkMode: false, textSize: "normal" });
}
async function updatePreferences(req, res) {
  const allowedText = ["normal", "large", "xlarge"];
  const data = {};
  if (typeof req.body.darkMode === "boolean") data.darkMode = req.body.darkMode;
  if (allowedText.includes(req.body.textSize)) data.textSize = req.body.textSize;
  // Spelling is voice-only by design: there is no stored input-mode field and a
  // client asking for one is ignored (nothing to configure).
  const preference = await prisma.studentPreference.upsert({
    where: { studentId: req.student.id },
    create: { studentId: req.student.id, ...data },
    update: data,
  });
  return res.json(preference);
}
module.exports = { getPreferences, updatePreferences };
