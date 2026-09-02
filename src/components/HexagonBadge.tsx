import React from 'react';

interface HexagonBadgeProps {
  children: React.ReactNode;
  active?: boolean;
  color?: 'amber' | 'navy' | 'emerald' | 'indigo' | 'slate';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function HexagonBadge({
  children,
  active = true,
  color = 'amber',
  size = 'md',
  className = '',
}: HexagonBadgeProps) {
  let sizeClasses = 'w-12 h-12 text-sm';
  if (size === 'sm') sizeClasses = 'w-9 h-9 text-xs';
  if (size === 'lg') sizeClasses = 'w-16 h-16 text-lg';

  let fillClasses = 'bg-[#FEF3C7] text-[#B45309] border-[#FBBF24] dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30';
  if (color === 'navy') fillClasses = 'bg-[#1C2E5A] text-[#FBBF24] border-[#2A3F70]';
  if (color === 'emerald') fillClasses = 'bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/40';
  if (color === 'indigo') fillClasses = 'bg-[#EEF2FF] text-[#6366F1] border-indigo-300 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-400/40';
  if (color === 'slate') fillClasses = 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0] dark:bg-navy-700 dark:text-slate-400 dark:border-navy-600';

  if (!active) {
    fillClasses = 'bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] opacity-60 grayscale dark:bg-navy-700 dark:text-slate-500 dark:border-navy-600';
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center font-bold font-mono border-2 rounded-2xl shadow-2xs ${sizeClasses} ${fillClasses} ${className}`}
    >
      {children}
    </div>
  );
}
