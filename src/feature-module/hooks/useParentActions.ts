import { useNavigate } from 'react-router-dom';
import { all_routes } from '../router/all_routes';
import { useAuth } from '../../context/AuthContext';

export const useParentActions = () => {
  const navigate = useNavigate();
  const {
    fetchParentPlayers,
    fetchAllGuardians,
    fetchParentData,
    currentUser,
  } = useAuth();
  const routes = all_routes;

  const handleParentClick = async (record: any) => {
    try {
      const targetId = record.parentId || record._id;

      if (typeof record === 'string') {
        navigate(`${routes.parentDetail}/${record}`);
        return;
      }

      if (currentUser?.role === 'admin') {
        // For admin, only update viewed parent
        const [viewedParent, players, guardians] = await Promise.all([
          fetchParentData(targetId, true),
          fetchParentPlayers(targetId),
          fetchAllGuardians(`parentId=${targetId}`),
        ]);

        navigate(`${routes.parentDetail}/${targetId}`, {
          state: {
            parent: viewedParent || record,
            players,
            guardians,
            isGuardianView: !!record.parentId || record.type === 'guardian',
          },
        });
      } else {
        // Regular user flow
        const [players, guardians] = await Promise.all([
          fetchParentPlayers(targetId),
          fetchAllGuardians(`parentId=${targetId}`),
        ]);

        navigate(`${routes.parentDetail}/${targetId}`, {
          state: {
            parent: record,
            players,
            guardians,
            isGuardianView: !!record.parentId || record.type === 'guardian',
          },
        });
      }

      updateRecentlyViewed(targetId);
    } catch (err) {
      console.error('Error in handleParentClick:', err);
      navigate(
        `${routes.parentDetail}/${record.parentId || record._id || record}`
      );
    }
  };

  // Helper function to update recently viewed parents
  const updateRecentlyViewed = (targetId: string) => {
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
  };

  return { handleParentClick };
};
