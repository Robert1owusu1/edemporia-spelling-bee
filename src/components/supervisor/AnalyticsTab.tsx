import { lazy, Suspense } from 'react';
import { Student } from '../../api/types';
import FilterSelect from './FilterSelect';
import { ACTIVITY_OPTIONS, TIER_OPTIONS } from './filterOptions';
import type { ActivityFilter, SupervisorFilters, TierFilter } from '../../hooks/useSupervisorData';
import { BarChart3, RotateCcw, SlidersHorizontal } from 'lucide-react';

const SupervisorAnalytics = lazy(() => import('../dashboard/SupervisorAnalytics'));

interface AnalyticsTabProps {
  filteredStudents: Student[];
  tierDistribution: Record<number, number>;
  filters: SupervisorFilters;
}

// TAB 2: CLASS ANALYTICS
export default function AnalyticsTab({ filteredStudents, tierDistribution, filters }: AnalyticsTabProps) {
  const { uniqueClasses } = filters;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-4 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">Analytics filters</span>
            <span className="text-slate-500 dark:text-slate-400">Showing {filteredStudents.length} learners</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {uniqueClasses.length > 0 && (
              <FilterSelect
                value={filters.selectedClassFilter}
                onChange={filters.setSelectedClassFilter}
                allLabel="All classes"
                ariaLabel="Filter analytics by class"
                options={uniqueClasses.map((cls) => ({ value: cls, label: cls }))}
              />
            )}
            <FilterSelect
              value={filters.selectedActivityFilter}
              onChange={(value) => filters.setSelectedActivityFilter(value as ActivityFilter)}
              allLabel="All activity"
              ariaLabel="Filter analytics by activity"
              options={ACTIVITY_OPTIONS}
            />
            <FilterSelect
              value={filters.selectedTierFilter}
              onChange={(value) => filters.setSelectedTierFilter(value as TierFilter)}
              allLabel="All tiers"
              ariaLabel="Filter analytics by tier"
              options={TIER_OPTIONS}
            />
            <button
              type="button"
              onClick={() => {
                filters.setSelectedClassFilter('ALL');
                filters.setSelectedActivityFilter('ALL');
                filters.setSelectedTierFilter('ALL');
                filters.setSearchQuery('');
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-navy-700 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-navy-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Visual Recharts Analytics Overview */}
      <Suspense
        fallback={
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-navy-600 dark:bg-navy-800 dark:text-slate-400">
            Loading analytics…
          </div>
        }
      >
        <SupervisorAnalytics students={filteredStudents} />
      </Suspense>

      <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          Class Tier Distribution & Performance Overview
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((tierNum) => (
            <div
              key={tierNum}
              className="bg-slate-50 dark:bg-navy-700 border border-slate-200 dark:border-navy-700 p-4 rounded-xl text-center space-y-1"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Tier {tierNum}
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {tierDistribution[tierNum] || 0}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
                {tierNum >= 4 ? 'Advanced Words' : 'Elementary'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
