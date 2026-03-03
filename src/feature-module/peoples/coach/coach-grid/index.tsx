import React, {
  useRef,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import { all_routes } from '../../../router/all_routes';
import PredefinedDateRanges from '../../../../core/common/datePicker';
import { useAuth } from '../../../../context/AuthContext';
import { useCoachData } from '../../../hooks/useCoachData';
import { useCoachActions } from '../../../hooks/useCoachActions';
import {
  filterCoachData,
  sortCoachData,
  ExtendedCoachRecord,
} from '../../../../utils/coachUtils';
import {
  CoachFilterParams,
  CoachSortOrder,
} from '../../../../types/coachTypes';
import { CoachListHeader } from '../../../components/Headers/CoachListHeader';
import { CoachFilters } from '../../../components/Filters/CoachFilters';
import { CoachSortOptions } from '../../../components/Filters/CoachSortOptions';
import { Moment } from 'moment';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import { debounce } from 'lodash';
import { message } from 'antd';
import { getAvatarUrl, getDefaultAvatar } from '../../../../utils/r2Utils';

const DEFAULT_COACH_AVATAR = getDefaultAvatar('coach');

const CoachGrid = () => {
  const routes = all_routes;
  const location = useLocation();
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const { currentUser } = useAuth();

  // Filter states
  const [filters, setFilters] = useState<CoachFilterParams>({
    nameFilter: '',
    emailFilter: '',
    phoneFilter: '',
    statusFilter: null,
    aauNumberFilter: '',
    dateRange: null,
  });

  const [sortOrder, setSortOrder] = useState<CoachSortOrder>(null);
  const [displayCount, setDisplayCount] = useState(12);
  const itemsPerLoad = 12;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Convert local filters to hook filters
  const hookFilters = useMemo(() => {
    return {
      name: filters.nameFilter || undefined,
      email: filters.emailFilter || undefined,
      phone: filters.phoneFilter || undefined,
      status: filters.statusFilter || undefined,
      aauNumber: filters.aauNumberFilter || undefined,
      sort: sortOrder || undefined,
    };
  }, [
    filters.nameFilter,
    filters.emailFilter,
    filters.phoneFilter,
    filters.statusFilter,
    filters.aauNumberFilter,
    sortOrder,
  ]);

  // Use the paginated hook
  const {
    data: coaches,
    loading,
    error,
    pagination,
    refresh,
  } = useCoachData(hookFilters, 50); // Load more items for grid view

  const { handleCoachClick } = useCoachActions();

  // Debounced filter change handler
  const debouncedFilterChange = useMemo(
    () =>
      debounce((newFilters: Partial<CoachFilterParams>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setDisplayCount(itemsPerLoad);
      }, 300),
    [],
  );

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedFilterChange.cancel();
    };
  }, [debouncedFilterChange]);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilters: Partial<CoachFilterParams>) => {
      debouncedFilterChange(newFilters);
    },
    [debouncedFilterChange],
  );

  const handleResetFilters = useCallback(() => {
    setFilters({
      nameFilter: '',
      emailFilter: '',
      phoneFilter: '',
      statusFilter: null,
      aauNumberFilter: '',
      dateRange: null,
    });
    setSortOrder(null);
    setDisplayCount(itemsPerLoad);
    message.info('Filters reset');
  }, []);

  const handleDateRangeChange = useCallback(
    (range: [Moment, Moment] | null) => {
      handleFilterChange({ dateRange: range });
    },
    [handleFilterChange],
  );

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setDisplayCount(itemsPerLoad);
    setIsRefreshing(false);
    message.success('Coach list refreshed');
  }, [refresh]);

  // Handle API errors
  useEffect(() => {
    if (error) {
      setApiError(error);
      const timer = setTimeout(() => setApiError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Get coaches to display based on current display count
  const coachesToDisplay = useMemo(() => {
    return coaches.slice(0, displayCount);
  }, [coaches, displayCount]);

  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + itemsPerLoad, coaches.length));
  };

  // Status summary
  const statusSummary = useMemo(() => {
    const active = coaches.filter(
      (c: ExtendedCoachRecord) => c.status === 'Active',
    ).length;
    const inactive = coaches.filter(
      (c: ExtendedCoachRecord) => c.status === 'Inactive',
    ).length;
    return { active, inactive, total: coaches.length };
  }, [coaches]);

  // Loading state
  const isLoading = loading && coaches.length === 0;

  if (isLoading) return <LoadingSpinner />;
  if (apiError && coaches.length === 0) return <div>Error: {apiError}</div>;

  return (
    <>
      <div className='page-wrapper'>
        <div className='content content-two'>
          <CoachListHeader
            seasonParam={null}
            yearParam={null}
            coachData={coaches}
            onRefresh={handleRefresh}
          />
          <div className='bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0'>
            <h4 className='mb-3'>Coaches Grid</h4>
            <div className='d-flex align-items-center flex-wrap'>
              {currentUser?.role === 'admin' && (
                <div className='input-icon-start mb-3 me-2 position-relative'>
                  <PredefinedDateRanges onDateChange={handleDateRangeChange} />
                </div>
              )}

              {currentUser?.role === 'admin' && (
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
                    <CoachFilters
                      filters={filters}
                      onFilterChange={handleFilterChange}
                      onReset={handleResetFilters}
                    />
                  </div>
                </div>
              )}

              <div className='d-flex align-items-center bg-white border rounded-2 p-1 mb-3 me-2'>
                <Link
                  to={routes.coachList}
                  className='btn btn-icon btn-sm me-1 bg-light primary-hover'
                >
                  <i className='ti ti-list-tree' />
                </Link>
                <Link
                  to={routes.coachGrid}
                  className='active btn btn-icon btn-sm primary-hover'
                >
                  <i className='ti ti-grid-dots' />
                </Link>
              </div>

              {currentUser?.role === 'admin' && (
                <div className='dropdown mb-3'>
                  <Link
                    to='#'
                    className='btn btn-outline-light bg-white dropdown-toggle'
                    data-bs-toggle='dropdown'
                  >
                    <i className='ti ti-sort-ascending-2 me-2' />
                    {sortOrder === 'asc'
                      ? 'A-Z'
                      : sortOrder === 'desc'
                        ? 'Z-A'
                        : sortOrder === 'recentlyAdded'
                          ? 'Recently Added'
                          : sortOrder === 'aauNumber'
                            ? 'AAU Number'
                            : 'Sort by'}
                  </Link>
                  <CoachSortOptions
                    sortOrder={sortOrder}
                    onSortChange={setSortOrder}
                  />
                </div>
              )}
            </div>
          </div>

          {isRefreshing && (
            <div className='text-center mb-3'>
              <div className='spinner-border text-primary' role='status'>
                <span className='visually-hidden'>Refreshing...</span>
              </div>
            </div>
          )}

          {loading && coaches.length > 0 && (
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
            {coachesToDisplay.map((coach: ExtendedCoachRecord) => {
              const coachAvatar = getAvatarUrl(
                coach.imgSrc || coach.avatar,
                DEFAULT_COACH_AVATAR,
              );
              const statusColor =
                coach.status === 'Active' ? 'success' : 'danger';

              return (
                <div
                  key={coach._id}
                  className='col-xxl-3 col-xl-4 col-md-6 d-flex'
                >
                  <div className='card flex-fill'>
                    <div className='card-header d-flex align-items-center justify-content-between'>
                      <span className='text-primary'>
                        AAU: {coach.aauNumber || 'N/A'}
                      </span>
                      <div className='d-flex align-items-center'>
                        <span
                          className={`badge badge-soft-${statusColor} d-inline-flex align-items-center me-1`}
                          title={`Status: ${coach.status}`}
                        >
                          <i
                            className={`ti ti-circle-filled fs-5 me-1 text-${statusColor}`}
                          />
                          {coach.status || 'Active'}
                        </span>
                        <div className='dropdown'>
                          <Link
                            to='#'
                            className='btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0'
                            data-bs-toggle='dropdown'
                            aria-expanded='false'
                          >
                            <i className='ti ti-dots-vertical fs-14' />
                          </Link>
                          <ul className='dropdown-menu dropdown-menu-right p-3'>
                            <li>
                              <div
                                className='dropdown-item rounded-1 cursor-pointer'
                                onClick={() => handleCoachClick(coach)}
                              >
                                <i className='ti ti-menu me-2' />
                                View
                              </div>
                            </li>
                            <li>
                              <Link
                                to={`${routes.editCoach}/${coach._id}`}
                                state={{
                                  coach,
                                  from: location.pathname,
                                }}
                                className='dropdown-item rounded-1'
                              >
                                <i className='ti ti-edit me-2' />
                                Edit
                              </Link>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className='card-body'>
                      <div className='bg-light-300 rounded-2 p-3 mb-3'>
                        <div className='d-flex align-items-center'>
                          <div
                            onClick={() => handleCoachClick(coach)}
                            className='avatar avatar-lg flex-shrink-0 cursor-pointer'
                          >
                            <img
                              src={coachAvatar}
                              className='img-fluid rounded-circle'
                              alt={coach.fullName}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  DEFAULT_COACH_AVATAR;
                              }}
                            />
                          </div>
                          <div className='ms-2'>
                            <h6 className='text-dark text-truncate mb-0'>
                              <span
                                className='cursor-pointer text-primary'
                                onClick={() => handleCoachClick(coach)}
                              >
                                {coach.fullName}
                              </span>
                            </h6>
                            <p className='mb-0'>{coach.email}</p>
                            <small>{coach.phone}</small>
                          </div>
                        </div>
                      </div>
                      <div className='d-flex justify-content-between align-items-center'>
                        <span className='badge badge-soft-primary'>
                          {coach.players?.length || 0} Players
                        </span>
                        <button
                          className='btn btn-sm btn-outline-primary'
                          onClick={() => handleCoachClick(coach)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {displayCount < coaches.length && (
              <div className='col-md-12 text-center'>
                <button className='btn btn-primary' onClick={handleLoadMore}>
                  <i className='ti ti-loader-3 me-2' />
                  Load More ({displayCount} of {coaches.length})
                </button>
              </div>
            )}

            {coachesToDisplay.length === 0 && !loading && (
              <div className='col-md-12 text-center'>
                <div className='alert alert-info'>
                  <h5>No Coaches Found</h5>
                  <p>Try adjusting your filters or search criteria.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CoachGrid;
