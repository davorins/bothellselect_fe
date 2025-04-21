import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { transformPlayerData } from '../../utils/playerUtils';

export const usePlayerData = (
  seasonParam: string | null,
  yearParam: string | null
) => {
  const { players = [], fetchPlayersData, fetchAllPlayers, parent } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerData, setPlayerData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!parent) {
          setError('No parent data found.');
          return;
        }

        const queryParams = new URLSearchParams();
        if (seasonParam) queryParams.append('season', seasonParam);
        if (yearParam) queryParams.append('year', yearParam);

        if (parent.role === 'admin') {
          await fetchAllPlayers(queryParams.toString());
        } else if (parent.players && parent.players.length > 0) {
          const playerIds = parent.players.map((p: any) =>
            typeof p === 'string' ? p : p._id
          );
          await fetchPlayersData(playerIds, queryParams.toString());
        } else {
          setError('No players found for this account.');
        }
        setError(null);
      } catch (err) {
        setError('Failed to fetch players data. Please try again later.');
        console.error('Error fetching players:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fetchPlayersData, fetchAllPlayers, parent, seasonParam, yearParam]);

  useEffect(() => {
    if (players.length > 0) {
      setPlayerData(transformPlayerData(players, parent));
    }
  }, [players, parent]);

  return { loading, error, playerData };
};
