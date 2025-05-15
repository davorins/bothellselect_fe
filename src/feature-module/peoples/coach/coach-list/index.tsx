import React, {
  useRef,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Table } from 'antd';
import { CoachListHeader } from '../../../components/Headers/CoachListHeader';
import { CoachFilters } from '../../../components/Filters/CoachFilters';
import { CoachSortOptions } from '../../../components/Filters/CoachSortOptions';
import { getCoachTableColumns } from '../../../components/Tables/CoachTableColumns';
import { useCoachData } from '../../../hooks/useCoachData';
import { useCoachActions } from '../../../hooks/useCoachActions';
import { filterCoachData, sortCoachData } from '../../../../utils/coachUtils';
import {
  CoachFilterParams,
  CoachSortOrder,
} from '../../../../types/coachTypes';
import PredefinedDateRanges from '../../../../core/common/datePicker';
import { useAuth } from '../../../../context/AuthContext';
import { all_routes } from '../../../router/all_routes';
import { Moment } from 'moment';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';

const CoachList = () => {
  const [searchParams] = useSearchParams();
  const seasonParam = searchParams.get('season');
  const yearParam = searchParams.get('year');
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();
  const { loading, error, coaches, fetchData } = useCoachData();
  const { handleCoachClick } = useCoachActions();

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

  // Memoize the transformed data
  const coachData = useMemo(() => {
    return coaches.map((coach) => ({
      ...coach,
      status: coach.status || 'Active',
      type: 'coach' as const,
      DateofJoin: coach.createdAt || new Date().toISOString(),
      imgSrc: '',
      canView: true,
      createdAt: coach.createdAt || new Date().toISOString(),
      aauNumber: coach.aauNumber || '',
      role: coach.role || 'coach',
      players: coach.players || [],
      isCoach: true,
    }));
  }, [coaches]);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle sort change for CoachSortOptions
  const handleSortChange = useCallback((order: CoachSortOrder) => {
    setSortOrder(order);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilters: Partial<CoachFilterParams>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    },
    []
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
  }, []);

  const handleDateRangeChange = useCallback(
    (range: [Moment, Moment] | null) => {
      handleFilterChange({ dateRange: range });
    },
    [handleFilterChange]
  );

  // Memoized filtered and sorted data
  const filteredCoaches = useMemo(
    () => filterCoachData(coachData, filters, currentUser?.role || 'user'),
    [coachData, filters, currentUser?.role]
  );

  const sortedCoaches = useMemo(
    () => sortCoachData(filteredCoaches, sortOrder),
    [filteredCoaches, sortOrder]
  );

  const columns = useMemo(
    () => getCoachTableColumns(handleCoachClick, currentUser?.role),
    [handleCoachClick, currentUser?.role]
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) return <div className='error-message'>Error: {error}</div>;

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <CoachListHeader
          seasonParam={seasonParam}
          yearParam={yearParam}
          coachData={coachData}
        />
        <div className='card'>
          <div className='card-header d-flex align-items-center justify-content-between flex-wrap pb-0'>
            <h4 className='mb-3'>Coaches List</h4>
            <div className='d-flex align-items-center flex-wrap'>
              {currentUser?.role === 'admin' && (
                <div className='input-icon-start mb-3 me-2 position-relative'>
                  <PredefinedDateRanges onDateChange={handleDateRangeChange} />
                </div>
              )}
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
                <div className='dropdown-menu drop-width' ref={dropdownMenuRef}>
                  <CoachFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onReset={handleResetFilters}
                  />
                </div>
              </div>

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
                    Sort by A-Z
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
            <Table
              dataSource={sortOrder ? sortedCoaches : filteredCoaches}
              columns={columns}
              rowKey='_id'
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '25', '50', '100'],
              }}
              scroll={{ x: true }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachList;
