import React, { useRef, useState, useEffect } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { Table } from 'antd';
import { PlayerListHeader } from '../../../components/Headers/PlayerListHeader';
import { PlayerFilters } from '../../../components/Filters/PlayerFilters';
import { PlayerSortOptions } from '../../../components/Filters/PlayerSortOptions';
import { getPlayerTableColumns } from '../../../components/Tables/PlayerTableColumns';
import { usePlayerData } from '../../../hooks/usePlayerData';
import { usePlayerActions } from '../../../hooks/usePlayerActions';
import {
  filterPlayerData,
  sortPlayerData,
} from '../../../../utils/playerUtils';
import { PlayerFilterParams } from '../../../../types/playerTypes';
import PredefinedDateRanges from '../../../../core/common/datePicker';
import { useAuth } from '../../../../context/AuthContext';
import { all_routes } from '../../../router/all_routes';
import { Moment } from 'moment';

const PlayerList = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const seasonParam = searchParams.get('season');
  const yearParam = searchParams.get('year');
  const { parent } = useAuth();

  // Data management
  const { loading, error, playerData } = usePlayerData(seasonParam, yearParam);
  const { handlePlayerClick } = usePlayerActions();

  // Filter states
  const [filters, setFilters] = useState<PlayerFilterParams>({
    nameFilter: '',
    genderFilter: null,
    gradeFilter: null,
    ageFilter: null,
    statusFilter: null,
    dateRange: null,
    seasonParam,
    yearParam,
    schoolFilter: null,
  });
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
      seasonParam,
      yearParam,
      schoolFilter: null,
    });
  };

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      seasonParam,
      yearParam,
    }));
  }, [seasonParam, yearParam]);

  const handleDateRangeChange = (range: [Moment, Moment] | null) => {
    handleFilterChange({ dateRange: range });
  };

  const filteredPlayers = filterPlayerData(playerData, filters);
  const sortedPlayers = sortPlayerData(filteredPlayers, sortOrder);
  const columns = getPlayerTableColumns({ handlePlayerClick, location });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <div className='page-wrapper'>
        <div className='content'>
          <PlayerListHeader seasonParam={seasonParam} yearParam={yearParam} />
          <div className='card'>
            <div className='card-header d-flex align-items-center justify-content-between flex-wrap pb-0'>
              <h4 className='mb-3'>Players List</h4>
              <div className='d-flex align-items-center flex-wrap'>
                {parent?.role === 'admin' && (
                  <div className='input-icon-start mb-3 me-2 position-relative'>
                    <PredefinedDateRanges
                      onDateChange={handleDateRangeChange}
                    />
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
                    to={all_routes.playerList}
                    className='active btn btn-icon btn-sm me-1 primary-hover'
                  >
                    <i className='ti ti-list-tree' />
                  </Link>
                  <Link
                    to={all_routes.studentGrid}
                    className='btn btn-icon btn-sm bg-light primary-hover'
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
            <div className='card-body p-0 py-3'>
              <Table
                dataSource={sortOrder ? sortedPlayers : filteredPlayers}
                columns={columns}
                rowSelection={{}}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlayerList;
