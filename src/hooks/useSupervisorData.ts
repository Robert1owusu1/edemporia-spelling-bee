import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Student } from '../api/types';
import { apiClient } from '../api/client';
import { audioFx } from '../utils/audioEffects';
import { copyToClipboard } from '../utils/clipboard';
import { buildRosterCsv } from '../utils/csv';

export type ActivityFilter = 'ALL' | 'ACTIVE' | 'IDLE';
export type TierFilter = 'ALL' | '1' | '2' | '3' | '4' | '5' | '6';

/** Filter state shared by the roster and analytics tabs (same controls, same values). */
export interface SupervisorFilters {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedClassFilter: string;
  setSelectedClassFilter: (value: string) => void;
  selectedActivityFilter: ActivityFilter;
  setSelectedActivityFilter: (value: ActivityFilter) => void;
  selectedTierFilter: TierFilter;
  setSelectedTierFilter: (value: TierFilter) => void;
  uniqueClasses: string[];
}

/** Numbers the overview cards and the tab bodies are built from. */
export interface SupervisorStats {
  totalStudents: number;
  activeTodayCount: number;
  totalTimeSpentMinutes: number;
  classAccuracy: number;
  needsFollowUp: Student[];
  filteredActiveCount: number;
  filteredAccuracy: number;
  topPerformer: Student | undefined;
  recentActivity: Student[];
  tierDistribution: Record<number, number>;
}

/**
 * All data plumbing for the supervisor dashboard: roster fetching, the filters,
 * the derived numbers and the student mutations. The page itself only owns the
 * active tab and the layout, so every tab reads from the same source of truth.
 */
export function useSupervisorData() {
  const { account, students, refreshStudents, updateActiveStudentState } = useAuth();

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newlyCreatedStudent, setNewlyCreatedStudent] = useState<Student | null>(null);
  const [printModalStudent, setPrintModalStudent] = useState<Student | null>(null);
  const [detailModalStudent, setDetailModalStudent] = useState<Student | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<string[]>([]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedActivityFilter, setSelectedActivityFilter] = useState<ActivityFilter>('ALL');
  const [selectedTierFilter, setSelectedTierFilter] = useState<TierFilter>('ALL');

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
    const controller = new AbortController();
    apiClient
      .getClassrooms({ signal: controller.signal })
      .then((classrooms) => setTeacherClasses(classrooms.map((classroom) => classroom.name).filter(Boolean)))
      .catch(() => {
        // Aborts are expected on unmount; anything else just means no classes.
        if (!controller.signal.aborted) setTeacherClasses([]);
      });
    return () => controller.abort();
  }, [isTeacher]);

  // Memoized derived state
  const uniqueClasses = useMemo(
    () => Array.from(new Set(students.map((s) => s.className))).filter(Boolean),
    [students],
  );

  const filteredStudents = useMemo(
    () =>
      students.filter((s) => {
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
      }),
    [students, searchQuery, selectedClassFilter, selectedActivityFilter, selectedTierFilter],
  );

  const totalStudents = students.length;
  const activeTodayCount = useMemo(() => students.filter((s) => s.isLoggedInToday).length, [students]);
  const totalTimeSpentMinutes = useMemo(
    () => students.reduce((acc, s) => acc + (s.totalTimeSpentMinutes || 0), 0),
    [students],
  );
  const totalWordsSpelled = useMemo(() => students.reduce((acc, s) => acc + (s.wordsSpelledToday || 0), 0), [students]);
  const totalAttempted = useMemo(
    () => students.reduce((acc, s) => acc + (s.totalWordsAttemptedToday || 0), 0),
    [students],
  );
  const classAccuracy = totalAttempted ? Math.round((totalWordsSpelled / totalAttempted) * 100) : 100;
  const needsFollowUp = useMemo(() => students.filter((s) => !s.isLoggedInToday).slice(0, 3), [students]);
  const filteredActiveCount = useMemo(
    () => filteredStudents.filter((s) => s.isLoggedInToday).length,
    [filteredStudents],
  );
  const filteredAccuracy = useMemo(() => {
    const attempted = filteredStudents.reduce((acc, s) => acc + (s.totalWordsAttemptedToday || 0), 0);
    const spelled = filteredStudents.reduce((acc, s) => acc + (s.wordsSpelledToday || 0), 0);
    return attempted ? Math.round((spelled / attempted) * 100) : 100;
  }, [filteredStudents]);
  const topPerformer = useMemo(() => [...students].sort((a, b) => (b.points || 0) - (a.points || 0))[0], [students]);
  const recentActivity = useMemo(
    () =>
      [...students]
        .sort(
          (a, b) =>
            (b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0) -
            (a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0),
        )
        .slice(0, 4),
    [students],
  );

  const tierDistribution = useMemo(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    filteredStudents.forEach((s) => {
      const tier = s.currentTier || 1;
      dist[tier] = (dist[tier] || 0) + 1;
    });
    return dist;
  }, [filteredStudents]);

  const filters: SupervisorFilters = {
    searchQuery,
    setSearchQuery,
    selectedClassFilter,
    setSelectedClassFilter,
    selectedActivityFilter,
    setSelectedActivityFilter,
    selectedTierFilter,
    setSelectedTierFilter,
    uniqueClasses,
  };

  const stats: SupervisorStats = {
    totalStudents,
    activeTodayCount,
    totalTimeSpentMinutes,
    classAccuracy,
    needsFollowUp,
    filteredActiveCount,
    filteredAccuracy,
    topPerformer,
    recentActivity,
    tierDistribution,
  };

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
    refreshStudents();
  };

  // Mutation handlers roll back to server truth on failure and rethrow so the
  // detail modal can show a real error instead of a fabricated success message.
  const handleUpdateStudentTier = async (studentId: string, newTier: number) => {
    try {
      const updated = await apiClient.updateStudentTier(studentId, newTier);
      if (updated.id === detailModalStudent?.id) updateActiveStudentState({ currentTier: updated.currentTier });
      await refreshStudents();
    } catch (error) {
      await refreshStudents().catch(() => undefined);
      throw error;
    }
  };

  const handleRefillStudentHearts = async (studentId: string) => {
    try {
      const updated = await apiClient.updateStudentHearts(studentId, 5);
      if (updated.id === detailModalStudent?.id) updateActiveStudentState({ hearts: updated.hearts });
      await refreshStudents();
    } catch (error) {
      await refreshStudents().catch(() => undefined);
      throw error;
    }
  };

  const handleUpdateStudentDetails = async (studentId: string, data: Pick<Student, 'name' | 'age' | 'className'>) => {
    try {
      const updated = await apiClient.updateStudent(studentId, data);
      if (updated.id === detailModalStudent?.id) setDetailModalStudent(updated);
      await refreshStudents();
    } catch (error) {
      await refreshStudents().catch(() => undefined);
      throw error;
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    try {
      await apiClient.deleteStudent(student.id);
      setDetailModalStudent(null);
      await refreshStudents();
    } catch (error) {
      // Keep the modal open (no optimistic close) so the teacher can retry.
      await refreshStudents().catch(() => undefined);
      throw error;
    }
  };

  // CSV Export for Student Roster
  const handleExportCSV = () => {
    audioFx.playClick();
    const csvContent = buildRosterCsv(students);
    // Blob + object URL so commas/quotes/unicode in names can't be mangled by
    // data-URI encoding, and the download works offline.
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Student_Roster_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    account,
    isTeacher,
    supervisorTitle,
    canAdjustGameplay,
    students,
    refreshStudents,
    teacherClasses,
    filters,
    stats,
    // The roster and analytics tabs both render the filtered list, so the
    // filtered copy travels alongside the unfiltered stats.
    filteredStudents,
    copiedCode,
    newlyCreatedStudent,
    setNewlyCreatedStudent,
    printModalStudent,
    setPrintModalStudent,
    detailModalStudent,
    setDetailModalStudent,
    handleCopyCode,
    handleStudentCreated,
    handleUpdateStudentTier,
    handleRefillStudentHearts,
    handleUpdateStudentDetails,
    handleDeleteStudent,
    handleExportCSV,
  };
}
