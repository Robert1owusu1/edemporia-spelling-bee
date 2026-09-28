import { useState } from 'react';
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { apiClient } from '../../api/client';
import type { CsvImportResponse, CsvImportWord } from '../../api/types';
import { useDialogFocus } from '../../hooks/useDialogFocus';

// The response shape lives with the API client so it cannot drift from the
// endpoint that produces it.
type ImportResult = CsvImportResponse;

// Parses one CSV/TSV line into fields, honoring double-quoted fields that may
// contain the delimiter, escaped quotes (""), and newlines within quotes. This
// mirrors what users produce in Excel/Sheets when a word's category or note
// contains a comma.
function parseCSVLine(line: string, delimiter: ',' | '\t'): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

// CSV Import Modal Component
export default function CSVImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Declared before the early return so the hook order stays stable: focus
  // enters the dialog on open, Tab cycles inside, Escape closes, focus goes
  // back to the trigger when it unmounts.
  const dialogRef = useDialogFocus({ open: isOpen, onClose });

  if (!isOpen) return null;

  // Takes the file itself so both the picker and the drag-drop path can call
  // it without fabricating a synthetic change event.
  const handleFileUpload = (file: File | null | undefined) => {
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.tsv')) {
      setError('Please upload a CSV or TSV file');
      return;
    }

    setFile(file);
    setError(null);
    previewCSV(file);
  };

  const previewCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const delimiter: ',' | '\t' = file.name.endsWith('.tsv') ? '\t' : ',';
        const lines = text.split('\n').filter((line) => line.trim());

        if (lines.length === 0) {
          setError('File is empty');
          return;
        }

        const headers = parseCSVLine(lines[0], delimiter).map((h) => h.trim().toLowerCase());
        const requiredHeaders = ['text', 'tier'];
        const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

        if (missingHeaders.length > 0) {
          setError(`Missing required columns: ${missingHeaders.join(', ')}. Required: text, tier. Optional: category`);
          return;
        }

        const parsedData: Record<string, string>[] = [];
        for (let i = 1; i < Math.min(lines.length, 11); i++) {
          const values = parseCSVLine(lines[i], delimiter).map((v) => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          parsedData.push(row);
        }

        setPreview(parsedData);
        setError(null);
      } catch (err) {
        setError('Failed to parse CSV file: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const delimiter: ',' | '\t' = file.name.endsWith('.tsv') ? '\t' : ',';
      const lines = text.split('\n').filter((line) => line.trim());
      const headers = parseCSVLine(lines[0], delimiter).map((h) => h.trim().toLowerCase());

      const words: CsvImportWord[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i], delimiter).map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        const parsedTier = Number(row.tier);
        if (row.text && row.tier && Number.isInteger(parsedTier) && parsedTier >= 1 && parsedTier <= 6) {
          words.push({
            text: row.text,
            tier: parsedTier,
            category: row.category || undefined,
          });
        }
      }

      if (words.length === 0) {
        setError('No valid words found in the file. Check that each row has a text and a tier between 1 and 6.');
        setIsLoading(false);
        return;
      }

      const response = await apiClient.importWordsFromCSV(words);
      setResult(response);

      if (response.results.successful.length > 0) {
        onImportComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import words');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = 'text,tier,category\n';
    const examples = 'apple,1,Fruits\nbanana,1,Fruits\nchampion,2,Sports\n';
    const blob = new Blob([headers + examples], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'word_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 dark:bg-black/80 px-4">
      {/* Invisible full-bleed button: backdrop click cancels for pointer users
          while keyboard users keep Escape and the Cancel/Close buttons. */}
      <button type="button" aria-label="Cancel import" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-import-title"
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-navy-800 p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 id="csv-import-title" className="text-xl font-semibold text-[#0A1128] dark:text-slate-100">
              Import Words from CSV
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Bulk add spelling words using a CSV file</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close CSV import"
            className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-navy-700"
          >
            <X className="h-5 w-5" aria-hidden="true" focusable="false" />
          </button>
        </div>

        {!result ? (
          <>
            <div className="mt-6 space-y-4">
              <div
                className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-navy-600 bg-slate-50 dark:bg-navy-700 p-8 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    const input = document.getElementById('file-upload') as HTMLInputElement;
                    const files = new DataTransfer();
                    files.items.add(file);
                    input.files = files.files;
                    handleFileUpload(file);
                  }
                }}
              >
                <Upload className="h-12 w-12 text-slate-400 dark:text-slate-500" />
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Drag and drop your CSV file here, or</p>
                <label
                  className="mt-2 cursor-pointer rounded-xl bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-[#0A1128] dark:text-slate-100 hover:bg-[#D48A0A]"
                  htmlFor="file-upload"
                >
                  Browse Files
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv,.tsv"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  />
                </label>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  CSV format: text, tier, category (optional)
                </p>
              </div>

              {file && (
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-navy-700 px-4 py-3">
                  <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-emerald-300" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({Math.round(file.size / 1024)} KB)
                  </span>
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreview([]);
                    }}
                    className="ml-auto text-sm text-red-500 dark:text-red-300 hover:text-red-700 dark:hover:text-red-200"
                  >
                    Remove
                  </button>
                </div>
              )}

              {error && (
                <div
                  id="csv-import-error"
                  role="alert"
                  className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
                >
                  <AlertCircle className="mb-1 inline h-4 w-4" aria-hidden="true" focusable="false" /> {error}
                </div>
              )}

              {preview.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Preview (first {preview.length} rows)
                  </h3>
                  <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-navy-700">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-navy-700">
                        <tr>
                          {Object.keys(preview[0] || {}).map((key) => (
                            <th
                              key={key}
                              className="px-4 py-2 text-left font-semibold text-slate-600 dark:text-slate-400"
                            >
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-navy-700">
                        {preview.map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value: string, i) => (
                              <td key={i} className="px-4 py-2 text-slate-700 dark:text-slate-200">
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl bg-blue-50 dark:bg-navy-700 p-4">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Format requirements:</strong>
                  <ul className="mt-1 list-disc pl-4">
                    <li>
                      First row must be headers:{' '}
                      <code className="bg-blue-100 dark:bg-navy-700 px-1 rounded">text, tier, category</code>
                    </li>
                    <li>
                      <code className="bg-blue-100 dark:bg-navy-700 px-1 rounded">text</code> - the spelling word
                      (required)
                    </li>
                    <li>
                      <code className="bg-blue-100 dark:bg-navy-700 px-1 rounded">tier</code> - difficulty level 1-6
                      (required)
                    </li>
                    <li>
                      <code className="bg-blue-100 dark:bg-navy-700 px-1 rounded">category</code> - optional word
                      category
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-navy-700 pt-6">
              <button
                onClick={downloadTemplate}
                className="text-sm text-[#F59E0B] hover:text-[#D48A0A] font-medium underline"
              >
                📄 Download Template CSV
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 dark:border-navy-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 dark:bg-navy-700 hover:bg-slate-50 dark:hover:bg-navy-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || isLoading}
                  className="flex items-center gap-2 rounded-xl bg-[#F59E0B] px-6 py-2 text-sm font-semibold text-[#0A1128] dark:text-slate-100 hover:bg-[#D48A0A] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import Words'
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-6 space-y-4">
            {/* role="status": the import summary replaces the whole form, so
                the region must announce the outcome without interrupting. */}
            <div
              role="status"
              className="rounded-xl bg-green-50 dark:bg-emerald-500/10 p-4 text-green-700 dark:text-emerald-300"
            >
              <CheckCircle className="inline h-5 w-5" aria-hidden="true" focusable="false" /> {result.message}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-green-200 dark:border-emerald-500/30 bg-green-50 dark:bg-emerald-500/10 p-4 text-center">
                <div className="text-2xl font-bold text-green-700 dark:text-emerald-300">
                  {result.results.successful.length}
                </div>
                <div className="text-sm text-green-600 dark:text-emerald-300">Successfully Added</div>
              </div>
              <div className="rounded-xl border border-yellow-200 dark:border-amber-500/30 bg-yellow-50 dark:bg-amber-500/10 p-4 text-center">
                <div className="text-2xl font-bold text-yellow-700 dark:text-amber-300">
                  {result.results.skipped.length}
                </div>
                <div className="text-sm text-yellow-600 dark:text-amber-300">Skipped (Duplicates)</div>
              </div>
              <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 text-center">
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{result.results.failed.length}</div>
                <div className="text-sm text-red-600 dark:text-red-300">Failed</div>
              </div>
            </div>

            {result.results.failed.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">Failed Imports</h3>
                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3 text-sm">
                  {result.results.failed.map((fail, index) => (
                    <div key={index} className="border-b border-red-100 dark:border-red-500/20 py-1">
                      <span className="font-medium">Row {fail.row}:</span> {fail.error}
                      <div className="text-xs text-red-600 dark:text-red-300">Data: {JSON.stringify(fail.data)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.results.skipped.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-yellow-700 dark:text-amber-300">Skipped (Duplicates)</h3>
                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-yellow-200 dark:border-amber-500/30 bg-yellow-50 dark:bg-amber-500/10 p-3 text-sm">
                  {result.results.skipped.map((skip, index) => (
                    <div key={index} className="border-b border-yellow-100 dark:border-amber-500/20 py-1">
                      <span className="font-medium">Row {skip.row}:</span> {skip.reason}
                      <div className="text-xs text-yellow-600 dark:text-amber-300">Word: {skip.data.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  setPreview([]);
                  onClose();
                }}
                className="rounded-xl bg-[#F59E0B] px-6 py-2 text-sm font-semibold text-[#0A1128] dark:text-slate-100 hover:bg-[#D48A0A]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
