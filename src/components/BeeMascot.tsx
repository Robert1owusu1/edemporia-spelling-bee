// One mascot, two renderings. The game surfaces (navbar, footer, game loop,
// spelling interaction) draw the illustrated SVG bee, while the landing,
// onboarding and auth screens use a lightweight emoji chip so their first
// paint stays cheap. `variant` picks the rendering; size/className/expression
// behave the same on both so a caller can switch variants without touching
// the rest of its markup.

interface BeeMascotProps {
  /** 'illustration' = inline SVG bee (default); 'emoji' = emoji chip. */
  variant?: 'illustration' | 'emoji';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  expression?: 'happy' | 'thinking' | 'celebrating' | 'cheering';
  /** Emoji variant only: explicit mood; derived from `expression` when omitted. */
  mood?: 'happy' | 'celebrate' | 'thinking' | 'encourage' | 'sad';
  /** Emoji variant only: speech bubble rendered next to the chip. */
  speakingText?: string;
}

function IllustrationMascot({
  size = 'md',
  className = '',
  expression = 'happy',
}: Pick<BeeMascotProps, 'size' | 'className' | 'expression'>) {
  let dimensions = 'w-16 h-16';
  if (size === 'sm') dimensions = 'w-10 h-10';
  if (size === 'lg') dimensions = 'w-24 h-24';
  if (size === 'xl') dimensions = 'w-36 h-36';

  return (
    // Purely decorative cheer art: hidden from assistive tech so it never
    // interrupts the reading of the surrounding copy. `focusable="false"` is
    // SVG-only (old Edge/IE would otherwise put the graphic in the tab order),
    // so it lives on each <svg> below rather than on this wrapper <div>.
    <div
      aria-hidden="true"
      className={`relative inline-flex items-center justify-center shrink-0 ${dimensions} ${className}`}
    >
      {/* Background Honeycomb Hexagon Accent */}
      <svg
        focusable="false"
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full text-[#FEF3C7] dark:text-[#1C2E5A]/40 drop-shadow-xs"
        fill="currentColor"
      >
        <polygon points="50 3, 93 25, 93 75, 50 97, 7 75, 7 25" />
      </svg>

      <svg
        focusable="false"
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
        <ellipse cx="60" cy="60" rx="26" ry="28" fill="#F59E0B" stroke="#0A1128" strokeWidth="4" />

        {/* Amber Body Stripes */}
        <path
          d="M 37 54 C 45 58, 75 58, 83 54 C 82 60, 78 63, 82 64 C 74 68, 46 68, 38 64 C 42 63, 38 60, 37 54 Z"
          fill="#0A1128"
        />
        <path d="M 41 72 C 48 75, 72 75, 79 72 C 77 77, 71 81, 60 83 C 49 81, 43 77, 41 72 Z" fill="#0A1128" />

        {/* Head */}
        <circle cx="60" cy="38" r="16" fill="#0A1128" />

        {/* Antennae */}
        <path d="M 52 26 C 48 18, 42 16, 40 18" stroke="#0A1128" strokeWidth="3" strokeLinecap="round" />
        <circle cx="39" cy="18" r="3" fill="#FBBF24" />

        <path d="M 68 26 C 72 18, 78 16, 80 18" stroke="#0A1128" strokeWidth="3" strokeLinecap="round" />
        <circle cx="81" cy="18" r="3" fill="#FBBF24" />

        {/* Cute Eyes */}
        <circle cx="54" cy="38" r="2.5" fill="#FFFFFF" />
        <circle cx="66" cy="38" r="2.5" fill="#FFFFFF" />

        {/* Smile / Expression */}
        {expression === 'celebrating' ? (
          <path d="M 55 43 Q 60 48 65 43" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
        ) : (
          <path d="M 56 42 Q 60 45 64 42" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
}

function EmojiMascot({
  mood,
  expression,
  size = 'md',
  className = '',
  speakingText,
}: Pick<BeeMascotProps, 'mood' | 'expression' | 'size' | 'className' | 'speakingText'>) {
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

  const resolvedMood =
    mood ??
    (expression === 'celebrating' || expression === 'cheering'
      ? 'celebrate'
      : expression === 'thinking'
        ? 'thinking'
        : 'happy');

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* `focusable` is an SVG attribute only; this chip is a plain <div>, so
          aria-hidden alone keeps it (and its emoji) out of the a11y tree. */}
      <div
        aria-hidden="true"
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

export default function BeeMascot({
  variant = 'illustration',
  size,
  className,
  expression,
  mood,
  speakingText,
}: BeeMascotProps) {
  if (variant === 'emoji') {
    return (
      <EmojiMascot mood={mood} expression={expression} size={size} className={className} speakingText={speakingText} />
    );
  }
  return <IllustrationMascot size={size} className={className} expression={expression} />;
}
