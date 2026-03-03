// parentUtils.ts
import moment, { Moment } from 'moment';
import { Player, Parent, Guardian } from '../types/types';
import {
  getCurrentSeason,
  getCurrentYear,
  getNextSeason,
  getNextSeasonYear,
  isSeasonMatch,
  extractBaseSeason,
  getPlayerStatus,
} from '../utils/season';
import { ExtendedTableRecord, StatusType } from '../types/table.types';

// Helper to check if player is registered for current season (with season name check)
const isPlayerRegisteredForCurrentSeason = (player: Player): boolean => {
  const currentYear = getCurrentYear();
  const currentSeason = getCurrentSeason();

  // Check the seasons array first (includes season name)
  if (player.seasons && Array.isArray(player.seasons)) {
    const hasCurrentSeason = player.seasons.some(
      (season: any) =>
        isSeasonMatch(season.season, currentSeason) &&
        season.year === currentYear,
    );
    if (hasCurrentSeason) return true;
  }

  // Fallback to direct properties (includes season name)
  return !!(
    isSeasonMatch(player.season, currentSeason) &&
    player.registrationYear === currentYear
  );
};

// Helper to check if player is registered for next season
const isPlayerRegisteredForNextSeason = (player: Player): boolean => {
  const nextYear = getNextSeasonYear();
  const nextSeason = getNextSeason();

  // Check the seasons array first
  if (player.seasons && Array.isArray(player.seasons)) {
    const hasNextSeason = player.seasons.some(
      (season: any) =>
        isSeasonMatch(season.season, nextSeason) && season.year === nextYear,
    );
    if (hasNextSeason) return true;
  }

  // Fallback to direct properties
  return !!(
    isSeasonMatch(player.season, nextSeason) &&
    player.registrationYear === nextYear
  );
};

// Helper to check if player has paid for current season
const isPlayerPaidForCurrentSeason = (player: Player): boolean => {
  const currentYear = getCurrentYear();
  const currentSeason = getCurrentSeason();

  // Check seasons array first for current season payment
  if (player.seasons && Array.isArray(player.seasons)) {
    const currentSeasonEntry = (player.seasons as any[]).find(
      (season) =>
        isSeasonMatch(season.season, currentSeason) &&
        season.year === currentYear,
    );
    if (currentSeasonEntry) {
      return currentSeasonEntry.paymentComplete === true;
    }
  }

  // Fallback: if they're registered for current season, check top-level paymentComplete
  if (
    isSeasonMatch(player.season, currentSeason) &&
    player.registrationYear === currentYear
  ) {
    return player.paymentComplete === true;
  }

  return false;
};

// Helper to check if player has paid for next season
const isPlayerPaidForNextSeason = (player: Player): boolean => {
  const nextYear = getNextSeasonYear();
  const nextSeason = getNextSeason();

  // Check seasons array first for next season payment
  if (player.seasons && Array.isArray(player.seasons)) {
    const nextSeasonEntry = (player.seasons as any[]).find(
      (season) =>
        isSeasonMatch(season.season, nextSeason) && season.year === nextYear,
    );
    if (nextSeasonEntry) {
      return nextSeasonEntry.paymentComplete === true;
    }
  }

  // Fallback: if they're registered for next season, check top-level paymentComplete
  if (
    isSeasonMatch(player.season, nextSeason) &&
    player.registrationYear === nextYear
  ) {
    return player.paymentComplete === true;
  }

  return false;
};

// Helper to check if player has any pending payments
const hasPlayerPendingPayments = (player: Player): boolean => {
  const currentYear = getCurrentYear();
  const currentSeason = getCurrentSeason();
  const nextYear = getNextSeasonYear();
  const nextSeason = getNextSeason();

  // Check seasons array
  if (player.seasons && Array.isArray(player.seasons)) {
    // Check current season unpaid
    const currentSeasonEntry = (player.seasons as any[]).find(
      (season) =>
        isSeasonMatch(season.season, currentSeason) &&
        season.year === currentYear,
    );

    if (currentSeasonEntry) {
      return currentSeasonEntry.paymentComplete === false;
    }

    // Check next season unpaid
    const nextSeasonEntry = (player.seasons as any[]).find(
      (season) =>
        isSeasonMatch(season.season, nextSeason) && season.year === nextYear,
    );

    if (nextSeasonEntry) {
      return nextSeasonEntry.paymentComplete === false;
    }
  }

  // Check direct properties
  if (
    isSeasonMatch(player.season, currentSeason) &&
    player.registrationYear === currentYear
  ) {
    return player.paymentComplete === false;
  }

  if (
    isSeasonMatch(player.season, nextSeason) &&
    player.registrationYear === nextYear
  ) {
    return player.paymentComplete === false;
  }

  return false;
};

/**
 * Parent/Guardian status rules:
 *
 *  - Coach          → always "Active"
 *  - Active         → has ≥1 player who is Active (registered for current/next season AND paid)
 *  - Pending Payment → has ≥1 player who is Pending Payment (registered but unpaid)
 *  - Inactive       → no players registered for current or next season
 */
export const getParentStatus = (item: any): StatusType => {
  // Coaches are always active
  if (item.isCoach) {
    return 'Active';
  }

  const players = item.players || [];

  if (!players || players.length === 0) {
    return 'Inactive';
  }

  let hasActivePlayer = false;
  let hasPendingPlayer = false;

  for (const player of players) {
    if (!player) continue;

    // Use player status function
    const playerStatus = getPlayerStatus(player);

    if (playerStatus === 'Active') {
      hasActivePlayer = true;
    } else if (playerStatus === 'Pending Payment') {
      hasPendingPlayer = true;
    }
  }

  if (hasActivePlayer) return 'Active';
  if (hasPendingPlayer) return 'Pending Payment';
  return 'Inactive';
};

/**
 * Payment status helper
 */
export const getPaymentStatus = (item: any): 'paid' | 'notPaid' | null => {
  const players = item.players || [];

  if (!players || players.length === 0) return null;

  const currentYear = getCurrentYear();
  const currentSeason = getCurrentSeason();
  const nextYear = getNextSeasonYear();
  const nextSeason = getNextSeason();

  // Get players registered for current or next season
  const relevantPlayers = players.filter((player: any) => {
    if (player.seasons && Array.isArray(player.seasons)) {
      return (player.seasons as any[]).some(
        (s) =>
          (isSeasonMatch(s.season, currentSeason) && s.year === currentYear) ||
          (isSeasonMatch(s.season, nextSeason) && s.year === nextYear),
      );
    }
    return (
      (isSeasonMatch(player.season, currentSeason) &&
        player.registrationYear === currentYear) ||
      (isSeasonMatch(player.season, nextSeason) &&
        player.registrationYear === nextYear)
    );
  });

  // If no relevant players, check if anyone has paid ever
  if (relevantPlayers.length === 0) {
    const anyPaid = players.some((p: any) => {
      if (p.seasons && Array.isArray(p.seasons)) {
        return (p.seasons as any[]).some((s) => s.paymentComplete === true);
      }
      return p.paymentComplete === true;
    });
    return anyPaid ? 'paid' : 'notPaid';
  }

  // Check if all relevant players have paid
  const allPaid = relevantPlayers.every((player: any) => {
    if (player.seasons && Array.isArray(player.seasons)) {
      return (player.seasons as any[]).some(
        (s) =>
          ((isSeasonMatch(s.season, currentSeason) && s.year === currentYear) ||
            (isSeasonMatch(s.season, nextSeason) && s.year === nextYear)) &&
          s.paymentComplete === true,
      );
    }
    return player.paymentComplete === true;
  });

  return allPaid ? 'paid' : 'notPaid';
};

// The rest of your file remains exactly the same from here down

export const transformParentData = (
  parents: Parent[],
  guardians: Guardian[],
  currentUser: Parent | null,
): ExtendedTableRecord[] => {
  if (!currentUser) return [];

  const getSafeDate = (date: string | undefined): string => {
    return date || new Date().toISOString();
  };

  if (currentUser.role === 'user') {
    return [
      {
        _id: currentUser._id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        phone: currentUser.phone,
        address: currentUser.address,
        role: currentUser.role,
        type: 'parent',
        status: getParentStatus(currentUser),
        paymentStatus: getPaymentStatus(currentUser),
        DateofJoin: getSafeDate(currentUser.createdAt),
        imgSrc: currentUser.avatar || '',
        avatar: currentUser.avatar,
        aauNumber: currentUser.aauNumber || 'N/A',
        canView: true,
        createdAt: getSafeDate(currentUser.createdAt),
        players: currentUser.players || [],
        isCoach: currentUser.isCoach,
        additionalGuardians: currentUser.additionalGuardians || [],
      },
    ];
  }

  const processedParentIds = new Set<string>();

  const parentRecords: ExtendedTableRecord[] = parents.map((parent) => {
    processedParentIds.add(parent._id);
    return {
      _id: parent._id,
      fullName: parent.fullName,
      email: parent.email,
      phone: parent.phone,
      address: parent.address,
      role: parent.role,
      type: parent.isCoach ? 'coach' : 'parent',
      status: getParentStatus(parent),
      paymentStatus: getPaymentStatus(parent),
      DateofJoin: getSafeDate(parent.createdAt),
      imgSrc: parent.avatar || '',
      avatar: parent.avatar,
      aauNumber: parent.aauNumber || 'N/A',
      canView: true,
      createdAt: getSafeDate(parent.createdAt),
      players: parent.players || [],
      isCoach: parent.isCoach,
      additionalGuardians: parent.additionalGuardians || [],
    };
  });

  const guardianRecords: ExtendedTableRecord[] = (guardians || [])
    .filter(
      (guardian) => !processedParentIds.has(guardian._id || guardian.id || ''),
    )
    .flatMap((guardian) => {
      const guardianId = guardian._id || guardian.id || '';

      const mainGuardian: ExtendedTableRecord = {
        _id: guardianId,
        fullName: guardian.fullName,
        email: guardian.email,
        phone: guardian.phone,
        address: guardian.address,
        role: 'guardian',
        type: 'guardian',
        status: getParentStatus(guardian),
        paymentStatus: getPaymentStatus(guardian),
        DateofJoin: getSafeDate(guardian.createdAt as string | undefined),
        imgSrc: guardian.avatar || '',
        avatar: guardian.avatar,
        aauNumber: guardian.aauNumber || 'N/A',
        canView: true,
        createdAt: getSafeDate(guardian.createdAt as string | undefined),
        players: guardian.players || [],
        isCoach: guardian.isCoach,
        parentId: guardian.parentId,
        additionalGuardians: [],
      };

      const parentWithAdditional = parents.find((p) => p._id === guardianId);
      const additionalFromParent =
        parentWithAdditional?.additionalGuardians || [];

      const additionalGuardians: ExtendedTableRecord[] =
        additionalFromParent.map((g, index) => ({
          _id: g.id || `${guardianId}-${index}`,
          fullName: g.fullName,
          email: g.email,
          phone: g.phone,
          address: g.address,
          role: 'guardian',
          type: 'guardian',
          status: getParentStatus(g),
          paymentStatus: getPaymentStatus(g),
          DateofJoin: getSafeDate(g.createdAt as string | undefined),
          imgSrc: g.avatar || '',
          avatar: g.avatar,
          aauNumber: g.aauNumber || 'N/A',
          parentId: guardianId,
          canView: true,
          createdAt: getSafeDate(g.createdAt as string | undefined),
          players: g.players || [],
          isCoach: g.isCoach,
          additionalGuardians: [],
        }));

      return [mainGuardian, ...additionalGuardians];
    });

  return [...parentRecords, ...guardianRecords];
};

/**
 * Convert ExtendedTableRecord to a format compatible with getParentStatus/getPaymentStatus
 */
export const convertToParentFormat = (item: ExtendedTableRecord): any => {
  return {
    _id: item._id,
    fullName: item.fullName,
    email: item.email,
    phone: item.phone,
    isCoach: item.isCoach || false,
    players: item.players || [],
    aauNumber: item.aauNumber,
    avatar: item.avatar,
    address: item.address,
    relationship: (item as any).relationship,
    parentId: item.parentId,
    // Add any missing fields with defaults
    dismissedNotifications: [],
    playersSeason: [],
    playersYear: [],
    createdAt: item.createdAt || item.DateofJoin,
    updatedAt: item.updatedAt,
  };
};

/**
 * Get parent status from ExtendedTableRecord
 */
export const getParentStatusFromRecord = (
  item: ExtendedTableRecord,
): StatusType => {
  return getParentStatus(convertToParentFormat(item));
};

/**
 * Get payment status from ExtendedTableRecord
 */
export const getPaymentStatusFromRecord = (
  item: ExtendedTableRecord,
): 'paid' | 'notPaid' | null => {
  return getPaymentStatus(convertToParentFormat(item));
};

// Filter and sort functions (unchanged)
export const filterParentData = (
  data: ExtendedTableRecord[],
  filters: {
    nameFilter: string;
    emailFilter: string;
    phoneFilter: string;
    statusFilter: string | null;
    roleFilter: string | null;
    paymentStatusFilter?: 'paid' | 'notPaid' | null;
    dateRange: [Moment, Moment] | null;
  },
  currentUserRole: string,
): ExtendedTableRecord[] => {
  const seenIds = new Set<string>();

  return data.filter((item) => {
    const recordKey = `${item._id}-${item.type}`;
    if (seenIds.has(recordKey)) return false;
    seenIds.add(recordKey);

    if (currentUserRole === 'user' && !item.canView) return false;

    if (
      filters.nameFilter &&
      !item.fullName.toLowerCase().includes(filters.nameFilter.toLowerCase())
    )
      return false;

    if (
      filters.emailFilter &&
      !(
        item.email?.toLowerCase().includes(filters.emailFilter.toLowerCase()) ??
        true
      )
    )
      return false;

    if (
      filters.phoneFilter &&
      !(
        item.phone
          ?.replace(/\D/g, '')
          .includes(filters.phoneFilter.replace(/\D/g, '')) ?? true
      )
    )
      return false;

    if (
      filters.statusFilter &&
      item.status?.toLowerCase() !== filters.statusFilter.toLowerCase()
    )
      return false;

    if (filters.roleFilter) {
      if (filters.roleFilter === 'parent' && item.type !== 'parent')
        return false;
      if (filters.roleFilter === 'guardian' && item.type !== 'guardian')
        return false;
      if (filters.roleFilter === 'coach' && !item.isCoach) return false;
      if (filters.roleFilter === 'admin' && item.role !== 'admin') return false;
    }

    if (filters.paymentStatusFilter) {
      const hasPaidPlayers = item.players?.some(
        (p) => p.paymentComplete === true,
      );
      if (filters.paymentStatusFilter === 'paid' && !hasPaidPlayers)
        return false;
      if (filters.paymentStatusFilter === 'notPaid' && hasPaidPlayers)
        return false;
    }

    if (filters.dateRange) {
      const [start, end] = filters.dateRange;
      const itemDate = moment(item.DateofJoin);
      if (!itemDate.isBetween(start, end, undefined, '[]')) return false;
    }

    return true;
  });
};

export const sortParentData = (
  data: ExtendedTableRecord[],
  sortOrder: 'asc' | 'desc' | 'recentlyViewed' | 'recentlyAdded' | null,
): ExtendedTableRecord[] => {
  if (!sortOrder || data.length === 0) return data;

  return [...data].sort((a, b) => {
    try {
      switch (sortOrder) {
        case 'asc':
          return a.fullName.localeCompare(b.fullName);

        case 'desc':
          return b.fullName.localeCompare(a.fullName);

        case 'recentlyAdded':
          // Sort by DateofJoin or createdAt (newest first)
          const dateA = new Date(a.DateofJoin || a.createdAt || 0).getTime();
          const dateB = new Date(b.DateofJoin || b.createdAt || 0).getTime();
          return dateB - dateA; // Descending (newest first)

        case 'recentlyViewed':
          // Get recently viewed from localStorage (using the correct key)
          const recentlyViewed = JSON.parse(
            localStorage.getItem('recentlyViewedParents') || '[]',
          );

          // If no recently viewed, maintain original order
          if (recentlyViewed.length === 0) return 0;

          // For guardians, we need to check if their parent ID is in recently viewed
          const getRelevantId = (item: ExtendedTableRecord): string => {
            // If it's a guardian, use the parentId for recently viewed
            if (item.type === 'guardian' && item.parentId) {
              return item.parentId;
            }
            // Otherwise use the item's own ID
            return item._id;
          };

          const idA = getRelevantId(a);
          const idB = getRelevantId(b);

          // Get indices in recently viewed array
          const indexA = recentlyViewed.indexOf(idA);
          const indexB = recentlyViewed.indexOf(idB);

          // If both are in recently viewed, sort by recency (lower index = more recent)
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }

          // If only one is in recently viewed, it comes first
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;

          // Otherwise, maintain original order
          return 0;

        default:
          return 0;
      }
    } catch (error) {
      console.error('Error in sortParentData:', error);
      return 0;
    }
  });
};
