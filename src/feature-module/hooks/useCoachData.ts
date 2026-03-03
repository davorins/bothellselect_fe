// hooks/useCoachData.ts
import { useMemo } from 'react';
import { usePaginatedData } from './usePaginatedData';
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

export const useCoachData = (
  filters: CoachFilters = {},
  pageSize: number = 10,
) => {
  console.log('🔍 useCoachData filters:', filters);

  // Clean filters - remove undefined/null values
  const cleanFilters = useMemo(() => {
    const clean: Record<string, string> = {};

    if (filters.search?.trim()) clean.search = filters.search.trim();
    if (filters.name?.trim()) clean.name = filters.name.trim();
    if (filters.email?.trim()) clean.email = filters.email.trim();
    if (filters.phone?.trim()) {
      clean.phone = filters.phone.replace(/\D/g, '');
    }
    if (filters.status) clean.status = filters.status;
    if (filters.aauNumber?.trim()) clean.aauNumber = filters.aauNumber.trim();
    if (filters.dateFrom) clean.dateFrom = filters.dateFrom;
    if (filters.dateTo) clean.dateTo = filters.dateTo;
    if (filters.sort) clean.sort = filters.sort;

    // Always filter for coaches
    clean.role = 'coach';

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
    endpoint: '/parents', // Use the existing parents endpoint
    pageSize,
    filters: cleanFilters,
    onError: (error) => {
      console.error('useCoachData error:', error);
    },
  });

  // Transform coach data
  const transformedData = useMemo(() => {
    console.log('🔄 Transforming coach data, count:', result.data.length);

    return result.data
      .filter((item: any) => item.isCoach === true) // Additional filter to ensure only coaches
      .map((coach: any): ExtendedCoachRecord => {
        // Log the raw coach data to see what's coming from backend
        console.log('📋 Raw coach data:', {
          id: coach._id,
          name: coach.fullName,
          backendStatus: coach.status,
          isCoach: coach.isCoach,
        });

        // COACHES ARE ALWAYS ACTIVE - Force this regardless of backend data
        // This overrides any status that might come from the backend
        const status = 'Active';

        return {
          _id: coach._id,
          fullName: coach.fullName || coach.name || 'Unknown Coach',
          email: coach.email || '',
          phone: coach.phone || '',
          address: coach.address || {},
          type: 'coach',
          status: status, // Force "Active"
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

  // Log the final transformed data to verify status
  console.log(
    '✅ Transformed coach data:',
    transformedData.map((c) => ({
      name: c.fullName,
      status: c.status,
    })),
  );

  return {
    ...result,
    data: transformedData,
    coachData: transformedData,
  };
};
