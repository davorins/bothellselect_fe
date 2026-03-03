// hooks/usePlayerData.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { transformPlayerData } from '../../utils/playerUtils';
import { PlayerTableData } from '../../types/playerTypes';

interface UsePlayerDataReturn {
  loading: boolean;
  error: string | null;
  playerData: PlayerTableData[];
  priorityData: PlayerTableData[];
  remainingData: PlayerTableData[];
  isPriorityData: boolean;
  refresh: () => void;
  // Remove lazy loading functions since we're keeping original pagination
}

export const usePlayerData = (
  seasonParam: string | null,
  yearParam: string | null
): UsePlayerDataReturn => {
  const { players = [], fetchAllPlayers, parent } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerData, setPlayerData] = useState<PlayerTableData[]>([]);
  const [priorityData, setPriorityData] = useState<PlayerTableData[]>([]);
  const [remainingData, setRemainingData] = useState<PlayerTableData[]>([]);
  const [displayPriorityData, setDisplayPriorityData] = useState(true);

  const prevParams = useRef<string>('');
  const cacheTimeoutRef = useRef<NodeJS.Timeout>();

  const clearCacheTimeout = useCallback(() => {
    if (cacheTimeoutRef.current) {
      clearTimeout(cacheTimeoutRef.current);
    }
  }, []);

  // Helper function to identify active players (current season registrations)
  const isActivePlayer = useCallback((player: PlayerTableData): boolean => {
    const currentYear = new Date().getFullYear();

    // Check player seasons array first
    if (player.seasons && Array.isArray(player.seasons)) {
      const hasCurrentYearSeason = player.seasons.some(
        (season: any) => season.year === currentYear
      );
      if (hasCurrentYearSeason) return true;
    }

    // Fallback: check player's direct season properties
    const hasDirectSeason = !!(
      player.season && player.registrationYear === currentYear
    );
    return hasDirectSeason;
  }, []);

  // Helper to sort by most recent registration
  const sortByRecentRegistration = useCallback(
    (players: PlayerTableData[]): PlayerTableData[] => {
      return [...players].sort((a, b) => {
        // Try to get registration date from seasons array first
        const getLatestRegistrationDate = (player: PlayerTableData): Date => {
          if (player.seasons && player.seasons.length > 0) {
            const latestSeason = player.seasons.reduce((latest, season) => {
              const seasonDate = season.registrationDate
                ? new Date(season.registrationDate)
                : new Date(0);
              return seasonDate > latest ? seasonDate : latest;
            }, new Date(0));
            if (latestSeason.getTime() > 0) return latestSeason;
          }

          // Fallback to player's updatedAt or createdAt
          if (player.updatedAt) return new Date(player.updatedAt);
          if (player.createdAt) return new Date(player.createdAt);
          return new Date(0);
        };

        const dateA = getLatestRegistrationDate(a);
        const dateB = getLatestRegistrationDate(b);

        return dateB.getTime() - dateA.getTime(); // Descending (newest first)
      });
    },
    []
  );

  const fetchAndTransformData = useCallback(
    async (abortSignal?: AbortSignal) => {
      try {
        setLoading(true);
        setError(null);

        const currentParams = `${seasonParam}-${yearParam}`;
        const isAdmin = parent?.role === 'admin';

        // For admin users, implement optimized fetching with caching
        if (isAdmin) {
          const queryParams = new URLSearchParams();
          if (seasonParam) queryParams.append('season', seasonParam);
          if (yearParam) queryParams.append('year', yearParam);
          queryParams.append('page', '1');
          queryParams.append('limit', '200');

          // Check cache first for admin
          const cacheKey = `adminPlayers-${seasonParam}-${yearParam}`;
          const cachedData = localStorage.getItem(cacheKey);
          const cacheExpiry = localStorage.getItem(`${cacheKey}-expiry`);

          if (cachedData && cacheExpiry && Date.now() < Number(cacheExpiry)) {
            if (abortSignal?.aborted) return;
            const parsedData = JSON.parse(cachedData);

            // Split into priority (active) and remaining data
            const activePlayers = parsedData.filter(isActivePlayer);
            const inactivePlayers = parsedData.filter(
              (p: PlayerTableData) => !isActivePlayer(p)
            );

            // Sort both groups by most recent registration
            const sortedActivePlayers = sortByRecentRegistration(activePlayers);
            const sortedInactivePlayers =
              sortByRecentRegistration(inactivePlayers);

            setPriorityData(sortedActivePlayers);
            setRemainingData(sortedInactivePlayers);
            setPlayerData(parsedData);
            setLoading(false);
            return;
          }

          // Fetch fresh data with priority loading
          const fetchedPlayers = await fetchAllPlayers(queryParams.toString());
          if (abortSignal?.aborted) return;

          const transformed = await transformPlayerData(
            fetchedPlayers || [],
            parent
          );
          if (abortSignal?.aborted) return;

          // Split into priority (active) and remaining data
          const activePlayers = transformed.filter(isActivePlayer);
          const inactivePlayers = transformed.filter((p) => !isActivePlayer(p));

          // Sort both groups by most recent registration
          const sortedActivePlayers = sortByRecentRegistration(activePlayers);
          const sortedInactivePlayers =
            sortByRecentRegistration(inactivePlayers);

          setPriorityData(sortedActivePlayers);
          setRemainingData(sortedInactivePlayers);
          setPlayerData(transformed);

          // Cache the data with 5 minute expiry
          localStorage.setItem(cacheKey, JSON.stringify(transformed));
          localStorage.setItem(
            `${cacheKey}-expiry`,
            String(Date.now() + 300000)
          );
          return;
        }

        // For non-admin users, use existing logic
        if (currentParams === prevParams.current && players.length > 0) {
          const transformed = await transformPlayerData(players, parent);
          if (abortSignal?.aborted) return;

          const activePlayers = transformed.filter(isActivePlayer);
          const inactivePlayers = transformed.filter((p) => !isActivePlayer(p));

          // Sort both groups by most recent registration
          const sortedActivePlayers = sortByRecentRegistration(activePlayers);
          const sortedInactivePlayers =
            sortByRecentRegistration(inactivePlayers);

          setPriorityData(sortedActivePlayers);
          setRemainingData(sortedInactivePlayers);
          setPlayerData(transformed);
          return;
        }

        prevParams.current = currentParams;
        const transformed = await transformPlayerData(players, parent);
        if (abortSignal?.aborted) return;

        const activePlayers = transformed.filter(isActivePlayer);
        const inactivePlayers = transformed.filter((p) => !isActivePlayer(p));

        // Sort both groups by most recent registration
        const sortedActivePlayers = sortByRecentRegistration(activePlayers);
        const sortedInactivePlayers = sortByRecentRegistration(inactivePlayers);

        setPriorityData(sortedActivePlayers);
        setRemainingData(sortedInactivePlayers);
        setPlayerData(transformed);
      } catch (err) {
        if (!abortSignal?.aborted) {
          setError('Failed to fetch players data. Please try again later.');
          console.error('Error:', err);
        }
      } finally {
        if (!abortSignal?.aborted) {
          setLoading(false);
        }
      }
    },
    [
      fetchAllPlayers,
      parent,
      players,
      seasonParam,
      yearParam,
      isActivePlayer,
      sortByRecentRegistration,
    ]
  );

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    // Debounce the fetch for admin users
    if (parent?.role === 'admin') {
      clearCacheTimeout();
      cacheTimeoutRef.current = setTimeout(() => {
        if (isMounted) {
          fetchAndTransformData(controller.signal);
        }
      }, 200);
    } else {
      fetchAndTransformData(controller.signal);
    }

    return () => {
      isMounted = false;
      controller.abort();
      clearCacheTimeout();
    };
  }, [fetchAndTransformData, parent?.role, clearCacheTimeout]);

  // Load remaining data in background
  useEffect(() => {
    if (
      displayPriorityData &&
      priorityData.length > 0 &&
      remainingData.length > 0
    ) {
      const timer = setTimeout(() => {
        setDisplayPriorityData(false);
      }, 2000); // Load remaining data after 2 seconds

      return () => clearTimeout(timer);
    }
  }, [displayPriorityData, priorityData.length, remainingData.length]);

  return {
    loading,
    error,
    playerData:
      displayPriorityData && priorityData.length > 0
        ? priorityData
        : playerData,
    priorityData,
    remainingData,
    isPriorityData: displayPriorityData && priorityData.length > 0,
    refresh: () => {
      // Clear cache and refetch
      if (parent?.role === 'admin') {
        const cacheKey = `adminPlayers-${seasonParam}-${yearParam}`;
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`${cacheKey}-expiry`);
      }
      setDisplayPriorityData(true);
      fetchAndTransformData();
    },
  };
};
