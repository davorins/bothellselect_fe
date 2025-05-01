import { useNavigate } from 'react-router-dom';
import { all_routes } from '../router/all_routes';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const useCoachActions = () => {
  const navigate = useNavigate();
  const { fetchParentPlayers, fetchAllGuardians, setViewedCoach } = useAuth(); // Add setViewedCoach
  const routes = all_routes;

  const DEFAULT_COACH_AVATAR =
    'https://bothell-select.onrender.com/uploads/avatars/coach.png';

  const handleCoachClick = async (record: any) => {
    try {
      const targetId = record._id;

      // Ensure avatar URL is fetched if missing or not a full URL
      if (!record.imgSrc || !record.imgSrc.startsWith('http')) {
        const res = await axios.get(`${API_BASE_URL}/parent/${targetId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        record.imgSrc = res.data.avatar || DEFAULT_COACH_AVATAR;
      }

      const [players, guardians] = await Promise.all([
        fetchParentPlayers(targetId),
        fetchAllGuardians(`parentId=${targetId}`),
      ]);

      const coachData = {
        ...record,
        isCoach: true,
        imgSrc: record.imgSrc,
        players,
      };

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
