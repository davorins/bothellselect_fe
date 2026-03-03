// components/Teams/TeamList.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { Link } from 'react-router-dom';
import { Table, Button, Alert, Space, Select, Input, message } from 'antd';
import {
  PlusOutlined,
  TeamOutlined,
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import Swal from 'sweetalert2'; // Add this import
import { InternalTeamTableData } from '../../../types/teamTypes';
import { useAuth } from '../../../context/AuthContext';
import { all_routes } from '../../router/all_routes';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { debounce } from 'lodash';
import './TeamList.scss';

const { Option } = Select;

interface TeamFilterParams {
  nameFilter: string;
  yearFilter: string | null;
  gradeFilter: string | null;
  genderFilter: string | null;
  statusFilter: string | null;
}

const TeamList: React.FC = () => {
  const [teams, setTeams] = useState<InternalTeamTableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);

  const [filters, setFilters] = useState<TeamFilterParams>({
    nameFilter: '',
    yearFilter: null,
    gradeFilter: null,
    genderFilter: null,
    statusFilter: null,
  });

  const [sortOrder, setSortOrder] = useState<
    'asc' | 'desc' | 'recentlyAdded' | null
  >(null);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  const [metadata, setMetadata] = useState({
    years: [] as number[],
    grades: [] as string[],
    tryoutSeasons: [] as string[],
  });
  const { getAuthToken } = useAuth();

  // Generate grades 1-12 for the filter dropdown
  const gradeOptions = useMemo(() => {
    const grades = [];
    for (let i = 1; i <= 12; i++) {
      let suffix = 'th';
      if (i === 1) suffix = 'st';
      else if (i === 2) suffix = 'nd';
      else if (i === 3) suffix = 'rd';

      grades.push({
        value: i.toString(),
        label: `${i}${suffix} Grade`,
      });
    }
    return grades;
  }, []);

  const fetchTeams = async (filterParams = {}) => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const queryParams = new URLSearchParams(filterParams).toString();

      const url = `${process.env.REACT_APP_API_BASE_URL}/internal-teams${
        queryParams ? `?${queryParams}` : ''
      }`;
      console.log('Fetching teams from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch teams');
      }

      const data = await response.json();
      console.log('Teams data received:', data);

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
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/internal-teams/metadata`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Metadata received:', data);
        setMetadata({
          years: data.years || [],
          grades: data.grades || [], // Keep this but we'll use gradeOptions for display
          tryoutSeasons: data.tryoutSeasons || [],
        });
      } else {
        console.warn('Failed to fetch metadata, using defaults');
        setMetadata({
          years: [2024, 2025],
          grades: [],
          tryoutSeasons: ['Partizan Tryout'],
        });
      }
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
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

  // Debounced filter changes
  const debouncedFilterChange = useMemo(
    () =>
      debounce((newFilters: Partial<TeamFilterParams>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setPagination((prev) => ({ ...prev, current: 1 }));
      }, 300),
    [],
  );

  // Filter teams
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesName = team.name
        .toLowerCase()
        .includes(filters.nameFilter.toLowerCase());
      const matchesYear =
        !filters.yearFilter || team.year.toString() === filters.yearFilter;
      const matchesGrade =
        !filters.gradeFilter || team.grade === filters.gradeFilter;
      const matchesGender =
        !filters.genderFilter || team.gender === filters.genderFilter;
      const matchesStatus =
        !filters.statusFilter || team.status === filters.statusFilter;

      return (
        matchesName &&
        matchesYear &&
        matchesGrade &&
        matchesGender &&
        matchesStatus
      );
    });
  }, [teams, filters]);

  // Sort teams
  const sortedTeams = useMemo(() => {
    if (!sortOrder) return filteredTeams;
    return [...filteredTeams].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.name.localeCompare(b.name);
      } else if (sortOrder === 'desc') {
        return b.name.localeCompare(a.name);
      } else if (sortOrder === 'recentlyAdded') {
        return b.year - a.year;
      }
      return 0;
    });
  }, [filteredTeams, sortOrder]);

  const handleFilterChange = useCallback(
    (newFilters: Partial<TeamFilterParams>) => {
      debouncedFilterChange(newFilters);
    },
    [debouncedFilterChange],
  );

  const handleResetFilters = useCallback(() => {
    setFilters({
      nameFilter: '',
      yearFilter: null,
      gradeFilter: null,
      genderFilter: null,
      statusFilter: null,
    });
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  const handleTableChange = useCallback((newPagination: any) => {
    setTableLoading(true);
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
    setTimeout(() => setTableLoading(false), 100);
  }, []);

  // Updated delete function with SweetAlert2 and hard delete
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
              `${process.env.REACT_APP_API_BASE_URL}/internal-teams/${teamId}`,
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
        // Remove the deleted team from state
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

  const columns = [
    {
      title: 'Team Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: InternalTeamTableData) => {
        // Use your custom images based on gender
        const avatarUrl =
          record.gender === 'Female'
            ? 'https://partizan-be.onrender.com/uploads/avatars/girl.png'
            : 'https://partizan-be.onrender.com/uploads/avatars/boy.png';

        return (
          <div className='d-flex align-items-center'>
            <div className='avatar avatar-sm flex-shrink-0 me-2'>
              <img
                src={avatarUrl}
                className='img-fluid rounded-circle'
                alt={`${text} avatar`}
                style={{
                  width: '28px',
                  height: '28px',
                  objectFit: 'cover',
                  border: '1px solid #e8e8e8',
                }}
              />
            </div>
            <Link
              to={`${all_routes.teamDetail}/${record.id}`}
              className='text-primary fw-medium'
            >
              {text} {record.year}
            </Link>
          </div>
        );
      },
    },
    {
      title: 'Year',
      dataIndex: 'year',
      key: 'year',
    },
    {
      title: 'Grade',
      dataIndex: 'grade',
      key: 'grade',
      render: (grade: string) => {
        if (!grade) return '-';
        const gradeNum = parseInt(grade);
        if (isNaN(gradeNum)) return grade;

        let suffix = 'th';
        if (gradeNum === 1) suffix = 'st';
        else if (gradeNum === 2) suffix = 'nd';
        else if (gradeNum === 3) suffix = 'rd';

        return `${gradeNum}${suffix} Grade`;
      },
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      key: 'gender',
    },
    {
      title: 'Players',
      dataIndex: 'playerCount',
      key: 'playerCount',
      align: 'center' as const,
    },
    {
      title: 'Coaches',
      dataIndex: 'coachCount',
      key: 'coachCount',
      align: 'center' as const,
    },
    {
      title: 'Tryout Season',
      dataIndex: 'tryoutSeason',
      key: 'tryoutSeason',
      render: (tryoutSeason: string) => (
        <span className='text-muted'>{tryoutSeason || '-'}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span
          className={`badge badge-soft-${
            status === 'active'
              ? 'success'
              : status === 'pending'
                ? 'warning'
                : 'danger'
          } d-inline-flex align-items-center`}
        >
          <i
            className={`ti ti-circle-filled fs-5 me-1 ${
              status === 'active'
                ? 'text-success'
                : status === 'pending'
                  ? 'text-warning'
                  : 'text-danger'
            }`}
          ></i>
          {status === 'active'
            ? 'Active'
            : status === 'pending'
              ? 'Pending Payment'
              : 'Inactive'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      render: (_: unknown, record: InternalTeamTableData) => (
        <Space>
          <Link to={`${all_routes.editTeam}/${record.id}`}>
            <Button
              type='link'
              className='btn-outline-primary btn-sm'
              icon={<EditOutlined />}
            >
              Edit
            </Button>
          </Link>
          <Button
            type='link'
            danger
            className='btn-outline-danger btn-sm'
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteTeam(record.id, record.name)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedFilterChange.cancel();
    };
  }, [debouncedFilterChange]);

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
        <div className='card'>
          <div className='card-header d-flex align-items-center justify-content-between flex-wrap pb-0'>
            <h4 className='mb-5'>Team Management</h4>
            <div className='d-flex align-items-center flex-wrap'>
              <Link to={all_routes.createTeam}>
                <Button
                  className='btn btn-primary d-flex align-items-center mb-3 me-2'
                  icon={<PlusOutlined />}
                >
                  Create New Team
                </Button>
              </Link>
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
                <div className='dropdown-menu drop-width' ref={dropdownMenuRef}>
                  <div className='p-3'>
                    <h5>Filter Teams</h5>
                    <div className='mb-3'>
                      <label className='form-label'>Team Name</label>
                      <Input
                        type='text'
                        className='form-control'
                        value={filters.nameFilter}
                        onChange={(e) =>
                          handleFilterChange({ nameFilter: e.target.value })
                        }
                        placeholder='Search team name...'
                      />
                    </div>
                    <div className='mb-3'>
                      <label className='form-label'>Year</label>
                      <Select
                        style={{ width: '100%' }}
                        value={filters.yearFilter}
                        onChange={(value) =>
                          handleFilterChange({ yearFilter: value })
                        }
                        allowClear
                        placeholder='Select year'
                      >
                        {(metadata.years || []).map((year: number) => (
                          <Option key={year} value={year.toString()}>
                            {year}
                          </Option>
                        ))}
                      </Select>
                    </div>
                    <div className='mb-3'>
                      <label className='form-label'>Grade</label>
                      <Select
                        style={{ width: '100%' }}
                        value={filters.gradeFilter}
                        onChange={(value) =>
                          handleFilterChange({ gradeFilter: value })
                        }
                        allowClear
                        placeholder='Select grade'
                      >
                        {/* Use gradeOptions instead of metadata.grades */}
                        {gradeOptions.map((grade) => (
                          <Option key={grade.value} value={grade.value}>
                            {grade.label}
                          </Option>
                        ))}
                      </Select>
                    </div>
                    <div className='mb-3'>
                      <label className='form-label'>Gender</label>
                      <Select
                        style={{ width: '100%' }}
                        value={filters.genderFilter}
                        onChange={(value) =>
                          handleFilterChange({ genderFilter: value })
                        }
                        allowClear
                        placeholder='Select gender'
                      >
                        <Option value='Male'>Male</Option>
                        <Option value='Female'>Female</Option>
                      </Select>
                    </div>
                    <div className='mb-3'>
                      <label className='form-label'>Status</label>
                      <Select
                        style={{ width: '100%' }}
                        value={filters.statusFilter}
                        onChange={(value) =>
                          handleFilterChange({ statusFilter: value })
                        }
                        allowClear
                        placeholder='Select status'
                      >
                        <Option value='active'>Active</Option>
                        <Option value='pending'>Pending Payment</Option>
                        <Option value='inactive'>Inactive</Option>
                      </Select>
                    </div>
                    <button
                      className='btn btn-outline-secondary w-100'
                      onClick={handleResetFilters}
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>
              <div className='dropdown mb-3'>
                <Link
                  to='#'
                  className='btn btn-outline-light bg-white dropdown-toggle'
                  data-bs-toggle='dropdown'
                >
                  <SortAscendingOutlined className='me-2' />
                  {sortOrder === 'asc'
                    ? 'A-Z'
                    : sortOrder === 'desc'
                      ? 'Z-A'
                      : sortOrder === 'recentlyAdded'
                        ? 'Recently Added'
                        : 'Sort by'}
                </Link>
                <div className='dropdown-menu'>
                  <Link
                    className='dropdown-item'
                    to='#'
                    onClick={() => setSortOrder('asc')}
                  >
                    Sort by A-Z
                  </Link>
                  <Link
                    className='dropdown-item'
                    to='#'
                    onClick={() => setSortOrder('desc')}
                  >
                    Sort by Z-A
                  </Link>
                  <Link
                    className='dropdown-item'
                    to='#'
                    onClick={() => setSortOrder('recentlyAdded')}
                  >
                    Sort by Recently Added
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className='card-body p-0 py-3'>
            {/* Loading indicators */}
            {loading && (
              <div className='alert alert-info mb-3'>
                <i className='ti ti-loader me-2'></i>
                Loading teams... Please wait.
              </div>
            )}

            {/* Error alert */}
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

            {filteredTeams.length === 0 && !loading ? (
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
            ) : (
              <div className='table-responsive'>
                <Table
                  columns={columns}
                  dataSource={sortOrder ? sortedTeams : filteredTeams}
                  rowKey='id'
                  pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: filteredTeams.length,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showTotal: (total, range) =>
                      `Showing ${range[0]}-${range[1]} of ${total} teams`,
                  }}
                  onChange={handleTableChange}
                  loading={tableLoading}
                  scroll={{ x: true }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamList;
