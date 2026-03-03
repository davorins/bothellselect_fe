// components/Admin/TicketDashboard/TicketList.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  Table,
  Button,
  Alert,
  Space,
  Select,
  Input,
  DatePicker,
  Card,
  Statistic,
  Row,
  Col,
  Tag,
  Modal,
  Tooltip,
  Dropdown,
  Menu,
} from 'antd';
import {
  DollarOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  DownloadOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import {
  TicketPurchaseData,
  TicketStats,
  TicketFilterParams,
  SeasonYearData,
} from '../../../types/ticketTypes';
import { debounce } from 'lodash';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

// Add this interface if not in your types
interface PaginationData {
  current: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface TicketApiResponse {
  tickets: TicketPurchaseData[];
  pagination: PaginationData;
  stats?: TicketStats;
  metadata?: SeasonYearData;
}

const TicketList: React.FC = () => {
  const [tickets, setTickets] = useState<TicketPurchaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] =
    useState<TicketPurchaseData | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const [filters, setFilters] = useState<TicketFilterParams>({
    seasonFilter: null,
    yearFilter: null,
    statusFilter: null,
    packageFilter: null,
    customerFilter: '',
    dateRange: {
      start: null,
      end: null,
    },
  });

  const [sortOrder, setSortOrder] = useState<
    'dateDesc' | 'dateAsc' | 'amountDesc' | 'amountAsc' | null
  >('dateDesc');

  // Initialize pagination with total from API
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [metadata, setMetadata] = useState<SeasonYearData>({
    seasons: [],
    years: [],
    packages: [],
  });

  const [stats, setStats] = useState<TicketStats>({
    totalAmount: 0,
    totalTickets: 0,
    totalTransactions: 0,
    averageTicketPrice: 0,
    uniqueCustomers: 0,
  });

  const { getAuthToken } = useAuth();

  // Fetch ticket purchases with proper server-side pagination
  const fetchTickets = async (
    filterParams: TicketFilterParams = filters,
    page = 1,
    limit = pagination.pageSize
  ) => {
    try {
      console.log('Starting fetchTickets...');
      setTableLoading(true);
      const token = await getAuthToken();

      if (!token) {
        throw new Error('No authentication token available');
      }

      // Build query parameters
      const queryParams = new URLSearchParams();

      // Add all filter parameters
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (key === 'dateRange') {
            const { start, end } = value as {
              start: Date | null;
              end: Date | null;
            };
            if (start)
              queryParams.append(
                'startDate',
                dayjs(start).format('YYYY-MM-DD')
              );
            if (end)
              queryParams.append('endDate', dayjs(end).format('YYYY-MM-DD'));
          } else if (key === 'seasonFilter' && value) {
            queryParams.append('season', value as string);
          } else if (key === 'yearFilter' && value) {
            queryParams.append('year', value as string);
          } else if (key === 'statusFilter' && value) {
            queryParams.append('status', value as string);
          } else if (key === 'packageFilter' && value) {
            queryParams.append('package', value as string);
          } else if (key === 'customerFilter' && value) {
            queryParams.append('customer', value as string);
          }
        }
      });

      // Add sort order
      if (sortOrder) {
        queryParams.append('sort', sortOrder);
      }

      // Add pagination
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());

      const baseUrl =
        process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
      const endpoint = '/admin/ticket-purchases';
      const queryString = queryParams.toString()
        ? `?${queryParams.toString()}`
        : '';
      const url = `${baseUrl}${endpoint}${queryString}`;

      console.log('Fetching tickets from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(
          `HTTP ${response.status}: ${errorText || response.statusText}`
        );
      }

      const data = await response.json();
      console.log('API Response Data:', data);

      // Check the structure
      console.log('Data structure:', {
        hasTickets: !!data.tickets,
        ticketsCount: data.tickets?.length,
        hasPagination: !!data.pagination,
        paginationData: data.pagination,
        hasStats: !!data.stats,
        statsData: data.stats,
      });

      // Handle response
      let ticketsData: TicketPurchaseData[] = [];

      if (data.tickets && Array.isArray(data.tickets)) {
        ticketsData = data.tickets.map((ticket: any) => {
          // Transform data as before
          let season = '';
          let year = new Date().getFullYear();

          if (ticket.formName) {
            const seasonMatch = ticket.formName.match(
              /(Spring|Summer|Fall|Winter|Autumn)\s*(\d{4})/i
            );
            if (seasonMatch) {
              season = seasonMatch[1];
              year = parseInt(seasonMatch[2]);
            }
          }

          if (!season && ticket.tournamentName) {
            const tournamentMatch = ticket.tournamentName.match(
              /(Spring|Summer|Fall|Winter|Autumn)\s*(\d{4})/i
            );
            if (tournamentMatch) {
              season = tournamentMatch[1];
              year = parseInt(tournamentMatch[2]);
            }
          }

          if (!season && ticket.createdAt) {
            const month = new Date(ticket.createdAt).getMonth();
            if (month >= 2 && month <= 4) season = 'Spring';
            else if (month >= 5 && month <= 7) season = 'Summer';
            else if (month >= 8 && month <= 10) season = 'Fall';
            else season = 'Winter';

            year = new Date(ticket.createdAt).getFullYear();
          }

          return {
            ...ticket,
            key: ticket._id || ticket.id || Math.random().toString(),
            season,
            year,
          };
        });
      }

      // Update pagination with server-side totals
      if (data.pagination) {
        setPagination({
          current: data.pagination.current || page,
          pageSize: data.pagination.pageSize || limit,
          total: data.pagination.total || 0,
          totalPages: data.pagination.totalPages || 0,
        });
      } else {
        // Fallback for old API structure
        console.warn('No pagination data in API response, using defaults');
        setPagination((prev) => ({
          ...prev,
          current: page,
          pageSize: limit,
          total: data.total || ticketsData.length,
          totalPages: data.pages || 1,
        }));
      }

      // Use stats from API or calculate locally
      if (data.stats) {
        console.log('Using API stats:', data.stats);
        setStats({
          totalAmount: data.stats.totalAmount || 0,
          totalTickets: data.stats.totalTickets || 0,
          totalTransactions: data.stats.totalTransactions || 0,
          averageTicketPrice: data.stats.averageTicketPrice || 0,
          uniqueCustomers: data.stats.uniqueCustomers || 0,
        });
      } else {
        console.log('Calculating stats locally');
        calculateStats(ticketsData);
      }

      setTickets(ticketsData);
      setError(null);
      console.log('Fetch successful, tickets loaded:', ticketsData.length);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load ticket purchases';
      setError(errorMessage);
      setTickets([]);

      // For debugging, you can add mock data temporarily:
      // setTickets(getMockTickets()); // Uncomment for debugging
    } finally {
      setLoading(false);
      setTableLoading(false);
      console.log('Fetch completed, loading state:', false);
    }
  };

  // Fetch metadata separately
  const fetchMetadata = async () => {
    try {
      const token = await getAuthToken();
      const url = `${
        process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api'
      }/admin/ticket-purchases/metadata`;

      console.log('Fetching metadata from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Metadata response:', data);
        setMetadata({
          seasons: data.seasons || [],
          years: data.years || [],
          packages: data.packages || [],
        });
      } else if (response.status === 404) {
        console.log(
          'Metadata endpoint not found (404), generating from tickets'
        );
        // Generate metadata from existing tickets
        generateMetadataFromTickets();
      } else {
        console.warn('Failed to fetch metadata, status:', response.status);
        generateMetadataFromTickets();
      }
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
      generateMetadataFromTickets();
    }
  };

  // Generate metadata from existing tickets
  const generateMetadataFromTickets = () => {
    if (tickets.length === 0) {
      // Use default metadata
      setMetadata({
        seasons: ['Spring', 'Summer', 'Fall', 'Winter'],
        years: [new Date().getFullYear()],
        packages: [],
      });
      return;
    }

    const seasons = new Set<string>();
    const years = new Set<number>();
    const packages = new Set<string>();

    tickets.forEach((ticket) => {
      if (ticket.season) seasons.add(ticket.season);
      if (ticket.year) years.add(ticket.year);
      if (ticket.packageName) packages.add(ticket.packageName);
    });

    setMetadata({
      seasons: Array.from(seasons).sort(),
      years: Array.from(years).sort((a, b) => b - a),
      packages: Array.from(packages).sort(),
    });
  };

  // Calculate statistics for current page
  const calculateStats = useCallback((ticketsList: TicketPurchaseData[]) => {
    const completedTickets = ticketsList.filter(
      (t) => t.status === 'completed'
    );
    const totalAmount = completedTickets.reduce(
      (sum, ticket) => sum + ticket.amount,
      0
    );
    const totalTickets = completedTickets.reduce(
      (sum, ticket) => sum + ticket.quantity,
      0
    );
    const totalTransactions = completedTickets.length;
    const averageTicketPrice =
      totalTickets > 0 ? totalAmount / totalTickets : 0;
    const uniqueCustomers = new Set(
      completedTickets.map((t) => t.customerEmail)
    ).size;

    setStats({
      totalAmount,
      totalTickets,
      totalTransactions,
      averageTicketPrice,
      uniqueCustomers,
    });
  }, []);

  useEffect(() => {
    console.log('Component mounted, fetching initial data...');

    const initializeData = async () => {
      try {
        setMetadata({
          seasons: ['Spring', 'Summer', 'Fall', 'Winter'],
          years: [new Date().getFullYear()],
          packages: [],
        });

        // Then fetch tickets with initial filters
        await fetchTickets(filters, 1, pagination.pageSize);
        console.log('Initial data loaded successfully');
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };

    initializeData();
  }, []);

  // Debounced filter changes
  const debouncedFilterChange = useMemo(
    () =>
      debounce((newFilters: Partial<TicketFilterParams>) => {
        const updatedFilters = { ...filters, ...newFilters };
        setFilters(updatedFilters);
        // Reset to first page when filters change
        setPagination((prev) => ({ ...prev, current: 1 }));
        // Fetch with new filters
        fetchTickets(updatedFilters, 1, pagination.pageSize);
      }, 500),
    [filters, pagination.pageSize]
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilters: Partial<TicketFilterParams>) => {
      debouncedFilterChange(newFilters);
    },
    [debouncedFilterChange]
  );

  const handleResetFilters = useCallback(() => {
    const resetFilters = {
      seasonFilter: null,
      yearFilter: null,
      statusFilter: null,
      packageFilter: null,
      customerFilter: '',
      dateRange: {
        start: null,
        end: null,
      },
    };
    setFilters(resetFilters);
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchTickets(resetFilters, 1, pagination.pageSize);
  }, [pagination.pageSize]);

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      handleFilterChange({
        dateRange: {
          start: dates[0],
          end: dates[1],
        },
      });
    } else {
      handleFilterChange({
        dateRange: {
          start: null,
          end: null,
        },
      });
    }
  };

  const handleTableChange = useCallback(
    (newPagination: any, filters: any, sorter: any) => {
      setPagination((prev) => ({
        ...prev,
        current: newPagination.current,
        pageSize: newPagination.pageSize,
      }));

      // Fetch data for new page
      fetchTickets(filters, newPagination.current, newPagination.pageSize);
    },
    [filters]
  );

  const handleViewDetails = (ticket: TicketPurchaseData) => {
    setSelectedTicket(ticket);
    setDetailModalVisible(true);
  };

  const handleExportCSV = async () => {
    try {
      setExportLoading(true);
      const token = await getAuthToken();

      // Build query parameters for export (include all filters)
      const queryParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (key === 'dateRange') {
            const { start, end } = value as {
              start: Date | null;
              end: Date | null;
            };
            if (start)
              queryParams.append(
                'startDate',
                dayjs(start).format('YYYY-MM-DD')
              );
            if (end)
              queryParams.append('endDate', dayjs(end).format('YYYY-MM-DD'));
          } else if (key === 'seasonFilter' && value) {
            queryParams.append('season', value as string);
          } else if (key === 'yearFilter' && value) {
            queryParams.append('year', value as string);
          } else if (key === 'statusFilter' && value) {
            queryParams.append('status', value as string);
          } else if (key === 'packageFilter' && value) {
            queryParams.append('package', value as string);
          } else if (key === 'customerFilter' && value) {
            queryParams.append('customer', value as string);
          }
        }
      });

      const url = `${
        process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api'
      }/admin/ticket-purchases/export${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-purchases-${dayjs().format('YYYY-MM-DD')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to export data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<
      string,
      { color: string; icon: React.ReactNode; text: string }
    > = {
      completed: {
        color: 'success',
        icon: <CheckCircleOutlined />,
        text: 'Completed',
      },
      pending: {
        color: 'processing',
        icon: <ClockCircleOutlined />,
        text: 'Pending',
      },
      failed: { color: 'error', icon: <CloseCircleOutlined />, text: 'Failed' },
      refunded: { color: 'warning', icon: <SyncOutlined />, text: 'Refunded' },
    };

    const config = statusConfig[status] || {
      color: 'default',
      icon: null,
      text: status,
    };

    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const columns = [
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customer',
      render: (text: string, record: TicketPurchaseData) => (
        <div>
          <div className='fw-semibold'>{text || 'N/A'}</div>
          <small className='text-muted'>{record.customerEmail}</small>
        </div>
      ),
    },
    {
      title: 'Package',
      dataIndex: 'packageName',
      key: 'package',
      render: (text: string, record: TicketPurchaseData) => (
        <div>
          <div>{text || 'General Admission'}</div>
          <small className='text-muted'>
            {record.quantity} × ${record.unitPrice?.toFixed(2) || '0.00'}
          </small>
        </div>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: TicketPurchaseData) => (
        <div className='fw-bold text-primary'>
          ${amount.toFixed(2)} {record.currency}
        </div>
      ),
      align: 'right' as const,
    },
    {
      title: 'Season/Year',
      key: 'seasonYear',
      render: (_: unknown, record: TicketPurchaseData) => (
        <div>
          <div>{record.season || 'N/A'}</div>
          <small className='text-muted'>{record.year || 'N/A'}</small>
        </div>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      render: (date: string) => (
        <div>
          <div>{dayjs(date).format('MMM D, YYYY')}</div>
          <small className='text-muted'>{dayjs(date).format('h:mm A')}</small>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      render: (_: unknown, record: TicketPurchaseData) => (
        <Space>
          <Tooltip title='View Details'>
            <Button
              type='link'
              className='btn-outline-primary btn-sm'
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
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

  if (loading && tickets.length === 0) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div className='card'>
            <div className='card-body'>
              <div className='text-center p-4'>
                <LoadingSpinner />
                <p className='mt-3 text-muted'>Loading ticket purchases...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <div className='content'>
        {/* Statistics Cards */}
        <Row gutter={[16, 16]} className='mb-4'>
          <Col xs={24} sm={12} lg={6}>
            <Card className='border-primary' hoverable>
              <Statistic
                title='Total Revenue'
                value={stats.totalAmount}
                precision={2}
                prefix='$'
                valueStyle={{ color: '#3f87f5' }}
                suffix={tickets.length > 0 ? tickets[0].currency : 'USD'}
              />
              <div className='mt-2 text-muted'>
                <DollarOutlined className='me-1' />
                {stats.totalTransactions} transactions
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className='border-success' hoverable>
              <Statistic
                title='Tickets Sold'
                value={stats.totalTickets}
                valueStyle={{ color: '#10b981' }}
              />
              <div className='mt-2 text-muted'>
                <ShoppingCartOutlined className='me-1' />
                Average ${stats.averageTicketPrice.toFixed(2)} per ticket
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className='border-info' hoverable>
              <Statistic
                title='Active Customers'
                value={stats.uniqueCustomers || 0}
                valueStyle={{ color: '#06b6d4' }}
              />
              <div className='mt-2 text-muted'>
                <UserOutlined className='me-1' />
                Unique purchasers
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className='border-warning' hoverable>
              <Statistic
                title='Success Rate'
                value={(
                  (stats.totalTransactions / Math.max(pagination.total, 1)) *
                  100
                ).toFixed(1)}
                precision={1}
                suffix='%'
                valueStyle={{ color: '#f59e0b' }}
              />
              <div className='mt-2 text-muted'>
                <CheckCircleOutlined className='me-1' />
                {stats.totalTransactions} completed transactions
              </div>
            </Card>
          </Col>
        </Row>

        {/* Main Table Card */}
        <div className='card'>
          <div className='card-header d-flex align-items-center justify-content-between flex-wrap pb-0'>
            <h4 className='mb-5'>Ticket Purchase Management</h4>
            <div className='d-flex align-items-center flex-wrap'>
              <Button
                className='btn btn-primary d-flex align-items-center mb-3 me-2'
                icon={<DownloadOutlined />}
                onClick={handleExportCSV}
                loading={exportLoading}
              >
                Export CSV
              </Button>

              <div className='dropdown mb-3 me-2'>
                <Dropdown
                  dropdownRender={() => (
                    <div
                      className='p-3 bg-white border rounded shadow-sm'
                      style={{ width: 300 }}
                    >
                      <h5 className='mb-3'>Filter Tickets</h5>

                      <div className='mb-3'>
                        <label className='form-label'>Season</label>
                        <Select
                          style={{ width: '100%' }}
                          value={filters.seasonFilter}
                          onChange={(value) =>
                            handleFilterChange({ seasonFilter: value })
                          }
                          allowClear
                          placeholder='Select season'
                        >
                          {metadata.seasons.map((season: string) => (
                            <Option key={season} value={season}>
                              {season}
                            </Option>
                          ))}
                        </Select>
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
                          {metadata.years.map((year: number) => (
                            <Option key={year} value={year}>
                              {year}
                            </Option>
                          ))}
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
                          <Option value='completed'>Completed</Option>
                          <Option value='pending'>Pending</Option>
                          <Option value='failed'>Failed</Option>
                          <Option value='refunded'>Refunded</Option>
                        </Select>
                      </div>

                      <div className='mb-3'>
                        <label className='form-label'>Package</label>
                        <Select
                          style={{ width: '100%' }}
                          value={filters.packageFilter}
                          onChange={(value) =>
                            handleFilterChange({ packageFilter: value })
                          }
                          allowClear
                          placeholder='Select package'
                        >
                          {metadata.packages.map((pkg: string) => (
                            <Option key={pkg} value={pkg}>
                              {pkg}
                            </Option>
                          ))}
                        </Select>
                      </div>

                      <div className='mb-3'>
                        <label className='form-label'>Customer</label>
                        <Input
                          value={filters.customerFilter}
                          onChange={(e) =>
                            handleFilterChange({
                              customerFilter: e.target.value,
                            })
                          }
                          placeholder='Search by name or email...'
                        />
                      </div>

                      <div className='mb-3'>
                        <label className='form-label'>Date Range</label>
                        <RangePicker
                          style={{ width: '100%' }}
                          onChange={handleDateRangeChange}
                          format='YYYY-MM-DD'
                        />
                      </div>

                      <Button className='w-100' onClick={handleResetFilters}>
                        Reset Filters
                      </Button>
                    </div>
                  )}
                >
                  <Button className='btn btn-outline-light bg-white'>
                    <FilterOutlined className='me-2' />
                    Filter
                  </Button>
                </Dropdown>
              </div>
            </div>
          </div>

          <div className='card-body p-0 py-3'>
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

            {tickets.length === 0 && !loading ? (
              <div className='text-center py-5'>
                <ShoppingCartOutlined
                  style={{ fontSize: '48px', color: '#ccc' }}
                />
                <h4 className='mt-3'>No Ticket Purchases Found</h4>
                <p className='text-muted'>
                  {pagination.total === 0
                    ? 'No ticket purchases have been made yet.'
                    : 'No purchases match the current filters.'}
                </p>
                {pagination.total > 0 && (
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
                  dataSource={tickets}
                  rowKey='key'
                  pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showTotal: (total, range) =>
                      `Showing ${range[0]}-${range[1]} of ${total} purchases`,
                    showQuickJumper: true,
                  }}
                  onChange={handleTableChange}
                  loading={tableLoading}
                  scroll={{ x: true }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Ticket Detail Modal - Keep as is */}
        <Modal
          title='Ticket Purchase Details'
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={[
            <Button key='close' onClick={() => setDetailModalVisible(false)}>
              Close
            </Button>,
            selectedTicket?.receiptUrl && (
              <Button
                key='receipt'
                type='primary'
                onClick={() => window.open(selectedTicket.receiptUrl, '_blank')}
              >
                View Receipt
              </Button>
            ),
          ]}
          width={700}
        >
          {selectedTicket && (
            <div className='p-3'>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <h6>Customer Information</h6>
                  <p>
                    <strong>Name:</strong>{' '}
                    {selectedTicket.customerName || 'N/A'}
                  </p>
                  <p>
                    <strong>Email:</strong> {selectedTicket.customerEmail}
                  </p>
                </Col>
                <Col span={12}>
                  <h6>Purchase Information</h6>
                  <p>
                    <strong>Package:</strong> {selectedTicket.packageName}
                  </p>
                  <p>
                    <strong>Quantity:</strong> {selectedTicket.quantity}
                  </p>
                  <p>
                    <strong>Unit Price:</strong> $
                    {selectedTicket.unitPrice?.toFixed(2)}
                  </p>
                </Col>
                <Col span={12}>
                  <h6>Payment Details</h6>
                  <p>
                    <strong>Amount:</strong> ${selectedTicket.amount.toFixed(2)}{' '}
                    {selectedTicket.currency}
                  </p>
                  <p>
                    <strong>Status:</strong>{' '}
                    {getStatusTag(selectedTicket.status)}
                  </p>
                  <p>
                    <strong>Payment ID:</strong> {selectedTicket.paymentId}
                  </p>
                </Col>
                <Col span={12}>
                  <h6>Timestamps</h6>
                  <p>
                    <strong>Created:</strong>{' '}
                    {dayjs(selectedTicket.createdAt).format(
                      'YYYY-MM-DD HH:mm:ss'
                    )}
                  </p>
                  <p>
                    <strong>Processed:</strong>{' '}
                    {selectedTicket.processedAt
                      ? dayjs(selectedTicket.processedAt).format(
                          'YYYY-MM-DD HH:mm:ss'
                        )
                      : 'N/A'}
                  </p>
                </Col>
                <Col span={24}>
                  <h6>Season & Year</h6>
                  <p>
                    <strong>Season:</strong> {selectedTicket.season || 'N/A'}{' '}
                    &nbsp;|&nbsp;
                    <strong>Year:</strong> {selectedTicket.year || 'N/A'}
                  </p>
                </Col>
              </Row>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default TicketList;
