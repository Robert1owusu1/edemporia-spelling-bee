import React from 'react';

interface BeeMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  expression?: 'happy' | 'thinking' | 'celebrating' | 'cheering';
}

export default function BeeMascot({
  size = 'md',
  className = '',
  expression = 'happy',
}: BeeMascotProps) {
  let dimensions = 'w-16 h-16';
  if (size === 'sm') dimensions = 'w-10 h-10';
  if (size === 'lg') dimensions = 'w-24 h-24';
  if (size === 'xl') dimensions = 'w-36 h-36';

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${dimensions} ${className}`}>
      {/* Background Honeycomb Hexagon Accent */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full text-[#FEF3C7] dark:text-[#1C2E5A]/40 drop-shadow-xs"
        fill="currentColor"
      >
        <polygon points="50 3, 93 25, 93 75, 50 97, 7 75, 7 25" />
      </svg>

      
      <svg
        viewBox="0 0 120 120"
        className="relative z-10 w-[82%] h-[82%] drop-shadow-sm"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left Wing */}
        <path
          d="M 42 42 C 20 20, 10 45, 38 52 Z"
          fill="#EEF2FF"
          stroke="#0A1128"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Right Wing */}
        <path
          d="M 78 42 C 100 20, 110 45, 82 52 Z"
          fill="#EEF2FF"
          stroke="#0A1128"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Bee Stinger */}
        <path d="M 60 92 L 54 82 L 66 82 Z" fill="#0A1128" />

        {/* Bee Body (Ovoid) */}
        <ellipse
          cx="60"
          cy="60"
          rx="26"
          ry="28"
          fill="#F59E0B"
          stroke="#0A1128"
          strokeWidth="4"
        />

        {/* Amber Body Stripes */}
        <path
          d="M 37 54 C 45 58, 75 58, 83 54 C 82 60, 78 63, 82 64 C 74 68, 46 68, 38 64 C 42 63, 38 60, 37 54 Z"
          fill="#0A1128"
        />
        <path
          d="M 41 72 C 48 75, 72 75, 79 72 C 77 77, 71 81, 60 83 C 49 81, 43 77, 41 72 Z"
          fill="#0A1128"
        />

        {/* Head */}
        <circle
          cx="60"
          cy="38"
          r="16"
          fill="#0A1128"
        />

        {/* Antennae */}
        <path
          d="M 52 26 C 48 18, 42 16, 40 18"
          stroke="#0A1128"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="39" cy="18" r="3" fill="#FBBF24" />

        <path
          d="M 68 26 C 72 18, 78 16, 80 18"
          stroke="#0A1128"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="81" cy="18" r="3" fill="#FBBF24" />

        {/* Cute Eyes */}
        <circle cx="54" cy="38" r="2.5" fill="#FFFFFF" />
        <circle cx="66" cy="38" r="2.5" fill="#FFFFFF" />

        {/* Smile / Expression */}
        {expression === 'celebrating' ? (
          <path
            d="M 55 43 Q 60 48 65 43"
            stroke="#FBBF24"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M 56 42 Q 60 45 64 42"
            stroke="#FBBF24"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}
