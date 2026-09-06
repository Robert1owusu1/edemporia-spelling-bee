// Automated end-to-end verification for the Spelling Bee API.
//
// Exercises every public subsystem -- authentication, students, placement,
// word lists, the daily challenge, rounds (server-side grading), hints,
// badges, preferences, the leaderboard, classrooms, the admin word bank and
// admin account management -- plus the access-control boundaries between
// account roles. Runs against a running backend (default http://localhost:4000)
// and a live seeded database, then removes the test data it created, so it is
// safe to re-run.
//
// Usage:
//   node scripts/e2eTest.js               # against http://localhost:4000
//   API_BASE_URL=http://host:port node scripts/e2eTest.js

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const API_BASE_URL = (process.env.API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");

// ---------------------------------------------------------------------------
// Tiny scenario runner
// ---------------------------------------------------------------------------

function assert(condition, message) {
  if (!condition) throw new Error(message || "assertion failed");
}

function assertStatus(res, expected, label) {
  assert(res.status === expected, `${label}: expected HTTP ${expected}, got ${res.status} ${JSON.stringify(res.body)}`);
}

async function request(method, path, { token, body } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let res;
  let transportError;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch (error) {
    return { status: 0, body: null, transportError: error.message };
  }
  let parsed;
  try { parsed = await res.json(); } catch { parsed = null; }
  return { status: res.status, body: parsed, transportError };
}

const api = {
  get: (path, token) => request("GET", path, { token }),
  post: (path, body, token) => request("POST", path, { body, token }),
  patch: (path, body, token) => request("PATCH", path, { body, token }),
  del: (path, token) => request("DELETE", path, { token }),
};

// ---------------------------------------------------------------------------
// Test-run data
// ---------------------------------------------------------------------------

const run = Date.now();
const emails = {
  parentOne: `e2e-parent1-${run}@example.test`,
  parentTwo: `e2e-parent2-${run}@example.test`,
  teacher: `e2e-teacher-${run}@example.test`,
};
const passwords = {
  parentOne: `E2e-Password-${run}`,
  parentTwo: `E2e-Password-${run}`,
  teacher: `E2e-Password-${run}`,
  reset: `E2e-Reset-${run}-new`,
};

let adminToken;
let tokenParentOne;
let tokenParentTwo;
let tokenTeacher;
let tokenStudent;
let idStudent;
let codeStudent;
let todayWord;
let tierOneWords = [];
let teacherClassroomId;
let classroomId;
let manualWordId;
let teacherId;
const createdWordTexts = new Set();

const ssl = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false" ? { rejectUnauthorized: false } : undefined;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl }) });

// Direct DB pass used as a safety net if any API cleanup step fails.
async function directCleanup() {
  // Classrooms reference their owner (teacher) account, so drop them first
  // (the teacher account is deleted below).
  await prisma.classroom.deleteMany({ where: { name: { startsWith: "E2E-" } } });
  const accounts = await prisma.account.findMany({ where: { email: { in: Object.values(emails) } }, select: { id: true } });
  for (const account of accounts) {
    const studentRows = await prisma.student.findMany({ where: { accountId: account.id }, select: { id: true } });
    const ids = studentRows.map((s) => s.id);
    if (ids.length) {
      await prisma.progress.deleteMany({ where: { studentId: { in: ids } } });
      await prisma.studentBadge.deleteMany({ where: { studentId: { in: ids } } });
      await prisma.studentPreference.deleteMany({ where: { studentId: { in: ids } } });
      await prisma.dailyChallengeCompletion.deleteMany({ where: { studentId: { in: ids } } });
      await prisma.practiceSession.deleteMany({ where: { studentId: { in: ids } } });
      await prisma.student.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.accountPreference.deleteMany({ where: { accountId: account.id } });
    await prisma.auditLog.deleteMany({ where: { accountId: account.id } });
    await prisma.account.delete({ where: { id: account.id } });
  }
  for (const text of createdWordTexts) {
    const word = await prisma.word.findFirst({ where: { text } });
    if (!word) continue;
    await prisma.progress.deleteMany({ where: { wordId: word.id } });
    await prisma.word.delete({ where: { id: word.id } });
  }
}

let passed = 0;
let failed = 0;
const failures = [];

async function scenario(number, label, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok   ${String(number).padStart(2, " ")}. ${label}`);
  } catch (error) {
    failed += 1;
    failures.push(`${number}. ${label}: ${error.message}`);
    console.log(`  FAIL ${String(number).padStart(2, " ")}. ${label}\n       ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

async function main() {
  // 1. Health
  await scenario(1, "health endpoint reports ok", async () => {
    const res = await api.get("/health");
    assertStatus(res, 200, "health");
    assert(res.body && res.body.status === "ok", `status=${res.body && res.body.status}`);
  });

  // 2. Closed self-registration
  await scenario(2, "self-registration is closed (admin-created accounts only)", async () => {
    const res = await api.post("/auth/signup", { email: `new-${run}@example.test`, password: "whatever1", role: "parent" });
    assertStatus(res, 403, "signup");
    assert(res.body.registrationClosed === true, "registrationClosed flag not returned");
  });

  // 3. Platform admin login
  await scenario(3, "platform admin login", async () => {
    const res = await api.post("/auth/login", {
      email: process.env.PLATFORM_ADMIN_EMAIL,
      password: process.env.PLATFORM_ADMIN_PASSWORD,
    });
    assertStatus(res, 200, "admin login");
    assert(res.body.token, "no token returned");
    assert(res.body.account.role === "admin", `role=${res.body.account && res.body.account.role}`);
    adminToken = res.body.token;
  });

  // 4. Admin creates a parent account
  await scenario(4, "admin creates and approves a parent account", async () => {
    const res = await api.post("/admin/accounts", { email: emails.parentOne, password: passwords.parentOne, name: "E2E Parent One", role: "parent" }, adminToken);
    assertStatus(res, 201, "create parent");
    assert(res.body.role === "parent", `role=${res.body.role}`);
    const approved = await api.patch(`/admin/accounts/${res.body.id}`, { approve: true }, adminToken);
    assertStatus(approved, 200, "approve parent");
  });

  // 5. Parent login
  await scenario(5, "parent login returns the account and its learners", async () => {
    const res = await api.post("/auth/login", { email: emails.parentOne, password: passwords.parentOne });
    assertStatus(res, 200, "parent login");
    assert(res.body.token, "no token returned");
    assert(Array.isArray(res.body.students), "students is not an array");
    tokenParentOne = res.body.token;
  });

  // 6. Parent creates a learner profile with an ST-XXXXX code
  await scenario(6, "parent creates a learner with an ST-XXXXX code", async () => {
    const res = await api.post("/students", { name: "E2E Speller", age: 8, className: "E2E-Section" }, tokenParentOne);
    assertStatus(res, 201, "create student");
    assert(/^ST-\d{7}$/.test(res.body.studentCode || ""), `code=${res.body.studentCode}`);
    idStudent = res.body.id;
    codeStudent = res.body.studentCode;
  });

  // 7. Parent lists learners
  await scenario(7, "parent lists their learners", async () => {
    const res = await api.get("/students", tokenParentOne);
    assertStatus(res, 200, "list students");
    assert(Array.isArray(res.body) && res.body.some((s) => s.id === idStudent), "created learner missing from list");
  });

  // 8. Placement is learner-only
  await scenario(8, "a parent cannot run the placement quiz for the learner (403)", async () => {
    const res = await api.post(`/students/${idStudent}/placement`, { tier: 3 }, tokenParentOne);
    assertStatus(res, 403, "parent placement");
  });

  // 9. Student-code login scopes to the single learner (and refresh keeps it)
  await scenario(9, "student-code login is scoped to the learner and refresh keeps the scope", async () => {
    const res = await api.post("/auth/student-login", { studentCode: codeStudent });
    assertStatus(res, 200, "student login");
    assert(res.body.account.role === "student" && res.body.account.studentId === idStudent, "student session not scoped");
    tokenStudent = res.body.token;
    const refresh = await api.post("/auth/refresh", {}, tokenStudent);
    assertStatus(refresh, 200, "refresh");
    assert(refresh.body.token, "refresh returned no token");
    const studentsAfter = await api.get("/students", refresh.body.token);
    assertStatus(studentsAfter, 200, "students after refresh");
    assert(studentsAfter.body.length === 1 && studentsAfter.body[0].id === idStudent, "refresh widened the student scope");
  });

  // 10. Learner sets a starting tier through placement
  await scenario(10, "learner placement sets a starting tier (tier 1)", async () => {
    const res = await api.post(`/students/${idStudent}/placement`, { tier: 1 }, tokenStudent);
    assertStatus(res, 200, "placement");
    assert(res.body.currentTier === 1, `currentTier=${res.body.currentTier}`);
  });

  // 11. Tier word lists
  await scenario(11, "tier word lists return only that tier's words", async () => {
    const res = await api.get(`/wordlists/1?studentId=${idStudent}`, tokenStudent);
    assertStatus(res, 200, "wordlist");
    assert(Array.isArray(res.body.words) && res.body.words.length >= 5, `words=${res.body.words && res.body.words.length}`);
    assert(res.body.words.every((w) => w.tier === 1), "word list contains words from another tier");
    tierOneWords = res.body.words;
  });

  // 12. Daily challenge (word of the day)
  await scenario(12, "daily challenge returns today's deterministic word", async () => {
    const res = await api.get(`/daily-challenge?studentId=${idStudent}`, tokenStudent);
    assertStatus(res, 200, "daily challenge");
    assert(res.body.word && res.body.word.text, "no word returned");
    assert(res.body.completedToday === false, `completedToday=${res.body.completedToday}`);
    todayWord = res.body.word;
  });

  // 13. Daily challenge completion (+50, streak +1)
  await scenario(13, "daily challenge completion is graded and awards the +50 bonus", async () => {
    const res = await api.post("/daily-challenge/complete", { studentId: idStudent, wordId: todayWord.id, spelling: todayWord.text }, tokenStudent);
    assertStatus(res, 201, "daily complete");
    assert(res.body.correct === true && res.body.pointsAwarded === 50, `correct=${res.body.correct} awarded=${res.body.pointsAwarded}`);
  });

  // 14. Duplicate daily completion
  await scenario(14, "a learner can only complete the daily challenge once (409)", async () => {
    const res = await api.post("/daily-challenge/complete", { studentId: idStudent, wordId: todayWord.id, spelling: todayWord.text }, tokenStudent);
    assertStatus(res, 409, "duplicate daily");
  });

  // 15. Completion state reflected
  await scenario(15, "completedToday is reported for the learner", async () => {
    const res = await api.get(`/daily-challenge?studentId=${idStudent}`, tokenStudent);
    assertStatus(res, 200, "daily state");
    assert(res.body.completedToday === true && res.body.correctToday === true, `completedToday=${res.body.completedToday}`);
  });

  const cat = tierOneWords.find((w) => w.text === "cat");
  const dog = tierOneWords.find((w) => w.text === "dog");
  const apple = tierOneWords.find((w) => w.text === "apple");
  assert(cat && dog && apple, "tier-1 words cat/dog/apple are missing from the seeded word bank");

  // 16. Server-side round grading (correct spelling)
  await scenario(16, "a round with a correctly spelled word is graded and scores points", async () => {
    const res = await api.post("/rounds", {
      studentId: idStudent,
      results: [{ wordId: cat.id, correct: true, attempts: 1, spelling: "cat" }],
      tier: 1,
      durationSeconds: 30,
    }, tokenStudent);
    assertStatus(res, 200, "round");
    assert(res.body.pointsEarned >= 10, `pointsEarned=${res.body.pointsEarned}`);
    assert(res.body.streak >= 1, `streak=${res.body.streak}`);
  });

  // 17. Multi-word round, streak and badge
  await scenario(17, "a multi-word round extends the streak and triggers a badge rule", async () => {
    const res = await api.post("/rounds", {
      studentId: idStudent,
      results: [
        { wordId: dog.id, correct: true, attempts: 1, spelling: "dog" },
        { wordId: apple.id, correct: true, attempts: 1, spelling: "apple" },
      ],
      tier: 1,
      durationSeconds: 45,
    }, tokenStudent);
    assertStatus(res, 200, "round");
    // +1 from the daily challenge, +1 round A, +2 round B = 4 (First Steps: streak:3)
    assert(res.body.streak >= 3, `streak=${res.body.streak}`);
    assert(Array.isArray(res.body.earnedBadges), "earnedBadges missing");
  });

  // 18. Tampered client flag ignored
  await scenario(18, "the client's correct flag is ignored -- the server re-grades the spelling", async () => {
    const before = await api.get("/students", tokenParentOne);
    const b = before.body.find((s) => s.id === idStudent);
    const res = await api.post("/rounds", {
      studentId: idStudent,
      results: [{ wordId: cat.id, correct: true, attempts: 1, spelling: "katt" }], // misspelled but claims correct
      tier: 1,
    }, tokenStudent);
    assertStatus(res, 200, "round");
    const after = await api.get("/students", tokenParentOne);
    const a = after.body.find((s) => s.id === idStudent);
    assert(a.hearts === b.hearts - 1, `hearts ${b.hearts} -> ${a.hearts} (expected -1)`);
    assert(a.streak === 0, `streak reset to 0? got ${a.streak}`);
  });

  // 19. Unknown word in a round
  await scenario(19, "a round referencing an unknown word is rejected (404)", async () => {
    const res = await api.post("/rounds", { studentId: idStudent, results: [{ wordId: "definitely-not-a-word", spelling: "x" }], tier: 1 }, tokenStudent);
    assertStatus(res, 404, "round");
  });

  // 20. Hints
  await scenario(20, "hint endpoint returns a hint from the word", async () => {
    const word = tierOneWords[0];
    const res = await api.post("/hints", { wordId: word.id }, tokenStudent);
    assertStatus(res, 200, "hint");
    assert(typeof res.body.hint === "string" && res.body.hint.length > 0, "empty hint");
  });

  // 21. Learner preferences
  await scenario(21, "learner accessibility preferences persist", async () => {
    const before = await api.get(`/students/${idStudent}/preferences`, tokenStudent);
    assertStatus(before, 200, "get prefs");
    assert(before.body.darkMode === false && before.body.textSize === "normal", `defaults ${JSON.stringify(before.body)}`);
    const updated = await api.patch(`/students/${idStudent}/preferences`, { darkMode: true, textSize: "large" }, tokenStudent);
    assertStatus(updated, 200, "update prefs");
    const after = await api.get(`/students/${idStudent}/preferences`, tokenStudent);
    assert(after.body.darkMode === true && after.body.textSize === "large", `persisted ${JSON.stringify(after.body)}`);
  });

  // 22. Account preferences and profile
  await scenario(22, "account preferences and profile updates persist", async () => {
    const profile = await api.patch("/users/me/profile", { name: "E2E Parent One Updated" }, tokenParentOne);
    assertStatus(profile, 200, "profile patch");
    assert(profile.body.name === "E2E Parent One Updated", `name=${profile.body.name}`);
    const prefs = await api.get("/users/me/preferences", tokenParentOne);
    assertStatus(prefs, 200, "get account prefs");
    const updated = await api.patch("/users/me/preferences", { darkMode: true, textSize: "large" }, tokenParentOne);
    assertStatus(updated, 200, "update account prefs");
    assert(updated.body.darkMode === true, "account darkMode not persisted");
  });

  // 23. Leaderboard scoped for a parent
  await scenario(23, "the parent leaderboard is scoped to their own learners", async () => {
    const res = await api.get("/leaderboard", tokenParentOne);
    assertStatus(res, 200, "leaderboard");
    assert(Array.isArray(res.body) && res.body.length >= 1, "leaderboard empty");
    assert(res.body.every((entry) => entry.studentId === idStudent), "parent leaderboard leaks other learners");
  });

  // 24. Second parent created (used for access-control checks)
  await scenario(24, "admin creates and approves a second parent account", async () => {
    const res = await api.post("/admin/accounts", { email: emails.parentTwo, password: passwords.parentTwo, name: "E2E Parent Two", role: "parent" }, adminToken);
    assertStatus(res, 201, "create parent two");
    const approved = await api.patch(`/admin/accounts/${res.body.id}`, { approve: true }, adminToken);
    assertStatus(approved, 200, "approve parent two");
    const login = await api.post("/auth/login", { email: emails.parentTwo, password: passwords.parentTwo });
    assertStatus(login, 200, "parent two login");
    tokenParentTwo = login.body.token;
  });

  // 25. Classrooms (admin)
  await scenario(25, "admin creates, lists and assigns learners to classrooms", async () => {
    const created = await api.post("/classrooms", { name: "E2E-Section", grade: "Primary 3" }, adminToken);
    assertStatus(created, 201, "create class");
    classroomId = created.body.id;
    const assigned = await api.post(`/classrooms/${classroomId}/students`, { studentId: idStudent }, adminToken);
    assertStatus(assigned, 200, "assign student");
    assert(assigned.body.classroomId === classroomId, `classroomId=${assigned.body.classroomId}`);
    const list = await api.get("/classrooms", adminToken);
    assertStatus(list, 200, "list classes");
    assert(list.body.some((c) => c.id === classroomId), "classroom missing from list");
  });

  // 26. Teacher account created
  await scenario(26, "admin creates a teacher account", async () => {
    const res = await api.post("/admin/accounts", { email: emails.teacher, password: passwords.teacher, name: "E2E Teacher", role: "teacher" }, adminToken);
    assertStatus(res, 201, "create teacher");
    assert(res.body.role === "teacher" && res.body.approvedAt === null, `approved=${res.body.approvedAt}`);
    teacherId = res.body.id;
  });

  // 27. Unapproved teacher blocked
  await scenario(27, "an un-approved teacher cannot log in (403)", async () => {
    const res = await api.post("/auth/login", { email: emails.teacher, password: passwords.teacher });
    assertStatus(res, 403, "teacher login");
    assert(res.body.approvalRequired === true, "approvalRequired flag missing");
  });

  // 28. Admin approves teacher and links a classroom
  await scenario(28, "admin approves the teacher and assigns the classroom", async () => {
    const approved = await api.patch(`/admin/accounts/${teacherId}`, { approve: true }, adminToken);
    assertStatus(approved, 200, "approve teacher");
    assert(approved.body.approvedAt !== null, "approvedAt not set");
    const linked = await api.patch(`/classrooms/${classroomId}`, { teacherId }, adminToken);
    assertStatus(linked, 200, "link class");
  });

  // 29. Teacher login
  await scenario(29, "the approved teacher can log in", async () => {
    const res = await api.post("/auth/login", { email: emails.teacher, password: passwords.teacher });
    assertStatus(res, 200, "teacher login");
    tokenTeacher = res.body.token;
  });

  // 30. Teacher manages classrooms
  await scenario(30, "teacher lists and creates own classrooms", async () => {
    const list = await api.get("/classrooms", tokenTeacher);
    assertStatus(list, 200, "teacher classes");
    assert(list.body.some((c) => c.id === classroomId), "teacher does not see their classroom");
    const created = await api.post("/classrooms", { name: "E2E-Teacher-Section", grade: "Primary 2" }, tokenTeacher);
    assertStatus(created, 201, "teacher create class");
    teacherClassroomId = created.body.id;
  });

  // 31. Teacher sees class learners
  await scenario(31, "teacher sees the learners in their class", async () => {
    const res = await api.get("/students", tokenTeacher);
    assertStatus(res, 200, "teacher students");
    assert(res.body.some((s) => s.id === idStudent), "teacher cannot see their learner");
  });

  // 32. Manual word create + update
  await scenario(32, "admin creates and updates a word in the shared word bank", async () => {
    const created = await api.post("/admin/words", { text: "plumbuzz", tier: 2, definition: "A harmless invented spelling-bee word.", exampleSentence: "The plumbuzz is a friendly creature." }, adminToken);
    assertStatus(created, 201, "create word");
    manualWordId = created.body.id;
    createdWordTexts.add(created.body.text);
    const updated = await api.patch(`/admin/words/${manualWordId}`, { tier: 3, definition: "An updated invented spelling-bee word." }, adminToken);
    assertStatus(updated, 200, "update word");
    assert(updated.body.tier === 3, `tier=${updated.body.tier}`);
  });

  // 33. Dictionary-sourced import (graceful degradation offline)
  await scenario(33, "dictionary lookup / import degrades gracefully when the service is unavailable", async () => {
    const imported = await api.post("/admin/words/from-dictionary", { text: "snargloo", tier: 1 }, adminToken);
    assertStatus(imported, 201, "from-dictionary");
    assert(imported.body.text === "snargloo" && imported.body.definition, "word text/definition missing");
    createdWordTexts.add(imported.body.text);
    const lookup = await api.post("/admin/words/lookup", { text: "serendipity" }, adminToken);
    // A real entry when the public dictionary is reachable, a clean 404/503
    // error code otherwise -- either way the endpoint answered over HTTP.
    assert([200, 404, 503].includes(lookup.status), `lookup status=${lookup.status}`);
  });

  // 34. CSV import
  await scenario(34, "CSV import returns per-row results (added / skipped)", async () => {
    const res = await api.post("/admin/words/import-csv", {
      words: [
        { text: "snargloo", tier: 1 },   // imported in scenario 33 -> skipped
        { text: "blornk", tier: 2 },     // new -> added
      ],
    }, adminToken);
    assertStatus(res, 200, "csv import");
    assert(res.body.results.skipped.length >= 1, `skipped=${res.body.results.skipped.length}`);
    assert(res.body.results.successful.length >= 1, `added=${res.body.results.successful.length}`);
    for (const word of res.body.results.successful) createdWordTexts.add(word.text);
  });

  // 35. Admin word list
  await scenario(35, "the admin word list contains the managed words", async () => {
    const res = await api.get("/admin/words", adminToken);
    assertStatus(res, 200, "list words");
    assert(res.body.some((w) => w.text === "plumbuzz") && res.body.some((w) => w.text === "blornk"), "created words missing from list");
  });

  // 36. Word delete
  await scenario(36, "admin can delete a word from the word bank (204)", async () => {
    const res = await api.del(`/admin/words/${manualWordId}`, adminToken);
    assertStatus(res, 204, "delete word");
    createdWordTexts.delete("plumbuzz");
  });

  // 37. Cross-account boundaries
  await scenario(37, "another parent cannot act on someone else's learner (403)", async () => {
    const rounds = await api.post("/rounds", { studentId: idStudent, results: [{ wordId: cat.id, correct: true, attempts: 1, spelling: "cat" }], tier: 1 }, tokenParentTwo);
    assertStatus(rounds, 403, "cross-account rounds");
    const tier = await api.patch(`/students/${idStudent}`, { currentTier: 6 }, tokenParentTwo);
    assertStatus(tier, 403, "cross-account tier edit");
  });

  // 38. Password reset (dev: link returned by the API)
  await scenario(38, "password reset issues a dev link and confirms a new password", async () => {
    const requested = await api.post("/auth/password-reset/request", { email: emails.parentTwo });
    assertStatus(requested, 200, "reset request");
    assert(typeof requested.body.resetUrl === "string" && requested.body.resetUrl.includes("token="), "no dev resetUrl returned");
    const tokenParam = decodeURIComponent(requested.body.resetUrl.split("token=")[1]);
    const confirmed = await api.post("/auth/password-reset/confirm", { token: tokenParam, password: passwords.reset });
    assertStatus(confirmed, 200, "reset confirm");
    const login = await api.post("/auth/login", { email: emails.parentTwo, password: passwords.reset });
    assertStatus(login, 200, "login with new password");
  });

  // 39. Student session cannot create profiles
  await scenario(39, "a student session cannot create profiles (403)", async () => {
    const res = await api.post("/students", { name: "Sneaky", age: 9, className: "Hack" }, tokenStudent);
    assertStatus(res, 403, "student create profile");
  });

  // 40. Student session cannot edit its own profile; leaderboard stays scoped
  await scenario(40, "a student session cannot edit its profile and its leaderboard stays scoped", async () => {
    const edited = await api.patch(`/students/${idStudent}`, { name: "Renamed" }, tokenStudent);
    assertStatus(edited, 403, "student edit profile");
    const leaderboard = await api.get("/leaderboard", tokenStudent);
    assertStatus(leaderboard, 200, "student leaderboard");
    assert(leaderboard.body.every((entry) => entry.studentId === idStudent), "student leaderboard leaks other learners");
  });

  // -------------------------------------------------------------------------
  // Cleanup -- back out everything the test created
  // -------------------------------------------------------------------------
  console.log("\nCleaning up test data...");
  try {
    for (const text of [...createdWordTexts]) {
      const words = await prisma.word.findMany({ where: { text } });
      for (const word of words) {
        await prisma.progress.deleteMany({ where: { wordId: word.id } });
        await prisma.word.delete({ where: { id: word.id } });
      }
    }
    await directCleanup();
  } catch (cleanupError) {
    console.warn(`Cleanup warning: ${cleanupError.message}`);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("");
  if (failed === 0) {
    console.log(`E2E: ${passed}/${passed + failed} scenarios passed.`);
  } else {
    console.log(`E2E: ${passed}/${passed + failed} scenarios passed, ${failed} failed.`);
    for (const failure of failures) console.log(`  FAILED: ${failure}`);
  }
  await prisma.$disconnect().catch(() => {});
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error("E2E run errored:", error);
  try { await directCleanup(); await prisma.$disconnect(); } catch {}
  process.exit(1);
});