require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const ssl = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false" ? { rejectUnauthorized: false } : undefined;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl }) });

// most-common-words-by-language ships a frequency-ranked list (most-used
// word first) -- much better for picking real, recognizable words than
// an alphabetical dictionary dump, which surfaces obscure entries like
// "aardwolves" just as often as common ones.
const WORD_LIST_PATH = path.join(
  __dirname,
  "..",
  "node_modules",
  "most-common-words-by-language",
  "build",
  "resources",
  "english.txt"
);

// Rank range = how common the word is (lower rank = more common =
// easier). Length range narrows it further within that band. Both are
// crude proxies for difficulty -- fine as a starting point, worth
// revisiting once there's real gameplay data on which words students
// actually struggle with.
const TIERS = [
  { tier: 1, rankStart: 100, rankEnd: 1200, minLen: 3, maxLen: 6 },
  { tier: 2, rankStart: 1200, rankEnd: 4000, minLen: 5, maxLen: 8 },
  { tier: 3, rankStart: 4000, rankEnd: 10000, minLen: 7, maxLen: 12 },
];

const WORDS_PER_TIER = 15; // keep each run small and fast; re-run to add more

function loadCandidateWords() {
  return fs.readFileSync(WORD_LIST_PATH, "utf8").split("\n").filter(Boolean);
}

function sample(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// Free, no API key needed. Only returns a match if a single sense has
// BOTH a definition and an example; otherwise the script uses a simple
// built-in fallback text so the backend stays self-contained.
async function lookupInDictionary(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!res.ok) return null;

    const data = await res.json();
    const entry = data[0];
    for (const meaning of entry?.meanings || []) {
      for (const def of meaning.definitions || []) {
        if (def.definition && def.example) {
          return { definition: def.definition, exampleSentence: def.example };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

function buildFallbackContent(word) {
  const cleaned = word.toLowerCase().trim();
  const definition = `A word used in spelling practice for ${cleaned}.`;
  const exampleSentence = `We practiced the word \"${cleaned}\" in class today.`;
  return { definition, exampleSentence };
}

async function main() {
  const allWords = loadCandidateWords();

  for (const { tier, rankStart, rankEnd, minLen, maxLen } of TIERS) {
    const candidates = allWords
      .slice(rankStart, rankEnd)
      .filter((w) => w.length >= minLen && w.length <= maxLen && /^[a-z]+$/.test(w));

    // Oversample -- some picks will already be seeded or lack a usable
    // definition, so we need more candidates than we actually want to add.
    const picks = sample(candidates, WORDS_PER_TIER * 4);

    let added = 0;
    console.log(`\nTier ${tier}: looking for ${WORDS_PER_TIER} new words...`);

    for (const word of picks) {
      if (added >= WORDS_PER_TIER) break;

      const existing = await prisma.word.findFirst({ where: { text: word } });
      if (existing) continue;

      let content = await lookupInDictionary(word);
      let source = "dictionary";

      if (!content) {
        content = buildFallbackContent(word);
        source = "fallback";
      }

      if (!content || !content.definition || !content.exampleSentence) {
        continue; // couldn't get a usable pair from either source -- skip it
      }

      await prisma.word.create({
        data: {
          text: word,
          tier,
          definition: content.definition,
          exampleSentence: content.exampleSentence,
        },
      });
      console.log(`  added "${word}" (via ${source})`);
      added++;
    }

    if (added < WORDS_PER_TIER) {
      console.log(`  only found ${added}/${WORDS_PER_TIER} for tier ${tier} this run -- re-run the script to top up.`);
    }
  }

  console.log(
    "\nDone. Spot-check the results with `npx prisma studio` before using them live -- " +
    "an automated word list can occasionally pull something not appropriate for the app."
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
