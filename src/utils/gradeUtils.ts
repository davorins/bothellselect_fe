// src/utils/gradeUtils.ts

/**
 * Grade Calculation Utility (Frontend – TypeScript)
 *
 * Mirror of backend/utils/gradeUtils.js — keep these in sync.
 * Used for live UI preview while the parent fills in a player's DOB.
 *
 * Key fix: use SCHOOL YEAR start, not raw calendar year.
 */

export type GradeRegion = keyof typeof REGIONAL_CUTOFFS;

interface Cutoff {
  month: number; // 1-indexed (Jan = 1)
  day: number;
}

/**
 * Regional birthday cutoff dates.
 * A child must be 5 ON OR BEFORE this date to start Kindergarten that fall.
 */
export const REGIONAL_CUTOFFS: Record<string, Cutoff> = {
  // ── United States ──────────────────────────────────────────────────────────
  US_DEFAULT: { month: 9, day: 1 }, // Sept 1  – majority of US states
  US_WA: { month: 8, day: 31 }, // Aug 31  – Washington
  US_CA: { month: 9, day: 1 }, // Sept 1  – California
  US_TX: { month: 9, day: 1 }, // Sept 1  – Texas
  US_NY: { month: 12, day: 1 }, // Dec 1   – New York
  US_FL: { month: 9, day: 1 }, // Sept 1  – Florida
  US_CT: { month: 1, day: 1 }, // Jan 1   – Connecticut
  US_NJ: { month: 10, day: 1 }, // Oct 1   – New Jersey
  US_NH: { month: 8, day: 1 }, // Aug 1   – New Hampshire
  US_VA: { month: 9, day: 30 }, // Sept 30 – Virginia
  US_NC: { month: 10, day: 16 }, // Oct 16  – North Carolina
  US_TN: { month: 9, day: 30 }, // Sept 30 – Tennessee
  US_IL: { month: 9, day: 1 }, // Sept 1  – Illinois
  US_OH: { month: 8, day: 1 }, // Aug 1   – Ohio

  // ── International ─────────────────────────────────────────────────────────
  UK: { month: 8, day: 31 }, // England/Wales: Aug 31
  UK_SCOTLAND: { month: 2, day: 28 }, // Scotland: Feb 28/29
  CANADA: { month: 12, day: 31 }, // Most provinces: Dec 31
  AUSTRALIA: { month: 4, day: 30 }, // Most states: Apr 30
  AUSTRALIA_NSW: { month: 7, day: 31 }, // New South Wales: Jul 31
  NEW_ZEALAND: { month: 12, day: 31 }, // Dec 31
  GERMANY: { month: 9, day: 30 }, // Sept 30
  FRANCE: { month: 12, day: 31 }, // Dec 31
  NETHERLANDS: { month: 10, day: 1 }, // Oct 1
  INDIA: { month: 5, day: 31 }, // May 31
  JAPAN: { month: 4, day: 1 }, // Apr 1 (must turn 6 by Apr 2)
  SOUTH_KOREA: { month: 3, day: 1 }, // Mar 1
  SINGAPORE: { month: 12, day: 31 }, // Dec 31
  UAE: { month: 9, day: 30 }, // Sept 30
};

/**
 * The calendar month (1-indexed) in which each region's school year begins.
 * Used to determine whether today is before or after the new school year started.
 */
export const ACADEMIC_YEAR_START_MONTH: Record<string, number> = {
  US_DEFAULT: 9, // September
  US_WA: 9,
  UK: 9,
  UK_SCOTLAND: 9,
  CANADA: 9,
  AUSTRALIA: 2, // February
  AUSTRALIA_NSW: 2,
  NEW_ZEALAND: 2,
  GERMANY: 9,
  FRANCE: 9,
  NETHERLANDS: 9,
  INDIA: 6, // June
  JAPAN: 4, // April
  SOUTH_KOREA: 3, // March
  SINGAPORE: 1, // January
  UAE: 9,
};

/**
 * Calculate age from date of birth
 * @param dob - Date of birth (string or Date)
 * @returns Age in years
 */
export const calculateAge = (dob: string | Date): number => {
  if (!dob) return 0;

  try {
    const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
    if (isNaN(birthDate.getTime())) return 0;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  } catch {
    return 0;
  }
};

/**
 * Returns the calendar year in which the currently active school year began.
 *
 * e.g. today = Feb 22, 2026, school starts in September
 *   → active school year is 2025-2026 → returns 2025
 */
export const getCurrentSchoolYearStart = (
  referenceDate: Date = new Date(),
  academicYearStartMonth: number = 9,
): number => {
  const month = referenceDate.getMonth() + 1; // 1-indexed
  const calendarYear = referenceDate.getFullYear();
  return month < academicYearStartMonth ? calendarYear - 1 : calendarYear;
};

/**
 * Calculates the current school grade for a student.
 *
 * @param dob             - Student's date of birth (string or Date)
 * @param currentYear     - The registration/current calendar year (e.g. 2026)
 * @param region          - Key from REGIONAL_CUTOFFS (default: 'US_DEFAULT')
 * @param referenceDate   - Date to evaluate as "today" (default: new Date())
 * @returns               - 'PK', 'K', '1'–'12', or '' on error
 */
export const calculateGradeFromDOB = (
  dob: string | Date,
  currentYear: number,
  region: GradeRegion = 'US_DEFAULT',
  referenceDate: Date = new Date(),
): string => {
  if (!dob) return '';

  try {
    const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
    if (isNaN(birthDate.getTime())) return '';

    const birthYear = birthDate.getUTCFullYear();
    const birthMonth = birthDate.getUTCMonth() + 1; // 1-indexed
    const birthDay = birthDate.getUTCDate();

    // ── 1. Resolve regional cutoff ──────────────────────────────────────────
    const cutoff = REGIONAL_CUTOFFS[region] ?? REGIONAL_CUTOFFS['US_DEFAULT'];
    const { month: cutoffMonth, day: cutoffDay } = cutoff;

    // ── 2. Determine school year START ──────────────────────────────────────
    const academicStartMonth =
      ACADEMIC_YEAR_START_MONTH[region] ??
      ACADEMIC_YEAR_START_MONTH['US_DEFAULT'];

    const refMonth = referenceDate.getMonth() + 1; // 1-indexed
    let schoolYearStart: number;

    if (refMonth < academicStartMonth) {
      // We're in the early part of the calendar year, before school starts.
      // The active school year began in the PREVIOUS calendar year.
      schoolYearStart = currentYear - 1;
    } else {
      schoolYearStart = currentYear;
    }

    // ── 3. Was child born on/before cutoff? ─────────────────────────────────
    const isOnOrBeforeCutoff =
      birthMonth < cutoffMonth ||
      (birthMonth === cutoffMonth && birthDay <= cutoffDay);

    // ── 4. Kindergarten start year ──────────────────────────────────────────
    const kindergartenStartYear = isOnOrBeforeCutoff
      ? birthYear + 5
      : birthYear + 6;

    // ── 5. Grade ────────────────────────────────────────────────────────────
    const gradeLevel = schoolYearStart - kindergartenStartYear;

    // ── 6. Edge cases ───────────────────────────────────────────────────────
    if (gradeLevel < 0) return 'PK';
    if (gradeLevel === 0) return 'K';
    if (gradeLevel > 12) return '12';

    return gradeLevel.toString();
  } catch {
    return '';
  }
};

/** Returns the ordinal suffix for a grade number string. */
export const getOrdinalSuffix = (grade: string): string => {
  if (grade === 'PK' || grade === 'K') return '';
  const num = parseInt(grade, 10);
  if (isNaN(num)) return '';
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
};

/** Human-readable grade label, e.g. "6th Grade" or "Kindergarten". */
export const getGradeLabel = (grade: string): string => {
  if (grade === 'PK') return 'Pre-Kindergarten';
  if (grade === 'K') return 'Kindergarten';
  const suffix = getOrdinalSuffix(grade);
  return suffix ? `${grade}${suffix} Grade` : grade;
};
