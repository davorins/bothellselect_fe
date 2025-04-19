import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { all_routes } from '../../feature-module/router/all_routes';

interface SeasonData {
  season: string;
  year: number;
}

interface SeasonDropdownProps {
  currentSeason?: string;
  currentYear?: string;
}

const SeasonDropdown: React.FC<SeasonDropdownProps> = ({
  currentSeason,
  currentYear,
}) => {
  const [seasons, setSeasons] = useState<SeasonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, logout } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        if (!isAuthenticated) {
          setError('You must be logged in to view seasons.');
          setLoading(false);
          return;
        }

        const response = await axios.get<
          Array<{ season: string; registrationYear: number }>
        >(`${API_BASE_URL}/players/seasons`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        const uniqueSeasons = Array.from(
          new Set(response.data.map((s) => `${s.season}-${s.registrationYear}`))
        )
          .map((seasonStr) => {
            const [season, year] = seasonStr.split('-');
            return { season, year: parseInt(year) };
          })
          .sort((a, b) => b.year - a.year || a.season.localeCompare(b.season));

        setSeasons(uniqueSeasons);
      } catch (error) {
        console.error('Failed to fetch seasons:', error);
        setError('Failed to fetch seasons. Please try again later.');
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSeasons();
  }, [isAuthenticated, logout, API_BASE_URL]);

  const handleSeasonSelect = (season: string, year: number) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('season', season);
    newSearchParams.set('year', year.toString());
    navigate({
      pathname: all_routes.PlayerList, // Always navigate to playerList
      search: `?season=${season}&year=${year}`, // Append season and year as query parameters
    });
  };

  if (loading) return <div className='dropdown-item'>Loading seasons...</div>;
  if (error) return <div className='dropdown-item text-danger'>{error}</div>;
  if (seasons.length === 0)
    return <div className='dropdown-item'>No seasons available</div>;

  return (
    <>
      {seasons.map((seasonData) => (
        <button
          key={`${seasonData.season}-${seasonData.year}`}
          className={`dropdown-item ${
            currentSeason === seasonData.season &&
            currentYear === seasonData.year.toString()
              ? 'active'
              : ''
          }`}
          onClick={() => handleSeasonSelect(seasonData.season, seasonData.year)}
        >
          {seasonData.season} {seasonData.year}
        </button>
      ))}
    </>
  );
};

export default SeasonDropdown;
