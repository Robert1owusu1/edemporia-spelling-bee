# Spelling Bee -- Backend

Node.js/Express + PostgreSQL (via Prisma) API for the Spelling Bee app.
Framework-agnostic on the client side -- works the same whether the
frontend calling it is the React web app or anything else.

## Data model

- **Account** -- the parent/teacher/admin who actually logs in (email + password).
  `email` is DB-unique. Accounts are created only by an administrator
  (`POST /admin/accounts`) or by the `PLATFORM_ADMIN_*` bootstrap -- self-registration
  is closed -- and are marked email-verified at creation, then approved
  (`approvedAt`) before they can sign in. `tokenVersion` is bumped on password
  reset, admin password/email/suspension changes and "log out everywhere" to
  revoke every outstanding JWT.
- **Student** -- a child profile under an Account (name, age, class). This
  is what plays the game and holds gamification state: tier, points,
  `hearts` (0-5, default 5, regenerating 1 per 15 minutes), `streak` (the
  per-round combo -- resets on a wrong word, capped at 50) and `dailyStreak`
  (consecutive practice days; API responses also expose it as `streakDays`).
  `placementCompleted` makes the placement quiz genuinely one-shot and
  `studentCode` (`ST-xxxxx`) is DB-unique. One Account can have several Students.
- **Word** -- tiered vocabulary content across six difficulty tiers, each
  with a definition and example sentence. `text` is DB-unique, so a duplicate
  word is answered with 409 rather than a second copy.
- **Progress** -- one row per word attempt, tied to a Student. Deleting a word
  that has learner progress is refused with 409 (archive it instead); a delete
  never destroys learner history.
- **Badge** / **StudentBadge** -- badge definitions (`name` is DB-unique) and
  which Students have earned them. Criteria are simple rules like `streak:7` or
  `points:500`, evaluated on every round and daily-challenge completion.
- **DailyChallengeCompletion** -- one row per student per UTC day:
  `date` is a pure `YYYY-MM-DD` string and `@@unique([studentId, date])` makes a
  second completion of the same day a 409.
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
sessions stay scoped to that single learner even after `POST /auth/refresh`,
which simply re-issues the caller's current token: there are **no refresh
tokens**, auth is a stateless JWT with server-side `tokenVersion` revocation.

## Setup

```bash
npm install
cp .env.example .env    # fill in a real DATABASE_URL and JWT_SECRET
npx prisma generate
npx prisma migrate deploy
npm run seed            # starter words, badges, demo account (dev only)
npm run dev
```

`backend/.env.example` lists every variable the code reads (core, production,
email, rate-limiting, tests) with required/optional notes. The bootstrap
administrator needs `PLATFORM_ADMIN_EMAIL` + a 12+ character
`PLATFORM_ADMIN_PASSWORD` set together.

Free hosted Postgres that works well for a solo project: Supabase or
Neon. Either gives you the `DATABASE_URL` connection string to drop
into `.env`.

Health check once running: `curl http://localhost:4000/health`

## Production notes

- There is no email integration at all. Password recovery is in-app: the
  sign-in screen's "Forgot password?" flags the account
  (`passwordResetRequestedAt`), the admin portal shows it as a badge and a
  list, and the administrator resets the account to `DEFAULT_RESET_PASSWORD`
  (default `SpellingBee123`) with `POST /admin/accounts/:id/reset-password`.
  The owner then signs in and changes it via `POST /auth/change-password`.
- `NODE_ENV=production` only affects the demo seed (it is skipped).
- The server serves the built frontend from the repository `dist/` folder
  when it exists, so a single host can run the whole product.
- Baseline security headers (CSP, frame-deny, nosniff, referrer/permissions
  policies), a JSON body limit, per-route rate limits with `Retry-After`, and a
  JSON error handler are wired into `server.js`. Set `TRUST_PROXY` to the number
  of proxy hops when deploying behind a reverse proxy; weak `JWT_SECRET` and
  malformed `TRUST_PROXY` values abort startup.
- `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` bootstrap an approved
  platform admin on first boot.
- The demo account seeded by `npm run seed` is `demo@spellingbee.local` /
  `demo123` (learner code `ST-10001`), used by the "Quick Demo" button. It
  is never seeded when `NODE_ENV=production`, and production frontend builds
  do not auto-login with it.

## Endpoint map

| Route                                        | Auth                  | Notes                                                                                                                                 |
| -------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/signup`                          | --                    | Always **403** `registrationClosed` -- self-registration is closed                                                                    |
| `POST /auth/login`                           | --                    | Returns `{ token, account, students }`; approval required; per-IP limit + per-account lockout (429 + `Retry-After`)                   |
| `POST /auth/student-login`                   | --                    | Learner signs in with `ST-xxxxx` code; per-IP limit + lockout after 5 wrong codes                                                     |
| `POST /auth/password-reset/request`          | --                    | Flags the account for an admin reset (generic response -- no account enumeration)                                                     |
| `POST /auth/change-password`                 | account               | `{ currentPassword, newPassword }` (min 8); bumps `tokenVersion`, returns a fresh token; 403 for student sessions; 10/15 min per user |
| `POST /auth/refresh`                         | account               | Re-issues the current JWT (no refresh tokens); student sessions stay scoped to the same learner                                       |
| `POST /auth/revoke-all-sessions`             | account               | Bumps `tokenVersion` -- "log out everywhere"                                                                                          |
| `GET /users/me`                              | account               | The Account itself, not a student                                                                                                     |
| `GET/PATCH /users/me/preferences`            | account               | Account-wide UI preferences                                                                                                           |
| `PATCH /users/me/profile`                    | account               | Name / avatar (raster data URLs only)                                                                                                 |
| `GET /students`                              | account               | Profiles under this account (teachers: own classes; admins: all); batched presenter, 300/15 min                                       |
| `POST /students`                             | account               | Add a child profile (auto-generates `ST-xxxxx`); 10/15 min                                                                            |
| `PATCH/DELETE /students/:studentId`          | account + own student | Update / remove a learner                                                                                                             |
| `POST /students/:studentId/placement`        | own student session   | One-time quiz that sets the starting tier (403 for a parent/teacher session) -- **409** on any later attempt; 10/15 min               |
| `GET /wordlists/:tier`                       | account               | Words for a difficulty tier (1-6); ownership-checked when a `studentId` is named                                                      |
| `GET /daily-challenge`                       | account               | Deterministic UTC-dated word of the day + `completedToday` (per student when `studentId` given)                                       |
| `POST /daily-challenge/complete`             | account + own student | Records the day, awards badges; **409** on a second completion the same UTC day; never blocked by hearts; 30/15 min                   |
| `POST /hints`                                | account               | First-letter hint from the stored example sentence; 300/15 min                                                                        |
| `POST /rounds`                               | account + own student | Server re-grades the spelling in a transaction; **423** when the learner is out of hearts; 600/15 min                                 |
| `GET /students/:studentId/badges`            | account + own student | Earned badges with timestamps                                                                                                         |
| `GET/PATCH /students/:studentId/preferences` | account + own student | Per-learner accessibility settings                                                                                                    |
| `GET /classrooms`                            | TEACHER/ADMIN         | List classes                                                                                                                          |
| `POST /classrooms`                           | TEACHER/ADMIN         | Create a class                                                                                                                        |
| `PATCH /classrooms/:id`                      | TEACHER/ADMIN         | Rename / update a class                                                                                                               |
| `POST /classrooms/:id/students`              | TEACHER/ADMIN         | Assign a learner to a class                                                                                                           |
| `GET /leaderboard`                           | account               | Class ranking, scoped to the caller's account/class (top 50)                                                                          |
| `GET/POST/PATCH/DELETE /admin/accounts`      | ADMIN                 | School account management; `approve` toggles access and revokes sessions                                                              |
| `POST /admin/accounts/:id/reset-password`    | ADMIN                 | Fulfils an in-app forgot-password request: sets `DEFAULT_RESET_PASSWORD`, clears the flag, kills live sessions, returns the password  |
| `GET/POST/PATCH/DELETE /admin/words`         | ADMIN/TEACHER         | Word bank management (one shared, school-wide bank); duplicate `text` -> 409; delete with learner progress -> 409                     |
| `POST /admin/words/lookup`                   | ADMIN/TEACHER         | Dictionary lookup (8 s upstream timeout); 60/15 min                                                                                   |
| `POST /admin/words/from-dictionary`          | ADMIN/TEACHER         | Add a word with auto-definition                                                                                                       |
| `POST /admin/words/import-csv`               | ADMIN/TEACHER         | Bulk import with per-row results (concurrency 5, 45 s deadline); 10/15 min                                                            |

All auth, gameplay, roster and word-bank routes are rate-limited (auth routes
per IP, gameplay/admin routes per session); every rate-limit 429 carries a
`Retry-After` header (the per-account password lockout does too), and async
errors are converted to JSON via the router wrapper in `src/routes/index.js`.
Read-only routes such as `GET /leaderboard` are intentionally unthrottled. Set
`REDIS_URL` to share one budget across instances; otherwise limits are
in-memory and per-process.

## Verification

```bash
node --check server.js
find src -name '*.js' -exec node --check {} \;   # every backend source file parses
npx prisma validate     # run from backend/ so prisma.config.ts is found
npm run test:e2e        # 44 end-to-end API scenarios (self-cleaning)
```

`npm run test:e2e` (see `scripts/e2eTest.js`) exercises 44 end-to-end scenarios
against a running backend and a live, seeded database -- authentication,
students, placement, word lists, the daily challenge, server-graded rounds,
hints, badges, preferences, the leaderboard, classrooms, the admin word bank
and admin account management, plus the role/ownership access-control boundaries.
It needs `DATABASE_URL`, `JWT_SECRET`, `PLATFORM_ADMIN_EMAIL` and
`PLATFORM_ADMIN_PASSWORD` (it signs in as the bootstrap administrator) and a
reachable PostgreSQL database with migrations applied and content seeded.

It removes the accounts, learners, classrooms and words it creates, so it is
safe to re-run -- but auth routes are rate-limited per IP (10 password logins
per 15 minutes), so two runs back to back from the same address can be
answered with 429. Wait out the `Retry-After` window, or restart the backend
to clear the in-memory counters, before re-running.
