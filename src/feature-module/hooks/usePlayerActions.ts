import { useNavigate } from 'react-router-dom';
import { all_routes } from '../router/all_routes';
import { useAuth } from '../../context/AuthContext';
import { optimizeCloudinaryUrl } from '../../utils/avatar';

export const usePlayerActions = () => {
  const navigate = useNavigate();
  const { fetchGuardians } = useAuth();
  const routes = all_routes;

  const handlePlayerClick = async (
    player: any,
    existingGuardians?: any[],
    existingSiblings?: any[]
  ) => {
    try {
      if (typeof player === 'string') {
        navigate(`${routes.playerDetail}/${player}`);
        return;
      }

      // Only fetch guardians if they're not provided
      const guardians = existingGuardians || (await fetchGuardians(player.id));
      const avatarUrl = optimizeCloudinaryUrl(
        player.avatar || player.imgSrc,
        'player'
      );

      const playerData = {
        ...player,
        playerId: player.id,
        _id: player.id,
        avatar: avatarUrl,
        dob: player.dob,
        section: player.section,
      };

      // Update recently viewed players
      const recentlyViewed = JSON.parse(
        localStorage.getItem('recentlyViewed') || '[]'
      );
      const updatedRecentlyViewed = [
        player.id,
        ...recentlyViewed.filter((id: string) => id !== player.id),
      ].slice(0, 5);
      localStorage.setItem(
        'recentlyViewed',
        JSON.stringify(updatedRecentlyViewed)
      );

      navigate(`${routes.playerDetail}/${player.id}`, {
        state: {
          player: playerData,
          siblings: existingSiblings || player.siblings || [],
          guardians,
          key: Date.now(),
          timestamp: Date.now(),
        },
        replace: true,
      });
    } catch (err) {
      console.error('Error fetching guardians:', err);
    }
  };

  return { handlePlayerClick };
};
