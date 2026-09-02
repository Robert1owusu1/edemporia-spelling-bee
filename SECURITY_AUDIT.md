# Security Audit — Spelling Bee

**Audit type:** Offensive code review (attacker perspective)
**Scope:** `backend/` (Express 4 + Prisma 7 + PostgreSQL), `src/` (React 19 SPA), `server.js`, deployment config
**Method:** Static analysis of every controller, middleware and service; route-by-route authorisation review; per-finding verification of the previous remediation; dependency (`npm audit`), secret-handling, rate-limit and config review.
**Date of this re-audit:** 16 Aug 2026 (against the current working tree).

> **Status:** The remediation covered in the sections below **is present in the current
> code and is verified** (see "Verification of the previous remediation" table). The
> remaining known issue — the **word-bank exposure (H‑N1)** — is **inherent to a
> voice-first speller**; the applied economy caps bound, rather than remove, the cheat
> surface. This audit reflects the current **single-school, voice-only** product
> (practice rounds, the daily challenge, badges, the leaderboard, classes, and the
> shared word bank).

---

## Re-audit summary

| Severity | Previous | New (this pass) | New status |
|---|---|---|---|
| CRITICAL | 3 | **Fixed** (verified) | 0 | — |
| HIGH | 6 | **Fixed** (verified) | 1 (H‑N1) | **Bounded** (caps + ceilings) |
| MEDIUM | 8 | **Fixed** (verified) | — | **Remediated** |
| LOW | 4 | **Fixed** (verified) | — | **Remediated** |

---

## Verification of the previous remediation (current code)

| ID | Claimed fix | Verified in code |
|---|---|---|
| C1 | Server re-grades `/rounds`, `/daily-challenge/complete` from the student's `spelling`; `results` ≤ 100; `attempts` clamped 1–10; tier advance requires words to match the claimed tier; endpoints rate-limited. | `roundController.js:26–45,136–147`; `dailyChallengeController.js:80–100`; `routes/index.js`. **Present — but see H‑N1: the fix is bypassable.** |
| H1 | Per-request DB validation of account/role/approval/`tokenVersion`; password change bumps version; HS256 pinned. | `authMiddleware.js:61–129`; `authController.js:259–273`; `adminAccountController.js:128–130`. **Present.** |
| H4 | `crypto.randomInt` 7-digit codes; per-IP lockout. | `studentController.js:10`; `authController.js:20–58`. **Present.** |
| H6 | Rate limits on rounds/hints/daily; length caps. | `routes/index.js:38–40`. **Present.** |
| M1 | Search/leaderboard scoped to the caller's account/class, capped. | `studentController.js:25–33`; `leaderboardController.js:7–15`. **Present.** |
| M6 | 8 s `AbortController` on dictionary lookups. | `dictionaryService.js:3–16`. **Present — see M‑N3 (import concurrency handled).** |
| M7 | Server logs `req.path` only; no `?token=` download fallback. | `server.js:104–110`. **Present.** (Reset/verify tokens still travel in email URLs — inherent to the flow.) |
| M8 | `getMe` field whitelist. | `userController.js:29–39`. **Present.** |
| L1–L6 | Hints limited, dead route removed, login lowercases, CSP added, algorithm pinned. | `server.js:93`; `authController.js:170`; `routes/index.js:83`. **Present.** |

Dependency scan: `npm audit` (root and `backend/`) → **0 known vulnerabilities** in the dependency trees at the time of this audit.

---

## Severity Summary (historical record)

---

## CRITICAL

### C1. Client-trusted `correct` flag — unlimited points / streak / tier / badges fraud
**File:** `roundController.js` `submitRound` (lines 11–27); also `dailyChallengeController.js` `completeDailyChallenge` (line 64).

`POST /rounds` accepts `{ studentId, results: [{ wordId, correct: true, attempts: 1 }] }`. The server **never verifies the spelling** — it trusts the client-supplied boolean `correct` to award:

- points (`word.tier * 10 * (1 + min(streak,10)*0.1)` per word, streak compounding),
- streak, hearts, rounds-completed, automatic tier progression (`accuracy >= 0.8` over 5+ words, lines 82–91), and
- badge rules (`streak`, `points`, `rounds`).

The source comment claims this is "the authoritative version of scoring … so progress can't just be edited on-device" — that is false. An attacker simply declares `correct: true`.

**Attack:**
```
POST /rounds  (Bearer: any parent token)
{ "studentId": "<child>",
  "results": [ { "wordId": "<any seeded word>", "correct": true } x 50 ] }
```
Repeat. Reaches tier 6, 1000+ points, every badge, leaderboard #1 in minutes. `results` has no length cap and `/rounds` has **no rate limit** (the 2 MB body limit is the only brake). Same trust-the-client pattern in `POST /daily-challenge/complete` — client `correct` bool grants +50 points and +1 streak (daily, once/day).

**Fix:** Server-side round verification (server holds the answer or a signed round token; recompute `correct` from submitted spelling). Cap `results`, validate `attempts`, rate-limit `/rounds` and `/daily-challenge/complete`.

---

## HIGH

### H1. Stale JWTs — role/status never re-validated per request
**Files:** `middleware/authMiddleware.js` (jwt.verify only), `authController.js` `signToken` / `refresh`.

`authMiddleware` trusts whatever is in the token (`req.user = payload; next()`). Nothing per-request verifies the account still exists, is still approved, is still email-verified, or still holds the same role. Consequences:

- A suspended/`approvedAt=null` account keeps full access with an old token (up to 7 days).
- A demoted teacher/administrator keeps their old `ADMIN` role from the JWT (every role gate reads `req.user.role`).
- Password change / password reset **does not invalidate existing tokens**; `refresh` re-issues 7-day tokens for any still-existing account.
- A deleted account's token still authenticates on endpoints that don't touch the `account` table (e.g. `/leaderboard`, `/students`).

**Fix:** Load the account in `authMiddleware`, compare role/status, add a `tokenVersion` claim bumped on password change/suspension, and use short-lived access tokens + revocable refresh tokens.

### H4. Weak learner-code authentication (brute-forceable)
**Files:** `studentController.js` `createStudentCode()` — `ST-${crypto.randomInt(1000000, 10000000)}`; `authController.js` `loginWithStudentCode`.

Login requires only the static `studentCode`. Codes are now generated with `crypto.randomInt` (7-digit, 9M space) and the endpoint is rate-limited at 20/min/IP **with a per-IP lockout** (5 failures → 15 min) and expiry of stale failure counters.

**Fix (done):** `crypto.randomInt` ≥ 7 digits; per-IP failure lockout; shared budget. Never use `Math.random` for credentials.

### H6. No rate limits on gameplay / submission endpoints
**Files:** `roundController.js` submit, `dailyChallengeController.js` complete, `hintController.js`.

Only auth endpoints were throttled. `/rounds`, `/daily-challenge/complete`, `/hints` were unlimited — enabling C1 farming and DB write amplification.

**Fix (done):** `/rounds` 600/15 min, `/daily-challenge/complete` 30/15 min, `/hints` 300/15 min per session (`routes/index.js:38–40`); `results` length capped.

---

## MEDIUM

### M1. Global child search & leaderboard leak minors' names/points to any authenticated user
**Files:** `studentController.js` `listStudents`; `leaderboardController.js`.

Any parent, teacher or student session can enumerate every learner's `id`, `name`, `className`, `avatarColor` and the top points/names — privacy exposure of children's data and a basis for targeted harassment.

**Fix (done):** Search/leaderboard scoped to the caller's own account, class and classrooms; results capped and paginated.

### M6. External dictionary calls have no timeout → request DoS
**Files:** `dictionaryService.js`; `adminWordController.js` `importWordsFromCSV`.

A stalled/slow dictionary API holds the Node worker for potentially minutes; imports and lookups hang with no timeout.

**Fix (done):** `AbortController` 8 s timeout; imports processed with a bounded parallelism and overall deadline (see M‑N3).

### M7. Password-reset & verification tokens are written to plaintext server logs
**Files:** `server.js` logs `req.path`; the SPA navigates to `/verify-email?token=...` and `/reset-password?token=...`, which hit the Express SPA fallback and were logged.

**Fix (done):** Log only the pathname, not the query string; tokens never appear in URLs.

### M8. `/users/me` exposes security-token hashes and timestamps
**File:** `userController.js` `getMe` — returns only a whitelist of profile fields; hashes/timestamps are never serialised.

**Fix (done):** Whitelist the returned fields.

---

## LOW / BUGS

| ID | Finding | Notes |
|---|---|---|
| L1 | `/hints` had no rate limit; `/health` disclosed service name. | Minor info/abuse surface. |
| L2 | `getStudent` was **dead code** (no route registers it). | Removed. |
| L3 | Login email not lowercased while every creation path lowercases → a case-mismatched login always fails (functional bug). | Login now lowercases. |
| L4 | No CSP header (only `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`). React escapes XSS by default and no `dangerouslySetInnerHTML` is used, so risk is defense-in-depth. | CSP added; token lives in `localStorage`, so CSP + log hygiene matter. |
| L5 | JWT not pinned to `algorithms: ["HS256"]`. Student-code JWTs carried the parent's role and could be upgraded. | Algorithm pinned; student sessions keep `STUDENT` role + `studentId`, scope-locked to one learner. |

---

## What is done well (not findings)

- Login uses bcrypt compare + generic 401 + dummy-hash timing equalisation; passwords min 8 chars; admin bootstrap requires 12+.
- Password-reset/verify tokens are 256-bit, hashed at rest, expiring, and single-use.
- `requireOwnStudent` and `roleMiddleware` are consistently applied; student-code sessions are scope-locked to one learner.
- Learner profiles, scoring, class management and admin word operations are wrapped in transactions with row-locks against concurrent write races.
- Student codes use `crypto.randomInt`; avatars are raster-only (SVG rejected).
- CSP, `X-Frame-Options`, Referrer-Policy, Permissions-Policy, `nosniff`; no `dangerouslySetInnerHTML`; token never placed in a URL.
- Signup is closed to the demo path; accounts are created by ADMIN/self-signup with role gating.

---

## Attacker's best paths (summary)

1. **Farm everything (C1 / H‑N1):** log in as a parent, download `/wordlists/1..6`, submit `/rounds` with `spelling: word.text` ×100 every 15 min → tier 6, lots of points, all badges, leaderboard #1.
2. **Keep a suspended/demoted account alive (H1):** old token keeps full role/status for up to 7 days.
3. **Brute-force a learner code (H4):** 9M space now, `crypto.randomInt`, per-IP lockout — much harder.

## Recommended priorities

1. Decide the game-economy policy and enforce it honestly: per-student point/streak income caps and tier confirmation (H‑N1).
2. Short-lived access tokens + rotating refresh tokens, TLS-only deployment, guard `seed` with `NODE_ENV` (L‑N5, L‑N6).

---

## Remediation status — previous round (superseded in part by the new findings below)

| ID | Resolution |
|---|---|
| C1 | `roundController.submitRound` and `dailyChallengeController.completeDailyChallenge` now **re-grade from the student's actual `spelling`** against the word bank; the client `correct` flag is ignored; `results` capped at 100, `attempts` clamped 1–10; `/rounds`, `/daily-challenge/complete` are rate-limited. A claimed tier for auto-advance is only accepted when every submitted word belongs to that tier. |
| H1 | `authMiddleware` loads the account every request, rejects revoked `tokenVersion`s, and re-checks approval; password reset and "log out everywhere" bump `tokenVersion`. JWT is pinned to `HS256`. |
| H4 | Student codes use `crypto.randomInt` (7-digit, 9M space) plus a **per-IP lockout** (5 failures → 15 min) in `authController.js`. |
| H6 | Rate limits added for rounds, hints and daily challenge (`routes/index.js`); `results` length caps in place. |
| M1 | `listStudents` and the leaderboard are **scoped to the caller's account/class**; results are capped and paginated. |
| M6 | `dictionaryService.lookupWord` uses an `AbortController` **8s timeout**; imports are bounded-parallel with an overall deadline. |
| M7 | Server logs `req.path` only (no query string); tokens never appear in URLs. |
| M8 | `getMe` returns a **field whitelist**; token hashes/timestamps are never serialised. |
| L1 | `/hints` rate-limited; `/health` still discloses the service name (harmless, kept for ops). |
| L2 | Dead `getStudent` removed from `studentController.js`. |
| L3 | Login lowercases the email (`authController.login`). |
| L4 | Full CSP header added in `server.js` (`default-src 'self'`, Google Fonts allow-listed). |
| L5 | JWT pinned to `algorithms: ["HS256"]`; student-code tokens keep the `STUDENT` role + `studentId` and never inherit the parent's privileges. |

---

## NEW FINDINGS — re-audit of the current tree (16 Aug 2026)

### HIGH

#### H‑N1. The C1 remediation is bypassable: the client legitimately holds every answer, so "server-side grading" still cannot protect the economy
**Files:** `wordController.js:15–22,59` (`GET /wordlists/:tier` returns `text`), `dailyChallengeController.js:54` (`GET /daily-challenge` returns the full word incl. `text`), `roundController.js:40–45` (grading from client-supplied `spelling`).

The previous fix made the server ignore `correct:true` and re-grade from `result.spelling`. But a scripted client simply:

1. logs in (any PARENT account), and
2. downloads every tier via `GET /wordlists/1..6`, obtaining `text` for every word, then
3. submits `POST /rounds` with `{ studentId, results: [{ wordId, spelling: word.text, attempts: 1 } x ≤100] }`.

Every result grades `correct` server-side, so a single automated request yields 100 correct words; with the 600-round / 15 min limiter that is on the order of **millions of points**, instant tier-6, every badge, and a forged leaderboard position.

**Why it is inherent, not accidental:** a voice-first spelling app must ship the plaintext word to the client to read it aloud, so the answers are always recoverable by a tampered client. The server-side re-grade raises the bar from "edit one boolean" to "write a 10-line script" but does not restore economy integrity.

**Bounded by (current code):** `roundController.js` caps `MAX_POINTS_PER_ROUND` (2000), `MAX_STUDENT_POINTS` (500,000), and `MAX_STUDENT_STREAK` (50), applied inside the locking transaction. The exposure itself is inherent to a voice-first speller (noted in the finding) — the caps bound the damage rather than removing it.

---

## What is done well (unchanged, verified)

- bcrypt compare + generic 401 + dummy-hash timing equalisation; password-min rules (8/12 for admin bootstrap).
- Per-request account/role/approval/`tokenVersion` validation; account-suspension kills sessions immediately; HS256 pinned.
- Consistent `requireOwnStudent` / `roleMiddleware` enforcement; student-code sessions are scope-locked to one learner.
- Transactions on scoring, class management and admin operations; row-locks (`FOR UPDATE`) against concurrent write races.
- Password-reset/verify tokens: 256-bit, hashed at rest, expiring, single-use; `tokenVersion` rotation on password change / revoke-all.
- CSP, `X-Frame-Options`, Referrer-Policy, Permissions-Policy, `nosniff`; no `dangerouslySetInnerHTML`; token never placed in a URL.
- Startup guards: weak/default `JWT_SECRET` rejected; `TRUST_PROXY` must be a sane integer; graceful shutdown; DB-outage → 503 (not spurious logout).
- `npm audit`: 0 known vulnerabilities at audit time.

---

## Attacker's best paths (current tree)

1. **Farm everything (H‑N1):** log in as any parent, download `/wordlists/1..6`, submit `/rounds` with `spelling: word.text` ×100 every 15 min → tier 6, lots of points, all badges, leaderboard #1 (bounded by the economy caps).
2. **Keep a suspended/demoted account alive (H1):** old token keeps full role/status for up to 7 days.

## Recommended priorities

1. Decide the game-economy policy and enforce it honestly: per-student point/streak income caps and teacher/admin confirmation for tier promotions (H‑N1).
2. Short-lived access tokens + rotating refresh tokens, TLS-only deployment, guard `seed` with `NODE_ENV` (L‑N5, L‑N6).

---

## Remediation status — new findings (16 Aug 2026)

| ID | Fix (verified in code) |
|---|---|
| H‑N1 | Economy caps in `roundController.js`: `MAX_POINTS_PER_ROUND` (2000), `MAX_STUDENT_POINTS` (500,000), `MAX_STUDENT_STREAK` (50) applied inside the locking transaction. The word-bank exposure itself is inherent to a voice-first speller (noted in the finding) — the caps bound the damage rather than removing it. |
| M‑N1 | `routes/index.js`: rate limits added to rounds, hints, daily challenge, learner/student writes, admin writes, imports (10/15 min) and dictionary lookups (60/15 min). |
| M‑N3 | `services/concurrency.js` (`runWithConcurrency`): the CSV import (`adminWordController`) processes with concurrency 5 and a 45 s overall deadline, returning "import timed out" failures for the remainder; imports are rate-limited (10/15 min). |
| M‑N4 | `authController.js`: the `studentLoginFailures` map expires counters when their window lapses, is hard-capped at 10,000 entries, and is swept on a timer. |
| L‑N2 | `adminAccountController.deleteAccount` calls `clearAccountCache()` so a deleted account's JWT dies immediately instead of after the cache window. |
| L‑N4 | `userController.updateProfile` only accepts raster data-URL avatars (`png|jpe?g|gif|webp|avif`) — SVG is rejected. |
| L‑N5 | `seedWords.js`: `seedDemoAccount()` is skipped when `NODE_ENV=production`; the word/badge catalog still seeds. |
| L‑N6 | `/auth/refresh` is rate-limited (60/15 min per session). Full short-lived-token rotation is a follow-up deployment item (the 7-day JWT remains). |
| L‑N7 | `rateLimit.js` supports a shared Redis-backed store when `REDIS_URL` is set (dynamically requires `redis`; in-memory store remains the default), and each limiter instance now namespaces its own budget so limiters no longer share buckets. |
| L‑N8 | `emailService.js` wraps upstream fetch (Resend) in a 10 s `AbortController` timeout. |
| L‑N10 | `/health` no longer discloses the service name. |
