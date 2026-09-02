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
  // Split on spaces, dashes, or dots
  const tokens = clean.split(/[\s.\-]+/).filter(Boolean);

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
      // Fallback: take first character if token is an unmapped single word
      const lettersOnly = token.replace(/[^a-z]/gi, '');
      if (lettersOnly.length > 0) {
        result += lettersOnly;
      }
    }
  }

  return result.toLowerCase();
}

/**
 * Helper to speak a given text aloud using SpeechSynthesis
 */
export function speakWord(text: string, rate: number = 0.85, selectedVoiceURI?: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel(); // Stop prior speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const storedVoiceURI = selectedVoiceURI ?? localStorage.getItem('spelling_bee_speech_voice') ?? '';
    // Prefer a local English voice where possible: it starts faster and is
    // usually clearer for young learners than a remote fallback voice.
    utterance.voice = voices.find((voice) => voice.voiceURI === storedVoiceURI)
      || voices.find((voice) => voice.localService && voice.lang.toLowerCase().startsWith('en'))
      || voices.find((voice) => voice.lang.toLowerCase().startsWith('en'))
      || null;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
