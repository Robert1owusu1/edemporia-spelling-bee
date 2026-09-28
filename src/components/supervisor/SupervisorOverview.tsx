import type { SupervisorStats } from '../../hooks/useSupervisorData';
import { Users, Clock, CheckCircle2, Sparkles, School, Download, Plus, MessageSquareText } from 'lucide-react';

// One card in the four-up metric row; the four cards differ only in icon,
// label and value, so the shell class string lives in a single constant.
const METRIC_CARD_CLASS =
  'bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-5 shadow-xs flex items-center gap-4';

interface SupervisorOverviewProps {
  supervisorTitle: string;
  stats: SupervisorStats;
  onExportCSV: () => void;
  onRegisterStudent: () => void;
  onOpenRoster: () => void;
}

// Header, headline metrics and the at-a-glance panels shown above the tabs.
export default function SupervisorOverview({
  supervisorTitle,
  stats,
  onExportCSV,
  onRegisterStudent,
  onOpenRoster,
}: SupervisorOverviewProps) {
  const {
    totalStudents,
    activeTodayCount,
    totalTimeSpentMinutes,
    classAccuracy,
    needsFollowUp,
    topPerformer,
    recentActivity,
  } = stats;

  return (
    <>
      {/* Header Title Section */}
      <div className="bg-slate-900 dark:bg-navy-800 border border-slate-800 dark:border-navy-700 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-300 bg-amber-950/80 border border-amber-800/80 px-3 py-1 rounded-full">
            <School className="w-4 h-4 text-amber-400" />
            <span>{supervisorTitle}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Student Activity & Curriculum Monitor</h1>
          <p className="text-xs text-slate-300 font-normal max-w-2xl leading-relaxed">
            Monitor learner logins, spelling accuracy, practice time, and class progress across every tier of the word
            trail.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExportCSV}
            className="inline-flex items-center gap-2 bg-slate-800 dark:bg-navy-800 hover:bg-slate-700 dark:hover:bg-navy-700 text-slate-200 font-bold text-xs py-3 px-4 rounded-xl border border-slate-700 dark:border-navy-600 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export Roster CSV</span>
          </button>

          <button
            type="button"
            onClick={onRegisterStudent}
            className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs uppercase tracking-wider py-3 px-5 rounded-xl transition-all cursor-pointer shadow-md shrink-0 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Student</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={METRIC_CARD_CLASS}>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 flex items-center justify-center text-indigo-700 dark:text-indigo-300 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Monitored
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalStudents} Learners</p>
          </div>
        </div>

        <div className={METRIC_CARD_CLASS}>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Today
            </p>
            <p className="text-2xl font-black text-emerald-700">{activeTodayCount} Logged In</p>
          </div>
        </div>

        <div className={METRIC_CARD_CLASS}>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Practice Time
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {Math.floor(totalTimeSpentMinutes / 60)}h {totalTimeSpentMinutes % 60}m
            </p>
          </div>
        </div>

        <div className={METRIC_CARD_CLASS}>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Class Accuracy
            </p>
            <p className="text-2xl font-black text-purple-700">{classAccuracy}% Accuracy</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-300 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-semibold">
            Admin access stays restricted to teacher and parent supervisor credentials.
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider">Secure educator sign-in</span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                Supervisor overview
              </p>
              <h2 className="text-xl font-semibold text-[#0A1128] dark:text-slate-100">At-a-glance monitoring</h2>
            </div>
            <button
              type="button"
              onClick={onOpenRoster}
              className="rounded-xl border border-slate-200 dark:border-navy-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              Open roster
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Engagement pulse</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {activeTodayCount}/{totalStudents} learners active
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Top performer</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {topPerformer?.name || 'No data yet'}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
              Needs attention
            </h3>
            {needsFollowUp.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-700 p-4 text-sm text-slate-600 dark:text-slate-400">
                Everything is looking healthy right now.
              </div>
            ) : (
              needsFollowUp.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-700 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{student.className}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 dark:bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                    Follow up
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-[#0A1128] dark:text-slate-100">Recent activity</h3>
          </div>
          <div className="mt-6 space-y-3">
            {recentActivity.map((student) => (
              <div
                key={student.id}
                className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-700 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</p>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {student.isLoggedInToday ? 'Active' : 'Idle'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Tier {student.currentTier} • {student.points || 0} points
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
