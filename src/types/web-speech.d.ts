// TypeScript's DOM lib ships the Web Speech *result* structures
// (SpeechRecognitionResultList and friends) but not the recogniser itself, its
// events, or the vendor-prefixed constructors browsers actually expose.
// Declaring exactly the surface this app uses keeps the speech hook and the
// audio layer free of `window as any` while staying honest about what the API
// guarantees: the recogniser is untyped in the spec, so these interfaces model
// only the members we read.
export {};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
    /** Safari's prefixed AudioContext constructor. */
    webkitAudioContext?: typeof AudioContext;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  }

  interface SpeechRecognitionEvent extends Event {
    /** Index of the last result delivered by this event. */
    readonly resultIndex: number;
    /** Cumulative for the session — earlier chunks are not re-delivered. */
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    /** Spec error code, e.g. "not-allowed", "network", "no-speech". */
    readonly error: string;
    readonly message: string;
  }
}
