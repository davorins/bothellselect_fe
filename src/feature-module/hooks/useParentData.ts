import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { transformParentData } from '../../utils/parentUtils';
import { Guardian } from '../../types/types';

export const useParentData = (
  seasonParam: string | null,
  yearParam: string | null
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
  const [dataVersion, setDataVersion] = useState(0); // Used to force refreshes

  // Memoize current user ID to prevent unnecessary fetches
  const currentUserId = useMemo(() => currentUser?._id || '', [currentUser]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentUser) {
        setError('No user data found.');
        return;
      }

      const queryParams = new URLSearchParams();
      if (seasonParam) queryParams.append('season', seasonParam);
      if (yearParam) queryParams.append('year', yearParam);

      if (currentUser.role === 'admin') {
        // Admin gets all data
        const [parentsData, guardiansData] = await Promise.all([
          fetchAllParents(queryParams.toString()),
          fetchAllGuardians(queryParams.toString()),
        ]);
        setGuardians(guardiansData || []);
      } else {
        // Non-admins only get their own data
        await fetchParentsData(currentUserId);
        setGuardians([]);
      }

      // Increment to trigger effect
      setDataVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [
    currentUser,
    currentUserId,
    seasonParam,
    yearParam,
    fetchAllParents,
    fetchAllGuardians,
    fetchParentsData,
  ]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Transform data only when needed
  const combinedData = useMemo(() => {
    if (!currentUser) return [];
    return transformParentData(parents, guardians, currentUser);
  }, [parents, guardians, currentUser, dataVersion]);

  return {
    loading,
    error,
    combinedData,
    fetchData: () => {
      setDataVersion((v) => v + 1);
      fetchData();
    },
    rawParents: parents,
    rawGuardians: guardians,
  };
};
