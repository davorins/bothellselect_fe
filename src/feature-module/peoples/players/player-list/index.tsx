// feature-module/peoples/players/player-list/index.tsx
import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { Table, Alert, message, Tabs } from 'antd';
import { PlayerListHeader } from '../../../components/Headers/PlayerListHeader';
import { PlayerFilters } from '../../../components/Filters/PlayerFilters';
import { PlayerSortOptions } from '../../../components/Filters/PlayerSortOptions';
import {
  getPlayerTableColumns,
  PlayerTableSkeleton,
} from '../../../components/Tables/PlayerTableColumns';
import { usePlayerActions } from '../../../hooks/usePlayerActions';
import {
  usePaginatedPlayers,
  PlayerFilters as PlayerFiltersType,
} from '../../../hooks/usePaginatedPlayers';
import {
  PlayerFilterParams,
  PlayerSortOrder,
  PlayerTableData,
} from '../../../../types/playerTypes';
import PredefinedDateRanges from '../../../../core/common/datePicker';
import { useAuth } from '../../../../context/AuthContext';
import { all_routes } from '../../../router/all_routes';
import { Moment } from 'moment';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import { debounce } from 'lodash';
import { getPlayerStatus } from '../../../../utils/season';

// Define the structure that matches PlayerTableData
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

// Extend PlayerTableData to add our custom properties
interface ExtendedPlayer extends PlayerTableData {
  isOwnPlayer: boolean;
  grade: string;
}

const { TabPane } = Tabs;

const PlayerList = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const { currentUser, fetchParentPlayers, fetchAllPlayers } = useAuth();

  const seasonParam = useMemo(() => searchParams.get('season'), [searchParams]);
  const yearParam = useMemo(() => searchParams.get('year'), [searchParams]);
  const schoolParam = useMemo(() => searchParams.get('school'), [searchParams]);

  const { handlePlayerClick } = usePlayerActions();

  // ── State for regular users ────────────────────────────────────────────────
  const [userPlayersList, setUserPlayersList] = useState<PlayerData[]>([]);
  const [allPlayersList, setAllPlayersList] = useState<PlayerData[]>([]);
  const [userPlayersLoading, setUserPlayersLoading] = useState(false);
  const [allPlayersLoading, setAllPlayersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('my-players');

  // ── Filter state ───────────────────────────────────────────────────────────
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

  // ✅ pageSize as state so changing it triggers a new API request
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [tableLoading, setTableLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ── Load user's own players ────────────────────────────────────────────────
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
        setApiError('Failed to load your players. Please try again.');
      } finally {
        setUserPlayersLoading(false);
      }
    };

    loadUserPlayers();
  }, [fetchParentPlayers]);

  // ── Load all players for coaches ───────────────────────────────────────────
  useEffect(() => {
    const loadAllPlayers = async () => {
      // If user is admin OR (coach with isCoach flag), load all players
      if (currentUser?.role === 'admin' || currentUser?.isCoach) {
        setAllPlayersLoading(true);
        try {
          const players = await fetchAllPlayers();
          setAllPlayersList(players || []);
        } catch (error) {
          console.error('Error loading all players:', error);
          setApiError('Failed to load all players. Please try again.');
        } finally {
          setAllPlayersLoading(false);
        }
      }
    };

    loadAllPlayers();
  }, [currentUser?.role, currentUser?.isCoach, fetchAllPlayers]);

  // ── Debounced filter change ────────────────────────────────────────────────
  const debouncedFilterChange = useMemo(
    () =>
      debounce((newFilters: Partial<PlayerFilterParams>) => {
        setLocalFilters((prev) => ({ ...prev, ...newFilters }));
        // Reset to first page when filters change
        setCurrentPage(1);
      }, 300),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedFilterChange.cancel();
    };
  }, [debouncedFilterChange]);

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
      seasonParam: seasonParam || null,
      yearParam: yearParam || null,
      schoolFilter: null,
    });
    setLocalSortOrder('recent');
    setCurrentPage(1);
    message.info('Filters reset');
  }, [seasonParam, yearParam]);

  const handleDateRangeChange = useCallback(
    (range: [Moment, Moment] | null) => {
      handleFilterChange({ dateRange: range });
    },
    [handleFilterChange],
  );

  const handleSortChange = useCallback((newSortOrder: PlayerSortOrder) => {
    setLocalSortOrder(newSortOrder);
    setCurrentPage(1);
  }, []);

  // ── Build filters for the hook (for admin and coach) ─────────────────────
  const buildHookFilters = useCallback((): PlayerFiltersType => {
    let dateFrom: string | undefined;
    let dateTo: string | undefined;

    if (
      localFilters.dateRange &&
      Array.isArray(localFilters.dateRange) &&
      localFilters.dateRange.length === 2
    ) {
      const [start, end] = localFilters.dateRange;
      if (start && start.isValid && start.isValid()) {
        dateFrom = start.format('YYYY-MM-DD');
      }
      if (end && end.isValid && end.isValid()) {
        dateTo = end.format('YYYY-MM-DD');
      }
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
      sort: localSortOrder || undefined,
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

  // ── Paginated data (for admin and coach) ───────────────────────────────────
  const shouldUsePagination =
    currentUser?.role === 'admin' || currentUser?.isCoach;

  const hookFilters = buildHookFilters();

  const {
    data: paginatedPlayers,
    loading: paginatedLoading,
    error: paginatedError,
    pagination,
    refresh,
    goToPage,
  } = usePaginatedPlayers(
    shouldUsePagination ? hookFilters : {},
    shouldUsePagination ? pageSize : 10,
  );

  // ── Determine which players to show based on role and active tab ───────────
  const getPlayersForCurrentView = (): PlayerData[] => {
    // Admin always sees paginated data
    if (currentUser?.role === 'admin') {
      return paginatedPlayers || [];
    }

    // Coach/Parent with isCoach flag
    if (currentUser?.isCoach) {
      if (activeTab === 'my-players') {
        // For "My Players" tab, we still use client-side filtering/pagination
        return userPlayersList || [];
      } else {
        // For "All Other Players" tab, use paginated data
        // Filter out user's own players from all players list
        const userPlayerIds = new Set(
          (userPlayersList || [])
            .map((p: PlayerData) => {
              const id = p && (p._id || p.id);
              return id ? id.toString() : '';
            })
            .filter(Boolean),
        );

        // Properly type the filter parameter
        return (paginatedPlayers || []).filter((p: PlayerData) => {
          const playerId = p && (p._id || p.id);
          return playerId ? !userPlayerIds.has(playerId.toString()) : true;
        });
      }
    }

    // Regular parent - only see their own players
    return userPlayersList || [];
  };

  const getLoadingState = (): boolean => {
    if (currentUser?.role === 'admin') {
      return paginatedLoading;
    }

    if (currentUser?.isCoach) {
      if (activeTab === 'my-players') {
        return userPlayersLoading;
      } else {
        return paginatedLoading;
      }
    }

    return userPlayersLoading;
  };

  const players = getPlayersForCurrentView();
  const loading = getLoadingState();
  const error = currentUser?.role === 'admin' ? paginatedError : null;

  // ── Transform to PlayerTableData format ───────────────────────────────────
  const enhancedPlayers = useMemo((): ExtendedPlayer[] => {
    return (players || []).map((player: PlayerData) => {
      // Safely get player ID
      const playerId = player?._id || player?.id || '';
      const playerIdStr = playerId.toString();

      // Check if this is the user's own player
      const isOwnPlayer = (userPlayersList || []).some((p: PlayerData) => {
        const pId = p?._id || p?.id;
        return pId ? pId.toString() === playerIdStr : false;
      });

      // Create a date for DateofJoin
      const dateStr =
        player?.createdAt || player?.DateofJoin || new Date().toISOString();

      // Calculate age if DOB exists
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

      // Get grade value
      const gradeValue = player?.grade || player?.class || 'N/A';

      return {
        id: playerIdStr,
        key: playerIdStr,
        name: player?.fullName || player?.name || 'N/A',
        fullName: player?.fullName || player?.name || 'N/A',
        gender: player?.gender || 'N/A',
        dob: player?.dob || '',
        age: age,
        section: player?.schoolName || player?.section || 'No School',
        schoolName: player?.schoolName || player?.section || 'No School',
        class: gradeValue,
        grade: gradeValue,
        aauNumber: player?.aauNumber || 'N/A',
        healthConcerns: player?.healthConcerns || 'None',
        status: player?.status || 'Inactive',
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

  // Client-side filtering for non-paginated views
  const filteredPlayers = useMemo((): ExtendedPlayer[] => {
    let filtered = enhancedPlayers;

    // Apply client-side filters for non-paginated views
    const isPaginatedView =
      currentUser?.role === 'admin' ||
      (currentUser?.isCoach && activeTab === 'all-players');

    if (!isPaginatedView) {
      if (localFilters.nameFilter) {
        filtered = filtered.filter((p) =>
          p.name
            ?.toLowerCase()
            .includes(localFilters.nameFilter!.toLowerCase()),
        );
      }
      if (localFilters.genderFilter) {
        filtered = filtered.filter(
          (p) => p.gender === localFilters.genderFilter,
        );
      }
      if (localFilters.gradeFilter) {
        // Use 'class' instead of 'grade' since that's what's in PlayerTableData
        filtered = filtered.filter((p) => p.class === localFilters.gradeFilter);
      }
      if (localFilters.statusFilter) {
        filtered = filtered.filter(
          (p) => p.status === localFilters.statusFilter,
        );
      }
      if (localFilters.schoolFilter) {
        filtered = filtered.filter((p) =>
          p.section
            ?.toLowerCase()
            .includes(localFilters.schoolFilter!.toLowerCase()),
        );
      }
    }

    return filtered;
  }, [
    enhancedPlayers,
    localFilters,
    currentUser?.role,
    currentUser?.isCoach,
    activeTab,
  ]);

  const dataSource = useMemo((): ExtendedPlayer[] => {
    let sorted = [...filteredPlayers];

    // Apply sorting for all views
    if (localSortOrder === 'asc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (localSortOrder === 'desc') {
      sorted.sort((a, b) => b.name.localeCompare(a.name));
    }

    if (localSortOrder === 'recentlyViewed') {
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

    // Apply client-side pagination for non-paginated views
    const isPaginatedView =
      currentUser?.role === 'admin' ||
      (currentUser?.isCoach && activeTab === 'all-players');

    if (!isPaginatedView && pageSize) {
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;
      return sorted.slice(start, end);
    }

    return sorted;
  }, [
    filteredPlayers,
    localSortOrder,
    currentPage,
    pageSize,
    currentUser?.role,
    currentUser?.isCoach,
    activeTab,
  ]);

  const totalCount = useMemo((): number => {
    const isPaginatedView =
      currentUser?.role === 'admin' ||
      (currentUser?.isCoach && activeTab === 'all-players');

    if (isPaginatedView && pagination) {
      return pagination.total;
    }

    return filteredPlayers.length;
  }, [
    filteredPlayers.length,
    pagination,
    currentUser?.role,
    currentUser?.isCoach,
    activeTab,
  ]);

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

  const columns = useMemo(() => {
    try {
      const cols = getPlayerTableColumns({
        handlePlayerClick,
        location,
        loading: loading && players.length === 0,
        currentUserRole: currentUser?.role,
        isCoach: currentUser?.isCoach,
        activeTab: activeTab,
      });
      return Array.isArray(cols) ? cols : [];
    } catch (error) {
      console.error('Error generating columns:', error);
      return [];
    }
  }, [
    handlePlayerClick,
    location,
    loading,
    players.length,
    currentUser?.role,
    currentUser?.isCoach,
    activeTab,
  ]);

  // ── Helper to build grid URL preserving current filters ───────────────────
  const getGridUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (localFilters.schoolFilter)
      params.set('school', localFilters.schoolFilter);
    if (localFilters.seasonParam)
      params.set('season', localFilters.seasonParam);
    if (localFilters.yearParam) params.set('year', localFilters.yearParam);
    const qs = params.toString();
    return `${all_routes.playerGrid}${qs ? `?${qs}` : ''}`;
  }, [
    localFilters.schoolFilter,
    localFilters.seasonParam,
    localFilters.yearParam,
  ]);

  // ── Callbacks ──────────────────────────────────────────────────────────────
  const handleTableChange = useCallback(
    (newPagination: any) => {
      const isPaginatedView =
        currentUser?.role === 'admin' ||
        (currentUser?.isCoach && activeTab === 'all-players');

      if (!isPaginatedView) {
        // Handle client-side pagination
        const newPage = newPagination.current;
        const newPageSize = newPagination.pageSize;

        setTableLoading(true);
        setCurrentPage(newPage);

        if (newPageSize !== pageSize) {
          setPageSize(newPageSize);
          setCurrentPage(1);
        }

        setTimeout(() => setTableLoading(false), 300);
        return;
      }

      // Handle server-side pagination
      const newPageSize = newPagination.pageSize;
      const newPage = newPagination.current;

      setTableLoading(true);

      if (newPageSize !== pageSize) {
        setPageSize(newPageSize);
        if (goToPage) {
          goToPage(1);
        }
        setCurrentPage(1);
      } else {
        if (goToPage) {
          goToPage(newPage);
        }
        setCurrentPage(newPage);
      }

      setTimeout(() => setTableLoading(false), 300);
    },
    [goToPage, pageSize, currentUser?.role, currentUser?.isCoach, activeTab],
  );

  const handleRefresh = useCallback(() => {
    if (
      currentUser?.role === 'admin' ||
      (currentUser?.isCoach && activeTab === 'all-players')
    ) {
      if (refresh) refresh();
    } else {
      const parentId = localStorage.getItem('parentId');
      if (parentId) {
        fetchParentPlayers(parentId).then(setUserPlayersList);
      }
      if (currentUser?.isCoach) {
        fetchAllPlayers().then(setAllPlayersList);
      }
    }
    message.success('Refreshing players...');
  }, [
    currentUser?.role,
    currentUser?.isCoach,
    activeTab,
    refresh,
    fetchParentPlayers,
    fetchAllPlayers,
  ]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
    // Reset to first page when switching tabs
  }, []);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (error) {
      setApiError(error);
      const timer = setTimeout(() => setApiError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Sync URL params into filter state
  useEffect(() => {
    setLocalFilters((prev) => ({
      ...prev,
      seasonParam: seasonParam || null,
      yearParam: yearParam || null,
      schoolFilter: schoolParam || null,
    }));
  }, [seasonParam, yearParam, schoolParam]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading && players.length === 0 && !currentUser?.isCoach) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div className='card'>
            <div className='card-body'>
              <div className='text-center p-4'>
                <LoadingSpinner />
                <p className='mt-3 text-muted'>Loading players...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (apiError && players.length === 0) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
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
        </div>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <PlayerListHeader
          seasonParam={seasonParam}
          yearParam={yearParam}
          playerData={enhancedPlayers}
          onRefresh={handleRefresh}
        />

        {/* Show active school filter banner */}
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
                setCurrentPage(1);
              }}
            >
              <i className='ti ti-x me-1' />
              Clear
            </button>
          </div>
        )}

        <div className='card'>
          <div className='card-header d-flex align-items-center justify-content-between flex-wrap pb-0'>
            <h4 className='mb-3'></h4>
            {/* Tabs for Coach View */}
            {currentUser?.isCoach && currentUser?.role !== 'admin' && (
              <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                className='mb-0'
              >
                <TabPane
                  tab={
                    <span>
                      <i className='ti ti-shirt-sport me-2' />
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

            <div className='d-flex align-items-center flex-wrap'>
              {/* Show filters for admin OR (coach with all-players tab) */}
              {(currentUser?.role === 'admin' ||
                (currentUser?.isCoach && activeTab === 'all-players')) && (
                <>
                  <div className='input-icon-start mb-3 me-2 position-relative'>
                    <PredefinedDateRanges
                      onDateChange={handleDateRangeChange}
                    />
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
                  to={all_routes.PlayerList}
                  className='active btn btn-icon btn-sm me-1 primary-hover'
                >
                  <i className='ti ti-list-tree' />
                </Link>
                {/* Preserve school/season/year params when switching to grid */}
                <Link
                  to={getGridUrl()}
                  className='btn btn-icon btn-sm bg-light primary-hover'
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
                        : 'Sort by'}
                </Link>
                <PlayerSortOptions
                  sortOrder={localSortOrder}
                  onSortChange={handleSortChange}
                />
              </div>
            </div>
          </div>

          <div className='card-body p-0 py-3'>
            {loading && players.length > 0 && (
              <div className='alert alert-info mb-3 mx-3'>
                <i className='ti ti-loader me-2'></i>
                Updating players... Please wait.
              </div>
            )}

            {loading && players.length === 0 ? (
              <PlayerTableSkeleton rows={10} />
            ) : (
              <>
                {/* Safety check for columns */}
                {columns && columns.length > 0 ? (
                  <Table
                    dataSource={dataSource}
                    columns={
                      activeTab === 'all-players'
                        ? columns.map((col) => {
                            // Create a new column object with onCell
                            const newCol: any = { ...col };
                            newCol.onCell = (record: ExtendedPlayer) => ({
                              style: record?.isOwnPlayer
                                ? {
                                    backgroundColor: '#fff3e0',
                                    fontWeight: 'bold' as const,
                                  }
                                : {},
                            });
                            return newCol;
                          })
                        : columns
                    }
                    rowKey='id'
                    pagination={{
                      current: currentPage,
                      pageSize: pageSize,
                      total: totalCount,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50', '100'],
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} players`,
                    }}
                    onChange={handleTableChange}
                    loading={tableLoading}
                    scroll={{ x: true }}
                  />
                ) : (
                  <div className='text-center p-4'>
                    <i className='ti ti-database fs-1 text-muted mb-3'></i>
                    <p className='text-muted'>Unable to load table columns</p>
                    <button
                      className='btn btn-primary btn-sm'
                      onClick={() => window.location.reload()}
                    >
                      Refresh Page
                    </button>
                  </div>
                )}
              </>
            )}

            {apiError && (
              <Alert
                message='Error'
                description={apiError}
                type='error'
                showIcon
                closable
                onClose={() => setApiError(null)}
                className='mt-3 mx-3'
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PlayerList);
