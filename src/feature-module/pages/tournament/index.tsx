import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Table, Select, Button, TablePaginationConfig } from 'antd';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { debounce } from 'lodash';
import { all_routes } from '../../router/all_routes';

interface Tournament {
  _id: string;
  name: string;
  year: number;
}

interface Registration {
  _id: string;
  team?: {
    _id: string;
    name: string;
    grade?: string;
    sex?: string;
    levelOfCompetition?: string;
  };
  parent?: {
    _id: string;
    fullName: string;
    email?: string;
  };
  paymentStatus?: string;
  paymentComplete?: boolean;
  registrationDate?: string;
  levelOfCompetition?: string;
}

interface TournamentFilterParams {
  teamNameFilter: string;
  gradeFilter: string | null;
  sexFilter: string | null;
  levelFilter: string | null;
  paymentStatusFilter: string | null;
}

// Updated User interface to match backend
interface User {
  _id: string;
  role: string;
}

// Type guard to check if user has admin or coach role
const isAdminOrCoachUser = (user: unknown): user is User => {
  return (
    !!user &&
    typeof user === 'object' &&
    '_id' in user &&
    'role' in user &&
    (user.role === 'admin' || user.role === 'coach')
  );
};

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

const TournamentAdminPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TournamentFilterParams>({
    teamNameFilter: '',
    gradeFilter: null,
    sexFilter: null,
    levelFilter: null,
    paymentStatusFilter: null,
  });
  const [sortOrder, setSortOrder] = useState<
    'asc' | 'desc' | 'recentlyAdded' | null
  >(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  // Fetch tournaments on mount
  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token missing');
          return;
        }
        console.log('Fetching tournaments with token: Present');
        const response = await fetch(`${API_BASE_URL}/tournaments/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: { success: boolean; tournaments: Tournament[] } =
          await response.json();
        console.log('Tournaments fetched:', data);
        const tournaments = data.tournaments || [];
        setTournaments(tournaments);
        if (tournaments.length > 0) {
          setSelectedTournament(tournaments[0]);
        } else {
          setError('No tournaments found.');
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to fetch tournaments: ${errorMessage}`);
        console.error('Error fetching tournaments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  // Fetch registrations when selectedTournament changes
  useEffect(() => {
    if (!selectedTournament) return;

    const fetchRegistrations = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token missing');
          return;
        }
        console.log('Fetching registrations for:', selectedTournament);
        console.log('Tournament Name:', selectedTournament.name);
        console.log('Tournament Year:', selectedTournament.year);
        const response = await fetch(
          `${API_BASE_URL}/registrations/by-tournament/${encodeURIComponent(
            selectedTournament.name
          )}/${selectedTournament.year}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseData: {
          success: boolean;
          registrations: Registration[];
        } = await response.json();
        const data: Registration[] = responseData.registrations || [];
        console.log('Registrations:', data);
        const validRegistrations = data.filter(
          (reg) =>
            reg._id &&
            reg.team?._id &&
            reg.team?.name &&
            reg.parent?._id &&
            reg.parent?.fullName
        );
        setRegistrations(validRegistrations);
        if (validRegistrations.length !== data.length) {
          console.warn(
            'Some registrations were filtered out due to missing data'
          );
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to fetch registrations: ${errorMessage}`);
        console.error('Error fetching registrations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRegistrations();
  }, [selectedTournament]);

  // Debounced filter changes
  const debouncedFilterChange = useMemo(
    () =>
      debounce((newFilters: Partial<TournamentFilterParams>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setPagination((prev) => ({ ...prev, current: 1 }));
      }, 300),
    []
  );

  // Filter registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      const matchesTeamName =
        reg.team?.name
          ?.toLowerCase()
          .includes(filters.teamNameFilter.toLowerCase()) ?? false;
      const matchesGrade =
        !filters.gradeFilter || (reg.team?.grade ?? '') === filters.gradeFilter;
      const matchesSex =
        !filters.sexFilter || (reg.team?.sex ?? '') === filters.sexFilter;
      const matchesLevel =
        !filters.levelFilter ||
        (reg.team?.levelOfCompetition ?? '') === filters.levelFilter;
      const matchesPaymentStatus =
        !filters.paymentStatusFilter ||
        (reg.paymentStatus ?? '') === filters.paymentStatusFilter;
      return (
        matchesTeamName &&
        matchesGrade &&
        matchesSex &&
        matchesLevel &&
        matchesPaymentStatus
      );
    });
  }, [registrations, filters]);

  // Sort registrations
  const sortedRegistrations = useMemo(() => {
    if (!sortOrder) return filteredRegistrations;
    return [...filteredRegistrations].sort((a, b) => {
      if (sortOrder === 'asc') {
        return (a.team?.name ?? '').localeCompare(b.team?.name ?? '');
      } else if (sortOrder === 'desc') {
        return (b.team?.name ?? '').localeCompare(a.team?.name ?? '');
      } else if (sortOrder === 'recentlyAdded') {
        const dateA = a.registrationDate
          ? new Date(a.registrationDate).getTime()
          : Infinity;
        const dateB = b.registrationDate
          ? new Date(b.registrationDate).getTime()
          : Infinity;
        return dateB - dateA; // Sort descending (recent first)
      }
      return 0;
    });
  }, [filteredRegistrations, sortOrder]);

  // Table columns
  const columns = useMemo(
    () => [
      {
        title: 'Team Name',
        dataIndex: ['team', 'name'],
        key: 'teamName',
        render: (text: string, record: Registration) => text || 'N/A',
      },
      {
        title: 'Grade',
        dataIndex: ['team', 'grade'],
        key: 'grade',
        render: (text: string) => text || 'N/A',
      },
      {
        title: 'Gender',
        dataIndex: ['team', 'sex'],
        key: 'sex',
        render: (text: string) => text || 'N/A',
      },
      {
        title: 'Level',
        dataIndex: ['team', 'levelOfCompetition'],
        key: 'levelOfCompetition',
        render: (text: string) => text || 'N/A',
      },
      {
        title: 'Parent',
        dataIndex: ['parent', 'fullName'],
        key: 'parentName',
        render: (text: string, record: Registration) => {
          // Only show clickable link for admins, show plain text for coaches
          if (currentUser?.role === 'admin') {
            return (
              <Link to={`/parents/${record.parent?._id ?? ''}`}>
                {text || 'N/A'}
              </Link>
            );
          }
          return <span>{text || 'N/A'}</span>;
        },
      },
      {
        title: 'Parent Email',
        dataIndex: ['parent', 'email'],
        key: 'parentEmail',
        render: (text: string) => text || 'N/A',
      },
      {
        title: 'Payment Status',
        dataIndex: 'paymentStatus',
        key: 'paymentStatus',
        render: (text: string, record: Registration) => {
          const paymentStatus =
            text || (record.paymentComplete ? 'paid' : 'pending');
          const isPaid = paymentStatus === 'paid';

          return (
            <span
              className={`badge badge-soft-${
                isPaid ? 'success' : 'warning'
              } d-inline-flex align-items-center`}
            >
              <i
                className={`ti ti-circle-filled fs-5 me-1 ${
                  isPaid ? 'text-success' : 'text-warning'
                }`}
              ></i>
              {paymentStatus
                ? paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)
                : 'Pending'}
            </span>
          );
        },
      },
    ],
    [currentUser]
  );

  // Handlers
  const handleFilterChange = (newFilters: Partial<TournamentFilterParams>) => {
    debouncedFilterChange(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      teamNameFilter: '',
      gradeFilter: null,
      sexFilter: null,
      levelFilter: null,
      paymentStatusFilter: null,
    });
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    setPagination({
      current: newPagination.current ?? 1,
      pageSize: newPagination.pageSize ?? 10,
    });
  };

  const handleRetry = () => {
    setError(null);
    setTournaments([]);
    setRegistrations([]);
    setSelectedTournament(null);
    setLoading(true);
  };

  // Authorization check for admin or coach
  if (!currentUser || !isAdminOrCoachUser(currentUser)) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div className='alert alert-danger'>
            <h4>Unauthorized</h4>
            <p>You do not have permission to access this page.</p>
            <button className='btn btn-primary' onClick={() => navigate('/')}>
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;
  if (error) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div className='alert alert-danger'>
            <h4>Error</h4>
            <p>{error}</p>
            <Button type='primary' onClick={handleRetry} className='me-2'>
              Retry
            </Button>
            <button className='btn btn-primary' onClick={() => navigate('/')}>
              Return to Home
            </button>
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
            <h4 className='mb-5'>
              Tournament Registrations
              {currentUser?.role === 'coach' && (
                <span className='badge bg-warning ms-2'>Coach View</span>
              )}
            </h4>
            <div className='d-flex align-items-center flex-wrap'>
              <div className='mb-3 me-2'>
                <Select
                  style={{ width: 200 }}
                  placeholder='Select Tournament'
                  value={
                    selectedTournament
                      ? `${selectedTournament.name}|${selectedTournament.year}`
                      : undefined
                  }
                  onChange={(value) => {
                    const [name, year] = value.split('|');
                    const tournament = tournaments.find(
                      (t) => t.name === name && t.year === parseInt(year)
                    );
                    if (tournament) {
                      setSelectedTournament(tournament);
                      setPagination((prev) => ({ ...prev, current: 1 }));
                    }
                  }}
                >
                  {tournaments.map((tournament) => (
                    <Select.Option
                      key={tournament._id}
                      value={`${tournament.name}|${tournament.year}`}
                    >
                      {tournament.name} {tournament.year}
                    </Select.Option>
                  ))}
                </Select>
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
                <div className='dropdown-menu drop-width' ref={dropdownMenuRef}>
                  <div className='p-3'>
                    <h5>Filter Registrations</h5>
                    <div className='mb-3'>
                      <label className='form-label'>Team Name</label>
                      <input
                        type='text'
                        className='form-control'
                        value={filters.teamNameFilter}
                        onChange={(e) =>
                          handleFilterChange({ teamNameFilter: e.target.value })
                        }
                      />
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
                      >
                        {[
                          'PK',
                          'K',
                          '1',
                          '2',
                          '3',
                          '4',
                          '5',
                          '6',
                          '7',
                          '8',
                          '9',
                          '10',
                          '11',
                          '12',
                        ].map((grade) => (
                          <Select.Option key={grade} value={grade}>
                            {grade === 'PK'
                              ? 'Pre-K'
                              : grade === 'K'
                              ? 'Kindergarten'
                              : `${grade} Grade`}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                    <div className='mb-3'>
                      <label className='form-label'>Gender</label>
                      <Select
                        style={{ width: '100%' }}
                        value={filters.sexFilter}
                        onChange={(value) =>
                          handleFilterChange({ sexFilter: value })
                        }
                        allowClear
                      >
                        {['Male', 'Female'].map((sex) => (
                          <Select.Option key={sex} value={sex}>
                            {sex}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                    <div className='mb-3'>
                      <label className='form-label'>Level of Competition</label>
                      <Select
                        style={{ width: '100%' }}
                        value={filters.levelFilter}
                        onChange={(value) =>
                          handleFilterChange({ levelFilter: value })
                        }
                        allowClear
                      >
                        {['Gold', 'Silver'].map((level) => (
                          <Select.Option key={level} value={level}>
                            {level}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                    <div className='mb-3'>
                      <label className='form-label'>Payment Status</label>
                      <Select
                        style={{ width: '100%' }}
                        value={filters.paymentStatusFilter}
                        onChange={(value) =>
                          handleFilterChange({ paymentStatusFilter: value })
                        }
                        allowClear
                      >
                        {['paid', 'pending'].map((status) => (
                          <Select.Option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Select.Option>
                        ))}
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
                  <i className='ti ti-sort-ascending-2 me-2' />
                  Sort by{' '}
                  {sortOrder === 'asc'
                    ? 'A-Z'
                    : sortOrder === 'desc'
                    ? 'Z-A'
                    : sortOrder === 'recentlyAdded'
                    ? 'Recently Added'
                    : 'Default'}
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
            {currentUser?.role === 'coach' && (
              <div className='alert alert-info mb-3 mx-3'>
                <i className='ti ti-info-circle me-2'></i>
                <strong>Coach View:</strong> You can view tournament
                registrations but cannot access parent details.
              </div>
            )}
            <Table
              columns={columns}
              dataSource={
                sortOrder ? sortedRegistrations : filteredRegistrations
              }
              rowKey='_id'
              pagination={{
                ...pagination,
                total: filteredRegistrations.length,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
              onChange={handleTableChange}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentAdminPage;
