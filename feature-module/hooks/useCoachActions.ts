import { useNavigate } from 'react-router-dom';
import { all_routes } from '../router/all_routes';
import { useAuth } from '../../context/AuthContext';

export const useCoachActions = () => {
  const navigate = useNavigate();
  const { fetchParentPlayers, fetchAllGuardians } = useAuth();
  const routes = all_routes;

  const handleCoachClick = async (record: any) => {
    try {
      // Determine the target ID (use coachId for guardians, fallback to _id)
      const targetId = record.coachId || record._id;

      // If record is just an ID string, do basic navigation
      if (typeof record === 'string') {
        navigate(`${routes.coachDetail}/${record}`);
        return;
      }

      // Fetch associated data (players and guardians)
      const [players, guardians] = await Promise.all([
        fetchParentPlayers(targetId),
        fetchAllGuardians(`coachId=${targetId}`),
      ]);

      // Update recently viewed
      const recentlyViewed = JSON.parse(
        localStorage.getItem('recentlyViewedCoachs') || '[]'
      );
      const updatedRecentlyViewed = [
        targetId,
        ...recentlyViewed.filter((id: string) => id !== targetId),
      ].slice(0, 5);
      localStorage.setItem(
        'recentlyViewedCoachs',
        JSON.stringify(updatedRecentlyViewed)
      );

      // Navigate to the coach detail page
      navigate(`${routes.parentDetail}/${targetId}`, {
        state: {
          coach: {
            ...record,
            coachId: targetId,
            players,
          },
          guardians,
          // Include flag if this was a guardian click
          isGuardianView: !!record.coachId || record.type === 'guardian',
        },
      });
    } catch (err) {
      console.error('Error in handleCoachClick:', err);
      // Fallback to basic navigation
      const targetId = record.coachId || record._id || record;
      navigate(`${routes.parentDetail}/${targetId}`);
    }
  };

  return { handleCoachClick };
};
