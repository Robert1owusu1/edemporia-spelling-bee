// CSV building for the supervisor roster export.
// Kept pure (no DOM, no downloads) so it can be unit-tested: a student name
// containing a quote, comma, newline or a leading formula marker must never be
// able to break out of its cell or inject a formula into a teacher's sheet.

import type { Student } from '../api/types';

export const ROSTER_CSV_HEADERS = [
  'Student Name',
  'Age',
  'Class Name',
  'Student Code ID',
  'Current Tier',
  'Active Today',
  'Words Spelled',
  'Time Spent (mins)',
  'Points',
] as const;

/** The roster columns the export needs; structurally a subset of `Student`. */
export type RosterRow = Pick<
  Student,
  | 'name'
  | 'age'
  | 'className'
  | 'studentCode'
  | 'id'
  | 'currentTier'
  | 'isLoggedInToday'
  | 'wordsSpelledToday'
  | 'totalTimeSpentMinutes'
  | 'points'
>;

/**
 * Escape one CSV cell: embedded quotes are doubled, the cell is wrapped in
 * quotes, and a leading formula trigger (=, +, -, @, tab, CR) is prefixed with
 * an apostrophe so spreadsheets treat it as text instead of executing it.
 */
export function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Full CSV document (header row + one row per student), CRLF-free. */
export function buildRosterCsv(students: readonly RosterRow[]): string {
  const rows = students.map((student) =>
    [
      escapeCsvCell(student.name),
      escapeCsvCell(student.age),
      escapeCsvCell(student.className),
      escapeCsvCell(student.studentCode || `ST-${student.id.slice(-5)}`),
      escapeCsvCell(student.currentTier),
      escapeCsvCell(student.isLoggedInToday ? 'Yes' : 'No'),
      escapeCsvCell(student.wordsSpelledToday || 0),
      escapeCsvCell(student.totalTimeSpentMinutes || 0),
      escapeCsvCell(student.points || 0),
    ].join(','),
  );
  return [ROSTER_CSV_HEADERS.map(escapeCsvCell).join(','), ...rows].join('\n');
}
