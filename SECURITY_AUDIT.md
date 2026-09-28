# Security Audit — Spelling Bee

**Audit type:** Offensive code review (attacker perspective)
**Scope:** `backend/` (Express 4 + Prisma 7 + PostgreSQL), `src/` (React 19 SPA), `server.js`, deployment config
**Method:** Static analysis of every controller, middleware and service; route-by-route authorisation review; per-finding verification of the previous remediation; dependency (`npm audit`), secret-handling, rate-limit and config review.
**Dates:** re-audit of the previous remediation **16 Aug 2026**; this document is a **living audit**, last updated **26 Sep 2026** — the "September 2026 follow-up" at the end records what changed since.

> **Status:** The remediation covered in the sections below **is present in the current
> code and is verified** (see "Verification of the previous remediation"). The one
> finding that stays open — the **word-bank exposure (H‑N1)** — is **inherent to a
> voice-first speller**: the applied economy caps bound, rather than remove, the cheat
> surface. This audit reflects the current **single-school, voice-only** product
> (practice rounds, the daily challenge, badges, the leaderboard, classes, and the
> shared word bank). Line numbers are re-checked against the working tree whenever
> this document is updated.

---

## Re-audit summary

| Severity | Original findings | Fixed (verified) | Open after that pass                                            |
| -------- | ----------------- | ---------------- | --------------------------------------------------------------- |
| CRITICAL | 3                 | all              | 0                                                               |
| HIGH     | 6                 | all              | 1 — H‑N1, **bounded** by economy caps (inherent to the product) |
| MEDIUM   | 8                 | all              | 0                                                               |
| LOW      | 4                 | all              | 0                                                               |

No new vulnerabilities were found in the September 2026 pass; that pass was
correctness/hardening work (see the follow-up section). The only negative delta is
the dependency scan, which is re-reported below.

---

## Verification of the previous remediation (current code)

| ID    | Claimed fix                                                                                                                                                                                                     | Verified in code                                                                                                                                                                                                                                                             |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1    | Server re-grades `/rounds`, `/daily-challenge/complete` from the student's `spelling`; `results` ≤ 100; `attempts` clamped 1–10; tier advance requires words to match the claimed tier; endpoints rate-limited. | `roundController.js:11–19` (input caps), `roundController.js:70–80` (re-grade), `roundController.js:86` + `:141–144` (locked transaction, ceilings), `dailyChallengeController.js:84–141`, `routes/index.js:38–52,93,99`. **Present — but see H‑N1: the fix is bypassable.** |
| H1    | Per-request DB validation of account/role/approval/`tokenVersion`; password change bumps version; HS256 pinned.                                                                                                 | `authMiddleware.js:82–135` (verify → DB row → version/approval), `authMiddleware.js:60–67` (`invalidateAccountTokens`), `authController.js:263–277` (change-password + revoke-all), `adminAccountController.js:141–144` (admin password/suspend/email change). **Present.**  |
| H4    | `crypto.randomInt` 7-digit codes; per-IP lockout.                                                                                                                                                               | `studentController.js:10`; `authController.js:19–54,60–93`. **Present.**                                                                                                                                                                                                     |
| H6    | Rate limits on rounds/hints/daily; length caps.                                                                                                                                                                 | `routes/index.js:38–40,93–94,99`. **Present.**                                                                                                                                                                                                                               |
| M1    | Search/leaderboard scoped to the caller's account/class, capped.                                                                                                                                                | `studentController.js:72–84`; `leaderboardController.js:11–32` (`take: 50`). **Present.**                                                                                                                                                                                    |
| M6    | 8 s `AbortController` on dictionary lookups.                                                                                                                                                                    | `dictionaryService.js:3–17`. **Present — see M‑N3 (import concurrency handled).**                                                                                                                                                                                            |
| M7    | Server logs `req.path` only; no `?token=` in logged URLs.                                                                                                                                                       | `server.js:103–111`. **Present.** (No tokens travel in URLs any more: the emailed reset/verify flow was removed in Sept 2026.)                                                                                                                                               |
| M8    | `getMe` field whitelist.                                                                                                                                                                                        | `userController.js:6–39`. **Present.**                                                                                                                                                                                                                                       |
| L1–L6 | Hints limited, dead route removed, login lowercases, CSP added, algorithm pinned.                                                                                                                               | `routes/index.js:39` (hints), `authController.js:168` (lowercase), `server.js:86–96` (CSP at `:95`), `authMiddleware.js:82` (`algorithms: ["HS256"]`). **Present.**                                                                                                          |

Dependency scan, re-run **26 Sep 2026** (the August "0 known vulnerabilities" result no
longer holds — new advisories have been published since):

- **Root:** 3 **moderate** — the `qs` advisory against `express@4.22.2` /
  `body-parser@1.20.6` (runtime request parsing; `npm audit fix` available).
- **`backend/`:** 10 (3 moderate, 7 high). Runtime portion is the same
  `qs`/`express` chain; `deepmerge-ts`, `mysql2` and `fast-uri` come through the
  **Prisma CLI (dev-only)**; `multer`, `@xmldom/xmldom` and `mammoth` are **extraneous
  lockfile entries** — `npm ls` marks them extraneous and no source file imports them.
  No application code path found in this audit reaches the dev-only advisories, but the
  lockfiles should be refreshed (`npm audit fix`, drop the stale entries) as maintenance.

---

## Severity Summary (historical record)

| ID               | Severity | Finding                                                                        | Status (26 Sep 2026)                                                                               |
| ---------------- | -------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| C1               | CRITICAL | Client-trusted `correct` flag → unlimited points / streak / tier / badge fraud | **Fixed** — server re-grades from `spelling`, caps, rate limits. Residual exposure tracked as H‑N1 |
| H1               | HIGH     | Stale JWTs — role/status never re-validated per request                        | **Fixed** — per-request DB check + `tokenVersion` revocation                                       |
| H4               | HIGH     | Weak, brute-forceable learner codes                                            | **Fixed** — `crypto.randomInt` + per-IP lockout                                                    |
| H6               | HIGH     | No rate limits on gameplay / submission endpoints                              | **Fixed** — per-session budgets + length caps                                                      |
| M1               | MEDIUM   | Child search & leaderboard leak minors' data to any authenticated user         | **Fixed** — scoped to account/class, leaderboard capped at 50                                      |
| M6               | MEDIUM   | External dictionary calls have no timeout                                      | **Fixed** — 8 s abort                                                                              |
| M7               | MEDIUM   | Password-reset / verification tokens written to server logs                    | **Fixed** — path-only logging; the token-in-URL flow itself was later removed entirely             |
| M8               | MEDIUM   | `/users/me` exposes security-token hashes and timestamps                       | **Fixed** — field whitelist                                                                        |
| L1               | LOW      | `/hints` unlimited; `/health` disclosed service name                           | **Fixed** — hint budget; `/health` returns `{ status: "ok" }` only                                 |
| L2               | LOW      | Dead `getStudent` code                                                         | **Fixed** — removed                                                                                |
| L3               | LOW      | Login email not lowercased (functional bug)                                    | **Fixed**                                                                                          |
| L4               | LOW      | No CSP header                                                                  | **Fixed** — full CSP in `server.js:95`                                                             |
| L5               | LOW      | JWT algorithm not pinned                                                       | **Fixed** — `HS256` pinned, student tokens keep `STUDENT` role                                     |
| H‑N1 (Aug 2026)  | HIGH     | Word bank is client-held → server-side grading cannot protect the economy      | **Open by design, bounded** — per-round/total/combo caps (see below)                               |
| M‑N1 (Aug 2026)  | MEDIUM   | Rate-limit coverage too narrow                                                 | **Fixed** — auth, gameplay, roster and word-bank routes budgeted                                   |
| M‑N3 (Aug 2026)  | MEDIUM   | CSV import could hold a request open indefinitely                              | **Fixed** — concurrency 5 + 45 s deadline                                                          |
| M‑N4 (Aug 2026)  | MEDIUM   | Unbounded login-failure maps                                                   | **Fixed** — window expiry + 10 000-entry cap + sweeper                                             |
| L‑N2 (Aug 2026)  | LOW      | Deleted account's JWT survived the cache window                                | **Fixed** — `clearAccountCache` on delete                                                          |
| L‑N4 (Aug 2026)  | LOW      | SVG avatars accepted (XSS vector)                                              | **Fixed** — raster data URLs only                                                                  |
| L‑N5 (Aug 2026)  | LOW      | Demo account seeded in production                                              | **Fixed** — skipped when `NODE_ENV=production`                                                     |
| L‑N6 (Aug 2026)  | LOW      | `/auth/refresh` unlimited                                                      | **Fixed** — 60/15 min; short-lived token rotation left as a deployment option                      |
| L‑N7 (Aug 2026)  | LOW      | Rate limits not shareable across instances                                     | **Fixed** — optional `REDIS_URL` store, per-limiter namespacing                                    |
| L‑N8 (Aug 2026)  | LOW      | Email upstream call without timeout                                            | **Fixed** — 10 s abort; the email service was removed entirely in Sept 2026                        |
| L‑N10 (Aug 2026) | LOW      | `/health` disclosed the service name                                           | **Fixed**                                                                                          |

---

## CRITICAL

### C1. Client-trusted `correct` flag — unlimited points / streak / tier / badges fraud

**Status: FIXED in the previous pass (verified above); residual exposure is H‑N1.**
**File:** `roundController.js` `submitRound` (lines 41–80); also `dailyChallengeController.js` `completeDailyChallenge` (line 82).

`POST /rounds` accepts `{ studentId, results: [{ wordId, correct: true, attempts: 1 }] }`. The server **never verifies the spelling** — it trusts the client-supplied boolean `correct` to award:

- points (`word.tier * 10 * (1 + min(streak,10)*0.1)` per word, streak compounding),
- streak, hearts, rounds-completed, automatic tier progression (`accuracy >= 0.8` over 5+ words), and
- badge rules (`streak`, `points`, `rounds`).

The source comment claims this is "the authoritative version of scoring … so progress can't just be edited on-device" — that is false. An attacker simply declares `correct: true`.

**Attack:**

```
POST /rounds  (Bearer: any parent token)
{ "studentId": "<child>",
  "results": [ { "wordId": "<any seeded word>", "correct": true } x 50 ] }
```

Repeat. Reaches tier 6, 1000+ points, every badge, leaderboard #1 in minutes. `results` has no length cap and `/rounds` has **no rate limit** (the 2 MB body limit is the only brake). Same trust-the-client pattern in `POST /daily-challenge/complete` — client `correct` bool grants +50 points and +1 streak (daily, once/day).

**Fix (applied):** server-side round verification (the server re-derives `correct` from
the submitted `spelling` against the word bank), `results` capped at 100, `attempts`
clamped 1–10, rate limits on `/rounds` and `/daily-challenge/complete`.

---

## HIGH

### H1. Stale JWTs — role/status never re-validated per request

**Status: FIXED (verified in the table above).**
**Files:** `middleware/authMiddleware.js` (now: verify → DB row → `tokenVersion`/approval check), `authController.js` `signToken` / `refresh`.

As originally found, `authMiddleware` trusted whatever was in the token (`req.user = payload; next()`), so a suspended account kept access, a demoted admin kept its old role, and password changes did not invalidate tokens.

**Fix (applied):** `authMiddleware` loads the account on every request (30 s cache keyed
by account **and** `tokenVersion`, so a bump bypasses it immediately), re-checks
approval, forces `STUDENT` whenever the token carries a `studentId`, and rejects a
mismatched `tokenVersion` with 401 (503 when the database itself is unreachable, so an
outage does not masquerade as a logout). An administrator's password reset, the owner's
own password change, admin password/email changes and "log out everywhere" all bump
`tokenVersion`; the JWT is pinned to `HS256`.

### H4. Weak learner-code authentication (brute-forceable)

**Status: FIXED.**
**Files:** `studentController.js` `createStudentCode()` — `ST-${crypto.randomInt(1000000, 10000000)}`; `authController.js` `loginWithStudentCode`.

Login requires only the static `studentCode`. Codes are now generated with `crypto.randomInt` (7-digit, 9M space) and the endpoint is rate-limited at 20/min/IP **with a per-IP lockout** (5 failures → 15 min) and expiry of stale failure counters.

**Fix (applied):** `crypto.randomInt` ≥ 7 digits; per-IP failure lockout; shared budget. Never use `Math.random` for credentials.

### H6. No rate limits on gameplay / submission endpoints

**Status: FIXED.**
**Files:** `roundController.js` submit, `dailyChallengeController.js` complete, `hintController.js`.

Only auth endpoints were throttled. `/rounds`, `/daily-challenge/complete`, `/hints` were unlimited — enabling C1 farming and DB write amplification.

**Fix (applied):** `/rounds` 600/15 min, `/daily-challenge/complete` 30/15 min, `/hints` 300/15 min per session (`routes/index.js:38–40`); `results` length capped.

---

## MEDIUM

### M1. Global child search & leaderboard leak minors' names/points to any authenticated user

**Status: FIXED.**
**Files:** `studentController.js` `listStudents`; `leaderboardController.js`.

Any parent, teacher or student session can enumerate every learner's `id`, `name`, `className`, `avatarColor` and the top points/names — privacy exposure of children's data and a basis for targeted harassment.

**Fix (applied):** search/leaderboard scoped to the caller's own account, class and classrooms; the leaderboard is capped (`take: 50`).

### M6. External dictionary calls have no timeout → request DoS

**Status: FIXED.**
**Files:** `dictionaryService.js`; `adminWordController.js` `importWordsFromCSV`.

A stalled/slow dictionary API holds the Node worker for potentially minutes; imports and lookups hang with no timeout.

**Fix (applied):** `AbortController` 8 s timeout; imports processed with bounded parallelism and an overall deadline (see M‑N3).

### M7. Password-reset & verification tokens are written to plaintext server logs

**Status: FIXED (and the exposure removed altogether).**
**Files:** `server.js` logs `req.path`; the SPA used to navigate to `/verify-email?token=...` and `/reset-password?token=...`, which hit the Express SPA fallback and were logged.

**Fix (applied):** log only the pathname, not the query string.

**Later removed (Sept 2026):** email verification and the emailed reset link were
deleted outright — no token ever travels in a URL now. Password recovery is in-app:
`POST /auth/password-reset/request` only sets `passwordResetRequestedAt`, the admin
portal fulfils it via `POST /admin/accounts/:id/reset-password`, and the owner picks a
new password with `POST /auth/change-password`.

### M8. `/users/me` exposes security-token hashes and timestamps

**Status: FIXED.**
**File:** `userController.js` `getMe` — returns only a whitelist of profile fields; hashes/timestamps are never serialised.

---

## LOW / BUGS

| ID  | Finding                                                                                                                                                                                               | Notes                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| L1  | `/hints` had no rate limit; `/health` disclosed service name.                                                                                                                                         | Both fixed: hint budget at `routes/index.js:39`; `/health` returns `{ status: "ok" }` only.        |
| L2  | `getStudent` was **dead code** (no route registers it).                                                                                                                                               | Removed.                                                                                           |
| L3  | Login email not lowercased while every creation path lowercases → a case-mismatched login always fails (functional bug).                                                                              | Login now lowercases (`authController.js:168`).                                                    |
| L4  | No CSP header (only `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`). React escapes XSS by default and no `dangerouslySetInnerHTML` is used, so risk is defense-in-depth. | CSP added (`server.js:95`); session token lives in `localStorage`, so CSP + log hygiene matter.    |
| L5  | JWT not pinned to `algorithms: ["HS256"]`. Student-code JWTs carried the parent's role and could be upgraded.                                                                                         | Algorithm pinned; student sessions keep `STUDENT` role + `studentId`, scope-locked to one learner. |

---

## NEW FINDINGS — re-audit of the current tree (16 Aug 2026)

### HIGH

#### H‑N1. The C1 remediation is bypassable: the client legitimately holds every answer, so "server-side grading" still cannot protect the economy

**Files:** `wordController.js:10–33` (`GET /wordlists/:tier` selects and returns `text`, line 18), `dailyChallengeController.js:49–58` (`GET /daily-challenge` returns the full word incl. `text`, line 57), `roundController.js:70–80` (grading from client-supplied `spelling`).
**Status: OPEN BY DESIGN — bounded by the economy caps below.**

The previous fix made the server ignore `correct:true` and re-grade from `result.spelling`. But a scripted client simply:

1. logs in (any PARENT account), and
2. downloads every tier via `GET /wordlists/1..6`, obtaining `text` for every word, then
3. submits `POST /rounds` with `{ studentId, results: [{ wordId, spelling: word.text, attempts: 1 } x ≤100] }`.

Every result grades `correct` server-side, so a single automated request yields 100 correct words; with the 600-round / 15 min limiter that is on the order of **millions of points**, instant tier-6, every badge, and a forged leaderboard position.

**Why it is inherent, not accidental:** a voice-first spelling app must ship the plaintext word to the client to read it aloud, so the answers are always recoverable by a tampered client. The server-side re-grade raises the bar from "edit one boolean" to "write a 10-line script" but does not restore economy integrity.

**Bounded by (current code):** `roundController.js:19` `MAX_POINTS_PER_ROUND` (2000) applied at `:129`, and `studentStateService.js:11–12` `MAX_STUDENT_POINTS` (500,000) / `MAX_STUDENT_STREAK` (50) applied inside the locking transaction at `roundController.js:141–144`. The exposure itself is inherent to a voice-first speller — the caps bound the damage rather than removing it.

---

## What is done well (not findings)

- Login uses bcrypt compare + generic 401 + dummy-hash timing equalisation; passwords min 8 chars, 12+ for the admin bootstrap.
- Password recovery needs no secret in a URL at all: a forgotten password is flagged in-app and reset only by an administrator, and a self-service change re-checks the current password first (both bump `tokenVersion`, killing every other session).
- Per-request account/role/approval/`tokenVersion` validation; un-approving or deleting an account kills its sessions; HS256 pinned; role is derived server-side, never trusted from the token.
- `requireOwnStudent` and `roleMiddleware` are applied on every route that needs them (ownership is enforced once, in the middleware, and controllers consume `req.student`); student-code sessions are scope-locked to one learner, including across `POST /auth/refresh`.
- Learner profiles, scoring, class management and admin word operations are wrapped in transactions with row-locks (`FOR UPDATE`) against concurrent write races; tier progression runs on the locked row.
- Student codes use `crypto.randomInt`; avatars are raster-only (SVG rejected, 1 MB cap).
- Rate limits across the auth, gameplay, roster and word-bank routes (auth: per IP; gameplay/admin: per session), answering 429 with a truthful `Retry-After` (the password-lockout 429 does too); per-account password lockout (10 failures → 15 min) and per-IP learner-code lockout (5 failures → 15 min), with bounded, self-expiring failure maps.
- CSP, `X-Frame-Options`, Referrer-Policy, Permissions-Policy, `nosniff`; no `dangerouslySetInnerHTML`; the session JWT is never placed in a URL.
- Startup guards: weak/default `JWT_SECRET` rejected; `TRUST_PROXY` must be a sane integer; graceful shutdown + fatal handlers; DB outage → 503 (not a spurious logout).
- Frontend CSV roster export escapes quotes and prefixes leading `=`, `+`, `-`, `@` so a spreadsheet treats learner data as text instead of executing formulas (`src/utils/csv.ts`).
- Demo credentials (`demo@spellingbee.local` / `demo123`, `ST-10001`) are development-only: not seeded under `NODE_ENV=production`, and production builds do not auto-login.

## Attacker's best paths (current tree)

1. **Farm everything (H‑N1):** log in as any parent, download `/wordlists/1..6`, submit `/rounds` with `spelling: word.text` ×100 every 15 min → tier 6, lots of points, all badges, leaderboard #1 — bounded by `MAX_POINTS_PER_ROUND`, `MAX_STUDENT_POINTS` and `MAX_STUDENT_STREAK`.
2. **Brute-force a learner code (H4):** 9M space, `crypto.randomInt`, per-IP lockout after 5 guesses, 20/min/IP request budget — much harder than before.
3. **Stuff passwords at one account:** per-IP login limits still allow many IPs, but the **per-account** lockout (10 failures → 15 min for every source) and the dummy-hash timing equalisation blunt it.

The previously listed path "keep a suspended/demoted account alive with an old token (H1)" is **gone**: approval and `tokenVersion` are re-checked on every request.

## Recommended priorities

1. Decide the game-economy policy and enforce it honestly: the caps are in place (`MAX_POINTS_PER_ROUND` 2000, `MAX_STUDENT_POINTS` 500 000, `MAX_STUDENT_STREAK` 50) — what remains is the _policy_ question of teacher/admin confirmation for tier promotions, and whether to tighten the caps further (H‑N1).
2. Refresh the dependency lockfiles: `npm audit fix` for the runtime `qs`/`express` chain, and drop the extraneous `multer`/`mammoth`/`@xmldom/xmldom` entries from `backend/package-lock.json`.
3. Deployment hardening: TLS-only deployment, and (optionally) short-lived access tokens with rotating refresh tokens — the current design is a 7-day stateless JWT with server-side `tokenVersion` revocation, which is adequate but coarse.

---

## Remediation status

| ID    | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1    | `roundController.submitRound` and `dailyChallengeController.completeDailyChallenge` **re-grade from the student's actual `spelling`** against the word bank; the client `correct` flag is ignored; `results` capped at 100, `attempts` clamped 1–10; `/rounds`, `/daily-challenge/complete` are rate-limited. A claimed tier for auto-advance is only accepted when every submitted word belongs to that tier (`roundController.js:172–180`). |
| H1    | `authMiddleware` loads the account every request, rejects revoked `tokenVersion`s, and re-checks approval; password changes (self-service or by an administrator), admin password/email/suspension changes and "log out everywhere" bump `tokenVersion` (`authController.js:263–277`, `adminAccountController.js:141–144`). JWT pinned to `HS256`.                                                                                            |
| H4    | Student codes use `crypto.randomInt` (7-digit, 9M space) plus a **per-IP lockout** (5 failures → 15 min) in `authController.js:19–54,60–93`.                                                                                                                                                                                                                                                                                                  |
| H6    | Rate limits added for rounds, hints and daily challenge (`routes/index.js:38–40`); `results` length caps in place.                                                                                                                                                                                                                                                                                                                            |
| M1    | `listStudents` is **scoped to the caller's account/class** (`studentController.js:72–84`); the leaderboard is scoped and capped at 50.                                                                                                                                                                                                                                                                                                        |
| M6    | `dictionaryService.lookupWord` uses an `AbortController` **8s timeout**; imports are bounded-parallel with an overall deadline.                                                                                                                                                                                                                                                                                                               |
| M7    | Server logs `req.path` only (no query string); tokens no longer reach the logs.                                                                                                                                                                                                                                                                                                                                                               |
| M8    | `getMe` returns a **field whitelist**; token hashes/timestamps are never serialised.                                                                                                                                                                                                                                                                                                                                                          |
| L1    | `/hints` rate-limited; `/health` no longer discloses the service name (it returns `{ status: "ok" }`).                                                                                                                                                                                                                                                                                                                                        |
| L2    | Dead `getStudent` removed from `studentController.js`.                                                                                                                                                                                                                                                                                                                                                                                        |
| L3    | Login lowercases the email (`authController.js:168`).                                                                                                                                                                                                                                                                                                                                                                                         |
| L4    | Full CSP header added in `server.js:95` (`default-src 'self'`, Google Fonts allow-listed).                                                                                                                                                                                                                                                                                                                                                    |
| L5    | JWT pinned to `algorithms: ["HS256"]`; student-code tokens keep the `STUDENT` role + `studentId` and never inherit the parent's privileges.                                                                                                                                                                                                                                                                                                   |
| H‑N1  | Economy caps in `roundController.js`: `MAX_POINTS_PER_ROUND` (2000, line 129) and `studentStateService.js`: `MAX_STUDENT_POINTS` (500,000) / `MAX_STUDENT_STREAK` (50) applied inside the locking transaction (`roundController.js:141–144`). The word-bank exposure itself is inherent to a voice-first speller — the caps bound the damage rather than removing it.                                                                         |
| M‑N1  | `routes/index.js:38–52`: rate limits added to rounds, hints, daily challenge, learner/student writes, admin writes, imports (10/15 min) and dictionary lookups (60/15 min); every 429 carries `Retry-After`.                                                                                                                                                                                                                                  |
| M‑N3  | `services/concurrency.js` (`runWithConcurrency`): the CSV import (`adminWordController.js:234–238`) processes with concurrency 5 and a 45 s overall deadline, returning "import timed out" failures for the remainder; imports are rate-limited (10/15 min).                                                                                                                                                                                  |
| M‑N4  | `authController.js:19–54`: both failure maps expire counters when their window lapses, are hard-capped at 10 000 entries, and are swept on a timer.                                                                                                                                                                                                                                                                                           |
| L‑N2  | `adminAccountController.deleteAccount` calls `clearAccountCache()` (line 178) so a deleted account's JWT dies immediately instead of after the cache window.                                                                                                                                                                                                                                                                                  |
| L‑N4  | `userController.updateProfile` only accepts raster data-URL avatars (`png\|jpe?g\|gif\|webp\|avif`) with a 1 MB cap — SVG is rejected (`userController.js:69`).                                                                                                                                                                                                                                                                               |
| L‑N5  | `seedWords.js:105`: `seedDemoAccount()` is skipped when `NODE_ENV=production`; the word/badge catalog still seeds.                                                                                                                                                                                                                                                                                                                            |
| L‑N6  | `/auth/refresh` is rate-limited (60/15 min per session, `routes/index.js:61`). Full short-lived-token rotation remains an optional deployment item (the 7-day JWT remains).                                                                                                                                                                                                                                                                   |
| L‑N7  | `rateLimit.js:16–34` supports a shared Redis-backed store when `REDIS_URL` is set (dynamically requires `redis`; in-memory store remains the default), and each limiter instance namespaces its own budget so limiters no longer share buckets.                                                                                                                                                                                               |
| L‑N8  | `emailService.js` wrapped upstream fetch (Resend) in a 10 s `AbortController` timeout; the file has since been deleted — there is no email integration left.                                                                                                                                                                                                                                                                                  |
| L‑N10 | `/health` (`server.js:119`) no longer discloses the service name.                                                                                                                                                                                                                                                                                                                                                                             |

---

## September 2026 follow-up

The audit fixes above were followed by a correctness/hardening pass that landed in
September 2026 (this section records it; it found **no new vulnerabilities**).

**Fixed in this pass:**

- **Classroom scoping** — listing, editing and enrolling are all checked against the
  owning teacher (or ADMIN), and a parent can only enrol their own learner
  (`classroomController.js:5–6,27,59–64`).
- **Streak vs daily-streak split** — `streak` is now only the per-round combo (resets on
  a wrong word, capped at 50) and `dailyStreak` is consecutive practice days, both
  computed by shared helpers (`studentStateService.js:11–12,60–67`);
  `streakDays` in API responses is an alias of `dailyStreak`.
- **Hearts enforcement + regeneration** — `hearts` is 0–5 (default 5), regenerating 1
  per 15 minutes (`studentStateService.js:6–7,39–52`); a practice round submitted at 0
  hearts returns **423 Locked** (`roundController.js:108–116`); the daily challenge is
  never blocked by hearts.
- **Daily-challenge determinism** — a pure UTC `YYYY-MM-DD` key
  (`studentStateService.js:17–19`) with an ordered `id ASC` pool selection
  (`dailyChallengeController.js:20–35`); a second completion the same day is **409**
  (`dailyChallengeController.js:137–138`).
- **Placement is one-shot** — `placementCompleted` is claimed atomically, so later
  attempts get **409**, and only the learner's own student session may run it
  (`studentController.js:173–197`), with its own rate limit.
- **Word uniqueness** — `Word.text` and `Badge.name` are DB-unique; duplicate words are
  answered with **409** instead of creating a second row
  (`adminWordController.js:68,100,161`; migration `20260926120000_audit_fixes`).
- **`deleteWord` protection** — a word with learner progress cannot be deleted (**409**),
  and the delete path no longer destroys learner history
  (`adminWordController.js:180–199`).
- **N+1 presenter fixed** — `presentStudents` aggregates the whole roster in a fixed
  number of queries (3 `groupBy`s + 1 window-function query) instead of one query per
  learner (`studentPresenter.js:42–60`).
- **Ownership middleware consolidation** — `requireOwnStudent` is applied once in the
  router and controllers consume `req.student` (`routes/index.js:73–77,96–102`).
- **e2e hardening** — the suite grew to 44 scenarios with per-request timeouts, an
  overall deadline, duplicate-safe assertions and cleanup that reports leaked data
  (`scripts/e2eTest.js`).
- **Demo credentials dev-only** — the seed skips them under `NODE_ENV=production`
  (`seedWords.js:105`) and production frontend builds do not auto-login (the demo
  constants resolve to `""` unless `import.meta.env.DEV`).
- **Error states no longer render as success** — e.g. only a genuine `P2002` duplicate
  answers 409 while a database outage surfaces its real status
  (`dailyChallengeController.js:134–141`), admin/word duplicate races answer 409 rather
  than 500,
  and an unreachable database during auth answers 503 rather than logging everyone out
  (`authMiddleware.js:100–110`).

**Open by design (unchanged, stated plainly):**

- **Voice-first spelling is inherently guessable (H‑N1).** The word bank must be shipped
  to the client to be spoken aloud; the economy caps bound the damage but cannot remove
  it.
- **JWT in `localStorage`.** A deliberate single-host SPA trade-off (no CSRF surface,
  survives reloads) at the cost of exposure to any XSS that reaches the page.
- **No application-level row-level security.** The schema enables RLS **only** on
  `_prisma_migrations` (`migrations/20260830000000_init`, "Supabase/PostgREST
  hardening"). Any earlier claim that the application runs against an "RLS-locked
  database" is **wrong**: authorisation lives entirely in the API (`requireOwnStudent`,
  `roleMiddleware`, per-request account checks), and the database role Prisma connects
  as bypasses RLS anyway. If the API were compromised, RLS would not be a second line
  of defence — add policies only if a direct-to-database access path is ever exposed.
