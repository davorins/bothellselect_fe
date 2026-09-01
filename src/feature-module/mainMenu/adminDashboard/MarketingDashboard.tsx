import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './admin-dashboard.css';
import './admin-dashboard-mobile.css';

interface MarketingStats {
  totalRegistrations: number;
  paidRegistrations: number;
  totalRevenue: number;
  pendingPayments: number;
  bySource: Record<string, { count: number; revenue: number; paid: number }>;
  byCampaign: Record<string, { count: number; revenue: number; paid: number }>;
  byEventType: Record<string, { count: number; revenue: number; paid: number }>;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const MarketingDashboard: React.FC = () => {
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [campaigns, setCampaigns] = useState<string[]>([]);

  useEffect(() => {
    fetchStats();
  }, [selectedCampaign]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const url = selectedCampaign
        ? `${API_BASE_URL}/api/marketing/attribution/stats?campaign=${selectedCampaign}`
        : `${API_BASE_URL}/api/marketing/attribution/stats`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStats(response.data.stats);

      // Extract campaign list for filter
      if (response.data.stats?.byCampaign) {
        const campaignList = Object.keys(response.data.stats.byCampaign).filter(
          (c) => c !== 'none',
        );
        setCampaigns(campaignList);
      }
    } catch (err: any) {
      console.error('Error fetching marketing stats:', err);
      setError(err.response?.data?.error || 'Failed to load marketing data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const costPerRegistration =
    stats?.totalRegistrations && stats.totalRegistrations > 0
      ? (stats.totalRevenue / stats.totalRegistrations).toFixed(2)
      : '0.00';

  const conversionRate =
    stats?.totalRegistrations && stats.totalRegistrations > 0
      ? ((stats.paidRegistrations / stats.totalRegistrations) * 100).toFixed(1)
      : '0.0';

  if (loading) {
    return (
      <div className='page-wrapper admin-dashboard-page'>
        <div className='content'>
          <div
            className='d-flex justify-content-center align-items-center'
            style={{ height: '50vh' }}
          >
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading...</span>
            </div>
            <p className='ms-3 mb-0'>Loading marketing data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className='page-wrapper admin-dashboard-page'>
        <div className='content'>
          <div className='alert alert-danger'>
            <h5>Error Loading Marketing Data</h5>
            <p>{error || 'No marketing data available'}</p>
            <button className='btn btn-primary' onClick={fetchStats}>
              <i className='ti ti-refresh me-2'></i>Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='page-wrapper admin-dashboard-page'>
      <div className='content'>
        {/* Page Header */}
        <div className='d-md-flex d-block align-items-center justify-content-between mb-3'>
          <div className='my-auto mb-2'>
            <h3 className='page-title mb-1'>📊 Marketing Dashboard</h3>
            <nav>
              <ol className='breadcrumb mb-0'>
                <li className='breadcrumb-item'>
                  <Link to='/admin-dashboard'>Dashboard</Link>
                </li>
                <li className='breadcrumb-item active' aria-current='page'>
                  Marketing Dashboard
                </li>
              </ol>
            </nav>
          </div>
          <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
            <div className='mb-2 me-3'>
              <button className='btn btn-outline-primary' onClick={fetchStats}>
                <i className='ti ti-refresh me-2'></i>Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className='row'>
          {/* Total Registrations Card */}
          <div className='col-xxl-3 col-sm-6 d-flex'>
            <div className='card flex-fill animate-card border-0'>
              <div className='card-body'>
                <div className='d-flex align-items-center'>
                  <div className='avatar avatar-xl bg-primary-transparent me-2 p-1'>
                    <img
                      src='https://bothell-select.onrender.com/uploads/avatars/players.png'
                      alt='Registrations'
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%234285f4" stroke-width="2"%3E%3Cpath d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/%3E%3Ccircle cx="9" cy="7" r="4"/%3E%3Cpath d="M23 21v-2a4 4 0 0 0-3-3.87"/%3E%3Cpath d="M16 3.13a4 4 0 0 1 0 7.75"/%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                  <div className='overflow-hidden flex-fill'>
                    <div className='d-flex align-items-center justify-content-between'>
                      <h2 className='counter'>{stats.totalRegistrations}</h2>
                      <span className='badge bg-primary'>Total</span>
                    </div>
                    <p>Total Registrations</p>
                  </div>
                </div>
                <div className='d-flex align-items-center justify-content-between border-top mt-3 pt-3'>
                  <p className='mb-0'>
                    Paid:{' '}
                    <span className='text-dark fw-semibold'>
                      {stats.paidRegistrations}
                    </span>
                  </p>
                  <span className='text-light'>|</span>
                  <p>
                    Pending:{' '}
                    <span className='text-dark fw-semibold'>
                      {stats.pendingPayments}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Card */}
          <div className='col-xxl-3 col-sm-6 d-flex'>
            <div className='card flex-fill animate-card border-0'>
              <div className='card-body'>
                <div className='d-flex align-items-center'>
                  <div className='avatar avatar-xl bg-success-transparent me-2 p-1'>
                    <img
                      src='https://bothell-select.onrender.com/uploads/avatars/revenue.png'
                      alt='Revenue'
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%2328a745" stroke-width="2"%3E%3Ccircle cx="12" cy="12" r="10"/%3E%3Cpath d="M8 12h8"/%3E%3Cpath d="M12 8v8"/%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                  <div className='overflow-hidden flex-fill'>
                    <div className='d-flex align-items-center justify-content-between'>
                      <h2 className='counter'>
                        ${stats.totalRevenue.toFixed(0)}
                      </h2>
                      <span className='badge bg-success'>Revenue</span>
                    </div>
                    <p>Total Revenue</p>
                  </div>
                </div>
                <div className='d-flex align-items-center justify-content-between border-top mt-3 pt-3'>
                  <p className='mb-0'>
                    Conversion:{' '}
                    <span className='text-dark fw-semibold'>
                      {conversionRate}%
                    </span>
                  </p>
                  <span className='text-light'>|</span>
                  <p>
                    Cost/Reg:{' '}
                    <span className='text-dark fw-semibold'>
                      ${costPerRegistration}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Source Card */}
          <div className='col-xxl-3 col-sm-6 d-flex'>
            <div className='card flex-fill animate-card border-0'>
              <div className='card-body'>
                <div className='d-flex align-items-center'>
                  <div className='avatar avatar-xl bg-warning-transparent me-2 p-1'>
                    <img
                      src='https://bothell-select.onrender.com/uploads/avatars/source.png'
                      alt='Top Source'
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23ffc107" stroke-width="2"%3E%3Cpath d="M2 12h4l2-9 4 18 2-9h4"/%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                  <div className='overflow-hidden flex-fill'>
                    <div className='d-flex align-items-center justify-content-between'>
                      <h2 className='counter'>
                        {Object.entries(stats.bySource).sort(
                          (a, b) => b[1].count - a[1].count,
                        )[0]?.[0] || 'N/A'}
                      </h2>
                      <span className='badge bg-warning'>Top Source</span>
                    </div>
                    <p>Best Performing Channel</p>
                  </div>
                </div>
                <div className='d-flex align-items-center justify-content-between border-top mt-3 pt-3'>
                  <p className='mb-0'>
                    Registrations:{' '}
                    <span className='text-dark fw-semibold'>
                      {Object.entries(stats.bySource).sort(
                        (a, b) => b[1].count - a[1].count,
                      )[0]?.[1]?.count || 0}
                    </span>
                  </p>
                  <span className='text-light'>|</span>
                  <p>
                    Revenue:{' '}
                    <span className='text-dark fw-semibold'>
                      $
                      {Object.entries(stats.bySource)
                        .sort((a, b) => b[1].count - a[1].count)[0]?.[1]
                        ?.revenue.toFixed(0) || '0'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Campaign Card */}
          <div className='col-xxl-3 col-sm-6 d-flex'>
            <div className='card flex-fill animate-card border-0'>
              <div className='card-body'>
                <div className='d-flex align-items-center'>
                  <div className='avatar avatar-xl bg-info-transparent me-2 p-1'>
                    <img
                      src='https://bothell-select.onrender.com/uploads/avatars/campaign.png'
                      alt='Top Campaign'
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%2317a2b8" stroke-width="2"%3E%3Cpath d="M12 2L2 7l10 5 10-5-10-5z"/%3E%3Cpath d="M2 17l10 5 10-5"/%3E%3Cpath d="M2 12l10 5 10-5"/%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                  <div className='overflow-hidden flex-fill'>
                    <div className='d-flex align-items-center justify-content-between'>
                      <h2
                        className='counter'
                        style={{ fontSize: '1.1rem', wordBreak: 'break-all' }}
                      >
                        {Object.entries(stats.byCampaign)
                          .filter(([key]) => key !== 'none')
                          .sort((a, b) => b[1].count - a[1].count)[0]?.[0] ||
                          'Organic'}
                      </h2>
                      <span className='badge bg-info'>Top Campaign</span>
                    </div>
                    <p>Best Performing Campaign</p>
                  </div>
                </div>
                <div className='d-flex align-items-center justify-content-between border-top mt-3 pt-3'>
                  <p className='mb-0'>
                    Registrations:{' '}
                    <span className='text-dark fw-semibold'>
                      {Object.entries(stats.byCampaign)
                        .filter(([key]) => key !== 'none')
                        .sort((a, b) => b[1].count - a[1].count)[0]?.[1]
                        ?.count || 0}
                    </span>
                  </p>
                  <span className='text-light'>|</span>
                  <p>
                    Revenue:{' '}
                    <span className='text-dark fw-semibold'>
                      $
                      {Object.entries(stats.byCampaign)
                        .filter(([key]) => key !== 'none')
                        .sort((a, b) => b[1].count - a[1].count)[0]?.[1]
                        ?.revenue.toFixed(0) || '0'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Overview - Matching your admin dashboard style */}
        <div className='row'>
          <div className='col-12'>
            <div className='card flex-fill border-0'>
              <div className='card-header'>
                <h4 className='card-title'>
                  📈 Marketing Performance Overview
                </h4>
              </div>
              <div className='card-body'>
                <div className='row'>
                  <div className='col-md-6'>
                    <div className='bg-light p-3 rounded'>
                      <h6 className='text-muted'>Total Revenue</h6>
                      <h2 className='text-success'>
                        ${stats.totalRevenue.toFixed(2)}
                      </h2>
                      <small className='text-muted'>
                        From {stats.totalRegistrations} registrations
                      </small>
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='bg-light p-3 rounded'>
                      <h6 className='text-muted'>Conversion Rate</h6>
                      <h2 className='text-primary'>{conversionRate}%</h2>
                      <small className='text-muted'>
                        {stats.paidRegistrations} paid out of{' '}
                        {stats.totalRegistrations} total
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Tables Section - Matching your admin dashboard style */}
        <div className='row'>
          {/* By Source */}
          <div className='col-xxl-6 d-flex'>
            <div className='card flex-fill'>
              <div className='card-header d-flex align-items-center justify-content-between'>
                <h4 className='card-title'>Registrations by Source</h4>
                <span className='badge bg-light text-dark'>
                  {Object.keys(stats.bySource).length} sources
                </span>
              </div>
              <div className='card-body'>
                <div className='dashboard-table-wrapper'>
                  <table className='table table-hover table-center mb-0'>
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Registrations</th>
                        <th>Paid</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.bySource).map(([source, data]) => (
                        <tr key={source}>
                          <td>
                            <span className='badge bg-primary me-1'>
                              {source === 'instagram' && '📸'}
                              {source === 'facebook' && '📘'}
                              {source === 'direct' && '🔗'}
                              {source === 'google' && '🔍'}
                              {source !== 'instagram' &&
                                source !== 'facebook' &&
                                source !== 'direct' &&
                                source !== 'google' &&
                                '🌐'}
                            </span>
                            {source.charAt(0).toUpperCase() + source.slice(1)}
                          </td>
                          <td>
                            <span className='badge bg-light text-dark'>
                              {data.count}
                            </span>
                          </td>
                          <td>
                            <span className='badge bg-success'>
                              {data.paid}
                            </span>
                          </td>
                          <td className='fw-semibold text-success'>
                            ${data.revenue.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* By Campaign */}
          <div className='col-xxl-6 d-flex'>
            <div className='card flex-fill'>
              <div className='card-header d-flex align-items-center justify-content-between'>
                <h4 className='card-title'>Registrations by Campaign</h4>
                <div className='d-flex gap-2'>
                  {campaigns.length > 0 && (
                    <select
                      className='form-select form-select-sm'
                      style={{ width: 'auto' }}
                      value={selectedCampaign}
                      onChange={(e) => setSelectedCampaign(e.target.value)}
                    >
                      <option value=''>All Campaigns</option>
                      {campaigns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className='card-body'>
                <div className='dashboard-table-wrapper'>
                  <table className='table table-hover table-center mb-0'>
                    <thead>
                      <tr>
                        <th>Campaign</th>
                        <th>Registrations</th>
                        <th>Paid</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.byCampaign).map(
                        ([campaign, data]) => (
                          <tr key={campaign}>
                            <td>
                              <span className='badge bg-secondary me-1'>
                                {campaign === 'none' ? '📁' : '📢'}
                              </span>
                              {campaign === 'none'
                                ? 'Direct/Organic'
                                : campaign}
                            </td>
                            <td>
                              <span className='badge bg-light text-dark'>
                                {data.count}
                              </span>
                            </td>
                            <td>
                              <span className='badge bg-success'>
                                {data.paid}
                              </span>
                            </td>
                            <td className='fw-semibold text-success'>
                              ${data.revenue.toFixed(2)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* By Event Type */}
        <div className='row'>
          <div className='col-12 d-flex'>
            <div className='card flex-fill'>
              <div className='card-header d-flex align-items-center justify-content-between'>
                <h4 className='card-title'>Registrations by Event Type</h4>
                <span className='badge bg-light text-dark'>
                  {Object.keys(stats.byEventType).length} types
                </span>
              </div>
              <div className='card-body'>
                <div className='dashboard-table-wrapper'>
                  <table className='table table-hover table-center mb-0'>
                    <thead>
                      <tr>
                        <th>Event Type</th>
                        <th>Registrations</th>
                        <th>Paid</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.byEventType).map(([type, data]) => (
                        <tr key={type}>
                          <td>
                            <span className='badge bg-info me-1'>
                              {type === 'tryout' && '🏀'}
                              {type === 'training' && '🏋️'}
                              {type === 'tournament' && '🏆'}
                              {type === 'player' && '👤'}
                            </span>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </td>
                          <td>
                            <span className='badge bg-light text-dark'>
                              {data.count}
                            </span>
                          </td>
                          <td>
                            <span className='badge bg-success'>
                              {data.paid}
                            </span>
                          </td>
                          <td className='fw-semibold text-success'>
                            ${data.revenue.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Help/Info Card */}
        <div className='row mt-4'>
          <div className='col-12'>
            <div className='card border-0 bg-light'>
              <div className='card-body'>
                <h5 className='card-title'>
                  <i className='ti ti-info-circle text-primary me-2'></i>
                  How to Use This Dashboard
                </h5>
                <div className='row'>
                  <div className='col-md-6'>
                    <ul className='mb-0'>
                      <li>
                        Add <strong>utm_source</strong>,{' '}
                        <strong>utm_medium</strong>, and{' '}
                        <strong>utm_campaign</strong> parameters to your ad URLs
                      </li>
                      <li>
                        Example:{' '}
                        <code className='bg-white p-1 rounded'>
                          https://bothellselect.com/tryout-registration?utm_source=instagram&utm_medium=paid_social&utm_campaign=fall_tryouts_2026
                        </code>
                      </li>
                    </ul>
                  </div>
                  <div className='col-md-6'>
                    <ul className='mb-0'>
                      <li>
                        Registrations are automatically attributed to the
                        correct source and campaign
                      </li>
                      <li>
                        Use the campaign filter above to view performance for
                        specific campaigns
                      </li>
                      <li>
                        To calculate <strong>Cost per Registration</strong> and{' '}
                        <strong>ROAS</strong>, import your ad spend data from
                        Meta Ads Manager
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingDashboard;
