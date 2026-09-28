import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Search, Trash2, Upload } from 'lucide-react';
import { apiClient } from '../../api/client';
import type { Word } from '../../api/types';
import WordFormModal, { WordFormValues } from './WordFormModal';
import CSVImportModal from './CSVImportModal';
import { useDialogFocus } from '../../hooks/useDialogFocus';

// Main WordBankAdminPage Component
export default function WordBankAdminPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTier, setSelectedTier] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [wordToDelete, setWordToDelete] = useState<Word | null>(null);
  // The delete confirmation is a real dialog: focus in, Tab trapped, Escape
  // cancels, focus returns to the trash button that opened it.
  const deleteDialogRef = useDialogFocus({ open: wordToDelete !== null, onClose: () => setWordToDelete(null) });

  const loadWords = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.getWords();
      setWords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load words.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWords();
  }, []);

  const filteredWords = useMemo(() => {
    if (selectedTier === 'all') return words;
    return words.filter((word) => word.tier === Number(selectedTier));
  }, [words, selectedTier]);

  const handleCreate = async (payload: WordFormValues) => {
    const created = await apiClient.createWordFromDictionary(payload.text, payload.tier, payload.category);
    setWords((prev) => [created, ...prev]);
  };

  const handleEdit = async (payload: WordFormValues) => {
    if (!editingWord) return;
    const updated = await apiClient.updateWord(editingWord.id, payload);
    setWords((prev) => prev.map((word) => (word.id === editingWord.id ? updated : word)));
  };

  const handleDelete = async () => {
    if (!wordToDelete) return;
    await apiClient.deleteWord(wordToDelete.id);
    setWords((prev) => prev.filter((word) => word.id !== wordToDelete.id));
    setWordToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Content management
          </p>
          <h2 className="text-2xl font-semibold text-[#0A1128] dark:text-slate-100">Word bank</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Review and update the shared spelling word list.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-slate-300 dark:border-navy-600 bg-slate-50 dark:bg-navy-700 px-3 py-2 text-sm text-slate-600 dark:text-slate-400">
            <Search className="h-4 w-4" aria-hidden="true" focusable="false" />
            <select
              aria-label="Filter words by tier"
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-transparent outline-none"
            >
              <option value="all">All tiers</option>
              <option value="1">Tier 1</option>
              <option value="2">Tier 2</option>
              <option value="3">Tier 3</option>
              <option value="4">Tier 4</option>
              <option value="5">Tier 5</option>
              <option value="6">Tier 6</option>
            </select>
          </label>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border-2 border-[#F59E0B] bg-transparent px-4 py-2 font-semibold text-[#F59E0B] hover:bg-[#F59E0B] hover:text-[#0A1128] dark:text-slate-100 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[#F59E0B] px-4 py-2 font-semibold text-[#0A1128] dark:text-slate-100"
          >
            <Plus className="h-4 w-4" />
            Add word
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-10 text-center text-sm text-slate-600 dark:text-slate-400">
          Loading words…
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-10 text-center text-sm text-slate-600 dark:text-slate-400">
          No words yet -- add your first one
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-navy-700 text-sm">
            <thead className="bg-slate-50 dark:bg-navy-700 text-left text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Word</th>
                <th className="px-4 py-3 font-semibold">Tier</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Definition</th>
                <th className="px-4 py-3 font-semibold">Example</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-navy-700">
              {filteredWords.map((word) => (
                <tr key={word.id} className="align-top">
                  <td className="px-4 py-3 font-semibold text-[#0A1128] dark:text-slate-100">{word.text}</td>
                  <td className="px-4 py-3">{word.tier}</td>
                  <td className="px-4 py-3">{word.category || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{word.definition}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{word.exampleSentence}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        aria-label={`Edit ${word.text}`}
                        onClick={() => {
                          setEditingWord(word);
                          setIsModalOpen(true);
                        }}
                        className="rounded-lg border border-slate-300 dark:border-navy-600 p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-700"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" focusable="false" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${word.text}`}
                        onClick={() => setWordToDelete(word)}
                        className="rounded-lg border border-red-200 p-2 text-red-600 dark:text-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" focusable="false" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen ? (
        <WordFormModal
          mode={editingWord ? 'edit' : 'create'}
          initialValues={editingWord ?? undefined}
          onClose={() => {
            setIsModalOpen(false);
            setEditingWord(null);
          }}
          onSubmit={editingWord ? handleEdit : handleCreate}
        />
      ) : null}

      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={loadWords}
      />

      {wordToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 dark:bg-black/80 px-4">
          {/* Invisible backdrop button: clicking outside keeps the word (it
              cancels); keyboard users get Escape and Cancel. */}
          <button
            type="button"
            aria-label="Cancel deletion"
            onClick={() => setWordToDelete(null)}
            className="absolute inset-0 cursor-default"
          />
          <div
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-word-title"
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-navy-800 p-6 shadow-xl"
          >
            <h3 id="delete-word-title" className="text-xl font-semibold text-[#0A1128] dark:text-slate-100">
              Delete word?
            </h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Delete “{wordToDelete.text}”? This can’t be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setWordToDelete(null)}
                className="rounded-xl border border-slate-300 dark:border-navy-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 dark:bg-navy-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
