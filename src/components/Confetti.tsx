import { useMemo } from 'react';

const COLORS = ['#F59E0B', '#FBBF24', '#6366F1', '#10B981', '#F43F5E', '#38BDF8', '#A78BFA'];

interface ConfettiProps {
  count?: number;
}

// One-shot confetti burst. Pure CSS, no canvas — cheap enough to replay on
// every correct round without impacting a phone's frame rate.
export default function Confetti({ count = 60 }: ConfettiProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const size = 6 + Math.random() * 8;
        return {
          id: i,
          left: `${Math.random() * 100}%`,
          size,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          duration: `${1.6 + Math.random() * 1.6}s`,
          delay: `${Math.random() * 0.6}s`,
          rotate: `${Math.random() * 360}deg`,
        };
      }),
    [count],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece"
          style={{
            left: piece.left,
            width: `${piece.size}px`,
            height: `${piece.size * 0.45}px`,
            backgroundColor: piece.color,
            borderRadius: '2px',
            animationDuration: piece.duration,
            animationDelay: piece.delay,
            transform: `rotate(${piece.rotate})`,
          }}
        />
      ))}
    </div>
  );
}
