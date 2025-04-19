import moment, { Moment } from 'moment';
import { Player, Parent, Guardian, TableRecord } from '../types/types';

interface ExtendedTableRecord extends TableRecord {
  type: 'parent' | 'guardian' | 'coach';
  status: string;
  DateofJoin: string;
  imgSrc: string;
  canView: boolean;
  parentId?: string;
  aauNumber?: string;
  createdAt: string;
  players?: Player[];
  isCoach?: boolean;
}

export const transformParentData = (
  parents: Parent[],
  guardians: Guardian[],
  currentUser: Parent | null
): ExtendedTableRecord[] => {
  if (!currentUser) return [];

  const getSafeDate = (date: string | undefined): string => {
    return date || new Date().toISOString();
  };

  // For non-admin/coach users, only show their own data
  if (currentUser.role === 'user') {
    return [
      {
        _id: currentUser._id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        phone: currentUser.phone,
        address: currentUser.address,
        role: currentUser.role,
        type: 'parent', // Explicit type
        status: 'Active',
        DateofJoin: getSafeDate(currentUser.createdAt),
        imgSrc: currentUser.avatar || 'assets/img/profiles/avatar-27.jpg',
        aauNumber: currentUser.aauNumber || 'N/A',
        canView: true,
        createdAt: getSafeDate(currentUser.createdAt),
        players: currentUser.players || [],
        isCoach: currentUser.isCoach,
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
      type: parent.isCoach ? 'coach' : 'parent', // Explicit type
      status: 'Active',
      DateofJoin: getSafeDate(parent.createdAt),
      imgSrc: parent.avatar || 'assets/img/profiles/avatar-27.jpg',
      aauNumber: parent.aauNumber || 'N/A',
      canView: true,
      createdAt: getSafeDate(parent.createdAt),
      players: parent.players || [],
      isCoach: parent.isCoach,
    };
  });

  const guardianRecords: ExtendedTableRecord[] = (guardians || [])
    .filter(
      (guardian) => !processedParentIds.has(guardian._id || guardian.id || '')
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
        type: 'guardian', // Explicit type
        status: 'Active',
        DateofJoin: getSafeDate(guardian.createdAt as string | undefined),
        imgSrc: 'assets/img/profiles/avatar-27.jpg',
        aauNumber: guardian.aauNumber || 'N/A',
        canView: true,
        createdAt: getSafeDate(guardian.createdAt as string | undefined),
        players: guardian.players || [],
        isCoach: guardian.isCoach,
      };

      // Handle additional guardians from parent objects
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
          type: 'guardian', // Explicit type
          status: 'Active',
          DateofJoin: getSafeDate(g.createdAt as string | undefined),
          imgSrc: 'assets/img/profiles/avatar-27.jpg',
          aauNumber: g.aauNumber || 'N/A',
          parentId: guardianId,
          canView: true,
          createdAt: getSafeDate(g.createdAt as string | undefined),
          players: g.players || [],
          isCoach: g.isCoach,
        }));

      return [mainGuardian, ...additionalGuardians];
    });

  return [...parentRecords, ...guardianRecords];
};

export const filterParentData = (
  data: ExtendedTableRecord[],
  filters: {
    nameFilter: string;
    emailFilter: string;
    phoneFilter: string;
    statusFilter: string | null;
    roleFilter: string | null;
    dateRange: [Moment, Moment] | null;
  },
  currentUserRole: string
): ExtendedTableRecord[] => {
  const seenIds = new Set<string>();

  return data.filter((item) => {
    // Create a unique key for this record
    const recordKey = `${item._id}-${item.type}`;

    // Skip if we've already seen this record
    if (seenIds.has(recordKey)) {
      return false;
    }
    seenIds.add(recordKey);

    // Apply role-based filtering first
    if (currentUserRole === 'user' && !item.canView) {
      return false;
    }

    // Name filter
    if (
      filters.nameFilter &&
      !item.fullName.toLowerCase().includes(filters.nameFilter.toLowerCase())
    ) {
      return false;
    }

    // Email filter
    if (
      filters.emailFilter &&
      !(
        item.email?.toLowerCase().includes(filters.emailFilter.toLowerCase()) ??
        true
      )
    ) {
      return false;
    }

    // Phone filter
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

    // Status filter
    if (filters.statusFilter && item.status !== filters.statusFilter) {
      return false;
    }

    // Role filter (updated to handle coaches)
    if (filters.roleFilter) {
      if (filters.roleFilter === 'parent' && item.type !== 'parent') {
        return false;
      }
      if (filters.roleFilter === 'guardian' && item.type !== 'guardian') {
        return false;
      }
      if (filters.roleFilter === 'coach') {
        // Check both role and isCoach fields
        if (item.role !== 'coach' && !item.isCoach) {
          return false;
        }
      } else if (
        filters.roleFilter !== 'parent' &&
        filters.roleFilter !== 'guardian' &&
        item.role !== filters.roleFilter
      ) {
        return false;
      }
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

// Sort function remains the same
export const sortParentData = (
  data: ExtendedTableRecord[],
  sortOrder: 'asc' | 'desc' | 'recentlyViewed' | 'recentlyAdded' | null
): ExtendedTableRecord[] => {
  if (!sortOrder) return data;

  return [...data].sort((a, b) => {
    if (sortOrder === 'asc') return a.fullName.localeCompare(b.fullName);
    if (sortOrder === 'desc') return b.fullName.localeCompare(a.fullName);
    if (sortOrder === 'recentlyAdded') {
      return (
        new Date(b.DateofJoin).getTime() - new Date(a.DateofJoin).getTime()
      );
    }
    if (sortOrder === 'recentlyViewed') {
      const recentlyViewed = JSON.parse(
        localStorage.getItem('recentlyViewed') || '[]'
      );
      return recentlyViewed.indexOf(b._id) - recentlyViewed.indexOf(a._id);
    }
    return 0;
  });
};
