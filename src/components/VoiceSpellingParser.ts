/**
 * Spoken Phoneme & Letter Parser for Voice Spelling Mode
 * Converts transcript phrases like "kay e n t e" or "k e n t e" into a clean letter sequence "kente".
 */

const PHONEME_TO_LETTER_MAP: Record<string, string> = {
  a: 'a',
  ay: 'a',
  ei: 'a',
  eh: 'a',
  hey: 'a',
  alpha: 'a',

  b: 'b',
  be: 'b',
  bee: 'b',
  bea: 'b',
  bravo: 'b',

  c: 'c',
  see: 'c',
  sea: 'c',
  si: 'c',
  charlie: 'c',

  d: 'd',
  dee: 'd',
  the: 'd',
  delta: 'd',

  e: 'e',
  ee: 'e',
  he: 'e',
  echo: 'e',

  f: 'f',
  ef: 'f',
  eff: 'f',
  foxtrot: 'f',

  g: 'g',
  jee: 'g',
  ji: 'g',
  gee: 'g',
  golf: 'g',

  h: 'h',
  aitch: 'h',
  ach: 'h',
  eightch: 'h',
  hache: 'h',
  hotel: 'h',

  i: 'i',
  eye: 'i',
  ai: 'i',
  hi: 'i',
  india: 'i',

  j: 'j',
  jay: 'j',
  juliet: 'j',

  k: 'k',
  kay: 'k',
  ca: 'k',
  cay: 'k',
  kilo: 'k',

  l: 'l',
  el: 'l',
  ell: 'l',
  lima: 'l',

  m: 'm',
  em: 'm',
  mike: 'm',

  n: 'n',
  en: 'n',
  and: 'n',
  in: 'n',
  november: 'n',

  o: 'o',
  oh: 'o',
  owe: 'o',
  oscar: 'o',

  p: 'p',
  pee: 'p',
  pea: 'p',
  papa: 'p',

  q: 'q',
  cue: 'q',
  queue: 'q',
  kyu: 'q',
  quebec: 'q',

  r: 'r',
  ar: 'r',
  are: 'r',
  our: 'r',
  romeo: 'r',

  s: 's',
  ess: 's',
  es: 's',
  sierra: 's',

  t: 't',
  tee: 't',
  tea: 't',
  to: 't',
  too: 't',
  tango: 't',

  u: 'u',
  you: 'u',
  yew: 'u',
  uniform: 'u',

  v: 'v',
  vee: 'v',
  victor: 'v',

  w: 'w',
  'double u': 'w',
  'double you': 'w',
  doubleu: 'w',
  doubleyou: 'w',
  dubya: 'w',
  whiskey: 'w',

  x: 'x',
  ex: 'x',
  axe: 'x',
  xray: 'x',

  y: 'y',
  why: 'y',
  yankee: 'y',

  z: 'z',
  zee: 'z',
  zed: 'z',
  zulu: 'z',
};

export function parseSpokenTranscript(transcript: string): string {
  if (!transcript) return '';

  const clean = transcript.toLowerCase().trim();
  // Tokenise on runs of anything that is not a letter. Recognisers happily
  // hand back "kay," or "em." — punctuation glued to a token must not push it
  // past the phoneme map, because the whole-word fallback below would then
  // contribute every raw letter and turn two spoken letters into six.
  const tokens = clean.split(/[^a-z]+/).filter(Boolean);

  let result = '';

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Check two-word phrases like "double u"
    if (i < tokens.length - 1) {
      const pair = `${token} ${tokens[i + 1]}`;
      if (PHONEME_TO_LETTER_MAP[pair]) {
        result += PHONEME_TO_LETTER_MAP[pair];
        i++; // skip next token
        continue;
      }
    }

    if (PHONEME_TO_LETTER_MAP[token]) {
      result += PHONEME_TO_LETTER_MAP[token];
    } else if (token.length === 1 && /[a-z]/i.test(token)) {
      result += token;
    } else {
      // Whole-word fallback: an unmapped word ("kente") contributes every
      // letter it contains, so spelling a word the ordinary way still
      // resolves. Tokens are letter-only after the split above, so there is
      // nothing left to strip here.
      result += token;
    }
  }

  return result.toLowerCase();
}

/**
 * Subscribe to the browser voice list. `getVoices()` returns `[]` on the first
 * call in several browsers and fills in later, so callers get an immediate
 * emission plus every `voiceschanged` update until they unsubscribe.
 */
export function subscribeToVoices(callback: (voices: SpeechSynthesisVoice[]) => void): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return () => {};
  const emit = () => callback(window.speechSynthesis.getVoices());
  emit();
  window.speechSynthesis.addEventListener('voiceschanged', emit);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', emit);
}

/** Resolve with the voice list, tolerating the async first `getVoices()` call. */
function getVoicesWhenReady(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    const initial = window.speechSynthesis.getVoices();
    if (initial.length) {
      resolve(initial);
      return;
    }
    let unsubscribe = () => {};
    const timer = window.setTimeout(() => {
      unsubscribe();
      resolve(window.speechSynthesis.getVoices());
    }, timeoutMs);
    unsubscribe = subscribeToVoices((voices) => {
      if (!voices.length) return;
      window.clearTimeout(timer);
      unsubscribe();
      resolve(voices);
    });
  });
}

/** Generous upper bound so a browser that never fires `onend` can't hang callers. */
function speechTimeoutMs(text: string, rate: number): number {
  return 2000 + (text.length * 300) / Math.max(rate, 0.1);
}

/**
 * Helper to speak a given text aloud using SpeechSynthesis.
 * Always resolves — some browsers never fire `onend`, so the promise races a
 * timeout instead of leaving the caller waiting forever.
 */
export function speakWord(text: string, rate: number = 0.85, selectedVoiceURI?: string): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve();

  window.speechSynthesis.cancel(); // Stop prior speech
  return getVoicesWhenReady().then(
    (voices) =>
      new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = 1.0;
        utterance.volume = 1;
        const storedVoiceURI = selectedVoiceURI ?? localStorage.getItem('spelling_bee_speech_voice') ?? '';
        // Prefer a local English voice where possible: it starts faster and is
        // usually clearer for young learners than a remote fallback voice.
        utterance.voice =
          voices.find((voice) => voice.voiceURI === storedVoiceURI) ||
          voices.find((voice) => voice.localService && voice.lang.toLowerCase().startsWith('en')) ||
          voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ||
          null;

        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve();
        };
        const timer = window.setTimeout(finish, speechTimeoutMs(text, rate));
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
      }),
  );
}
