import { Link } from 'react-router-dom';
import BeeMascot from './BeeMascot';
import { ShieldCheck, School, UserCheck, Volume2, Heart, Globe, Award } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 font-sans select-none mt-auto dark:bg-navy-800 dark:border-navy-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 pb-12 border-b border-slate-800 dark:border-navy-700">
          {/* Brand & Mission Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5 group w-fit">
              <BeeMascot size="md" />
              <div>
                <span className="font-bold text-lg text-white group-hover:text-amber-400 transition-colors">
                  Spelling Bee
                </span>
                <p className="text-xs text-slate-400">Interactive Spoken Learning Trail</p>
              </div>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Empowering students, teachers, and parents through voice-first spelling challenges, adaptive difficulty
              tiers, and real-time supervisor monitoring for classroom and home success.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Supervised Accounts</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 rounded-md">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Speech & Voice Guided Practice</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 bg-indigo-950/60 border border-indigo-800/80 px-2.5 py-1 rounded-md">
                <Award className="w-3.5 h-3.5" />
                <span>Voice-First Spelling</span>
              </span>
            </div>
          </div>

          {/* Quick Learning Links */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Learning Trail</h2>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link to="/trail" className="hover:text-amber-400 transition-colors">
                  Interactive Trail Map
                </Link>
              </li>
              <li>
                <Link to="/daily-challenge" className="hover:text-amber-400 transition-colors">
                  Daily Word Challenge
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="hover:text-amber-400 transition-colors">
                  Champions Leaderboard
                </Link>
              </li>
              <li>
                <Link to="/badges" className="hover:text-amber-400 transition-colors">
                  Honeycomb Badges
                </Link>
              </li>
            </ul>
          </div>

          {/* Accounts & Monitoring */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Accounts & Monitoring</h2>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link to="/supervisor" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-amber-400" />
                  <span>Teacher & Parent Portal</span>
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Student Login with ID</span>
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-amber-400 transition-colors">
                  Independent Student (15+)
                </Link>
              </li>
              <li>
                <Link to="/settings" className="hover:text-amber-400 transition-colors">
                  Audio & Voice Settings
                </Link>
              </li>
            </ul>
          </div>

          {/* Accessibility & Platform Info */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Education & Safety</h2>
            <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
              <p>
                Children under 15 are linked to supervised parent or teacher accounts with unique 5-digit Student IDs.
              </p>
              <p>Students 15 and above can create independent personal learning accounts.</p>
              <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-500 font-normal">
                <Globe className="w-3 h-3 text-slate-400" />
                <span>Web & Voice Accessible</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legal Copyright Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p className="flex items-center gap-1">
            <span>© 2026 Spelling Bee. Built with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-current inline" />
            <span>for young learners worldwide.</span>
          </p>

          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-slate-300 transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <span className="hover:text-slate-300 transition-colors">COPPA & FERPA Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
