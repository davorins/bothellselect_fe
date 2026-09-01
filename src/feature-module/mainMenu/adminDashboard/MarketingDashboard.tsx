import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

  useEffect(() => {
    fetchStats();
  }, [selectedCampaign]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = selectedCampaign
        ? `${API_BASE_URL}/api/marketing/attribution/stats?campaign=${selectedCampaign}`
        : `${API_BASE_URL}/api/marketing/attribution/stats`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStats(response.data.stats);
    } catch (err) {
      setError('Failed to load marketing data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='text-center p-5'>
        <div className='spinner-border text-primary' role='status'>
          <span className='visually-hidden'>Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className='alert alert-danger'>
        <i className='ti ti-alert-circle me-2'></i>
        {error || 'No marketing data available'}
      </div>
    );
  }

  // Calculate cost per registration (you'll need to add spend data from Meta)
  const costPerRegistration =
    stats.totalRevenue > 0
      ? (stats.totalRevenue / stats.totalRegistrations).toFixed(2)
      : '0';

  return (
    <div className='marketing-dashboard'>
      <div className='row mb-4'>
        <div className='col-12'>
          <div className='card'>
            <div className='card-header d-flex justify-content-between align-items-center'>
              <h4 className='card-title'>📊 Marketing Performance</h4>
              <div>
                <button
                  className='btn btn-outline-primary btn-sm'
                  onClick={fetchStats}
                >
                  <i className='ti ti-refresh me-1'></i> Refresh
                </button>
              </div>
            </div>
            <div className='card-body'>
              {/* Summary Cards */}
              <div className='row'>
                <div className='col-md-3'>
                  <div className='card bg-light'>
                    <div className='card-body text-center'>
                      <h5 className='text-muted'>Total Registrations</h5>
                      <h2 className='text-primary'>
                        {stats.totalRegistrations}
                      </h2>
                    </div>
                  </div>
                </div>
                <div className='col-md-3'>
                  <div className='card bg-light'>
                    <div className='card-body text-center'>
                      <h5 className='text-muted'>Paid Registrations</h5>
                      <h2 className='text-success'>
                        {stats.paidRegistrations}
                      </h2>
                    </div>
                  </div>
                </div>
                <div className='col-md-3'>
                  <div className='card bg-light'>
                    <div className='card-body text-center'>
                      <h5 className='text-muted'>Total Revenue</h5>
                      <h2 className='text-success'>
                        ${stats.totalRevenue.toFixed(2)}
                      </h2>
                    </div>
                  </div>
                </div>
                <div className='col-md-3'>
                  <div className='card bg-light'>
                    <div className='card-body text-center'>
                      <h5 className='text-muted'>Cost / Registration</h5>
                      <h2 className='text-info'>${costPerRegistration}</h2>
                      <small className='text-muted'>
                        Add ad spend to calculate
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              {/* By Source */}
              <div className='row mt-4'>
                <div className='col-md-6'>
                  <div className='card'>
                    <div className='card-header'>
                      <h5 className='card-title'>Registrations by Source</h5>
                    </div>
                    <div className='card-body'>
                      <table className='table table-hover'>
                        <thead>
                          <tr>
                            <th>Source</th>
                            <th>Registrations</th>
                            <th>Paid</th>
                            <th>Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(stats.bySource).map(
                            ([source, data]) => (
                              <tr key={source}>
                                <td>
                                  <span className='badge bg-primary me-1'>
                                    {source === 'instagram' && '📸'}
                                    {source === 'facebook' && '📘'}
                                    {source === 'direct' && '🔗'}
                                    {source !== 'instagram' &&
                                      source !== 'facebook' &&
                                      source !== 'direct' &&
                                      '🌐'}
                                  </span>
                                  {source}
                                </td>
                                <td>{data.count}</td>
                                <td>{data.paid}</td>
                                <td>${data.revenue.toFixed(2)}</td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* By Campaign */}
                <div className='col-md-6'>
                  <div className='card'>
                    <div className='card-header'>
                      <h5 className='card-title'>Registrations by Campaign</h5>
                    </div>
                    <div className='card-body'>
                      <table className='table table-hover'>
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
                                    {campaign === 'none' ? 'Organic' : '📢'}
                                  </span>
                                  {campaign === 'none'
                                    ? 'Direct/Organic'
                                    : campaign}
                                </td>
                                <td>{data.count}</td>
                                <td>{data.paid}</td>
                                <td>${data.revenue.toFixed(2)}</td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* By Event Type */}
              <div className='row mt-4'>
                <div className='col-12'>
                  <div className='card'>
                    <div className='card-header'>
                      <h5 className='card-title'>
                        Registrations by Event Type
                      </h5>
                    </div>
                    <div className='card-body'>
                      <table className='table table-hover'>
                        <thead>
                          <tr>
                            <th>Event Type</th>
                            <th>Registrations</th>
                            <th>Paid</th>
                            <th>Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(stats.byEventType).map(
                            ([type, data]) => (
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
                                <td>{data.count}</td>
                                <td>{data.paid}</td>
                                <td>${data.revenue.toFixed(2)}</td>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingDashboard;
