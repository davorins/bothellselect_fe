import React, { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { all_routes } from '../../../router/all_routes';
import PredefinedDateRanges from '../../../../core/common/datePicker';
import { useAuth } from '../../../../context/AuthContext';
import { useParentData } from '../../../hooks/useParentData';
import { useParentActions } from '../../../hooks/useParentActions';
import {
  filterParentData,
  sortParentData,
} from '../../../../utils/parentUtils';
import { ParentFilterParams } from '../../../../types/parentTypes';
import { ParentListHeader } from '../../../components/Headers/ParentListHeader';
import { ParentFilters } from '../../../components/Filters/ParentFilters';
import { ParentSortOptions } from '../../../components/Filters/ParentSortOptions';
import { Moment } from 'moment';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ParentGrid = () => {
  const routes = all_routes;
  const location = useLocation();
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const { parent: currentUser } = useAuth();

  // Filter states
  const [filters, setFilters] = useState<ParentFilterParams>({
    nameFilter: '',
    emailFilter: '',
    phoneFilter: '',
    statusFilter: null,
    roleFilter: null,
    dateRange: null,
  });

  const { loading, error, combinedData } = useParentData(null, null);
  const { handleParentClick } = useParentActions();

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const parentsPerPage = 12;

  const [sortOrder, setSortOrder] = useState<
    'asc' | 'desc' | 'recentlyViewed' | 'recentlyAdded' | null
  >(null);

  const handleFilterChange = (newFilters: Partial<ParentFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      nameFilter: '',
      emailFilter: '',
      phoneFilter: '',
      statusFilter: null,
      roleFilter: null,
      dateRange: null,
    });
  };

  const handleDateRangeChange = (range: [Moment, Moment] | null) => {
    handleFilterChange({ dateRange: range });
  };

  const filteredParents = filterParentData(
    combinedData,
    filters,
    currentUser?.role || 'user'
  );
  const sortedParents = sortParentData(filteredParents, sortOrder);

  const handleLoadMore = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const parentsToDisplay = (sortOrder ? sortedParents : filteredParents).slice(
    0,
    currentPage * parentsPerPage
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <div className='page-wrapper'>
        <div className='content content-two'>
          <ParentListHeader seasonParam={null} yearParam={null} />
          <div className='bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0'>
            <h4 className='mb-3'>Parents Grid</h4>
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

          <div className='row'>
            {parentsToDisplay.map((parent) => (
              <div
                key={parent._id}
                className='col-xxl-3 col-xl-4 col-md-6 d-flex'
              >
                <div className='card flex-fill'>
                  <div className='card-header d-flex align-items-center justify-content-between'>
                    {parent.type === 'guardian'
                      ? 'Guardian'
                      : parent.isCoach
                      ? 'Coach'
                      : 'Parent'}
                    <div className='d-flex align-items-center'>
                      <span className='badge badge-soft-success d-inline-flex align-items-center me-1'>
                        <i className='ti ti-circle-filled fs-5 me-1' />
                        {parent.status || 'Active'}
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
                          <div
                            className='dropdown-item rounded-1 cursor-pointer'
                            onClick={() => handleParentClick(parent)}
                          >
                            <i className='ti ti-menu me-2' />
                            View
                          </div>
                          <li>
                            <Link
                              to={`${routes.editParent}/${parent._id}`}
                              state={{
                                parent: {
                                  ...parent,
                                  parentId: parent._id,
                                },
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
                          onClick={() => handleParentClick(parent)}
                          className='avatar avatar-lg flex-shrink-0 cursor-pointer'
                        >
                          <img
                            src={
                              parent.imgSrc && parent.imgSrc.trim() !== ''
                                ? parent.imgSrc.startsWith('http')
                                  ? parent.imgSrc // Use Cloudinary URL directly
                                  : `${API_BASE_URL}${parent.imgSrc}` // Handle local paths
                                : 'https://bothell-select.onrender.com/uploads/avatars/parents.png'
                            }
                            className='img-fluid rounded-circle'
                            alt={
                              parent.fullName
                                ? `${parent.fullName}'s profile picture`
                                : 'Guardian profile picture'
                            }
                          />
                        </div>
                        <div className='ms-2'>
                          <h5 className='mb-0'>
                            <span
                              className='text-primary cursor-pointer'
                              onClick={() => handleParentClick(parent)}
                            >
                              {parent.fullName}
                            </span>
                          </h5>
                          <p>
                            {parent.email}
                            <br />
                            {parent.phone}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {parentsToDisplay.length <
              (sortOrder ? sortedParents : filteredParents).length && (
              <div className='col-md-12 text-center'>
                <button className='btn btn-primary' onClick={handleLoadMore}>
                  <i className='ti ti-loader-3 me-2' />
                  Load More
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
