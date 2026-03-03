import { useNavigate } from 'react-router-dom';
import { all_routes } from '../router/all_routes';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const useCoachActions = () => {
  const navigate = useNavigate();
  const {
    fetchParentData,
    fetchParentPlayers,
    fetchAllGuardians,
    setViewedCoach,
  } = useAuth();
  const routes = all_routes;

  const handleCoachClick = async (record: any) => {
    try {
      const targetId = record._id;
      const navigationKey = Date.now();

      // Fetch all necessary data using the same pattern as useParentActions
      const [viewedParent, players, guardians] = await Promise.all([
        fetchParentData(targetId, true), // Use the same fetchParentData from context
        fetchParentPlayers(targetId),
        fetchAllGuardians(`parentId=${targetId}`),
      ]);

      // Ensure avatar URL is properly formatted
      const formattedParent = viewedParent || record;

      // Create coach data with complete parent information
      const coachData = {
        ...formattedParent,
        isCoach: true,
        players: players.length ? players : formattedParent.players || [],
        additionalGuardians: formattedParent.additionalGuardians || guardians,
      };

      setViewedCoach(coachData);

      navigate(`${routes.parentDetail}/${targetId}`, {
        state: {
          parent: coachData,
          guardians: formattedParent.additionalGuardians || guardians,
          players: players.map((player) => ({
            ...player,
            avatar:
              player.avatar && !player.avatar.startsWith('http')
                ? `https://partizan-be.onrender.com${player.avatar}`
                : player.avatar,
          })),
          isCoachView: true,
          from: 'coach-list',
          key: navigationKey,
          timestamp: Date.now(),
        },
        replace: true,
      });

      // Update recently viewed (optional - could create a separate recently viewed coaches)
      updateRecentlyViewed(targetId);
    } catch (err) {
      console.error('Error in handleCoachClick:', err);
      // Fallback to basic navigation if fetch fails
      navigate(`${routes.parentDetail}/${record._id}`, {
        state: {
          parent: {
            ...record,
            isCoach: true,
          },
          from: 'coach-list-fallback',
          key: Date.now(),
        },
      });
    }
  };

  // Helper function to update recently viewed parents (reuse the same function)
  const updateRecentlyViewed = (targetId: string) => {
    try {
      const recentlyViewed = JSON.parse(
        localStorage.getItem('recentlyViewedParents') || '[]',
      );
      const updatedRecentlyViewed = [
        targetId,
        ...recentlyViewed.filter((id: string) => id !== targetId),
      ].slice(0, 5);
      localStorage.setItem(
        'recentlyViewedParents',
        JSON.stringify(updatedRecentlyViewed),
      );
    } catch (e) {
      console.error('Error updating recently viewed:', e);
    }
  };

  return { handleCoachClick };
};
