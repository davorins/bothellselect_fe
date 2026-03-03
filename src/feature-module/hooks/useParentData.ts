// hooks/useParentData.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { transformParentData } from '../../utils/parentUtils';
import { Guardian, Parent } from '../../types/types';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Define response types
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

type ParentsResponse = Parent[] | PaginatedResponse<Parent>;
type GuardiansResponse = Guardian[] | PaginatedResponse<Guardian>;

export const useParentData = (
  seasonParam: string | null,
  yearParam: string | null,
) => {
  const {
    parents = [],
    fetchParentsData,
    parent: currentUser,
    fetchAllParents,
    fetchAllGuardians,
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [allParents, setAllParents] = useState<Parent[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    pages: 0,
    currentPage: 1,
    limit: 10,
  });

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      try {
        setLoading(true);
        setError(null);
        console.log(
          '📡 [useParentData] fetchData called',
          forceRefresh ? '(force refresh)' : '',
        );

        if (!currentUser) {
          setError('No user data found.');
          return;
        }

        const queryParams = new URLSearchParams();
        if (seasonParam) queryParams.append('season', seasonParam);
        if (yearParam) queryParams.append('year', yearParam);

        // Add cache-busting timestamp for force refresh
        if (forceRefresh) {
          queryParams.append('_t', Date.now().toString());
          console.log('🔧 Added cache-busting timestamp:', Date.now());
        }

        // Cache for 5 minutes (300000 ms) - but bypass if forceRefresh is true
        const shouldFetch = forceRefresh || Date.now() - lastFetchTime > 300000;

        console.log('📊 Cache check:', {
          forceRefresh,
          timeSinceLastFetch: Date.now() - lastFetchTime,
          shouldFetch,
        });

        if (currentUser.role === 'admin') {
          if (shouldFetch) {
            console.log('📡 Fetching fresh data from API...');

            // Fetch parents and guardians separately
            const parentsResult = await fetchAllParents(queryParams.toString());
            const guardiansResult = await fetchAllGuardians(
              queryParams.toString(),
            );

            console.log(
              '📥 Parents API response:',
              JSON.stringify(parentsResult, null, 2).substring(0, 500),
            );
            console.log(
              '📥 Guardians API response:',
              JSON.stringify(guardiansResult, null, 2).substring(0, 500),
            );

            // Extract parents data - handle both array and paginated responses
            let parentsArray: Parent[] = [];
            let pages = 0;
            let total = 0;
            let currentPage = 1;
            let limit = 10;

            if (Array.isArray(parentsResult)) {
              // Old format: direct array
              parentsArray = parentsResult;
              pages = 1;
              total = parentsResult.length;
              console.log(
                '📦 Parents response is array (old format):',
                parentsArray.length,
              );

              // Log counts of different types
              const coachCount = parentsArray.filter((p) => p.isCoach).length;
              const parentCount = parentsArray.filter((p) => !p.isCoach).length;
              console.log(
                `📊 Parents breakdown: ${parentCount} parents, ${coachCount} coaches`,
              );
            } else if (parentsResult && typeof parentsResult === 'object') {
              // Check for paginated format - use type assertion
              const paginatedResponse =
                parentsResult as PaginatedResponse<Parent>;

              if (
                paginatedResponse.data &&
                Array.isArray(paginatedResponse.data)
              ) {
                parentsArray = paginatedResponse.data;
                console.log(
                  '📦 Parents response is paginated:',
                  parentsArray.length,
                );

                // Log the first few parents to see structure
                if (parentsArray.length > 0) {
                  console.log('📋 First parent sample:', {
                    _id: parentsArray[0]._id,
                    fullName: parentsArray[0].fullName,
                    isCoach: parentsArray[0].isCoach,
                    role: parentsArray[0].role,
                    email: parentsArray[0].email,
                  });
                }

                // Log counts of different types
                const coachCount = parentsArray.filter((p) => p.isCoach).length;
                const parentCount = parentsArray.filter(
                  (p) => !p.isCoach,
                ).length;
                console.log(
                  `📊 Parents breakdown: ${parentCount} parents, ${coachCount} coaches`,
                );

                // Extract pagination info if available
                if (paginatedResponse.pagination) {
                  pages = paginatedResponse.pagination.pages;
                  total = paginatedResponse.pagination.total;
                  currentPage = paginatedResponse.pagination.page;
                  limit = paginatedResponse.pagination.limit;
                  console.log(
                    `📊 Pagination: page ${currentPage} of ${pages}, total ${total} items`,
                  );
                }
              } else {
                console.warn(
                  'Unexpected parents response format:',
                  parentsResult,
                );
              }
            }

            // Extract guardians data - handle both array and paginated responses
            let guardiansArray: Guardian[] = [];

            if (Array.isArray(guardiansResult)) {
              guardiansArray = guardiansResult;
              console.log(
                '📦 Guardians response is array (old format):',
                guardiansArray.length,
              );
            } else if (guardiansResult && typeof guardiansResult === 'object') {
              // Check for paginated format - use type assertion
              const paginatedResponse =
                guardiansResult as PaginatedResponse<Guardian>;

              if (
                paginatedResponse.data &&
                Array.isArray(paginatedResponse.data)
              ) {
                guardiansArray = paginatedResponse.data;
                console.log(
                  '📦 Guardians response is paginated:',
                  guardiansArray.length,
                );

                // Log the first guardian
                if (guardiansArray.length > 0) {
                  console.log('📋 First guardian sample:', {
                    _id: guardiansArray[0]._id,
                    fullName: guardiansArray[0].fullName,
                    email: guardiansArray[0].email,
                    parentId: guardiansArray[0].parentId,
                  });
                }
              } else {
                console.warn(
                  'Unexpected guardians response format:',
                  guardiansResult,
                );
              }
            }

            console.log('✅ Parents extracted:', parentsArray.length);
            console.log('✅ Guardians extracted:', guardiansArray.length);

            // Fetch players for each parent (only for the current page)
            if (parentsArray.length > 0) {
              console.log('📡 Fetching players for each parent...');
              const parentsWithPlayers = await Promise.all(
                parentsArray.map(async (parent: Parent) => {
                  try {
                    const token = localStorage.getItem('token');
                    const playersResponse = await axios.get(
                      `${API_BASE_URL}/players/by-parent/${parent._id}`,
                      { headers: { Authorization: `Bearer ${token}` } },
                    );
                    return {
                      ...parent,
                      players: playersResponse.data || [],
                    };
                  } catch (error) {
                    console.error(
                      `Error fetching players for parent ${parent._id}:`,
                      error,
                    );
                    return {
                      ...parent,
                      players: [],
                    };
                  }
                }),
              );

              setAllParents(parentsWithPlayers);
              console.log(
                '✅ Parents with players:',
                parentsWithPlayers.length,
              );
            } else {
              setAllParents([]);
            }

            setGuardians(guardiansArray);
            setPaginationInfo({
              total,
              pages,
              currentPage,
              limit,
            });
            setLastFetchTime(Date.now());
            console.log('✅ Data updated in state');
            console.log('📊 Final state:', {
              parentsCount: parentsArray.length,
              guardiansCount: guardiansArray.length,
              pagination: { total, pages, currentPage, limit },
            });
          } else {
            console.log('📦 Using cached data (within 5-minute cache window)');
          }
        } else {
          await fetchParentsData(currentUser._id);
          setGuardians([]);
        }
      } catch (err) {
        console.error('❌ Error in fetchData:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    },
    [
      currentUser,
      seasonParam,
      yearParam,
      fetchAllParents,
      fetchAllGuardians,
      fetchParentsData,
      lastFetchTime,
    ],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Dedicated refresh function that forces cache bypass
  const refresh = useCallback(async () => {
    console.log('🔄 [useParentData] refresh called - forcing cache bypass');
    await fetchData(true);
  }, [fetchData]);

  const combinedData = useMemo(() => {
    console.log('🔍 Recalculating combinedData');
    console.log('📊 Current state before transform:', {
      allParentsCount: allParents.length,
      parentsCount: parents.length,
      guardiansCount: guardians.length,
      isAdmin: currentUser?.role === 'admin',
    });

    if (!currentUser) return [];
    // Use allParents for admin, parents for regular users
    const parentsToUse = currentUser.role === 'admin' ? allParents : parents;

    console.log('📤 Passing to transformParentData:', {
      parentsToUseCount: parentsToUse.length,
      guardiansCount: guardians.length,
    });

    const result = transformParentData(parentsToUse, guardians, currentUser);
    console.log('📥 transformParentData result count:', result.length);

    // Log the types in the result
    const typeBreakdown = result.reduce(
      (acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log('📊 Result breakdown by type:', typeBreakdown);

    return result;
  }, [allParents, parents, guardians, currentUser]);

  return {
    loading,
    error,
    combinedData,
    refresh,
    rawParents: currentUser?.role === 'admin' ? allParents : parents,
    rawGuardians: guardians,
    pagination: paginationInfo,
  };
};
