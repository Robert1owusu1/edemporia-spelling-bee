const prisma = require("../db/prismaClient");

function audit(accountId, action, target, metadata) {
  return prisma.auditLog
    .create({ data: { accountId, action, target, metadata } })
    .catch((error) => console.error("Audit log failed", error));
}

module.exports = { audit };
