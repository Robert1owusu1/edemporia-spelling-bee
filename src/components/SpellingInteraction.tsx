import React, { useState, useEffect, useRef } from 'react';
import { Word } from '../api/types';
import { speakWord, parseSpokenTranscript } from './VoiceSpellingParser';
import BeeMascot from './BeeMascot';
import { audioFx } from '../utils/audioEffects';
import { useSettings } from '../context/SettingsContext';
import {
  Volume2,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Flame,
  Shield,
  Lightbulb,
  Zap,
} from 'lucide-react';

interface SpellingInteractionProps {
  word: Word;
  onSubmit: (spelledText: string, attempts: number) => void;
  isSubmitting?: boolean;
  comboStreak?: number;
}

export default function SpellingInteraction({
  word,
  onSubmit,
  isSubmitting = false,
  comboStreak = 0,
}: SpellingInteractionProps) {
  const { speechVoice } = useSettings();
  const [spokenRaw, setSpokenRaw] = useState('');
  const [parsedLetters, setParsedLetters] = useState('');
  const [attemptsCount, setAttemptsCount] = useState(1);
  const [speechRate, setSpeechRate] = useState<number>(0.85);

  // Gamified Power-ups
  const [firstLetterRevealed, setFirstLetterRevealed] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [floatingXp, setFloatingXp] = useState<string | null>(null);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Hints toggles
  const [showDefinition, setShowDefinition] = useState(false);
  const [showExample, setShowExample] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check SpeechRecognition support on mount
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecognitionSupported(false);
    } else {
      setRecognitionSupported(true);
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 3;
        recognition.lang = navigator.language?.startsWith('en') ? navigator.language : 'en-US';

        recognition.onresult = (event: any) => {
          const result = event.results[event.results.length - 1];
          const alternatives: string[] = Array.from(result as ArrayLike<{ transcript: string }>, (item) => item.transcript.trim());
          const parsedAlternatives = alternatives.map(parseSpokenTranscript);
          const fullTranscript = alternatives[0] || '';
          setSpokenRaw(fullTranscript);
          // Recognition often returns several valid readings. Prefer one that
          // exactly matches the requested word, then use the best result.
          const parsed = parsedAlternatives.find((value) => value === word.text.toLowerCase()) || parsedAlternatives[0] || '';
          setParsedLetters(parsed);
        };

        recognition.onerror = (event: any) => {
          setIsListening(false);
          const message = event.error === 'not-allowed'
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

    // Auto pronounce word on load
    handlePlayAudio(speechRate);

    // Reset inputs for new word
    setSpokenRaw('');
    setParsedLetters('');
    setFirstLetterRevealed(false);
    setShieldActive(false);

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [word]);

  const handlePlayAudio = (rate = speechRate) => {
    audioFx.playClick();
    speakWord(word.text, rate, speechVoice);
  };

  const toggleListening = () => {
    audioFx.playClick();
    setSpeechError(null);
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: any) {
        setSpeechError('Could not start microphone. Please check browser microphone permissions.');
      }
    }
  };

  const handleClearVoice = () => {
    audioFx.playClick();
    setSpokenRaw('');
    setParsedLetters('');
  };

  // Power-up action: Reveal first letter
  const handleRevealFirstLetter = () => {
    audioFx.playPowerup();
    setFirstLetterRevealed(true);
    // The parsed letters are lowercase, so the revealed letter must match
    // case or the answer would be corrupted (uppercase prefix would never
    // equal the word).
    const firstChar = word.text.charAt(0).toLowerCase();
    setParsedLetters((prev) => (prev.startsWith(firstChar) ? prev : firstChar + prev));
  };

  // Power-up action: Shield active
  const handleActivateShield = () => {
    audioFx.playPowerup();
    setShieldActive(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSpelled = parsedLetters;
    if (!finalSpelled.trim()) return;

    const isCorrect = finalSpelled.trim().toLowerCase() === word.text.toLowerCase();
    if (isCorrect) {
      if (comboStreak > 1) {
        audioFx.playCombo(comboStreak);
      } else {
        audioFx.playCorrect();
      }
      setFloatingXp(`+${10 * Math.max(1, comboStreak)} XP!`);
      setTimeout(() => setFloatingXp(null), 1800);
    } else {
      audioFx.playIncorrect();
    }

    onSubmit(finalSpelled.trim(), attemptsCount);
  };

  const activeLetters = parsedLetters;
  const isAdvancedWord = word.tier >= 5;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 max-w-2xl mx-auto relative overflow-hidden dark:bg-navy-800 dark:border-navy-700">
      {/* Floating XP Animation */}
      {floatingXp && (
        <div className="absolute top-4 right-6 z-30 bg-amber-400 text-slate-950 px-3 py-1.5 rounded-full font-black text-xs shadow-lg animate-bounce">
          ⚡ {floatingXp}
        </div>
      )}

      {/* Advanced Word Banner */}
      {isAdvancedWord ? (
        <div className="bg-indigo-900 text-amber-300 p-3 rounded-xl text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Tier {word.tier} Advanced Challenge: Big & Difficult Words Mode</span>
          </div>
          <span className="bg-indigo-800 text-white text-[10px] uppercase font-mono px-2 py-0.5 rounded">
            {word.category}
          </span>
        </div>
      ) : null}

      {/* Mascot Bee Live Cheer Leader Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 border border-amber-300/70 rounded-2xl p-3 flex items-center gap-3">
        <BeeMascot size="sm" expression={comboStreak > 1 ? 'cheering' : 'happy'} />
        <div className="flex-1">
          <p className="text-xs font-extrabold text-amber-950 dark:text-amber-200">
            {comboStreak >= 3
              ? `🔥 UNSTOPPABLE STREAK! ${comboStreak}x Multiplier Active!`
              : comboStreak === 2
              ? `⚡ 2x Combo Bonus! Keep going!`
              : `Buzz Bee: "Listen closely and spell out loud!"`}
          </p>
          <p className="text-[11px] text-slate-600 font-medium dark:text-slate-400">
            Category: <strong className="text-slate-800 dark:text-slate-200">{word.category}</strong> • Tier Level {word.tier}
          </p>
        </div>
        {comboStreak > 1 && (
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs px-3 py-1 rounded-full shadow-xs flex items-center gap-1 animate-pulse">
            <Flame className="w-3.5 h-3.5 fill-current text-yellow-200" />
            <span>{comboStreak}x</span>
          </div>
        )}
      </div>

      {/* Top Audio Pronunciation Bar */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 space-y-3 dark:bg-amber-500/10 dark:border-amber-500/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handlePlayAudio(speechRate)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <Volume2 className="w-4 h-4" />
              <span>Listen to Word</span>
            </button>

            {/* Speed Control */}
            <div className="flex items-center bg-white border border-amber-200 rounded-lg p-0.5 text-[11px] font-bold text-slate-700 dark:bg-navy-800 dark:border-amber-500/30 dark:text-slate-300">
              <button
                type="button"
                onClick={() => {
                  setSpeechRate(0.85);
                  handlePlayAudio(0.85);
                }}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  speechRate === 0.85 ? 'bg-amber-500 text-slate-950' : 'hover:bg-slate-100 dark:hover:bg-navy-700'
                }`}
              >
                1.0x Normal
              </button>
              <button
                type="button"
                onClick={() => {
                  setSpeechRate(0.65);
                  handlePlayAudio(0.65);
                }}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  speechRate === 0.65 ? 'bg-amber-500 text-slate-950' : 'hover:bg-slate-100 dark:hover:bg-navy-700'
                }`}
              >
                0.65x Slow
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                audioFx.playClick();
                setShowDefinition((prev) => !prev);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                showDefinition
                  ? 'bg-slate-900 text-amber-400 border-slate-800 dark:bg-navy-700 dark:border-navy-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-navy-800 dark:text-slate-300 dark:border-navy-700 dark:hover:bg-navy-700'
              }`}
            >
              {showDefinition ? 'Hide Hint' : 'Definition Hint'}
            </button>

            <button
              type="button"
              onClick={() => {
                audioFx.playClick();
                setShowExample((prev) => !prev);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                showExample
                  ? 'bg-slate-900 text-amber-400 border-slate-800 dark:bg-navy-700 dark:border-navy-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-navy-800 dark:text-slate-300 dark:border-navy-700 dark:hover:bg-navy-700'
              }`}
            >
              {showExample ? 'Hide Sentence' : 'Sentence Hint'}
            </button>
          </div>
        </div>

        {/* Definition & Sentence Display Box */}
        {(showDefinition || showExample) && (
          <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-1.5 text-xs text-slate-900 animate-fade-in dark:bg-navy-800 dark:border-amber-500/30 dark:text-slate-100">
            {showDefinition && (
              <div>
                <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px] dark:text-amber-300">
                  Definition:
                </span>{' '}
                <span className="font-medium text-slate-800 dark:text-slate-200">{word.definition}</span>
              </div>
            )}
            {showExample && (
              <div>
                <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px] dark:text-amber-300">
                  Sentence:
                </span>{' '}
                <span className="italic font-medium text-slate-800 dark:text-slate-200">"{word.exampleSentence}"</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gamified In-Game Power-Ups Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-xl text-white dark:bg-navy-700">
        <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Bee Power-Ups:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRevealFirstLetter}
            disabled={firstLetterRevealed}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              firstLetterRevealed
                ? 'bg-amber-500 text-slate-950 opacity-90 cursor-default'
                : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-slate-700 dark:bg-navy-800 dark:border-navy-600'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>{firstLetterRevealed ? '1st Letter Revealed' : 'Reveal 1st Letter'}</span>
          </button>

          <button
            type="button"
            onClick={handleActivateShield}
            disabled={shieldActive}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              shieldActive
                ? 'bg-rose-500 text-white font-bold opacity-90 cursor-default'
                : 'bg-slate-800 text-rose-300 hover:bg-slate-700 border border-slate-700 dark:bg-navy-800 dark:border-navy-600'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-rose-400" />
            <span>{shieldActive ? 'Shield Active' : 'Shield Heart'}</span>
          </button>
        </div>
      </div>

      {/* Voice Mode Area */}
      <div className="space-y-4 text-center">
        {!recognitionSupported && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs flex items-center gap-2 text-left dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Web Speech Recognition is unsupported or disabled in this browser. Spelling uses voice input, so please try Chrome, Edge, or a supported browser.
            </span>
          </div>
        )}

        {speechError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs text-left dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300">
            {speechError}
          </div>
        )}

        {/* Central Microphone Button */}
        <div className="py-3 flex flex-col items-center">
          <div className="relative">
            {isListening && (
              <div className="absolute -inset-3 rounded-full bg-rose-400/30 animate-ping" />
            )}
            <button
              type="button"
              onClick={toggleListening}
              className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-md ${
                isListening
                  ? 'bg-rose-600 text-white scale-105 shadow-rose-200'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-400 hover:scale-105 dark:bg-navy-700'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-8 h-8 mb-1" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-8 h-8 mb-1" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Speak</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-600 font-medium mt-3 dark:text-slate-400">
            {isListening ? (
              <span className="text-rose-600 font-bold animate-pulse">
                🎙️ Listening... Speak letters aloud one by one (e.g. "C... A... T")
              </span>
            ) : (
              'Press the microphone button and speak your spelling aloud!'
            )}
          </p>

          {/* Sound wave graphic when listening */}
          {isListening && (
            <div className="flex items-center justify-center gap-1 mt-2 h-4">
              <span className="w-1 bg-rose-500 h-3 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 bg-rose-500 h-4 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 bg-rose-500 h-2 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="w-1 bg-rose-500 h-4 animate-bounce" style={{ animationDelay: '450ms' }} />
              <span className="w-1 bg-rose-500 h-3 animate-bounce" style={{ animationDelay: '600ms' }} />
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-2 dark:border-navy-700">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1 dark:text-slate-400">
            <span>Spoken answer:</span>
            {parsedLetters && (
              <button
                type="button"
                onClick={handleClearVoice}
                className="text-rose-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <span>Clear and try again</span>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Say the letters one at a time (for example, “C, A, T”). Your spoken letters appear below; submit them without typing.</p>
          {spokenRaw ? <p className="rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-600 dark:bg-navy-900 dark:text-slate-400">Heard: “{spokenRaw}”</p> : null}
        </div>
      </div>

      {/* Letter Tiles Captured Preview */}
      <div className="pt-2">
        <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider text-center mb-2 dark:text-slate-400">
          Captured Spelling ({activeLetters.length} / {word.text.length} letters):
        </p>

        <div className="flex flex-wrap items-center justify-center gap-1.5 min-h-[52px] p-3 bg-slate-900 border border-slate-800 rounded-xl shadow-inner dark:bg-navy-700 dark:border-navy-700">
          {activeLetters ? (
            activeLetters.split('').map((char, idx) => (
              <span
                key={idx}
                className="w-9 h-10 bg-amber-500 text-slate-950 font-extrabold text-lg rounded-lg border-2 border-amber-300 flex items-center justify-center uppercase shadow-xs transform animate-pop"
              >
                {char}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400 font-medium italic dark:text-slate-500">
              (Speak the letters above to see them appear here)
            </span>
          )}
        </div>
      </div>

      {/* Submit Action Button */}
      <form onSubmit={handleFormSubmit} className="pt-2">
        <button
          type="submit"
          disabled={!activeLetters.trim() || isSubmitting}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider py-3.5 px-5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isSubmitting ? 'Checking Spelling...' : 'Submit Final Answer'}</span>
        </button>
      </form>
    </div>
  );
}
