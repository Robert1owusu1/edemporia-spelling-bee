const prisma = require("../db/prismaClient");

// GET /users/me -- the logged-in parent/teacher account itself, not a
// specific student profile (use GET /students for those). Only a whitelist of
// fields is ever serialised so token hashes and internal flags never leak.
async function getMe(req, res) {
  // A student-code session is scoped to that one learner: it must never see
  // the parent/teacher account row behind it (email, approval/verification
  // timestamps, etc.). Only the learner's own profile is returned.
  if (req.user.studentId) {
    const student = await prisma.student.findUnique({
      where: { id: req.user.studentId },
    });
    if (!student) return res.status(404).json({ error: "Student not found" });
    return res.json({
      id: student.accountId,
      studentId: student.id,
      name: student.name,
      avatarUrl: student.avatarUrl,
      role: "student",
    });
  }

  const account = await prisma.account.findUnique({ where: { id: req.user.id } });
  if (!account) return res.status(404).json({ error: "Account not found" });

  return res.json({
    id: account.id,
    email: account.email,
    name: account.name,
    avatarUrl: account.avatarUrl,
    role: account.role.toLowerCase(),
    approvedAt: account.approvedAt,
    createdAt: account.createdAt,
  });
}

// GET /users/me/preferences -- the logged-in account's cross-device settings.
async function getPreferences(req, res) {
  const preference = await prisma.accountPreference.findUnique({ where: { accountId: req.user.id } });
  return res.json(preference || { darkMode: false, dyslexiaFont: false, textSize: "normal" });
}

// PATCH /users/me/preferences
// Body: { darkMode, dyslexiaFont, textSize }
// Persists account-level settings that should follow a parent/teacher
// across devices (student-level settings live on StudentPreference).
async function updatePreferences(req, res) {
  const allowedText = ["normal", "large", "xlarge"];
  const data = {};
  if (typeof req.body.darkMode === "boolean") data.darkMode = req.body.darkMode;
  if (typeof req.body.dyslexiaFont === "boolean") data.dyslexiaFont = req.body.dyslexiaFont;
  if (allowedText.includes(req.body.textSize)) data.textSize = req.body.textSize;
  // Spelling is voice-only by design: there is no stored input-mode field and
  // a client asking for one is ignored (nothing to configure).
  const preference = await prisma.accountPreference.upsert({
    where: { accountId: req.user.id },
    create: { accountId: req.user.id, ...data },
    update: data,
  });
  return res.json(preference);
}

// PATCH /users/me/profile. Avatar images are stored as a small data URL so a
// parent, teacher, or student-code session can change their picture without a
// separate file-storage service.
async function updateProfile(req, res) {
  const name = typeof req.body.name === "string" ? req.body.name.trim().slice(0, 80) : undefined;
  const avatarUrl = typeof req.body.avatarUrl === "string" ? req.body.avatarUrl : undefined;
  // Only raster image data URLs are accepted -- SVG (data:image/svg+xml) is
  // excluded so stored avatars can never carry script-bearing markup.
  if (
    avatarUrl &&
    (!/^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[A-Za-z0-9+/=]+$/.test(avatarUrl) ||
      avatarUrl.length > 1_500_000)
  )
    return res.status(400).json({ error: "Choose a small image (PNG, JPG, GIF, WebP or AVIF) smaller than 1 MB" });
  if (req.user.studentId) {
    const student = await prisma.student.update({
      where: { id: req.user.studentId },
      data: { ...(name ? { name } : {}), ...(avatarUrl !== undefined ? { avatarUrl } : {}) },
    });
    return res.json({
      id: student.accountId,
      name: student.name,
      avatarUrl: student.avatarUrl,
      role: "student",
      studentId: student.id,
    });
  }
  const account = await prisma.account.update({
    where: { id: req.user.id },
    data: { ...(name ? { name } : {}), ...(avatarUrl !== undefined ? { avatarUrl } : {}) },
  });
  return res.json({
    id: account.id,
    email: account.email,
    name: account.name,
    avatarUrl: account.avatarUrl,
    role: account.role.toLowerCase(),
  });
}

module.exports = { getMe, getPreferences, updatePreferences, updateProfile };
