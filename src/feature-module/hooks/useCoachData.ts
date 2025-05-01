import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { Coach } from '../../types/coachTypes';
import { ExtendedCoachRecord } from '../../utils/coachUtils';

export const useCoachData = () => {
  const { parents, fetchParentsData, currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coaches, setCoaches] = useState<Coach[]>([]);

  const DEFAULT_COACH_AVATAR =
    'https://bothell-select.onrender.com/uploads/avatars/coach.png';

  const transformToExtendedRecord = useCallback(
    (coach: Coach): ExtendedCoachRecord => ({
      ...coach,
      _id: coach._id,
      fullName: coach.fullName,
      email: coach.email,
      phone: coach.phone,
      address: coach.address,
      type: 'coach' as const,
      DateofJoin: coach.createdAt || new Date().toISOString(),
      imgSrc:
        coach.avatar &&
        coach.avatar.includes('/upload/') &&
        coach.avatar.split('/').pop()?.includes('.')
          ? coach.avatar
          : DEFAULT_COACH_AVATAR,
      canView: true,
      status: coach.status || 'Active',
      aauNumber: coach.aauNumber || 'N/A',
      role: coach.role || 'coach',
      players: coach.players || [],
      isCoach: true,
      createdAt: coach.createdAt || new Date().toISOString(),
    }),
    []
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentUser) {
        setError('No user data found.');
        return;
      }

      if (!parents || parents.length === 0) {
        await fetchParentsData();
      }

      const coachData = parents
        .filter((parent) => parent.isCoach)
        .map(
          (parent): Coach => ({
            ...parent,
            isCoach: true,
            aauNumber: parent.aauNumber || 'N/A',
            role: parent.role || 'coach',
            players: parent.players || [],
            createdAt: parent.createdAt || new Date().toISOString(),
          })
        );

      setCoaches(coachData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch coach data'
      );
      console.error('Error fetching coach data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, parents, fetchParentsData]);

  useEffect(() => {
    if (coaches.length === 0) {
      fetchData();
    }
  }, [fetchData, coaches.length]);

  return {
    loading,
    error,
    coaches,
    coachData: coaches.map(transformToExtendedRecord),
    fetchData,
  };
};
