// components/Coaches/CoachGrid.tsx
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
import { ExtendedCoachRecord } from '../../../../utils/coachUtils';
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
import { useDynamicFormFields } from '../../../hooks/useDynamicFormFields';
import { formatPhoneNumber } from '../../../../utils/phone';

const DEFAULT_COACH_AVATAR = getDefaultAvatar('coach');

const CoachGrid = () => {
  const routes = all_routes;
  const location = useLocation();
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const { currentUser } = useAuth();

  // ── Dynamic fields ─────────────────────────────────────────────────────────
  const { getVisibleFields: getParentVisibleFields } = useDynamicFormFields(
    'parent',
    { registrationYear: new Date().getFullYear() },
  );

  const parentVisibleFields = useMemo(
    () => getParentVisibleFields({} as any),
    [getParentVisibleFields],
  );

  const hasField = (name: string) =>
    parentVisibleFields.some((f) => f.fieldName === name);

  // ── Filter state ───────────────────────────────────────────────────────────
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

  const {
    data: coaches,
    loading,
    error,
    refresh,
  } = useCoachData(hookFilters, 50);

  const { handleCoachClick } = useCoachActions();

  const debouncedFilterChange = useMemo(
    () =>
      debounce((newFilters: Partial<CoachFilterParams>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setDisplayCount(itemsPerLoad);
      }, 300),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedFilterChange.cancel();
    };
  }, [debouncedFilterChange]);

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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setDisplayCount(itemsPerLoad);
    setIsRefreshing(false);
    message.success('Coach list refreshed');
  }, [refresh]);

  useEffect(() => {
    if (error) {
      setApiError(error);
      const timer = setTimeout(() => setApiError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const coachesToDisplay = useMemo(() => {
    return coaches.slice(0, displayCount);
  }, [coaches, displayCount]);

  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + itemsPerLoad, coaches.length));
  };

  if (loading && coaches.length === 0) return <LoadingSpinner />;
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
            <h4 className='mb-3'></h4>
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

          <div className='row'>
            {isRefreshing && (
              <div className='col-12 text-center py-3'>
                <div className='spinner-border text-primary' role='status'>
                  <span className='visually-hidden'>Refreshing...</span>
                </div>
              </div>
            )}

            {loading && coaches.length > 0 && (
              <div className='col-12 text-center mb-3'>
                <div
                  className='spinner-border spinner-border-sm text-primary'
                  role='status'
                >
                  <span className='visually-hidden'>Loading...</span>
                </div>
                <span className='ms-2 text-muted'>Updating...</span>
              </div>
            )}

            {coachesToDisplay.length === 0 && !loading && (
              <div className='col-12 text-center py-5'>
                <i className='ti ti-users fs-1 text-muted'></i>
                <h5 className='mt-3'>No coaches found</h5>
                <p className='text-muted'>Try adjusting your filters</p>
              </div>
            )}

            {coachesToDisplay.map((coach: ExtendedCoachRecord) => {
              const coachAvatar = getAvatarUrl(
                coach.imgSrc || coach.avatar,
                DEFAULT_COACH_AVATAR,
              );

              return (
                <div
                  key={coach._id}
                  className='col-xxl-3 col-xl-4 col-md-6 d-flex'
                >
                  <div className='card flex-fill'>
                    <div className='card-header d-flex align-items-center justify-content-between'>
                      <div className='d-flex align-items-center gap-2'>
                        <span>Coach</span>
                      </div>
                      <div className='d-flex align-items-center'>
                        {/* Coaches are always Active */}
                        <span className='badge badge-soft-success d-inline-flex align-items-center me-1'>
                          <i className='ti ti-circle-filled fs-5 me-1 text-success' />
                          Active
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
                                  parent: {
                                    _id: coach._id,
                                    fullName: coach.fullName || '',
                                    email: coach.email || '',
                                    phone: coach.phone || '',
                                    address: coach.address || '',
                                    aauNumber: coach.aauNumber || '',
                                    isCoach: true,
                                    additionalGuardians:
                                      (coach as any).additionalGuardians || [],
                                  },
                                  isCoach: true,
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
                            <h5 className='mb-0'>
                              <span
                                className='text-primary cursor-pointer'
                                onClick={() => handleCoachClick(coach)}
                              >
                                {coach.fullName}
                              </span>
                            </h5>
                            <p className='mb-1'>
                              {/* Email — gated */}
                              {hasField('email') && coach.email && (
                                <>
                                  {coach.email}
                                  <br />
                                </>
                              )}
                              {/* Phone — gated + formatted */}
                              {hasField('phone') && coach.phone && (
                                <small>{formatPhoneNumber(coach.phone)}</small>
                              )}
                            </p>
                            <div className='d-flex gap-2 mt-1'>
                              <small className='text-muted'>
                                Players: {coach.players?.length || 0}
                              </small>
                              {/* AAU always shown for coaches since they are always coaches */}
                              {coach.aauNumber && coach.aauNumber !== 'N/A' && (
                                <small className='text-muted'>
                                  AAU: {coach.aauNumber}
                                </small>
                              )}
                            </div>
                          </div>
                        </div>
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
          </div>
        </div>
      </div>
    </>
  );
};

export default CoachGrid;
