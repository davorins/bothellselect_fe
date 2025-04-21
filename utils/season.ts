// src/utils/season.ts
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

  if (month >= 3 && month <= 5) return 'Summer'; // After Spring comes Summer
  if (month >= 6 && month <= 8) return 'Fall'; // After Summer comes Fall
  if (month >= 9 && month <= 11) return 'Winter'; // After Fall comes Winter
  return 'Spring'; // After Winter comes Spring
}
