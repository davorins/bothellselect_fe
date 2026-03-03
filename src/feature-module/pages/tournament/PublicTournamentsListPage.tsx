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

      // Build query parameters
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      console.log(
        'Fetching from:',
        `${API_URL}/tournaments/public?${queryParams}`
      );

      const response = await fetch(
        `${API_URL}/tournaments/public?${queryParams}`
      );
      const data = await response.json();

      console.log('API Response:', data); // Debug log

      if (data.success) {
        const tournamentsData = data.tournaments || data.data || [];
        console.log('Tournaments loaded:', tournamentsData.length);
        console.log('Tournament details:', tournamentsData);

        setTournaments(tournamentsData);
        setTotal(data.total || data.count || tournamentsData.length);
      } else {
        console.log('API returned success: false');
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
    <Menu>
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
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f0f2f5',
        }}
      >
        <Card style={{ padding: 48, textAlign: 'center', borderRadius: 8 }}>
          <Spin size='large' />
          <Title level={4} style={{ marginTop: 24, marginBottom: 8 }}>
            Loading Tournaments
          </Title>
          <Text type='secondary'>Fetching tournament data...</Text>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
        {/* Page Header */}
        <Card
          style={{
            marginTop: 54,
            marginBottom: 24,
            background: 'linear-gradient(135deg, #594230 0%, #6FCCD8 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
          }}
          styles={{ body: { padding: 32 } }}
        >
          <Row gutter={[32, 32]} align='middle'>
            <Col xs={24} md={16}>
              <Space direction='vertical' size='middle'>
                <Title
                  level={1}
                  style={{ color: 'white', margin: 0, fontSize: 42 }}
                >
                  <TrophyOutlined style={{ marginRight: 16, fontSize: 36 }} />
                  Tournament Hub
                </Title>
                <Paragraph
                  style={{
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 18,
                    margin: 0,
                  }}
                >
                  Discover and join exciting tournaments. Find the perfect
                  competition for your team.
                </Paragraph>
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <Space direction='vertical' style={{ width: '100%' }}>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    padding: 16,
                    borderRadius: 8,
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <Statistic
                    title={
                      <Text style={{ color: 'white' }}>Active Tournaments</Text>
                    }
                    value={
                      tournaments.filter(
                        (t) =>
                          t.status === 'ongoing' ||
                          t.status === 'open' ||
                          t.status === 'draft'
                      ).length
                    }
                    valueStyle={{ color: 'white', fontSize: 32 }}
                    prefix={<TeamOutlined />}
                  />
                </div>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Filters Section */}
        <Card
          style={{
            marginBottom: 24,
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
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
                >
                  <Option value='male'>Male</Option>
                  <Option value='female'>Female</Option>
                  <Option value='mixed'>Mixed</Option>
                </Select>

                <Dropdown overlay={sortMenu} placement='bottomRight'>
                  <Button icon={<FilterOutlined />} size='large'>
                    Sort
                  </Button>
                </Dropdown>

                <Button onClick={clearFilters} size='large' type='default'>
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
                <Text type='secondary'>Active filters:</Text>
                {filters.status && (
                  <Tag
                    closable
                    onClose={() => handleFilterChange('status', '')}
                  >
                    Status: {filters.status}
                  </Tag>
                )}
                {filters.format && (
                  <Tag
                    closable
                    onClose={() => handleFilterChange('format', '')}
                  >
                    Format: {filters.format}
                  </Tag>
                )}
                {filters.levelOfCompetition && (
                  <Tag
                    closable
                    onClose={() => handleFilterChange('levelOfCompetition', '')}
                  >
                    Level: {filters.levelOfCompetition}
                  </Tag>
                )}
                {filters.sex && (
                  <Tag closable onClose={() => handleFilterChange('sex', '')}>
                    Gender: {filters.sex}
                  </Tag>
                )}
                {filters.search && (
                  <Tag
                    closable
                    onClose={() => handleFilterChange('search', '')}
                  >
                    Search: {filters.search}
                  </Tag>
                )}
              </Space>
            </div>
          )}
        </Card>

        {/* Tournaments Grid */}
        {tournaments.length > 0 ? (
          <>
            <Row gutter={[24, 24]}>
              {tournaments.map((tournament) => {
                const formatBadge = getFormatTag(tournament.format);
                const levelBadge = getLevelTag(tournament.levelOfCompetition);
                const tournamentDurationDays = calculateTournamentDuration(
                  tournament.startDate,
                  tournament.endDate
                );

                return (
                  <Col xs={24} sm={12} lg={8} xl={6} key={tournament._id}>
                    <Link
                      to={`/tournaments/${tournament._id}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <Card
                        hoverable
                        style={{
                          height: '100%',
                          borderRadius: 12,
                          overflow: 'hidden',
                          border: '1px solid #f0f0f0',
                          transition: 'all 0.3s ease',
                        }}
                        styles={{ body: { padding: 20 } }}
                        cover={
                          <div
                            style={{
                              height: 120,
                              background:
                                'linear-gradient(135deg, #594230 0%, #6FCCD8 100%)',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <TrophyOutlined
                              style={{
                                fontSize: 48,
                                color: 'rgba(255,255,255,0.9)',
                              }}
                            />
                            <Badge
                              status={getStatusColor(tournament.status) as any}
                              text={
                                <Text
                                  strong
                                  style={{ color: 'white', fontSize: 11 }}
                                >
                                  {getStatusText(tournament.status)}
                                </Text>
                              }
                              style={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                background: 'rgba(0,0,0,0.3)',
                                padding: '4px 8px',
                                borderRadius: 12,
                              }}
                            />
                          </div>
                        }
                      >
                        <div style={{ marginBottom: 16 }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: 8,
                            }}
                          >
                            <Title
                              level={5}
                              style={{ margin: 0, lineHeight: 1.3 }}
                            >
                              {tournament.name}
                            </Title>
                            <Text
                              type='secondary'
                              style={{ lineHeight: 1.3, fontSize: 16 }}
                            >
                              {tournament.year}
                            </Text>
                          </div>
                        </div>

                        {/* Tournament Tags */}
                        <Space wrap style={{ marginBottom: 16 }}>
                          <Tag
                            color={formatBadge.color}
                            icon={formatBadge.icon}
                            style={{ margin: 0 }}
                          >
                            {formatBadge.text}
                          </Tag>
                          <Tag
                            color={levelBadge.color}
                            icon={levelBadge.icon}
                            style={{ margin: 0 }}
                          >
                            {levelBadge.text}
                          </Tag>
                          <Tag color='cyan' style={{ margin: 0 }}>
                            {tournament.sex}
                          </Tag>
                        </Space>

                        {/* Tournament Stats */}
                        <Space
                          direction='vertical'
                          size={8}
                          style={{ width: '100%' }}
                        >
                          <Space
                            align='center'
                            style={{
                              width: '100%',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Space>
                              <TeamOutlined style={{ color: '#52c41a' }} />
                              <Text type='secondary' style={{ fontSize: 12 }}>
                                Teams
                              </Text>
                            </Space>
                            <Text strong>{tournament.teamCount}</Text>
                          </Space>

                          <Space
                            align='center'
                            style={{
                              width: '100%',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Space>
                              <CalendarOutlined style={{ color: '#1890ff' }} />
                              <Text type='secondary' style={{ fontSize: 12 }}>
                                Tournament
                              </Text>
                            </Space>
                            <Text strong>{tournamentDurationDays} days</Text>
                          </Space>

                          <Space
                            align='center'
                            style={{
                              width: '100%',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Space>
                              <ClockCircleOutlined
                                style={{ color: '#722ed1' }}
                              />
                              <Text type='secondary' style={{ fontSize: 12 }}>
                                Matches
                              </Text>
                            </Space>
                            <Text strong>40 mins</Text>
                          </Space>

                          <Space
                            align='center'
                            style={{
                              width: '100%',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Space>
                              <CalendarOutlined style={{ color: '#fa8c16' }} />
                              <Text type='secondary' style={{ fontSize: 12 }}>
                                Dates
                              </Text>
                            </Space>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 11 }}>
                                {formatDate(tournament.startDate)}
                              </div>
                              <div style={{ fontSize: 11 }}>
                                {formatDate(tournament.endDate)}
                              </div>
                            </div>
                          </Space>
                        </Space>

                        <Divider style={{ margin: '16px 0' }} />

                        {/* Action Button */}
                        <Button
                          type='primary'
                          block
                          icon={<EyeOutlined />}
                          style={{ borderRadius: 6 }}
                        >
                          View Tournament
                        </Button>
                      </Card>
                    </Link>
                  </Col>
                );
              })}
            </Row>

            {/* Pagination */}
            {total > filters.limit && (
              <div style={{ marginTop: 32, textAlign: 'center' }}>
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
                  style={{ display: 'inline-block' }}
                />
              </div>
            )}
          </>
        ) : (
          <Card style={{ borderRadius: 12, textAlign: 'center', padding: 48 }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Title level={4}>No tournaments found</Title>
                  <Text type='secondary'>
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
                style={{ marginTop: 16 }}
              >
                Clear All Filters
              </Button>
            )}
          </Card>
        )}

        {/* Stats Footer */}
        {tournaments.length > 0 && (
          <Card
            style={{
              marginTop: 32,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f6f8ff 0%, #f0f2ff 100%)',
              border: 'none',
            }}
          >
            <Row gutter={[32, 32]}>
              <Col xs={24} md={8}>
                <Statistic
                  title='Total Tournaments'
                  value={total}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col xs={24} md={8}>
                <Statistic
                  title='Active Tournaments'
                  value={
                    tournaments.filter(
                      (t) => t.status === 'ongoing' || t.status === 'open'
                    ).length
                  }
                  prefix={<FireOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col xs={24} md={8}>
                <Statistic
                  title='Total Teams (Page)'
                  value={tournaments.reduce((sum, t) => sum + t.teamCount, 0)}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
            </Row>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PublicTournamentsListPage;
