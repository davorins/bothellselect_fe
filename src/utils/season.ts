// utils/season.ts

export interface Season {
  season: string;
  year: number;
  tryoutId?: string;
  registrationDate?: Date | string;
  paymentComplete?: boolean;
  paymentStatus?: 'paid' | 'pending' | 'failed' | 'refunded';
  paymentDate?: Date | string;
  amountPaid?: number;
  cardLast4?: string;
  cardBrand?: string;
  paymentId?: string;
}

// Season order for proper transitions
const SEASON_ORDER = ['Winter', 'Spring', 'Summer', 'Fall'];

/**
 * Extract base season name from a full season string
 */
export function extractBaseSeason(seasonName: string): string {
  if (!seasonName) return '';

  const lower = seasonName.toLowerCase();

  if (lower.includes('spring')) return 'Spring';
  if (lower.includes('summer')) return 'Summer';
  if (lower.includes('fall')) return 'Fall';
  if (lower.includes('winter')) return 'Winter';

  return seasonName;
}

/**
 * Check if a season string matches the target season (flexible matching)
 */
export function isSeasonMatch(
  seasonName: string,
  targetSeason: string,
): boolean {
  if (!seasonName || !targetSeason) return false;

  const baseSeason = extractBaseSeason(seasonName);
  const baseTarget = extractBaseSeason(targetSeason);

  return baseSeason === baseTarget;
}

/**
 * Get current season based on month
 */
export function getCurrentSeason(): string {
  const now = new Date();
  const month = now.getMonth() + 1;

  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Fall';
  return 'Winter';
}

/**
 * Get next season based on current season
 */
export function getNextSeason(): string {
  const currentSeason = getCurrentSeason();
  const currentIndex = SEASON_ORDER.indexOf(currentSeason);
  return SEASON_ORDER[(currentIndex + 1) % 4];
}

/**
 * Get previous season
 */
export function getPreviousSeason(): string {
  const currentSeason = getCurrentSeason();
  const currentIndex = SEASON_ORDER.indexOf(currentSeason);
  return SEASON_ORDER[(currentIndex - 1 + 4) % 4];
}

/**
 * Get current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Get year for next season (handles year rollover correctly)
 */
export function getNextSeasonYear(): number {
  const currentSeason = getCurrentSeason();
  const currentYear = getCurrentYear();

  // Only increment year when going from Fall to Winter
  if (currentSeason === 'Fall') {
    return currentYear + 1;
  }

  return currentYear;
}

/**
 * Get year for previous season (handles year rollover)
 */
export function getPreviousSeasonYear(): number {
  const currentSeason = getCurrentSeason();
  const currentYear = getCurrentYear();

  return currentSeason === 'Spring' ? currentYear - 1 : currentYear;
}

/**
 * Check if a given season and year combination is the current season
 */
export function isCurrentSeason(season: string, year: number): boolean {
  return isSeasonMatch(season, getCurrentSeason()) && year === getCurrentYear();
}

/**
 * Check if a given season and year combination is the next season
 */
export function isNextSeason(season: string, year: number): boolean {
  return isSeasonMatch(season, getNextSeason()) && year === getNextSeasonYear();
}

/**
 * Check if a given season and year combination is a future season
 */
export function isFutureSeason(season: string, year: number): boolean {
  const currentYear = getCurrentYear();

  if (year > currentYear) return true;
  if (year < currentYear) return false;

  const currentSeason = getCurrentSeason();
  const baseSeason = extractBaseSeason(season);
  const baseCurrentSeason = extractBaseSeason(currentSeason);

  const currentIndex = SEASON_ORDER.indexOf(baseCurrentSeason);
  const seasonIndex = SEASON_ORDER.indexOf(baseSeason);

  return seasonIndex > currentIndex;
}

/**
 * Check if player is registered for current season
 */
export function isPlayerRegisteredForCurrentSeason(player: any): boolean {
  const currentYear = getCurrentYear();
  const currentSeason = getCurrentSeason();

  if (player.seasons && Array.isArray(player.seasons)) {
    return player.seasons.some(
      (s: any) =>
        isSeasonMatch(s.season, currentSeason) && s.year === currentYear,
    );
  }

  return (
    isSeasonMatch(player.season, currentSeason) &&
    player.registrationYear === currentYear
  );
}

/**
 * Check if player is registered for next season
 */
export function isPlayerRegisteredForNextSeason(player: any): boolean {
  const nextYear = getNextSeasonYear();
  const nextSeason = getNextSeason();

  if (player.seasons && Array.isArray(player.seasons)) {
    return player.seasons.some(
      (s: any) => isSeasonMatch(s.season, nextSeason) && s.year === nextYear,
    );
  }

  return (
    isSeasonMatch(player.season, nextSeason) &&
    player.registrationYear === nextYear
  );
}

/**
 * Check if player is paid for current season
 */
export function isPlayerPaidForCurrentSeason(player: any): boolean {
  const currentYear = getCurrentYear();
  const currentSeason = getCurrentSeason();

  if (player.seasons && Array.isArray(player.seasons)) {
    const currentSeasonReg = player.seasons.find(
      (s: any) =>
        isSeasonMatch(s.season, currentSeason) && s.year === currentYear,
    );
    return currentSeasonReg ? currentSeasonReg.paymentComplete === true : false;
  }

  if (
    isSeasonMatch(player.season, currentSeason) &&
    player.registrationYear === currentYear
  ) {
    return player.paymentComplete === true;
  }

  return false;
}

/**
 * Get player status based on seasons
 *
 * Rules:
 * - Active:
 *   - Registered for current season AND payment complete, OR
 *   - Registered for next season AND payment complete (treat as active for upcoming season)
 * - Pending Payment: Registered for current/next season but unpaid
 * - Inactive: No registrations for current or next season
 */
export function getPlayerStatus(
  player: any,
): 'Active' | 'Pending Payment' | 'Inactive' {
  const currentYear = getCurrentYear();
  const currentSeason = getCurrentSeason();
  const nextSeason = getNextSeason();
  const nextSeasonYear = getNextSeasonYear();

  console.log('🔍 Calculating status for:', player.fullName || player.name);
  console.log('📅 Current:', { season: currentSeason, year: currentYear });
  console.log('⏭️ Next:', { season: nextSeason, year: nextSeasonYear });

  // Handle seasons array
  if (
    player.seasons &&
    Array.isArray(player.seasons) &&
    player.seasons.length > 0
  ) {
    console.log('📋 Checking seasons array:', player.seasons);

    // Check for current season registration
    const currentSeasonReg = player.seasons.find(
      (s: any) =>
        isSeasonMatch(s.season, currentSeason) && s.year === currentYear,
    );

    if (currentSeasonReg) {
      console.log('✅ Found current season registration:', currentSeasonReg);
      return currentSeasonReg.paymentComplete ? 'Active' : 'Pending Payment';
    }

    // Check for next season registration
    const nextSeasonReg = player.seasons.find(
      (s: any) =>
        isSeasonMatch(s.season, nextSeason) && s.year === nextSeasonYear,
    );

    if (nextSeasonReg) {
      console.log('⏭️ Found next season registration:', nextSeasonReg);
      // If registered for next season and paid, treat as Active
      return nextSeasonReg.paymentComplete ? 'Active' : 'Pending Payment';
    }

    console.log('❌ No current or next season registration');
    return 'Inactive';
  }

  // Fallback to top-level fields
  console.log('📋 Checking top-level fields');

  if (
    isSeasonMatch(player.season, currentSeason) &&
    player.registrationYear === currentYear
  ) {
    console.log('✅ Current season from top-level');
    return player.paymentComplete ? 'Active' : 'Pending Payment';
  }

  if (
    isSeasonMatch(player.season, nextSeason) &&
    player.registrationYear === nextSeasonYear
  ) {
    console.log('⏭️ Next season from top-level');
    // If registered for next season and paid, treat as Active
    return player.paymentComplete ? 'Active' : 'Pending Payment';
  }

  return 'Inactive';
}

/**
 * Debug function to check player status
 */
export function debugPlayerStatus(player: any): void {
  console.log('🔍 ===== PLAYER STATUS DEBUG =====');
  console.log('Player:', player.fullName || player.name);
  console.log('Current date:', new Date().toISOString());
  console.log('Current season:', getCurrentSeason(), getCurrentYear());
  console.log('Next season:', getNextSeason(), getNextSeasonYear());
  console.log('Seasons data:', player.seasons);
  console.log('Status:', getPlayerStatus(player));
  console.log('=================================');
}
