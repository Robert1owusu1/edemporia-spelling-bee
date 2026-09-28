import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CreateStudentForm from '../components/dashboard/CreateStudentForm';
import HexagonBadge from '../components/common/HexagonBadge';
import StudentDetailModal from '../components/supervisor/StudentDetailModal';
import CurriculumPreviewTab from '../components/supervisor/CurriculumPreviewTab';
import RosterTab from '../components/supervisor/RosterTab';
import AnalyticsTab from '../components/supervisor/AnalyticsTab';
import GoalsTab from '../components/supervisor/GoalsTab';
import SupervisorOverview from '../components/supervisor/SupervisorOverview';
import { useSupervisorData } from '../hooks/useSupervisorData';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { audioFx } from '../utils/audioEffects';
import { Users, BarChart3, Code, Target, Printer, X } from 'lucide-react';

// Thin shell for the supervisor dashboard: useSupervisorData owns every piece
// of data and mutation, the tab components own their own markup, and what is
// left here is tab switching, the layout and the three overlaying modals.
type TabId = 'roster' | 'analytics' | 'curriculum' | 'goals';

// The four tab buttons share one shell; only the icon, label and active state
// differ, so the class string lives here instead of being copied per button.
const TAB_BUTTON_CLASS = (isActive: boolean) =>
  `flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
    isActive
      ? 'bg-white dark:bg-navy-800 text-slate-900 dark:text-slate-100 shadow-xs'
      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-navy-700'
  }`;

const TABS: { id: TabId; label: string; Icon: typeof Users; iconClass: string }[] = [
  { id: 'roster', label: 'Student Roster & Activity', Icon: Users, iconClass: 'w-4 h-4 text-amber-500' },
  { id: 'analytics', label: 'Class Analytics & Tiers', Icon: BarChart3, iconClass: 'w-4 h-4 text-indigo-500' },
  { id: 'curriculum', label: 'Curriculum & Word Banks', Icon: Code, iconClass: 'w-4 h-4 text-emerald-500' },
  { id: 'goals', label: 'Classroom Targets', Icon: Target, iconClass: 'w-4 h-4 text-rose-500' },
];

export default function SupervisorDashboardPage() {
  const {
    isTeacher,
    supervisorTitle,
    canAdjustGameplay,
    students,
    refreshStudents,
    teacherClasses,
    filters,
    stats,
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
  } = useSupervisorData();

  const [activeTab, setActiveTab] = useState<TabId>('roster');
  const [showAddModal, setShowAddModal] = useState(false);

  // Class Goal State — page-owned so the text survives switching tabs.
  const [classGoalText, setClassGoalText] = useState(
    'Spell 500 total words class-wide this week for a Honey Bee Party! 🐝',
  );
  const [goalEditing, setGoalEditing] = useState(false);

  const switchTab = (tab: TabId) => {
    audioFx.playClick();
    setActiveTab(tab);
  };

  const openRegisterModal = () => {
    audioFx.playClick();
    setShowAddModal(true);
  };

  // Both overlays here share the same dialog contract (focus in, Tab trapped,
  // Escape out, focus restored), so each just hands its open state to the hook.
  const addStudentDialogRef = useDialogFocus({ open: showAddModal, onClose: () => setShowAddModal(false) });
  const printBadgeDialogRef = useDialogFocus({
    open: printModalStudent !== null,
    onClose: () => setPrintModalStudent(null),
  });

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-navy-900 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased">
      <Navbar />

      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header, metric cards and at-a-glance panels */}
        <SupervisorOverview
          supervisorTitle={supervisorTitle}
          stats={stats}
          onExportCSV={handleExportCSV}
          onRegisterStudent={openRegisterModal}
          onOpenRoster={() => setActiveTab('roster')}
        />

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 bg-slate-200/70 dark:bg-navy-700 p-1.5 rounded-2xl overflow-x-auto">
          {TABS.map(({ id, label, Icon, iconClass }) => (
            <button key={id} type="button" onClick={() => switchTab(id)} className={TAB_BUTTON_CLASS(activeTab === id)}>
              <Icon className={iconClass} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: STUDENT ROSTER & MONITOR */}
        {activeTab === 'roster' && (
          <RosterTab
            students={students}
            filteredStudents={filteredStudents}
            filteredActiveCount={stats.filteredActiveCount}
            filteredAccuracy={stats.filteredAccuracy}
            isTeacher={isTeacher}
            refreshStudents={refreshStudents}
            filters={filters}
            copiedCode={copiedCode}
            newlyCreatedStudent={newlyCreatedStudent}
            onCopyCode={handleCopyCode}
            onDismissNewStudent={() => setNewlyCreatedStudent(null)}
            onPrintBadge={setPrintModalStudent}
            onOpenStudent={setDetailModalStudent}
          />
        )}

        {/* TAB 2: CLASS ANALYTICS */}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            filteredStudents={filteredStudents}
            tierDistribution={stats.tierDistribution}
            filters={filters}
          />
        )}

        {/* TAB 3: CURRICULUM PREVIEW (Age 10+ Computing) */}
        {activeTab === 'curriculum' && <CurriculumPreviewTab />}

        {/* TAB 4: CLASSROOM TARGETS & GOALS */}
        {activeTab === 'goals' && (
          <GoalsTab
            classGoalText={classGoalText}
            goalEditing={goalEditing}
            onGoalTextChange={setClassGoalText}
            onToggleEditing={() => setGoalEditing((prev) => !prev)}
          />
        )}
      </main>

      {/* Register Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          {/* Invisible backdrop button: pointer users close by clicking
              outside, keyboard users get Escape and the X button. */}
          <button
            type="button"
            aria-label="Close registration form"
            onClick={() => setShowAddModal(false)}
            className="absolute inset-0 cursor-default"
          />
          <div
            ref={addStudentDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-student-title"
            className="relative bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700 pb-3">
              <h2 id="register-student-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Register New Student Profile
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close registration form"
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" focusable="false" />
              </button>
            </div>

            <CreateStudentForm
              onSuccess={(st) => {
                handleStudentCreated(st);
                setShowAddModal(false);
              }}
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
          <button
            type="button"
            aria-label="Close printable badge"
            onClick={() => setPrintModalStudent(null)}
            className="absolute inset-0 cursor-default"
          />
          <div
            ref={printBadgeDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="print-badge-title"
            className="relative bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-3xl max-w-md w-full p-6 shadow-xl space-y-6 text-center"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-700 pb-3">
              <h2 id="print-badge-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Student Login Credentials Card
              </h2>
              <button
                type="button"
                onClick={() => setPrintModalStudent(null)}
                aria-label="Close printable badge"
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" focusable="false" />
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
