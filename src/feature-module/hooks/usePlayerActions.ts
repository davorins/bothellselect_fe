// hooks/usePlayerActions.ts
import { useNavigate } from 'react-router-dom';
import { all_routes } from '../router/all_routes';
import { useAuth } from '../../context/AuthContext';
import { getAvatarUrl, getDefaultAvatar } from '../../utils/r2Utils';

export const usePlayerActions = () => {
  const navigate = useNavigate();
  const { fetchGuardians } = useAuth();
  const routes = all_routes;

  const handlePlayerClick = async (player: any) => {
    try {
      if (typeof player === 'string') {
        navigate(`${routes.playerDetail}/${player}`);
        return;
      }

      // Fetch guardians for the player
      const guardians = await fetchGuardians(player.id);

      const avatarUrl = getAvatarUrl(
        player.avatar || player.imgSrc,
        getDefaultAvatar(
          'player',
          player.gender as 'Male' | 'Female' | undefined,
        ),
      );

      // Get parent ID from various possible locations
      const parentId =
        player.parentId?._id ||
        player.parentId ||
        player.parent?._id ||
        player.parent;

      const playerData = {
        ...player,
        playerId: player.id,
        _id: player.id,
        avatar: avatarUrl,
        dob: player.dob,
        section: player.section || player.schoolName,
        seasons: player.seasons || [],
        season: player.season,
        registrationYear: player.registrationYear,
        paymentStatus: player.paymentStatus,
        paymentComplete: player.paymentComplete,
        // Preserve these important flags
        isOwnPlayer: player.isOwnPlayer,
        parentId: parentId,
      };

      // Update recently viewed players
      const recentlyViewed = JSON.parse(
        localStorage.getItem('recentlyViewed') || '[]',
      );
      const updatedRecentlyViewed = [
        player.id,
        ...recentlyViewed.filter((id: string) => id !== player.id),
      ].slice(0, 5);
      localStorage.setItem(
        'recentlyViewed',
        JSON.stringify(updatedRecentlyViewed),
      );

      navigate(`${routes.playerDetail}/${player.id}`, {
        state: {
          player: playerData,
          siblings: player.siblings || [],
          guardians,
          key: Date.now(),
          timestamp: Date.now(),
          seasonsData: player.seasons || getFallbackSeasons(player),
        },
      });
    } catch (err) {
      console.error('Error in handlePlayerClick:', err);

      // Get parent ID for fallback
      const parentId =
        player.parentId?._id ||
        player.parentId ||
        player.parent?._id ||
        player.parent;

      navigate(`${routes.playerDetail}/${player.id}`, {
        state: {
          player: {
            ...player,
            playerId: player.id,
            _id: player.id,
            seasons: player.seasons || getFallbackSeasons(player),
            isOwnPlayer: player.isOwnPlayer,
            parentId: parentId,
          },
        },
      });
    }
  };

  const getFallbackSeasons = (player: any) => {
    if (player.seasons && player.seasons.length > 0) return player.seasons;
    const fallbackSeasons = [];
    if (player.season || player.registrationYear) {
      fallbackSeasons.push({
        season: player.season || 'Partizan',
        year: player.registrationYear || new Date().getFullYear(),
        tryoutId: player.tryoutId,
        registrationDate: player.registrationDate || player.createdAt,
        paymentComplete: player.paymentComplete,
        paymentStatus: player.paymentStatus,
        amountPaid: player.amountPaid,
        cardLast4: player.cardLast4,
        cardBrand: player.cardBrand,
      });
    }
    return fallbackSeasons;
  };

  return { handlePlayerClick };
};
