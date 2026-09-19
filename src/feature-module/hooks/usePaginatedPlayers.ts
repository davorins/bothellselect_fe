// hooks/usePaginatedPlayers.ts
import { useMemo, useRef } from 'react';
import { usePaginatedData } from './usePaginatedData';
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
  loadAll?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SAME RULE used everywhere else in the app:
//   all seasons paid  → "All Paid"
//   some paid         → "N/M Paid"
//   none paid         → "No Payments"
//   no seasons        → "Inactive"
// ─────────────────────────────────────────────────────────────────────────────
const getPlayerPaymentLabel = (player: any): string => {
  const seasons: any[] = Array.isArray(player?.seasons) ? player.seasons : [];

  if (seasons.length === 0) {
    if (player?.paymentComplete === true || player?.paymentStatus === 'paid') {
      return 'All Paid';
    }
    return 'Inactive';
  }

  const paidCount = seasons.filter(
    (s: any) => s.paymentStatus === 'paid' || s.paymentComplete === true,
  ).length;

  if (paidCount === seasons.length) return 'All Paid';
  if (paidCount > 0) return `${paidCount}/${seasons.length} Paid`;
  return 'No Payments';
};

export const usePaginatedPlayers = (
  filters: PlayerFilters = {},
  pageSize: number = 10,
) => {
  const renderCount = useRef(0);
  renderCount.current += 1;

  const stableFilters = useMemo(() => {
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
    // NOTE: status is intentionally NOT sent to the API.
    // The API doesn't understand our seasons-based labels, so filtering
    // happens client-side after the data loads.
    if (filters.school?.trim()) clean.school = filters.school.trim();
    if (filters.season?.trim()) clean.season = filters.season.trim();
    if (filters.year && !isNaN(filters.year)) clean.year = filters.year;
    if (filters.sort) clean.sort = filters.sort;
    if (filters.dateFrom?.trim()) clean.dateFrom = filters.dateFrom.trim();
    if (filters.dateTo?.trim()) clean.dateTo = filters.dateTo.trim();

    if (filters.loadAll) {
      clean.loadAll = 'true';
    }

    return clean;
  }, [
    filters.search,
    filters.gender,
    filters.grade,
    filters.age,
    filters.school,
    filters.season,
    filters.year,
    filters.sort,
    filters.dateFrom,
    filters.dateTo,
    filters.loadAll,
  ]);

  const effectivePageSize = filters.loadAll ? 0 : pageSize;

  const result = usePaginatedData<any>({
    endpoint: '/players/paginated',
    pageSize: effectivePageSize,
    filters: stableFilters,
    onError: (error) => {
      console.error('usePaginatedPlayers error:', error);
    },
  });

  const transformedData = useMemo(() => {
    return result.data.map((player: any) => {
      const age = player.dob ? calculateAge(player.dob) : 0;
      const formattedGrade = player.grade
        ? formatGrade(Number(player.grade))
        : 'No Grade';
      const status = getPlayerPaymentLabel(player);

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
