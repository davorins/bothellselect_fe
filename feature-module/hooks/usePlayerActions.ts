// usePlayerActions.ts
import { useNavigate } from 'react-router-dom';
import { all_routes } from '../router/all_routes';
import { useAuth } from '../../context/AuthContext';

export const usePlayerActions = () => {
  const navigate = useNavigate();
  const { fetchGuardians } = useAuth();
  const routes = all_routes;

  const handlePlayerClick = async (player: any) => {
    try {
      // If player is just an ID, we can't fetch guardians - need to handle this case
      if (typeof player === 'string') {
        navigate(`${routes.playerDetail}/${player}`);
        return;
      }

      const guardians = await fetchGuardians(player.id);
      let recentlyViewed = JSON.parse(
        localStorage.getItem('recentlyViewed') || '[]'
      );
      recentlyViewed = [
        player.id,
        ...recentlyViewed.filter((id: string) => id !== player.id),
      ].slice(0, 5);

      localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));

      navigate(`${routes.playerDetail}/${player.id}`, {
        state: {
          player: {
            ...player,
            playerId: player.id,
            _id: player.id,
          },
          siblings: player.siblings,
          guardians,
        },
      });
    } catch (err) {
      console.error('Error fetching guardians:', err);
    }
  };

  return { handlePlayerClick };
};
