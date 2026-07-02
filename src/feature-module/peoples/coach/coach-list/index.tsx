// components/Coaches/CoachList.tsx
import React, {
  useRef,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Table, Alert, message } from 'antd';
import { CoachListHeader } from '../../../components/Headers/CoachListHeader';
import { CoachFilters } from '../../../components/Filters/CoachFilters';
import { CoachSortOptions } from '../../../components/Filters/CoachSortOptions';
import { getCoachTableColumns } from '../../../components/Tables/CoachTableColumns';
import { useCoachData } from '../../../hooks/useCoachData';
import { useCoachActions } from '../../../hooks/useCoachActions';
import { ExtendedCoachRecord } from '../../../../utils/coachUtils';
import {
  CoachFilterParams,
  CoachSortOrder,
} from '../../../../types/coachTypes';
import PredefinedDateRanges from '../../../../core/common/datePicker';
import { useAuth } from '../../../../context/AuthContext';
import { all_routes } from '../../../router/all_routes';
import { Moment } from 'moment';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import { debounce } from 'lodash';
import { useDynamicFormFields } from '../../../hooks/useDynamicFormFields';
import '../../player-parent-list-mobile.css';

const CoachList = () => {
  const [searchParams] = useSearchParams();
  const seasonParam = searchParams.get('season');
  const yearParam = searchParams.get('year');
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();
  const { handleCoachClick } = useCoachActions();

  // ── Dynamic fields ─────────────────────────────────────────────────────────
  const { getVisibleFields: getParentVisibleFields } = useDynamicFormFields(
    'parent',
    { registrationYear: new Date().getFullYear() },
  );

  const visibleFieldNames = useMemo(() => {
    const fields = getParentVisibleFields({} as any);
    return fields.map((f) => f.fieldName);
  }, [getParentVisibleFields]);

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
  const [pageSize, setPageSize] = useState(10);
  const [tableLoading, setTableLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ── Hook filters ───────────────────────────────────────────────────────────
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
      aauNumber: filters.aauNumberFilter || undefined,
      sort: sortOrder || undefined,
      dateFrom,
      dateTo,
    };
  }, [
    filters.nameFilter,
    filters.emailFilter,
    filters.phoneFilter,
    filters.statusFilter,
    filters.aauNumberFilter,
    sortOrder,
    filters.dateRange?.[0]?.valueOf(),
    filters.dateRange?.[1]?.valueOf(),
  ]);

  const {
    data: coaches,
    loading,
    error,
    pagination,
    refresh,
    goToPage,
  } = useCoachData(hookFilters, pageSize);

  // ── Debounced filter change ────────────────────────────────────────────────
  const debouncedFilterChange = useMemo(
    () =>
      debounce((newFilters: Partial<CoachFilterParams>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
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
    message.info('Filters reset');
  }, []);

  const handleDateRangeChange = useCallback(
    (range: [Moment, Moment] | null) => {
      handleFilterChange({ dateRange: range });
    },
    [handleFilterChange],
  );

  const handleSortChange = useCallback((order: CoachSortOrder) => {
    setSortOrder(order);
  }, []);

  const handleTableChange = useCallback(
    (newPagination: any) => {
      const newPageSize = newPagination.pageSize;
      const newPage = newPagination.current;

      setTableLoading(true);

      if (newPageSize !== pageSize) {
        setPageSize(newPageSize);
        goToPage(1);
      } else {
        goToPage(newPage);
      }

      setTimeout(() => setTableLoading(false), 300);
    },
    [goToPage, pageSize],
  );

  const handleRefresh = useCallback(async () => {
    await refresh();
    message.success('Refreshing coaches...');
  }, [refresh]);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (error) {
      setApiError(error);
      const timer = setTimeout(() => setApiError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // ── Columns — depend on both actions AND dynamic field names ───────────────
  const columns = useMemo(
    () =>
      getCoachTableColumns(
        handleCoachClick,
        currentUser?.role,
        handleRefresh,
        visibleFieldNames,
      ),
    [handleCoachClick, currentUser?.role, handleRefresh, visibleFieldNames],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading && coaches.length === 0) {
    return (
      <div className='page-wrapper parent-list-page'>
        <div className='content'>
          <div className='card'>
            <div className='card-body'>
              <div className='text-center p-4'>
                <LoadingSpinner />
                <p className='mt-3 text-muted'>Loading coaches...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (apiError && coaches.length === 0) {
    return (
      <div className='page-wrapper parent-list-page'>
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
    <div className='page-wrapper parent-list-page'>
      <div className='content'>
        <CoachListHeader
          seasonParam={seasonParam}
          yearParam={yearParam}
          coachData={coaches}
          onRefresh={handleRefresh}
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
                      <CoachFilters
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
                  to={all_routes.coachList}
                  className='active btn btn-icon btn-sm me-1 primary-hover'
                >
                  <i className='ti ti-list-tree' />
                </Link>
                <Link
                  to={all_routes.coachGrid}
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
                          : sortOrder === 'aauNumber'
                            ? 'AAU Number'
                            : 'Sort by'}
                  </Link>
                  <CoachSortOptions
                    sortOrder={sortOrder}
                    onSortChange={handleSortChange}
                  />
                </div>
              )}
            </div>
          </div>

          <div className='card-body p-0 py-3'>
            {loading && coaches.length > 0 && (
              <div className='alert alert-info mb-3 mx-3'>
                <i className='ti ti-loader me-2'></i>
                Updating coaches... Please wait.
              </div>
            )}

            <Table
              dataSource={coaches}
              columns={columns}
              rowKey='_id'
              loading={tableLoading || (loading && coaches.length === 0)}
              pagination={{
                current: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
                showSizeChanger: true,
                pageSizeOptions: ['10', '25', '50', '100'],
              }}
              onChange={handleTableChange}
              scroll={{ x: true }}
            />

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

export default CoachList;
