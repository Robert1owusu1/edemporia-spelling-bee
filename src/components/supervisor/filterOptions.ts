// The two filter option lists live in their own module so FilterSelect keeps
// exporting only its component (React fast refresh requires that) while both
// tabs can share the exact same options instead of re-typing them.

export interface FilterOption {
  value: string;
  label: string;
}

/** Activity options — both tabs show the same two states. */
export const ACTIVITY_OPTIONS: FilterOption[] = [
  { value: 'ACTIVE', label: 'Active today' },
  { value: 'IDLE', label: 'Needs follow-up' },
];

/** Tier options — tiers are a fixed 1..6 range everywhere in the app. */
export const TIER_OPTIONS: FilterOption[] = [
  { value: '1', label: 'Tier 1' },
  { value: '2', label: 'Tier 2' },
  { value: '3', label: 'Tier 3' },
  { value: '4', label: 'Tier 4' },
  { value: '5', label: 'Tier 5' },
  { value: '6', label: 'Tier 6' },
];
