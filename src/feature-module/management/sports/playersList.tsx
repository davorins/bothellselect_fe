import React, { useRef, useState, useEffect } from 'react';
import {
  useSearchParams,
  useLocation,
  Link,
  useNavigate,
} from 'react-router-dom';
import { Table } from 'antd';
import { PlayerFilters } from '../../components/Filters/PlayerFilters';
import { PlayerSortOptions } from '../../components/Filters/PlayerSortOptions';
import { getPlayerTableColumns } from '../../components/Tables/PlayerTableColumns';
import { filterPlayerData, sortPlayerData } from '../../../utils/playerUtils';
import { PlayerFilterParams } from '../../../types/playerTypes';
import PredefinedDateRanges from '../../../core/common/datePicker';
import { useAuth } from '../../../context/AuthContext';
import { all_routes } from '../../router/all_routes';
import { Moment } from 'moment';
import { Player } from '../../../types/types';
import { PlayerTableData } from '../../../types/playerTypes';

const PlayersList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const schoolParam = searchParams.get('school') || '';
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const { parent, players, fetchAllPlayers, fetchGuardians } = useAuth();

  // Get season and year from URL params
  const seasonParam = searchParams.get('season') || '';
  const yearParam = searchParams.get('year') || '';

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
    schoolFilter: schoolParam,
  });

  const [sortOrder, setSortOrder] = useState<
    'asc' | 'desc' | 'recentlyViewed' | 'recentlyAdded' | null
  >(null);
  const [loading, setLoading] = useState(true);

  const handlePlayerClick = async (record: PlayerTableData) => {
    try {
      // Fetch guardians data for this player
      const guardians = await fetchGuardians(record.id);

      navigate(`${all_routes.playerDetail}/${record.id}`, {
        state: {
          player: {
            _id: record.id,
            fullName: record.name,
            gender: record.gender,
            grade: record.class,
            dob: record.dob,
            schoolName: record.section,
            healthConcerns: record.healthConcerns,
            aauNumber: record.aauNumber,
            season: record.season,
            registrationYear: record.registrationYear,
            avatar: record.imgSrc,
            status: record.status,
            parentId: record.parentId, // Make sure parentId is included in PlayerTableData
          },
          guardians, // Pass the fetched guardians data
          from: location.pathname,
        },
      });
    } catch (error) {
      console.error('Error fetching guardians:', error);
      // Fallback navigation without guardians data
      navigate(`${all_routes.playerDetail}/${record.id}`, {
        state: {
          player: {
            _id: record.id,
            fullName: record.name,
            // ... other player fields
          },
          from: location.pathname,
        },
      });
    }
  };

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
      schoolFilter: schoolParam,
    });
  };

  const handleDateRangeChange = (range: [Moment, Moment] | null) => {
    handleFilterChange({ dateRange: range });
  };

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setLoading(true);
        await fetchAllPlayers();
      } catch (error) {
        console.error('Error loading players:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, [fetchAllPlayers]);

  // Update filters when URL params change
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      seasonParam: searchParams.get('season') || '',
      yearParam: searchParams.get('year') || '',
      schoolFilter: searchParams.get('school') || '',
    }));
  }, [searchParams]);

  const transformPlayerData = (players: Player[]): PlayerTableData[] => {
    return players.map((player) => ({
      id: player._id,
      key: player._id,
      name: player.fullName,
      gender: player.gender,
      dob: player.dob,
      age: calculateAge(player.dob),
      section: player.schoolName,
      class: player.grade,
      status: player.status || (player.paymentComplete ? 'Active' : 'Inactive'),
      DateofJoin: player.createdAt,
      healthConcerns: player.healthConcerns,
      imgSrc: player.avatar || getDefaultAvatar(player.gender),
      aauNumber: player.aauNumber,
      parentId: player.parentId,
      siblings: [],
      guardians: [],
      season: player.season,
      registrationYear: player.registrationYear,
      paymentInfo: {
        status: player.paymentComplete ? 'paid' : 'pending',
        lastFour: '',
        cardBrand: '',
        expDate: '',
        amount: 0,
        paymentDate: player.createdAt || '',
        receiptUrl: '',
        transactionId: '',
      },
    }));
  };

  // Helper function to calculate age from DOB
  const calculateAge = (dob: string | undefined): number => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  // Helper function to get default avatar based on gender
  const getDefaultAvatar = (gender?: string): string => {
    return gender === 'Female'
      ? 'https://bothell-select.onrender.com/uploads/avatars/girl.png'
      : 'https://bothell-select.onrender.com/uploads/avatars/boy.png';
  };

  const transformedPlayers = transformPlayerData(players);
  const filteredPlayers = filterPlayerData(transformedPlayers, filters);
  const sortedPlayers = sortPlayerData(filteredPlayers, sortOrder);

  // Get columns with the click handler
  const columns = getPlayerTableColumns({
    handlePlayerClick: (record) => handlePlayerClick(record),
    location,
  });

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='d-md-flex d-block align-items-center justify-content-between mb-3'>
          <div className='my-auto mb-2'>
            <h3 className='page-title mb-1'>Players</h3>
            <nav>
              <ol className='breadcrumb mb-0'>
                <li className='breadcrumb-item'>
                  <Link to={all_routes.adminDashboard}>Dashboard</Link>
                </li>
                <li className='breadcrumb-item'>
                  <Link to='#'>Management</Link>
                </li>
                <li className='breadcrumb-item active' aria-current='page'>
                  Players
                </li>
              </ol>
            </nav>
          </div>
          <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
            <div className='mb-2'>
              <Link to={all_routes.addPlayer} className='btn btn-primary'>
                <i className='ti ti-square-rounded-plus me-2' />
                Add Players
              </Link>
            </div>
          </div>
        </div>

        <div className='card'>
          <div className='card-header d-flex align-items-center justify-content-between flex-wrap pb-0'>
            <h4 className='mb-3'>Players List</h4>
            <div className='d-flex align-items-center flex-wrap'>
              {parent?.role === 'admin' && (
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
                      <PlayerFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilters}
                      />
                    </div>
                  </div>

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
                </>
              )}
            </div>
          </div>
          <div className='card-body p-0 py-3'>
            <Table
              dataSource={sortOrder ? sortedPlayers : filteredPlayers}
              columns={columns}
              rowSelection={{}}
              loading={loading}
              rowKey='key'
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayersList;
