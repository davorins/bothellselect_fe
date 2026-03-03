// hooks/usePaginatedParents.ts
import { useMemo, useRef } from 'react';
import { usePaginatedData } from './usePaginatedData';
import { getParentStatus, getPaymentStatus } from '../../utils/parentUtils';

export interface ParentFilters {
  season?: string;
  year?: string;
  name?: string;
  email?: string;
  phone?: string;
  aauNumber?: string;
  status?: string;
  role?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const usePaginatedParents = (
  filters: ParentFilters = {},
  pageSize: number = 10,
) => {
  console.log('🔍 usePaginatedParents input filters:', filters);

  // Store the first page's ratio to keep totals consistent
  const baseRatioRef = useRef<number | null>(null);

  const cleanFilters = useMemo(() => {
    const clean: Record<string, string> = {};

    if (filters.season) clean.season = filters.season;
    if (filters.year) clean.year = filters.year;
    if (filters.name) clean.name = filters.name;
    if (filters.email) clean.email = filters.email;
    if (filters.phone) clean.phone = filters.phone;
    if (filters.aauNumber?.trim()) clean.aauNumber = filters.aauNumber.trim();
    if (filters.status) clean.status = filters.status;
    if (filters.role) clean.role = filters.role;
    if (filters.paymentStatus) clean.paymentStatus = filters.paymentStatus;
    if (filters.dateFrom) clean.dateFrom = filters.dateFrom;
    if (filters.dateTo) clean.dateTo = filters.dateTo;

    console.log('🧹 Clean filters:', clean);
    return clean;
  }, [
    filters.season,
    filters.year,
    filters.name,
    filters.email,
    filters.phone,
    filters.aauNumber,
    filters.status,
    filters.role,
    filters.paymentStatus,
    filters.dateFrom,
    filters.dateTo,
  ]);

  const result = usePaginatedData<any>({
    endpoint: '/parents',
    pageSize,
    filters: cleanFilters,
  });

  console.log('📦 Raw result from usePaginatedData:', {
    dataLength: result.data?.length,
    loading: result.loading,
    error: result.error,
    pagination: result.pagination,
  });

  const transformedData = useMemo(() => {
    console.log(
      '🔄 Transforming parent data, input count:',
      result.data.length,
    );

    if (!result.data || result.data.length === 0) {
      console.log('⚠️ No data to transform');
      return [];
    }

    const allEntries: any[] = [];

    result.data.forEach((parent: any, index: number) => {
      // Create the main parent entry
      const parentEntry = {
        ...parent,
        _id: parent._id,
        id: parent._id,
        fullName: parent.fullName || '',
        email: parent.email || '',
        phone: parent.phone || '',
        status: getParentStatus(parent),
        paymentStatus: getPaymentStatus(parent),
        type: parent.isCoach ? 'coach' : 'parent',
        isCoach: parent.isCoach || false,
        players: parent.players || [],
        address: parent.address || {},
        aauNumber: parent.aauNumber || '',
        avatar: parent.avatar || '',
        imgSrc: parent.avatar || '',
        relationship:
          parent.relationship || (parent.isCoach ? 'Coach' : 'Parent'),
        DateofJoin: parent.createdAt || new Date().toISOString(),
        createdAt: parent.createdAt,
        updatedAt: parent.updatedAt,
        canView: true,
        parentId: null,
      };

      allEntries.push(parentEntry);

      // Add guardians
      if (
        parent.additionalGuardians &&
        Array.isArray(parent.additionalGuardians)
      ) {
        parent.additionalGuardians.forEach((guardian: any, gIndex: number) => {
          const guardianEntry = {
            _id: guardian._id || `${parent._id}_guardian_${gIndex}`,
            id: guardian._id || `${parent._id}_guardian_${gIndex}`,
            parentId: parent._id,
            parentName: parent.fullName,
            parentEmail: parent.email,
            fullName: guardian.fullName || '',
            email: guardian.email || '',
            phone: guardian.phone || '',
            status: getParentStatus({
              ...guardian,
              players: parent.players || [],
            }),
            paymentStatus: getPaymentStatus({
              ...guardian,
              players: parent.players || [],
            }),
            type: 'guardian',
            isCoach: guardian.isCoach || false,
            players: parent.players || [],
            address: guardian.address || parent.address || {},
            aauNumber: guardian.aauNumber || '',
            avatar: guardian.avatar || '',
            imgSrc: guardian.avatar || '',
            relationship: guardian.relationship || 'Guardian',
            DateofJoin:
              guardian.createdAt ||
              parent.createdAt ||
              new Date().toISOString(),
            createdAt: guardian.createdAt || parent.createdAt,
            updatedAt: guardian.updatedAt || parent.updatedAt,
            canView: true,
          };

          allEntries.push(guardianEntry);
        });
      }
    });

    console.log('📊 Final transformed data:', {
      total: allEntries.length,
      parents: allEntries.filter(
        (e) => e.type === 'parent' || e.type === 'coach',
      ).length,
      guardians: allEntries.filter((e) => e.type === 'guardian').length,
    });

    return allEntries;
  }, [result.data]);

  // Calculate guardian ratio from current page and store the first page's ratio
  const guardianRatio = useMemo(() => {
    if (result.data.length === 0) return 1;
    const parentCount = result.data.length;
    const totalWithGuardians = transformedData.length;
    const currentRatio = totalWithGuardians / parentCount;

    // Store the ratio from page 1 as the base
    if (result.pagination.page === 1 && !baseRatioRef.current) {
      baseRatioRef.current = currentRatio;
      console.log('📊 Setting base guardian ratio:', currentRatio);
    }

    return currentRatio;
  }, [result.data.length, transformedData.length, result.pagination.page]);

  // Create enhanced pagination with consistent totals
  const enhancedPagination = useMemo(() => {
    const originalTotal = result.pagination.total || 0;

    // Use the base ratio from page 1 if available, otherwise use current ratio
    const ratioToUse = baseRatioRef.current || guardianRatio;

    // Calculate consistent total including guardians
    const consistentTotalWithGuardians = Math.round(originalTotal * ratioToUse);

    // Calculate pages based on the ORIGINAL pageSize (parents per page)
    const estimatedPages = Math.ceil(consistentTotalWithGuardians / pageSize);

    console.log('📊 Pagination calculation:', {
      originalTotal,
      ratioToUse,
      consistentTotalWithGuardians,
      estimatedPages,
      currentPage: result.pagination.page,
    });

    return {
      ...result.pagination,
      total: consistentTotalWithGuardians,
      pages: estimatedPages,
      parentTotal: originalTotal,
    };
  }, [result.pagination, guardianRatio, pageSize]);

  return {
    ...result,
    data: transformedData,
    pagination: enhancedPagination,
  };
};
