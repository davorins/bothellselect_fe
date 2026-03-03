// utils/statusUtils.ts
// Single source of truth for parent/player status based on active SeasonEvents

export interface SeasonEvent {
  eventId: string;
  season: string;
  year: number;
  registrationOpen: boolean;
}

/**
 * Determine if a season name matches a SeasonEvent's season.
 * "Spring Tryout 2026" matches SeasonEvent { season: "Spring", year: 2026 }
 * "Partizan Winter Break Camp" matches SeasonEvent { season: "Partizan Winter Break Camp", year: 2026 }
 */
export function seasonMatchesEvent(
  playerSeason: string,
  event: SeasonEvent,
): boolean {
  if (!playerSeason || !event.season) return false;
  const ps = playerSeason.toLowerCase();
  const es = event.season.toLowerCase();
  // Exact match
  if (ps === es) return true;
  // Player season contains the event season keyword (e.g. "Spring Tryout 2026" contains "spring")
  if (ps.includes(es)) return true;
  // Event season contains the player season keyword
  if (es.includes(ps)) return true;
  return false;
}

/**
 * Get player registration for a given SeasonEvent
 */
export function getPlayerRegForEvent(player: any, event: SeasonEvent) {
  if (
    player.seasons &&
    Array.isArray(player.seasons) &&
    player.seasons.length > 0
  ) {
    return (
      player.seasons.find(
        (s: any) =>
          seasonMatchesEvent(s.season, event) && s.year === event.year,
      ) || null
    );
  }
  // Legacy top-level fallback
  if (
    player.season &&
    seasonMatchesEvent(player.season, event) &&
    player.registrationYear === event.year
  ) {
    return {
      season: player.season,
      year: player.registrationYear,
      paymentComplete: player.paymentComplete,
      paymentStatus: player.paymentStatus,
    };
  }
  return null;
}

/**
 * Determine player status against a list of active season events.
 *
 * Active   = has a registration for ANY active SeasonEvent, paymentComplete: true
 * Pending  = has a registration for ANY active SeasonEvent, paymentComplete: false/null
 * Inactive = no registration for any active SeasonEvent
 */
export function getPlayerStatusFromEvents(
  player: any,
  activeEvents: SeasonEvent[],
): 'Active' | 'Pending Payment' | 'Inactive' {
  if (!activeEvents || activeEvents.length === 0) {
    return legacyPlayerStatus(player);
  }

  let hasAnyReg = false;
  let hasPaid = false;
  let hasUnpaid = false;

  for (const event of activeEvents) {
    const reg = getPlayerRegForEvent(player, event);
    if (reg) {
      hasAnyReg = true;
      if (reg.paymentComplete === true) {
        hasPaid = true;
      } else {
        hasUnpaid = true;
      }
    }
  }

  if (!hasAnyReg) return 'Inactive';
  // If they have ANY paid registration for an active event → Active
  // Only Pending Payment if they have an unpaid reg AND no paid ones
  if (hasPaid) return 'Active';
  return 'Pending Payment';
}

/**
 * Determine parent status based on their players' statuses.
 *
 * Active          = at least one player Active, no Pending Payment players
 * Pending Payment = at least one player Pending Payment (regardless of others)
 * Inactive        = all players Inactive (or no players)
 */
export function getParentStatusFromEvents(
  parent: any,
  activeEvents: SeasonEvent[],
): 'Active' | 'Pending Payment' | 'Inactive' {
  if (parent.isCoach) return 'Active';

  const players: any[] = parent.players || [];
  if (players.length === 0) return 'Inactive';

  let hasActive = false;
  let hasPending = false;

  for (const player of players) {
    const status = getPlayerStatusFromEvents(player, activeEvents);
    if (status === 'Active') hasActive = true;
    if (status === 'Pending Payment') hasPending = true;
  }

  if (hasActive) return 'Active';
  if (hasPending) return 'Pending Payment';
  return 'Inactive';
}

/**
 * Payment status label for display (not the same as registration status)
 */
export function getPaymentStatusFromEvents(
  parent: any,
  activeEvents: SeasonEvent[],
): 'paid' | 'notPaid' | null {
  if (parent.isCoach) return null;

  const status = getParentStatusFromEvents(parent, activeEvents);

  if (status === 'Active') return 'paid';
  if (status === 'Pending Payment') return 'notPaid';
  return null; // Inactive
}

// ── Legacy calendar-based fallback (used when no SeasonEvents available) ────
function legacyPlayerStatus(
  player: any,
): 'Active' | 'Pending Payment' | 'Inactive' {
  const now = new Date();
  const month = now.getMonth() + 1;
  const currentSeason =
    month >= 3 && month <= 5
      ? 'Spring'
      : month >= 6 && month <= 8
        ? 'Summer'
        : month >= 9 && month <= 11
          ? 'Fall'
          : 'Winter';
  const currentYear = now.getFullYear();

  const seasons = player.seasons || [];
  const match = seasons.find(
    (s: any) =>
      s.season?.toLowerCase().includes(currentSeason.toLowerCase()) &&
      s.year === currentYear,
  );

  if (match) return match.paymentComplete ? 'Active' : 'Pending Payment';

  if (
    player.season?.toLowerCase().includes(currentSeason.toLowerCase()) &&
    player.registrationYear === currentYear
  ) {
    return player.paymentComplete ? 'Active' : 'Pending Payment';
  }

  return 'Inactive';
}
