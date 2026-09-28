// Unit tests for VoiceSpellingParser.ts — the voice-mode transcript parser.
//
// The module header promises: transcript phrases like "kay e n t e" or
// "k e n t e" become the clean letter sequence "kente". The consumer
// (useSpeechRecognition) compares the parsed string against the target word's
// lowercase spelling, so the parser must be tolerant of case, punctuation and
// whitespace, must handle letter-name / NATO-phonetic / whole-word input, and
// must return '' (nothing recognised) for input with no letters at all.
//
// The spoken-to-letter map itself is a published contract: aliases like
// "the" → d or "in" → n are deliberate recogniser aliases, and changing one
// silently changes what learners can spell by voice.

import { describe, expect, it, vi } from 'vitest';

import { parseSpokenTranscript, speakWord, subscribeToVoices } from '../VoiceSpellingParser';

describe('parseSpokenTranscript', () => {
  describe('documented examples (module header)', () => {
    it.each([
      { transcript: 'kay e n t e', expected: 'kente', contract: 'letter-name style with a leading phoneme' },
      { transcript: 'k e n t e', expected: 'kente', contract: 'plain letter-by-letter style' },
    ])('"$transcript" → "$expected" — $contract', ({ transcript, expected }) => {
      expect(parseSpokenTranscript(transcript), `the header example "${transcript}" must parse to "${expected}"`).toBe(
        expected,
      );
    });
  });

  describe('letter-by-letter input', () => {
    it.each([
      { transcript: 'ay bee see', expected: 'abc', contract: 'common English letter names' },
      { transcript: 'dee ee ef', expected: 'def', contract: 'sounding-out letters' },
      { transcript: 'see ay tee', expected: 'cat', contract: 'spelling a word aloud letter by letter' },
      { transcript: 'dee eye gee', expected: 'dig', contract: 'letters that are also words still map to the letter' },
      { transcript: 'em en pee', expected: 'mnp', contract: 'm/n/p letter names' },
      { transcript: 'kay bee', expected: 'kb', contract: 'a two-letter fragment' },
    ])('"$transcript" → "$expected" — $contract', ({ transcript, expected }) => {
      expect(parseSpokenTranscript(transcript), `expected "${transcript}" to parse to "${expected}"`).toBe(expected);
    });
  });

  describe('NATO / phonetic alphabet input', () => {
    it.each([
      { transcript: 'alpha bravo charlie', expected: 'abc', contract: 'first three phonetic names' },
      { transcript: 'delta echo foxtrot', expected: 'def', contract: 'phonetic names d/e/f' },
      { transcript: 'golf hotel india', expected: 'ghi', contract: 'phonetic names g/h/i' },
      { transcript: 'juliet kilo lima', expected: 'jkl', contract: 'phonetic names j/k/l' },
      { transcript: 'mike november oscar', expected: 'mno', contract: 'phonetic names m/n/o' },
      { transcript: 'papa quebec romeo', expected: 'pqr', contract: 'phonetic names p/q/r' },
      { transcript: 'sierra tango uniform', expected: 'stu', contract: 'phonetic names s/t/u' },
      { transcript: 'victor whiskey xray', expected: 'vwx', contract: 'phonetic names v/w/x' },
      { transcript: 'yankee zulu', expected: 'yz', contract: 'phonetic names y/z' },
    ])('"$transcript" → "$expected" — $contract', ({ transcript, expected }) => {
      expect(parseSpokenTranscript(transcript), `expected "${transcript}" to parse to "${expected}"`).toBe(expected);
    });
  });

  describe('spelled-out whole words', () => {
    it.each([
      { transcript: 'kente', expected: 'kente', contract: 'an unmapped single word keeps all its letters' },
      {
        transcript: 'cat',
        expected: 'cat',
        contract: 'the recogniser sometimes returns the word itself, not its letters',
      },
      {
        transcript: 'hello world',
        expected: 'helloworld',
        contract: 'whole-word input keeps every letter and drops only the separator',
      },
    ])('"$transcript" → "$expected" — $contract', ({ transcript, expected }) => {
      expect(
        parseSpokenTranscript(transcript),
        `expected "${transcript}" to parse to "${expected}" — unmapped words must keep all letters so whole-word transcripts still match the target word`,
      ).toBe(expected);
    });
  });

  describe('case, punctuation and whitespace tolerance', () => {
    it.each([
      { transcript: 'AY BEE SEE', expected: 'abc', contract: 'all-caps transcript' },
      { transcript: 'Alpha Bravo Charlie', expected: 'abc', contract: 'sentence-case transcript' },
      { transcript: '  kay bee  ', expected: 'kb', contract: 'leading/trailing whitespace is trimmed' },
      { transcript: '\tkay\tbee\n', expected: 'kb', contract: 'tabs and newlines count as separators' },
      { transcript: 'Kay. Ee. Tee', expected: 'ket', contract: 'dots separate tokens' },
      { transcript: 'kay-ee-tee', expected: 'ket', contract: 'dashes separate tokens' },
      { transcript: 'Kay - Bee - See.', expected: 'kbc', contract: 'spaces around dashes/dots collapse cleanly' },
      { transcript: 'kay 2 ee', expected: 'ke', contract: 'digit tokens are dropped, never echoed into the result' },
    ])('"$transcript" → "$expected" — $contract', ({ transcript, expected }) => {
      expect(
        parseSpokenTranscript(transcript),
        `expected ${JSON.stringify(transcript)} to parse to "${expected}" (case/punctuation/whitespace must not change the letters)`,
      ).toBe(expected);
    });
  });

  describe('partial transcripts (recognition paused mid-word)', () => {
    it.each([
      { transcript: 'kay', expected: 'k', contract: 'first letter only' },
      { transcript: 'kay e n', expected: 'ken', contract: 'letters heard so far, in order' },
      { transcript: 'alpha bravo', expected: 'ab', contract: 'phonetic fragment' },
      { transcript: 'kente extra', expected: 'kenteextra', contract: 'extra trailing words are appended, not dropped' },
    ])('"$transcript" → "$expected" — $contract', ({ transcript, expected }) => {
      expect(parseSpokenTranscript(transcript), `expected "${transcript}" to parse to "${expected}"`).toBe(expected);
    });
  });

  describe('unrecognised input returns the failure value ""', () => {
    it.each([
      { transcript: '', contract: 'empty transcript' },
      { transcript: '   ', contract: 'whitespace-only transcript' },
      { transcript: '...', contract: 'separator-only transcript' },
      { transcript: '!!!', contract: 'punctuation-only transcript' },
      { transcript: '123 456', contract: 'digits-only transcript' },
      { transcript: '5', contract: 'a single digit' },
    ])('$transcript → "" — $contract leaves nothing the learner can spell', ({ transcript }) => {
      expect(
        parseSpokenTranscript(transcript),
        `${JSON.stringify(transcript)} contains no letters, so the parser must return "" (the value useSpeechRecognition treats as "nothing matched")`,
      ).toBe('');
    });
  });

  describe('two-word phrases ("double u" family)', () => {
    it.each([
      { transcript: 'double u', expected: 'w', contract: 'the pair is consumed as ONE letter, not "double" + "u"' },
      { transcript: 'double you ee', expected: 'we', contract: 'the spaced pair followed by another letter' },
      { transcript: 'ee double u', expected: 'ew', contract: 'a letter before the pair still parses in order' },
      { transcript: 'doubleu', expected: 'w', contract: 'the joined single-token variant of the pair' },
      { transcript: 'doubleyou', expected: 'w', contract: 'the joined "double you" variant' },
      { transcript: 'double you see', expected: 'wc', contract: 'pairs interleave with following letters' },
    ])('"$transcript" → "$expected" — $contract', ({ transcript, expected }) => {
      expect(parseSpokenTranscript(transcript), `expected "${transcript}" to parse to "${expected}"`).toBe(expected);
    });
  });

  describe('published phoneme aliases (everyday words mapped to letters)', () => {
    it.each([
      { token: 'the', letter: 'd' },
      { token: 'and', letter: 'n' },
      { token: 'in', letter: 'n' },
      { token: 'eye', letter: 'i' },
      { token: 'why', letter: 'y' },
      { token: 'you', letter: 'u' },
      { token: 'oh', letter: 'o' },
      { token: 'hey', letter: 'a' },
      { token: 'he', letter: 'e' },
      { token: 'hi', letter: 'i' },
      { token: 'too', letter: 't' },
      { token: 'our', letter: 'r' },
      { token: 'queue', letter: 'q' },
      { token: 'zed', letter: 'z' },
      { token: 'aitch', letter: 'h' },
      { token: 'ex', letter: 'x' },
    ])('"$token" → "$letter"', ({ token, letter }) => {
      expect(
        parseSpokenTranscript(token),
        `"${token}" is a published recogniser alias for "${letter}" — removing it would break learners who say the word instead of the letter`,
      ).toBe(letter);
    });
  });

  describe('punctuation glued to a token', () => {
    // Regression: tokenising only on space/dash/dot let "kay," miss the
    // phoneme map, after which the whole-word fallback appended every raw
    // letter and two spoken letters came back as six. The parser now splits
    // on any run of non-letters, so punctuation can never glue itself to a
    // token.
    it.each([
      ['kay, em', 'km'],
      ['kay.', 'k'],
      ['em,', 'm'],
      ['(bee)', 'b'],
      ['kay,em', 'km'],
      ['ay? bee! see.', 'abc'],
      ['dee, ef, gee', 'dfg'],
    ])('parseSpokenTranscript(%j) → %j', (input, expected) => {
      expect(parseSpokenTranscript(input)).toBe(expected);
    });
  });
});

describe('browser-API helpers outside a browser (node/SSR safety)', () => {
  it('subscribeToVoices never calls back when there is no window, and unsubscribes safely', () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToVoices(callback);
    expect(callback, 'with no window there are no voices, so no emission may fire').not.toHaveBeenCalled();
    expect(() => unsubscribe(), 'the returned unsubscribe must always be safe to call').not.toThrow();
  });

  it('speakWord resolves immediately when speech synthesis is unavailable', async () => {
    await expect(
      speakWord('cat'),
      'in a non-browser environment speakWord must resolve as a no-op instead of throwing or hanging',
    ).resolves.toBeUndefined();
  });
});
