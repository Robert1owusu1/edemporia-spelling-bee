import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';

export default function VerifyEmailPage() {
  const [params] = useSearchParams(); const [message, setMessage] = useState('Verifying your email…'); const token = params.get('token');
  useEffect(() => { if (!token) { setMessage('This verification link is invalid.'); return; } void apiClient.verifyEmail(token).then((result) => setMessage(result.message)).catch((error: Error) => setMessage(error.message)); }, [token]);
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-navy-900"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm dark:border-navy-700 dark:bg-navy-800"><h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Email verification</h1><p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{message}</p><Link to="/login" className="mt-6 inline-block rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-amber-400 dark:bg-navy-700">Continue to sign in</Link></div></main>;
}
