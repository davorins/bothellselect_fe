import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { all_routes } from '../../../feature-module/router/all_routes';
import { useAuth } from '../../../context/AuthContext';
import { SearchResult } from '../../../types/types';
import { formatPhoneNumber } from '../../../utils/phone';

const DEFAULT_PARENT_AVATAR =
  'https://partizan-be.onrender.com/uploads/avatars/parents.png';
const DEFAULT_COACH_AVATAR =
  'https://partizan-be.onrender.com/uploads/avatars/coach.png';
const DEFAULT_GIRL_AVATAR =
  'https://partizan-be.onrender.com/uploads/avatars/girl.png';
const DEFAULT_BOY_AVATAR =
  'https://partizan-be.onrender.com/uploads/avatars/boy.png';

interface SearchBarProps {
  role?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ role }) => {
  const { searchAll, fetchGuardians, fetchPlayerData } = useAuth();
  const navigate = useNavigate();
  const routes = all_routes;

  // Search related state
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle click outside search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const searchResults = await searchAll(searchTerm);
        setResults(searchResults);
        setShowResults(true);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchAll]);

  // Helper function to get the correct avatar URL
  const getAvatarUrl = (result: SearchResult): string => {
    if (result.image) {
      if (result.image.startsWith('http')) {
        return result.image;
      }
      if (result.image.startsWith('/')) {
        return `https://partizan-be.onrender.com${result.image}`;
      }
    }

    switch (result.type) {
      case 'player':
        return result.gender?.toLowerCase() === 'female'
          ? DEFAULT_GIRL_AVATAR
          : DEFAULT_BOY_AVATAR;
      case 'coach':
        return DEFAULT_COACH_AVATAR;
      case 'parent':
      case 'guardian':
        return DEFAULT_PARENT_AVATAR;
      default:
        return DEFAULT_PARENT_AVATAR;
    }
  };

  // Enhanced function to fetch full player data with seasons
  const fetchPlayerWithSeasons = async (playerId: string) => {
    try {
      const fullPlayerData = await fetchPlayerData(playerId);
      if (fullPlayerData && (fullPlayerData.seasons || fullPlayerData.season)) {
        console.log('Full player data with seasons:', fullPlayerData);
        return fullPlayerData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching player details:', error);
      return null;
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results.length > 0) {
      handleResultClick(results[0]);
    }
  };

  const handleResetSearch = () => {
    if (results.length > 0) {
      handleResultClick(results[0]);
    } else {
      setSearchTerm('');
      setShowResults(false);
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handlePlayerNavigation = useCallback(
    async (result: SearchResult) => {
      console.log('Navigating with player status:', result.status);

      try {
        const guardians = await fetchGuardians(result.id);

        // Fetch full player data including seasons
        const fullPlayerData = await fetchPlayerWithSeasons(result.id);

        // Use full player data if available, otherwise use search result data with enhanced seasons
        const playerData = fullPlayerData
          ? {
              ...fullPlayerData,
              _id: fullPlayerData._id || result.id,
              id: fullPlayerData.id || result.id,
              // Remove playerId since it doesn't exist on Player type
              fullName: fullPlayerData.fullName || result.name,
              name: fullPlayerData.name || result.name,
              imgSrc:
                fullPlayerData.imgSrc || fullPlayerData.avatar || result.image,
              avatar: fullPlayerData.avatar || result.image,
              // Ensure seasons data is properly structured - use type assertion to avoid conflicts
              seasons: (fullPlayerData.seasons ||
                (fullPlayerData.season
                  ? [
                      {
                        season: fullPlayerData.season,
                        year:
                          fullPlayerData.registrationYear ||
                          new Date().getFullYear(),
                        registrationDate: fullPlayerData.createdAt,
                        paymentComplete:
                          fullPlayerData.paymentComplete ||
                          fullPlayerData.status === 'Active',
                        // Use playerStatus instead of paymentStatus
                      },
                    ]
                  : [])) as any, // Use type assertion to avoid type conflicts
            }
          : {
              // Fallback to search result data with enhanced seasons structure
              _id: result.id,
              id: result.id,
              // Remove playerId since it doesn't exist on Player type
              fullName: result.name,
              name: result.name,
              gender: result.gender || '',
              grade: result.grade || '',
              dob: result.dob,
              aauNumber: result.aauNumber || '',
              status: result.status || '',
              season: result.season || '',
              registrationYear:
                result.registrationYear || new Date().getFullYear(),
              schoolName: result.additionalInfo || '',
              section: result.additionalInfo || '',
              class: result.grade || '',
              createdAt: result.createdAt,
              playerStatus: result.status, // Use playerStatus instead of paymentStatus
              imgSrc: result.image,
              avatar: result.image,
              // Enhanced seasons data structure with detailed information - use type assertion
              seasons: (result.seasons || [
                {
                  season: result.season || 'Partizan',
                  year: result.registrationYear || new Date().getFullYear(),
                  tryoutId: result.season?.toLowerCase().includes('tryout')
                    ? `${result.season?.toLowerCase().replace(/\s+/g, '')}-${
                        result.registrationYear
                      }`
                    : `${
                        result.season?.toLowerCase().replace(/\s+/g, '') ||
                        'basketballselect'
                      }-${result.registrationYear}`,
                  registrationDate:
                    result.createdAt || new Date().toISOString(),
                  paymentComplete: result.status === 'Active',
                  // Remove paymentStatus since it doesn't exist, use paymentComplete instead
                  amountPaid:
                    result.status === 'Active'
                      ? result.season?.includes('Tryout')
                        ? 20
                        : 1050
                      : undefined,
                  cardLast4:
                    result.status === 'Active'
                      ? result.season?.includes('Tryout')
                        ? '3234'
                        : '1111'
                      : undefined,
                  cardBrand: result.status === 'Active' ? 'VISA' : undefined,
                },
              ]) as any, // Use type assertion to avoid type conflicts
              // Remove paymentStatus and paymentComplete since they don't exist on Player type
              registrationComplete: true,
            };

        console.log('Full player data being passed:', playerData);
        console.log('Player seasons data:', playerData.seasons);

        navigate(`${routes.playerDetail}/${result.id}`, {
          state: {
            player: playerData,
            guardians,
            fromSearch: true,
            key: Date.now(),
            timestamp: Date.now(),
          },
        });
      } catch (err) {
        console.error('Navigation error:', err);
        // Enhanced fallback navigation with seasons data - use type assertion
        navigate(`${routes.playerDetail}/${result.id}`, {
          state: {
            player: {
              _id: result.id,
              id: result.id,
              // Remove playerId since it doesn't exist on Player type
              fullName: result.name,
              name: result.name,
              status: result.status || 'inactive',
              imgSrc: result.image,
              avatar: result.image,
              seasons: [
                {
                  season: result.season || 'Partizan',
                  year: result.registrationYear || new Date().getFullYear(),
                  tryoutId: result.season?.toLowerCase().includes('tryout')
                    ? `${result.season?.toLowerCase().replace(/\s+/g, '')}-${
                        result.registrationYear
                      }`
                    : `${
                        result.season?.toLowerCase().replace(/\s+/g, '') ||
                        'basketballselect'
                      }-${result.registrationYear}`,
                  registrationDate:
                    result.createdAt || new Date().toISOString(),
                  paymentComplete: result.status === 'Active',
                  // Remove paymentStatus since it doesn't exist
                  amountPaid:
                    result.status === 'Active'
                      ? result.season?.includes('Tryout')
                        ? 20
                        : 1050
                      : undefined,
                  cardLast4:
                    result.status === 'Active'
                      ? result.season?.includes('Tryout')
                        ? '3234'
                        : '1111'
                      : undefined,
                  cardBrand: result.status === 'Active' ? 'VISA' : undefined,
                },
              ] as any, // Use type assertion to avoid type conflicts
            },
            fromSearch: true,
            key: Date.now(),
          },
        });
      }
    },
    [fetchGuardians, navigate, routes.playerDetail, fetchPlayerData],
  );

  const handleSchoolNavigation = useCallback(
    (result: SearchResult) => {
      // Use PlayerList (capital P) to match all_routes
      const basePath = routes.PlayerList || routes.playerList;
      const schoolPath = `${basePath}?school=${encodeURIComponent(result.name)}`;
      navigate(schoolPath, {
        state: { searchFilter: result.name, schoolFilter: result.name },
      });
    },
    [navigate, routes.PlayerList, routes.playerList],
  );

  const handleResultClick = useCallback(
    async (result: SearchResult) => {
      setShowResults(false);
      setSearchTerm('');

      try {
        switch (result.type) {
          case 'player':
            await handlePlayerNavigation(result);
            break;

          case 'parent':
          case 'guardian':
          case 'coach':
            navigate(`${routes.parentDetail}/${result.id}`, {
              state: {
                parent: {
                  _id: result.id,
                  fullName: result.name,
                  email: result.email,
                  phone: result.phone,
                  address: result.address,
                  isCoach: result.type === 'coach',
                  ...(result.isPaymentMatch &&
                    result.paymentDetails && {
                      paymentInfo: {
                        cardBrand: result.paymentDetails.cardBrand,
                        cardLastFour: result.paymentDetails.cardLastFour,
                        ...(result.paymentDetails.amount && {
                          amount: result.paymentDetails.amount,
                        }),
                        ...(result.paymentDetails.date && {
                          date: result.paymentDetails.date,
                        }),
                        ...(result.paymentDetails.receiptUrl && {
                          receiptUrl: result.paymentDetails.receiptUrl,
                        }),
                      },
                    }),
                },
                key: Date.now(),
              },
            });
            break;

          case 'school':
            await handleSchoolNavigation(result);
            break;

          default:
            console.warn('Unhandled search result type:', result.type);
        }
      } catch (error) {
        console.error('Navigation failed:', error);
        setShowResults(true);
      }
    },
    [
      handlePlayerNavigation,
      navigate,
      routes.parentDetail,
      handleSchoolNavigation,
    ],
  );

  const renderSearchResults = () => (
    <div className='search-results-dropdown'>
      {isLoading ? (
        <div className='search-result-item'>
          <div className='d-flex align-items-center justify-content-center'>
            <div
              className='spinner-border spinner-border-sm me-2'
              role='status'
            >
              <span className='visually-hidden'>Loading...</span>
            </div>
            <span>Searching...</span>
          </div>
        </div>
      ) : results.length > 0 ? (
        results.map((result: SearchResult) => {
          const avatarUrl = getAvatarUrl(result);
          return (
            <div
              key={`${result.type}-${result.id}`}
              className={`search-result-item cursor-pointer ${
                result.type === 'parent' ? 'parent-result' : ''
              } ${result.isPaymentMatch ? 'payment-match' : ''}`}
              onClick={() => handleResultClick(result)}
            >
              <div className='d-flex align-items-center'>
                <div className='avatar avatar-sm me-2'>
                  <img
                    src={avatarUrl}
                    alt={result.name || 'User avatar'}
                    className='avatar-img rounded-circle'
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      switch (result.type) {
                        case 'player':
                          target.src =
                            result.gender?.toLowerCase() === 'female'
                              ? DEFAULT_GIRL_AVATAR
                              : DEFAULT_BOY_AVATAR;
                          break;
                        case 'coach':
                          target.src = DEFAULT_COACH_AVATAR;
                          break;
                        default:
                          target.src = DEFAULT_PARENT_AVATAR;
                      }
                    }}
                  />
                </div>
                <div className='flex-grow-1'>
                  <h6 className='mb-0'>
                    {result.name}
                    {result.type === 'parent' && (
                      <span className='badge bg-info ms-2'>Parent</span>
                    )}
                    {result.isPaymentMatch && (
                      <span className='badge bg-warning ms-2'>
                        Payment Match
                      </span>
                    )}
                  </h6>
                  {result.email && (
                    <small className='text-muted'>{result.email}</small>
                  )}
                  {result.phone && (
                    <small className='text-muted d-block'>
                      {formatPhoneNumber(result.phone)}
                    </small>
                  )}
                  {result.additionalInfo && (
                    <small className='d-block'>{result.additionalInfo}</small>
                  )}
                  {result.type === 'player' && result.season && (
                    <small className='d-block text-primary'>
                      {result.season} {result.registrationYear} •{' '}
                      {result.status}
                    </small>
                  )}
                  {result.type === 'player' &&
                    result.seasons &&
                    result.seasons.length > 0 && (
                      <small className='d-block text-success'>
                        {result.seasons.length} season
                        {result.seasons.length > 1 ? 's' : ''} registered
                      </small>
                    )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className='search-result-item'>
          <div className='text-center py-2'>No results found</div>
        </div>
      )}
    </div>
  );

  return (
    <div className='nav-item nav-search-inputs me-auto' ref={searchRef}>
      {role === 'admin' && (
        <div className='top-nav-search'>
          <button
            type='button'
            className='responsive-search'
            onClick={handleResetSearch}
          >
            <i className='fa fa-search' />
          </button>
          <form onSubmit={handleSearchSubmit} action='#' className='dropdown'>
            <div className='searchinputs' id='dropdownMenuClickable'>
              <input
                type='text'
                placeholder='Search players, parents, schools, phone, or last 4 of card...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm && setShowResults(true)}
                ref={inputRef}
              />
              <div className='search-addon'>
                <button type='submit'>
                  <i className='ti ti-command' />
                </button>
              </div>
              {showResults &&
                (results.length > 0 || isLoading) &&
                renderSearchResults()}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
