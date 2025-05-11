import {
  PlayerTableData,
  PlayerFilterParams,
  Player,
} from '../types/playerTypes';
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

// Add this new function for converting PlayerTableData to Player
export const convertToPlayer = (playerData: PlayerTableData): Player => {
  // First convert the siblings recursively
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
      // For siblings of siblings, we can leave them empty or convert them if needed
      siblings: [],
      guardians: sibling.guardians || [],
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
    guardians: playerData.guardians || [],
    season: playerData.season,
    registrationYear: playerData.registrationYear,
  };
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

    const avatarUrl =
      player.imgSrc || player.avatar || getDefaultAvatar(player.gender);
    const timestamp = Date.now();

    const status =
      player.registrationComplete && player.paymentComplete
        ? 'Active'
        : 'Inactive';

    const siblings = players
      .filter((sib) => siblingIds.includes(sib._id) && sib._id !== player._id)
      .map((sib) => ({
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
        status:
          sib.registrationComplete && sib.paymentComplete
            ? 'Active'
            : 'Inactive',
        DateofJoin: sib.createdAt,
        imgSrc: sib.imgSrc || sib.avatar || getDefaultAvatar(sib.gender),
        siblings: [],
        season: sib.season,
        registrationYear: sib.registrationYear,
        guardians: sib.guardians || [],
      }));

    return {
      id: player._id,
      key: player._id,
      name: player.fullName || player.name,
      gender: player.gender,
      dob: player.dob,
      age: calculateAge(player.dob),
      section: player.section || player.schoolName || 'No School',
      class: formatGrade(Number(player.grade)) || 'No Grade',
      aauNumber: player.aauNumber || 'No AAU Number',
      healthConcerns: player.healthConcerns || 'No Medical History',
      status, // Use the calculated status here
      DateofJoin: player.createdAt,
      imgSrc: avatarUrl.includes('res.cloudinary.com')
        ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}ts=${timestamp}`
        : avatarUrl,
      avatar: player.avatar,
      siblings,
      season: player.season,
      registrationYear: player.registrationYear,
      guardians: player.guardians || [],
      registrationComplete: player.registrationComplete,
      paymentComplete: player.paymentComplete,
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
      schoolFilter,
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
    if (
      statusFilter &&
      player.status?.toLowerCase() !== statusFilter.toLowerCase()
    ) {
      return false;
    }

    // School filter
    if (
      schoolFilter &&
      !player.section.toLowerCase().includes(schoolFilter.toLowerCase())
    ) {
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
