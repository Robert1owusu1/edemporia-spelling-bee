const prisma = require("../db/prismaClient");
const { lookupWord } = require("../services/dictionaryService");
const { audit } = require("../services/auditService");
const { runWithConcurrency } = require("../services/concurrency");

// Imports process with limited concurrency and an overall deadline so a batch
// of dictionary lookups (each up to 8s) can never hold the request open for
// minutes. The import endpoints are also rate-limited.
const IMPORT_CONCURRENCY = 5;
const IMPORT_DEADLINE_MS = 45 * 1000;

// Administrators and teachers share one school-wide word bank -- there are no
// separate organisation namespaces anymore.
function teacherCanManage(req) {
  return req.user.role === "ADMIN" || req.user.role === "TEACHER";
}

// Word.text is enforced unique by the database (Word_text_key), and every
// write path lower-cases the text first, so duplicates can only appear in a
// race between two simultaneous requests. This findFirst stays as a friendly
// pre-check: it turns the common case into a clean 409 before Prisma's
// P2002 would surface as an error.
async function findDuplicate(text) {
  return prisma.word.findFirst({ where: { text } });
}

// `category` is a free-text tag: anything that is not a string (or absent)
// would previously reach `.trim()` and crash the request with a 500.
function normalizedCategory(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  return value.trim() || null;
}

// Helper function for word payload validation
function wordPayload(body) {
  const tier = Number(body.tier);
  if (
    !body.text?.trim() ||
    !body.definition?.trim() ||
    !body.exampleSentence?.trim() ||
    !Number.isInteger(tier) ||
    tier < 1 ||
    tier > 6
  )
    return null;
  const category = normalizedCategory(body.category);
  if (category === undefined) return null;
  return {
    text: body.text.trim().toLowerCase(),
    tier,
    category,
    definition: body.definition.trim(),
    exampleSentence: body.exampleSentence.trim(),
  };
}

// List all words
async function listWords(req, res) {
  if (!teacherCanManage(req))
    return res.status(403).json({ error: "Only teachers and administrators can manage the word bank" });
  return res.json(
    await prisma.word.findMany({
      orderBy: [{ tier: "asc" }, { text: "asc" }],
    }),
  );
}

// Create a word manually
async function createWord(req, res) {
  if (!teacherCanManage(req))
    return res.status(403).json({ error: "Only teachers and administrators can manage the word bank" });
  const data = wordPayload(req.body);
  if (!data) {
    return res.status(400).json({
      error: "text, tier (1-6), definition, and exampleSentence are required (category must be text when provided)",
    });
  }
  if (await findDuplicate(data.text)) {
    return res.status(409).json({ error: "A word with that text already exists" });
  }
  const word = await prisma.word.create({ data: { ...data } });
  await audit(req.user.id, "word.created", word.id, { text: word.text });
  return res.status(201).json(word);
}

// Create a word from dictionary lookup
async function createWordFromDictionary(req, res) {
  if (!teacherCanManage(req))
    return res.status(403).json({ error: "Only teachers and administrators can manage the word bank" });
  const tier = Number(req.body.tier);
  if (!Number.isInteger(tier) || tier < 1 || tier > 6) {
    return res.status(400).json({ error: "tier must be between 1 and 6" });
  }
  const category = normalizedCategory(req.body.category);
  if (category === undefined) return res.status(400).json({ error: "category must be text when provided" });

  try {
    let entry;
    try {
      entry = await lookupWord(req.body.text);
    } catch {
      const text = String(req.body.text || "")
        .trim()
        .toLowerCase();
      if (!/^[a-z-]{2,}$/.test(text)) return res.status(400).json({ error: "Enter a valid English word" });
      entry = {
        text,
        category: category || "Vocabulary",
        definition: `A spelling vocabulary word: ${text}.`,
        exampleSentence: `We practiced the word "${text}" in class today.`,
      };
    }
    if (await findDuplicate(entry.text)) {
      return res.status(409).json({ error: "A word with that text already exists" });
    }
    const word = await prisma.word.create({
      data: {
        ...entry,
        tier,
        category: category || entry.category,
      },
    });
    await audit(req.user.id, "word.dictionary_imported", word.id, { text: word.text });
    return res.status(201).json(word);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.message || "Unable to import this word",
    });
  }
}

// Look up a word in the dictionary without saving
async function lookupDictionaryWord(req, res) {
  try {
    return res.json(await lookupWord(req.body.text));
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.message || "Unable to look up this word",
    });
  }
}

// Update an existing word. Accepts a partial payload -- only the fields
// provided are changed, so PATCH semantics work from the admin UI.
async function updateWord(req, res) {
  if (!teacherCanManage(req))
    return res.status(403).json({ error: "Only teachers and administrators can manage the word bank" });
  const existing = await prisma.word.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Word not found" });

  const data = {};
  if (typeof req.body.text === "string" && req.body.text.trim()) data.text = req.body.text.trim().toLowerCase();
  if (req.body.tier !== undefined) {
    const tier = Number(req.body.tier);
    if (!Number.isInteger(tier) || tier < 1 || tier > 6)
      return res.status(400).json({ error: "tier must be between 1 and 6" });
    data.tier = tier;
  }
  if (typeof req.body.definition === "string") {
    if (!req.body.definition.trim()) return res.status(400).json({ error: "definition cannot be empty" });
    data.definition = req.body.definition.trim();
  }
  if (typeof req.body.exampleSentence === "string") {
    if (!req.body.exampleSentence.trim()) return res.status(400).json({ error: "exampleSentence cannot be empty" });
    data.exampleSentence = req.body.exampleSentence.trim();
  }
  if (req.body.category !== undefined) {
    const category = normalizedCategory(req.body.category);
    if (category === undefined) return res.status(400).json({ error: "category must be text" });
    data.category = category;
  }
  if (!Object.keys(data).length) return res.status(400).json({ error: "No valid fields to update" });

  // Friendly pre-check for the common case; the unique index on Word.text is
  // what actually enforces this (see findDuplicate).
  if (data.text && data.text !== existing.text && (await findDuplicate(data.text))) {
    return res.status(409).json({ error: "A word with that text already exists" });
  }

  try {
    const word = await prisma.word.update({
      where: { id: req.params.id },
      data,
    });
    await audit(req.user.id, "word.updated", word.id, { text: word.text });
    return res.json(word);
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Word not found" });
    throw error;
  }
}

// Delete a word -- but only when no learner has ever spelled it: Progress
// rows are learner history and must never be destroyed by content cleanup
// (the Progress -> Word FK is RESTRICT for the same reason).
async function deleteWord(req, res) {
  if (!teacherCanManage(req))
    return res.status(403).json({ error: "Only teachers and administrators can manage the word bank" });
  const target = await prisma.word.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "Word not found" });
  const learnerRows = await prisma.progress.count({ where: { wordId: target.id } });
  if (learnerRows > 0) {
    return res.status(409).json({
      error:
        "This word has learner progress and cannot be deleted. Archive it in the word bank instead so history is preserved.",
    });
  }
  try {
    await prisma.word.delete({ where: { id: target.id } });
    await audit(req.user.id, "word.deleted", req.params.id);
    return res.status(204).end();
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Word not found" });
    // P2003/P2014 style FK failures (e.g. a completion row referencing the
    // word) must not become an opaque 500.
    if (error.code === "P2003")
      return res.status(409).json({ error: "This word is still referenced and cannot be deleted." });
    throw error;
  }
}

// Import words from CSV
async function importWordsFromCSV(req, res) {
  const { words } = req.body;

  if (!teacherCanManage(req))
    return res.status(403).json({ error: "Only teachers and administrators can manage the word bank" });
  if (!Array.isArray(words) || words.length === 0) {
    return res.status(400).json({
      error: "Please provide an array of words to import",
    });
  }

  if (words.length > 100) {
    return res.status(400).json({
      error: "Maximum 100 words can be imported at once",
    });
  }

  // Validate category types up front so a bad row is a clear 400 for the
  // whole batch instead of a crash deep inside the per-row import.
  const badCategory = words.find(
    (row) => row && row.category !== undefined && row.category !== null && typeof row.category !== "string",
  );
  if (badCategory) {
    return res.status(400).json({ error: "category must be a text value on every word" });
  }

  const results = {
    successful: [],
    failed: [],
    skipped: [],
  };

  // Reject duplicate texts within the same batch before touching the DB.
  const seenInBatch = new Set();
  const startedAt = Date.now();
  const outcomes = await runWithConcurrency(words, IMPORT_CONCURRENCY, async (wordData, index) => {
    const row = index + 1;
    if (Date.now() - startedAt > IMPORT_DEADLINE_MS) {
      return { status: "failed", row, data: wordData, error: "Import timed out — please import in smaller batches" };
    }
    try {
      if (!wordData.text || typeof wordData.text !== "string") {
        return { status: "failed", row, data: wordData, error: "Missing or invalid 'text' field" };
      }

      const tier = Number(wordData.tier);
      if (isNaN(tier) || tier < 1 || tier > 6) {
        return { status: "failed", row, data: wordData, error: "Tier must be between 1 and 6" };
      }

      const text = wordData.text.trim().toLowerCase();
      if (seenInBatch.has(text)) {
        return { status: "skipped", row, data: wordData, reason: "Duplicate word in this import batch" };
      }
      seenInBatch.add(text);

      // Check if the word already exists in the shared school word bank
      // (friendly skip; Word_text_key is what actually enforces uniqueness).
      const existing = await prisma.word.findFirst({ where: { text } });

      if (existing) {
        return { status: "skipped", row, data: wordData, reason: "Word already exists in database" };
      }

      // Use the dictionary when it is available, but importing a valid CSV
      // must not depend on a public service being online or complete.
      let entry;
      try {
        entry = await lookupWord(text);
      } catch {
        entry = {
          text,
          category: wordData.category?.trim() || "Vocabulary",
          definition: `A spelling vocabulary word: ${text}.`,
          exampleSentence: `We practiced the word "${text}" in class today.`,
        };
      }

      // Create the word
      const word = await prisma.word.create({
        data: {
          text: entry.text,
          tier: tier,
          category: wordData.category?.trim() || entry.category || "Vocabulary",
          definition: entry.definition,
          exampleSentence: entry.exampleSentence,
        },
      });

      await audit(req.user.id, "word.imported_csv", word.id, {
        text: word.text,
        tier: word.tier,
      });

      return { status: "successful", row, data: word };
    } catch (error) {
      return { status: "failed", row, data: wordData, error: error.message || "Unknown error occurred" };
    }
  });

  for (const outcome of outcomes) {
    if (outcome.status === "successful") results.successful.push(outcome.data);
    else if (outcome.status === "skipped")
      results.skipped.push({ row: outcome.row, data: outcome.data, reason: outcome.reason });
    else results.failed.push({ row: outcome.row, data: outcome.data, error: outcome.error });
  }

  return res.status(200).json({
    message: `Import complete: ${results.successful.length} added, ${results.skipped.length} skipped, ${results.failed.length} failed`,
    total: words.length,
    results,
  });
}

// Export all functions
module.exports = {
  listWords,
  createWord,
  createWordFromDictionary,
  lookupDictionaryWord,
  updateWord,
  deleteWord,
  importWordsFromCSV,
};
