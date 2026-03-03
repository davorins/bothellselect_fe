// hooks/useParentActions.ts
import { useNavigate } from 'react-router-dom';
import { all_routes } from '../router/all_routes';
import { useAuth } from '../../context/AuthContext';

// Define types for the responses
interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface GuardiansResponse {
  guardians?: any[];
  data?: any[];
  [key: string]: any;
}

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
      const [viewedParent, players, guardiansResponse] = await Promise.all([
        fetchParentData(targetId, true),
        fetchParentPlayers(targetId),
        fetchAllGuardians(`parentId=${targetId}`),
      ]);

      // Safely extract guardians array from response
      let guardiansArray: any[] = [];

      if (guardiansResponse) {
        // Check if it's an array
        if (Array.isArray(guardiansResponse)) {
          guardiansArray = guardiansResponse;
        }
        // Check if it's a paginated response with data property
        else if (
          guardiansResponse &&
          typeof guardiansResponse === 'object' &&
          'data' in guardiansResponse &&
          Array.isArray((guardiansResponse as any).data)
        ) {
          guardiansArray = (guardiansResponse as any).data;
        }
        // Check if it has a guardians property
        else if (
          guardiansResponse &&
          typeof guardiansResponse === 'object' &&
          'guardians' in guardiansResponse &&
          Array.isArray((guardiansResponse as any).guardians)
        ) {
          guardiansArray = (guardiansResponse as any).guardians;
        }
        // If it's an object, try to convert to array
        else if (typeof guardiansResponse === 'object') {
          // Try to get values if it's an object with numeric keys
          const values = Object.values(guardiansResponse);
          if (values.length > 0 && values.every((v) => typeof v === 'object')) {
            guardiansArray = values;
          } else {
            // Otherwise treat as single item
            guardiansArray = [guardiansResponse];
          }
        }
      }

      console.log('📦 Processed guardians:', {
        responseType: guardiansResponse ? typeof guardiansResponse : 'null',
        isArray: Array.isArray(guardiansResponse),
        arrayLength: guardiansArray.length,
        sample: guardiansArray[0],
      });

      // Ensure players is an array
      const playersArray = Array.isArray(players) ? players : [];

      // Ensure avatar URL is properly formatted
      const formattedParent = viewedParent || record;
      if (
        formattedParent.avatar &&
        !formattedParent.avatar.startsWith('http')
      ) {
        formattedParent.avatar = `https://partizan-be.onrender.com${formattedParent.avatar}`;
      }

      navigate(`${routes.parentDetail}/${targetId}`, {
        state: {
          parent: formattedParent,
          players: playersArray.map((player: any) => ({
            ...player,
            avatar:
              player.avatar && !player.avatar.startsWith('http')
                ? `https://partizan-be.onrender.com${player.avatar}`
                : player.avatar,
          })),
          guardians: guardiansArray.map((guardian: any) => ({
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
      // Fallback navigation with minimal data
      const fallbackId = record.parentId || record._id || record;
      navigate(`${routes.parentDetail}/${fallbackId}`, {
        state: {
          key: Date.now(),
          parent: record,
          players: [],
          guardians: [],
        },
      });
    }
  };

  // Helper function to update recently viewed parents
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

  return { handleParentClick };
};
