// components/Teams/TeamList.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { Table, Button, Alert, Select, message, Tabs } from 'antd';
import {
  TeamOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import Swal from 'sweetalert2';
import { InternalTeamTableData } from '../../../types/teamTypes';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { debounce } from 'lodash';
import {
  getTeamTableColumns,
  TeamTableSkeleton,
} from '../Tables/TeamTableColumns';
import { TeamListHeader } from '../Headers/TeamListHeader';
import { TeamFilters } from '../Filters/TeamFilters';
import { TeamSortOptions } from '../Filters/TeamSortOptions';
import { Moment } from 'moment';
import './TeamList.scss';

const { Option } = Select;
const { TabPane } = Tabs;

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface TeamFilterParams {
  nameFilter: string;
  yearFilter: string | null;
  gradeFilter: string | null;
  genderFilter: string | null;
  statusFilter: string | null;
  dateRange: [Moment, Moment] | null;
}

export type TeamSortOrder = 'asc' | 'desc' | 'recent' | 'recentlyAdded' | null;

const TeamList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [teams, setTeams] = useState<InternalTeamTableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const { getAuthToken, currentUser } = useAuth();

  // ── Filter state ───────────────────────────────────────────────────────────
  const [localFilters, setLocalFilters] = useState<TeamFilterParams>({
    nameFilter: '',
    yearFilter: searchParams.get('year') || null,
    gradeFilter: searchParams.get('grade') || null,
    genderFilter: searchParams.get('gender') || null,
    statusFilter: searchParams.get('status') || null,
    dateRange: null,
  });

  const [localSortOrder, setLocalSortOrder] = useState<TeamSortOrder>('recent');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const [metadata, setMetadata] = useState({
    years: [] as number[],
    grades: [] as string[],
    tryoutSeasons: [] as string[],
  });

  const gradeOptions = useMemo(() => {
    const grades = [];
    for (let i = 1; i <= 12; i++) {
      let suffix = 'th';
      if (i === 1) suffix = 'st';
      else if (i === 2) suffix = 'nd';
      else if (i === 3) suffix = 'rd';
      grades.push({ value: i.toString(), label: `${i}${suffix} Grade` });
    }
    return grades;
  }, []);

  const fetchTeams = async (filterParams = {}) => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const queryParams = new URLSearchParams(filterParams).toString();
      const url = `${API_BASE_URL}/internal-teams${queryParams ? `?${queryParams}` : ''}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch teams');
      }

      const data = await response.json();
      setTeams(
        data.map((team: any) => ({
          id: team._id,
          key: team._id,
          name: team.name,
          year: team.year,
          grade: team.grade,
          gender: team.gender,
          coachCount: team.coachIds?.length || 0,
          playerCount: team.playerIds?.length || 0,
          status: team.status,
          tryoutSeason: team.tryoutSeason,
          tryoutYear: team.tryoutYear,
          coachIds: team.coachIds || [],
          playerIds: team.playerIds || [],
          levelOfCompetition: team.levelOfCompetition,
          tournaments: team.tournaments || [],
        })),
      );
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/internal-teams/metadata`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMetadata({
          years: data.years || [],
          grades: data.grades || [],
          tryoutSeasons: data.tryoutSeasons || [],
        });
      } else {
        setMetadata({
          years: [2024, 2025],
          grades: [],
          tryoutSeasons: ['Partizan Tryout'],
        });
      }
    } catch (err) {
      setMetadata({
        years: [2024, 2025],
        grades: [],
        tryoutSeasons: ['Partizan Tryout'],
      });
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchMetadata();
  }, []);

  // ── Toggle team status inline ──────────────────────────────────────────────
  const handleToggleTeamStatus = useCallback(
    async (teamId: string, currentStatus: string) => {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      // Optimistic update
      setTeams((prev) =>
        prev.map((t) => (t.id === teamId ? { ...t, status: newStatus } : t)),
      );
      try {
        const token = await getAuthToken();
        await axios.patch(
          `${API_BASE_URL}/internal-teams/${teamId}/status`,
          { status: newStatus },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } catch (err) {
        // Revert on failure
        setTeams((prev) =>
          prev.map((t) =>
            t.id === teamId ? { ...t, status: currentStatus } : t,
          ),
        );
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: 'Could not update team status. Please try again.',
          confirmButtonColor: '#3085d6',
        });
      }
    },
    [getAuthToken],
  );

  const debouncedFilterChange = useMemo(
    () =>
      debounce((newFilters: Partial<TeamFilterParams>) => {
        setLocalFilters((prev) => ({ ...prev, ...newFilters }));
        setPagination((prev) => ({ ...prev, current: 1 }));
      }, 300),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedFilterChange.cancel();
    };
  }, [debouncedFilterChange]);

  const handleFilterChange = useCallback(
    (newFilters: Partial<TeamFilterParams>) => {
      debouncedFilterChange(newFilters);
    },
    [debouncedFilterChange],
  );

  const handleResetFilters = useCallback(() => {
    setLocalFilters({
      nameFilter: '',
      yearFilter: null,
      gradeFilter: null,
      genderFilter: null,
      statusFilter: null,
      dateRange: null,
    });
    setLocalSortOrder('recent');
    setPagination((prev) => ({ ...prev, current: 1 }));
    message.info('Filters reset');
  }, []);

  const handleSortChange = useCallback((newSortOrder: TeamSortOrder) => {
    setLocalSortOrder(newSortOrder);
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesName = team.name
        .toLowerCase()
        .includes(localFilters.nameFilter.toLowerCase());
      const matchesYear =
        !localFilters.yearFilter ||
        team.year.toString() === localFilters.yearFilter;
      const matchesGrade =
        !localFilters.gradeFilter || team.grade === localFilters.gradeFilter;
      const matchesGender =
        !localFilters.genderFilter || team.gender === localFilters.genderFilter;
      const matchesStatus =
        !localFilters.statusFilter || team.status === localFilters.statusFilter;
      return (
        matchesName &&
        matchesYear &&
        matchesGrade &&
        matchesGender &&
        matchesStatus
      );
    });
  }, [teams, localFilters]);

  const sortedTeams = useMemo(() => {
    if (!localSortOrder) return filteredTeams;
    return [...filteredTeams].sort((a, b) => {
      if (localSortOrder === 'asc') return a.name.localeCompare(b.name);
      if (localSortOrder === 'desc') return b.name.localeCompare(a.name);
      if (localSortOrder === 'recent' || localSortOrder === 'recentlyAdded')
        return (b.year || 0) - (a.year || 0);
      return 0;
    });
  }, [filteredTeams, localSortOrder]);

  const handleTableChange = useCallback((newPagination: any) => {
    setTableLoading(true);
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
    setTimeout(() => setTableLoading(false), 100);
  }, []);

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: `You are about to permanently delete team: ${teamName}. This action cannot be undone!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            const token = await getAuthToken();
            const response = await fetch(
              `${API_BASE_URL}/internal-teams/${teamId}`,
              {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              },
            );
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to delete team');
            }
            return await response.json();
          } catch (error) {
            Swal.showValidationMessage(
              `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw error;
          }
        },
        allowOutsideClick: () => !Swal.isLoading(),
      });

      if (result.isConfirmed) {
        setTeams((prevTeams) => prevTeams.filter((team) => team.id !== teamId));
        await Swal.fire({
          title: 'Deleted!',
          text: `Team "${teamName}" has been permanently deleted.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
        message.success(`Team "${teamName}" deleted permanently`);
      }
    } catch (err) {
      console.error('Delete error:', err);
      await Swal.fire({
        title: 'Error!',
        text: err instanceof Error ? err.message : 'Failed to delete team',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
      setError(err instanceof Error ? err.message : 'Failed to delete team');
    }
  };

  const handleRefresh = useCallback(() => {
    fetchTeams();
    message.success('Refreshing teams...');
  }, []);

  // Columns — pass handleToggleTeamStatus so status column can render inline toggle
  const columns = useMemo(() => {
    try {
      const cols = getTeamTableColumns({
        handleDeleteTeam,
        handleToggleTeamStatus,
        location,
        loading: loading && teams.length === 0,
        currentUserRole: currentUser?.role,
      });
      return Array.isArray(cols) ? cols : [];
    } catch (error) {
      console.error('Error generating columns:', error);
      return [];
    }
  }, [
    handleDeleteTeam,
    handleToggleTeamStatus,
    location,
    loading,
    teams.length,
    currentUser?.role,
  ]);

  const dataSource = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    return sortedTeams.slice(start, start + pagination.pageSize);
  }, [sortedTeams, pagination]);

  if (loading && teams.length === 0) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div className='card'>
            <div className='card-body'>
              <div className='text-center p-4'>
                <LoadingSpinner />
                <p className='mt-3 text-muted'>Loading teams...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && teams.length === 0) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div className='alert alert-danger'>
            <h4>Error Loading Data</h4>
            <p>{error}</p>
            <Button
              type='primary'
              onClick={() => window.location.reload()}
              className='me-2'
            >
              <ReloadOutlined /> Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <TeamListHeader teamData={teams} onRefresh={handleRefresh} />
        {localFilters.gradeFilter && (
          <div className='alert alert-info d-flex align-items-center justify-content-between mb-3'>
            <span>
              <i className='ti ti-school me-2' />
              Showing teams for grade:{' '}
              <strong>Grade {localFilters.gradeFilter}</strong>
            </span>
            <button
              className='btn btn-sm btn-outline-secondary'
              onClick={() => {
                setLocalFilters((prev) => ({ ...prev, gradeFilter: null }));
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
            >
              <i className='ti ti-x me-1' />
              Clear
            </button>
          </div>
        )}

        <div className='card'>
          <div className='card-header d-flex align-items-center justify-content-between flex-wrap pb-0'>
            <h4 className='mb-5'></h4>
            <div className='d-flex align-items-center flex-wrap'>
              {(currentUser?.role === 'admin' || currentUser?.isCoach) && (
                <div className='dropdown mb-3 me-2'>
                  <Link
                    to='#'
                    className='btn btn-outline-light bg-white dropdown-toggle'
                    data-bs-toggle='dropdown'
                    data-bs-auto-close='outside'
                  >
                    <FilterOutlined className='me-2' />
                    Filter
                  </Link>
                  <div
                    className='dropdown-menu drop-width'
                    ref={dropdownMenuRef}
                  >
                    <TeamFilters
                      filters={localFilters}
                      onFilterChange={handleFilterChange}
                      onReset={handleResetFilters}
                      gradeOptions={gradeOptions}
                      yearOptions={metadata.years}
                    />
                  </div>
                </div>
              )}

              <div className='dropdown mb-3'>
                <Link
                  to='#'
                  className='btn btn-outline-light bg-white dropdown-toggle'
                  data-bs-toggle='dropdown'
                >
                  <SortAscendingOutlined className='me-2' />
                  {localSortOrder === 'asc'
                    ? 'A-Z'
                    : localSortOrder === 'desc'
                      ? 'Z-A'
                      : localSortOrder === 'recent' ||
                          localSortOrder === 'recentlyAdded'
                        ? 'Most Recent'
                        : 'Sort by'}
                </Link>
                <TeamSortOptions
                  sortOrder={localSortOrder}
                  onSortChange={handleSortChange}
                />
              </div>
            </div>
          </div>

          <div className='card-body p-0 py-3'>
            {loading && teams.length > 0 && (
              <div className='alert alert-info mb-3 mx-3'>
                <i className='ti ti-loader me-2'></i>Updating teams... Please
                wait.
              </div>
            )}

            {loading && teams.length === 0 ? (
              <TeamTableSkeleton rows={10} />
            ) : (
              <>
                {columns && columns.length > 0 ? (
                  <div className='table-responsive'>
                    <Table
                      columns={columns}
                      dataSource={dataSource}
                      rowKey='id'
                      pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: sortedTeams.length,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                      }}
                      onChange={handleTableChange}
                      loading={tableLoading}
                      scroll={{ x: true }}
                      style={{ marginTop: '-28px' }}
                    />
                  </div>
                ) : (
                  <div className='text-center p-4'>
                    <i className='ti ti-database fs-1 text-muted mb-3'></i>
                    <p className='text-muted'>Unable to load table columns</p>
                    <button
                      className='btn btn-primary btn-sm'
                      onClick={() => window.location.reload()}
                    >
                      Refresh Page
                    </button>
                  </div>
                )}
              </>
            )}

            {error && (
              <Alert
                message='Error'
                description={error}
                type='error'
                showIcon
                closable
                onClose={() => setError(null)}
                className='mb-3 mx-3'
              />
            )}

            {!loading && filteredTeams.length === 0 && (
              <div className='text-center py-5'>
                <TeamOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                <h4 className='mt-3'>No Teams Found</h4>
                <p className='text-muted'>
                  {teams.length === 0
                    ? 'Create your first team to get started.'
                    : 'No teams match the current filters.'}
                </p>
                {teams.length > 0 && (
                  <div className='mt-2'>
                    <Button
                      className='btn-outline-secondary'
                      onClick={handleResetFilters}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamList;
