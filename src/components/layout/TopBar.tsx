import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Sparkles } from 'lucide-react';

export default function TopBar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-xs dark:border-navy-700 dark:bg-navy-800/80">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-amber-600" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Admin access is reserved for teacher and parent supervisor accounts.</p>
      </div>
      <Link to="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Secure login</span>
      </Link>
    </div>
  );
}
