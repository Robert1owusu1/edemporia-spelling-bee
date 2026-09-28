// The roster tab and the analytics tab render the same three filter selects.
// They used to carry hand-copied copies of the markup (identical classes,
// different "no filter" labels), so the control lives here once.

import type { FilterOption } from './filterOptions';

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Label of the "no filter applied" option. */
  allLabel: string;
  options: FilterOption[];
  /** Accessible name for the select; defaults to `allLabel` when omitted. */
  ariaLabel?: string;
}

export default function FilterSelect({ value, onChange, allLabel, options, ariaLabel }: FilterSelectProps) {
  return (
    <select
      // Unlabelled in the markup on purpose (the visible row reads as a
      // toolbar), so the control carries its own name for screen readers.
      aria-label={ariaLabel ?? allLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
    >
      <option value="ALL">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
