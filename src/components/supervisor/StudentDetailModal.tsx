import { useRef, useState } from 'react';
import { Student } from '../../api/types';
import { audioFx } from '../../utils/audioEffects';
import { copyToClipboard } from '../../utils/clipboard';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import {
  X,
  Flame,
  Heart,
  Copy,
  Check,
  Printer,
  Zap,
  AlertCircle,
  CheckCircle2,
  Activity,
  Pencil,
  Trash2,
} from 'lucide-react';

interface StudentDetailModalProps {
  student: Student;
  onClose: () => void;
  onUpdateTier?: (studentId: string, newTier: number) => Promise<void>;
  onRefillHearts?: (studentId: string) => Promise<void>;
  onPrintBadge: (student: Student) => void;
  onUpdateDetails: (studentId: string, data: Pick<Student, 'name' | 'age' | 'className'>) => Promise<void>;
  onDelete: (student: Student) => Promise<void>;
}

export default function StudentDetailModal({
  student,
  onClose,
  onUpdateTier,
  onRefillHearts,
  onPrintBadge,
  onUpdateDetails,
  onDelete,
}: StudentDetailModalProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedTier, setSelectedTier] = useState(student.currentTier);
  const [tierUpdatedMsg, setTierUpdatedMsg] = useState(false);
  const [refillMsg, setRefillMsg] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(student.name);
  const [age, setAge] = useState(student.age);
  const [className, setClassName] = useState(student.className);
  const [profileError, setProfileError] = useState('');
  const [tierError, setTierError] = useState('');
  const [refillError, setRefillError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const studentCode = student.studentCode || `ST-${student.id.slice(-5)}`;

  // Shared dialog behaviour: focus enters the panel on open (starting at the
  // header close button), Tab cycles inside it, Escape closes, and focus
  // returns to the row that opened the modal.
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogFocus({ open: true, onClose, initialFocusRef: closeButtonRef });

  const handleCopy = async () => {
    audioFx.playClick();
    if (await copyToClipboard(studentCode)) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSaveTier = async () => {
    if (!onUpdateTier) return;
    audioFx.playPowerup();
    setTierError('');
    try {
      await onUpdateTier(student.id, selectedTier);
      // Claim success only after the backend confirms the write, so a failed
      // save is never celebrated as a "Tier Updated!".
      setTierUpdatedMsg(true);
      setTimeout(() => setTierUpdatedMsg(false), 2000);
    } catch (error) {
      setTierError(error instanceof Error ? error.message : 'Could not update the tier.');
    }
  };

  const handleRefill = async () => {
    if (!onRefillHearts) return;
    audioFx.playPowerup();
    setRefillError('');
    try {
      await onRefillHearts(student.id);
      setRefillMsg(true);
      setTimeout(() => setRefillMsg(false), 2000);
    } catch (error) {
      setRefillError(error instanceof Error ? error.message : 'Could not refill hearts.');
    }
  };

  const handleDelete = async () => {
    setDeleteError('');
    try {
      await onDelete(student);
      // The parent closes the modal on success; on failure we stay open so the
      // teacher can retry instead of losing the context silently.
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete the student.');
      setConfirmingDelete(false);
    }
  };

  const saveDetails = async () => {
    if (name.trim().length < 2 || !Number.isInteger(Number(age)) || Number(age) < 3 || !className.trim()) {
      setProfileError('Enter a name, valid age, and class name.');
      return;
    }
    try {
      await onUpdateDetails(student.id, { name: name.trim(), age: Number(age), className: className.trim() });
      setIsEditing(false);
      setProfileError('');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not update student details.');
    }
  };

  const accuracy = student.totalWordsAttemptedToday
    ? Math.round(((student.wordsSpelledToday || 0) / student.totalWordsAttemptedToday) * 100)
    : 100;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Invisible full-bleed button: clicking the backdrop closes the file;
          keyboard users get Escape and the close button instead. */}
      <button
        type="button"
        aria-label="Close student details"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-detail-title"
        className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative animate-fade-in dark:bg-navy-800 dark:border-navy-700"
      >
        {/* One polite + one assertive live region for the whole dialog. The
            result boxes below are mounted and unmounted as messages arrive, so
            announcements are mirrored here where a live region can exist
            before the text does — errors interrupt, confirmations wait. */}
        <p className="sr-only" role="status">
          {[
            copiedCode ? 'Student ID copied.' : '',
            tierUpdatedMsg ? 'Tier updated.' : '',
            refillMsg ? 'Hearts refilled to 5.' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        </p>
        <p className="sr-only" role="alert">
          {[profileError, tierError, refillError, deleteError].filter(Boolean).join(' ')}
        </p>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-navy-700">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-sm"
              style={{ backgroundColor: student.avatarColor || '#F59E0B' }}
            >
              {student.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="student-detail-title" className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {student.name}
                </h2>
                {student.isLoggedInToday && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active Today</span>
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {student.className} • Age {student.age} • Tier {student.currentTier} Speller
              </p>
            </div>
          </div>

          <button
            type="button"
            ref={closeButtonRef}
            onClick={() => {
              audioFx.playClick();
              onClose();
            }}
            aria-label="Close student details"
            className="text-slate-600 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition-colors cursor-pointer dark:text-slate-300 dark:hover:text-slate-100 dark:bg-navy-700"
          >
            <X className="w-5 h-5" aria-hidden="true" focusable="false" />
          </button>
        </div>

        {/* Credentials & Quick Actions */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800 dark:bg-navy-700 dark:border-navy-700">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block dark:text-slate-500">
              Student Login Code
            </span>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="font-mono text-xl font-black text-amber-400">{studentCode}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="hover:text-amber-300 transition-colors cursor-pointer"
                title="Copy Student ID"
                aria-label={copiedCode ? 'Student ID copied' : `Copy student ID ${studentCode}`}
              >
                {copiedCode ? (
                  <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" focusable="false" />
                ) : (
                  <Copy className="w-4 h-4" aria-hidden="true" focusable="false" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPrintBadge(student)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Badge</span>
            </button>
            {onRefillHearts ? (
              <button
                type="button"
                onClick={() => void handleRefill()}
                className="bg-slate-800 hover:bg-slate-700 text-rose-400 font-extrabold text-xs px-3.5 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 dark:bg-navy-800 dark:border-navy-600"
              >
                <Heart className="w-4 h-4 fill-current text-rose-500" />
                <span>Refill Hearts</span>
              </button>
            ) : null}
          </div>
        </div>

        {refillMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-fade-in dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300">
            <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Student hearts refilled to 5 hearts!</span>
          </div>
        )}

        {refillError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{refillError} Hearts were not changed.</span>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 dark:border-navy-700 dark:bg-navy-900">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Pencil className="h-4 w-4" />
              Student details
            </h3>
            <button
              type="button"
              onClick={() => setIsEditing((value) => !value)}
              className="text-xs font-bold text-indigo-700 hover:underline"
            >
              {isEditing ? 'Cancel' : 'Edit details'}
            </button>
          </div>
          {isEditing ? (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                {/* Visible text lives elsewhere in this row, so the fields keep
                their labels screen-reader-only instead of shifting a 3-column
                grid. htmlFor/id is what actually ties the two together. */}
                <label className="sr-only" htmlFor="student-detail-name">
                  Student name
                </label>
                <input
                  id="student-detail-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={profileError ? true : undefined}
                  aria-describedby={profileError ? 'student-detail-error' : undefined}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-navy-600 dark:bg-navy-800"
                />
                <label className="sr-only" htmlFor="student-detail-age">
                  Student age
                </label>
                <input
                  id="student-detail-age"
                  type="number"
                  min={3}
                  max={120}
                  value={age}
                  onChange={(event) => setAge(Number(event.target.value))}
                  aria-invalid={profileError ? true : undefined}
                  aria-describedby={profileError ? 'student-detail-error' : undefined}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-navy-600 dark:bg-navy-800"
                />
                <label className="sr-only" htmlFor="student-detail-class">
                  Student class
                </label>
                <input
                  id="student-detail-class"
                  value={className}
                  onChange={(event) => setClassName(event.target.value)}
                  aria-invalid={profileError ? true : undefined}
                  aria-describedby={profileError ? 'student-detail-error' : undefined}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-navy-600 dark:bg-navy-800"
                />
              </div>
              {profileError ? (
                <p id="student-detail-error" className="text-xs text-rose-700">
                  {profileError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void saveDetails()}
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-amber-400 dark:bg-navy-700"
              >
                Save details
              </button>
            </>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {student.name} · Age {student.age} · {student.className}
            </p>
          )}
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl text-center space-y-1 dark:bg-navy-900 dark:border-navy-700">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block dark:text-slate-400">
              Accuracy
            </span>
            <span className="text-xl font-black text-emerald-700">{accuracy}%</span>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl text-center space-y-1 dark:bg-navy-900 dark:border-navy-700">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block dark:text-slate-400">
              Time Practice
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100">
              {student.totalTimeSpentMinutes || 0}m
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl text-center space-y-1 dark:bg-navy-900 dark:border-navy-700">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block dark:text-slate-400">
              Daily Streak
            </span>
            <span className="text-xl font-black text-amber-600 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-current text-amber-500" />
              <span>{student.dailyStreak || 0}d</span>
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl text-center space-y-1 dark:bg-navy-900 dark:border-navy-700">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block dark:text-slate-400">
              Total XP
            </span>
            <span className="text-xl font-black text-indigo-700">{(student.points || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Adjust Tier Level (teachers/admins only) */}
        {onUpdateTier && (
          <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl space-y-3 dark:bg-amber-500/10 dark:border-amber-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1.5 dark:text-amber-300">
                <Zap className="w-4 h-4 text-amber-600" /> Adjust Student Tier Level
              </span>
              {tierUpdatedMsg && (
                <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md dark:text-emerald-300 dark:bg-emerald-500/20">
                  Tier Updated!
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="student-detail-tier">
                Student tier level
              </label>
              <select
                id="student-detail-tier"
                value={selectedTier}
                onChange={(e) => setSelectedTier(Number(e.target.value))}
                aria-invalid={tierError ? true : undefined}
                aria-describedby={tierError ? 'student-detail-tier-error' : undefined}
                className="flex-1 bg-white border border-amber-300 text-slate-900 text-xs font-extrabold rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-amber-500 dark:bg-navy-800 dark:border-amber-500/30 dark:text-slate-100"
              >
                <option value={1}>Tier 1 (Grades K-1)</option>
                <option value={2}>Tier 2 (Grades 2-3)</option>
                <option value={3}>Tier 3 (Grades 4-5)</option>
                <option value={4}>Tier 4 (Word Explorer)</option>
                <option value={5}>Tier 5 (Story Seeker)</option>
                <option value={6}>Tier 6 (Bee Champion)</option>
              </select>
              <button
                type="button"
                onClick={() => void handleSaveTier()}
                className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer dark:bg-navy-700 dark:hover:bg-navy-800"
              >
                Save Level
              </button>
            </div>
            {tierError && (
              <p id="student-detail-tier-error" className="text-xs font-bold text-rose-700 dark:text-rose-300">
                {tierError} Tier was not changed.
              </p>
            )}
          </div>
        )}
        {/* Activity Logs Section */}
        <div className="space-y-2">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 dark:text-slate-300">
            <Activity className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Recent Learning Activity Logs
          </h4>
          {student.activityLogs && student.activityLogs.length > 0 ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {student.activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/70 flex items-center justify-between text-slate-800 dark:bg-navy-900 dark:border-navy-700 dark:text-slate-200"
                >
                  <span className="font-medium">{log.details}</span>
                  <span className="text-[10px] text-slate-400 font-bold dark:text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center text-xs text-slate-500 font-medium dark:bg-navy-900 dark:border-navy-700 dark:text-slate-400">
              No practice logs registered for today yet.
            </div>
          )}
        </div>

        {/* Footer Close */}
        <div className="pt-2 border-t border-slate-100 space-y-2 dark:border-navy-700">
          {deleteError && (
            <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
              {deleteError} The student was not deleted.
            </p>
          )}
          {confirmingDelete ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-500/30 dark:bg-rose-500/10">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                Delete {student.name}'s profile and learning history? This cannot be undone.
              </span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 border border-slate-300 hover:bg-slate-100 dark:bg-navy-800 dark:text-slate-200 dark:border-navy-600"
                >
                  Cancel
                </button>
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setDeleteError('');
                  setConfirmingDelete(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete student
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer dark:bg-navy-700 dark:hover:bg-navy-600 dark:text-slate-200"
              >
                Close Student File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
