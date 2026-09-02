const prisma = require("../db/prismaClient");

// POST /hints -- Body: { wordId }
// The app uses the stored example sentence as a simple, reliable hint source.
async function getHint(req, res) {
  const { wordId } = req.body;

  const word = await prisma.word.findUnique({
    where: { id: String(wordId || "") },
  });
  if (!word) return res.status(404).json({ error: "Word not found" });

  const hint = word.exampleSentence || `Think about the word "${word.text}" and say it slowly before you spell it.`;
  return res.json({ hint, source: "local" });
}

module.exports = { getHint };
