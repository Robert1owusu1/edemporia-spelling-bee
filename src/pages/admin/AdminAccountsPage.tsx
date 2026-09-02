import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CircleX, Mail, Pencil, Plus, RefreshCw, Save, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import { apiClient } from '../../api/client';
import type { AdminAccount, Classroom } from '../../api/types';

const roleLabel = (role: string) => (role === 'admin' ? 'Admin' : role === 'teacher' ? 'Teacher' : 'Parent');

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [allClassrooms, setAllClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'parent' as 'parent' | 'teacher', classroomIds: [] as string[] });

  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '', role: 'parent' as 'parent' | 'teacher', classroomIds: [] as string[] });

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [accountData, classroomData] = await Promise.all([
        apiClient.getAdminAccounts(),
        apiClient.getClassrooms().catch(() => [] as Classroom[]),
      ]);
      setAccounts(accountData);
      setAllClassrooms(classroomData);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load accounts.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const classrooms = useMemo(() => Array.from(new Map(accounts.flatMap((account) => account.classrooms || []).map((c) => [c.id, c])).values()), [accounts]);

  const visible = useMemo(() => {
    const needle = query.toLowerCase();
    return accounts.filter((account) => !needle || account.email.toLowerCase().includes(needle) || (account.name || '').toLowerCase().includes(needle));
  }, [accounts, query]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.createAdminAccount({ ...form });
      setShowCreate(false);
      setForm({ email: '', password: '', name: '', role: 'parent', classroomIds: [] });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create account.'); }
  };

  const handleUpdate = async (id: string, data: { name?: string; email?: string; password?: string; role?: 'parent' | 'teacher'; approve?: boolean; classroomIds?: string[] }) => {
    setSaving(id); setError('');
    try { await apiClient.updateAdminAccount(id, data); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to update account.'); }
    finally { setSaving(null); }
  };

  const openEdit = (account: AdminAccount) => {
    setEditing(account);
    setEditForm({
      name: account.name || '',
      email: account.email,
      password: '',
      role: account.role === 'teacher' ? 'teacher' : 'parent',
      classroomIds: (account.classrooms || []).map((c) => c.id),
    });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError('');
    const data: { name?: string; email?: string; password?: string; role?: 'parent' | 'teacher'; classroomIds?: string[] } = {};
    if (editForm.name.trim() && editForm.name.trim() !== (editing.name || '')) data.name = editForm.name.trim();
    if (editForm.email.trim() && editForm.email.trim().toLowerCase() !== editing.email.toLowerCase()) data.email = editForm.email.trim();
    if (editForm.password) data.password = editForm.password;
    if (editForm.role !== editing.role) data.role = editForm.role;
    const currentClassIds = (editing.classrooms || []).map((c) => c.id);
    const nextClassIds = editForm.role === 'teacher' ? editForm.classroomIds : [];
    if (JSON.stringify([...nextClassIds].sort()) !== JSON.stringify([...currentClassIds].sort())) data.classroomIds = nextClassIds;
    await handleUpdate(editing.id, data);
    setEditing(null);
  };

  const handleDelete = async (account: AdminAccount) => {
    if (!window.confirm(`Delete ${account.name || account.email}? This permanently removes the account, its learners, classes and progress.`)) return;
    setSaving(account.id); setError('');
    try { await apiClient.deleteAdminAccount(account.id); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete account.'); }
    finally { setSaving(null); }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0A1128] to-slate-800 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">School accounts</p>
            <h2 className="mt-2 text-2xl font-semibold">Parents &amp; teachers</h2>
            <p className="mt-1 text-sm text-slate-300">Create, edit and delete accounts. Self-registration is closed, so every parent and teacher enters through here.</p>
          </div>
          <button
            onClick={() => setShowCreate((value) => !value)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
          >
            <UserPlus className="h-4 w-4" /> {showCreate ? 'Close form' : 'Register account'}
          </button>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div> : null}

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-amber-600" />
            <h3 className="text-base font-semibold text-[#0A1128] dark:text-slate-100">New {form.role} account</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Full name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Ama Mensah" className="w-full rounded-xl border border-slate-200 dark:border-navy-600 bg-slate-50 dark:bg-navy-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="name@school.org" className="w-full rounded-xl border border-slate-200 dark:border-navy-600 bg-slate-50 dark:bg-navy-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Temporary password</label>
              <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} placeholder="8+ characters" className="w-full rounded-xl border border-slate-200 dark:border-navy-600 bg-slate-50 dark:bg-navy-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'parent' | 'teacher' })} className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-3 py-2 text-sm">
                <option value="parent">Parent</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
            {form.role === 'teacher' && (
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Assigned classes</label>
                <div className="flex flex-wrap gap-2">
                  {allClassrooms.length ? allClassrooms.map((classroom) => (
                    <label key={classroom.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-navy-700 px-3 py-1.5 text-xs font-medium dark:bg-navy-700 dark:text-slate-300">
                      <input type="checkbox" checked={form.classroomIds.includes(classroom.id)} onChange={(e) => setForm({ ...form, classroomIds: e.target.checked ? [...form.classroomIds, classroom.id] : form.classroomIds.filter((id) => id !== classroom.id) })} className="accent-amber-500" />
                      {classroom.name}
                    </label>
                  )) : <span className="text-xs text-slate-500 dark:text-slate-400">No classes yet — create them on the Classes page.</span>}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400">
              <UserPlus className="h-4 w-4" /> Register account
            </button>
          </div>
        </form>
      )}

      {editing && (
        <form onSubmit={handleEditSave} className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-amber-600" />
              <h3 className="text-base font-semibold text-[#0A1128] dark:text-slate-100">Edit account</h3>
            </div>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-700"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Full name</label>
              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Full name" className="w-full rounded-xl border border-slate-200 dark:border-navy-600 bg-slate-50 dark:bg-navy-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Email</label>
              <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required className="w-full rounded-xl border border-slate-200 dark:border-navy-600 bg-slate-50 dark:bg-navy-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Reset password</label>
              <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} minLength={8} placeholder="Leave blank to keep current" className="w-full rounded-xl border border-slate-200 dark:border-navy-600 bg-slate-50 dark:bg-navy-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Role</label>
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as 'parent' | 'teacher' })} className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-3 py-2 text-sm">
                <option value="parent">Parent</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
            {editForm.role === 'teacher' && (
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Assigned classes</label>
                <div className="flex flex-wrap gap-2">
                  {allClassrooms.length ? allClassrooms.map((classroom) => (
                    <label key={classroom.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-navy-700 px-3 py-1.5 text-xs font-medium dark:bg-navy-700 dark:text-slate-300">
                      <input type="checkbox" checked={editForm.classroomIds.includes(classroom.id)} onChange={(e) => setEditForm({ ...editForm, classroomIds: e.target.checked ? [...editForm.classroomIds, classroom.id] : editForm.classroomIds.filter((id) => id !== classroom.id) })} className="accent-amber-500" />
                      {classroom.name}
                    </label>
                  )) : <span className="text-xs text-slate-500 dark:text-slate-400">No classes yet — create them on the Classes page.</span>}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 dark:border-navy-700 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-navy-700">Cancel</button>
            <button type="submit" disabled={saving === editing.id} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400">
              {saving === editing.id ? <Save className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />} Save changes
            </button>
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an account…" className="w-full rounded-xl border border-slate-200 dark:border-navy-700 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Users className="h-4 w-4" /> {visible.length} accounts
            <button onClick={() => void load()} className="ml-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-navy-700 px-2.5 py-1.5 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-navy-700"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-600 dark:text-slate-400">Loading accounts…</div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">No accounts match that search.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-navy-700 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3 font-semibold">Account</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Classes</th>
                <th className="px-5 py-3 font-semibold">Students</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((account) => (
                <tr key={account.id} className="border-b border-slate-100 dark:border-navy-700 last:border-0">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-[#0A1128] dark:text-slate-100">{account.name || 'Unnamed account'}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><Mail className="h-3 w-3" /> {account.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-slate-100 dark:bg-navy-700 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">{roleLabel(account.role)}</span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400">
                    {account.role === 'teacher' ? (account.classrooms?.length ? account.classrooms.map((c) => c.name).join(', ') : '—') : '—'}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400">{account.studentCount}</td>
                  <td className="px-5 py-4">
                    {account.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 dark:bg-navy-700 px-2.5 py-1 text-xs font-bold text-amber-400"><BadgeCheck className="h-3 w-3" /> Bootstrap</span>
                    ) : account.approvedAt ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300"><BadgeCheck className="h-3 w-3" /> Approved</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-300"><CircleX className="h-3 w-3" /> Pending</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {account.role !== 'admin' && (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {account.approvedAt ? (
                          <button onClick={() => void handleUpdate(account.id, { approve: false })} disabled={saving === account.id} className="rounded-lg border border-slate-200 dark:border-navy-700 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-navy-700">Unapprove</button>
                        ) : (
                          <button onClick={() => void handleUpdate(account.id, { approve: true })} disabled={saving === account.id} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600">Approve</button>
                        )}
                        <button
                          onClick={() => void handleUpdate(account.id, { role: account.role === 'teacher' ? 'parent' : 'teacher' })}
                          disabled={saving === account.id}
                          className="rounded-lg border border-slate-200 dark:border-navy-700 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-navy-700"
                        >
                          Make {account.role === 'teacher' ? 'parent' : 'teacher'}
                        </button>
                        <button
                          onClick={() => openEdit(account)}
                          disabled={saving === account.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-navy-700 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-navy-700"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => void handleDelete(account)}
                          disabled={saving === account.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                        {saving === account.id && <Save className="h-4 w-4 animate-pulse text-slate-400 dark:text-slate-500" />}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
