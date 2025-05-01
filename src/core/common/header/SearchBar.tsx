import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { all_routes } from '../../../feature-module/router/all_routes';
import { useAuth } from '../../../context/AuthContext';
import { SearchResult } from '../../../types/types';
import { useParentActions } from '../../../feature-module/hooks/useParentActions';

const DEFAULT_AVATAR =
  'https://bothell-select.onrender.com/uploads/avatars/parents.png';

interface SearchBarProps {
  role?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ role }) => {
  const { searchAll, fetchGuardians } = useAuth();
  const { handleParentClick } = useParentActions(); // Use the hook
  const navigate = useNavigate();
  const routes = all_routes;

  // Search related state
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarMap, setAvatarMap] = useState<{ [id: string]: string }>({});

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

  const updateRecentlyViewed = (id: string) => {
    let recentlyViewed = JSON.parse(
      localStorage.getItem('recentlyViewed') || '[]'
    );
    recentlyViewed = [
      id,
      ...recentlyViewed.filter((storedId: string) => storedId !== id),
    ].slice(0, 5);
    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
  };

  const handlePlayerNavigation = useCallback(
    async (result: SearchResult) => {
      try {
        const guardians = await fetchGuardians(result.id);
        updateRecentlyViewed(result.id);

        navigate(`${routes.playerDetail}/${result.id}`, {
          state: {
            player: {
              _id: result.id,
              fullName: result.name,
              gender: result.gender || '',
              grade: result.grade || '',
              dob: result.dob || '',
              aauNumber: result.aauNumber || '',
              ...(result.additionalInfo && {
                schoolName: result.additionalInfo,
              }),
              createdAt: result.createdAt,
            },
            guardians,
            fromSearch: true,
          },
        });
      } catch (err) {
        console.error('Error fetching guardians:', err);
        navigate(`${routes.playerDetail}/${result.id}`, {
          state: { fromSearch: true },
        });
      }
    },
    [fetchGuardians, navigate, routes.playerDetail]
  );

  const handleSchoolNavigation = useCallback(
    (result: SearchResult) => {
      const schoolPath = `${routes.playerList}?school=${encodeURIComponent(
        result.name
      )}`;
      navigate(schoolPath, {
        state: { searchFilter: result.name },
      });
    },
    [navigate, routes.playerList]
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
            // Ensure we're passing the full SearchResult object
            await handleParentClick({
              ...result,
              _id: result.id, // Map id to _id if needed by your backend
              parentId: result.id, // Ensure parentId is set
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
    [handlePlayerNavigation, handleParentClick, handleSchoolNavigation]
  );

  const fetchAvatarForResult = useCallback(
    async (result: SearchResult) => {
      if (avatarMap[result.id]) return;

      let avatarUrl = result.image || DEFAULT_AVATAR;

      if (!result.image?.startsWith('http') && result.image) {
        avatarUrl = `https://bothell-select.onrender.com${result.image}`;
      }

      setAvatarMap((prev) => ({ ...prev, [result.id]: avatarUrl }));
    },
    [avatarMap]
  );

  useEffect(() => {
    results.forEach((result) => {
      fetchAvatarForResult(result);
    });
  }, [results, fetchAvatarForResult]);

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
        results.map((result: SearchResult) => (
          <div
            key={`${result.type}-${result.id}`}
            className={`search-result-item cursor-pointer ${
              result.type === 'parent' ? 'parent-result' : ''
            }`}
            onClick={() => handleResultClick(result)}
          >
            <div className='d-flex align-items-center'>
              {result.image && (
                <div className='avatar avatar-sm me-2'>
                  <img
                    src={avatarMap[result.id] || DEFAULT_AVATAR}
                    alt={result?.name || 'User avatar'}
                    className='avatar avatar-sm me-2'
                  />
                </div>
              )}
              <div>
                <h6 className='mb-0'>
                  {result.name}
                  {result.type === 'parent' && (
                    <span className='badge bg-info ms-2'>Parent</span>
                  )}
                </h6>
                {result.email && (
                  <small className='text-muted'>{result.email}</small>
                )}
                {result.additionalInfo && (
                  <small className='d-block'>{result.additionalInfo}</small>
                )}
              </div>
            </div>
          </div>
        ))
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
                placeholder='Search players, parents, schools...'
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
