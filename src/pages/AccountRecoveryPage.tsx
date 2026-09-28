import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';

// In-app "forgot password". There is no self-service reset link: the request
// is flagged to the school administrator, who resets the account to a default
// password from the admin portal. The response is identical whether or not an
// account exists for the address, so this form cannot be used to probe emails.
export default function AccountRecoveryPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSending(true);
    try {
      const result = await apiClient.requestPasswordReset(email);
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send your request.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-navy-900">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-5 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-navy-700 dark:bg-navy-800"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">Account security</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">Forgot your password?</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Enter your email address and we will ask your school administrator to reset it. They will set a default
            password for you to sign in with, and you can change it from your dashboard.
          </p>
        </div>
        <label className="sr-only" htmlFor="recovery-email">
          Email address
        </label>
        <input
          id="recovery-email"
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'recovery-error' : undefined}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 dark:border-navy-600"
        />
        {error ? (
          <p id="recovery-error" role="alert" className="text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
            {message}
          </p>
        ) : null}
        <button
          disabled={sending}
          className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-amber-400 disabled:opacity-60 dark:bg-navy-700"
        >
          {sending ? 'Sending…' : 'Send request to administrator'}
        </button>
        <Link to="/login" className="block text-center text-sm font-medium text-indigo-700">
          Back to sign in
        </Link>
      </form>
    </main>
  );
}
