// constants/gradeConstants.ts
// Shared grade data used by GradeConfirmationBanner and any other form
// that needs grade labels or grade list options.

export const GRADE_LABELS: Record<string, string> = {
  PK: 'Pre-Kindergarten',
  K: 'Kindergarten',
  '1': '1st Grade',
  '2': '2nd Grade',
  '3': '3rd Grade',
  '4': '4th Grade',
  '5': '5th Grade',
  '6': '6th Grade',
  '7': '7th Grade',
  '8': '8th Grade',
  '9': '9th Grade',
  '10': '10th Grade',
  '11': '11th Grade',
  '12': '12th Grade',
};

// Ordered list of all grade keys — useful for mapping to <option> elements
export const ALL_GRADES: string[] = [
  'PK',
  'K',
  ...Array.from({ length: 12 }, (_, i) => String(i + 1)),
];

// Convenience: grade options shaped for react-select or similar libraries
export const GRADE_SELECT_OPTIONS = ALL_GRADES.map((value) => ({
  value,
  label: GRADE_LABELS[value],
}));

// Helper — returns the human-readable label for a grade key, with a fallback
// so callers never have to do the null-check themselves.
//
// Usage:
//   getGradeLabel('5')  → '5th Grade'
//   getGradeLabel('K')  → 'Kindergarten'
//   getGradeLabel('')   → ''
export const getGradeLabel = (grade: string): string =>
  GRADE_LABELS[grade] ?? grade;
