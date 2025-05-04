export function getCurrentSeason(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Fall';
  return 'Winter';
}

export function getNextSeason(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'Summer';
  if (month >= 6 && month <= 8) return 'Fall';
  if (month >= 9 && month <= 11) return 'Winter';
  return 'Spring';
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function isPlayerActive(player: {
  season: string;
  registrationYear: number;
}): boolean {
  const currentSeason = getCurrentSeason();
  const currentYear = getCurrentYear();
  const nextSeason = getNextSeason();
  const nextSeasonYear =
    currentSeason === 'Winter' ? currentYear + 1 : currentYear;

  console.log('Current season/year:', currentSeason, currentYear);
  console.log('Next season/year:', nextSeason, nextSeasonYear);
  console.log('Player season/year:', player.season, player.registrationYear);

  // Player is active if:
  // 1. Registered for current season and current year
  // 2. Registered for next season and next season's year
  // 3. Registered for any future year
  const isActive =
    (player.season === currentSeason &&
      player.registrationYear === currentYear) ||
    (player.season === nextSeason &&
      player.registrationYear === nextSeasonYear) ||
    player.registrationYear > currentYear;

  console.log('Is player active?', isActive);
  return isActive;
}
