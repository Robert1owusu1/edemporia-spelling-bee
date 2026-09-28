require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const ssl = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false" ? { rejectUnauthorized: false } : undefined;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl }) });

// Words are { text, tier, category, definition, exampleSentence }. The
// script skips words already in the database, so it's safe to re-run.
const WORDS_TO_SEED = [
  // Tier 1 -- foundational 3-5 letter words
  {
    text: "cat",
    tier: 1,
    category: "Animals",
    definition: "A small domesticated animal with fur that purrs.",
    exampleSentence: "The cat sat quietly on the mat.",
  },
  {
    text: "dog",
    tier: 1,
    category: "Animals",
    definition: "A friendly animal often kept as a pet.",
    exampleSentence: "My dog loves to run in the garden.",
  },
  {
    text: "apple",
    tier: 1,
    category: "Fruit",
    definition: "A round fruit that is red, green, or yellow.",
    exampleSentence: "She ate a crisp apple at lunch.",
  },
  {
    text: "garden",
    tier: 1,
    category: "Nature",
    definition: "A piece of ground where plants are grown.",
    exampleSentence: "Flowers bloom in the garden every spring.",
  },
  {
    text: "friend",
    tier: 1,
    category: "People",
    definition: "Someone you know well and like.",
    exampleSentence: "A true friend is kind and helpful.",
  },
  // Tier 2 -- intermediate words
  {
    text: "school",
    tier: 2,
    category: "School",
    definition: "A place where children go to learn.",
    exampleSentence: "We go to school every morning.",
  },
  {
    text: "elephant",
    tier: 2,
    category: "Animals",
    definition: "A very large animal with a trunk and big ears.",
    exampleSentence: "The elephant lifted water with its trunk.",
  },
  {
    text: "adventure",
    tier: 2,
    category: "Adventure",
    definition: "An exciting or unusual experience.",
    exampleSentence: "Reading a mystery book is a great adventure.",
  },
  {
    text: "mountain",
    tier: 2,
    category: "Nature",
    definition: "A very high hill with steep sides.",
    exampleSentence: "Snow covers the mountain in winter.",
  },
  {
    text: "curious",
    tier: 2,
    category: "Feelings",
    definition: "Wanting to know or learn about something.",
    exampleSentence: "The curious child asked many questions.",
  },
  // Tier 3 -- advanced words
  {
    text: "necessary",
    tier: 3,
    category: "Adjectives",
    definition: "Needed; something that must be done.",
    exampleSentence: "It is necessary to practice every day.",
  },
  {
    text: "environment",
    tier: 3,
    category: "Science",
    definition: "The natural world around us.",
    exampleSentence: "We should protect the environment.",
  },
  {
    text: "opportunity",
    tier: 3,
    category: "Life Skills",
    definition: "A chance to do something good.",
    exampleSentence: "Spelling contests are a great opportunity to shine.",
  },
  {
    text: "responsible",
    tier: 3,
    category: "Life Skills",
    definition: "Being trusted to do what is right.",
    exampleSentence: "A responsible learner completes their homework.",
  },
  {
    text: "vocabulary",
    tier: 3,
    category: "School",
    definition: "The set of words a person knows and uses.",
    exampleSentence: "Reading builds your vocabulary.",
  },
  // Tier 4 -- primary challenge words (age 9-11)
  {
    text: "brilliant",
    tier: 4,
    category: "Adjectives",
    definition: "Extremely clever or bright.",
    exampleSentence: "The brilliant student solved the puzzle in seconds.",
  },
  {
    text: "discovery",
    tier: 4,
    category: "Adventure",
    definition: "Finding something for the first time.",
    exampleSentence: "The discovery of the cave amazed the explorers.",
  },
  {
    text: "journey",
    tier: 4,
    category: "Adventure",
    definition: "A long trip from one place to another.",
    exampleSentence: "Our journey across the country took three days.",
  },
  {
    text: "treasure",
    tier: 4,
    category: "Adventure",
    definition: "Valuable things that are hidden or stored.",
    exampleSentence: "The pirates buried their treasure on the island.",
  },
  {
    text: "universe",
    tier: 4,
    category: "Science",
    definition: "Everything that exists, including stars and planets.",
    exampleSentence: "Scientists are always learning more about the universe.",
  },
  {
    text: "imagine",
    tier: 4,
    category: "Feelings",
    definition: "To form a picture of something in your mind.",
    exampleSentence: "Imagine a world where everyone is kind.",
  },
  {
    text: "happiness",
    tier: 4,
    category: "Feelings",
    definition: "The state of being happy.",
    exampleSentence: "Spending time with friends brings great happiness.",
  },
  {
    text: "community",
    tier: 4,
    category: "People",
    definition: "A group of people who live and work together.",
    exampleSentence: "Our community built a new playground together.",
  },
  {
    text: "library",
    tier: 4,
    category: "School",
    definition: "A place where books are kept to read or borrow.",
    exampleSentence: "She borrowed three storybooks from the library.",
  },
  {
    text: "temperature",
    tier: 4,
    category: "Science",
    definition: "How hot or cold something is.",
    exampleSentence: "The temperature dropped suddenly at night.",
  },
  // Tier 5 -- explorer words (age 11-13)
  {
    text: "appreciation",
    tier: 5,
    category: "Life Skills",
    definition: "The feeling of being thankful for something.",
    exampleSentence: "She showed her appreciation with a warm thank you.",
  },
  {
    text: "architecture",
    tier: 5,
    category: "Science",
    definition: "The art and science of designing buildings.",
    exampleSentence: "The architecture of the old church is beautiful.",
  },
  {
    text: "atmosphere",
    tier: 5,
    category: "Science",
    definition: "The layer of gases around a planet.",
    exampleSentence: "The Earth's atmosphere protects us from the sun.",
  },
  {
    text: "celebration",
    tier: 5,
    category: "People",
    definition: "A special event to mark a happy occasion.",
    exampleSentence: "The whole school joined the celebration.",
  },
  {
    text: "cooperation",
    tier: 5,
    category: "Life Skills",
    definition: "Working together to reach a shared goal.",
    exampleSentence: "With cooperation, the team finished the project on time.",
  },
  {
    text: "determination",
    tier: 5,
    category: "Feelings",
    definition: "Refusing to give up until a goal is reached.",
    exampleSentence: "Her determination helped her win the race.",
  },
  {
    text: "exploration",
    tier: 5,
    category: "Adventure",
    definition: "The act of travelling to learn about new places.",
    exampleSentence: "Space exploration inspires many young scientists.",
  },
  {
    text: "independence",
    tier: 5,
    category: "Life Skills",
    definition: "Being able to take care of yourself.",
    exampleSentence: "Learning to cook is a step towards independence.",
  },
  {
    text: "magnificent",
    tier: 5,
    category: "Adjectives",
    definition: "Extremely beautiful or impressive.",
    exampleSentence: "The view from the hilltop was magnificent.",
  },
  {
    text: "measurement",
    tier: 5,
    category: "Science",
    definition: "Finding the size, amount, or degree of something.",
    exampleSentence: "Accurate measurement is important in cooking.",
  },
  // Tier 6 -- bee champion words (age 13-15)
  {
    text: "extraordinary",
    tier: 6,
    category: "Adjectives",
    definition: "Very unusual, surprising, or special.",
    exampleSentence: "The rescue was an extraordinary act of bravery.",
  },
  {
    text: "environmental",
    tier: 6,
    category: "Science",
    definition: "Relating to the natural world and its care.",
    exampleSentence: "Environmental awareness starts with small habits.",
  },
  {
    text: "perseverance",
    tier: 6,
    category: "Feelings",
    definition: "Steady effort to keep going despite difficulty.",
    exampleSentence: "Perseverance turned her failure into success.",
  },
  {
    text: "responsibility",
    tier: 6,
    category: "Life Skills",
    definition: "The duty to deal with something or care for it.",
    exampleSentence: "Feeding the class pet is a big responsibility.",
  },
  {
    text: "simultaneous",
    tier: 6,
    category: "Adjectives",
    definition: "Happening at the same time.",
    exampleSentence: "The two choirs sang simultaneous harmonies.",
  },
  {
    text: "acknowledge",
    tier: 6,
    category: "Life Skills",
    definition: "To admit or recognise something as true.",
    exampleSentence: "Teachers acknowledge every small improvement.",
  },
  {
    text: "conscientious",
    tier: 6,
    category: "Adjectives",
    definition: "Wanting to do things carefully and correctly.",
    exampleSentence: "A conscientious student checks their work twice.",
  },
  {
    text: "knowledgeable",
    tier: 6,
    category: "Adjectives",
    definition: "Having a lot of knowledge or information.",
    exampleSentence: "The librarian is very knowledgeable about books.",
  },
];

const BADGES_TO_SEED = [
  { name: "First Steps", description: "Reach a 3-day practice streak", criteria: "streak:3" },
  { name: "Week-Long Streak", description: "Practise 7 days in a row", criteria: "streak:7" },
  { name: "Century Club", description: "Earn 100 points", criteria: "points:100" },
  { name: "Bee Scholar", description: "Earn 500 points", criteria: "points:500" },
  { name: "Hive Legend", description: "Earn 1,000 points", criteria: "points:1000" },
  { name: "Practice Makes Perfect", description: "Complete 50 spelling words", criteria: "rounds:50" },
  { name: "Dedicated Speller", description: "Complete 200 spelling words", criteria: "rounds:200" },
];

const DEMO_EMAIL = "demo@spellingbee.local";
const DEMO_PASSWORD = "demo123";

async function seedWords() {
  let added = 0;
  for (const word of WORDS_TO_SEED) {
    const existing = await prisma.word.findFirst({ where: { text: word.text } });
    if (existing) continue;
    await prisma.word.create({ data: word });
    added += 1;
  }
  console.log(`Words: ${added} added (skipped ${WORDS_TO_SEED.length - added} existing).`);
}

async function seedBadges() {
  let added = 0;
  for (const badge of BADGES_TO_SEED) {
    const existing = await prisma.badge.findFirst({ where: { name: badge.name } });
    if (existing) continue;
    await prisma.badge.create({ data: badge });
    added += 1;
  }
  console.log(`Badges: ${added} added (skipped ${BADGES_TO_SEED.length - added} existing).`);
}

// The demo account powers the "Instant Demo Access" button on the login page.
// It is created verified AND approved so the flow works even when email
// delivery is off and no administrator has to approve it first. It must NEVER
// be created in production: demo@spellingbee.local / demo123 and ST-10001 are
// publicly known credentials, so seeding them into a live deployment would
// hand anyone a working login. Production still seeds the word and badge
// catalog, just not the demo identities.
async function seedDemoAccount() {
  if (process.env.NODE_ENV === "production") {
    console.log("Demo account: skipped (NODE_ENV=production).");
    return;
  }
  const existing = await prisma.account.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    if (!existing.approvedAt)
      await prisma.account.update({ where: { id: existing.id }, data: { approvedAt: new Date() } });
    console.log("Demo account: already present (ensured approved).");
    return;
  }
  const account = await prisma.account.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo Parent",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      role: "PARENT",
      approvedAt: new Date(),
    },
  });
  const existingStudent = await prisma.student.findUnique({ where: { studentCode: "ST-10001" } });
  if (!existingStudent) {
    await prisma.student.create({
      data: {
        accountId: account.id,
        studentCode: "ST-10001",
        name: "Demo Speller",
        age: 8,
        className: "Demo Class",
        currentTier: 2,
        hearts: 5,
        streak: 4,
        points: 120,
        avatarColor: "#F59E0B",
      },
    });
    console.log("Demo account: created demo@spellingbee.local with learner ST-10001.");
  } else {
    console.log("Demo account: created demo@spellingbee.local (learner ST-10001 already exists).");
  }
}

async function main() {
  await seedWords();
  await seedBadges();
  await seedDemoAccount();
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
