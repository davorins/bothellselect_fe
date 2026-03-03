import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { all_routes } from '../../feature-module/router/all_routes';

interface SeasonData {
  season: string;
  year: number;
}

interface GroupedSeasons {
  [year: number]: string[];
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
  const [groupedSeasons, setGroupedSeasons] = useState<GroupedSeasons>({});
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, logout, fetchAllPlayers } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        if (!isAuthenticated) {
          setError('You must be logged in to view seasons.');
          setLoading(false);
          return;
        }

        // Fetch all players to get their seasons data
        const players = await fetchAllPlayers();

        // Extract unique seasons from all players' seasons arrays
        const allSeasons: SeasonData[] = [];

        players.forEach((player) => {
          if (player.seasons && Array.isArray(player.seasons)) {
            player.seasons.forEach((season) => {
              if (season.season && season.year) {
                allSeasons.push({
                  season: season.season,
                  year: season.year,
                });
              }
            });
          }
        });

        // Remove duplicates and sort
        const uniqueSeasons = Array.from(
          new Set(allSeasons.map((s) => `${s.season}-${s.year}`))
        )
          .map((seasonStr) => {
            const [season, year] = seasonStr.split('-');
            return { season, year: parseInt(year) };
          })
          .sort((a, b) => b.year - a.year || a.season.localeCompare(b.season));

        setSeasons(uniqueSeasons);

        // Group seasons by year
        const grouped: GroupedSeasons = {};
        const years: number[] = [];

        uniqueSeasons.forEach(({ season, year }) => {
          if (!grouped[year]) {
            grouped[year] = [];
            years.push(year);
          }
          if (!grouped[year].includes(season)) {
            grouped[year].push(season);
          }
        });

        // Sort seasons within each year
        Object.keys(grouped).forEach((year) => {
          grouped[parseInt(year)].sort();
        });

        // Sort years in descending order
        years.sort((a, b) => b - a);

        setGroupedSeasons(grouped);
        setAvailableYears(years);

        // Set initial selected year
        if (currentYear && grouped[parseInt(currentYear)]) {
          setSelectedYear(parseInt(currentYear));
        } else if (years.length > 0) {
          setSelectedYear(years[0]);
        }
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
  }, [isAuthenticated, logout, API_BASE_URL, currentYear, fetchAllPlayers]);

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
  };

  const handleSeasonSelect = (season: string, year: number) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('season', season);
    newSearchParams.set('year', year.toString());
    navigate({
      pathname: all_routes.PlayerList,
      search: `?season=${season}&year=${year}`,
    });
  };

  const getCurrentDisplayText = () => {
    if (currentSeason && currentYear) {
      return `${currentSeason} ${currentYear}`;
    }
    if (selectedYear && groupedSeasons[selectedYear]?.length > 0) {
      return `Select Season (${selectedYear})`;
    }
    return 'Select Season';
  };

  if (loading) return <div className='dropdown-item'>Loading seasons...</div>;
  if (error) return <div className='dropdown-item text-danger'>{error}</div>;
  if (seasons.length === 0)
    return <div className='dropdown-item'>No seasons available</div>;

  return (
    <div className='season-dropdown-container'>
      {/* Year Selection Section */}
      <div className='dropdown-section'>
        <div className='dropdown-header px-3 py-2 small text-muted border-bottom'>
          Select Year
        </div>
        {availableYears.map((year) => (
          <button
            key={year}
            className={`dropdown-item d-flex justify-content-between align-items-center ${
              selectedYear === year ? 'bg-light text-dark' : ''
            }`}
            onClick={() => handleYearSelect(year)}
          >
            <span>{year}</span>
            {selectedYear === year && (
              <i className='ti ti-check text-primary' />
            )}
          </button>
        ))}
      </div>

      {/* Season Selection Section */}
      {selectedYear && groupedSeasons[selectedYear] && (
        <div className='dropdown-section'>
          <div className='dropdown-header px-3 py-2 small text-muted border-bottom'>
            Seasons for {selectedYear}
          </div>
          {groupedSeasons[selectedYear].map((season) => (
            <button
              key={`${season}-${selectedYear}`}
              className={`dropdown-item ${
                currentSeason === season &&
                currentYear === selectedYear.toString()
                  ? 'active bg-primary text-white'
                  : ''
              }`}
              onClick={() => handleSeasonSelect(season, selectedYear)}
            >
              {season}
            </button>
          ))}
        </div>
      )}

      {/* No seasons message for selected year */}
      {selectedYear &&
        (!groupedSeasons[selectedYear] ||
          groupedSeasons[selectedYear].length === 0) && (
          <div className='dropdown-item text-muted small'>
            No seasons available for {selectedYear}
          </div>
        )}
    </div>
  );
};

export default SeasonDropdown;
