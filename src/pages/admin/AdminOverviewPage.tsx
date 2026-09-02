import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BookOpen, Clock3, Search, TrendingUp, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiClient } from '../../api/client';
import type { Student, Word } from '../../api/types';

const COLORS = ['#60A5FA', '#22D3EE', '#34D399', '#FBBF24', '#818CF8', '#A78BFA'];

export default function AdminOverviewPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'ACTIVE' | 'FOLLOW_UP'>('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError('');
      try { const [studentData, wordData] = await Promise.all([apiClient.getStudents(), apiClient.getWords()]); setStudents(studentData); setWords(wordData); }
      catch (err) { setError(err instanceof Error ? err.message : 'Unable to load admin overview.'); }
      finally { setLoading(false); }
    };
    void load();
  }, []);

  const classes = useMemo(() => Array.from(new Set(students.map((student) => student.className).filter(Boolean))).sort(), [students]);
  const visibleStudents = useMemo(() => students.filter((student) => {
    const matchClass = classFilter === 'ALL' || student.className === classFilter;
    const matchActivity = activityFilter === 'ALL' || (activityFilter === 'ACTIVE' ? student.isLoggedInToday : !student.isLoggedInToday);
    const needle = query.toLowerCase();
    const matchSearch = !needle || [student.name, student.className, student.studentCode].some((value) => value?.toLowerCase().includes(needle));
    return matchClass && matchActivity && matchSearch;
  }), [students, classFilter, activityFilter, query]);

  const dashboard = useMemo(() => {
    const active = visibleStudents.filter((student) => student.isLoggedInToday).length;
    const points = visibleStudents.reduce((sum, student) => sum + (student.points || 0), 0);
    const minutes = visibleStudents.reduce((sum, student) => sum + (student.totalTimeSpentMinutes || 0), 0);
    const attempted = visibleStudents.reduce((sum, student) => sum + (student.totalWordsAttemptedToday || 0), 0);
    const correct = visibleStudents.reduce((sum, student) => sum + (student.wordsSpelledToday || 0), 0);
    const tierData = Array.from({ length: 6 }, (_, index) => ({ tier: `T${index + 1}`, learners: visibleStudents.filter((student) => (student.currentTier || 1) === index + 1).length, color: COLORS[index] }));
    const wordTiers = Array.from({ length: 6 }, (_, index) => ({ name: `Tier ${index + 1}`, value: words.filter((word) => word.tier === index + 1).length, color: COLORS[index] })).filter((item) => item.value);
    const followUps = [...visibleStudents].filter((student) => !student.isLoggedInToday).sort((a, b) => (a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0) - (b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0)).slice(0, 5);
    const recent = [...visibleStudents].sort((a, b) => (b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0) - (a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0)).slice(0, 5);
    return { active, points, minutes, accuracy: attempted ? Math.round((correct / attempted) * 100) : 0, tierData, wordTiers, followUps, recent };
  }, [visibleStudents, words]);

  return <div className="space-y-6">
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0A1128] to-slate-800 p-6 text-white shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">Operations overview</p><div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 className="text-2xl font-semibold">Staff dashboard</h2><p className="mt-1 text-sm text-slate-300">A live view of learner engagement, progress, and content coverage.</p></div><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200">{visibleStudents.length} learners in view</span></div>
    </div>
    {error ? <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div> : null}
    {loading ? <div className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-10 text-center text-sm text-slate-600 dark:text-slate-400">Loading dashboard overview…</div> : <>
      <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="relative w-full lg:max-w-xs"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a learner or code…" className="w-full rounded-xl border border-slate-200 dark:border-navy-600 bg-slate-50 dark:bg-navy-700 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-400" /></div><div className="flex flex-wrap gap-2"><select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-3 py-2 text-xs font-semibold"><option value="ALL">All classes</option>{classes.map((className) => <option key={className} value={className}>{className}</option>)}</select><select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value as 'ALL' | 'ACTIVE' | 'FOLLOW_UP')} className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-3 py-2 text-xs font-semibold"><option value="ALL">All activity</option><option value="ACTIVE">Active today</option><option value="FOLLOW_UP">Needs follow-up</option></select></div></div></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[
        ['Active learners', dashboard.active, `${visibleStudents.length ? Math.round(dashboard.active / visibleStudents.length * 100) : 0}% of selected cohort`, Users, 'text-emerald-600'],
        ['Spelling accuracy', `${dashboard.accuracy}%`, 'Across today’s attempts', TrendingUp, 'text-indigo-600'],
        ['Practice recorded', `${dashboard.minutes}m`, 'For selected learners', Clock3, 'text-amber-600'],
        ['Points in play', dashboard.points.toLocaleString(), `${words.length} words in bank`, Activity, 'text-purple-600'],
      ].map(([label, value, detail, Icon, tone]) => { const MetricIcon = Icon as typeof Users; return <div key={label as string} className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-slate-500 dark:text-slate-400">{label as string}</p><MetricIcon className={`h-5 w-5 ${tone as string}`} /></div><p className="mt-4 text-3xl font-semibold text-[#0A1128] dark:text-slate-100">{value as React.ReactNode}</p><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{detail as string}</p></div>; })}</div>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]"><section className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-6 shadow-sm"><h3 className="text-lg font-semibold text-[#0A1128] dark:text-slate-100">Learner distribution by tier</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Use this to spot cohorts that may need more content or support.</p><div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={dashboard.tierData} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" /><XAxis dataKey="tier" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} /><Tooltip contentStyle={{ borderRadius: 12, borderColor: '#CBD5E1' }} /><Bar dataKey="learners" name="Learners" radius={[8, 8, 0, 0]}>{dashboard.tierData.map((item) => <Cell key={item.tier} fill={item.color} />)}</Bar></BarChart></ResponsiveContainer></div></section><section className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-6 shadow-sm"><h3 className="text-lg font-semibold text-[#0A1128] dark:text-slate-100">Word bank coverage</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Vocabulary entries available by tier.</p><div className="mt-3 h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dashboard.wordTiers} dataKey="value" innerRadius={45} outerRadius={72} paddingAngle={4}>{dashboard.wordTiers.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="space-y-1.5">{dashboard.wordTiers.map((item) => <div key={item.name} className="flex justify-between text-xs"><span className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><strong>{item.value}</strong></div>)}</div></section></div>
      <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-6 shadow-sm"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /><h3 className="text-lg font-semibold text-[#0A1128] dark:text-slate-100">Follow-up queue</h3></div><div className="mt-4 space-y-3">{dashboard.followUps.length ? dashboard.followUps.map((student) => <div key={student.id} className="flex items-center justify-between rounded-2xl bg-amber-50 dark:bg-amber-500/10 px-4 py-3"><div><p className="font-semibold text-[#0A1128] dark:text-slate-100">{student.name}</p><p className="text-sm text-slate-600 dark:text-slate-400">{student.className} · Tier {student.currentTier}</p></div><span className="rounded-full bg-amber-100 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">Inactive</span></div>) : <p className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">No follow-up needed in this view.</p>}</div></section><section className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-6 shadow-sm"><h3 className="text-lg font-semibold text-[#0A1128] dark:text-slate-100">Recent learner activity</h3><div className="mt-4 space-y-3">{dashboard.recent.map((student) => <div key={student.id} className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-navy-700 px-4 py-3"><div><p className="font-semibold text-[#0A1128] dark:text-slate-100">{student.name}</p><p className="text-sm text-slate-600 dark:text-slate-400">{student.points || 0} pts · {student.totalTimeSpentMinutes || 0}m practice</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${student.isLoggedInToday ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'bg-slate-200 dark:bg-navy-700 text-slate-600 dark:text-slate-400'}`}>{student.isLoggedInToday ? 'Active' : 'Idle'}</span></div>)}</div></section></div>
    </>}
  </div>;
}
