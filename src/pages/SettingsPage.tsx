import { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Moon, Sun, Mic, Check, Type, KeyRound } from 'lucide-react';
import { speakWord, subscribeToVoices } from '../components/VoiceSpellingParser';

export default function SettingsPage() {
  const { darkMode, setDarkMode, textSize, setTextSize, speechVoice, setSpeechVoice, dyslexiaFont, setDyslexiaFont } =
    useSettings();
  const { account, changePassword } = useAuth();

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Student sessions sign in with a school code and have no password of their
  // own (the row behind them belongs to their parent/teacher), so the server
  // rejects password changes for them -- hide the card instead of showing a
  // form that can only fail.
  const canChangePassword = account?.role !== 'student';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordMessage('');
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      const message = await changePassword(currentPassword, newPassword);
      setPasswordMessage(message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Unable to change your password.');
    } finally {
      setSavingPassword(false);
    }
  };

  useEffect(() => {
    // Shared subscriber handles the empty-first-call case via `voiceschanged`.
    return subscribeToVoices((allVoices) =>
      setVoices(allVoices.filter((voice) => voice.lang.toLowerCase().startsWith('en'))),
    );
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-navy-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased">
      <Navbar />

      <main id="main-content" className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-6 shadow-xs text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">App Settings</h1>
        </div>

        {/* Change password -- where a user lands after an administrator reset
            their password to the default one (in-app forgot-password flow). */}
        {canChangePassword ? (
          <form
            onSubmit={submitPassword}
            className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-navy-700 pb-3">
              <KeyRound className="w-5 h-5 text-amber-600" aria-hidden="true" focusable="false" />
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Change password</h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              If your administrator reset your account, sign in with the default password they gave you and choose a new
              one here. Changing it signs out every other device.
            </p>
            <div className="space-y-3 max-w-sm">
              <div>
                <label className="sr-only" htmlFor="current-password">
                  Current password
                </label>
                <input
                  id="current-password"
                  required
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Current password"
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-navy-600 dark:bg-navy-800"
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="new-password">
                  New password
                </label>
                <input
                  id="new-password"
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="New password (at least 8 characters)"
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-navy-600 dark:bg-navy-800"
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="confirm-password">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-navy-600 dark:bg-navy-800"
                />
              </div>
            </div>
            {passwordError ? (
              <p id="password-error" role="alert" className="text-sm text-rose-700 dark:text-rose-300">
                {passwordError}
              </p>
            ) : null}
            {passwordMessage ? (
              <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
                {passwordMessage}
              </p>
            ) : null}
            <button
              disabled={savingPassword}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-amber-400 disabled:opacity-60 dark:bg-navy-700"
            >
              {savingPassword ? 'Saving…' : 'Update password'}
            </button>
          </form>
        ) : null}

        <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-6 shadow-xs flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Reading-friendly mode</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Uses wider spacing and a clean sans-serif font to make reading easier.
            </p>
          </div>
          <button
            type="button"
            aria-pressed={dyslexiaFont}
            onClick={() => setDyslexiaFont(!dyslexiaFont)}
            className={`rounded-xl px-4 py-2 text-xs font-bold ${dyslexiaFont ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 dark:bg-navy-700 text-amber-400'}`}
          >
            {dyslexiaFont ? 'Enabled' : 'Enable'}
          </button>
        </div>

        {/* Text size: applied to <html> as data-text-size, see index.css */}
        <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-navy-700 pb-3">
            <Type className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Text Size</h2>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Reading text size</p>
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                Scales every label in the app up or down. Your choice is saved to this device and your account.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-navy-700 p-1 rounded-xl">
              {(
                [
                  { value: 'normal', label: 'Normal' },
                  { value: 'large', label: 'Large' },
                  { value: 'xlarge', label: 'Extra Large' },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={textSize === option.value}
                  onClick={() => setTextSize(option.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    textSize === option.value
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-navy-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-navy-700 pb-3">
            <Mic className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Word Playback Voice</h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Choose the clearest installed English voice for this learner. Voice options come from the device/browser.
          </p>
          {voices.length ? (
            <div className="flex gap-3">
              <label className="sr-only" htmlFor="settings-voice">
                Playback voice
              </label>
              <select
                id="settings-voice"
                value={speechVoice}
                onChange={(event) => setSpeechVoice(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-800 px-3 py-2 text-sm"
              >
                <option value="">Device default voice</option>
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang}){voice.localService ? ' · offline' : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void speakWord('Hello! I will help you practise spelling.', 0.8, speechVoice)}
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950"
              >
                Test voice
              </button>
            </div>
          ) : (
            <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-300">
              No English voices are available yet. Restart the browser or install a system English voice.
            </p>
          )}
        </div>

        {/* Spelling Input (voice-only) */}
        <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-navy-700 pb-3">
            <Mic className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Spelling Input</h2>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10">
            <Mic className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Voice First (always on)</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                Learners spell by speaking letters aloud into the microphone. Keyboard typing is not used in spelling
                practice.
              </p>
            </div>
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          </div>
        </div>

        {/* Theme & Display Mode */}
        <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-navy-700 pb-3">
            <Moon className="w-5 h-5 text-rose-500" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Theme & Display Mode</h2>
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
              aria-pressed={darkMode}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setDarkMode(!darkMode)}
              className="bg-slate-900 dark:bg-navy-700 hover:bg-slate-800 text-amber-400 p-2.5 rounded-xl transition-colors cursor-pointer"
            >
              {darkMode ? (
                <Sun className="w-5 h-5" aria-hidden="true" focusable="false" />
              ) : (
                <Moon className="w-5 h-5" aria-hidden="true" focusable="false" />
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
