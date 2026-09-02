const bcrypt = require("bcryptjs");
const prisma = require("../db/prismaClient");

// The first platform administrator is bootstrapped only from protected server
// environment variables. It is never creatable through the public sign-up API.
async function bootstrapPlatformAdmin() {
  const email = String(process.env.PLATFORM_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.PLATFORM_ADMIN_PASSWORD || "");
  if (!email && !password) return;
  if (!email || password.length < 12) throw new Error("PLATFORM_ADMIN_EMAIL and a 12+ character PLATFORM_ADMIN_PASSWORD are required together");
  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    // Repair any drift from earlier bootstraps: force ADMIN role, mark
    // approved/verified, and backfill a password hash if one was never set.
    await prisma.account.update({
      where: { id: existing.id },
      data: {
        role: "ADMIN",
        approvedAt: new Date(),
        emailVerifiedAt: existing.emailVerifiedAt || new Date(),
        ...(existing.passwordHash ? {} : { passwordHash: await bcrypt.hash(password, 12) }),
      },
    });
    return;
  }
  await prisma.account.create({ data: { email, name: "Platform Administrator", passwordHash: await bcrypt.hash(password, 12), role: "ADMIN", approvedAt: new Date(), emailVerifiedAt: new Date() } });
}
module.exports = { bootstrapPlatformAdmin };
