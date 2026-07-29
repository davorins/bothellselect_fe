// components/ParentList.tsx
import React, {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import {
  useSearchParams,
  Link,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { Table, Alert, message } from 'antd';
import { ParentListHeader } from '../../../components/Headers/ParentListHeader';
import { ParentFilters } from '../../../components/Filters/ParentFilters';
import { ParentSortOptions } from '../../../components/Filters/ParentSortOptions';
import {
  getParentTableColumns,
  ParentTableSkeleton,
} from '../../../components/Tables/ParentTableColumns';
import { useParentActions } from '../../../hooks/useParentActions';
import { useAllParents } from '../../../hooks/useAllParents';
import { sortParentData } from '../../../../utils/parentUtils';
import { ParentFilterParams } from '../../../../types/parentTypes';
import PredefinedDateRanges from '../../../../core/common/datePicker';
import { useAuth } from '../../../../context/AuthContext';
import { all_routes } from '../../../router/all_routes';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import { debounce } from 'lodash';
import axios from 'axios';
import { ExtendedTableRecord } from '../../../../types/table.types';
import { useActiveSeasonEvents } from '../../../../context/SeasonEventsContext';
import { useDynamicFormFields } from '../../../hooks/useDynamicFormFields';
import '../../player-parent-list-mobile.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ParentList = () => {
  const [searchParams] = useSearchParams();
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeEvents } = useActiveSeasonEvents();
  const seasonParam = useMemo(() => searchParams.get('season'), [searchParams]);
  const yearParam = useMemo(() => searchParams.get('year'), [searchParams]);

  // ── Dynamic fields ──────────────────────────────────────────────────────
  const { getVisibleFields: getParentVisibleFields } = useDynamicFormFields(
    'parent',
    { registrationYear: new Date().getFullYear() },
  );

  const parentVisibleFieldNames = useMemo(() => {
    const fields = getParentVisibleFields({} as any);
    return fields.map((f) => f.fieldName);
  }, [getParentVisibleFields]);

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

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [tableLoading, setTableLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ── Fetch all data ─────────────────────────────────────────────────────────
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
      season: seasonParam ?? undefined,
      year: yearParam ?? undefined,
      name: filters.nameFilter || undefined,
      email: filters.emailFilter || undefined,
      phone: filters.phoneFilter || undefined,
      status: filters.statusFilter || undefined,
      role: filters.roleFilter || undefined,
      dateFrom,
      dateTo,
    };
  }, [
    seasonParam,
    yearParam,
    filters.nameFilter,
    filters.emailFilter,
    filters.phoneFilter,
    filters.statusFilter,
    filters.roleFilter,
    filters.dateRange?.[0]?.valueOf(),
    filters.dateRange?.[1]?.valueOf(),
  ]);

  const {
    data: allData,
    loading,
    error,
    total,
    refresh,
  } = useAllParents(hookFilters, activeEvents);

  const { handleParentClick } = useParentActions();

  useEffect(() => {
    console.log('📊 ParentList Debug:', {
      totalItems: allData.length,
      parents: allData.filter(
        (p: ExtendedTableRecord) => p.type === 'parent' || p.type === 'coach',
      ).length,
      guardians: allData.filter(
        (p: ExtendedTableRecord) => p.type === 'guardian',
      ).length,
      loading,
    });
  }, [allData, loading]);

  // ── Client-side pagination ────────────────────────────────────────────────
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return allData.slice(start, end);
  }, [allData, currentPage, pageSize]);

  const totalPages = Math.ceil(allData.length / pageSize);

  const handleTableChange = useCallback(
    (newPagination: any) => {
      setTableLoading(true);
      const newPageSize = newPagination.pageSize;
      const newPage = newPagination.current;

      if (newPageSize !== pageSize) {
        setPageSize(newPageSize);
        setCurrentPage(1);
      } else {
        setCurrentPage(newPage);
      }

      setTimeout(() => setTableLoading(false), 300);
    },
    [pageSize],
  );

  // ── Callbacks ──────────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setTableLoading(true);
    try {
      await refresh();
      setCurrentPage(1);
      message.success('Data refreshed successfully');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      message.error('Failed to refresh data');
    } finally {
      setTableLoading(false);
    }
  }, [refresh]);

  const handleEditClick = useCallback(
    async (record: ExtendedTableRecord) => {
      try {
        console.log('📝 handleEditClick - record:', {
          _id: record._id,
          type: record.type,
          isCoach: record.isCoach,
          isCoachType: typeof record.isCoach,
          parentId: record.parentId,
          fullName: record.fullName,
        });

        if (record.type === 'guardian' && record.parentId) {
          console.log('→ CASE 1: Guardian');
          navigate(`${all_routes.editParent}/${record.parentId}`, {
            state: {
              parent: { _id: record.parentId },
              guardian: {
                _id: record._id,
                fullName: record.fullName,
                email: record.email,
                phone: record.phone,
                relationship: record.relationship || '',
                isCoach: record.isCoach || false,
              },
              from: location.pathname,
              editGuardian: true,
            },
          });
          return;
        }

        // eslint-disable-next-line eqeqeq
        if (record.type === 'coach' || record.isCoach == true) {
          console.log(
            '→ CASE 2: Coach, navigating to:',
            `${all_routes.editCoach}/${record._id}`,
          );

          if (!record._id) {
            console.error('❌ Coach record missing _id');
            message.error('Cannot edit coach: missing ID');
            return;
          }

          navigate(`${all_routes.editCoach}/${record._id}`, {
            state: {
              parent: {
                _id: record._id,
                fullName: record.fullName || '',
                email: record.email || '',
                phone: record.phone || '',
                address: record.address || '',
                aauNumber: record.aauNumber || '',
                isCoach: true,
                additionalGuardians: record.additionalGuardians || [],
              },
              from: location.pathname,
            },
          });
          return;
        }

        console.log(
          '→ CASE 3: Parent, navigating to:',
          `${all_routes.editParent}/${record._id}`,
        );

        if (!record._id) {
          console.error('❌ Parent record missing _id');
          message.error('Cannot edit parent: missing ID');
          return;
        }

        navigate(`${all_routes.editParent}/${record._id}`, {
          state: {
            parent: {
              _id: record._id,
              fullName: record.fullName || '',
              email: record.email || '',
              phone: record.phone || '',
              address: record.address || '',
              aauNumber: record.aauNumber || '',
              isCoach: false,
              additionalGuardians: record.additionalGuardians || [],
            },
            from: location.pathname,
          },
        });
      } catch (error) {
        console.error('❌ Error navigating to edit:', error);
        message.error('Failed to open edit form');
      }
    },
    [navigate, location.pathname],
  );

  const debouncedFilterChange = useMemo(
    () =>
      debounce((newFilters: Partial<ParentFilterParams>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setCurrentPage(1);
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
    setCurrentPage(1);
    message.info('Filters reset');
  }, []);

  const handleDateRangeChange = useCallback(
    (range: any) => {
      handleFilterChange({ dateRange: range });
    },
    [handleFilterChange],
  );

  useEffect(() => {
    if (!loading) {
      setTableLoading(false);
    }
  }, [loading]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const sortedParents = useMemo(() => {
    if (!sortOrder || paginatedData.length === 0) return paginatedData;
    console.log(
      '🔄 Applying sort:',
      sortOrder,
      'to',
      paginatedData.length,
      'items',
    );
    const sorted = sortParentData(paginatedData, sortOrder);
    console.log('✅ Sorted result:', sorted.length, 'items');
    return sorted;
  }, [paginatedData, sortOrder]);

  const dataSource = useMemo(
    () => (sortOrder ? sortedParents : paginatedData),
    [sortOrder, sortedParents, paginatedData],
  );

  const handleParentClickWrapper = useCallback(
    (record: ExtendedTableRecord) => {
      if (record.type === 'guardian' && record.parentId) {
        handleParentClick({
          ...record,
          _id: record.parentId,
          fullName: (record as any).parentName || record.fullName,
        });
      } else {
        handleParentClick(record);
      }
    },
    [handleParentClick],
  );

  const handleEditClickWrapper = useCallback(
    (record: ExtendedTableRecord) => {
      if (record.type === 'guardian' && record.parentId) {
        handleEditClick({
          ...record,
          _id: record.parentId,
          fullName: (record as any).parentName || record.fullName,
        });
      } else {
        handleEditClick(record);
      }
    },
    [handleEditClick],
  );

  // ── Columns — depend on both actions AND dynamic field names ───────────────
  const columns = useMemo(
    () =>
      getParentTableColumns({
        handleParentClick: handleParentClickWrapper,
        handleEditClick: handleEditClickWrapper,
        currentUserRole: currentUser?.role,
        loading: loading && allData.length === 0,
        onDeleteSuccess: handleRefresh,
        visibleFields: parentVisibleFieldNames,
      }),
    [
      handleParentClickWrapper,
      handleEditClickWrapper,
      currentUser?.role,
      loading,
      allData.length,
      handleRefresh,
      parentVisibleFieldNames,
    ],
  );

  // ── Effects ────────────────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading && allData.length === 0) {
    return (
      <div className='page-wrapper parent-list-page'>
        <div className='content'>
          <div className='card'>
            <div className='card-body'>
              <div className='text-center p-4'>
                <LoadingSpinner />
                <p className='mt-3 text-muted'>
                  Loading parents and guardians...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (apiError && allData.length === 0) {
    return (
      <div className='page-wrapper parent-list-page'>
        <div className='content'>
          <Alert
            message='Error Loading Data'
            description={apiError}
            type='error'
            showIcon
            action={
              <button
                className='btn btn-primary btn-sm'
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className='page-wrapper parent-list-page'>
      <div className='content'>
        <ParentListHeader
          seasonParam={seasonParam}
          yearParam={yearParam}
          parentData={dataSource}
          onRefresh={handleRefresh}
          visibleFields={parentVisibleFieldNames}
        />
        <div className='card'>
          <div className='card-header d-flex align-items-center justify-content-between flex-wrap pb-0'>
            <h4 className='mb-3'></h4>
            <div className='d-flex align-items-center flex-wrap'>
              {currentUser?.role === 'admin' && (
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
                      <ParentFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilters}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className='d-flex align-items-center bg-white border rounded-2 p-1 mb-3 me-2'>
                <Link
                  to={all_routes.parentList}
                  className='active btn btn-icon btn-sm me-1 primary-hover'
                >
                  <i className='ti ti-list-tree' />
                </Link>
                <Link
                  to={all_routes.parentGrid}
                  className='btn btn-icon btn-sm bg-light primary-hover'
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

          <div className='card-body p-0 py-3'>
            {loading && (
              <div className='alert alert-info mb-3 mx-3'>
                <i className='ti ti-loader me-2'></i>
                Loading parents and guardians... Please wait.
              </div>
            )}

            {dataSource.length === 0 && !loading ? (
              <div className='text-center py-5'>
                <i className='ti ti-users fs-1 text-muted'></i>
                <h5 className='mt-3'>No parents or guardians found</h5>
                <p className='text-muted'>Try adjusting your filters</p>
              </div>
            ) : (
              <Table
                columns={columns}
                dataSource={dataSource}
                rowKey='_id'
                pagination={{
                  current: currentPage,
                  pageSize: pageSize,
                  total: allData.length,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '50', '100'],
                }}
                onChange={handleTableChange}
                loading={tableLoading}
                scroll={{ x: true }}
              />
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

export default ParentList;
