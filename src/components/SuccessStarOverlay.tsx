import BeeMascot from './BeeMascot';
import { starsFor } from '../utils/format';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { Sparkles, Star, Trophy, CheckCircle2, Zap } from 'lucide-react';

interface SuccessStarOverlayProps {
  score: number;
  totalWords: number;
  pointsEarned?: number;
  onClose?: () => void;
}

export default function SuccessStarOverlay({ score, totalWords, pointsEarned = 0, onClose }: SuccessStarOverlayProps) {
  const stars = starsFor(score, totalWords);
  // Dismissable (Escape / backdrop) only when the caller gave us somewhere to
  // jump to; without an onClose the learner advances through the results page.
  const dialogRef = useDialogFocus({ open: true, onClose: onClose ?? (() => {}) });

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      {/* Invisible full-bleed button: a click on the backdrop dismisses the
          overlay for pointer users; keyboard users get Escape and the
          Continue button instead. */}
      {onClose && (
        <button
          type="button"
          aria-label="Close results"
          onClick={onClose}
          className="absolute inset-0 cursor-default"
        />
      )}
      {/* Animated Star Burst Canvas Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        {[...Array(16)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-ping opacity-75"
            style={{
              transform: `rotate(${i * 22.5}deg) translateY(-140px)`,
              animationDuration: `${1.2 + (i % 3) * 0.4}s`,
              animationIterationCount: 'infinite',
            }}
          >
            <Star className="w-8 h-8 text-[#FBBF24] fill-[#F59E0B]" />
          </div>
        ))}
      </div>

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-star-title"
        className="relative z-10 bg-white border-4 border-[#FBBF24] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-6 transform animate-bounce-once dark:bg-navy-800"
      >
        <div className="relative inline-block">
          <BeeMascot size="xl" expression="celebrating" className="mx-auto" />
          <div className="absolute -top-3 -right-3 bg-[#F59E0B] text-[#0A1128] p-2 rounded-full shadow-md animate-spin-slow">
            <Trophy className="w-6 h-6 stroke-[2.5]" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-[#FEF3C7] text-[#B45309] border border-[#FBBF24] px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
            <span>Set Complete!</span>
          </div>

          <h2 id="success-star-title" className="text-2xl sm:text-3xl font-black text-[#0A1128] dark:text-slate-100">
            Great Job!
          </h2>
          <p className="text-sm font-medium text-[#64748B] dark:text-slate-400">
            You successfully finished all {totalWords} words in this set!
          </p>
        </div>

        {/* Star Rating: the row reads as one image so screen readers hear the
            score ("2 out of 3 stars") instead of three anonymous icons. */}
        <div className="flex items-center justify-center gap-2" role="img" aria-label={`${stars} out of 3 stars`}>
          {[1, 2, 3].map((position) => (
            <Star
              key={position}
              aria-hidden="true"
              focusable="false"
              className={`w-10 h-10 sm:w-12 sm:h-12 ${
                position <= stars
                  ? 'text-[#F59E0B] fill-[#F59E0B] drop-shadow-sm animate-pop'
                  : 'text-slate-200 fill-slate-200'
              }`}
              style={{ animationDelay: `${0.3 + position * 0.15}s` }}
            />
          ))}
        </div>

        <div className="bg-[#F8FAFC] border-2 border-[#E2E8F0] p-4 rounded-2xl flex items-center justify-around dark:bg-navy-700 dark:border-navy-600">
          <div>
            <p className="text-[10px] font-mono uppercase text-[#64748B] dark:text-slate-400">Words Spelled</p>
            <p className="text-2xl font-black text-[#1C2E5A] dark:text-slate-100">
              {score} / {totalWords}
            </p>
          </div>
          <div className="w-px h-8 bg-[#E2E8F0] dark:bg-navy-600" />
          <div>
            <p className="text-[10px] font-mono uppercase text-[#64748B] dark:text-slate-400">Accuracy</p>
            <p className="text-2xl font-black text-emerald-600">{Math.round((score / totalWords) * 100)}%</p>
          </div>
          {pointsEarned > 0 && (
            <>
              <div className="w-px h-8 bg-[#E2E8F0] dark:bg-navy-600" />
              <div>
                <p className="text-[10px] font-mono uppercase text-[#64748B] dark:text-slate-400">XP Earned</p>
                <p className="text-2xl font-black text-amber-600 flex items-center gap-1">
                  <Zap className="w-5 h-5 fill-current" />+{pointsEarned}
                </p>
              </div>
            </>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-full min-tap bg-[#F59E0B] hover:bg-[#D97706] text-[#0A1128] font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-2xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            <span>Continue to Results</span>
          </button>
        )}
      </div>
    </div>
  );
}
