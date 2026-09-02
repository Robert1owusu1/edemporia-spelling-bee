import React, { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Plus, RefreshCw, School, Save, Users } from 'lucide-react';
import { apiClient } from '../../api/client';
import type { AdminAccount, Classroom } from '../../api/types';

export default function AdminClassesPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', grade: '', teacherId: '' });

  const teachers = useMemo(() => accounts.filter((account) => account.role === 'teacher'), [accounts]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [classData, accountData] = await Promise.all([
        apiClient.getClassrooms(),
        apiClient.getAdminAccounts(),
      ]);
      setClassrooms(classData);
      setAccounts(accountData);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load classes.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Class name is required'); return; }
    try {
      await apiClient.createClassroom(form.name.trim(), form.grade.trim() || undefined, form.teacherId || undefined);
      setShowCreate(false);
      setForm({ name: '', grade: '', teacherId: '' });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create class.'); }
  };

  const handleUpdate = async (id: string, data: { name?: string; grade?: string; teacherId?: string }) => {
    setSaving(id); setError('');
    try { await apiClient.updateClassroom(id, data); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to update class.'); }
    finally { setSaving(null); }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0A1128] to-slate-800 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">School classes</p>
            <h2 className="mt-2 text-2xl font-semibold">Classes</h2>
            <p className="mt-1 text-sm text-slate-300">Create classes, assign their teachers, and see how many learners each holds.</p>
          </div>
          <button
            onClick={() => setShowCreate((value) => !value)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" /> {showCreate ? 'Close form' : 'New class'}
          </button>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div> : null}

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <School className="h-4 w-4 text-amber-600" />
            <h3 className="text-base font-semibold text-[#0A1128] dark:text-slate-100">New class</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Class name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Grade 5A" className="w-full rounded-xl border border-slate-200 dark:border-navy-600 bg-slate-50 dark:bg-navy-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Grade (optional)</label>
              <input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g. 5" className="w-full rounded-xl border border-slate-200 dark:border-navy-600 bg-slate-50 dark:bg-navy-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Class teacher</label>
              <select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-3 py-2 text-sm">
                <option value="">— Unassigned —</option>
                {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name || teacher.email}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400">
              <Plus className="h-4 w-4" /> Create class
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><Users className="h-4 w-4" /> {classrooms.length} classes</div>
        <button onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-navy-700 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-navy-700"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-10 text-center text-sm text-slate-600 dark:text-slate-400">Loading classes…</div>
      ) : classrooms.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-12 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-500" />
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">No classes yet</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Create your first class above, then assign its teacher.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classrooms.map((classroom) => (
            <div key={classroom.id} className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-[#0A1128] dark:text-slate-100">{classroom.name}</p>
                  {classroom.grade ? <p className="text-xs text-slate-500 dark:text-slate-400">Grade {classroom.grade}</p> : <p className="text-xs text-slate-400 dark:text-slate-500">No grade</p>}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-300"><Users className="h-3 w-3" /> {classroom.studentCount}</span>
              </div>

              <label className="mt-4 mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Class teacher</label>
              <select
                value={classroom.teacherId || ''}
                onChange={(e) => void handleUpdate(classroom.id, { teacherId: e.target.value || undefined })}
                disabled={saving === classroom.id}
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-3 py-2 text-sm"
              >
                <option value="">— Unassigned —</option>
                {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name || teacher.email}</option>)}
              </select>

              <div className="mt-4 flex gap-2">
                <input
                  key={classroom.name}
                  defaultValue={classroom.name}
                  onBlur={(e) => { const name = e.target.value.trim(); if (name && name !== classroom.name) void handleUpdate(classroom.id, { name }); }}
                  placeholder="Class name"
                  className="flex-1 rounded-xl border border-slate-200 dark:border-navy-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                />
                {saving === classroom.id && <span className="inline-flex items-center"><Save className="h-4 w-4 animate-pulse text-slate-400 dark:text-slate-500" /></span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
