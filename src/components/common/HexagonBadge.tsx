import React from 'react';

interface HexagonBadgeProps {
  active?: boolean;
  color?: 'amber' | 'slate' | 'indigo' | 'emerald' | 'rose' | 'purple';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function HexagonBadge({
  active = true,
  color = 'amber',
  size = 'md',
  children,
  className = '',
  onClick,
}: HexagonBadgeProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  };

  const colorStyles = {
    amber: active
      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20'
      : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-navy-700 dark:text-slate-500 dark:border-navy-700',
    slate: active
      ? 'bg-slate-800 text-slate-100 border-slate-700 shadow-slate-900/20 dark:bg-navy-800 dark:border-navy-600'
      : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-navy-700 dark:text-slate-500 dark:border-navy-700',
    indigo: active
      ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/20'
      : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-navy-700 dark:text-slate-500 dark:border-navy-700',
    emerald: active
      ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20'
      : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-navy-700 dark:text-slate-500 dark:border-navy-700',
    rose: active
      ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20'
      : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-navy-700 dark:text-slate-500 dark:border-navy-700',
    purple: active
      ? 'bg-purple-600 text-white border-purple-500 shadow-purple-600/20'
      : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-navy-700 dark:text-slate-500 dark:border-navy-700',
  };

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-2xl border-2 font-black transition-all ${
        sizeClasses[size]
      } ${colorStyles[color]} ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
