// components/Parent/ParentGrid.tsx
import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { all_routes } from '../../../router/all_routes';
import PredefinedDateRanges from '../../../../core/common/datePicker';
import { useAuth } from '../../../../context/AuthContext';
import { useAllParents } from '../../../hooks/useAllParents';
import { useParentActions } from '../../../hooks/useParentActions';
import {
  sortParentData,
  getParentStatusFromRecord,
  getPaymentStatusFromRecord,
} from '../../../../utils/parentUtils';
import { ParentFilterParams } from '../../../../types/parentTypes';
import { ParentListHeader } from '../../../components/Headers/ParentListHeader';
import { ParentFilters } from '../../../components/Filters/ParentFilters';
import { ParentSortOptions } from '../../../components/Filters/ParentSortOptions';
import { Moment } from 'moment';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import {
  getAvatarUrl,
  getDefaultAvatar,
  getAvatarTypeFromItem,
  getGenderFromItem,
} from '../../../../utils/r2Utils';
import { showDeleteConfirm } from '../../../components/modals/DeleteConfirmModal';
import { message } from 'antd';
import { debounce } from 'lodash';
import { ExtendedTableRecord } from '../../../../types/table.types';
import { useActiveSeasonEvents } from '../../../../context/SeasonEventsContext';
import { useDynamicFormFields } from '../../../hooks/useDynamicFormFields';
import { formatPhoneNumber } from '../../../../utils/phone';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ParentGrid = () => {
  const routes = all_routes;
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const { currentUser } = useAuth();
  const { activeEvents } = useActiveSeasonEvents();

  // ── Dynamic fields ──────────────────────────────────────────────────────
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
  const [filters, setFilters] = useState<ParentFilterParams>({
    nameFilter: '',
    emailFilter: '',
    phoneFilter: '',
    statusFilter: null,
    roleFilter: null,
    dateRange: null,
  });

  const [sortOrder, setSortOrder] = useState<
    'asc' | 'desc' | 'recentlyViewed' | 'recentlyAdded' | null
  >(null);

  const [displayCount, setDisplayCount] = useState(12);
  const itemsPerLoad = 12;

  const hookFilters = useMemo(() => {
    let dateFrom: string | undefined;
    let dateTo: string | undefined;

    if (
      filters.dateRange &&
      Array.isArray(filters.dateRange) &&
      filters.dateRange.length === 2
    ) {
      const [start, end] = filters.dateRange;
      if (start && start.isValid && start.isValid()) {
        dateFrom = start.format('YYYY-MM-DD');
      }
      if (end && end.isValid && end.isValid()) {
        dateTo = end.format('YYYY-MM-DD');
      }
    }

    return {
      name: filters.nameFilter || undefined,
      email: filters.emailFilter || undefined,
      phone: filters.phoneFilter || undefined,
      status: filters.statusFilter || undefined,
      role: filters.roleFilter || undefined,
      dateFrom,
      dateTo,
    };
  }, [
    filters.nameFilter,
    filters.emailFilter,
    filters.phoneFilter,
    filters.statusFilter,
    filters.roleFilter,
    filters.dateRange?.[0]?.valueOf(),
    filters.dateRange?.[1]?.valueOf(),
  ]);

  const {
    data: allParentData,
    loading,
    error,
    refresh,
  } = useAllParents(hookFilters, activeEvents);

  const { handleParentClick } = useParentActions();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 Sort order changed to:', sortOrder);
    if (sortOrder === 'recentlyViewed') {
      const recentlyViewed = JSON.parse(
        localStorage.getItem('recentlyViewedParents') || '[]',
      );
      console.log('📋 Recently viewed from localStorage:', recentlyViewed);
    }
  }, [sortOrder]);

  useEffect(() => {
    console.log('🎯 ParentGrid Debug:', {
      hookFilters,
      totalItems: allParentData?.length,
      loading,
      error,
      parents: allParentData?.filter(
        (p: ExtendedTableRecord) => p.type === 'parent' || p.type === 'coach',
      ).length,
      guardians: allParentData?.filter(
        (p: ExtendedTableRecord) => p.type === 'guardian',
      ).length,
    });
  }, [hookFilters, allParentData, loading, error]);

  const enhancedParentData = useMemo(() => {
    return allParentData.map((item: ExtendedTableRecord) => {
      const calculatedStatus = getParentStatusFromRecord(item);
      const calculatedPaymentStatus = getPaymentStatusFromRecord(item);
      return {
        ...item,
        calculatedStatus,
        calculatedPaymentStatus,
        status: item.status || calculatedStatus,
        paymentStatus: item.paymentStatus || calculatedPaymentStatus,
      };
    });
  }, [allParentData]);

  const sortedData = useMemo(() => {
    if (!sortOrder || allParentData.length === 0) return allParentData;
    return sortParentData(allParentData, sortOrder);
  }, [allParentData, sortOrder]);

  const parentsToDisplay = useMemo(() => {
    return sortedData.slice(0, displayCount);
  }, [sortedData, displayCount]);

  const debouncedFilterChange = useMemo(
    () =>
      debounce((newFilters: Partial<ParentFilterParams>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setDisplayCount(itemsPerLoad);
      }, 300),
    [],
  );

  const handleFilterChange = useCallback(
    (newFilters: Partial<ParentFilterParams>) => {
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
      roleFilter: null,
      dateRange: null,
    });
    setDisplayCount(itemsPerLoad);
    message.info('Filters reset');
  }, []);

  const handleDateRangeChange = useCallback(
    (range: [Moment, Moment] | null) => {
      handleFilterChange({ dateRange: range });
    },
    [handleFilterChange],
  );

  const handleDelete = (record: ExtendedTableRecord) => {
    const canDelete =
      currentUser?.role === 'admin' &&
      (record.type === 'parent' ||
        record.type === 'guardian' ||
        (record.type === 'coach' && !record.parentId));

    if (!canDelete) return;

    showDeleteConfirm(
      {
        _id: record._id,
        fullName: record.fullName,
        email: record.email,
        parentId: record.parentId,
        type: record.type,
        isCoach: record.isCoach,
      },
      {
        onDeleteSuccess: async () => {
          message.loading({ content: 'Refreshing data...', key: 'refresh' });
          setIsRefreshing(true);
          await refresh();
          setIsRefreshing(false);
          message.destroy('refresh');
          message.success('Account deleted successfully');
          setDisplayCount(itemsPerLoad);
        },
        customTitle: record.isCoach
          ? 'Delete Coach Account'
          : record.type === 'guardian'
            ? 'Delete Guardian Account'
            : 'Delete Parent Account',
      },
    );
  };

  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + itemsPerLoad, sortedData.length));
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setDisplayCount(itemsPerLoad);
    setIsRefreshing(false);
    message.success('Parent list refreshed');
  }, [refresh]);

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

  const statusSummary = useMemo(() => {
    const active = allParentData.filter((p) => p.status === 'Active').length;
    const pending = allParentData.filter(
      (p) => p.status === 'Pending Payment',
    ).length;
    const inactive = allParentData.filter(
      (p) => p.status === 'Inactive',
    ).length;
    const coaches = allParentData.filter((p) => p.isCoach).length;
    const guardians = allParentData.filter((p) => p.type === 'guardian').length;
    return {
      active,
      pending,
      inactive,
      coaches,
      guardians,
      total: allParentData.length,
    };
  }, [allParentData]);

  if (loading && allParentData.length === 0) return <LoadingSpinner />;
  if (apiError && allParentData.length === 0)
    return <div>Error: {apiError}</div>;

  return (
    <>
      <div className='page-wrapper'>
        <div className='content content-two'>
          <ParentListHeader
            seasonParam={null}
            yearParam={null}
            parentData={sortedData}
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
                    <ParentFilters
                      filters={filters}
                      onFilterChange={handleFilterChange}
                      onReset={handleResetFilters}
                    />
                  </div>
                </div>
              )}

              <div className='d-flex align-items-center bg-white border rounded-2 p-1 mb-3 me-2'>
                <Link
                  to={routes.parentList}
                  className='btn btn-icon btn-sm me-1 bg-light primary-hover'
                >
                  <i className='ti ti-list-tree' />
                </Link>
                <Link
                  to={routes.parentGrid}
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
                          : sortOrder === 'recentlyViewed'
                            ? 'Recently Viewed'
                            : 'Sort by'}
                  </Link>
                  <ParentSortOptions
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

            {parentsToDisplay.length === 0 && !loading && (
              <div className='col-12 text-center py-5'>
                <i className='ti ti-users fs-1 text-muted'></i>
                <h5 className='mt-3'>No parents or guardians found</h5>
                <p className='text-muted'>Try adjusting your filters</p>
              </div>
            )}

            {parentsToDisplay.map((item) => {
              const canDelete =
                currentUser?.role === 'admin' &&
                (item.type === 'parent' ||
                  item.type === 'guardian' ||
                  (item.type === 'coach' && !item.parentId));

              const avatarType = getAvatarTypeFromItem(item);
              const gender = getGenderFromItem(item);
              const defaultAvatar = getDefaultAvatar(avatarType, gender);
              const avatarUrl = getAvatarUrl(
                item.avatar || item.imgSrc,
                defaultAvatar,
              );

              const status = item.status;
              const paymentStatus = item.paymentStatus;

              const badgeColor =
                status === 'Active'
                  ? 'success'
                  : status === 'Pending Payment'
                    ? 'warning'
                    : 'danger';

              return (
                <div
                  key={`${item._id}`}
                  className='col-xxl-3 col-xl-4 col-md-6 d-flex'
                >
                  <div className='card flex-fill'>
                    <div className='card-header d-flex align-items-center justify-content-between'>
                      <div className='d-flex align-items-center gap-2'>
                        {item.type === 'guardian' ? (
                          <span>Guardian</span>
                        ) : item.isCoach ? (
                          'Coach'
                        ) : (
                          'Parent'
                        )}
                      </div>
                      <div className='d-flex align-items-center'>
                        <span
                          className={`badge badge-soft-${badgeColor} d-inline-flex align-items-center me-1`}
                          title={`Status: ${status}${paymentStatus ? `, Payment: ${paymentStatus}` : ''}`}
                        >
                          <i
                            className={`ti ti-circle-filled fs-5 me-1 text-${badgeColor}`}
                          />
                          {status}
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
                                onClick={() => {
                                  if (
                                    item.type === 'guardian' &&
                                    item.parentId
                                  ) {
                                    handleParentClick({
                                      ...item,
                                      _id: item.parentId,
                                      fullName:
                                        (item as any).parentName ||
                                        item.fullName,
                                    });
                                  } else {
                                    handleParentClick(item);
                                  }
                                }}
                              >
                                <i className='ti ti-menu me-2' />
                                View
                              </div>
                            </li>
                            <li>
                              <Link
                                to={
                                  item.type === 'guardian' && item.parentId
                                    ? `${routes.editParent}/${item.parentId}`
                                    : `${routes.editParent}/${item._id}`
                                }
                                state={{
                                  parent: {
                                    ...item,
                                    parentId:
                                      item.type === 'guardian'
                                        ? item.parentId
                                        : item._id,
                                  },
                                  from: location.pathname,
                                }}
                                className='dropdown-item rounded-1'
                              >
                                <i className='ti ti-edit me-2' />
                                Edit
                              </Link>
                            </li>
                            {canDelete && (
                              <li>
                                <div
                                  className='dropdown-item rounded-1 cursor-pointer text-danger'
                                  onClick={() => handleDelete(item)}
                                >
                                  <i className='ti ti-trash me-2' />
                                  Delete
                                </div>
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className='card-body'>
                      <div className='bg-light-300 rounded-2 p-3 mb-3'>
                        <div className='d-flex align-items-center'>
                          <div
                            onClick={() => {
                              if (item.type === 'guardian' && item.parentId) {
                                handleParentClick({
                                  ...item,
                                  _id: item.parentId,
                                  fullName:
                                    (item as any).parentName || item.fullName,
                                });
                              } else {
                                handleParentClick(item);
                              }
                            }}
                            className='avatar avatar-lg flex-shrink-0 cursor-pointer'
                          >
                            <img
                              src={avatarUrl}
                              className='img-fluid rounded-circle'
                              alt={item.fullName}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  getDefaultAvatar(
                                    getAvatarTypeFromItem(item),
                                    getGenderFromItem(item),
                                  );
                              }}
                            />
                          </div>
                          <div className='ms-2'>
                            <h5 className='mb-0'>
                              <span
                                className='text-primary cursor-pointer'
                                onClick={() => {
                                  if (
                                    item.type === 'guardian' &&
                                    item.parentId
                                  ) {
                                    handleParentClick({
                                      ...item,
                                      _id: item.parentId,
                                      fullName:
                                        (item as any).parentName ||
                                        item.fullName,
                                    });
                                  } else {
                                    handleParentClick(item);
                                  }
                                }}
                              >
                                {item.fullName}
                              </span>
                            </h5>
                            <p className='mb-1'>
                              {/* Email — gated */}
                              {hasField('email') && item.email && (
                                <>
                                  {item.email}
                                  <br />
                                </>
                              )}
                              {/* Phone — gated */}
                              {hasField('phone') && item.phone && (
                                <small>{formatPhoneNumber(item.phone)}</small>
                              )}
                              {/* Relationship — always shown for guardians */}
                              {item.type === 'guardian' &&
                                (item as any).relationship && (
                                  <>
                                    <br />
                                    <small className='text-muted'>
                                      Relationship: {(item as any).relationship}
                                    </small>
                                  </>
                                )}
                            </p>
                            <div className='d-flex gap-2 mt-1'>
                              <small className='text-muted'>
                                Players: {item.players?.length || 0}
                              </small>
                              {/* AAU — gated on isCoach field or if parent is a coach */}
                              {(hasField('isCoach') || item.isCoach) &&
                                item.aauNumber &&
                                item.aauNumber !== 'N/A' && (
                                  <small className='text-muted'>
                                    AAU: {item.aauNumber}
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

            {displayCount < sortedData.length && (
              <div className='col-md-12 text-center'>
                <button className='btn btn-primary' onClick={handleLoadMore}>
                  <i className='ti ti-loader-3 me-2' />
                  Load More ({displayCount} of {sortedData.length})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ParentGrid;
