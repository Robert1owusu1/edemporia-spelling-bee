require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const compression = require("compression");
const cors = require("cors");
const routes = require("./src/routes");
const prisma = require("./src/db/prismaClient");
const { bootstrapPlatformAdmin } = require("./src/services/platformAdminBootstrap");

// Guard against a weak or default JWT secret: anyone who knows it can forge a
// session for any account (including ADMIN). Known-in-the-repo values and
// short/obvious secrets abort startup so the mistake is caught immediately.
const WEAK_JWT_SECRETS = new Set([
  "roberto100$@gh.",
  "roberto100$@gh.com@%#Amanpeh.Joofella",
  "change-me",
  "secret",
  "jwt-secret",
  "your-secret-key",
  "changeme",
]);
function validateJwtSecret(secret) {
  if (!secret) return "JWT_SECRET is not set.";
  if (WEAK_JWT_SECRETS.has(secret)) return "JWT_SECRET is a known weak/default value.";
  if (secret.length < 32) return "JWT_SECRET is too short (use at least 32 random characters).";
  if (!/[A-Za-z]/.test(secret) || !/\d/.test(secret)) return "JWT_SECRET must contain both letters and digits.";
  // Reject secrets derived from the DB password (or other obvious patterns):
  // a weak value like "roberto100$@gh.*" passes the length check but is
  // trivially guessable from values sitting in the same .env file.
  if (/roberto/i.test(secret)) return "JWT_SECRET looks like it was derived from a known value. Generate a random one.";
  return null;
}
const jwtSecretError = validateJwtSecret(process.env.JWT_SECRET);
if (jwtSecretError) {
  console.error(`[SECURITY] Cannot start: ${jwtSecretError}`);
  console.error(
    "Generate a strong secret, e.g.: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"",
  );
  console.error("Then set it in backend/.env (JWT_SECRET=...) and restart.");
  process.exit(1);
}

const app = express();
const configuredOrigins = (
  process.env.FRONTEND_URL || "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Development only: accept localhost and private/LAN addresses on any port so
// the phone can reach a dev machine (e.g. http://10.244.162.171:3000), plus
// VS Code Dev Tunnel domains so the app also works through a public tunnel
// (https://<id>-3000.euw.devtunnels.ms). In production only the explicit
// FRONTEND_URL allowlist above is accepted.
function isAllowedDevOrigin(origin) {
  if (process.env.NODE_ENV === "production") return false;
  let host;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host.endsWith(".local")) return true;
  if (host.endsWith(".devtunnels.ms")) return true;
  const parts = host.split(".");
  if (parts.length !== 4 || !parts.every((part) => /^\d{1,3}$/.test(part))) return false;
  const [a, b] = parts.map(Number);
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

// Behind a reverse proxy/load balancer set TRUST_PROXY to the number of hops
// (e.g. 1). This makes req.ip (used by the rate limiter) correct. A malformed
// value must abort startup rather than silently falling back to trusting every
// proxy (which would let clients spoof their IP past the rate limiter).
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  if (!Number.isInteger(hops) || hops < 1) {
    console.error(
      `[SECURITY] Cannot start: TRUST_PROXY must be a positive integer (got "${process.env.TRUST_PROXY}"). Set it to the number of proxy hops in front of this server (e.g. 1), or remove the variable when running directly exposed.`,
    );
    process.exit(1);
  }
  app.set("trust proxy", hops);
}

app.use((req, res, next) => {
  // Same-origin requests (the page loaded from this very host, e.g. a
  // single-host production deployment on a LAN) are always fine.
  const requestOrigin = `${req.protocol}://${req.get("host")}`;
  cors({
    origin(origin, callback) {
      // Non-browser clients do not send an Origin header.
      if (!origin || origin === requestOrigin || configuredOrigins.includes(origin) || isAllowedDevOrigin(origin))
        return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })(req, res, next);
});

// Baseline security headers without extra dependencies.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  // Strict Content Security Policy. The frontend is a Vite build with only
  // local assets; inline styles (React style attributes) are the only inline
  // exception. The Google Fonts stylesheet/font files are a fixed, well-known
  // CDN (loaded by src/index.css) and are allow-listed explicitly. 'self'
  // covers the API because the SPA is served by this same host in production.
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self' data: https://fonts.gstatic.com; object-src 'none'; frame-src 'self' blob:; base-uri 'self'",
  );
  next();
});

// Gzip-compress API JSON and the built frontend so phones on slow links
// download far fewer bytes.
app.use(compression());

// Request logging (skip in tests/silent mode). Logs req.path (no query
// string) so an uploads link carrying a ?token= never ends up in the logs.
if (process.env.NODE_ENV !== "test") {
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => {
      console.log(
        `${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${Date.now() - startedAt}ms`,
      );
    });
    next();
  });
}

app.use(express.json({ limit: "2mb" }));

// The JSON API is per-session and must always be read fresh: without an
// explicit no-store, a response with an ETag and no freshness information can
// be replayed from the browser cache and hand the client stale state (it did:
// a cached /admin/accounts body resurrected an already-cleared password-reset
// badge). Static assets below set their own Cache-Control and overwrite this.
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Health check -- doesn't touch the DB, so it works even before
// PostgreSQL/Prisma are fully set up. Good first thing to hit.
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/", routes);

// Serve the built frontend from the repository's dist/ folder when it exists,
// so a single host can run the whole product in production. API routes above
// take precedence; anything else falls back to the SPA shell.
const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (!req.accepts("html")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Distinguish "the database cannot be reached right now" from real bugs.
// Transient pooler/DNS blips (EAI_AGAIN, refused connections, connection and
// pool-wait timeouts) surface as a clean 503 -- "try again in a moment" --
// instead of the scary generic 500. Nothing here is a bug: the pool
// self-heals once connectivity returns.
function isDatabaseConnectionError(err) {
  if (!err) return false;
  const code = String(err.code || "");
  if (
    [
      "P1001",
      "P1002",
      "P1017",
      "ECONNREFUSED",
      "ENOTFOUND",
      "EAI_AGAIN",
      "ETIMEDOUT",
      "ECONNRESET",
      "EPIPE",
      "57P01",
      "57P02",
      "53300",
      "08006",
      "08001",
      "08004",
    ].includes(code)
  )
    return true;
  // pg-pool uses a few distinct wordings depending on whether the pool wait or
  // the connection itself timed out; the socket-level detail may sit on the
  // cause chain instead of the top error, so flatten it.
  const combined = [err, err.cause, err.cause && err.cause.cause]
    .filter(Boolean)
    .map((e) => String(e.message || ""))
    .join(" ");
  return [
    "timeout exceeded when trying to connect",
    "connection terminated due to connection timeout",
    "connection terminated unexpectedly",
    "connection refused",
    "could not connect to server",
    "no connection to server",
    "getaddrinfo",
    "terminating connection",
  ].some((needle) => combined.toLowerCase().includes(needle));
}

// Express identifies error middleware by arity, so `next` must stay even
// though this handler never delegates onward.
app.use((err, req, res, _next) => {
  console.error(err);
  if (err.message === "Origin is not allowed by CORS") {
    return res.status(403).json({ error: "Origin is not allowed by CORS" });
  }
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large" });
  }
  if (isDatabaseConnectionError(err)) {
    return res.status(503).json({ error: "The database is temporarily unavailable. Please try again in a moment." });
  }
  const payload = { error: "Unexpected server error" };
  res.status(500).json(payload);
});

const PORT = Number(process.env.PORT) || 4000;

// Start serving immediately. The platform-admin bootstrap below runs in the
// background so a transient DNS or network blip at startup cannot crash the
// whole API (e.g. EAI_AGAIN while resolving the database hostname).
const server = app.listen(PORT, () => console.log(`Spelling bee backend listening on port ${PORT}`));
server.on("error", (error) => {
  console.error(`Unable to start the backend on port ${PORT}:`, error.message);
  process.exit(1);
});

// Track open sockets so shutdown can close idle keep-alive connections;
// otherwise server.close() waits forever for a pooled connection nobody is
// actively using and the process only exits via the hard timer below.
const openSockets = new Set();
server.on("connection", (socket) => {
  openSockets.add(socket);
  socket.on("close", () => openSockets.delete(socket));
});

const shutdown = (signal, exitCode = 0) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(exitCode);
  });
  // Give in-flight requests a moment to finish, then close lingering
  // keep-alive sockets so server.close() can complete.
  setTimeout(() => {
    for (const socket of openSockets) socket.destroy();
  }, 3_000).unref();
  setTimeout(() => process.exit(exitCode === 0 ? 1 : exitCode), 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// An unhandled rejection/exception means the process state is no longer
// trustworthy: log it loudly (with a stack) and exit non-zero after a
// graceful shutdown instead of limping on with unknown corruption. Express
// request errors are already handled by the error middleware above -- these
// handlers catch what slips outside it (background timers, stray promises).
process.on("unhandledRejection", (reason) => {
  console.error(
    "[FATAL] Unhandled promise rejection:",
    reason instanceof Error ? reason.stack || reason.message : reason,
  );
  shutdown("unhandledRejection", 1);
});
process.on("uncaughtException", (error) => {
  console.error("[FATAL] Uncaught exception:", error.stack || error.message);
  shutdown("uncaughtException", 1);
});

let bootstrapAttempts = 0;
async function runAdminBootstrap() {
  try {
    await bootstrapPlatformAdmin();
    console.log("Platform administrator bootstrap complete.");
  } catch (error) {
    // Log the first failure and then only every 6th retry (~3 minutes): a
    // transient database blip at startup shouldn't spam the log forever.
    bootstrapAttempts += 1;
    if (bootstrapAttempts === 1 || bootstrapAttempts % 6 === 0) {
      console.error(`Platform administrator bootstrap failed (retrying in 30s): ${error.message}`);
    }
    setTimeout(runAdminBootstrap, 30_000).unref();
  }
}
void runAdminBootstrap();
