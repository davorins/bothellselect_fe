import { useNavigate } from 'react-router-dom';
import { all_routes } from '../router/all_routes';
import { useAuth } from '../../context/AuthContext';

export const useParentActions = () => {
  const navigate = useNavigate();
  const { fetchParentPlayers, fetchAllGuardians, fetchParentData } = useAuth();
  const routes = all_routes;

  const handleParentClick = async (record: any) => {
    try {
      const targetId = record.parentId || record._id;
      const navigationKey = Date.now();

      if (typeof record === 'string') {
        navigate(`${routes.parentDetail}/${record}`, {
          state: { key: navigationKey },
        });
        return;
      }

      // Fetch all necessary data
      const [viewedParent, players, guardians] = await Promise.all([
        fetchParentData(targetId, true),
        fetchParentPlayers(targetId),
        fetchAllGuardians(`parentId=${targetId}`),
      ]);

      // Ensure avatar URL is properly formatted
      const formattedParent = viewedParent || record;
      if (
        formattedParent.avatar &&
        !formattedParent.avatar.startsWith('http')
      ) {
        formattedParent.avatar = `https://bothell-select.onrender.com${formattedParent.avatar}`;
      }

      navigate(`${routes.parentDetail}/${targetId}`, {
        state: {
          parent: formattedParent,
          players: players.map((player) => ({
            ...player,
            avatar:
              player.avatar && !player.avatar.startsWith('http')
                ? `https://bothell-select.onrender.com${player.avatar}`
                : player.avatar,
          })),
          guardians: guardians.map((guardian) => ({
            ...guardian,
          })),
          isGuardianView: !!record.parentId || record.type === 'guardian',
          key: navigationKey,
          timestamp: Date.now(),
        },
        replace: true,
      });

      updateRecentlyViewed(targetId);
    } catch (err) {
      console.error('Error in handleParentClick:', err);
      navigate(
        `${routes.parentDetail}/${record.parentId || record._id || record}`,
        {
          state: { key: Date.now() },
        }
      );
    }
  };

  // Helper function to update recently viewed parents
  const updateRecentlyViewed = (targetId: string) => {
    try {
      const recentlyViewed = JSON.parse(
        localStorage.getItem('recentlyViewedParents') || '[]'
      );
      const updatedRecentlyViewed = [
        targetId,
        ...recentlyViewed.filter((id: string) => id !== targetId),
      ].slice(0, 5);
      localStorage.setItem(
        'recentlyViewedParents',
        JSON.stringify(updatedRecentlyViewed)
      );
    } catch (e) {
      console.error('Error updating recently viewed:', e);
    }
  };

  return { handleParentClick };
};
