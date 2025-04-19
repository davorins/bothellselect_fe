import moment, { Moment } from 'moment';
import { Player, Coach, Guardian, TableRecord, Address } from '../types/types';

export interface ExtendedCoachRecord extends TableRecord {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string | Address;
  type: 'coach' | 'guardian';
  status: string;
  DateofJoin: string;
  imgSrc: string;
  canView: boolean;
  coachId?: string;
  aauNumber: string;
  createdAt: string;
  players?: Player[];
  isCoach: boolean;
  role: string;
  avatar?: string;
}

interface CoachFilters {
  nameFilter: string;
  emailFilter: string;
  phoneFilter: string;
  statusFilter: string | null;
  aauNumberFilter: string;
  dateRange: [Moment, Moment] | null;
}

export type CoachSortOrder =
  | 'asc'
  | 'desc'
  | 'recentlyViewed'
  | 'recentlyAdded'
  | 'aauNumber'
  | null;

const getSafeDate = (date?: string): string => date || new Date().toISOString();

// Enhanced Guardian type with optional createdAt and additionalGuardians
interface EnhancedGuardian extends Omit<Guardian, 'players'> {
  createdAt?: string;
  additionalGuardians?: Array<
    Omit<Guardian, 'additionalGuardians'> & { createdAt?: string }
  >;
  players?: Player[];
}

export const transformCoachData = (
  coaches: Coach[],
  guardians: EnhancedGuardian[] = [],
  currentUser: Coach | null
): ExtendedCoachRecord[] => {
  if (!currentUser) return [];

  // For non-admin users, only show their own data
  if (currentUser.role === 'user' && !currentUser.isCoach) {
    return currentUser.isCoach ? [createExtendedCoachRecord(currentUser)] : [];
  }

  const coachRecords = coaches.map(createExtendedCoachRecord);
  const coachGuardianRecords = guardians.flatMap(transformGuardianToRecord);

  return [...coachRecords, ...coachGuardianRecords];
};

const createExtendedCoachRecord = (coach: Coach): ExtendedCoachRecord => ({
  ...coach,
  _id: coach._id,
  fullName: coach.fullName,
  email: coach.email,
  phone: coach.phone,
  address: coach.address,
  role: coach.role || 'coach',
  isCoach: true,
  type: 'coach',
  status: coach.status || 'Active',
  DateofJoin: getSafeDate(coach.createdAt),
  imgSrc: coach.avatar || 'assets/img/profiles/coach-avatar.jpg',
  aauNumber: coach.aauNumber || 'N/A',
  canView: true,
  createdAt: getSafeDate(coach.createdAt),
  players: coach.players || [],
});

const transformGuardianToRecord = (
  guardian: EnhancedGuardian
): ExtendedCoachRecord[] => {
  const baseGuardianRecord = {
    _id: guardian._id || '',
    fullName: guardian.fullName,
    email: guardian.email,
    phone: guardian.phone,
    address: guardian.address,
    role: 'guardian',
    isCoach: guardian.isCoach || false,
    type: 'guardian' as const,
    status: 'Active',
    DateofJoin: getSafeDate(guardian.createdAt),
    imgSrc: 'assets/img/profiles/avatar-27.jpg',
    aauNumber: guardian.aauNumber || 'N/A',
    canView: true,
    createdAt: getSafeDate(guardian.createdAt),
    players: guardian.players || [],
  };

  const mainGuardian: ExtendedCoachRecord = {
    ...baseGuardianRecord,
  };

  const additionalGuardians = (guardian.additionalGuardians || []).map(
    (g, index) => ({
      ...baseGuardianRecord,
      ...g,
      _id: g._id || `${guardian._id}-${index}`,
      coachId: guardian._id,
    })
  );

  return [mainGuardian, ...additionalGuardians];
};

export const filterCoachData = (
  data: ExtendedCoachRecord[],
  filters: CoachFilters,
  currentUserRole: string
): ExtendedCoachRecord[] => {
  return data.filter((item) => {
    // Role-based filtering
    if (currentUserRole === 'user' && !item.canView) return false;
    if (item.type !== 'guardian' && !item.isCoach) return false;

    // Text filters
    if (
      filters.nameFilter &&
      !item.fullName.toLowerCase().includes(filters.nameFilter.toLowerCase())
    ) {
      return false;
    }

    if (
      filters.emailFilter &&
      !(
        item.email?.toLowerCase().includes(filters.emailFilter.toLowerCase()) ??
        true
      )
    ) {
      return false;
    }

    if (
      filters.phoneFilter &&
      !(
        item.phone
          ?.replace(/\D/g, '')
          .includes(filters.phoneFilter.replace(/\D/g, '')) ?? true
      )
    ) {
      return false;
    }

    if (filters.statusFilter && item.status !== filters.statusFilter) {
      return false;
    }

    if (
      filters.aauNumberFilter &&
      !(
        item.aauNumber
          ?.toLowerCase()
          .includes(filters.aauNumberFilter.toLowerCase()) ?? true
      )
    ) {
      return false;
    }

    // Date range filter
    if (filters.dateRange) {
      const [start, end] = filters.dateRange;
      const itemDate = moment(item.DateofJoin);
      if (!itemDate.isBetween(start, end, undefined, '[]')) {
        return false;
      }
    }

    return true;
  });
};

export const sortCoachData = (
  data: ExtendedCoachRecord[],
  sortOrder: CoachSortOrder
): ExtendedCoachRecord[] => {
  if (!sortOrder) return [...data];

  return [...data].sort((a, b) => {
    switch (sortOrder) {
      case 'asc':
        return a.fullName.localeCompare(b.fullName);
      case 'desc':
        return b.fullName.localeCompare(a.fullName);
      case 'recentlyAdded':
        return (
          new Date(b.DateofJoin).getTime() - new Date(a.DateofJoin).getTime()
        );
      case 'recentlyViewed':
        const recentlyViewed = JSON.parse(
          localStorage.getItem('recentlyViewed') || '[]'
        );
        return recentlyViewed.indexOf(b._id) - recentlyViewed.indexOf(a._id);
      case 'aauNumber':
        return (a.aauNumber || '').localeCompare(b.aauNumber || '');
      default:
        return 0;
    }
  });
};
