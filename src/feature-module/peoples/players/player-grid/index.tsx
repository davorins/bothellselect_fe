// components/Players/PlayerGrid.tsx
import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { all_routes } from '../../../router/all_routes';
import PredefinedDateRanges from '../../../../core/common/datePicker';
import { useAuth } from '../../../../context/AuthContext';
import {
  usePaginatedPlayers,
  PlayerFilters as PlayerFiltersType,
} from '../../../hooks/usePaginatedPlayers';
import { usePlayerActions } from '../../../hooks/usePlayerActions';
import {
  PlayerFilterParams,
  PlayerTableData,
  PlayerSortOrder,
} from '../../../../types/playerTypes';
import { PlayerListHeader } from '../../../components/Headers/PlayerListHeader';
import { PlayerFilters } from '../../../components/Filters/PlayerFilters';
import { PlayerSortOptions } from '../../../components/Filters/PlayerSortOptions';
import { Moment } from 'moment';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import { debounce } from 'lodash';
import { message, Tabs } from 'antd';
import { getPlayerStatus } from '../../../../utils/season';
import { useDynamicFormFields } from '../../../hooks/useDynamicFormFields';

const { TabPane } = Tabs;

interface PlayerData {
  _id?: string;
  id?: string;
  fullName?: string;
  name?: string;
  gender?: string;
  dob?: string;
  schoolName?: string;
  grade?: string;
  class?: string;
  section?: string;
  aauNumber?: string;
  healthConcerns?: string;
  status?: string;
  paymentStatus?: string;
  paymentComplete?: boolean;
  registrationYear?: number;
  season?: string;
  createdAt?: string;
  updatedAt?: string;
  parentId?: any;
  avatar?: string;
  imgSrc?: string;
  parents?: any[];
  seasons?: any[];
  registrationComplete?: boolean;
  paymentInfo?: any;
  DateofJoin?: string;
  siblings?: any[];
}

interface ExtendedPlayer extends PlayerTableData {
  isOwnPlayer: boolean;
  grade: string;
}

const getAvatarUrl = (
  avatar: string | undefined,
  gender: string | undefined,
): string => {
  if (!avatar) {
    return gender === 'Female'
      ? 'https://partizan-be.onrender.com/uploads/avatars/girl.png'
      : 'https://partizan-be.onrender.com/uploads/avatars/boy.png';
  }
  if (avatar.includes('res.cloudinary.com'))
    return `${avatar}${avatar.includes('?') ? '&' : '?'}${Date.now()}`;
  if (avatar.startsWith('/uploads/'))
    return `https://partizan-be.onrender.com${avatar}`;
  return avatar;
};

const PlayerGrid = () => {
  const routes = all_routes;
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const { currentUser, fetchParentPlayers, fetchAllPlayers } = useAuth();

  const schoolParam = useMemo(() => searchParams.get('school'), [searchParams]);
  const seasonParam = useMemo(() => searchParams.get('season'), [searchParams]);
  const yearParam = useMemo(() => searchParams.get('year'), [searchParams]);

  // ── Dynamic fields ─────────────────────────────────────────────────────────
  const { getVisibleFields: getPlayerVisibleFields } = useDynamicFormFields(
    'player',
    { registrationYear: new Date().getFullYear() },
  );

  const playerVisibleFields = useMemo(
    () => getPlayerVisibleFields({} as any),
    [getPlayerVisibleFields],
  );

  const hasField = (name: string) =>
    playerVisibleFields.some((f) => f.fieldName === name);

  // ── State ──────────────────────────────────────────────────────────────────
  const [userPlayersList, setUserPlayersList] = useState<PlayerData[]>([]);
  const [allPlayersList, setAllPlayersList] = useState<PlayerData[]>([]);
  const [userPlayersLoading, setUserPlayersLoading] = useState(false);
  const [allPlayersLoading, setAllPlayersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('my-players');

  const [localFilters, setLocalFilters] = useState<PlayerFilterParams>(() => ({
    nameFilter: '',
    genderFilter: null,
    gradeFilter: null,
    ageFilter: null,
    statusFilter: null,
    dateRange: null,
    seasonParam: seasonParam || null,
    yearParam: yearParam || null,
    schoolFilter: schoolParam || null,
  }));

  const [localSortOrder, setLocalSortOrder] =
    useState<PlayerSortOrder>('recent');
  const [displayCount, setDisplayCount] = useState(12);
  const itemsPerLoad = 12;

  useEffect(() => {
    setLocalFilters((prev) => ({
      ...prev,
      seasonParam: seasonParam || null,
      yearParam: yearParam || null,
      schoolFilter: schoolParam || null,
    }));
  }, [seasonParam, yearParam, schoolParam]);

  useEffect(() => {
    const loadUserPlayers = async () => {
      const parentId = localStorage.getItem('parentId');
      if (!parentId) return;
      setUserPlayersLoading(true);
      try {
        const players = await fetchParentPlayers(parentId);
        setUserPlayersList(players || []);
      } catch (error) {
        console.error('Error loading user players:', error);
      } finally {
        setUserPlayersLoading(false);
      }
    };
    loadUserPlayers();
  }, [fetchParentPlayers]);

  useEffect(() => {
    const loadAllPlayers = async () => {
      if (currentUser?.role === 'admin' || currentUser?.isCoach) {
        setAllPlayersLoading(true);
        try {
          const players = await fetchAllPlayers();
          setAllPlayersList(players || []);
        } catch (error) {
          console.error('Error loading all players:', error);
        } finally {
          setAllPlayersLoading(false);
        }
      }
    };
    loadAllPlayers();
  }, [currentUser?.role, currentUser?.isCoach, fetchAllPlayers]);

  const debouncedFilterChange = useMemo(
    () =>
      debounce((newFilters: Partial<PlayerFilterParams>) => {
        setLocalFilters((prev) => ({ ...prev, ...newFilters }));
        setDisplayCount(itemsPerLoad);
      }, 300),
    [],
  );

  const buildHookFilters = useCallback((): PlayerFiltersType => {
    let dateFrom: string | undefined;
    let dateTo: string | undefined;

    if (
      localFilters.dateRange &&
      Array.isArray(localFilters.dateRange) &&
      localFilters.dateRange.length === 2
    ) {
      const [start, end] = localFilters.dateRange;
      if (start && start.isValid && start.isValid())
        dateFrom = start.format('YYYY-MM-DD');
      if (end && end.isValid && end.isValid())
        dateTo = end.format('YYYY-MM-DD');
    }

    return {
      search: localFilters.nameFilter || undefined,
      gender: localFilters.genderFilter || undefined,
      grade: localFilters.gradeFilter || undefined,
      age: localFilters.ageFilter ?? undefined,
      status: localFilters.statusFilter || undefined,
      school: localFilters.schoolFilter || undefined,
      season: localFilters.seasonParam || undefined,
      year: localFilters.yearParam
        ? parseInt(localFilters.yearParam)
        : undefined,
      sort: localSortOrder === 'recentlyViewed' ? 'recent' : localSortOrder,
      dateFrom,
      dateTo,
    };
  }, [
    localFilters.nameFilter,
    localFilters.genderFilter,
    localFilters.gradeFilter,
    localFilters.ageFilter,
    localFilters.statusFilter,
    localFilters.schoolFilter,
    localFilters.seasonParam,
    localFilters.yearParam,
    localSortOrder,
    localFilters.dateRange?.[0]?.valueOf(),
    localFilters.dateRange?.[1]?.valueOf(),
  ]);

  const shouldUsePagination =
    currentUser?.role === 'admin' || currentUser?.isCoach;
  const hookFilters = buildHookFilters();

  const gridFilters = useMemo(
    () => ({ ...hookFilters, loadAll: true }),
    [hookFilters],
  );

  const {
    data: paginatedPlayers,
    loading: paginatedLoading,
    error,
    pagination,
    refresh,
  } = usePaginatedPlayers(shouldUsePagination ? gridFilters : {});

  const getPlayersForCurrentView = (): PlayerData[] => {
    if (currentUser?.role === 'admin') return paginatedPlayers || [];
    if (currentUser?.isCoach) {
      if (activeTab === 'my-players') return userPlayersList || [];
      const userPlayerIds = new Set(
        (userPlayersList || [])
          .map((p: PlayerData) => {
            const id = p && (p._id || p.id);
            return id ? id.toString() : '';
          })
          .filter(Boolean),
      );
      return (paginatedPlayers || []).filter((p: PlayerData) => {
        const playerId = p && (p._id || p.id);
        return playerId ? !userPlayerIds.has(playerId.toString()) : true;
      });
    }
    return userPlayersList || [];
  };

  const getLoadingState = (): boolean => {
    if (currentUser?.role === 'admin') return paginatedLoading;
    if (currentUser?.isCoach)
      return activeTab === 'my-players' ? userPlayersLoading : paginatedLoading;
    return userPlayersLoading;
  };

  const players = getPlayersForCurrentView();
  const loading = getLoadingState();

  const { handlePlayerClick } = usePlayerActions();
  const [apiError, setApiError] = useState<string | null>(null);

  const enhancedPlayers = useMemo((): ExtendedPlayer[] => {
    return (players || []).map((player: PlayerData) => {
      const playerId = player?._id || player?.id || '';
      const playerIdStr = playerId.toString();

      const isOwnPlayer = (userPlayersList || []).some((p: PlayerData) => {
        const pId = p?._id || p?.id;
        return pId ? pId.toString() === playerIdStr : false;
      });

      const dateStr =
        player?.createdAt || player?.DateofJoin || new Date().toISOString();

      let age = 0;
      if (player?.dob) {
        try {
          age = Math.floor(
            (Date.now() - new Date(player.dob).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000),
          );
        } catch (e) {
          age = 0;
        }
      }

      const gradeValue = player?.grade || player?.class || 'N/A';

      return {
        id: playerIdStr,
        key: playerIdStr,
        name: player?.fullName || player?.name || 'N/A',
        fullName: player?.fullName || player?.name || 'N/A',
        gender: player?.gender || 'N/A',
        dob: player?.dob || '',
        age,
        section: player?.schoolName || player?.section || 'No School',
        schoolName: player?.schoolName || player?.section || 'No School',
        class: gradeValue,
        grade: gradeValue,
        aauNumber: player?.aauNumber || 'N/A',
        healthConcerns: player?.healthConcerns || 'None',
        status: player?.status || getPlayerStatus(player) || 'Inactive',
        paymentStatus: player?.paymentStatus || 'pending',
        paymentComplete: player?.paymentComplete || false,
        registrationYear: player?.registrationYear || new Date().getFullYear(),
        season: player?.season || '',
        createdAt: player?.createdAt || dateStr,
        updatedAt: player?.updatedAt || dateStr,
        DateofJoin: dateStr,
        parentId: player?.parentId,
        avatar: player?.avatar,
        imgSrc: player?.imgSrc || player?.avatar || '',
        parents: player?.parents || [],
        seasons: player?.seasons || [],
        registrationComplete: player?.registrationComplete || false,
        paymentInfo: player?.paymentInfo,
        siblings: player?.siblings || [],
        isOwnPlayer,
      };
    });
  }, [players, userPlayersList]);

  const filteredPlayers = useMemo((): ExtendedPlayer[] => {
    let filtered = enhancedPlayers;
    const isPaginatedView =
      currentUser?.role === 'admin' ||
      (currentUser?.isCoach && activeTab === 'all-players');

    if (!isPaginatedView) {
      if (localFilters.nameFilter)
        filtered = filtered.filter((p) =>
          p.name
            ?.toLowerCase()
            .includes(localFilters.nameFilter!.toLowerCase()),
        );
      if (localFilters.genderFilter)
        filtered = filtered.filter(
          (p) => p.gender === localFilters.genderFilter,
        );
      if (localFilters.gradeFilter)
        filtered = filtered.filter((p) => p.class === localFilters.gradeFilter);
      if (localFilters.statusFilter)
        filtered = filtered.filter(
          (p) => p.status === localFilters.statusFilter,
        );
      if (localFilters.schoolFilter)
        filtered = filtered.filter((p) =>
          p.section
            ?.toLowerCase()
            .includes(localFilters.schoolFilter!.toLowerCase()),
        );
    }

    return filtered;
  }, [
    enhancedPlayers,
    localFilters,
    currentUser?.role,
    currentUser?.isCoach,
    activeTab,
  ]);

  const sortedPlayers = useMemo((): ExtendedPlayer[] => {
    let sorted = [...filteredPlayers];

    if (localSortOrder === 'asc')
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (localSortOrder === 'desc')
      sorted.sort((a, b) => b.name.localeCompare(a.name));
    else if (localSortOrder === 'recentlyViewed') {
      const recentlyViewed: string[] = JSON.parse(
        localStorage.getItem('recentlyViewed') || '[]',
      );
      sorted = [...sorted].sort((a, b) => {
        const aIdx = recentlyViewed.indexOf(String(a.id));
        const bIdx = recentlyViewed.indexOf(String(b.id));
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    }

    return sorted;
  }, [filteredPlayers, localSortOrder]);

  const playersToDisplay = useMemo(
    () => sortedPlayers.slice(0, displayCount),
    [sortedPlayers, displayCount],
  );

  const statusSummary = useMemo(() => {
    const active = enhancedPlayers.filter((p) => p.status === 'Active').length;
    const pending = enhancedPlayers.filter(
      (p) => p.status === 'Pending Payment',
    ).length;
    const inactive = enhancedPlayers.filter(
      (p) => p.status === 'Inactive',
    ).length;
    return { active, pending, inactive, total: enhancedPlayers.length };
  }, [enhancedPlayers]);

  const getListUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (localFilters.schoolFilter)
      params.set('school', localFilters.schoolFilter);
    if (localFilters.seasonParam)
      params.set('season', localFilters.seasonParam);
    if (localFilters.yearParam) params.set('year', localFilters.yearParam);
    const qs = params.toString();
    return `${all_routes.PlayerList}${qs ? `?${qs}` : ''}`;
  }, [
    localFilters.schoolFilter,
    localFilters.seasonParam,
    localFilters.yearParam,
  ]);

  const handleFilterChange = useCallback(
    (newFilters: Partial<PlayerFilterParams>) => {
      debouncedFilterChange(newFilters);
    },
    [debouncedFilterChange],
  );

  const handleResetFilters = useCallback(() => {
    setLocalFilters({
      nameFilter: '',
      genderFilter: null,
      gradeFilter: null,
      ageFilter: null,
      statusFilter: null,
      dateRange: null,
      seasonParam: null,
      yearParam: null,
      schoolFilter: null,
    });
    setDisplayCount(itemsPerLoad);
    setLocalSortOrder('recent');
    message.info('Filters reset');
  }, []);

  const handleDateRangeChange = useCallback(
    (range: [Moment, Moment] | null) => {
      handleFilterChange({ dateRange: range });
    },
    [handleFilterChange],
  );

  const handleSortChange = useCallback((newSortOrder: PlayerSortOrder) => {
    setLocalSortOrder(newSortOrder);
    setDisplayCount(itemsPerLoad);
  }, []);

  const handleLoadMore = useCallback(() => {
    setDisplayCount((prev) =>
      Math.min(prev + itemsPerLoad, sortedPlayers.length),
    );
  }, [sortedPlayers.length]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setDisplayCount(itemsPerLoad);
  }, []);

  const handlePlayerView = useCallback(
    (player: ExtendedPlayer) => {
      try {
        sessionStorage.setItem('currentPlayerData', JSON.stringify(player));
      } catch (err) {}
      const recentlyViewed: string[] = JSON.parse(
        localStorage.getItem('recentlyViewed') || '[]',
      );
      const updated = [
        String(player.id),
        ...recentlyViewed.filter((id) => id !== String(player.id)),
      ].slice(0, 10);
      localStorage.setItem('recentlyViewed', JSON.stringify(updated));
      handlePlayerClick({
        ...player,
        _id: player.id,
        id: player.id,
        fullName: player.name,
        seasons: player.seasons || [],
      });
    },
    [handlePlayerClick],
  );

  const handleRefresh = useCallback(() => {
    if (
      currentUser?.role === 'admin' ||
      (currentUser?.isCoach && activeTab === 'all-players')
    ) {
      if (refresh) refresh();
    } else {
      const parentId = localStorage.getItem('parentId');
      if (parentId) fetchParentPlayers(parentId).then(setUserPlayersList);
      if (currentUser?.isCoach) fetchAllPlayers().then(setAllPlayersList);
    }
    message.success('Player list refreshed');
  }, [
    currentUser?.role,
    currentUser?.isCoach,
    activeTab,
    refresh,
    fetchParentPlayers,
    fetchAllPlayers,
  ]);

  useEffect(() => {
    if (error) {
      setApiError(error);
      const timer = setTimeout(() => setApiError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    return () => {
      debouncedFilterChange.cancel();
    };
  }, [debouncedFilterChange]);

  if (loading && players.length === 0 && !currentUser?.isCoach)
    return <LoadingSpinner />;
  if (apiError) {
    return (
      <div className='alert alert-danger'>
        <h4>Error Loading Data</h4>
        <p>{apiError}</p>
        <button
          className='btn btn-primary'
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <div className='content content-two'>
        <PlayerListHeader
          seasonParam={localFilters.seasonParam}
          yearParam={localFilters.yearParam}
          playerData={enhancedPlayers}
          onRefresh={handleRefresh}
        />

        {localFilters.schoolFilter && (
          <div className='alert alert-info d-flex align-items-center justify-content-between mb-3'>
            <span>
              <i className='ti ti-school me-2' />
              Showing players from: <strong>{localFilters.schoolFilter}</strong>
            </span>
            <button
              className='btn btn-sm btn-outline-secondary'
              onClick={() => {
                setLocalFilters((prev) => ({ ...prev, schoolFilter: null }));
                setDisplayCount(itemsPerLoad);
              }}
            >
              <i className='ti ti-x me-1' />
              Clear
            </button>
          </div>
        )}

        <div className='bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0'>
          <h4 className='mb-3'></h4>

          {currentUser?.isCoach && currentUser?.role !== 'admin' && (
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              className='mb-0'
            >
              <TabPane
                tab={
                  <span>
                    <i className='ti ti-users me-2' />
                    My Players ({userPlayersList.length})
                  </span>
                }
                key='my-players'
              />
              <TabPane
                tab={
                  <span>
                    <i className='ti ti-world me-2' />
                    All Other Players (
                    {(allPlayersList.length || 0) -
                      (userPlayersList.length || 0)}
                    )
                  </span>
                }
                key='all-players'
              />
            </Tabs>
          )}

          {!currentUser?.isCoach && currentUser?.role !== 'admin' && (
            <h4 className='mb-3'>
              <i className='ti ti-shirt-sport me-2' />
              My Players
            </h4>
          )}

          <div className='d-flex align-items-center flex-wrap'>
            {(currentUser?.role === 'admin' ||
              (currentUser?.isCoach && activeTab === 'all-players')) && (
              <>
                <div className='input-icon-start mb-3 me-2 position-relative'>
                  <PredefinedDateRanges onDateChange={handleDateRangeChange} />
                </div>
                <div className='dropdown mb-3 me-2'>
                  <Link
                    to='#'
                    className='btn btn-outline-light bg-white dropdown-toggle'
                    data-bs-toggle='dropdown'
                    data-bs-auto-close='outside'
                  >
                    <i className='ti ti-filter me-2' />
                    Filter
                  </Link>
                  <div
                    className='dropdown-menu drop-width'
                    ref={dropdownMenuRef}
                  >
                    <PlayerFilters
                      filters={localFilters}
                      onFilterChange={handleFilterChange}
                      onReset={handleResetFilters}
                    />
                  </div>
                </div>
              </>
            )}

            <div className='d-flex align-items-center bg-white border rounded-2 p-1 mb-3 me-2'>
              <Link
                to={getListUrl()}
                className='btn btn-icon btn-sm bg-light me-1 primary-hover'
              >
                <i className='ti ti-list-tree' />
              </Link>
              <Link
                to={all_routes.playerGrid}
                className='active btn btn-icon btn-sm primary-hover'
              >
                <i className='ti ti-grid-dots' />
              </Link>
            </div>

            <div className='dropdown mb-3'>
              <Link
                to='#'
                className='btn btn-outline-light bg-white dropdown-toggle'
                data-bs-toggle='dropdown'
              >
                <i className='ti ti-sort-ascending-2 me-2' />
                {localSortOrder === 'asc'
                  ? 'A-Z'
                  : localSortOrder === 'desc'
                    ? 'Z-A'
                    : localSortOrder === 'recent'
                      ? 'Most Recent'
                      : localSortOrder === 'recentlyViewed'
                        ? 'Recently Viewed'
                        : localSortOrder === 'recentlyUpdated'
                          ? 'Recently Updated'
                          : localSortOrder === 'recentlyAdded'
                            ? 'Recently Added'
                            : 'Sort by'}
              </Link>
              <PlayerSortOptions
                sortOrder={localSortOrder}
                onSortChange={handleSortChange}
              />
            </div>
          </div>
        </div>

        {loading && players.length > 0 && (
          <div className='text-center mb-3'>
            <div
              className='spinner-border spinner-border-sm text-primary'
              role='status'
            >
              <span className='visually-hidden'>Loading...</span>
            </div>
            <span className='ms-2 text-muted'>Updating...</span>
          </div>
        )}

        <div className='row'>
          {playersToDisplay.map((player) => {
            const statusColor =
              player.status === 'Active'
                ? 'success'
                : player.status === 'Pending Payment'
                  ? 'warning'
                  : 'danger';

            const showEdit =
              currentUser?.role === 'admin' ||
              activeTab === 'my-players' ||
              (currentUser?.isCoach && player.isOwnPlayer);

            return (
              <div
                key={player.id}
                className='col-xxl-3 col-xl-4 col-md-6 d-flex'
              >
                <div
                  className={`card flex-fill ${player.isOwnPlayer && activeTab === 'all-players' ? 'border-warning border-2' : ''}`}
                >
                  <div className='card-header d-flex align-items-center justify-content-between'>
                    <div className='d-flex align-items-center gap-2'>
                      <span>Player</span>
                    </div>
                    <div className='d-flex align-items-center gap-2'>
                      {player.isOwnPlayer && activeTab === 'all-players' && (
                        <span
                          className='badge badge-soft-warning'
                          title='Your Player'
                        >
                          <i className='ti ti-star me-1' />
                          Your Player
                        </span>
                      )}
                      <span
                        className={`badge badge-soft-${statusColor} d-inline-flex align-items-center`}
                        title={`Status: ${player.status}`}
                      >
                        <i
                          className={`ti ti-circle-filled fs-5 me-1 text-${statusColor}`}
                        />
                        {player.status}
                      </span>
                    </div>
                  </div>
                  <div className='card-body'>
                    <div
                      className={`rounded-2 p-3 mb-3 ${player.isOwnPlayer && activeTab === 'all-players' ? 'bg-warning bg-opacity-10' : 'bg-light-300'}`}
                    >
                      <div className='d-flex align-items-center'>
                        <div
                          onClick={() => handlePlayerView(player)}
                          className='avatar avatar-lg flex-shrink-0 cursor-pointer'
                        >
                          <img
                            src={getAvatarUrl(
                              player.imgSrc || player.avatar,
                              player.gender,
                            )}
                            className='img-fluid rounded-circle'
                            alt={player.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = getAvatarUrl(
                                undefined,
                                player.gender,
                              );
                            }}
                          />
                        </div>
                        <div className='ms-2 flex-grow-1'>
                          <h5 className='mb-0'>
                            <span
                              className={`cursor-pointer ${player.isOwnPlayer && activeTab === 'all-players' ? 'text-warning fw-bold' : 'text-primary'}`}
                              onClick={() => handlePlayerView(player)}
                            >
                              {player.name}
                            </span>
                          </h5>
                          <p className='mb-1 text-muted small'>
                            {/* Gender — gated */}
                            {hasField('gender') &&
                              player.gender &&
                              player.gender !== 'N/A' && (
                                <span className='me-2'>{player.gender}</span>
                              )}
                            {/* Age derived from dob — gated on dob */}
                            {hasField('dob') && player.age > 0 && (
                              <span className='me-2'>Age {player.age}</span>
                            )}
                          </p>
                          <p className='mb-1 text-muted small'>
                            {/* School — gated */}
                            {hasField('schoolName') &&
                              player.section &&
                              player.section !== 'No School' && (
                                <span className='me-2'>
                                  <i className='ti ti-school me-1' />
                                  {player.section}
                                </span>
                              )}
                            {/* Grade — gated */}
                            {hasField('grade') &&
                              player.class &&
                              player.class !== 'N/A' && (
                                <span>Grade {player.class}</span>
                              )}
                          </p>
                          <div className='d-flex gap-2 mt-1 flex-wrap'>
                            {/* AAU — gated */}
                            {hasField('aauNumber') &&
                              player.aauNumber &&
                              player.aauNumber !== 'N/A' && (
                                <small className='text-muted'>
                                  AAU: {player.aauNumber}
                                </small>
                              )}
                            {player.seasons && player.seasons.length > 0 && (
                              <small className='text-muted'>
                                {player.seasons.length} season
                                {player.seasons.length > 1 ? 's' : ''}
                              </small>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Inline action buttons — matching parent/coach grid style */}
                    <div className='d-flex align-items-center gap-2'>
                      <button
                        onClick={() => handlePlayerView(player)}
                        className='btn btn-sm btn-icon btn-outline-secondary'
                        title='View Details'
                        style={{ width: '32px', height: '32px' }}
                      >
                        <i className='ti ti-eye fs-16' />
                      </button>
                      {showEdit && (
                        <Link
                          to={`${routes.editPlayer}/${player.id}`}
                          state={{
                            player: {
                              ...player,
                              playerId: player.id,
                              _id: player.id,
                              fullName: player.name,
                              seasons: player.seasons || [],
                            },
                            from: location.pathname,
                          }}
                          className='btn btn-sm btn-icon btn-outline-warning'
                          title='Edit'
                          style={{ width: '32px', height: '32px' }}
                        >
                          <i className='ti ti-edit fs-16' />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {playersToDisplay.length < sortedPlayers.length && (
            <div className='col-md-12 text-center'>
              <button className='btn btn-primary' onClick={handleLoadMore}>
                <i className='ti ti-loader-3 me-2' />
                Load More ({playersToDisplay.length} of {sortedPlayers.length})
              </button>
            </div>
          )}

          {playersToDisplay.length === 0 && !loading && (
            <div className='col-md-12 text-center'>
              <div className='alert alert-info'>
                <h5>No Players Found</h5>
                <p>Try adjusting your filters or search criteria.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PlayerGrid);
