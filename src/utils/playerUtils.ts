import { PlayerTableData, PlayerFilterParams } from '../types/playerTypes';
import moment from 'moment';

type PlayerSortOrder =
  | 'asc'
  | 'desc'
  | 'recentlyViewed'
  | 'recentlyAdded'
  | null;

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

export const transformPlayerData = (
  players: any[],
  parent: any
): PlayerTableData[] => {
  const siblingIds = parent?.players
    ? parent.players.map((p: any) => (typeof p === 'string' ? p : p._id))
    : [];

  return players.map((player) => {
    const getDefaultAvatar = (gender: string | undefined): string => {
      return gender?.toLowerCase() === 'female'
        ? 'https://bothell-select.onrender.com/uploads/avatars/girl.png'
        : 'https://bothell-select.onrender.com/uploads/avatars/boy.png';
    };

    // Use imgSrc if provided by backend, otherwise fall back to avatar or default
    const avatarUrl =
      player.imgSrc || player.avatar || getDefaultAvatar(player.gender);
    const timestamp = Date.now();

    const siblings = players
      .filter((sib) => siblingIds.includes(sib._id) && sib._id !== player._id)
      .map((sib) => ({
        id: sib._id,
        key: sib._id,
        name: sib.fullName,
        gender: sib.gender,
        dob: sib.dob,
        age: calculateAge(sib.dob),
        section: sib.schoolName || 'No School',
        class: formatGrade(Number(sib.grade)) || 'No Grade',
        aauNumber: sib.aauNumber || 'No AAU Number',
        healthConcerns: sib.healthConcerns || 'No Medical History',
        status: 'Active',
        DateofJoin: sib.createdAt,
        imgSrc: sib.imgSrc || sib.avatar || getDefaultAvatar(sib.gender),
        siblings: [],
        season: sib.season,
        registrationYear: sib.registrationYear,
      }));

    return {
      id: player._id,
      key: player._id,
      name: player.fullName,
      gender: player.gender,
      dob: player.dob,
      age: calculateAge(player.dob),
      section: player.section || player.schoolName || 'No School',
      class: formatGrade(Number(player.grade)) || 'No Grade',
      aauNumber: player.aauNumber || 'No AAU Number',
      healthConcerns: player.healthConcerns || 'No Medical History',
      status: 'Active',
      DateofJoin: player.createdAt,
      // Use the avatar URL with cache busting if it's a Cloudinary URL
      imgSrc: avatarUrl.includes('res.cloudinary.com')
        ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}ts=${timestamp}`
        : avatarUrl,
      avatar: player.avatar, // Keep original avatar URL
      siblings,
      season: player.season,
      registrationYear: player.registrationYear,
    };
  });
};

// Rest of the file remains unchanged
export const filterPlayerData = (
  data: PlayerTableData[],
  filters: PlayerFilterParams
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
    } = filters;

    // Season filter
    if (seasonParam && player.season !== seasonParam) {
      return false;
    }

    // Year filter
    if (yearParam && player.registrationYear !== parseInt(yearParam)) {
      return false;
    }

    // Name filter
    if (
      nameFilter &&
      !player.name.toLowerCase().includes(nameFilter.toLowerCase())
    ) {
      return false;
    }

    // Gender filter
    if (genderFilter && player.gender !== genderFilter) {
      return false;
    }

    // Grade filter
    if (gradeFilter && player.class !== gradeFilter) {
      return false;
    }

    // Age filter
    if (ageFilter && player.age !== ageFilter) {
      return false;
    }

    // Status filter
    if (statusFilter && player.status !== statusFilter) {
      return false;
    }

    // Date range filter
    if (dateRange) {
      const [start, end] = dateRange;
      const playerDate = moment(new Date(player.DateofJoin));
      if (!playerDate.isBetween(start, end, undefined, '[]')) {
        return false;
      }
    }

    return true;
  });
};

export const sortPlayerData = (
  data: PlayerTableData[],
  sortOrder: PlayerSortOrder
): PlayerTableData[] => {
  return [...data].sort((a, b) => {
    if (sortOrder === 'asc') return a.name.localeCompare(b.name);
    if (sortOrder === 'desc') return b.name.localeCompare(a.name);
    if (sortOrder === 'recentlyAdded') {
      return (
        new Date(b.DateofJoin).getTime() - new Date(a.DateofJoin).getTime()
      );
    }
    if (sortOrder === 'recentlyViewed') {
      const recentlyViewed = JSON.parse(
        localStorage.getItem('recentlyViewed') || '[]'
      );
      return recentlyViewed.indexOf(b.id) - recentlyViewed.indexOf(a.id);
    }
    return 0;
  });
};
