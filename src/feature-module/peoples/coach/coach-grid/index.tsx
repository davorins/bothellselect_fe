import React, { useRef, useState } from 'react';
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

const DEFAULT_COACH_AVATAR =
  'https://bothell-select.onrender.com/uploads/avatars/coach.png';

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

  const { loading, error, coachData } = useCoachData();
  const { handleCoachClick } = useCoachActions();

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const coachesPerPage = 12;

  const [sortOrder, setSortOrder] = useState<CoachSortOrder>(null);

  const handleFilterChange = (newFilters: Partial<CoachFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      nameFilter: '',
      emailFilter: '',
      phoneFilter: '',
      statusFilter: null,
      aauNumberFilter: '',
      dateRange: null,
    });
  };

  const handleDateRangeChange = (range: [Moment, Moment] | null) => {
    handleFilterChange({ dateRange: range });
  };

  // Fix: Add currentUserRole parameter
  const filteredCoaches = filterCoachData(
    coachData,
    filters,
    currentUser?.role || 'user'
  );

  const sortedCoaches = sortCoachData(filteredCoaches, sortOrder);

  const handleLoadMore = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const coachesToDisplay = (sortOrder ? sortedCoaches : filteredCoaches).slice(
    0,
    currentPage * coachesPerPage
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <div className='page-wrapper'>
        <div className='content content-two'>
          <CoachListHeader seasonParam={null} yearParam={null} />
          <div className='bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0'>
            <h4 className='mb-3'>Coaches Grid</h4>
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
                    Sort by A-Z
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
            {/* Fix: Add type annotation for coach parameter */}
            {coachesToDisplay.map((coach: ExtendedCoachRecord) => (
              <div
                key={coach._id}
                className='col-xxl-3 col-xl-4 col-md-6 d-flex'
              >
                <div className='card flex-fill'>
                  <div className='card-header d-flex align-items-center justify-content-between'>
                    <Link to={routes.coachDetail} className='link-primary'>
                      {coach.aauNumber}
                    </Link>
                    <div className='d-flex align-items-center'>
                      <span
                        className={`badge d-inline-flex align-items-center me-1 ${
                          coach.status === 'Active'
                            ? 'badge-soft-success'
                            : 'badge-soft-danger'
                        }`}
                      >
                        <i className='ti ti-circle-filled fs-5 me-1' />
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
                            src={
                              coach.imgSrc &&
                              coach.imgSrc.trim().startsWith('http')
                                ? coach.imgSrc
                                : DEFAULT_COACH_AVATAR
                            }
                            className='img-fluid rounded-circle'
                            alt={
                              coach.fullName
                                ? `${coach.fullName}'s profile picture`
                                : 'Coach profile picture'
                            }
                          />
                        </div>
                        <div className='ms-2'>
                          <h6 className='text-dark text-truncate mb-0'>
                            <span
                              className='cursor-pointer'
                              onClick={() => handleCoachClick(coach)}
                            >
                              {coach.fullName}
                            </span>
                          </h6>
                          <p>AAU: {coach.aauNumber}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className='mb-2'>
                        <p className='mb-0'>Email</p>
                        <p className='text-dark'>{coach.email}</p>
                      </div>
                      <div>
                        <p className='mb-0'>Phone</p>
                        <p className='text-dark'>{coach.phone}</p>
                      </div>
                    </div>
                  </div>
                  <div className='card-footer d-flex align-items-center justify-content-between'>
                    <span className='badge badge-soft-primary'>
                      {coach.players?.length || 0} Players
                    </span>
                    <div
                      className='btn btn-light btn-sm cursor-pointer'
                      onClick={() => handleCoachClick(coach)}
                    >
                      View Details
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {coachesToDisplay.length <
              (sortOrder ? sortedCoaches : filteredCoaches).length && (
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

export default CoachGrid;
