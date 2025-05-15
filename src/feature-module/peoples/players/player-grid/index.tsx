import React, { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { all_routes } from '../../../router/all_routes';
import PredefinedDateRanges from '../../../../core/common/datePicker';
import { useAuth } from '../../../../context/AuthContext';
import { usePlayerData } from '../../../hooks/usePlayerData';
import { usePlayerActions } from '../../../hooks/usePlayerActions';
import {
  filterPlayerData,
  sortPlayerData,
  convertToPlayer,
} from '../../../../utils/playerUtils';
import {
  PlayerFilterParams,
  PlayerTableData,
} from '../../../../types/playerTypes';
import { PlayerListHeader } from '../../../components/Headers/PlayerListHeader';
import { PlayerFilters } from '../../../components/Filters/PlayerFilters';
import { PlayerSortOptions } from '../../../components/Filters/PlayerSortOptions';
import { Moment } from 'moment';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const PlayerGrid = () => {
  const routes = all_routes;
  const location = useLocation();
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const { parent } = useAuth();

  // Filter states
  const [filters, setFilters] = useState<PlayerFilterParams>({
    nameFilter: '',
    genderFilter: null,
    gradeFilter: null,
    ageFilter: null,
    statusFilter: null,
    dateRange: null,
    seasonParam: null,
    yearParam: null,
    schoolFilter: null,
  });

  const seasonParam = filters.seasonParam || null;
  const yearParam = filters.yearParam || null;
  const { loading, error, playerData } = usePlayerData(seasonParam, yearParam);

  const { handlePlayerClick } = usePlayerActions();

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 12;

  const [sortOrder, setSortOrder] = useState<
    'asc' | 'desc' | 'recentlyViewed' | 'recentlyAdded' | null
  >(null);

  const handleFilterChange = (newFilters: Partial<PlayerFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      nameFilter: '',
      genderFilter: null,
      gradeFilter: null,
      ageFilter: null,
      statusFilter: null,
      dateRange: null,
      seasonParam: null,
      yearParam: null,
      schoolFilter: null,
    });
  };

  const handleDateRangeChange = (range: [Moment, Moment] | null) => {
    handleFilterChange({ dateRange: range });
  };

  const filteredPlayers = filterPlayerData(playerData, filters);
  const sortedPlayers = sortPlayerData(filteredPlayers, sortOrder);

  const handleLoadMore = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const playersToDisplay = (sortOrder ? sortedPlayers : filteredPlayers).slice(
    0,
    currentPage * playersPerPage
  );

  const handlePlayerView = (player: PlayerTableData) => {
    const playerForNavigation = convertToPlayer(player);
    handlePlayerClick(playerForNavigation);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <div className='page-wrapper'>
        <div className='content content-two'>
          <PlayerListHeader
            seasonParam={seasonParam}
            yearParam={yearParam}
            playerData={sortOrder ? sortedPlayers : filteredPlayers}
          />
          <div className='bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0'>
            <h4 className='mb-3'>Players Grid</h4>
            <div className='d-flex align-items-center flex-wrap'>
              {parent?.role === 'admin' && (
                <div className='input-icon-start mb-3 me-2 position-relative'>
                  <PredefinedDateRanges onDateChange={handleDateRangeChange} />
                </div>
              )}

              {parent?.role === 'admin' && (
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
                      filters={filters}
                      onFilterChange={handleFilterChange}
                      onReset={handleResetFilters}
                    />
                  </div>
                </div>
              )}

              <div className='d-flex align-items-center bg-white border rounded-2 p-1 mb-3 me-2'>
                <Link
                  to={routes.PlayerList}
                  className='btn btn-icon btn-sm me-1 bg-light primary-hover'
                >
                  <i className='ti ti-list-tree' />
                </Link>
                <Link
                  to={routes.studentGrid}
                  className='active btn btn-icon btn-sm primary-hover'
                >
                  <i className='ti ti-grid-dots' />
                </Link>
              </div>

              {parent?.role === 'admin' && (
                <div className='dropdown mb-3'>
                  <Link
                    to='#'
                    className='btn btn-outline-light bg-white dropdown-toggle'
                    data-bs-toggle='dropdown'
                  >
                    <i className='ti ti-sort-ascending-2 me-2' />
                    Sort by A-Z
                  </Link>
                  <PlayerSortOptions
                    sortOrder={sortOrder}
                    onSortChange={setSortOrder}
                  />
                </div>
              )}
            </div>
          </div>

          <div className='row'>
            {playersToDisplay.map((player) => (
              <div
                key={player.id}
                className='col-xxl-3 col-xl-4 col-md-6 d-flex'
              >
                <div className='card flex-fill'>
                  <div className='card-header d-flex align-items-center justify-content-between'>
                    AAU Number: {player.aauNumber || 'No AAU Number'}
                    <div className='d-flex align-items-center'>
                      <span
                        className={`badge badge-soft-${
                          player.status === 'Active' ? 'success' : 'danger'
                        } d-inline-flex align-items-center me-1`}
                      >
                        <i className='ti ti-circle-filled fs-5 me-1' />
                        {player.status}
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
                            onClick={() => handlePlayerView(player)}
                          >
                            <i className='ti ti-menu me-2' />
                            View
                          </div>
                          <li>
                            <Link
                              to={`${routes.editPlayer}/${player.id}`}
                              state={{
                                player: {
                                  ...player,
                                  playerId: player.id,
                                  _id: player.id,
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
                          onClick={() => handlePlayerView(player)}
                          className='avatar avatar-lg flex-shrink-0 cursor-pointer'
                        >
                          <img
                            src={
                              player.imgSrc && player.imgSrc.trim() !== ''
                                ? player.imgSrc.startsWith('http')
                                  ? player.imgSrc
                                  : `${API_BASE_URL}${player.imgSrc}`
                                : player.gender === 'Female'
                                ? 'https://bothell-select.onrender.com/uploads/avatars/girl.png'
                                : 'https://bothell-select.onrender.com/uploads/avatars/boy.png'
                            }
                            className='img-fluid rounded-circle'
                            alt={
                              player.name
                                ? `${player.name}'s profile picture`
                                : 'Guardian profile picture'
                            }
                          />
                        </div>
                        <div className='ms-2'>
                          <h5 className='mb-0'>
                            <Link
                              to={routes.playerDetail}
                              onClick={() => handlePlayerView(player)}
                            >
                              {player.name}
                            </Link>
                          </h5>
                          <p>
                            {player.class} grade, {player.section}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {playersToDisplay.length <
              (sortOrder ? sortedPlayers : filteredPlayers).length && (
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

export default PlayerGrid;
