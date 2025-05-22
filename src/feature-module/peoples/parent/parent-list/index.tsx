import React, { useRef, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Table } from 'antd';
import { ParentListHeader } from '../../../components/Headers/ParentListHeader';
import { ParentFilters } from '../../../components/Filters/ParentFilters';
import { ParentSortOptions } from '../../../components/Filters/ParentSortOptions';
import { getParentTableColumns } from '../../../components/Tables/ParentTableColumns';
import { useParentData } from '../../../hooks/useParentData';
import { useParentActions } from '../../../hooks/useParentActions';
import {
  filterParentData,
  sortParentData,
} from '../../../../utils/parentUtils';
import { ParentFilterParams } from '../../../../types/parentTypes';
import PredefinedDateRanges from '../../../../core/common/datePicker';
import { useAuth } from '../../../../context/AuthContext';
import { all_routes } from '../../../router/all_routes';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';

const ParentList = () => {
  const [searchParams] = useSearchParams();
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const seasonParam = searchParams.get('season');
  const yearParam = searchParams.get('year');

  const { currentUser } = useAuth();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter states
  const [filters, setFilters] = useState<ParentFilterParams>({
    nameFilter: '',
    emailFilter: '',
    phoneFilter: '',
    statusFilter: null,
    roleFilter: null,
    dateRange: null,
  });

  // Sort order state
  const [sortOrder, setSortOrder] = useState<
    'asc' | 'desc' | 'recentlyViewed' | 'recentlyAdded' | null
  >(null);

  // Data fetching
  const {
    loading,
    error,
    combinedData: parentData,
  } = useParentData(seasonParam, yearParam);

  const { handleParentClick } = useParentActions();

  // Filtered parents based on filters and role
  const filteredParents = useMemo(() => {
    return filterParentData(parentData, filters, currentUser?.role || 'user');
  }, [parentData, filters, currentUser?.role]);

  // Sorted parents based on sort order
  const sortedParents = useMemo(() => {
    return sortParentData(filteredParents, sortOrder);
  }, [filteredParents, sortOrder]);

  // Table columns depending on role and click handler
  const columns = useMemo(() => {
    return getParentTableColumns(handleParentClick, currentUser?.role);
  }, [handleParentClick, currentUser?.role]);

  // Decide which data to show (sorted or filtered)
  const data = sortOrder ? sortedParents : filteredParents;

  // Total records count for pagination
  const totalRecords = data.length;

  // Paginate data slice for current page & page size
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize]);

  // Early return: for regular users showing single record, no pagination, no header
  if (currentUser?.role === 'user' && parentData.length === 1) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <ParentListHeader
            seasonParam={seasonParam}
            yearParam={yearParam}
            parentData={parentData}
          />
          <div className='card'>
            <Table
              dataSource={parentData}
              columns={columns}
              rowKey='_id'
              pagination={false}
              showHeader={false}
            />
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <ParentListHeader
          seasonParam={seasonParam}
          yearParam={yearParam}
          parentData={data}
        />
        <div className='card'>
          <div className='card-header d-flex align-items-center justify-content-between flex-wrap pb-0'>
            <h4 className='mb-3'>Parents List</h4>
            <div className='d-flex align-items-center flex-wrap'>
              {currentUser?.role === 'admin' && (
                <>
                  <div className='input-icon-start mb-3 me-2 position-relative'>
                    <PredefinedDateRanges
                      onDateChange={(range) =>
                        setFilters((prev) => ({ ...prev, dateRange: range }))
                      }
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
                        onFilterChange={(newFilters) =>
                          setFilters((prev) => ({ ...prev, ...newFilters }))
                        }
                        onReset={() =>
                          setFilters({
                            nameFilter: '',
                            emailFilter: '',
                            phoneFilter: '',
                            statusFilter: null,
                            roleFilter: null,
                            dateRange: null,
                          })
                        }
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
                    Sort by A-Z
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
            <Table
              columns={columns}
              dataSource={paginatedData}
              rowKey='_id'
              pagination={{
                current: currentPage,
                pageSize,
                total: totalRecords,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                onChange: (page, pageSize) => {
                  setCurrentPage(page);
                  setPageSize(pageSize);
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentList;
