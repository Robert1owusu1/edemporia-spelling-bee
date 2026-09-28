// Unit tests for csv.ts — the supervisor roster export.
//
// The cell escaper is the security boundary for teacher spreadsheets: a
// student name containing a quote, comma, newline or a leading formula marker
// must never break out of its cell or inject a formula that a spreadsheet
// would execute (CSV formula injection). buildRosterCsv must also emit a
// stable, LF-only, one-row-per-student document.

import { describe, expect, it } from 'vitest';

import { ROSTER_CSV_HEADERS, buildRosterCsv, escapeCsvCell, type RosterRow } from '../csv';

describe('escapeCsvCell', () => {
  describe('plain cells (no escaping needed)', () => {
    it.each([
      { value: 'Ada Lovelace', expected: '"Ada Lovelace"', contract: 'a plain name is only wrapped in quotes' },
      { value: 'Bee Class', expected: '"Bee Class"', contract: 'a plain class name is only wrapped in quotes' },
      { value: '', expected: '""', contract: 'an empty value becomes an empty quoted cell, not a missing column' },
      { value: 42, expected: '"42"', contract: 'numbers are stringified then quoted' },
      { value: 3.5, expected: '"3.5"', contract: 'fractional numbers keep their decimal point' },
      { value: 0, expected: '"0"', contract: 'zero is preserved, not dropped as falsy' },
      { value: false, expected: '"false"', contract: 'booleans stringify to their text form' },
      { value: null, expected: '""', contract: 'null becomes an empty quoted cell' },
      { value: undefined, expected: '""', contract: 'undefined becomes an empty quoted cell' },
    ])('$value → $expected — $contract', ({ value, expected }) => {
      expect(
        escapeCsvCell(value),
        `escapeCsvCell(${JSON.stringify(value)}) must be ${expected}: content untouched, RFC-4180 quoted`,
      ).toBe(expected);
    });
  });

  describe('quote doubling (embedded quotes must not close the cell)', () => {
    it.each([
      { value: 'He said "hi"', expected: '"He said ""hi"""', contract: 'every embedded quote is doubled' },
      { value: '"', expected: '""""', contract: 'a lone quote can never terminate the cell early' },
      { value: 'a"b"c', expected: '"a""b""c"', contract: 'quotes in the middle stay inside the cell' },
      { value: 'O"Brien', expected: '"O""Brien"', contract: 'apostrophe-style names with double quotes survive' },
    ])('$value → $expected — $contract', ({ value, expected }) => {
      expect(escapeCsvCell(value), `cell ${JSON.stringify(value)} must escape as ${expected}`).toBe(expected);
    });
  });

  describe('commas and newlines inside cells', () => {
    it('wraps a comma-containing cell so it stays ONE column', () => {
      expect(
        escapeCsvCell('Doe, Jane'),
        'a comma inside a quoted cell must not split the row into an extra column',
      ).toBe('"Doe, Jane"');
    });

    it('keeps an embedded newline inside the quoted cell without adding a CR', () => {
      expect(
        escapeCsvCell('line1\nline2'),
        'a newline inside a quoted cell must be preserved verbatim (RFC 4180) so the row stays intact',
      ).toBe('"line1\nline2"');
      expect(escapeCsvCell('line1\nline2'), 'the escaper must not introduce carriage returns').not.toContain('\r');
    });
  });

  describe('spreadsheet formula injection', () => {
    it.each([
      { value: '=1+1', expected: `"'=1+1"`, trigger: '=' },
      { value: '+1', expected: `"'+1"`, trigger: '+' },
      { value: '-1', expected: `"'-1"`, trigger: '-' },
      { value: '@SUM(A1)', expected: `"'@SUM(A1)"`, trigger: '@' },
      { value: '\tcmd', expected: '"\'\tcmd"', trigger: 'TAB' },
      { value: '\r!A1', expected: '"\'\r!A1"', trigger: 'CR' },
    ])('$value → $expected — a leading $trigger must be neutralised with an apostrophe', ({ value, expected }) => {
      expect(
        escapeCsvCell(value),
        `a cell beginning with ${JSON.stringify(value[0])} must be prefixed with an apostrophe so spreadsheets treat it as text instead of executing it`,
      ).toBe(expected);
    });

    it('neutralises a negative number (leading dash is a formula trigger)', () => {
      expect(
        escapeCsvCell(-5),
        'a leading "-" is an Excel formula trigger, so even a plain negative number must be text-escaped',
      ).toBe(`"'-5"`);
    });

    it('neutralises AND escapes a formula that contains quotes', () => {
      expect(
        escapeCsvCell('="hi"'),
        'a formula trigger plus embedded quotes needs both protections: apostrophe prefix, then quote doubling',
      ).toBe(`"'=""hi"""`);
    });

    it('leaves non-trigger leading characters alone', () => {
      expect(escapeCsvCell("'already text'"), 'a leading apostrophe is already text — must not be doubled up').toBe(
        `"'already text'"`,
      );
      expect(escapeCsvCell('3+4'), 'a trigger only counts at position 0, not inside the cell').toBe('"3+4"');
    });
  });
});

describe('ROSTER_CSV_HEADERS', () => {
  it('keeps the nine published roster columns in order', () => {
    expect(
      [...ROSTER_CSV_HEADERS],
      'the roster export header row is a teacher-facing contract — columns must not be renamed, reordered or dropped',
    ).toEqual([
      'Student Name',
      'Age',
      'Class Name',
      'Student Code ID',
      'Current Tier',
      'Active Today',
      'Words Spelled',
      'Time Spent (mins)',
      'Points',
    ]);
  });
});

describe('buildRosterCsv', () => {
  const makeStudent = (overrides: Partial<RosterRow> & Pick<RosterRow, 'id' | 'name'>): RosterRow => ({
    age: 10,
    className: 'Bee Class',
    studentCode: 'ST-84920',
    currentTier: 2,
    isLoggedInToday: false,
    wordsSpelledToday: 0,
    totalTimeSpentMinutes: 0,
    points: 0,
    ...overrides,
  });

  it('emits the header row plus exactly one row per student, LF-joined', () => {
    const csv = buildRosterCsv([makeStudent({ id: 'abc-1', name: 'Ada' }), makeStudent({ id: 'abc-2', name: 'Lin' })]);
    const lines = csv.split('\n');
    expect(lines, 'a two-student roster must be header + 2 rows').toHaveLength(3);
    expect(lines[0], 'row 1 must be the published header columns, each cell escaped like any other').toBe(
      ROSTER_CSV_HEADERS.map(escapeCsvCell).join(','),
    );
    expect(csv, 'rows must be joined with LF only — a stray CR would corrupt the last column on import').not.toContain(
      '\r',
    );
  });

  it('an empty roster is just the header row', () => {
    const csv = buildRosterCsv([]);
    expect(csv, 'zero students must still export a valid header-only document').toBe(
      ROSTER_CSV_HEADERS.map(escapeCsvCell).join(','),
    );
    expect(csv.split('\n'), 'header-only CSV must be a single line').toHaveLength(1);
  });

  it('falls back to the last five characters of the student id when there is no student code', () => {
    const csv = buildRosterCsv([makeStudent({ id: 'abcd1234567', name: 'Ada', studentCode: '' })]);
    expect(
      csv.split('\n')[1],
      'a blank student code must be replaced by ST-<last 5 of id> so every roster row keeps its identifier column',
    ).toContain('"ST-34567"');
  });

  it('uses the real student code when present', () => {
    const csv = buildRosterCsv([makeStudent({ id: 'abcd1234567', name: 'Ada', studentCode: 'ST-84920' })]);
    expect(csv.split('\n')[1], 'an existing student code must never be replaced by the id fallback').toContain(
      '"ST-84920"',
    );
  });

  it('maps the activity columns: Yes/No, and missing stats to 0', () => {
    const csv = buildRosterCsv([
      makeStudent({
        id: 'x-1',
        name: 'Active Ana',
        isLoggedInToday: true,
        wordsSpelledToday: 7,
        totalTimeSpentMinutes: 120,
        points: 90,
      }),
      makeStudent({ id: 'x-2', name: 'Idle Ike' }), // activity/stats fields omitted entirely
    ]);
    const [header, activeRow, idleRow] = csv.split('\n');

    expect(header, 'header must still be present alongside the rows').toContain('"Active Today"');
    expect(activeRow, 'a logged-in-today student is marked Yes').toContain('"Yes"');
    expect(activeRow, 'words spelled is exported as a plain number cell').toContain('"7"');
    expect(activeRow, 'minutes spent is exported as a plain number cell').toContain('"120"');
    expect(activeRow, 'points are exported as a plain number cell').toContain('"90"');

    expect(idleRow, 'a student with no activity flag is marked No').toContain('"No"');
    expect(idleRow, 'missing wordsSpelledToday exports as 0, not an empty cell').toContain('"0"');
    expect(idleRow, 'missing totalTimeSpentMinutes exports as 0, not an empty cell').toContain('"0"');
    expect(idleRow, 'missing points exports as 0, not an empty cell').toContain('"0"');
  });

  it('keeps a hostile name inside its own cell — quotes, commas and a formula trigger together', () => {
    const csv = buildRosterCsv([
      makeStudent({ id: 'abc-12345', name: '=HYPERLINK("evil")', age: 9, className: 'Bee, A', studentCode: '' }),
    ]);
    const [header, row] = csv.split('\n');
    expect(header, 'header row must precede the data row').toContain('"Student Name"');
    expect(
      row,
      'a formula-triggering name with quotes and a comma must be apostrophe-neutralised, quote-doubled and wrapped so it cannot execute or split columns',
    ).toBe(`"'=HYPERLINK(""evil"")","9","Bee, A","ST-12345","2","No","0","0","0"`);
    expect(row, 'the row must not contain a raw carriage return').not.toContain('\r');
  });

  it('keeps an embedded newline inside the name cell without splitting the roster row', () => {
    const csv = buildRosterCsv([
      makeStudent({ id: 'abc-1', name: 'Plain\nGirl "Q"', points: 0 }),
      makeStudent({ id: 'abc-2', name: 'Next Kid' }),
    ]);
    expect(
      csv,
      'a newline in a name must stay quoted inside its cell so the following row still starts after exactly one row break',
    ).toContain('"Plain\nGirl ""Q"""');
    expect(csv, 'the escaper must not introduce carriage returns').not.toContain('\r');
    expect(
      csv.endsWith('"Next Kid","10","Bee Class","ST-84920","2","No","0","0","0"'),
      'the second student row must still be the last line of the document',
    ).toBe(true);
  });
});
