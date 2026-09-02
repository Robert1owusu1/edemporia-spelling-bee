const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

// Single shared instance -- avoids exhausting DB connections when
// nodemon reloads the server during development.
// Keep TLS verification on unless a local/self-signed database explicitly
// opts out. Never set this flag to false for a production database.
const ssl = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false"
  ? { rejectUnauthorized: false }
  : undefined;

// Explicit pool sizing + timeouts. Without connectionTimeoutMillis a hung DNS
// lookup (EAI_AGAIN, an unreachable pooler host, etc.) can block a request for
// tens of seconds; failing fast lets the auth middleware return 503 and keeps
// the app usable while the database recovers. statement_timeout / query_timeout
// guarantee no single query can hold a pooled connection forever.
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl,
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 30_000,
  query_timeout: 30_000,
};

const adapter = new PrismaPg(poolConfig);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
