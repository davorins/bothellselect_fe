import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { Link } from 'react-router-dom';
import CountUp from 'react-countup';
import axios from 'axios';
import { all_routes } from '../../router/all_routes';

interface DashboardData {
  players: any[];
  coaches: any[];
  playerStats: {
    total: number;
    active: number;
    inactive: number;
    byGender: {
      male: number;
      female: number;
    };
  };
  teamStats: {
    total: number;
    active: number;
    internalTeams: number;
    internalTeamDetails: {
      name: string;
      grade: string;
      gender: string;
      playerCount: number;
      coachCount: number;
      coaches: { name: string; email: string }[];
    }[];
  };
  registrationStats?: {
    total: number;
    paid: number;
    pending: number;
  };
  adultStats: {
    total: number;
    parents: number;
    additionalGuardians: number;
    coaches: number;
  };
  summary: {
    totalPlayers: number;
    totalCoaches: number;
    totalTeams: number;
    activeRegistrations: number;
    totalAdults: number;
    totalParents: number;
    totalRegistrations: number;
  };
  lastUpdated: string;
}

// Chart options outside component to prevent re-renders
const chartOptions = {
  chart: {
    type: 'donut' as const,
    height: 300,
  },
  labels: ['Active Players', 'Inactive Players'],
  colors: ['#1abe17', '#E82646'],
  legend: {
    position: 'bottom' as const,
  },
  responsive: [
    {
      breakpoint: 480,
      options: {
        chart: {
          width: 200,
        },
        legend: {
          position: 'bottom' as const,
        },
      },
    },
  ],
  plotOptions: {
    pie: {
      donut: {
        size: '65%',
      },
    },
  },
  dataLabels: {
    enabled: true,
    style: {
      fontSize: '14px',
      fontWeight: 'bold',
    },
  },
};

const CoachDashboard = () => {
  const routes = all_routes;
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [chartSeries, setChartSeries] = useState<number[]>([0, 0]);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (dashboardData && dashboardData.playerStats) {
      console.log('📊 Updating chart with player stats:', {
        active: dashboardData.playerStats.active,
        inactive: dashboardData.playerStats.inactive,
      });

      setChartSeries([
        dashboardData.playerStats.active,
        dashboardData.playerStats.inactive,
      ]);
    }
  }, [dashboardData]);

  const fetchDashboardData = async (): Promise<void> => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('📈 Dashboard data loaded:', {
        playerStats: response.data.playerStats,
        chartReady: !!response.data.playerStats,
      });

      setDashboardData(response.data);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError(
        error.response?.data?.error ||
          error.message ||
          'Failed to load dashboard data'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRegistrationStats = () => {
    return {
      total: dashboardData?.registrationStats?.total || 0,
      paid: dashboardData?.registrationStats?.paid || 0,
      pending: dashboardData?.registrationStats?.pending || 0,
    };
  };

  // Loading State
  if (loading) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div
            className='d-flex justify-content-center align-items-center'
            style={{ height: '50vh' }}
          >
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading...</span>
            </div>
            <p className='ms-3 mb-0'>Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div className='alert alert-danger'>
            <h5>Error Loading Dashboard</h5>
            <p>{error}</p>
            <button className='btn btn-primary' onClick={fetchDashboardData}>
              <i className='ti ti-refresh me-2'></i>Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No Data State
  if (!dashboardData) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div className='alert alert-warning'>
            <h5>No Data Available</h5>
            <p>Unable to load dashboard data.</p>
            <button className='btn btn-primary' onClick={fetchDashboardData}>
              <i className='ti ti-refresh me-2'></i>Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const registrationStats = getRegistrationStats();

  return (
    <div className='page-wrapper'>
      <div className='content'>
        {/* Page Header */}
        <div className='d-md-flex d-block align-items-center justify-content-between mb-3'>
          <div className='my-auto mb-2'>
            <h3 className='page-title mb-1'>Organization Overview</h3>
            <nav>
              <ol className='breadcrumb mb-0'>
                <li className='breadcrumb-item'>
                  <Link to={routes.adminDashboard}>Dashboard</Link>
                </li>
                <li className='breadcrumb-item active' aria-current='page'>
                  Organization Overview
                </li>
              </ol>
            </nav>
          </div>
          <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
            <div className='mb-2 me-3'>
              <button
                className='btn btn-outline-primary'
                onClick={fetchDashboardData}
              >
                <i className='ti ti-refresh me-2'></i>Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className='row'>
          {/* Total Players Card */}
          <div className='col-xxl-3 col-sm-6 d-flex'>
            <div className='card flex-fill animate-card border-0'>
              <div className='card-body'>
                <div className='d-flex align-items-center'>
                  <div className='avatar avatar-xl bg-danger-transparent me-2 p-1'>
                    <img
                      src='https://partizan-be.onrender.com/uploads/avatars/boy.png'
                      alt='Players'
                    />
                  </div>
                  <div className='overflow-hidden flex-fill'>
                    <div className='d-flex align-items-center justify-content-between'>
                      <h2 className='counter'>
                        <CountUp end={dashboardData.summary.totalPlayers} />
                      </h2>
                      <span
                        className={`badge ${
                          dashboardData.playerStats.active > 0
                            ? 'bg-success'
                            : 'bg-warning'
                        }`}
                      >
                        {Math.round(
                          (dashboardData.playerStats.active /
                            dashboardData.playerStats.total) *
                            100
                        )}
                        % Active
                      </span>
                    </div>
                    <p>Players</p>
                  </div>
                </div>
                <div className='d-flex align-items-center justify-content-between border-top mt-3 pt-3'>
                  <p className='mb-0'>
                    Active:{' '}
                    <span className='text-dark fw-semibold'>
                      {dashboardData.playerStats.active}
                    </span>
                  </p>
                  <span className='text-light'>|</span>
                  <p>
                    Inactive:{' '}
                    <span className='text-dark fw-semibold'>
                      {dashboardData.playerStats.inactive}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Status Card */}
          <div className='col-xxl-3 col-sm-6 d-flex'>
            <div className='card flex-fill animate-card border-0'>
              <div className='card-body'>
                <div className='d-flex align-items-center'>
                  <div className='avatar avatar-xl bg-warning-transparent me-2 p-1'>
                    <img
                      src='https://partizan-be.onrender.com/uploads/avatars/pendingPayment.png'
                      alt='Registrations'
                    />
                  </div>
                  <div className='overflow-hidden flex-fill'>
                    <div className='d-flex align-items-center justify-content-between'>
                      <h2 className='counter'>
                        <CountUp end={registrationStats.total} />
                      </h2>
                      <span className='badge bg-info'>Total</span>
                    </div>
                    <p>Registrations</p>
                  </div>
                </div>
                <div className='d-flex align-items-center justify-content-between border-top mt-3 pt-3'>
                  <p className='mb-0'>
                    Paid:{' '}
                    <span className='text-dark fw-semibold'>
                      {registrationStats.paid}
                    </span>
                  </p>
                  <span className='text-light'>|</span>
                  <p>
                    Pending:{' '}
                    <span className='text-dark fw-semibold'>
                      {registrationStats.pending}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Parents Card */}
          <div className='col-xxl-3 col-sm-6 d-flex'>
            <div className='card flex-fill animate-card border-0'>
              <div className='card-body'>
                <div className='d-flex align-items-center'>
                  <div className='avatar avatar-xl bg-success-transparent me-2 p-1'>
                    <img
                      src='https://partizan-be.onrender.com/uploads/avatars/parents.png'
                      alt='Parents'
                    />
                  </div>
                  <div className='overflow-hidden flex-fill'>
                    <div className='d-flex align-items-center justify-content-between'>
                      <h2 className='counter'>
                        <CountUp end={dashboardData.summary.totalAdults} />
                      </h2>
                      <span className='badge bg-success'>Total</span>
                    </div>
                    <p>Parents & Guardians</p>
                  </div>
                </div>
                <div className='d-flex align-items-center justify-content-between border-top mt-3 pt-3'>
                  <p className='mb-0'>
                    Parents:{' '}
                    <span className='text-dark fw-semibold'>
                      {dashboardData.adultStats.parents}
                    </span>
                  </p>
                  <span className='text-light'>|</span>
                  <p>
                    Guardians:{' '}
                    <span className='text-dark fw-semibold'>
                      {dashboardData.adultStats.additionalGuardians}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Coaches Card */}
          <div className='col-xxl-3 col-sm-6 d-flex'>
            <div className='card flex-fill animate-card border-0'>
              <div className='card-body'>
                <div className='d-flex align-items-center'>
                  <div className='avatar avatar-xl bg-info-transparent me-2 p-1'>
                    <img
                      src='https://partizan-be.onrender.com/uploads/avatars/coach.png'
                      alt='Coaches'
                    />
                  </div>
                  <div className='overflow-hidden flex-fill'>
                    <div className='d-flex align-items-center justify-content-between'>
                      <h2 className='counter'>
                        <CountUp end={dashboardData.summary.totalCoaches} />
                      </h2>
                      <span className='badge bg-info'>Active</span>
                    </div>
                    <p>Coaches</p>
                  </div>
                </div>
                <div className='d-flex align-items-center justify-content-between border-top mt-3 pt-3'>
                  <p className='mb-0'>
                    From Parents:{' '}
                    <span className='text-dark fw-semibold'>
                      {dashboardData.adultStats.coaches}
                    </span>
                  </p>
                  <span className='text-light'>|</span>
                  <p>
                    Teams:{' '}
                    <span className='text-dark fw-semibold'>
                      {dashboardData.summary.totalTeams}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='row'>
          {/* Player Statistics Chart */}
          <div className='col-xxl-6 d-flex'>
            <div className='card flex-fill'>
              <div className='card-header'>
                <h4 className='card-title'>Player Statistics</h4>
              </div>
              <div className='card-body'>
                <div id='player-stats-chart'>
                  <ReactApexChart
                    options={chartOptions}
                    series={chartSeries}
                    type='donut'
                    height={300}
                  />
                </div>
                <div className='row text-center mt-3'>
                  <div className='col-6'>
                    <div className='border rounded p-2'>
                      <h6 className='text-primary mb-1'>
                        {dashboardData.playerStats.byGender.male}
                      </h6>
                      <p className='mb-0 small'>Male Players</p>
                    </div>
                  </div>
                  <div className='col-6'>
                    <div className='border rounded p-2'>
                      <h6 className='text-success mb-1'>
                        {dashboardData.playerStats.byGender.female}
                      </h6>
                      <p className='mb-0 small'>Female Players</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Details */}
          <div className='col-xxl-6 d-flex'>
            <div className='card flex-fill'>
              <div className='card-header'>
                <h4 className='card-title'>Team Details</h4>
              </div>
              <div className='card-body'>
                {dashboardData.teamStats.internalTeamDetails &&
                dashboardData.teamStats.internalTeamDetails.length > 0 ? (
                  <div className='table-responsive'>
                    <table className='table table-hover table-center mb-0'>
                      <thead>
                        <tr>
                          <th>Team Name</th>
                          <th>Grade</th>
                          <th>Gender</th>
                          <th>Players</th>
                          <th>Coaches</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.teamStats.internalTeamDetails.map(
                          (team, index) => (
                            <tr key={index}>
                              <td>
                                <strong>{team.name}</strong>
                              </td>
                              <td>
                                <span className='badge bg-info'>
                                  Grade {team.grade}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    team.gender === 'Male'
                                      ? 'bg-primary'
                                      : team.gender === 'Female'
                                      ? 'bg-pink'
                                      : 'bg-secondary'
                                  }`}
                                >
                                  {team.gender}
                                </span>
                              </td>
                              <td>
                                <span className='badge bg-success'>
                                  {team.playerCount} players
                                </span>
                              </td>
                              <td>
                                <span className='badge bg-warning'>
                                  {team.coachCount} coaches
                                </span>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className='text-center py-4'>
                    <i className='ti ti-users fs-1 text-muted mb-3'></i>
                    <p className='text-muted'>No teams found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachDashboard;
