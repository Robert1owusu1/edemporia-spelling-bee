# Spelling Bee -- Backend

Node.js/Express + PostgreSQL (via Prisma) API for the Spelling Bee app.
Framework-agnostic on the client side -- works the same whether the
frontend calling it is the React web app or anything else.

## Data model

- **Account** -- the parent/teacher/admin who actually logs in (email + password).
- **Student** -- a child profile under an Account (name, age, class). This
  is what plays the game and holds gamification state: tier, hearts,
  streak, points. One Account can have several Students.
- **Word** -- tiered vocabulary content across six difficulty tiers, each
  with a definition and example sentence.
- **Progress** -- one row per word attempt, tied to a Student.
- **Badge** / **StudentBadge** -- badge definitions and which Students
  have earned them. Criteria are simple rules like `streak:7` or
  `points:500`, evaluated on every round and daily-challenge completion.
- **DailyChallengeCompletion** -- one row per student per day.
- **StudentPreference** / **AccountPreference** -- per-learner and
  per-account accessibility settings (dark mode, text size, playback
  voice, dyslexia font). Spelling input is voice-only by design.
- **Classroom** -- teacher-managed groups students can be assigned to.
- **AuditLog** -- a tamper-evident record of account-level security events.

Every gameplay endpoint (`/rounds`, `/daily-challenge/complete`,
`/students/:id/badges`) requires a `studentId` and runs through the
`requireOwnStudent` middleware first, which confirms that student actually
belongs to the authenticated Account before anything happens -- without that
check, one parent's login could act on another family's child. Student-code
sessions stay scoped to that single learner even after a token refresh.

## Setup

```bash
npm install
cp .env.example .env    # fill in a real DATABASE_URL and JWT_SECRET
npx prisma generate
npx prisma migrate deploy
npm run seed            # starter words, badges, demo account
npm run dev
```

Free hosted Postgres that works well for a solo project: Supabase or
Neon. Either gives you the `DATABASE_URL` connection string to drop
into `.env`.

Health check once running: `curl http://localhost:4000/health`

## Production notes

- `NODE_ENV=production` enforces email verification at login and disables
  the dev-only "link returned by the API" behaviour -- set `RESEND_API_KEY`,
  `EMAIL_FROM` and `APP_URL` so verification/reset emails can be delivered.
- The server serves the built frontend from the repository `dist/` folder
  when it exists, so a single host can run the whole product.
- Baseline security headers, a JSON body limit, per-route rate limits
  and a JSON error handler are wired into `server.js`. Set `TRUST_PROXY` to
  the number of proxy hops when deploying behind a reverse proxy.
- `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` bootstrap a verified
  platform admin on first boot.
- The demo account seeded by `npm run seed` is `demo@spellingbee.local` /
  `demo123` (learner code `ST-10001`), used by the "Quick Demo" button. It
  is never seeded when `NODE_ENV=production`.

## Endpoint map

| Route | Auth | Notes |
|---|---|---|
| `POST /auth/signup` | -- | Creates an Account only (password min 8 chars) |
| `POST /auth/login` | -- | Returns `{ token, account, students }`; gated on email verification in production |
| `POST /auth/student-login` | -- | Learner signs in with `ST-xxxxx` code |
| `POST /auth/refresh` | account | Student sessions stay scoped to the same learner |
| `POST /auth/verify-email` | -- | Confirms the emailed verification link |
| `POST /auth/password-reset/request` | -- | Sends a reset link (min 8-char new password) |
| `POST /auth/password-reset/confirm` | -- | Applies the new password |
| `POST /auth/revoke-all-sessions` | account | Revokes the account's refresh tokens |
| `GET /users/me` | account | The Account itself, not a student |
| `GET/PATCH /users/me/preferences` | account | Account-wide UI preferences |
| `PATCH /users/me/profile` | account | Name / avatar |
| `GET /students` | account | All profiles under this account |
| `POST /students` | account | Add a child profile (auto-generates `ST-xxxxx`) |
| `PATCH/DELETE /students/:studentId` | account + own student | Update / remove a learner |
| `POST /students/:studentId/placement` | account + own student | Fun onboarding quiz that suggests a starting tier |
| `GET /wordlists/:tier` | account | Words for a difficulty tier (1-6) |
| `GET /daily-challenge` | account | Deterministic word of the day + `completedToday` (per student when `studentId` given) |
| `POST /daily-challenge/complete` | account + own student | Records the day, awards badges |
| `POST /hints` | account | First-letter hint from the stored example sentence |
| `POST /rounds` | account + own student | Authoritative scoring in a transaction |
| `GET /students/:studentId/badges` | account + own student | Earned badges with timestamps |
| `GET/PATCH /students/:studentId/preferences` | account + own student | Per-learner accessibility settings |
| `GET /classrooms` | TEACHER/ADMIN | List classes |
| `POST/PATCH /classrooms` | TEACHER/ADMIN | Create / update a class |
| `POST /classrooms/:id/students` | TEACHER/ADMIN | Assign a learner to a class |
| `GET /leaderboard` | account | Class ranking |
| `GET/POST/PATCH/DELETE /admin/accounts` | ADMIN | School account management |
| `GET/POST/PATCH/DELETE /admin/words` | ADMIN/TEACHER | Word bank management (one shared, school-wide bank) |
| `POST /admin/words/lookup` | ADMIN/TEACHER | Dictionary lookup for a word |
| `POST /admin/words/from-dictionary` | ADMIN/TEACHER | Add a word with auto-definition |
| `POST /admin/words/import-csv` | ADMIN/TEACHER | Bulk import with per-row results |

All routes are rate-limited and async errors are converted to JSON via the
router wrapper in `src/routes/index.js`.

## Verification

```bash
node --check server.js
node --check src/controllers/*.js
npx prisma validate
```