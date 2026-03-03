// utils/playerUtils.ts
import { fetchParentData } from '../context/AuthContext';
import {
  PlayerTableData,
  Player,
  PlayerFilterParams,
  PlayerSortOrder,
} from '../types/playerTypes';
import { getAvatarUrl, getDefaultAvatar } from './r2Utils';
import { getCurrentSeason, getCurrentYear } from './season';
import moment from 'moment';

export const formatGrade = (grade: number): string => {
  if (!grade || isNaN(grade)) return 'No Grade';
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = grade % 100;
  return `${grade}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
};

export const calculateAge = (dob: string): number => {
  const birthDate = new Date(dob);
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
};

/**
 * Helper function to get player status based on current season
 * Returns: 'Active' | 'Pending Payment' | 'Inactive'
 */
const getPlayerStatusFromSeasons = (
  player: any,
): 'Active' | 'Pending Payment' | 'Inactive' => {
  const currentYear = getCurrentYear();
  const currentSeason = getCurrentSeason();

  // Handle seasons array (preferred)
  if (
    player.seasons &&
    Array.isArray(player.seasons) &&
    player.seasons.length > 0
  ) {
    // Find current season registration
    const currentSeasonReg = player.seasons.find(
      (s: any) => s.season === currentSeason && s.year === currentYear,
    );

    if (currentSeasonReg) {
      // Registered for current season
      return currentSeasonReg.paymentComplete ? 'Active' : 'Pending Payment';
    }

    // Check for future seasons
    const hasFutureSeason = player.seasons.some(
      (s: any) => s.year > currentYear,
    );
    if (hasFutureSeason) return 'Pending Payment';

    return 'Inactive';
  }

  // Fallback to top-level fields
  if (
    player.season === currentSeason &&
    player.registrationYear === currentYear
  ) {
    return player.paymentComplete ? 'Active' : 'Pending Payment';
  }

  return 'Inactive';
};

/**
 * Helper to check if player has any registrations
 */
const hasAnyRegistrations = (player: any): boolean => {
  if (
    player.seasons &&
    Array.isArray(player.seasons) &&
    player.seasons.length > 0
  ) {
    return true;
  }
  return !!(player.season && player.registrationYear);
};

export const convertToPlayer = (playerData: PlayerTableData): Player => {
  const convertedSiblings =
    playerData.siblings?.map((sibling) => ({
      id: sibling.id,
      _id: sibling.id,
      fullName: sibling.name,
      name: sibling.name,
      gender: sibling.gender,
      dob: sibling.dob,
      age: sibling.age,
      section: sibling.section,
      class: sibling.class,
      grade: sibling.class.replace(/\D/g, '') || '0',
      status: sibling.status,
      DateofJoin: sibling.DateofJoin,
      createdAt: sibling.DateofJoin,
      healthConcerns: sibling.healthConcerns,
      aauNumber: sibling.aauNumber,
      schoolName: sibling.section,
      avatar: sibling.imgSrc,
      imgSrc: sibling.imgSrc,
      siblings: [],
      parents: sibling.parents || [],
      season: sibling.season,
      registrationYear: sibling.registrationYear,
    })) || [];

  return {
    id: playerData.id,
    _id: playerData.id,
    fullName: playerData.name,
    name: playerData.name,
    gender: playerData.gender,
    dob: playerData.dob,
    age: playerData.age,
    section: playerData.section,
    class: playerData.class,
    grade: playerData.class.replace(/\D/g, '') || '0',
    status: playerData.status,
    DateofJoin: playerData.DateofJoin,
    createdAt: playerData.DateofJoin,
    healthConcerns: playerData.healthConcerns,
    aauNumber: playerData.aauNumber,
    schoolName: playerData.section,
    avatar: playerData.imgSrc,
    imgSrc: playerData.imgSrc,
    siblings: convertedSiblings,
    parents: playerData.parents || [],
    season: playerData.season,
    registrationYear: playerData.registrationYear,
    parentId: playerData.parentId,
    paymentComplete: playerData.paymentInfo?.status === 'paid',
    registrationComplete: playerData.paymentInfo?.status !== 'failed',
  };
};

export const transformPlayerData = async (
  players: any[],
  parent: any,
): Promise<PlayerTableData[]> => {
  const siblingIds = parent?.players
    ? parent.players.map((p: any) => (typeof p === 'string' ? p : p._id))
    : [];

  const token = localStorage.getItem('token');
  const parentCache = new Map<string, { email: string }>();

  console.log('Raw player data:', players);

  const result = await Promise.all(
    players.map(async (player) => {
      const playerDefault = getDefaultAvatar(
        'player',
        player.gender as 'Male' | 'Female' | undefined,
      );
      const avatarUrl = getAvatarUrl(
        player.imgSrc || player.avatar,
        playerDefault,
      );

      // Enhanced seasons data handling with proper season names
      const seasons = Array.isArray(player.seasons)
        ? player.seasons.map((season: any) => ({
            season: season.season || player.season || 'Partizan',
            year:
              season.year ||
              player.registrationYear ||
              new Date().getFullYear(),
            tryoutId: season.tryoutId,
            registrationDate:
              season.registrationDate || season.createdAt || player.createdAt,
            paymentComplete:
              season.paymentComplete !== undefined
                ? season.paymentComplete
                : player.paymentComplete,
            paymentStatus:
              season.paymentStatus ||
              player.paymentStatus ||
              (season.paymentComplete ? 'paid' : 'pending'),
            paymentId: season.paymentId,
            amountPaid: season.amountPaid || player.amountPaid,
            cardLast4: season.cardLast4 || player.cardLast4,
            cardBrand: season.cardBrand || player.cardBrand,
            paymentDate: season.paymentDate || player.paymentDate,
          }))
        : [];

      console.log(`Player ${player._id} seasons data:`, seasons);

      // Calculate status using the helper function
      const status = getPlayerStatusFromSeasons(player);

      console.log(`Player ${player._id} calculated status: ${status}`);

      const siblings = players
        .filter((sib) => siblingIds.includes(sib._id) && sib._id !== player._id)
        .map((sib) => {
          const sibDefault = getDefaultAvatar(
            'player',
            sib.gender as 'Male' | 'Female' | undefined,
          );
          const sibStatus = getPlayerStatusFromSeasons(sib);

          return {
            id: sib._id,
            key: sib._id,
            name: sib.fullName || sib.name,
            gender: sib.gender,
            dob: sib.dob,
            age: calculateAge(sib.dob),
            section: sib.schoolName || sib.section || 'No School',
            class: formatGrade(Number(sib.grade)) || 'No Grade',
            aauNumber: sib.aauNumber || 'No AAU Number',
            healthConcerns: sib.healthConcerns || 'No Medical History',
            status: sibStatus,
            DateofJoin: sib.createdAt,
            imgSrc: getAvatarUrl(sib.imgSrc || sib.avatar, sibDefault),
            siblings: [],
            parents: sib.parents || [],
            season: sib.season,
            registrationYear: sib.registrationYear,
            seasons: sib.seasons || [],
          };
        });

      let parents: { email: string }[] = [];

      // Get parent emails for admin users
      if (
        parent?.role === 'admin' &&
        player.parents &&
        Array.isArray(player.parents)
      ) {
        parents = player.parents
          .map((p: any) => ({ email: p.email?.trim() }))
          .filter((p: any) => {
            if (!p.email || !p.email.includes('@')) {
              console.warn(
                `Invalid or missing email for parent of player ${player._id}: ${p.email}`,
              );
              return false;
            }
            return true;
          });
      }

      // Handle parentId
      let parentId: string | null = null;
      if (player.parentId) {
        if (typeof player.parentId === 'string') {
          parentId = player.parentId;
        } else if (player.parentId && typeof player.parentId === 'object') {
          parentId = player.parentId._id || player.parentId.toString();
          if (parentId === '[object Object]') {
            console.warn(
              `Invalid parentId format for player ${player._id}:`,
              player.parentId,
            );
            parentId = null;
          }
        }
      }

      // Fetch parent data if needed
      if (parents.length === 0 && parentId && token) {
        try {
          if (parentCache.has(parentId)) {
            parents = [{ email: parentCache.get(parentId)!.email }];
          } else {
            const parentData = await fetchParentData(parentId, token);
            if (parentData?.email) {
              parents = [{ email: parentData.email.trim() }].filter((p) => {
                if (!p.email || !p.email.includes('@')) {
                  console.warn(
                    `Invalid or missing email for parent ${parentId} of player ${player._id}`,
                  );
                  return false;
                }
                return true;
              });
              if (parents.length > 0) {
                parentCache.set(parentId, { email: parents[0].email });
              }
            } else {
              console.warn(
                `No valid parent email found for parentId ${parentId} of player ${player._id}`,
              );
            }
          }
        } catch (error) {
          console.error(
            `Error fetching parent data for player ${player._id} with parentId ${parentId}:`,
            error,
          );
        }
      }

      // Use current user's email for non-admin users
      if (parents.length === 0 && parent?.email && parent.role !== 'admin') {
        parents = [{ email: parent.email.trim() }].filter((p) => {
          if (!p.email || !p.email.includes('@')) {
            console.warn(
              `Invalid or missing parent email for non-admin user for player ${player._id}`,
            );
            return false;
          }
          return true;
        });
      }

      if (parents.length === 0) {
        console.warn(`No valid parent emails found for player ${player._id}`);
      }

      return {
        id: player._id,
        key: player._id,
        name: player.fullName || player.name,
        gender: player.gender || 'N/A',
        dob: player.dob || '',
        age: calculateAge(player.dob) || 0,
        section: player.section || player.schoolName || 'No School',
        class: formatGrade(Number(player.grade)) || 'No Grade',
        aauNumber: player.aauNumber || 'No AAU Number',
        healthConcerns: player.healthConcerns || 'No Medical History',
        status,
        DateofJoin: player.createdAt || new Date().toISOString(),
        imgSrc: avatarUrl,
        avatar: player.avatar,
        siblings,
        parents,
        season: player.season,
        registrationYear: player.registrationYear || new Date().getFullYear(),
        parentId: player.parentId,
        paymentInfo: player.paymentInfo
          ? {
              status: player.paymentInfo.status || 'pending',
              lastFour: player.paymentInfo.lastFour,
              cardBrand: player.paymentInfo.cardBrand,
              expDate: player.paymentInfo.expDate,
              amount: player.paymentInfo.amount,
              paymentDate: player.paymentInfo.paymentDate,
              receiptUrl: player.paymentInfo.receiptUrl,
              transactionId: player.paymentInfo.transactionId,
            }
          : undefined,
        seasons,
        paymentStatus: player.paymentStatus,
        registrationComplete: player.registrationComplete,
        paymentComplete: player.paymentComplete,
      };
    }),
  );

  return result;
};

export const filterPlayerData = (
  data: PlayerTableData[],
  filters: PlayerFilterParams,
): PlayerTableData[] => {
  return data.filter((player) => {
    const {
      nameFilter,
      genderFilter,
      gradeFilter,
      ageFilter,
      statusFilter,
      dateRange,
      seasonParam,
      yearParam,
      schoolFilter,
      paymentStatusFilter,
    } = filters;

    // Filter by season from URL params (checks seasons array)
    if (seasonParam && yearParam) {
      const hasMatchingSeason = player.seasons?.some(
        (s) => s.season === seasonParam && s.year === parseInt(yearParam),
      );
      if (!hasMatchingSeason) return false;
    } else if (seasonParam && player.season !== seasonParam) {
      return false;
    } else if (yearParam && player.registrationYear !== parseInt(yearParam)) {
      return false;
    }

    // Text filters
    if (
      nameFilter &&
      !player.name.toLowerCase().includes(nameFilter.toLowerCase())
    )
      return false;

    if (genderFilter && player.gender !== genderFilter) return false;

    if (gradeFilter && player.class !== gradeFilter) return false;

    if (ageFilter && player.age !== ageFilter) return false;

    if (
      statusFilter &&
      player.status?.toLowerCase() !== statusFilter.toLowerCase()
    )
      return false;

    if (
      schoolFilter &&
      !player.section.toLowerCase().includes(schoolFilter.toLowerCase())
    )
      return false;

    if (
      paymentStatusFilter &&
      player.paymentInfo?.status !== paymentStatusFilter
    )
      return false;

    // Date range filter
    if (dateRange) {
      const [start, end] = dateRange;
      const playerDate = moment(new Date(player.DateofJoin));
      if (!playerDate.isBetween(start, end, undefined, '[]')) return false;
    }

    return true;
  });
};

export const sortPlayerData = (
  data: PlayerTableData[],
  sortOrder: PlayerSortOrder,
): PlayerTableData[] => {
  return [...data].sort((a, b) => {
    if (sortOrder === 'asc') return a.name.localeCompare(b.name);
    if (sortOrder === 'desc') return b.name.localeCompare(a.name);

    if (sortOrder === 'recent') {
      const getLatestRegistrationDate = (player: PlayerTableData): Date => {
        if (player.seasons && player.seasons.length > 0) {
          const latestSeason = player.seasons.reduce((latest, season) => {
            const seasonDate = season.registrationDate
              ? new Date(season.registrationDate)
              : new Date(0);
            return seasonDate > latest ? seasonDate : latest;
          }, new Date(0));
          if (latestSeason.getTime() > 0) return latestSeason;
        }
        if (player.updatedAt) return new Date(player.updatedAt);
        if (player.createdAt) return new Date(player.createdAt);
        return new Date(0);
      };
      return (
        getLatestRegistrationDate(b).getTime() -
        getLatestRegistrationDate(a).getTime()
      );
    }

    if (sortOrder === 'recentlyUpdated') {
      return (
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
    }

    if (sortOrder === 'recentlyAdded') {
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    }

    if (sortOrder === 'recentlyViewed') {
      const recentlyViewed = JSON.parse(
        localStorage.getItem('recentlyViewed') || '[]',
      );
      return recentlyViewed.indexOf(b.id) - recentlyViewed.indexOf(a.id);
    }

    return 0;
  });
};
