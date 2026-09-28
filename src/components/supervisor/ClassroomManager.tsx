import { useEffect, useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { apiClient } from '../../api/client';
import type { Classroom, Student } from '../../api/types';

export default function ClassroomManager({
  students,
  onChange,
}: {
  students: Student[];
  onChange: () => Promise<unknown>;
}) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [error, setError] = useState('');
  const load = () =>
    apiClient
      .getClassrooms()
      .then(setClassrooms)
      .catch((err: Error) => setError(err.message));
  useEffect(() => {
    void load();
  }, []);
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await apiClient.createClassroom(name, grade);
      setName('');
      setGrade('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create classroom.');
    }
  };
  const assign = async (classroomId: string, studentId: string) => {
    try {
      await apiClient.assignStudentToClassroom(classroomId, studentId);
      await Promise.all([load(), onChange()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign learner.');
    }
  };
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-navy-700 dark:bg-navy-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-slate-100">
            <Building2 className="h-5 w-5 text-indigo-600" />
            Classroom roster management
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Create a classroom, then assign a learner from your roster.
          </p>
        </div>
        <form onSubmit={create} className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="classroom-name">
            Classroom name
          </label>
          <input
            id="classroom-name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Classroom name"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'classroom-manager-error' : undefined}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-navy-700 dark:bg-navy-900"
          />
          <label className="sr-only" htmlFor="classroom-grade">
            Grade (optional)
          </label>
          <input
            id="classroom-grade"
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            placeholder="Grade (optional)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-navy-700 dark:bg-navy-900"
          />
          <button className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-amber-400 dark:bg-navy-700">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" focusable="false" />
            Add class
          </button>
        </form>
      </div>
      {error ? (
        <p id="classroom-manager-error" role="alert" className="mt-3 text-xs text-rose-700">
          {error}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {classrooms.map((classroom) => (
          <div
            key={classroom.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-navy-700 dark:bg-navy-900"
          >
            <div className="flex justify-between">
              <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{classroom.name}</p>
              <span className="text-xs text-slate-500 dark:text-slate-400">{classroom.studentCount} learners</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{classroom.grade || 'No grade set'}</p>
            <select
              aria-label={`Assign a learner to ${classroom.name}`}
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) void assign(classroom.id, event.target.value);
              }}
              className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-navy-700 dark:bg-navy-800"
            >
              <option value="">Assign learner…</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>
        ))}
        {!classrooms.length ? <p className="text-xs text-slate-500 dark:text-slate-400">No classrooms yet.</p> : null}
      </div>
    </section>
  );
}
