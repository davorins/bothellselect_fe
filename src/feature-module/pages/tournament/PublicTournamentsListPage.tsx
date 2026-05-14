// feature-module/pages/tournament/PublicTournamentsListPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Badge,
  Avatar,
  Statistic,
  Divider,
  Empty,
  Spin,
  Pagination,
  Tooltip,
  Grid,
  Alert,
  Dropdown,
  Menu,
} from 'antd';
import {
  TrophyOutlined,
  CalendarOutlined,
  TeamOutlined,
  SearchOutlined,
  FilterOutlined,
  FireOutlined,
  CrownOutlined,
  ClockCircleOutlined,
  StarOutlined,
  EyeOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  EnvironmentOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;
const { useBreakpoint } = Grid;

interface Tournament {
  _id: string;
  name: string;
  description: string;
  year: number;
  startDate: string;
  endDate: string;
  status: string;
  levelOfCompetition: string;
  sex: string;
  format: string;
  teamCount: number;
  maxTeams?: number;
  minTeams?: number;
}

interface Filters {
  status: string;
  year: string;
  format: string;
  levelOfCompetition: string;
  sex: string;
  search: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const PublicTournamentsListPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    status: '',
    year: '',
    format: '',
    levelOfCompetition: '',
    sex: '',
    search: '',
    page: 1,
    limit: 12,
    sortBy: 'startDate',
    sortOrder: 'desc',
  });

  const screens = useBreakpoint();

  const API_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchTournaments();
  }, [filters]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(
        `${API_URL}/tournaments/public?${queryParams}`,
      );
      const data = await response.json();

      if (data.success) {
        const tournamentsData = data.tournaments || data.data || [];
        setTournaments(tournamentsData);
        setTotal(data.total || data.count || tournamentsData.length);
      } else {
        setTournaments([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      setTournaments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      year: '',
      format: '',
      levelOfCompetition: '',
      sex: '',
      search: '',
      page: 1,
      limit: 12,
      sortBy: 'startDate',
      sortOrder: 'desc',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'success';
      case 'open':
        return 'processing';
      case 'completed':
        return 'default';
      case 'draft':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'LIVE';
      case 'open':
        return 'OPEN';
      case 'completed':
        return 'COMPLETED';
      case 'draft':
        return 'DRAFT';
      default:
        return status.toUpperCase();
    }
  };

  const getFormatTag = (format: string) => {
    switch (format) {
      case 'single-elimination':
        return {
          color: 'red',
          text: 'Single Elimination',
          icon: <FireOutlined />,
        };
      case 'double-elimination':
        return {
          color: 'orange',
          text: 'Double Elimination',
          icon: <FireOutlined />,
        };
      case 'round-robin':
        return { color: 'blue', text: 'Round Robin', icon: <TeamOutlined /> };
      default:
        return {
          color: 'default',
          text: format.replace('-', ' '),
          icon: <TrophyOutlined />,
        };
    }
  };

  const getLevelTag = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'gold':
        return { color: 'gold', text: 'Gold', icon: <CrownOutlined /> };
      case 'silver':
        return { color: 'default', text: 'Silver', icon: <StarOutlined /> };
      default:
        return { color: 'blue', text: level, icon: <StarOutlined /> };
    }
  };

  const calculateTournamentDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const sortMenu = (
    <Menu className='glass-dropdown-menu'>
      <Menu.Item
        key='date-desc'
        onClick={() => handleFilterChange('sortBy', 'startDate')}
      >
        <SortDescendingOutlined /> Newest First
      </Menu.Item>
      <Menu.Item
        key='date-asc'
        onClick={() => handleFilterChange('sortBy', 'startDate')}
      >
        <SortAscendingOutlined /> Oldest First
      </Menu.Item>
      <Menu.Item
        key='popularity'
        onClick={() => handleFilterChange('sortBy', 'teamCount')}
      >
        <TeamOutlined /> Most Popular
      </Menu.Item>
      <Menu.Item
        key='name'
        onClick={() => handleFilterChange('sortBy', 'name')}
      >
        <SortAscendingOutlined /> Name (A-Z)
      </Menu.Item>
    </Menu>
  );

  if (loading && tournaments.length === 0) {
    return (
      <div className='tournaments-root'>
        <div className='tournaments-bg' />
        <div className='tournaments-orb tournaments-orb-1' />
        <div className='tournaments-orb tournaments-orb-2' />
        <div className='tournaments-orb tournaments-orb-3' />
        <div className='tournaments-loading'>
          <div className='glass-card-loading'>
            <Spin size='large' />
            <Title level={4}>Loading Tournaments</Title>
            <Text>Fetching tournament data...</Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='tournaments-root'>
      {/* Background orbs */}
      <div className='tournaments-bg' />
      <div className='tournaments-orb tournaments-orb-1' />
      <div className='tournaments-orb tournaments-orb-2' />
      <div className='tournaments-orb tournaments-orb-3' />

      <div className='tournaments-wrap'>
        {/* Page Header - Glass styled */}
        <div className='glass-header-card'>
          <Row gutter={[32, 32]} align='middle'>
            <Col xs={24} md={16}>
              <Space direction='vertical' size='middle'>
                <Title level={1} className='glass-header-title'>
                  <TrophyOutlined className='header-icon' />
                  Tournament Hub
                </Title>
                <Paragraph className='glass-header-subtitle'>
                  Discover and join exciting tournaments. Find the perfect
                  competition for your team.
                </Paragraph>
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <div className='glass-stats-badge'>
                <Statistic
                  title={<span className='stat-title'>Active Tournaments</span>}
                  value={
                    tournaments.filter(
                      (t) =>
                        t.status === 'ongoing' ||
                        t.status === 'open' ||
                        t.status === 'draft',
                    ).length
                  }
                  valueStyle={{ color: '#fbbf24', fontSize: 32 }}
                  prefix={<TeamOutlined />}
                />
              </div>
            </Col>
          </Row>
        </div>

        {/* Filters Section - Glass styled */}
        <div className='glass-filters-card'>
          <Row gutter={[16, 16]} align='middle'>
            <Col xs={24} md={8}>
              <Search
                placeholder='Search tournaments...'
                enterButton={<SearchOutlined />}
                size='large'
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                onSearch={handleSearch}
                allowClear
                className='glass-search'
              />
            </Col>
            <Col xs={24} md={16}>
              <Space wrap>
                <Select
                  placeholder='Status'
                  style={{ width: 140 }}
                  value={filters.status || undefined}
                  onChange={(value) => handleFilterChange('status', value)}
                  allowClear
                  size='large'
                  className='glass-select'
                  dropdownClassName='glass-dropdown'
                >
                  <Option value='open'>Registration Open</Option>
                  <Option value='ongoing'>Live Tournaments</Option>
                  <Option value='completed'>Completed</Option>
                  <Option value='draft'>Draft</Option>
                </Select>

                <Select
                  placeholder='Format'
                  style={{ width: 160 }}
                  value={filters.format || undefined}
                  onChange={(value) => handleFilterChange('format', value)}
                  allowClear
                  size='large'
                  className='glass-select'
                  dropdownClassName='glass-dropdown'
                >
                  <Option value='single-elimination'>Single Elimination</Option>
                  <Option value='double-elimination'>Double Elimination</Option>
                  <Option value='round-robin'>Round Robin</Option>
                </Select>

                <Select
                  placeholder='Level'
                  style={{ width: 120 }}
                  value={filters.levelOfCompetition || undefined}
                  onChange={(value) =>
                    handleFilterChange('levelOfCompetition', value)
                  }
                  allowClear
                  size='large'
                  className='glass-select'
                  dropdownClassName='glass-dropdown'
                >
                  <Option value='gold'>Gold</Option>
                  <Option value='silver'>Silver</Option>
                </Select>

                <Select
                  placeholder='Gender'
                  style={{ width: 120 }}
                  value={filters.sex || undefined}
                  onChange={(value) => handleFilterChange('sex', value)}
                  allowClear
                  size='large'
                  className='glass-select'
                  dropdownClassName='glass-dropdown'
                >
                  <Option value='male'>Male</Option>
                  <Option value='female'>Female</Option>
                  <Option value='mixed'>Mixed</Option>
                </Select>

                <Dropdown overlay={sortMenu} placement='bottomRight'>
                  <Button
                    icon={<FilterOutlined />}
                    size='large'
                    className='glass-btn-outline'
                  >
                    Sort
                  </Button>
                </Dropdown>

                <Button
                  onClick={clearFilters}
                  size='large'
                  className='glass-btn-secondary'
                >
                  Clear Filters
                </Button>
              </Space>
            </Col>
          </Row>

          {/* Active Filters */}
          {(filters.status ||
            filters.format ||
            filters.levelOfCompetition ||
            filters.sex ||
            filters.search) && (
            <div style={{ marginTop: 16 }}>
              <Space wrap>
                <Text className='filter-label'>Active filters:</Text>
                {filters.status && (
                  <Tag
                    closable
                    onClose={() => handleFilterChange('status', '')}
                    className='glass-tag'
                  >
                    Status: {filters.status}
                  </Tag>
                )}
                {filters.format && (
                  <Tag
                    closable
                    onClose={() => handleFilterChange('format', '')}
                    className='glass-tag'
                  >
                    Format: {filters.format}
                  </Tag>
                )}
                {filters.levelOfCompetition && (
                  <Tag
                    closable
                    onClose={() => handleFilterChange('levelOfCompetition', '')}
                    className='glass-tag'
                  >
                    Level: {filters.levelOfCompetition}
                  </Tag>
                )}
                {filters.sex && (
                  <Tag
                    closable
                    onClose={() => handleFilterChange('sex', '')}
                    className='glass-tag'
                  >
                    Gender: {filters.sex}
                  </Tag>
                )}
                {filters.search && (
                  <Tag
                    closable
                    onClose={() => handleFilterChange('search', '')}
                    className='glass-tag'
                  >
                    Search: {filters.search}
                  </Tag>
                )}
              </Space>
            </div>
          )}
        </div>

        {/* Tournaments Grid */}
        {tournaments.length > 0 ? (
          <>
            <Row gutter={[24, 24]}>
              {tournaments.map((tournament) => {
                const formatBadge = getFormatTag(tournament.format);
                const levelBadge = getLevelTag(tournament.levelOfCompetition);
                const tournamentDurationDays = calculateTournamentDuration(
                  tournament.startDate,
                  tournament.endDate,
                );

                return (
                  <Col xs={24} sm={12} lg={8} xl={6} key={tournament._id}>
                    <Link
                      to={`/tournaments/${tournament._id}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <div className='glass-tournament-card'>
                        <div className='tournament-card-cover'>
                          <TrophyOutlined className='cover-icon' />
                          <div className='status-badge'>
                            <Badge
                              status={getStatusColor(tournament.status) as any}
                              text={getStatusText(tournament.status)}
                            />
                          </div>
                        </div>
                        <div className='tournament-card-content'>
                          <div className='card-header'>
                            <Title level={5} className='tournament-title'>
                              {tournament.name}
                            </Title>
                            <Text className='tournament-year'>
                              {tournament.year}
                            </Text>
                          </div>

                          {/* Tournament Tags */}
                          <Space wrap style={{ marginBottom: 16 }}>
                            <Tag
                              color={formatBadge.color}
                              icon={formatBadge.icon}
                              className='glass-tag'
                            >
                              {formatBadge.text}
                            </Tag>
                            <Tag
                              color={levelBadge.color}
                              icon={levelBadge.icon}
                              className='glass-tag'
                            >
                              {levelBadge.text}
                            </Tag>
                            <Tag color='cyan' className='glass-tag'>
                              {tournament.sex}
                            </Tag>
                          </Space>

                          {/* Tournament Stats */}
                          <div className='stats-list'>
                            <div className='stat-row'>
                              <Space>
                                <TeamOutlined className='stat-icon-success' />
                                <Text className='stat-label'>Teams</Text>
                              </Space>
                              <Text strong className='stat-value'>
                                {tournament.teamCount}
                              </Text>
                            </div>

                            <div className='stat-row'>
                              <Space>
                                <CalendarOutlined className='stat-icon-primary' />
                                <Text className='stat-label'>Tournament</Text>
                              </Space>
                              <Text strong className='stat-value'>
                                {tournamentDurationDays} days
                              </Text>
                            </div>

                            <div className='stat-row'>
                              <Space>
                                <ClockCircleOutlined className='stat-icon-purple' />
                                <Text className='stat-label'>Matches</Text>
                              </Space>
                              <Text strong className='stat-value'>
                                40 mins
                              </Text>
                            </div>

                            <div className='stat-row'>
                              <Space>
                                <CalendarOutlined className='stat-icon-orange' />
                                <Text className='stat-label'>Dates</Text>
                              </Space>
                              <div className='date-range'>
                                <div>{formatDate(tournament.startDate)}</div>
                                <div>{formatDate(tournament.endDate)}</div>
                              </div>
                            </div>
                          </div>

                          <Divider className='card-divider' />

                          <Button
                            type='primary'
                            block
                            icon={<EyeOutlined />}
                            className='glass-btn-primary view-btn'
                          >
                            View Tournament
                          </Button>
                        </div>
                      </div>
                    </Link>
                  </Col>
                );
              })}
            </Row>

            {/* Pagination */}
            {total > filters.limit && (
              <div className='pagination-wrapper'>
                <Pagination
                  current={filters.page}
                  total={total}
                  pageSize={filters.limit}
                  onChange={(page) => handleFilterChange('page', page)}
                  showSizeChanger
                  onShowSizeChange={(current, size) =>
                    handleFilterChange('limit', size)
                  }
                  showTotal={(total, range) =>
                    `${range[0]}-${range[1]} of ${total} tournaments`
                  }
                  className='glass-pagination'
                />
              </div>
            )}
          </>
        ) : (
          <div className='glass-empty-card'>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Title level={4}>No tournaments found</Title>
                  <Text>
                    {filters.search || filters.status || filters.format
                      ? 'Try adjusting your filters or search terms'
                      : 'No tournaments are currently available'}
                  </Text>
                </div>
              }
            />
            {(filters.search || filters.status || filters.format) && (
              <Button
                type='primary'
                onClick={clearFilters}
                className='glass-btn-primary'
                style={{ marginTop: 16 }}
              >
                Clear All Filters
              </Button>
            )}
          </div>
        )}

        {/* Stats Footer */}
        {tournaments.length > 0 && (
          <div className='glass-footer-stats'>
            <Row gutter={[32, 32]}>
              <Col xs={24} md={8}>
                <Statistic
                  title={
                    <span className='footer-stat-title'>Total Tournaments</span>
                  }
                  value={total}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col xs={24} md={8}>
                <Statistic
                  title={
                    <span className='footer-stat-title'>
                      Active Tournaments
                    </span>
                  }
                  value={
                    tournaments.filter(
                      (t) => t.status === 'ongoing' || t.status === 'open',
                    ).length
                  }
                  prefix={<FireOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col xs={24} md={8}>
                <Statistic
                  title={
                    <span className='footer-stat-title'>
                      Total Teams (Page)
                    </span>
                  }
                  value={tournaments.reduce((sum, t) => sum + t.teamCount, 0)}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
            </Row>
          </div>
        )}
      </div>

      <style>{`
        /* ── Root & Background ──────────────────────────────────── */
        .tournaments-root {
          min-height: 100vh;
          background: #0a0a0a;
          position: relative;
          overflow-x: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        .tournaments-bg {
          position: fixed; inset: 0;
          background:
            radial-gradient(circle at 15% 40%, rgba(80,110,228,.15) 0%, transparent 55%),
            radial-gradient(circle at 85% 70%, rgba(120,140,255,.1) 0%, transparent 55%);
          pointer-events: none; z-index: 0;
        }

        .tournaments-orb {
          position: fixed; border-radius: 50%;
          filter: blur(90px); pointer-events: none;
          animation: orbFloat 22s ease-in-out infinite; z-index: 0;
        }
        .tournaments-orb-1 { width:420px; height:420px; background:rgba(80,110,228,.15); top:-120px; left:-120px; animation-delay:0s; }
        .tournaments-orb-2 { width:520px; height:520px; background:rgba(120,140,255,.1); bottom:-160px; right:-160px; animation-delay:6s; }
        .tournaments-orb-3 { width:320px; height:320px; background:rgba(80,110,228,.1); top:45%; left:42%; animation-delay:12s; }

        @keyframes orbFloat {
          0%,100% { transform: translate(0,0) rotate(0deg); }
          33% { transform: translate(28px,-28px) rotate(120deg); }
          66% { transform: translate(-18px,18px) rotate(240deg); }
        }

        /* ── Wrapper ──────────────────────────────────────────── */
        .tournaments-wrap {
          position: relative; z-index: 1;
          max-width: 1400px; margin: 0 auto;
          padding: 80px 24px 100px;
        }

        /* ── Loading State ──────────────────────────────────────── */
        .tournaments-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .glass-card-loading {
          background: rgba(15, 15, 15, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 32px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 48px;
          text-align: center;
          max-width: 500px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .glass-card-loading h4 {
          margin-top: 24px;
          margin-bottom: 8px;
          color: white;
        }

        .glass-card-loading p {
          color: rgba(255, 255, 255, 0.6);
        }

        /* ── Glass Header Card ──────────────────────────────────── */
        .glass-header-card {
          background: linear-gradient(135deg, rgba(80,110,228,0.2), rgba(80,110,228,0.05));
          backdrop-filter: blur(20px);
          border-radius: 32px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .glass-header-title {
          color: white !important;
          margin: 0 !important;
          font-size: 42px !important;
          font-weight: 800 !important;
        }

        .header-icon {
          margin-right: 16px;
          font-size: 36px;
          color: #fbbf24;
        }

        .glass-header-subtitle {
          color: rgba(255, 255, 255, 0.7) !important;
          font-size: 18px !important;
          margin: 0 !important;
        }

        .glass-stats-badge {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          text-align: center;
        }

        .stat-title {
          color: rgba(255, 255, 255, 0.7);
        }

        /* ── Glass Filters Card ─────────────────────────────────── */
        .glass-filters-card {
          background: rgba(15, 15, 15, 0.85);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 20px;
          margin-bottom: 24px;
          transition: all 0.3s ease;
        }

        .glass-filters-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        }

        /* ── Glass Search ───────────────────────────────────────── */
        .glass-search .ant-input-group-addon .ant-btn {
          background: rgba(80, 110, 228, 0.8);
          border-color: transparent;
        }

        .glass-search .ant-input {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          color: white;
        }

        .glass-search .ant-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .glass-search .ant-input:hover,
        .glass-search .ant-input:focus {
          background: rgba(255, 255, 255, 0.12);
          border-color: #506ee4;
        }

        /* ── Glass Select ───────────────────────────────────────── */
        .glass-select .ant-select-selector {
          background: rgba(255, 255, 255, 0.08) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: white !important;
        }

        .glass-select .ant-select-arrow {
          color: rgba(255, 255, 255, 0.5);
        }

        .glass-select .ant-select-selection-placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .glass-dropdown {
          background: rgba(10, 10, 10, 0.95) !important;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
        }

        .glass-dropdown .ant-dropdown-menu-item {
          color: rgba(255, 255, 255, 0.8);
        }

        .glass-dropdown .ant-dropdown-menu-item:hover {
          background: rgba(80, 110, 228, 0.2);
        }

        /* ── Glass Buttons ──────────────────────────────────────── */
        .glass-btn-outline {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.85);
        }

        .glass-btn-outline:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(80, 110, 228, 0.3);
          color: #506ee4;
        }

        .glass-btn-secondary {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.85);
        }

        .glass-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.25);
        }

        .glass-btn-primary {
          background: linear-gradient(135deg, #506ee4, #3f5cd6);
          border: none;
          color: white;
        }

        .glass-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(80, 110, 228, 0.4);
        }

        /* ── Glass Tags ─────────────────────────────────────────── */
        .glass-tag {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.8);
        }

        .filter-label {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.85rem;
        }

        /* ── Glass Tournament Card ──────────────────────────────── */
        .glass-tournament-card {
          background: rgba(15, 15, 15, 0.85);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          transition: all 0.3s ease;
          height: 100%;
          cursor: pointer;
        }

        .glass-tournament-card:hover {
          transform: translateY(-4px);
          border-color: rgba(80, 110, 228, 0.3);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        }

        .tournament-card-cover {
          height: 120px;
          background: linear-gradient(135deg, #506ee4, #6FCCD8);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cover-icon {
          font-size: 48px;
          color: rgba(255, 255, 255, 0.9);
        }

        .status-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          padding: 4px 8px;
          border-radius: 12px;
        }

        .status-badge .ant-badge-status-text {
          color: white !important;
          font-size: 11px;
          font-weight: bold;
        }

        .tournament-card-content {
          padding: 20px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .tournament-title {
          color: white !important;
          margin: 0 !important;
          line-height: 1.3 !important;
        }

        .tournament-year {
          color: rgba(255, 255, 255, 0.5);
          font-size: 16px;
        }

        .stats-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-label {
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
        }

        .stat-value {
          color: white;
          font-size: 14px;
        }

        .stat-icon-success {
          color: #52c41a;
        }

        .stat-icon-primary {
          color: #1890ff;
        }

        .stat-icon-purple {
          color: #722ed1;
        }

        .stat-icon-orange {
          color: #fa8c16;
        }

        .date-range {
          text-align: right;
        }

        .date-range div {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
        }

        .card-divider {
          background: rgba(255, 255, 255, 0.08);
          margin: 16px 0;
        }

        .view-btn {
          border-radius: 8px;
        }

        /* ── Glass Empty Card ───────────────────────────────────── */
        .glass-empty-card {
          background: rgba(15, 15, 15, 0.85);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 48px;
          text-align: center;
        }

        .glass-empty-card h4 {
          color: white;
        }

        .glass-empty-card p {
          color: rgba(255, 255, 255, 0.6);
        }

        /* ── Glass Footer Stats ─────────────────────────────────── */
        .glass-footer-stats {
          background: rgba(15, 15, 15, 0.85);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 32px;
          margin-top: 32px;
        }

        .footer-stat-title {
          color: rgba(255, 255, 255, 0.6);
        }

        /* ── Glass Pagination ───────────────────────────────────── */
        .pagination-wrapper {
          margin-top: 32px;
          text-align: center;
        }

        .glass-pagination .ant-pagination-item {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .glass-pagination .ant-pagination-item a {
          color: rgba(255, 255, 255, 0.7);
        }

        .glass-pagination .ant-pagination-item-active {
          background: #506ee4;
          border-color: #506ee4;
        }

        .glass-pagination .ant-pagination-item-active a {
          color: white;
        }

        .glass-pagination .ant-pagination-prev button,
        .glass-pagination .ant-pagination-next button {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.7);
        }

        .glass-pagination .ant-pagination-options-quick-jumper input {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          color: white;
        }

        .glass-pagination .ant-pagination-total-text {
          color: rgba(255, 255, 255, 0.6);
        }

        /* ── Responsive ───────────────────────────────────────── */
        @media (max-width: 768px) {
          .tournaments-wrap {
            padding: 60px 16px 80px;
          }

          .glass-header-title {
            font-size: 32px !important;
          }

          .glass-header-subtitle {
            font-size: 14px !important;
          }

          .glass-filters-card {
            padding: 16px;
          }

          .tournament-card-cover {
            height: 100px;
          }

          .cover-icon {
            font-size: 36px;
          }
        }

        @media (max-width: 480px) {
          .glass-header-title {
            font-size: 24px !important;
          }

          .tournament-title {
            font-size: 14px !important;
          }

          .tournament-year {
            font-size: 12px;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .tournaments-orb,
          .glass-tournament-card,
          .glass-filters-card {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </div>
  );
};

export default PublicTournamentsListPage;
