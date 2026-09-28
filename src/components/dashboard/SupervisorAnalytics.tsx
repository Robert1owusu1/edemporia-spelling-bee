import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { Student } from '../../api/types';
import { BarChart3, Clock, Sparkles, Target, TrendingUp, Users } from 'lucide-react';

interface SupervisorAnalyticsProps {
  students: Student[];
}

const TIER_COLORS = ['#60A5FA', '#22D3EE', '#34D399', '#FBBF24', '#818CF8', '#A78BFA'];

export default function SupervisorAnalytics({ students }: SupervisorAnalyticsProps) {
  const summary = useMemo(() => {
    const attempted = students.reduce((sum, student) => sum + (student.totalWordsAttemptedToday || 0), 0);
    const spelled = students.reduce((sum, student) => sum + (student.wordsSpelledToday || 0), 0);
    const minutes = students.reduce((sum, student) => sum + (student.totalTimeSpentMinutes || 0), 0);
    const active = students.filter((student) => student.isLoggedInToday).length;
    const tierData = Array.from({ length: 6 }, (_, index) => {
      const tier = index + 1;
      const learners = students.filter((student) => (student.currentTier || 1) === tier);
      const tierAttempted = learners.reduce((sum, student) => sum + (student.totalWordsAttemptedToday || 0), 0);
      const tierSpelled = learners.reduce((sum, student) => sum + (student.wordsSpelledToday || 0), 0);
      return {
        tier: `Tier ${tier}`,
        learners: learners.length,
        accuracy: tierAttempted ? Math.round((tierSpelled / tierAttempted) * 100) : 0,
        color: TIER_COLORS[index],
      };
    });
    const engagementData = [
      { name: 'Active today', value: active, color: '#10B981' },
      { name: 'Needs follow-up', value: Math.max(students.length - active, 0), color: '#F59E0B' },
    ];
    const practiceData = [...students]
      .sort((a, b) => (b.totalTimeSpentMinutes || 0) - (a.totalTimeSpentMinutes || 0))
      .slice(0, 6)
      .map((student) => ({
        name: student.name.split(' ')[0],
        minutes: student.totalTimeSpentMinutes || 0,
        words: student.wordsSpelledToday || 0,
      }));

    return {
      active,
      attempted,
      minutes,
      accuracy: attempted ? Math.round((spelled / attempted) * 100) : 0,
      tierData,
      engagementData,
      practiceData,
    };
  }, [students]);

  if (!students.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-navy-600 dark:bg-navy-800 dark:text-slate-400">
        No learners match these filters. Adjust the filters to see analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Engagement rate',
            value: `${Math.round((summary.active / students.length) * 100)}%`,
            detail: `${summary.active} active today`,
            icon: TrendingUp,
            tone: 'text-emerald-500 bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10',
          },
          {
            label: 'Spelling accuracy',
            value: `${summary.accuracy}%`,
            detail: `${summary.attempted} attempts today`,
            icon: Target,
            tone: 'text-indigo-500 bg-indigo-50 border-indigo-100 dark:bg-indigo-500/10',
          },
          {
            label: 'Practice time',
            value: `${summary.minutes}m`,
            detail: `${students.length ? Math.round(summary.minutes / students.length) : 0}m per learner`,
            icon: Clock,
            tone: 'text-amber-500 bg-amber-50 border-amber-100 dark:bg-amber-500/10',
          },
          {
            label: 'Learners in scope',
            value: `${students.length}`,
            detail: 'Current filtered cohort',
            icon: Users,
            tone: 'text-purple-500 bg-purple-50 border-purple-100 dark:bg-purple-500/10',
          },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-navy-700 dark:bg-navy-800"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {label}
              </p>
              <span className={`rounded-xl border p-2 ${tone}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-black text-slate-900 dark:text-slate-100">{value}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-navy-700 dark:bg-navy-800">
          <div className="mb-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              Learners and accuracy by tier
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Accuracy is calculated from today's completed attempts.
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.tierData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="tier" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis yAxisId="count" tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <YAxis
                  yAxisId="accuracy"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  unit="%"
                />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#CBD5E1', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="count" dataKey="learners" name="Learners" fill="#6366F1" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="accuracy" dataKey="accuracy" name="Accuracy" radius={[6, 6, 0, 0]}>
                  {summary.tierData.map((item) => (
                    <Cell key={item.tier} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-navy-700 dark:bg-navy-800">
          <div className="mb-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Practice leaders
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              The six learners with the most recorded practice time.
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.practiceData}
                layout="vertical"
                margin={{ top: 4, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#CBD5E1', fontSize: 12 }} />
                <Bar dataKey="minutes" name="Practice minutes" fill="#F59E0B" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-navy-700 dark:bg-navy-800">
        <div className="grid items-center gap-4 sm:grid-cols-[0.8fr_1.2fr]">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary.engagementData} dataKey="value" innerRadius={48} outerRadius={74} paddingAngle={4}>
                  {summary.engagementData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Engagement health</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Use the roster's activity filter to quickly reach learners who need a nudge.
            </p>
            <div className="mt-4 space-y-2">
              {summary.engagementData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-navy-900"
                >
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                    {item.name}
                  </span>
                  <strong className="text-slate-900 dark:text-slate-100">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
