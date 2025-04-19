import { useNavigate } from 'react-router-dom';
import { all_routes } from '../router/all_routes';
import { useAuth } from '../../context/AuthContext';

export const useParentActions = () => {
  const navigate = useNavigate();
  const { fetchParentPlayers, fetchAllGuardians } = useAuth();
  const routes = all_routes;

  const handleParentClick = async (record: any) => {
    try {
      // Determine the target ID (use parentId for guardians, fallback to _id)
      const targetId = record.parentId || record._id;

      // If record is just an ID string, do basic navigation
      if (typeof record === 'string') {
        navigate(`${routes.parentDetail}/${record}`);
        return;
      }

      // Fetch associated data (players and guardians)
      const [players, guardians] = await Promise.all([
        fetchParentPlayers(targetId),
        fetchAllGuardians(`parentId=${targetId}`),
      ]);

      // Update recently viewed
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

      // Navigate to the parent detail page
      navigate(`${routes.parentDetail}/${targetId}`, {
        state: {
          parent: {
            ...record,
            parentId: targetId,
            players,
          },
          guardians,
          // Include flag if this was a guardian click
          isGuardianView: !!record.parentId || record.type === 'guardian',
        },
      });
    } catch (err) {
      console.error('Error in handleParentClick:', err);
      // Fallback to basic navigation
      const targetId = record.parentId || record._id || record;
      navigate(`${routes.parentDetail}/${targetId}`);
    }
  };

  return { handleParentClick };
};
