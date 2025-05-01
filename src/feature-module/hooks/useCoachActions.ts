import { useNavigate } from 'react-router-dom';
import { all_routes } from '../router/all_routes';
import { useAuth } from '../../context/AuthContext';

export const useCoachActions = () => {
  const navigate = useNavigate();
  const { fetchParentPlayers, fetchAllGuardians, setViewedCoach } = useAuth(); // Add setViewedCoach
  const routes = all_routes;

  const handleCoachClick = async (record: any) => {
    try {
      const targetId = record._id;
      const [players, guardians] = await Promise.all([
        fetchParentPlayers(targetId),
        fetchAllGuardians(`parentId=${targetId}`),
      ]);

      // Create the coach data to be viewed
      const coachData = {
        ...record,
        isCoach: true,
        players,
      };

      // Set the viewed coach in context
      setViewedCoach(coachData);

      navigate(`${routes.parentDetail}/${targetId}`, {
        state: {
          parent: coachData,
          guardians,
          isCoachView: true,
        },
      });
    } catch (err) {
      console.error('Error in handleCoachClick:', err);
      navigate(`${routes.parentDetail}/${record._id}`);
    }
  };

  return { handleCoachClick };
};
