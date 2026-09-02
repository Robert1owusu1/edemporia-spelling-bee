# Spelling Bee

Spelling Bee is a simple, kid-friendly, voice-first spelling-practice platform for a single school. It is built with a React frontend and an Express API backed by PostgreSQL. Learners speak words and letters aloud (`voice` is the only input mode — no typing), progress through a six-tier word trail, complete a daily challenge, protect streaks and hearts, earn points and badges, and climb the class leaderboard. Parent, teacher and admin accounts manage learner profiles through a supervisor dashboard and a school admin console.

## Architecture

- `src/` — React 19 + Vite + Tailwind frontend. All application data is requested from the API.
- `backend/` — Express API with Prisma, JWT auth, rate limiting and Postgres.
- `backend/prisma/` — PostgreSQL schema and migrations.

## Features

- **Six-tiered word trail** — words from Tier 1 (foundational) to Tier 6 (Bee Champion), each with a definition and example sentence, progressing through everyday grade-level vocabulary.
- **Voice-first practice** — learners spell by speaking letters aloud into the microphone; hearts, streaks, combos and points update live. Keyboard typing is not used.
- **Daily challenge** — one deterministic word per day; a learner can only complete it once, and the UI reflects that.
- **Badges** — streak / points / rounds rules, evaluated on every round and daily challenge.
- **Gamification** — honeycomb badges, streak flames, heart lives, victory star-bursts, XP and a class leaderboard.
- **Supervisor & admin dashboards** — learner monitoring, student ID code login, classroom management, and a full word-bank admin with dictionary lookup and CSV import.
- **Accessibility settings** — dark mode, text size, dyslexia-friendly reading mode, playback voice selection, persisted per account and per learner.
- **Placement quiz** — a quick fun onboarding round that suggests a starting tier (voice-only).

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

3. Set a PostgreSQL connection string and a long random `JWT_SECRET` in `backend/.env`. Set `VITE_API_BASE_URL` in `.env` if the API is not running at `http://localhost:4000`.

   To send production verification and password-reset emails, also set `RESEND_API_KEY`, `EMAIL_FROM`, and `APP_URL`. Without a mail provider, development responses include the secure link for local testing only.

4. Generate the Prisma client, apply migrations, and seed starter content:

   ```bash
   npm run db:generate
   npx --prefix backend prisma migrate deploy
   npm --prefix backend run seed
   ```

   > Because the schema was rewritten as a single fresh `init` migration, an
   > existing development database should be reset with
   > `npx --prefix backend prisma migrate reset` before first use.

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

The demo account is never seeded in production (`NODE_ENV=production`).

## Account flows

- Parents and teachers register with email/password (min 8 characters), then create student profiles. School self-registration is closed — admins create accounts from the admin console.
- Every student receives a unique `ST-xxxxx` login code; student-code sign-in has access only to that student profile.
- In production, email must be verified before an account can log in.
- Teachers and admins manage the shared word bank at `/admin`.

## Production deployment

1. Build the frontend so the backend can serve it:

   ```bash
   npm run build
   ```

2. In `backend/.env` set `NODE_ENV=production`, `APP_URL`, `FRONTEND_URL`, `RESEND_API_KEY`, `TRUST_PROXY` (proxy hop count), `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD`.

3. Apply migrations and seed on the production database:

   ```bash
   npm --prefix backend run prisma:deploy
   npm --prefix backend run seed
   ```

4. Start the server:

   ```bash
   npm --prefix backend start
   ```

The server serves the built `dist/` frontend and the API on the same host, applies security headers, limits request bodies, rate-limits auth routes, and shuts down gracefully on `SIGTERM`/`SIGINT`.

## Verification

```bash
npm run lint
npm run build
node --check backend/server.js
npx --prefix backend prisma validate
```

Never commit `.env` files. Rotate database credentials immediately if they have ever been copied into source control or shared outside your deployment environment.