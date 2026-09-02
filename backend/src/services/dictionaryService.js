function cleanWord(value) { return String(value || "").trim().toLowerCase().replace(/[^a-z-]/g, ""); }

const LOOKUP_TIMEOUT_MS = 8000;

async function lookupWord(value) {
  const word = cleanWord(value);
  if (!word || word.length < 2) throw Object.assign(new Error("Enter a valid English word"), { status: 400 });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  let response;
  try {
    try { response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { signal: controller.signal }); }
    catch (error) { throw Object.assign(new Error(error.name === "AbortError" ? "The dictionary is taking too long to respond. Try again shortly." : "Dictionary service is unavailable"), { status: 503 }); }
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw Object.assign(new Error("No dictionary entry was found for that word"), { status: 404 });
  const [entry] = await response.json();
  const meaning = entry?.meanings?.find((item) => item?.definitions?.length);
  const definition = meaning?.definitions?.find((item) => item?.definition)?.definition;
  const exampleSentence = meaning?.definitions?.find((item) => item?.example)?.example || `We practiced the word "${word}" in class today.`;
  if (!definition) throw Object.assign(new Error("The dictionary entry did not include a definition"), { status: 422 });
  return { text: word, category: meaning.partOfSpeech || "Vocabulary", definition, exampleSentence };
}

module.exports = { lookupWord };
