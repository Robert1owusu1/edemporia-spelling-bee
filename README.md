# Spelling Bee

Spelling Bee is a simple, kid-friendly, voice-first spelling-practice platform for a single school. It is built with a React frontend and an Express API backed by PostgreSQL. Learners speak words and letters aloud (`voice` is the only input mode — no typing), progress through a six-tier word trail, complete a daily challenge, protect streaks and hearts, earn points and badges, and climb the class leaderboard. Parent, teacher and admin accounts manage learner profiles through a supervisor dashboard and a school admin console.

## Architecture

- `src/` — React 19 + Vite + Tailwind frontend. All application data is requested from the API.
- `backend/` — Express API with Prisma, JWT auth, rate limiting and Postgres.
- `backend/prisma/` — PostgreSQL schema and migrations.

## Features

- **Six-tiered word trail** — words from Tier 1 (foundational) to Tier 6 (Bee Champion), each with a definition and example sentence, progressing through everyday grade-level vocabulary.
- **Voice-first practice** — learners spell by speaking letters aloud into the microphone; hearts, streaks, combos and points update live. Keyboard typing is not used.
- **Daily challenge** — one deterministic word per day (pure UTC date key, same word for the whole school); a learner completes it at most once — a second attempt returns 409 — and hearts never block it.
- **Badges** — streak / points / rounds rules, evaluated on every round and daily challenge.
- **Gamification** — honeycomb badges, streak flames, heart lives, victory star-bursts, XP and a class leaderboard. Two separate counters: `streak` is the per-round combo (it resets on a wrong word, capped at 50) and `dailyStreak` is consecutive practice days.
- **Hearts** — 0–5 lives, default 5, one regenerates every 15 minutes; running out blocks practice rounds with HTTP 423 until the next heart returns.
- **Supervisor & admin dashboards** — learner monitoring, student ID code login, classroom management, and a full word-bank admin with dictionary lookup and CSV import.
- **Accessibility settings** — dark mode, text size (applies to the whole UI via the document root), dyslexia-friendly reading mode, playback voice selection, persisted per account and per learner.
- **Placement quiz** — a quick fun onboarding round that suggests a starting tier (voice-only). It is genuinely one-time: once completed, later attempts return 409.

## Tech stack

React 19, Vite 6, TypeScript, Tailwind CSS 4, React Router 7, Motion, Recharts, lucide-react · Express 4, Prisma 7, PostgreSQL, JWT, bcryptjs, CORS.

## Local setup

1. Install dependencies in both projects:

   ```bash
   npm install
   npm --prefix backend install
   ```

2. Create the environment files:

   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

3. Fill in `backend/.env` (every entry is `KEY=value`; the file documents which are which):

   - **Required:** `DATABASE_URL` (any reachable PostgreSQL database) and `JWT_SECRET` — generate a long random one, e.g. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. The server refuses to start with a short or well-known secret.
   - **Optional, local defaults are fine:** `PORT`, `NODE_ENV`, `DATABASE_SSL_REJECT_UNAUTHORIZED`, `FRONTEND_URL`.
   - **Optional, production:** `TRUST_PROXY` (proxy hop count), `PLATFORM_ADMIN_EMAIL` + `PLATFORM_ADMIN_PASSWORD` (12+ chars — bootstraps the first administrator), `REDIS_URL` (shared rate-limit budgets across instances).
   - **Optional, tests:** `API_BASE_URL` for the end-to-end suite; it also needs `PLATFORM_ADMIN_EMAIL`/`PLATFORM_ADMIN_PASSWORD` to be set.

   Set `VITE_API_BASE_URL` in `.env` if the API is not running at `http://localhost:4000`.

   There is **no email delivery anywhere**: no verification email, no reset link. Accounts are created and approved by an administrator, and a forgotten password is requested in-app (the sign-in screen's "Forgot password?") and reset by that administrator to `DEFAULT_RESET_PASSWORD` (defaults to `SpellingBee123`) from the admin portal — the owner then picks their own password in Settings.

4. Generate the Prisma client, apply migrations, and seed starter content:

   ```bash
   npm run db:generate
   npm --prefix backend run prisma:deploy
   npm --prefix backend run seed
   ```

   > Prisma resolves `prisma.config.ts` and the schema from the working
   > directory, so these are run through npm scripts (which execute inside
   > `backend/`) rather than a bare `npx prisma ...` from the repository root.
   > Because the schema is shipped as fresh migrations (`init`, `audit_fixes`
   > and `remove_email_verification`), an existing development database should
   > be reset with `cd backend && npx prisma migrate reset` before first use.

5. Run the API and frontend in separate terminals:

   ```bash
   npm run dev:backend
   npm run dev
   ```

The API health check is available at `http://localhost:4000/health`.

## Demo access

The seeded demo account powers the "Quick Demo" button on the login page:

- **Parent account:** `demo@spellingbee.local` / `demo123` (development only)
- **Learner code:** `ST-10001`

Demo credentials are development-only end to end: the account is never seeded when `NODE_ENV=production`, and production builds of the frontend do not auto-login — the Quick Demo button only works in development builds (`import.meta.env.DEV`).

## Account flows

- Self-registration is closed: `POST /auth/signup` always answers **403** (`registrationClosed`). An administrator creates parent and teacher accounts from the admin console (each with a min-8-character password) and approves them before they can sign in. Logged-in parents and teachers then create learner profiles.
- Every student receives a unique `ST-xxxxx` login code; student-code sign-in has access only to that student profile.
- There is no email verification and no emailed reset link. Password recovery is fully in-app: "Forgot password?" on the sign-in screen flags the account, the request appears as a badge and list in the admin portal, and the administrator resets it to the default password in one click; the owner signs in with it and changes it in Settings (changing a password revokes every other session). Student sessions have no password of their own and cannot change one.
- Teachers and admins manage the shared word bank at `/admin`.

## Accessibility

The UI ships with the settings a classroom actually needs, persisted per account and per learner:

- **Dark mode** and **dyslexia-friendly reading mode**, toggled on the document root.
- **Text size** (normal → large → xlarge) applied to `<html>` via `data-text-size`, so the whole interface scales, with the selector in Settings.
- **Playback voice selection** for the text-to-speech prompts.
- **Voice-only spelling** — no keyboard input is required to play; the in-game help text and Settings both state that learners spell by speaking letters aloud.

## Production deployment

1. Build the frontend so the backend can serve it:

   ```bash
   npm run build
   ```

2. In `backend/.env` set `NODE_ENV=production`, `FRONTEND_URL`, `TRUST_PROXY` (proxy hop count), `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD`.

3. Apply migrations and seed on the production database:

   ```bash
   npm --prefix backend run prisma:deploy
   npm --prefix backend run seed
   ```

4. Start the server:

   ```bash
   npm --prefix backend start
   ```

The server serves the built `dist/` frontend and the API on the same host, applies security headers (CSP, frame-deny, nosniff, referrer and permissions policies), limits request bodies, rate-limits the auth routes (per IP) and every gameplay, roster and word-bank write route (429 responses carry `Retry-After`), rejects weak `JWT_SECRET`/`TRUST_PROXY` values at startup, and shuts down gracefully on `SIGTERM`/`SIGINT` (fatal handler included).

## Security notes

The full review — findings, fixes and file:line citations — lives in [SECURITY_AUDIT.md](./SECURITY_AUDIT.md). The short version:

- **JWT in `localStorage`** is a deliberate trade-off: no cookie/CSRF surface and sessions survive reloads, at the cost of the token being readable by any script that gets XSS. The token itself is stateless; **revocation is server-side** through the account's `tokenVersion`, re-checked against the database on every request (an administrator's password reset, the owner's own password change, and "log out everywhere" all bump it, killing every outstanding token immediately).
- **Rate limits and lockouts:** the login/registration/password-request routes are limited per IP (10 password logins / 15 min) and gameplay, roster and word-bank routes per session; rate-limit 429s carry `Retry-After`. Ten failed passwords freeze that **account** for 15 minutes regardless of source IP; five wrong learner codes freeze the IP.
- **Server-side re-grading:** rounds and the daily challenge are graded from the learner's spelling against the database word bank — a client-supplied `correct` flag is ignored — with economy ceilings applied inside the locking transaction.
- **Admin-only account creation:** self-registration is closed (403), an administrator approves accounts, and every learner-scoped route runs through `requireOwnStudent`/role middleware.
- **CSV export hygiene:** the roster export escapes quotes and prefixes leading `=`, `+`, `-`, `@` so spreadsheets treat learner data as text instead of executing formulas.
- **Deployment:** terminate TLS in front of the API, set `TRUST_PROXY` so per-IP limits see the real client address, and rotate database credentials if they were ever shared.

## Verification

```bash
npm run lint                                   # ESLint
npm run typecheck                              # tsc --noEmit
npm test                                       # Vitest unit tests
npm run build                                  # production frontend build
npm run format:check                           # Prettier, check only
node --check backend/server.js                 # backend syntax check
npx --prefix backend prisma validate --schema backend/prisma/schema.prisma
npm run test:e2e                               # end-to-end API scenarios
```

Everything except `test:e2e` is offline. The end-to-end suite (44 scenarios, `backend/scripts/e2eTest.js`) needs:

- a **reachable PostgreSQL database** with migrations applied and the starter content seeded (`npm --prefix backend run prisma:deploy`, then `npm --prefix backend run seed`) — the same is true for migrations themselves, which cannot run without a live database;
- a **running backend** (`npm run dev:backend`) plus `DATABASE_URL`, `JWT_SECRET`, `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD` in `backend/.env` — the suite signs in as the bootstrap administrator;
- a little patience between runs: auth routes are rate-limited **per IP** (10 password logins per 15 minutes), so back-to-back runs from the same address can legitimately be answered with **429**. Wait out the `Retry-After` header, or restart the backend (the default store is in-memory) before re-running.

The suite creates its own accounts, learners, classrooms and words and removes them again afterwards, so it is safe to re-run against a development database once the rate-limit window has passed. Prisma subcommands resolve `prisma.config.ts` from the working directory, which is why they are run through npm scripts (inside `backend/`) or with an explicit `--schema`.

Never commit `.env` files. Rotate database credentials immediately if they have ever been copied into source control or shared outside your deployment environment.
