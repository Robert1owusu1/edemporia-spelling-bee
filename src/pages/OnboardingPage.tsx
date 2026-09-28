import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BeeMascot from '../components/BeeMascot';
import Navbar from '../components/Navbar';
import { Volume2, Mic, Trophy, ArrowRight, ArrowLeft } from 'lucide-react';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep((prev) => prev + 1);
    } else {
      navigate('/login');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-[#0A1128] dark:bg-navy-900 dark:text-slate-100">
      <Navbar />

      <main
        id="main-content"
        className="flex-1 max-w-xl w-full mx-auto px-4 py-12 flex flex-col justify-center items-center"
      >
        {/* Single h1 for the page (screen-reader only): the step headings
            below are the visible titles and stay at h2. */}
        <h1 className="sr-only">Getting started with Spelling Bee</h1>
        <div className="w-full bg-white border-2 border-[#1C2E5A] rounded-3xl p-6 sm:p-8 shadow-xl space-y-8 text-center dark:bg-navy-800 dark:border-navy-600">
          {/* Step Progress Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4 dark:border-navy-700">
            {/* role="status" so advancing or going back announces the new
                step; the dots below carry the same value for AT that expose
                progressbars. */}
            <span role="status" className="text-xs font-mono font-bold text-[#D97706] uppercase tracking-wider">
              Step {step} of {totalSteps}
            </span>
            <div
              className="flex gap-1.5"
              role="progressbar"
              aria-label="Onboarding progress"
              aria-valuemin={1}
              aria-valuemax={totalSteps}
              aria-valuenow={step}
              aria-valuetext={`Step ${step} of ${totalSteps}`}
            >
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all ${
                    s === step
                      ? 'w-8 bg-[#F59E0B]'
                      : s < step
                        ? 'w-4 bg-[#1C2E5A] dark:bg-navy-600'
                        : 'w-4 bg-[#E2E8F0] dark:bg-navy-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Step 1: Hear a word */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-[#FEF3C7] border-2 border-[#FBBF24] flex items-center justify-center mx-auto text-[#D97706] dark:bg-amber-500/10 dark:border-amber-500/50">
                <Volume2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-[#0A1128] dark:text-slate-100">1. Hear Every Word</h2>
                <p className="text-sm text-[#64748B] leading-relaxed dark:text-slate-400">
                  Press the speaker button to hear high-quality audio pronunciation. You can also view definitions and
                  example sentences if you need a hint!
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Spell aloud or type */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-[#EEF2FF] border-2 border-indigo-300 flex items-center justify-center mx-auto text-[#6366F1] dark:bg-indigo-500/10">
                <Mic className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-[#0A1128] dark:text-slate-100">2. Speak Your Spelling</h2>
                <p className="text-sm text-[#64748B] leading-relaxed dark:text-slate-400">
                  Spell the word aloud letter by letter into your microphone ("k... e... n... t... e"). Voice is the way
                  to spell — just press the microphone and speak.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Earn rewards */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center mx-auto text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                <Trophy className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-[#0A1128] dark:text-slate-100">3. Earn Badges & Tiers</h2>
                <p className="text-sm text-[#64748B] leading-relaxed dark:text-slate-400">
                  Build streak flames, protect your hearts, earn points, unlock new difficulty tiers on the trail map,
                  and climb the student leaderboard.
                </p>
              </div>
            </div>
          )}

          {/* Mascot cheer */}
          <div className="pt-2 flex items-center justify-center">
            <BeeMascot variant="emoji" size="md" />
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0] dark:border-navy-700">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#475569] hover:bg-[#F8FAFC] cursor-pointer dark:border-navy-600 dark:text-slate-300 dark:hover:bg-navy-700"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#0A1128] font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl transition-colors cursor-pointer shadow-xs ml-auto"
            >
              <span>{step === totalSteps ? 'Get Started' : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
