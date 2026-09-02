import React from 'react';

interface BeeMascotProps {
  mood?: 'happy' | 'celebrate' | 'thinking' | 'encourage' | 'sad';
  expression?: 'happy' | 'thinking' | 'celebrating' | 'cheering';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  speakingText?: string;
}

export default function BeeMascot({
  mood,
  expression,
  size = 'md',
  className = '',
  speakingText,
}: BeeMascotProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-base',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl',
    xl: 'w-24 h-24 text-5xl',
  };

  const moodEmojis = {
    happy: '🐝',
    celebrate: '🐝🎉',
    thinking: '🐝💭',
    encourage: '🐝💪',
    sad: '🐝💔',
  };

  const resolvedMood = mood ?? (expression === 'celebrating' || expression === 'cheering' ? 'celebrate' : expression === 'thinking' ? 'thinking' : 'happy');

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shadow-xs select-none transition-transform hover:scale-105`}
      >
        <span>{moodEmojis[resolvedMood] || '🐝'}</span>
      </div>

      {speakingText && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-slate-900 text-amber-300 font-bold text-xs py-1.5 px-3 rounded-xl border border-slate-800 shadow-md whitespace-nowrap z-10 animate-fade-in">
          <span>{speakingText}</span>
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
        </div>
      )}
    </div>
  );
}
