import { useState } from 'react';
import { Word } from '../../api/types';
import { useDialogFocus } from '../../hooks/useDialogFocus';

export interface WordFormValues {
  text: string;
  tier: number;
  category?: string;
  definition: string;
  exampleSentence: string;
}

// Word Form Modal Component
export default function WordFormModal({
  mode,
  initialValues,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  initialValues?: Word;
  onClose: () => void;
  onSubmit: (payload: WordFormValues) => Promise<void>;
}) {
  const [text, setText] = useState(initialValues?.text ?? '');
  const [tier, setTier] = useState(initialValues?.tier ?? 1);
  const [category, setCategory] = useState(initialValues?.category ?? '');
  const [definition, setDefinition] = useState(initialValues?.definition ?? '');
  const [exampleSentence, setExampleSentence] = useState(initialValues?.exampleSentence ?? '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Focus enters the form on open, Tab stays inside, Escape cancels, and the
  // trigger button gets focus back when the modal unmounts.
  const dialogRef = useDialogFocus({ open: true, onClose });

  const submit = async () => {
    if (!text.trim() || (mode === 'edit' && (!definition.trim() || !exampleSentence.trim()))) {
      setError('Please fill in the required fields.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      if (mode === 'create') {
        await onSubmit({ text, tier, category, definition: '', exampleSentence: '' });
        onClose();
        return;
      }
      await onSubmit({
        text: text.trim(),
        tier,
        category: category.trim() || undefined,
        definition: definition.trim(),
        exampleSentence: exampleSentence.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the word.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 dark:bg-black/80 px-4">
      {/* Invisible full-bleed button so a backdrop click cancels for pointer
          users while keyboard users keep Escape and the Cancel button. */}
      <button type="button" aria-label="Cancel" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="word-form-title"
        className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-navy-800 p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 id="word-form-title" className="text-xl font-semibold text-[#0A1128] dark:text-slate-100">
              {mode === 'create' ? 'Add word' : 'Edit word'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage a spelling word for the shared classroom content.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close word form"
            className="text-sm font-medium text-slate-500 dark:text-slate-400"
          >
            Close
          </button>
        </div>
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label htmlFor="word-form-text" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="mb-2 block">Word</span>
              <input
                id="word-form-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'word-form-error' : undefined}
                autoComplete="off"
                className="w-full rounded-xl border border-slate-300 dark:border-navy-600 dark:bg-navy-700 px-3 py-2 text-slate-900 dark:text-slate-100"
                required
              />
            </label>
            <label htmlFor="word-form-tier" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="mb-2 block">Tier</span>
              <select
                id="word-form-tier"
                value={tier}
                onChange={(e) => setTier(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 dark:border-navy-600 dark:bg-navy-700 px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
                <option value={6}>6</option>
              </select>
            </label>
          </div>
          <label htmlFor="word-form-category" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            <span className="mb-2 block">Category</span>
            <input
              id="word-form-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-navy-600 dark:bg-navy-700 px-3 py-2 text-slate-900 dark:text-slate-100"
              placeholder="Optional"
            />
          </label>
          {mode === 'create' ? (
            <p className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 text-sm text-indigo-800 dark:text-indigo-300">
              Definition and example sentence are automatically imported from dictionaryapi.dev.
            </p>
          ) : (
            <>
              <label
                htmlFor="word-form-definition"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                <span className="mb-2 block">Definition</span>
                <textarea
                  id="word-form-definition"
                  value={definition}
                  onChange={(e) => setDefinition(e.target.value)}
                  className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2"
                  required
                />
              </label>
              <label
                htmlFor="word-form-example"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                <span className="mb-2 block">Example sentence</span>
                <textarea
                  id="word-form-example"
                  value={exampleSentence}
                  onChange={(e) => setExampleSentence(e.target.value)}
                  className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2"
                  required
                />
              </label>
            </>
          )}
          {error ? (
            <p
              id="word-form-error"
              role="alert"
              className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
            >
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 dark:border-navy-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 dark:bg-navy-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isSubmitting}
              className="rounded-xl bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-[#0A1128] dark:text-slate-100 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : mode === 'create' ? 'Add word' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
