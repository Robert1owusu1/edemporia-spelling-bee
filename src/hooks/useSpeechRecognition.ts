import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Word } from '../api/types';
import { parseSpokenTranscript } from '../components/VoiceSpellingParser';

interface UseSpeechRecognitionResult {
  /** Raw transcript of everything the recogniser heard this session. */
  spokenRaw: string;
  /** Lowercase letters parsed out of the transcript (what the form submits). */
  parsedLetters: string;
  setParsedLetters: Dispatch<SetStateAction<string>>;
  isListening: boolean;
  recognitionSupported: boolean;
  speechError: string | null;
  toggleListening: () => void;
  clearTranscript: () => void;
}

/**
 * Speech-recognition state machine for the spelling interaction: it owns the
 * recogniser instance, the accumulated transcript and the error/listening
 * flags, and rebuilds everything whenever the word on screen changes. Sound
 * effects and attempt accounting stay with the component so the hook remains
 * free of gameplay/audio concerns.
 */
export function useSpeechRecognition(word: Word): UseSpeechRecognitionResult {
  const [spokenRaw, setSpokenRaw] = useState('');
  const [parsedLetters, setParsedLetters] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check SpeechRecognition support on mount. Both the standard name and the
    // WebKit-prefixed one are declared in src/types/web-speech.d.ts.
    const RecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      setRecognitionSupported(false);
    } else {
      setRecognitionSupported(true);
      try {
        const recognition = new RecognitionCtor();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        recognition.lang = navigator.language?.startsWith('en') ? navigator.language : 'en-US';

        recognition.onresult = (event) => {
          // Rebuild the transcript from *every* hypothesis of this session
          // instead of only the newest one: a pause mid-word must not drop the
          // letters already heard. event.results is cumulative per session.
          const chunks: string[] = [];
          let finalIndex = -1;
          let finalAlternatives: string[] = [];
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            const alternatives: string[] = Array.from(result, (item) => item.transcript.trim());
            chunks.push(alternatives[0] || '');
            if (result.isFinal) {
              finalIndex = i;
              finalAlternatives = alternatives;
            }
          }

          const heard = chunks.filter(Boolean).join(' ').trim();
          setSpokenRaw(heard);

          // Recognition often returns several valid readings of the final
          // chunk. Try each alternative (re-joined with the earlier chunks)
          // and prefer one that exactly matches the requested word.
          const prefix = finalIndex >= 0 ? chunks.slice(0, finalIndex).filter(Boolean).join(' ') : '';
          const candidates =
            finalIndex >= 0 && finalAlternatives.length
              ? finalAlternatives.map((alternative) => [prefix, alternative].filter(Boolean).join(' '))
              : [heard];
          const parsedCandidates = candidates.map(parseSpokenTranscript);
          const parsed =
            parsedCandidates.find((value) => value === word.text.toLowerCase()) || parseSpokenTranscript(heard);
          setParsedLetters(parsed);
        };

        recognition.onerror = (event) => {
          setIsListening(false);
          const message =
            event.error === 'not-allowed'
              ? 'Microphone permission was blocked. Allow microphone access in your browser, then try again.'
              : event.error === 'network'
                ? 'Voice recognition needs an internet connection in this browser. Check your connection and use Chrome or Edge; your selected playback voice still works offline when installed on the device.'
                : `Voice input issue: ${event.error}. Please try again.`;
          setSpeechError(message);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } catch {
        setRecognitionSupported(false);
      }
    }

    // Reset transcript and error state for the new word
    setSpokenRaw('');
    setParsedLetters('');
    setSpeechError(null);

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // stop() throws if the recogniser already ended on its own
          // (e.g. the browser stopped it when the tab was hidden).
        }
      }
    };
  }, [word]);

  const toggleListening = () => {
    setSpeechError(null);
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        // `start()` throws when permission was denied or no input device
        // exists; the message is shown either way, so the error is unused.
        setSpeechError('Could not start microphone. Please check browser microphone permissions.');
      }
    }
  };

  const clearTranscript = () => {
    setSpokenRaw('');
    setParsedLetters('');
  };

  return {
    spokenRaw,
    parsedLetters,
    setParsedLetters,
    isListening,
    recognitionSupported,
    speechError,
    toggleListening,
    clearTranscript,
  };
}
