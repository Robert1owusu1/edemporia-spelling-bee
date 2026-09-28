import React from 'react';

// Shared legal-document section: Terms and Privacy render identical heading +
// body wrappers, so the markup lives here instead of being copied per page.
export default function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
      <div className="space-y-3 text-sm text-slate-600 leading-relaxed dark:text-slate-400">{children}</div>
    </section>
  );
}
