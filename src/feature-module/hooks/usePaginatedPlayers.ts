// hooks/usePaginatedPlayers.ts
import { useMemo, useRef } from 'react';
import { usePaginatedData } from './usePaginatedData';
import { getPlayerStatus } from '../../utils/season';
import { formatGrade, calculateAge } from '../../utils/playerUtils';

export interface PlayerFilters {
  search?: string;
  gender?: string;
  grade?: string;
  age?: number;
  status?: string;
  school?: string;
  season?: string;
  year?: number;
  sort?: string;
  dateFrom?: string;
  dateTo?: string;
  loadAll?: boolean; // Add this flag
}

export const usePaginatedPlayers = (
  filters: PlayerFilters = {},
  pageSize: number = 10,
) => {
  const renderCount = useRef(0);
  renderCount.current += 1;

  const stableFilters = useMemo(() => {
    console.log(`🔄 [${renderCount.current}] Building stable filters`, filters);
    const clean: Record<string, any> = {};

    if (filters.search?.trim()) clean.search = filters.search.trim();
    if (filters.gender) clean.gender = filters.gender;
    if (filters.grade) clean.grade = filters.grade;
    if (
      filters.age !== undefined &&
      filters.age !== null &&
      !isNaN(filters.age)
    ) {
      clean.age = filters.age;
    }
    if (filters.status) clean.status = filters.status;
    if (filters.school?.trim()) clean.school = filters.school.trim();
    if (filters.season?.trim()) clean.season = filters.season.trim();
    if (filters.year && !isNaN(filters.year)) clean.year = filters.year;
    if (filters.sort) clean.sort = filters.sort;
    if (filters.dateFrom?.trim()) clean.dateFrom = filters.dateFrom.trim();
    if (filters.dateTo?.trim()) clean.dateTo = filters.dateTo.trim();

    // IMPORTANT: Add loadAll to the filters
    if (filters.loadAll) {
      clean.loadAll = 'true'; // Convert to string for URL params
      console.log('📊 loadAll=true added to filters');
    }

    return clean;
  }, [
    filters.search,
    filters.gender,
    filters.grade,
    filters.age,
    filters.status,
    filters.school,
    filters.season,
    filters.year,
    filters.sort,
    filters.dateFrom,
    filters.dateTo,
    filters.loadAll, // Add to dependencies
  ]);

  // Log the pageSize being used
  const effectivePageSize = filters.loadAll ? 0 : pageSize;
  console.log(
    '📊 Effective pageSize:',
    effectivePageSize,
    'loadAll:',
    filters.loadAll,
  );

  const result = usePaginatedData<any>({
    endpoint: '/players/paginated',
    pageSize: effectivePageSize,
    filters: stableFilters,
    onError: (error) => {
      console.error('usePaginatedPlayers error:', error);
    },
  });

  const transformedData = useMemo(() => {
    console.log(
      `🔄 [${renderCount.current}] Transforming player data, count:`,
      result.data.length,
    );

    return result.data.map((player: any) => {
      const age = player.dob ? calculateAge(player.dob) : 0;
      const formattedGrade = player.grade
        ? formatGrade(Number(player.grade))
        : 'No Grade';
      const status = getPlayerStatus(player);

      return {
        id: player._id,
        key: player._id,
        name: player.fullName || player.name || 'Unnamed Player',
        fullName: player.fullName || player.name,
        gender: player.gender || 'N/A',
        dob: player.dob || '',
        age,
        section: player.schoolName || player.section || 'No School',
        schoolName: player.schoolName || player.section,
        class: formattedGrade,
        grade: player.grade,
        aauNumber: player.aauNumber || 'N/A',
        healthConcerns: player.healthConcerns || 'None',
        status,
        registrationStatus: status,
        DateofJoin:
          player.createdAt || player.DateofJoin || new Date().toISOString(),
        createdAt: player.createdAt || player.DateofJoin,
        updatedAt: player.updatedAt,
        imgSrc: player.avatar || player.imgSrc,
        avatar: player.avatar,
        parents: player.parents || [],
        parentId: player.parentId,
        season: player.season,
        registrationYear: player.registrationYear || new Date().getFullYear(),
        paymentInfo: player.paymentInfo,
        seasons: player.seasons || [],
        paymentStatus: player.paymentStatus,
        registrationComplete: player.registrationComplete,
        paymentComplete: player.paymentComplete,
      };
    });
  }, [result.data]);

  return {
    ...result,
    data: transformedData,
  };
};
