import { Student } from '../../api/types';
import ClassroomManager from './ClassroomManager';
import FilterSelect from './FilterSelect';
import { ACTIVITY_OPTIONS, TIER_OPTIONS } from './filterOptions';
import type { ActivityFilter, SupervisorFilters, TierFilter } from '../../hooks/useSupervisorData';
import { Users, Copy, Check, Printer, Sparkles, Flame, Search, X } from 'lucide-react';

interface RosterTabProps {
  students: Student[];
  filteredStudents: Student[];
  filteredActiveCount: number;
  filteredAccuracy: number;
  isTeacher: boolean;
  refreshStudents: () => Promise<Student[]>;
  filters: SupervisorFilters;
  copiedCode: string | null;
  newlyCreatedStudent: Student | null;
  onCopyCode: (code: string) => void;
  onDismissNewStudent: () => void;
  onPrintBadge: (student: Student) => void;
  onOpenStudent: (student: Student) => void;
}

// TAB 1: STUDENT ROSTER & MONITOR
export default function RosterTab({
  students,
  filteredStudents,
  filteredActiveCount,
  filteredAccuracy,
  isTeacher,
  refreshStudents,
  filters,
  copiedCode,
  newlyCreatedStudent,
  onCopyCode,
  onDismissNewStudent,
  onPrintBadge,
  onOpenStudent,
}: RosterTabProps) {
  const { uniqueClasses, searchQuery, setSearchQuery } = filters;

  return (
    <div className="space-y-6">
      {/* Copy flashes are icon-only, so mirror them into one polite region. */}
      <p className="sr-only" role="status">
        {copiedCode ? 'Student ID copied to clipboard.' : ''}
      </p>
      {isTeacher && <ClassroomManager students={students} onChange={refreshStudents} />}
      {/* Newly Created Student Banner Callout */}
      {newlyCreatedStudent && (
        <div
          role="status"
          className="bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-400 rounded-2xl p-6 shadow-sm space-y-3 relative"
        >
          <button
            type="button"
            onClick={() => onDismissNewStudent()}
            aria-label="Dismiss registration banner"
            className="absolute top-4 right-4 text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-200 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" focusable="false" />
          </button>
          <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Student Profile Registered Successfully</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-navy-800 p-4 rounded-xl border border-amber-200 dark:border-amber-500/30">
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">{newlyCreatedStudent.name}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {newlyCreatedStudent.className} • Age {newlyCreatedStudent.age}
                {newlyCreatedStudent.age >= 10 && (
                  <span className="ml-2 bg-slate-900 dark:bg-navy-700 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">
                    🐝 Age 10+ Explorer
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-900 dark:bg-navy-700 text-amber-400 font-mono font-bold text-base px-4 py-2 rounded-xl border border-slate-800 dark:border-navy-700 flex items-center gap-2">
                <span>{newlyCreatedStudent.studentCode || `ST-${newlyCreatedStudent.id.slice(-5)}`}</span>
                <button
                  type="button"
                  onClick={() =>
                    onCopyCode(newlyCreatedStudent.studentCode || `ST-${newlyCreatedStudent.id.slice(-5)}`)
                  }
                  className="hover:text-white transition-colors cursor-pointer"
                  title="Copy Student Code"
                  aria-label="Copy student login code"
                >
                  {copiedCode === (newlyCreatedStudent.studentCode || `ST-${newlyCreatedStudent.id.slice(-5)}`) ? (
                    <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" focusable="false" />
                  ) : (
                    <Copy className="w-4 h-4" aria-hidden="true" focusable="false" />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => onPrintBadge(newlyCreatedStudent)}
                className="bg-slate-100 dark:bg-navy-700 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-800 dark:text-slate-200 font-bold text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-navy-600 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print ID Card</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search
                className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3"
                aria-hidden="true"
                focusable="false"
              />
              <label className="sr-only" htmlFor="roster-search">
                Search student name or ID
              </label>
              <input
                id="roster-search"
                type="text"
                placeholder="Search student name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-xs"
              />
            </div>

            {uniqueClasses.length > 0 && (
              <FilterSelect
                value={filters.selectedClassFilter}
                onChange={filters.setSelectedClassFilter}
                allLabel="All Classes / Grades"
                ariaLabel="Filter learners by class or grade"
                options={uniqueClasses.map((cls) => ({ value: cls, label: cls }))}
              />
            )}

            <FilterSelect
              value={filters.selectedActivityFilter}
              onChange={(value) => filters.setSelectedActivityFilter(value as ActivityFilter)}
              allLabel="All activity states"
              ariaLabel="Filter learners by activity"
              options={ACTIVITY_OPTIONS}
            />

            <FilterSelect
              value={filters.selectedTierFilter}
              onChange={(value) => filters.setSelectedTierFilter(value as TierFilter)}
              allLabel="All tiers"
              ariaLabel="Filter learners by tier"
              options={TIER_OPTIONS}
            />
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing {filteredStudents.length} of {students.length} students
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Filtered active</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{filteredActiveCount}</p>
          </div>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 dark:bg-indigo-500/10 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
              Filtered accuracy
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{filteredAccuracy}%</p>
          </div>
          <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Filtered roster</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {filteredStudents.length} learners
            </p>
          </div>
        </div>
      </div>

      {/* Student Cards List */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">No Students Found</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal max-w-sm mx-auto">
              {students.length === 0
                ? 'No students registered under your account yet. Click "Register New Student" to generate their Student ID.'
                : 'No student matches your search query.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStudents.map((st) => {
            const code = st.studentCode || `ST-${st.id.slice(-5)}`;
            const isCopying = copiedCode === code;
            const isActive = st.isLoggedInToday;

            return (
              <div
                key={st.id}
                className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 hover:border-amber-400/80 rounded-2xl p-6 shadow-xs transition-all space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-navy-700">
                  {/* Student Info */}
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-xs shrink-0 cursor-pointer"
                      style={{ backgroundColor: st.avatarColor || '#F59E0B' }}
                      onClick={() => onOpenStudent(st)}
                      aria-label={`Open details for ${st.name}`}
                    >
                      {st.name.charAt(0)}
                    </button>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                          <button
                            type="button"
                            onClick={() => onOpenStudent(st)}
                            className="hover:text-amber-600 transition-colors cursor-pointer"
                          >
                            {st.name}
                          </button>
                        </h2>

                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Logged In Today</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-navy-700 border border-slate-200 dark:border-navy-700 px-2 py-0.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            <span>Inactive Today</span>
                          </span>
                        )}

                        {st.age >= 10 && (
                          <span className="text-[10px] font-black text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 px-2 py-0.5 rounded-full">
                            🐝 Explorer
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {st.className} • Age {st.age} • Tier {st.currentTier} Speller
                      </p>
                    </div>
                  </div>

                  {/* ID Tag & Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                    <div className="bg-slate-900 dark:bg-navy-700 text-amber-400 font-mono font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-800 dark:border-navy-700 flex items-center gap-2 shadow-xs">
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider font-sans">
                        ID:
                      </span>
                      <span>{code}</span>
                      <button
                        type="button"
                        onClick={() => onCopyCode(code)}
                        className="hover:text-white transition-colors cursor-pointer"
                        title="Copy Code"
                        aria-label={`Copy student ID ${code}`}
                      >
                        {isCopying ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" focusable="false" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenStudent(st)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-1.5 px-3 rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      onClick={() => onPrintBadge(st)}
                      aria-label={`Print badge for ${st.name}`}
                      className="bg-slate-100 dark:bg-navy-700 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-700 dark:text-slate-300 font-semibold text-xs py-1.5 px-3 rounded-xl border border-slate-200 dark:border-navy-700 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
                      <span className="hidden sm:inline">Badge</span>
                    </button>
                  </div>
                </div>

                {/* Monitoring Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 dark:bg-navy-700/70 p-4 rounded-xl border border-slate-200/60 dark:border-navy-700 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Practice Duration
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                      {st.totalTimeSpentMinutes || 0} mins
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Words Attempted
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                      {st.wordsSpelledToday || 0} / {st.totalWordsAttemptedToday || 0}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Daily Streak
                    </span>
                    <span className="font-extrabold text-amber-800 dark:text-amber-300 text-sm flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-500 fill-current" />
                      <span>{st.dailyStreak || 0} Days</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Earned XP
                    </span>
                    <span className="font-extrabold text-indigo-700 dark:text-indigo-300 text-sm">
                      ⭐ {(st.points || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
