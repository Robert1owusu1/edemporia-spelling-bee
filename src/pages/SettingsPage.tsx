import React, { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import Navbar from '../components/Navbar';
import { Settings, Server, Moon, Sun, Mic, Check } from 'lucide-react';
import { speakWord } from '../components/VoiceSpellingParser';

export default function SettingsPage() {
  const {
    darkMode,
    setDarkMode,
    textSize,
    setTextSize,
    apiBaseUrl,
    updateApiBaseUrl,
    speechVoice,
    setSpeechVoice,
    dyslexiaFont,
    setDyslexiaFont,
  } = useSettings();

  const [baseUrlInput, setBaseUrlInput] = useState(apiBaseUrl);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith('en')));
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      updateApiBaseUrl(baseUrlInput.trim());
      setSaveError('');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      setSavedSuccess(false);
      setSaveError(err instanceof Error ? err.message : 'That API URL is not valid.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-navy-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-6 shadow-xs text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">App Settings</h1>
          {saveError ? <p className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-semibold text-rose-800 dark:text-rose-300">{saveError}</p> : null}
        </div>

        <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-6 shadow-xs flex items-center justify-between gap-4"><div><h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Reading-friendly mode</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Uses wider spacing and a clean sans-serif font to make reading easier.</p></div><button type="button" onClick={() => setDyslexiaFont(!dyslexiaFont)} className={`rounded-xl px-4 py-2 text-xs font-bold ${dyslexiaFont ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 dark:bg-navy-700 text-amber-400'}`}>{dyslexiaFont ? 'Enabled' : 'Enable'}</button></div>

        <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-navy-700 pb-3"><Mic className="w-5 h-5 text-amber-600" /><h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Word Playback Voice</h3></div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Choose the clearest installed English voice for this learner. Voice options come from the device/browser.</p>
          {voices.length ? <div className="flex gap-3"><select value={speechVoice} onChange={(event) => setSpeechVoice(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-800 px-3 py-2 text-sm"><option value="">Device default voice</option>{voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang}){voice.localService ? ' · offline' : ''}</option>)}</select><button type="button" onClick={() => void speakWord('Hello! I will help you practise spelling.', 0.8, speechVoice)} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950">Test voice</button></div> : <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-300">No English voices are available yet. Restart the browser or install a system English voice.</p>}
        </div>

        {/* Spelling Input (voice-only) */}
        <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-navy-700 pb-3">
            <Mic className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Spelling Input</h3>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10">
            <Mic className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Voice First (always on)</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                Learners spell by speaking letters aloud into the microphone. Keyboard typing is not used in spelling practice.
              </p>
            </div>
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          </div>
        </div>

        {/* Theme & Display Mode */}
        <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-navy-700 pb-3">
            <Moon className="w-5 h-5 text-rose-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Theme & Display Mode</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Dark Mode Display</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                Switch between high-contrast light slate and dark navy color schemes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="bg-slate-900 dark:bg-navy-700 hover:bg-slate-800 text-amber-400 p-2.5 rounded-xl transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
