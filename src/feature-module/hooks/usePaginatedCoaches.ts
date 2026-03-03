// hooks/usePaginatedCoaches.ts
import { useMemo } from 'react';
import { usePaginatedData } from './usePaginatedData';
import { Coach } from '../../types/coachTypes';
import { ExtendedCoachRecord } from '../../utils/coachUtils';

export interface CoachFilters {
  search?: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  aauNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
}

export const usePaginatedCoaches = (
  filters: CoachFilters = {},
  pageSize: number = 10,
) => {
  console.log('🔍 usePaginatedCoaches filters:', filters);

  // Clean filters - remove undefined/null values and create a stable object
  const cleanFilters = useMemo(() => {
    const clean: Record<string, string> = {};

    // Only add defined values
    if (filters.search && filters.search.trim() !== '') {
      clean.search = filters.search.trim();
    }
    if (filters.name && filters.name.trim() !== '') {
      clean.name = filters.name.trim();
    }
    if (filters.email && filters.email.trim() !== '') {
      clean.email = filters.email.trim();
    }
    if (filters.phone && filters.phone.trim() !== '') {
      // Remove non-digits for phone search
      clean.phone = filters.phone.replace(/\D/g, '');
    }
    if (
      filters.status &&
      filters.status !== 'null' &&
      filters.status !== 'undefined'
    ) {
      clean.status = filters.status;
    }
    if (filters.aauNumber && filters.aauNumber.trim() !== '') {
      clean.aauNumber = filters.aauNumber.trim();
    }
    if (filters.dateFrom) {
      clean.dateFrom = filters.dateFrom;
    }
    if (filters.dateTo) {
      clean.dateTo = filters.dateTo;
    }
    if (
      filters.sort &&
      filters.sort !== 'null' &&
      filters.sort !== 'undefined'
    ) {
      clean.sort = filters.sort;
    }

    return clean;
  }, [
    filters.search,
    filters.name,
    filters.email,
    filters.phone,
    filters.status,
    filters.aauNumber,
    filters.dateFrom,
    filters.dateTo,
    filters.sort,
  ]);

  const result = usePaginatedData<any>({
    endpoint: '/coaches/paginated', // You'll need to create this endpoint on your backend
    pageSize,
    filters: cleanFilters,
    onError: (error) => {
      console.error('usePaginatedCoaches error:', error);
    },
  });

  // Transform raw coach data to match ExtendedCoachRecord interface
  const transformedData = useMemo(() => {
    console.log('🔄 Transforming coach data, count:', result.data.length);

    return result.data.map((coach: any): ExtendedCoachRecord => {
      // Calculate coach status (active/inactive based on current season players)
      const hasActivePlayers = coach.players?.some((p: any) => {
        if (p.seasons && Array.isArray(p.seasons)) {
          const currentYear = new Date().getFullYear();
          return p.seasons.some((s: any) => s.year === currentYear);
        }
        return false;
      });

      const status = hasActivePlayers ? 'Active' : coach.status || 'Inactive';

      return {
        _id: coach._id,
        fullName: coach.fullName || coach.name || 'Unknown Coach',
        email: coach.email || '',
        phone: coach.phone || '',
        address: coach.address || {},
        type: 'coach',
        status: status,
        aauNumber: coach.aauNumber || 'N/A',
        role: coach.role || 'coach',
        players: coach.players || [],
        isCoach: true,
        canView: true,
        DateofJoin:
          coach.createdAt || coach.DateofJoin || new Date().toISOString(),
        createdAt: coach.createdAt || coach.DateofJoin,
        updatedAt: coach.updatedAt,
        imgSrc: coach.avatar || coach.imgSrc || '',
        avatar: coach.avatar || '',
        coachId: coach._id,
        parentId: coach.parentId,
      };
    });
  }, [result.data]);

  return {
    ...result,
    data: transformedData,
  };
};
