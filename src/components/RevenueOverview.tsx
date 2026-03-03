// components/RevenueOverview.tsx
import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import axios from 'axios';
import { ApexOptions } from 'apexcharts';

// Define TypeScript interfaces
interface FinancialData {
  grossRevenue: number;
  netRevenue: number;
  refunds: {
    total: number;
    completed: number;
    pending: number;
  };
  transactionCount: number;
  averageTransaction: number;
  dailyRevenue: { [key: string]: number };
  refundReasons: { [key: string]: number };
  dateRange: {
    start: string;
    end: string;
    label: string;
  };
}

interface ApiResponse {
  success: boolean;
  data: FinancialData;
  timestamp: string;
  error?: string;
}

const RevenueOverview: React.FC = () => {
  const [timeRange, setTimeRange] = useState('this-month');
  const [financialData, setFinancialData] = useState<FinancialData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const timeRanges = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this-week', label: 'This Week' },
    { value: 'last-week', label: 'Last Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'this-year', label: 'This Year' },
    { value: 'last-year', label: 'Last Year' },
  ];

  useEffect(() => {
    fetchFinancialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatCompactCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 0,
    }).format(amount);

  const verifyDataIntegrity = (data: FinancialData | null) => {
    if (!data) return false;
    if (data.grossRevenue < data.netRevenue) return false;
    if (data.refunds.completed < 0) return false;
    return true;
  };

  const fetchFinancialData = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<ApiResponse>(
        `${API_BASE_URL}/admin/financial-analytics?range=${timeRange}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const data = response.data.data;
        if (!verifyDataIntegrity(data)) {
          throw new Error('Data integrity check failed');
        }
        setFinancialData(data);
      } else {
        throw new Error(response.data.error || 'Failed to load financial data');
      }
    } catch (err: any) {
      console.error('Error fetching financial data:', err);
      setError(
        err.response?.data?.error ||
          err.message ||
          'Failed to load financial data'
      );
    } finally {
      setLoading(false);
    }
  };

  const getRevenueChartData = () => {
    if (!financialData?.dailyRevenue) return null;

    const startDate = new Date(financialData.dateRange.start);
    const endDate = new Date(financialData.dateRange.end);
    const allDates: string[] = [];

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      allDates.push(d.toISOString().split('T')[0]);
    }

    // ✅ Shift the dailyRevenue keys one day earlier
    const shiftedDailyRevenue: { [key: string]: number } = {};
    Object.entries(financialData.dailyRevenue).forEach(([date, value]) => {
      const shiftedDate = new Date(date);
      shiftedDate.setUTCDate(shiftedDate.getUTCDate() - 1); // subtract 1 day
      const shiftedKey = shiftedDate.toISOString().split('T')[0];
      shiftedDailyRevenue[shiftedKey] = value;
    });

    // Now use shiftedDailyRevenue instead of the original
    const completeData = allDates.map((date) => ({
      date,
      revenue: shiftedDailyRevenue[date] || 0,
    }));

    const revenue = completeData.map((entry) => entry.revenue);

    const options: ApexOptions = {
      chart: {
        type: 'area',
        height: 350,
        toolbar: { show: false },
      },
      colors: ['#1abe17'],
      dataLabels: { enabled: false },
      stroke: {
        curve: 'smooth',
        width: 3,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.1,
          stops: [0, 90, 100],
        },
      },
      xaxis: {
        // ✅ REMOVED: No categories/labels for cleaner look
        labels: {
          show: false, // Hide x-axis labels completely
        },
        axisBorder: {
          show: false, // Hide x-axis border
        },
        axisTicks: {
          show: false, // Hide x-axis ticks
        },
      },
      yaxis: {
        min: 0,
        labels: {
          formatter: (val: number) => formatCompactCurrency(val),
          style: { fontSize: '12px', fontFamily: 'Arial' },
        },
      },
      tooltip: {
        shared: true,
        x: {
          formatter: (_val, { dataPointIndex }) => {
            const date = completeData[dataPointIndex]?.date;
            if (!date) return '';
            return new Date(date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'UTC',
            });
          },
        },
        y: {
          formatter: (val: number) => formatCurrency(val),
          title: { formatter: () => 'Revenue:' },
        },
      },
      markers: {
        size: 4,
        hover: {
          size: 6,
        },
      },
      grid: {
        borderColor: '#f1f1f1',
        strokeDashArray: 4,
        xaxis: {
          lines: {
            show: false, // Hide vertical grid lines
          },
        },
        yaxis: {
          lines: {
            show: true, // Keep horizontal grid lines
          },
        },
      },
    };

    return {
      series: [{ name: 'Daily Revenue', data: revenue }],
      options,
    };
  };

  if (loading) {
    return (
      <div className='card'>
        <div className='card-header'>
          <h4 className='card-title'>Revenue Overview</h4>
        </div>
        <div className='card-body d-flex justify-content-center align-items-center py-5'>
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
          <p className='ms-3 mb-0'>Loading revenue data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='card'>
        <div className='card-header'>
          <h4 className='card-title'>Revenue Overview</h4>
        </div>
        <div className='card-body'>
          <div className='alert alert-danger'>
            <p>{error}</p>
            <button
              className='btn btn-primary btn-sm'
              onClick={fetchFinancialData}
            >
              <i className='ti ti-refresh me-2'></i>Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!financialData) {
    return (
      <div className='card'>
        <div className='card-header'>
          <h4 className='card-title'>Revenue Overview</h4>
        </div>
        <div className='card-body text-center py-4'>
          <i className='ti ti-chart-bar fs-1 text-muted mb-3'></i>
          <p className='text-muted'>No financial data available</p>
        </div>
      </div>
    );
  }

  const chartData = getRevenueChartData();

  return (
    <div className='card'>
      <div className='card-header d-flex align-items-center justify-content-between'>
        <h4 className='card-title mb-0'>Revenue Overview</h4>
        <div className='d-flex align-items-center'>
          <select
            className='form-select form-select-sm w-auto'
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <button
            className='btn btn-outline-primary btn-sm ms-2'
            onClick={fetchFinancialData}
            disabled={loading}
          >
            <i className='ti ti-refresh'></i>
          </button>
        </div>
      </div>

      <div className='card-body'>
        {/* Key Metrics */}
        <div className='row mb-4'>
          <div className='col-md-3 col-6 mb-3'>
            <div className='border rounded p-3 text-center'>
              <h5 className='text-primary mb-1'>
                {formatCurrency(financialData.netRevenue)}
              </h5>
              <p className='mb-0 small text-muted'>Net Revenue</p>
            </div>
          </div>
          <div className='col-md-3 col-6 mb-3'>
            <div className='border rounded p-3 text-center'>
              <h5 className='text-success mb-1'>
                {formatCurrency(financialData.grossRevenue)}
              </h5>
              <p className='mb-0 small text-muted'>Gross Revenue</p>
            </div>
          </div>
          <div className='col-md-3 col-6 mb-3'>
            <div className='border rounded p-3 text-center'>
              <h5 className='text-danger mb-1'>
                {formatCurrency(financialData.refunds.completed)}
              </h5>
              <p className='mb-0 small text-muted'>Refunds</p>
            </div>
          </div>
          <div className='col-md-3 col-6 mb-3'>
            <div className='border rounded p-3 text-center'>
              <h5 className='text-info mb-1'>
                {financialData.transactionCount.toLocaleString()}
              </h5>
              <p className='mb-0 small text-muted'>Transactions</p>
            </div>
          </div>
        </div>

        {/* Revenue Trend Chart */}
        {chartData && (
          <ReactApexChart
            options={chartData.options}
            series={chartData.series}
            type='area'
            height={350}
          />
        )}
      </div>
    </div>
  );
};

export default RevenueOverview;
