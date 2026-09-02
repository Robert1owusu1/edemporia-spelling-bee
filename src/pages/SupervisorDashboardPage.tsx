import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Student } from '../api/types';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CreateStudentForm from '../components/dashboard/CreateStudentForm';
import HexagonBadge from '../components/common/HexagonBadge';
import StudentDetailModal from '../components/supervisor/StudentDetailModal';
import CurriculumPreviewTab from '../components/supervisor/CurriculumPreviewTab';
import ClassroomManager from '../components/supervisor/ClassroomManager';
import { apiClient } from '../api/client';
import { audioFx } from '../utils/audioEffects';
import { copyToClipboard } from '../utils/clipboard';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Plus,
  Printer,
  Sparkles,
  Award,
  Flame,
  Search,
  School,
  X,
  ExternalLink,
  BookOpen,
  BarChart3,
  Download,
  Code,
  Heart,
  Target,
  Zap,
  MessageSquareText,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';

const SupervisorAnalytics = lazy(() => import('../components/dashboard/SupervisorAnalytics'));

export default function SupervisorDashboardPage() {
  const { account, students, refreshStudents, updateActiveStudentState } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'roster' | 'analytics' | 'curriculum' | 'goals'>('roster');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedActivityFilter, setSelectedActivityFilter] = useState<'ALL' | 'ACTIVE' | 'IDLE'>('ALL');
  const [selectedTierFilter, setSelectedTierFilter] = useState<'ALL' | '1' | '2' | '3' | '4' | '5' | '6'>('ALL');
  const [newlyCreatedStudent, setNewlyCreatedStudent] = useState<Student | null>(null);
  const [printModalStudent, setPrintModalStudent] = useState<Student | null>(null);
  const [detailModalStudent, setDetailModalStudent] = useState<Student | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<string[]>([]);

  // Class Goal State
  const [classGoalText, setClassGoalText] = useState('Spell 500 total words class-wide this week for a Honey Bee Party! 🐝');
  const [goalEditing, setGoalEditing] = useState(false);

  const isTeacher = account?.role === 'teacher';
  const supervisorTitle = isTeacher ? 'Teacher Classroom Monitor' : 'Parent & Guardian Portal';
  // Only teachers and admins may adjust a learner's tier or refill hearts —
  // gameplay state is earned through the app, so the parent portal doesn't get
  // those controls.
  const canAdjustGameplay = ['teacher', 'admin'].includes(account?.role || '');

  // Teachers may only register learners in the classes the school has
  // assigned to them -- enforced by the backend too, shown here as a dropdown.
  useEffect(() => {
    if (!isTeacher) return;
    apiClient.getClassrooms()
      .then((classrooms) => setTeacherClasses(classrooms.map((classroom) => classroom.name).filter(Boolean)))
      .catch(() => setTeacherClasses([]));
  }, [isTeacher]);

  // Memoized derived state
  const uniqueClasses = useMemo(() => Array.from(new Set(students.map((s) => s.className))).filter(Boolean), [students]);

  const filteredStudents = useMemo(() => students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.className.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClassFilter === 'ALL' || s.className === selectedClassFilter;
    const matchesActivity =
      selectedActivityFilter === 'ALL' ||
      (selectedActivityFilter === 'ACTIVE' && s.isLoggedInToday) ||
      (selectedActivityFilter === 'IDLE' && !s.isLoggedInToday);
    const matchesTier = selectedTierFilter === 'ALL' || String(s.currentTier || 1) === selectedTierFilter;
    return matchesSearch && matchesClass && matchesActivity && matchesTier;
  }), [students, searchQuery, selectedClassFilter, selectedActivityFilter, selectedTierFilter]);

  const totalStudents = students.length;
  const activeTodayCount = useMemo(() => students.filter((s) => s.isLoggedInToday).length, [students]);
  const totalTimeSpentMinutes = useMemo(() => students.reduce((acc, s) => acc + (s.totalTimeSpentMinutes || 0), 0), [students]);
  const totalWordsSpelled = useMemo(() => students.reduce((acc, s) => acc + (s.wordsSpelledToday || 0), 0), [students]);
  const totalAttempted = useMemo(() => students.reduce((acc, s) => acc + (s.totalWordsAttemptedToday || 0), 0), [students]);
  const classAccuracy = totalAttempted ? Math.round((totalWordsSpelled / totalAttempted) * 100) : 100;
  const needsFollowUp = useMemo(() => students.filter((s) => !s.isLoggedInToday).slice(0, 3), [students]);
  const filteredActiveCount = useMemo(() => filteredStudents.filter((s) => s.isLoggedInToday).length, [filteredStudents]);
  const filteredAccuracy = useMemo(() => {
    const attempted = filteredStudents.reduce((acc, s) => acc + (s.totalWordsAttemptedToday || 0), 0);
    const spelled = filteredStudents.reduce((acc, s) => acc + (s.wordsSpelledToday || 0), 0);
    return attempted ? Math.round((spelled / attempted) * 100) : 100;
  }, [filteredStudents]);
  const topPerformer = useMemo(() => [...students].sort((a, b) => (b.points || 0) - (a.points || 0))[0], [students]);
  const recentActivity = useMemo(() => [...students]
    .sort((a, b) => (b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0) - (a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0))
    .slice(0, 4), [students]);

  const tierDistribution = useMemo(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    filteredStudents.forEach((s) => {
      const tier = s.currentTier || 1;
      dist[tier] = (dist[tier] || 0) + 1;
    });
    return dist;
  }, [filteredStudents]);

  const handleCopyCode = async (code: string) => {
    audioFx.playClick();
    // Only flash "copied" when the clipboard write actually succeeded, so the
    // teacher doesn't believe the code was saved when the browser refused.
    if (await copyToClipboard(code)) {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const handleStudentCreated = (student: Student) => {
    audioFx.playPowerup();
    setNewlyCreatedStudent(student);
    setShowAddModal(false);
    refreshStudents();
  };

  const handleUpdateStudentTier = async (studentId: string, newTier: number) => {
    const updated = await apiClient.updateStudentTier(studentId, newTier);
    if (updated.id === detailModalStudent?.id) updateActiveStudentState({ currentTier: updated.currentTier });
    await refreshStudents();
  };

  const handleRefillStudentHearts = async (studentId: string) => {
    const updated = await apiClient.updateStudentHearts(studentId, 5);
    if (updated.id === detailModalStudent?.id) updateActiveStudentState({ hearts: updated.hearts });
    await refreshStudents();
  };

  const handleUpdateStudentDetails = async (studentId: string, data: Pick<Student, 'name' | 'age' | 'className'>) => {
    const updated = await apiClient.updateStudent(studentId, data);
    if (updated.id === detailModalStudent?.id) setDetailModalStudent(updated);
    await refreshStudents();
  };

  const handleDeleteStudent = async (student: Student) => {
    await apiClient.deleteStudent(student.id);
    setDetailModalStudent(null);
    await refreshStudents();
  };

  // CSV Export for Student Roster
  const handleExportCSV = () => {
    audioFx.playClick();
    const headers = ['Student Name', 'Age', 'Class Name', 'Student Code ID', 'Current Tier', 'Active Today', 'Words Spelled', 'Time Spent (mins)', 'Points'];
    const rows = students.map((s) => [
      `"${s.name}"`,
      s.age,
      `"${s.className}"`,
      `"${s.studentCode || `ST-${s.id.slice(-5)}`}"`,
      s.currentTier,
      s.isLoggedInToday ? 'Yes' : 'No',
      s.wordsSpelledToday || 0,
      s.totalTimeSpentMinutes || 0,
      s.points || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Student_Roster_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-navy-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Title Section */}
        <div className="bg-slate-900 dark:bg-navy-800 border border-slate-800 dark:border-navy-700 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-300 bg-amber-950/80 border border-amber-800/80 px-3 py-1 rounded-full">
              <School className="w-4 h-4 text-amber-400" />
              <span>{supervisorTitle}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Student Activity & Curriculum Monitor
            </h1>
            <p className="text-xs text-slate-300 font-normal max-w-2xl leading-relaxed">
              Monitor learner logins, spelling accuracy, practice time, and class progress across every tier of the word trail.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 bg-slate-800 dark:bg-navy-800 hover:bg-slate-700 dark:hover:bg-navy-700 text-slate-200 font-bold text-xs py-3 px-4 rounded-xl border border-slate-700 dark:border-navy-600 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Export Roster CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioFx.playClick();
                setShowAddModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs uppercase tracking-wider py-3 px-5 rounded-xl transition-all cursor-pointer shadow-md shrink-0 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Student</span>
            </button>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Monitored
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalStudents} Learners</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Active Today
              </p>
              <p className="text-2xl font-black text-emerald-700">{activeTodayCount} Logged In</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
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

          <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
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
            <span className="font-semibold">Admin access stays restricted to teacher and parent supervisor credentials.</span>
            <span className="text-xs font-semibold uppercase tracking-wider">Secure educator sign-in</span>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Supervisor overview</p>
                <h2 className="text-xl font-semibold text-[#0A1128] dark:text-slate-100">At-a-glance monitoring</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('roster')}
                className="rounded-xl border border-slate-200 dark:border-navy-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Open roster
              </button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Engagement pulse</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{activeTodayCount}/{totalStudents} learners active</p>
              </div>
              <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Top performer</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{topPerformer?.name || 'No data yet'}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Needs attention</h3>
              {needsFollowUp.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-700 p-4 text-sm text-slate-600 dark:text-slate-400">Everything is looking healthy right now.</div>
              ) : (
                needsFollowUp.map((student) => (
                  <div key={student.id} className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-700 px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{student.className}</p>
                    </div>
                    <span className="rounded-full bg-amber-100 dark:bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Follow up</span>
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
                <div key={student.id} className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-700 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</p>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{student.isLoggedInToday ? 'Active' : 'Idle'}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Tier {student.currentTier} • {student.points || 0} points</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 bg-slate-200/70 dark:bg-navy-700 p-1.5 rounded-2xl overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              audioFx.playClick();
              setActiveTab('roster');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
              activeTab === 'roster'
                ? 'bg-white dark:bg-navy-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-navy-700'
            }`}
          >
            <Users className="w-4 h-4 text-amber-500" />
            <span>Student Roster & Activity</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioFx.playClick();
              setActiveTab('analytics');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-navy-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-navy-700'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <span>Class Analytics & Tiers</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioFx.playClick();
              setActiveTab('curriculum');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
              activeTab === 'curriculum'
                ? 'bg-white dark:bg-navy-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-navy-700'
            }`}
          >
            <Code className="w-4 h-4 text-emerald-500" />
            <span>Curriculum &amp; Word Banks</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioFx.playClick();
              setActiveTab('goals');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
              activeTab === 'goals'
                ? 'bg-white dark:bg-navy-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-navy-700'
            }`}
          >
            <Target className="w-4 h-4 text-rose-500" />
            <span>Classroom Targets</span>
          </button>
        </div>

        {/* TAB 1: STUDENT ROSTER & MONITOR */}
        {activeTab === 'roster' && (
          <div className="space-y-6">
            {isTeacher && <ClassroomManager students={students} onChange={refreshStudents} />}
            {/* Newly Created Student Banner Callout */}
            {newlyCreatedStudent && (
              <div className="bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-400 rounded-2xl p-6 shadow-sm space-y-3 relative">
                <button
                  type="button"
                  onClick={() => setNewlyCreatedStudent(null)}
                  className="absolute top-4 right-4 text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Student Profile Registered Successfully</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-navy-800 p-4 rounded-xl border border-amber-200 dark:border-amber-500/30">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{newlyCreatedStudent.name}</h3>
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
                        onClick={() => handleCopyCode(newlyCreatedStudent.studentCode || `ST-${newlyCreatedStudent.id.slice(-5)}`)}
                        className="hover:text-white transition-colors cursor-pointer"
                        title="Copy Student Code"
                      >
                        {copiedCode === (newlyCreatedStudent.studentCode || `ST-${newlyCreatedStudent.id.slice(-5)}`) ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPrintModalStudent(newlyCreatedStudent)}
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
                    <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search student name or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-xs"
                    />
                  </div>

                  {uniqueClasses.length > 0 && (
                    <select
                      value={selectedClassFilter}
                      onChange={(e) => setSelectedClassFilter(e.target.value)}
                      className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="ALL">All Classes / Grades</option>
                      {uniqueClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={selectedActivityFilter}
                    onChange={(e) => setSelectedActivityFilter(e.target.value as 'ALL' | 'ACTIVE' | 'IDLE')}
                    className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ALL">All activity states</option>
                    <option value="ACTIVE">Active today</option>
                    <option value="IDLE">Needs follow-up</option>
                  </select>

                  <select
                    value={selectedTierFilter}
                    onChange={(e) => setSelectedTierFilter(e.target.value as 'ALL' | '1' | '2' | '3' | '4' | '5' | '6')}
                    className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ALL">All tiers</option>
                    {[1, 2, 3, 4, 5, 6].map((tier) => (
                      <option key={tier} value={String(tier)}>
                        Tier {tier}
                      </option>
                    ))}
                  </select>
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
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Filtered accuracy</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{filteredAccuracy}%</p>
                </div>
                <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Filtered roster</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{filteredStudents.length} learners</p>
                </div>
              </div>
            </div>

            {/* Student Cards List */}
            {filteredStudents.length === 0 ? (
              <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-12 text-center space-y-4 shadow-xs">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">No Students Found</h3>
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
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-xs shrink-0 cursor-pointer"
                            style={{ backgroundColor: st.avatarColor || '#F59E0B' }}
                            onClick={() => setDetailModalStudent(st)}
                          >
                            {st.name.charAt(0)}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                onClick={() => setDetailModalStudent(st)}
                                className="font-extrabold text-base text-slate-900 dark:text-slate-100 hover:text-amber-600 transition-colors cursor-pointer"
                              >
                                {st.name}
                              </h3>

                              {isActive ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Logged In Today</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-navy-700 border border-slate-200 dark:border-navy-700 px-2 py-0.5 rounded-full">
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
                            <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider font-sans">ID:</span>
                            <span>{code}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(code)}
                              className="hover:text-white transition-colors cursor-pointer"
                              title="Copy Code"
                            >
                              {isCopying ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setDetailModalStudent(st)}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-1.5 px-3 rounded-xl transition-all cursor-pointer shadow-xs"
                          >
                            View Details
                          </button>

                          <button
                            type="button"
                            onClick={() => setPrintModalStudent(st)}
                            className="bg-slate-100 dark:bg-navy-700 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-700 dark:text-slate-300 font-semibold text-xs py-1.5 px-3 rounded-xl border border-slate-200 dark:border-navy-700 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
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
                            <span>{st.streak || 0} Days</span>
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
        )}

        {/* TAB 2: CLASS ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-4 shadow-xs">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2 text-sm"><SlidersHorizontal className="h-4 w-4 text-indigo-600" /><span className="font-semibold text-slate-900 dark:text-slate-100">Analytics filters</span><span className="text-slate-500 dark:text-slate-400">Showing {filteredStudents.length} learners</span></div>
                <div className="flex flex-wrap items-center gap-2">
                  {uniqueClasses.length > 0 && <select value={selectedClassFilter} onChange={(e) => setSelectedClassFilter(e.target.value)} className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"><option value="ALL">All classes</option>{uniqueClasses.map((cls) => <option key={cls} value={cls}>{cls}</option>)}</select>}
                  <select value={selectedActivityFilter} onChange={(e) => setSelectedActivityFilter(e.target.value as 'ALL' | 'ACTIVE' | 'IDLE')} className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"><option value="ALL">All activity</option><option value="ACTIVE">Active today</option><option value="IDLE">Needs follow-up</option></select>
                  <select value={selectedTierFilter} onChange={(e) => setSelectedTierFilter(e.target.value as 'ALL' | '1' | '2' | '3' | '4' | '5' | '6')} className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"><option value="ALL">All tiers</option>{[1, 2, 3, 4, 5, 6].map((tier) => <option key={tier} value={String(tier)}>Tier {tier}</option>)}</select>
                  <button type="button" onClick={() => { setSelectedClassFilter('ALL'); setSelectedActivityFilter('ALL'); setSelectedTierFilter('ALL'); setSearchQuery(''); }} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-navy-700 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-navy-700"><RotateCcw className="h-3.5 w-3.5" />Reset</button>
                </div>
              </div>
            </div>

            {/* Visual Recharts Analytics Overview */}
            <Suspense fallback={<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-navy-600 dark:bg-navy-800 dark:text-slate-400">Loading analytics…</div>}>
              <SupervisorAnalytics students={filteredStudents} />
            </Suspense>

            <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Class Tier Distribution & Performance Overview
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {[1, 2, 3, 4, 5, 6].map((tierNum) => (
                  <div key={tierNum} className="bg-slate-50 dark:bg-navy-700 border border-slate-200 dark:border-navy-700 p-4 rounded-xl text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Tier {tierNum}
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{tierDistribution[tierNum] || 0}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
                      {tierNum >= 4 ? 'Advanced Words' : 'Elementary'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CURRICULUM PREVIEW (Age 10+ Computing) */}
        {activeTab === 'curriculum' && <CurriculumPreviewTab />}

        {/* TAB 4: CLASSROOM TARGETS & GOALS */}
        {activeTab === 'goals' && (
          <div className="space-y-5">
          <div className="bg-white border border-slate-200/80 dark:bg-navy-800 dark:border-navy-700 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-500" />
                Active Classroom Spelling Target
              </h3>
              <button
                type="button"
                onClick={() => setGoalEditing((prev) => !prev)}
                className="text-xs font-bold text-amber-600 hover:underline cursor-pointer"
              >
                {goalEditing ? 'Done Editing' : 'Edit Goal'}
              </button>
            </div>

            {goalEditing ? (
              <textarea
                value={classGoalText}
                onChange={(e) => setClassGoalText(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 dark:bg-navy-700 border border-slate-300 dark:border-navy-600 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            ) : (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-950 dark:text-amber-300 p-4 rounded-xl text-xs font-bold flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                <span>"{classGoalText}"</span>
              </div>
            )}
          </div>
          </div>
        )}

      </main>

      {/* Register Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Register New Student Profile</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <CreateStudentForm
              onSuccess={(st) => handleStudentCreated(st)}
              onCancel={() => setShowAddModal(false)}
              assignedClasses={isTeacher ? teacherClasses : undefined}
            />
          </div>
        </div>
      )}

      {/* Student Drill-down Modal */}
      {detailModalStudent && (
        <StudentDetailModal
          student={detailModalStudent}
          onClose={() => setDetailModalStudent(null)}
          onUpdateTier={canAdjustGameplay ? handleUpdateStudentTier : undefined}
          onRefillHearts={canAdjustGameplay ? handleRefillStudentHearts : undefined}
          onUpdateDetails={handleUpdateStudentDetails}
          onDelete={handleDeleteStudent}
          onPrintBadge={(st) => {
            setPrintModalStudent(st);
            setDetailModalStudent(null);
          }}
        />
      )}

      {/* Printable ID Badge Modal */}
      {printModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-3xl max-w-md w-full p-6 shadow-xl space-y-6 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Student Login Credentials Card</h2>
              <button
                type="button"
                onClick={() => setPrintModalStudent(null)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Print Card Container */}
            <div className="bg-slate-900 dark:bg-navy-700 text-white rounded-2xl p-6 border-2 border-amber-400 shadow-md space-y-4 text-center select-none">
              <div className="flex items-center justify-center gap-2">
                <HexagonBadge size="sm" active color="amber">
                  <span className="text-sm">🐝</span>
                </HexagonBadge>
                <span className="font-bold text-sm tracking-tight text-white">Spelling Bee</span>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-xl text-amber-400">{printModalStudent.name}</h3>
                <p className="text-xs text-slate-300">{printModalStudent.className}</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 dark:border-navy-700 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                  STUDENT LOGIN ID
                </span>
                <span className="text-2xl font-mono font-bold text-amber-400 tracking-wider">
                  {printModalStudent.studentCode || `ST-${printModalStudent.id.slice(-5)}`}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Go to app • Select "Student Login with ID" • Enter this code
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintModalStudent(null)}
                className="bg-slate-100 dark:bg-navy-700 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-700 dark:text-slate-300 font-semibold text-xs py-3 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
