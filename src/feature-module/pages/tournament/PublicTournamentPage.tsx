// feature-module/pages/tournament/PublicTournamentPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Tabs,
  Tag,
  Space,
  Statistic,
  Avatar,
  Table,
  Progress,
  Divider,
  Badge,
  Dropdown,
  Menu,
  Tooltip,
  Alert,
  List,
  Empty,
  Timeline,
  Collapse,
  Modal,
  message,
  Select,
  Radio,
  Input,
  Spin,
  DatePicker,
} from 'antd';
import {
  TrophyOutlined,
  TeamOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  BellOutlined,
  EyeOutlined,
  FilterOutlined,
  SettingOutlined,
  CrownOutlined,
  FireOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
  ScheduleOutlined,
  ExportOutlined,
  PrinterOutlined,
  CopyOutlined,
  FullscreenOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import AntDesignTournamentHeader from './TournamentHeader';
import AntDesignTournamentBracket from './TournamentBracket';

const { Title, Text, Paragraph } = Typography;

interface Tournament {
  _id: string;
  name: string;
  description: string;
  year: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'open' | 'ongoing' | 'completed';
  levelOfCompetition: string;
  sex: string;
  format: string;
  registeredTeams: any[];
  teamCount: number;
  settings: any;
  maxTeams?: number;
  registrationDeadline?: string;
  minTeams?: number;
  gradeRange?: {
    min: string;
    max: string;
  };
}

interface Match {
  _id: string;
  round: number;
  matchNumber: number;
  team1?: any;
  team2?: any;
  team1Score: number;
  team2Score: number;
  status: string;
  scheduledTime?: string;
  court?: string;
  winner?: string;
  bracketType: string;
  duration?: number;
  positions?: {
    team1Position: number;
    team2Position: number;
  };
  isRescheduled?: boolean;
  sex?: string;
}

interface TeamStanding {
  team: {
    _id: string;
    name: string;
    grade: string;
    levelOfCompetition: string;
  };
  position: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

type SortableKey =
  | 'position'
  | 'matchesPlayed'
  | 'wins'
  | 'draws'
  | 'losses'
  | 'goalsFor'
  | 'goalsAgainst'
  | 'goalDifference'
  | 'points';

interface SortConfig {
  key: SortableKey;
  order: 'asc' | 'desc';
}

const PublicTournamentPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();

  // State
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bracket');
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bracketView, setBracketView] = useState<'classic' | 'modern' | 'grid'>(
    'classic',
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'points',
    order: 'desc',
  });

  // Date filter state
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [dateFilter, setDateFilter] = useState<'day' | 'all'>('day');

  const API_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  // Fetch tournament details
  useEffect(() => {
    const fetchTournamentDetails = async () => {
      if (!tournamentId) {
        setError('No tournament ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const tournamentRes = await axios.get(
          `${API_URL}/tournaments/${tournamentId}/public`,
        );

        let tournamentData: Tournament;
        if (tournamentRes.data.tournament) {
          tournamentData = tournamentRes.data.tournament;
        } else if (tournamentRes.data.data) {
          tournamentData = tournamentRes.data.data;
        } else if (tournamentRes.data._id) {
          tournamentData = tournamentRes.data;
        } else {
          throw new Error('Invalid tournament data format');
        }

        setTournament(tournamentData);

        const teamsWithSex = tournamentData.registeredTeams || [];
        setTeams(teamsWithSex);

        const teamMap = new Map();
        teamsWithSex.forEach((team) => {
          teamMap.set(team._id, team);
        });

        try {
          const matchesRes = await axios.get(
            `${API_URL}/tournaments/${tournamentId}/matches/public`,
          );
          let matchesData: Match[] = [];

          if (matchesRes.data.matches) {
            matchesData = matchesRes.data.matches;
          } else if (matchesRes.data.data) {
            matchesData = matchesRes.data.data;
          } else if (Array.isArray(matchesRes.data)) {
            matchesData = matchesRes.data;
          }

          const enrichedMatches = matchesData.map((match) => {
            const enrichedMatch = { ...match };

            if (
              match.team1 &&
              typeof match.team1 === 'object' &&
              match.team1._id
            ) {
              const team1Data = teamMap.get(match.team1._id);
              if (team1Data) {
                enrichedMatch.team1 = {
                  ...match.team1,
                  sex: team1Data.sex,
                  name: team1Data.name,
                  grade: team1Data.grade,
                  levelOfCompetition: team1Data.levelOfCompetition,
                };
              }
            }

            if (
              match.team2 &&
              typeof match.team2 === 'object' &&
              match.team2._id
            ) {
              const team2Data = teamMap.get(match.team2._id);
              if (team2Data) {
                enrichedMatch.team2 = {
                  ...match.team2,
                  sex: team2Data.sex,
                  name: team2Data.name,
                  grade: team2Data.grade,
                  levelOfCompetition: team2Data.levelOfCompetition,
                };
              }
            }

            if (typeof match.team1 === 'string') {
              const team1Data = teamMap.get(match.team1);
              if (team1Data) {
                enrichedMatch.team1 = {
                  _id: match.team1,
                  name: team1Data.name,
                  grade: team1Data.grade,
                  sex: team1Data.sex,
                  levelOfCompetition: team1Data.levelOfCompetition,
                };
              }
            }

            if (typeof match.team2 === 'string') {
              const team2Data = teamMap.get(match.team2);
              if (team2Data) {
                enrichedMatch.team2 = {
                  _id: match.team2,
                  name: team2Data.name,
                  grade: team2Data.grade,
                  sex: team2Data.sex,
                  levelOfCompetition: team2Data.levelOfCompetition,
                };
              }
            }

            if (enrichedMatch.team1?.sex || enrichedMatch.team2?.sex) {
              if (enrichedMatch.team1?.sex === enrichedMatch.team2?.sex) {
                enrichedMatch.sex = enrichedMatch.team1?.sex;
              } else if (enrichedMatch.team1?.sex && enrichedMatch.team2?.sex) {
                enrichedMatch.sex = 'mixed';
              } else {
                enrichedMatch.sex =
                  enrichedMatch.team1?.sex || enrichedMatch.team2?.sex;
              }
            }

            return enrichedMatch;
          });

          setMatches(enrichedMatches);
        } catch (matchError) {
          console.warn('Could not fetch matches:', matchError);
          setMatches([]);
        }

        try {
          const standingsRes = await axios.get(
            `${API_URL}/tournaments/${tournamentId}/standings/public`,
          );
          let standingsData: TeamStanding[] = [];

          if (standingsRes.data.success && standingsRes.data.standings) {
            standingsData = standingsRes.data.standings;
          } else if (standingsRes.data.data) {
            standingsData = standingsRes.data.data;
          } else if (Array.isArray(standingsRes.data)) {
            standingsData = standingsRes.data;
          }

          setStandings(standingsData);
        } catch (standingsError) {
          console.log('Standings not available:', standingsError);
          setStandings([]);
        }
      } catch (error: any) {
        console.error('Error fetching tournament:', error);
        setError(
          error.response?.data?.message ||
            error.message ||
            'Failed to load tournament. Please try again.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTournamentDetails();
  }, [tournamentId]);

  useEffect(() => {
    if (matches.length > 0) {
      const maxRound = Math.max(...matches.map((match) => match.round));
      setSelectedRound(maxRound);
    }
  }, [matches]);

  const hasRoundMatches = useMemo(() => {
    return matches.some((match) => match.round === selectedRound);
  }, [matches, selectedRound]);

  // Handler functions
  const handleShare = () => {
    if (navigator.share && tournament) {
      navigator.share({
        title: tournament.name,
        text: tournament.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      message.success('Link copied to clipboard!');
    }
  };

  const handleFollow = () => {
    setFollowModalVisible(true);
  };

  const handleConfirmFollow = () => {
    if (email) {
      setIsFollowing(true);
      setFollowModalVisible(false);
      setEmail('');
      message.success(`You're now following ${tournament?.name}!`);
    } else {
      message.warning('Please enter your email address');
    }
  };

  const handleExport = () => {
    setExportModalVisible(true);
  };

  const downloadSchedule = () => {
    if (!tournament) return;

    const scheduleData = {
      tournament: {
        name: tournament.name,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
      },
      matches: matches.map((match) => ({
        round: match.round,
        matchNumber: match.matchNumber,
        team1: match.team1?.name || 'TBD',
        team2: match.team2?.name || 'TBD',
        scheduledTime: match.scheduledTime,
        court: match.court,
      })),
      generatedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(scheduleData, null, 2);
    const dataUri =
      'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute(
      'download',
      `schedule-${tournament.name.replace(/\s+/g, '-')}.json`,
    );
    linkElement.click();

    message.success('Schedule downloaded successfully!');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setFullscreen(false);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    message.success('Tournament link copied!');
  };

  const handleDateChange = (date: dayjs.Dayjs) => {
    setSelectedDate(date);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate =
      direction === 'prev'
        ? selectedDate.subtract(1, 'day')
        : selectedDate.add(1, 'day');
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(dayjs());
  };

  const handleDateFilterChange = (filter: 'day' | 'all') => {
    setDateFilter(filter);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'blue';
      case 'ongoing':
        return 'green';
      case 'completed':
        return 'gold';
      case 'draft':
        return 'default';
      default:
        return 'default';
    }
  };

  const getFormatBadge = (format: string) => {
    switch (format) {
      case 'single-elimination':
        return { color: 'red', text: 'Single Elimination' };
      case 'double-elimination':
        return { color: 'orange', text: 'Double Elimination' };
      case 'round-robin':
        return { color: 'blue', text: 'Round Robin' };
      default:
        return { color: 'default', text: format };
    }
  };

  const tournamentStats = useMemo(() => {
    if (!tournament) return [];

    const matchDurations = matches
      .filter((m) => m.duration !== undefined && m.duration !== null)
      .map((m) => m.duration as number);

    const avgDuration =
      matchDurations.length > 0
        ? Math.round(
            matchDurations.reduce((sum: number, dur: number) => sum + dur, 0) /
              matchDurations.length,
          )
        : 40;

    const durationDays =
      Math.ceil(
        (new Date(tournament.endDate).getTime() -
          new Date(tournament.startDate).getTime()) /
          (1000 * 3600 * 24),
      ) + 1;

    return [
      {
        title: 'Format',
        value: tournament.format.replace('-', ' '),
        icon: <TrophyOutlined />,
        color: '#1890ff',
      },
      {
        title: 'Teams',
        value: `${tournament.teamCount}`,
        icon: <TeamOutlined />,
        color: '#52c41a',
      },
      {
        title: 'Match Duration',
        value: `${avgDuration} mins`,
        icon: <ClockCircleOutlined />,
        color: '#722ed1',
      },
      {
        title: 'Tournament Days',
        value: `${durationDays} days`,
        icon: <CalendarOutlined />,
        color: '#fa8c16',
      },
    ];
  }, [tournament, matches]);

  const sortedStandings = useMemo(() => {
    const sorted = [...standings];

    sorted.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (sortConfig.order === 'desc') {
        return bValue - aValue;
      }
      return aValue - bValue;
    });

    return sorted;
  }, [standings, sortConfig]);

  const filteredMatches = useMemo(() => {
    if (!matches || matches.length === 0) return [];

    if (dateFilter === 'all') {
      return matches;
    }

    return matches.filter((match) => {
      if (!match.scheduledTime) return false;

      try {
        const matchDate = dayjs(match.scheduledTime);
        return matchDate.isSame(selectedDate, 'day');
      } catch (error) {
        return false;
      }
    });
  }, [matches, selectedDate, dateFilter]);

  const availableRounds = useMemo(() => {
    const rounds = new Set<number>();
    matches.forEach((match) => {
      rounds.add(match.round);
    });
    return Array.from(rounds).sort((a, b) => b - a);
  }, [matches]);

  const matchesForSelectedRound = useMemo(() => {
    if (dateFilter === 'all') {
      return matches.filter((match) => match.round === selectedRound);
    } else {
      return matches.filter((match) => {
        if (!match.scheduledTime) return false;

        try {
          const matchDate = dayjs(match.scheduledTime);
          return (
            matchDate.isSame(selectedDate, 'day') &&
            match.round === selectedRound
          );
        } catch (error) {
          return false;
        }
      });
    }
  }, [matches, selectedRound, selectedDate, dateFilter]);

  useEffect(() => {
    if (
      availableRounds.length > 0 &&
      !availableRounds.includes(selectedRound)
    ) {
      setSelectedRound(availableRounds[0]);
    }
  }, [availableRounds, selectedRound]);

  const matchesByDate = useMemo(() => {
    const grouped: Record<string, Match[]> = {};

    matches.forEach((match) => {
      if (!match.scheduledTime) {
        if (!grouped['Unscheduled']) {
          grouped['Unscheduled'] = [];
        }
        grouped['Unscheduled'].push(match);
        return;
      }

      try {
        const matchDate = dayjs(match.scheduledTime);
        const dateKey = matchDate.format('YYYY-MM-DD');

        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(match);
      } catch (error) {
        console.log('Error parsing date for match:', match._id, error);
      }
    });

    return grouped;
  }, [matches]);

  const hasMatchesForSelectedDate = useMemo(() => {
    if (dateFilter === 'all') return true;

    const dateKey = selectedDate.format('YYYY-MM-DD');
    return matchesByDate[dateKey] && matchesByDate[dateKey].length > 0;
  }, [selectedDate, matchesByDate, dateFilter]);

  const standingsColumns = [
    {
      title: 'Pos',
      dataIndex: 'position',
      key: 'position',
      width: 80,
      sorter: (a: TeamStanding, b: TeamStanding) => a.position - b.position,
      render: (position: number) => (
        <Badge
          count={position}
          style={{
            backgroundColor:
              position === 1
                ? '#ffd700'
                : position <= 4
                  ? '#52c41a'
                  : '#d9d9d9',
            color: position <= 4 ? '#fff' : '#000',
          }}
        />
      ),
    },
    {
      title: 'Team',
      dataIndex: 'team',
      key: 'team',
      render: (team: TeamStanding['team']) => (
        <Space>
          <Avatar
            size='small'
            style={{
              background:
                team.levelOfCompetition === 'Gold'
                  ? 'linear-gradient(135deg, #ffd700, #ffaa00)'
                  : 'linear-gradient(135deg, #c0c0c0, #a0a0a0)',
            }}
          >
            {team.name.charAt(0)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>{team.name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>
              Grade {team.grade} • {team.levelOfCompetition}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'P',
      dataIndex: 'matchesPlayed',
      key: 'matchesPlayed',
      width: 60,
      sorter: (a: TeamStanding, b: TeamStanding) =>
        a.matchesPlayed - b.matchesPlayed,
    },
    {
      title: 'W',
      dataIndex: 'wins',
      key: 'wins',
      width: 60,
      sorter: (a: TeamStanding, b: TeamStanding) => a.wins - b.wins,
    },
    {
      title: 'D',
      dataIndex: 'draws',
      key: 'draws',
      width: 60,
      sorter: (a: TeamStanding, b: TeamStanding) => a.draws - b.draws,
    },
    {
      title: 'L',
      dataIndex: 'losses',
      key: 'losses',
      width: 60,
      sorter: (a: TeamStanding, b: TeamStanding) => a.losses - b.losses,
    },
    {
      title: 'GF',
      dataIndex: 'goalsFor',
      key: 'goalsFor',
      width: 60,
      sorter: (a: TeamStanding, b: TeamStanding) => a.goalsFor - b.goalsFor,
    },
    {
      title: 'GA',
      dataIndex: 'goalsAgainst',
      key: 'goalsAgainst',
      width: 60,
      sorter: (a: TeamStanding, b: TeamStanding) =>
        a.goalsAgainst - b.goalsAgainst,
    },
    {
      title: 'GD',
      dataIndex: 'goalDifference',
      key: 'goalDifference',
      width: 80,
      sorter: (a: TeamStanding, b: TeamStanding) =>
        a.goalDifference - b.goalDifference,
      render: (diff: number) => (
        <Text
          style={{
            color: diff > 0 ? '#52c41a' : diff < 0 ? '#f5222d' : '#999',
          }}
        >
          {diff > 0 ? '+' : ''}
          {diff}
        </Text>
      ),
    },
    {
      title: 'PTS',
      dataIndex: 'points',
      key: 'points',
      width: 80,
      sorter: (a: TeamStanding, b: TeamStanding) => a.points - b.points,
      render: (points: number) => (
        <Text strong style={{ fontSize: 16 }}>
          {points}
        </Text>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'bracket',
      label: (
        <Space>
          <TrophyOutlined />
          <span>Bracket</span>
        </Space>
      ),
      children: (
        <div style={{ padding: '24px 0' }}>
          <div className='glass-filter-card' style={{ marginBottom: 24 }}>
            <Row gutter={[16, 16]} align='middle'>
              <Col xs={24} md={12}>
                <Space direction='vertical' style={{ width: '100%' }}>
                  <Text
                    strong
                    style={{
                      fontSize: 14,
                      marginBottom: 4,
                      color: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    Showing matches for:
                  </Text>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <Button
                      icon={<LeftOutlined />}
                      onClick={() => navigateDate('prev')}
                      size='large'
                      disabled={dateFilter === 'all'}
                      className='glass-btn-outline'
                    />
                    <div className='glass-date-display'>
                      <Text strong style={{ fontSize: 16, color: 'white' }}>
                        {dateFilter === 'all'
                          ? 'All Dates'
                          : selectedDate.format('dddd, MMMM D, YYYY')}
                      </Text>
                      {dateFilter === 'day' && (
                        <div>
                          <Text
                            type='secondary'
                            style={{
                              fontSize: 12,
                              color: 'rgba(255,255,255,0.5)',
                            }}
                          >
                            {hasMatchesForSelectedDate
                              ? `${
                                  matchesByDate[
                                    selectedDate.format('YYYY-MM-DD')
                                  ]?.length || 0
                                } matches`
                              : 'No matches scheduled'}
                          </Text>
                        </div>
                      )}
                    </div>
                    <Button
                      icon={<RightOutlined />}
                      onClick={() => navigateDate('next')}
                      size='large'
                      disabled={dateFilter === 'all'}
                      className='glass-btn-outline'
                    />
                  </div>
                </Space>
              </Col>
              <Col xs={24} md={12}>
                <Row gutter={[8, 8]} justify='end'>
                  <Col>
                    <Radio.Group
                      value={dateFilter}
                      onChange={(e) => handleDateFilterChange(e.target.value)}
                      size='large'
                      className='glass-radio-group'
                    >
                      <Radio.Button value='day'>Day View</Radio.Button>
                      <Radio.Button value='all'>All Dates</Radio.Button>
                    </Radio.Group>
                  </Col>
                  <Col>
                    <Button
                      icon={<CalendarOutlined />}
                      onClick={goToToday}
                      size='large'
                      disabled={dateFilter === 'all'}
                      className='glass-btn-outline'
                    >
                      Today
                    </Button>
                  </Col>
                  <Col>
                    <DatePicker
                      value={selectedDate}
                      onChange={(date) => date && handleDateChange(date)}
                      size='large'
                      style={{ width: 180 }}
                      disabled={dateFilter === 'all'}
                      className='glass-datepicker'
                      disabledDate={(current) => {
                        if (dateFilter === 'all') return true;
                        const dateKey = current.format('YYYY-MM-DD');
                        return (
                          !matchesByDate[dateKey] ||
                          matchesByDate[dateKey].length === 0
                        );
                      }}
                    />
                  </Col>
                </Row>
              </Col>
            </Row>
          </div>

          <div style={{ marginBottom: 24 }}>
            <Row gutter={[16, 16]} justify='space-between' align='middle'>
              <Col>
                <Space>
                  <Text strong style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Round:
                  </Text>
                  <Select
                    placeholder='Select Round'
                    value={selectedRound}
                    onChange={setSelectedRound}
                    style={{ width: 180 }}
                    size='middle'
                    disabled={matches.length === 0}
                    className='glass-select'
                  >
                    {availableRounds.map((round) => (
                      <Select.Option key={round} value={round}>
                        <Space>
                          <span>Round {round}</span>
                          {round === availableRounds[0] && (
                            <Tag color='blue' style={{ marginLeft: 4 }}>
                              Latest
                            </Tag>
                          )}
                        </Space>
                      </Select.Option>
                    ))}
                  </Select>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={downloadSchedule}
                    className='glass-btn-outline'
                  >
                    Download Schedule
                  </Button>
                  <Button
                    icon={<FullscreenOutlined />}
                    onClick={toggleFullscreen}
                    className='glass-btn-outline'
                  >
                    Fullscreen
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>

          {matchesForSelectedRound.length > 0 ? (
            <div className='bracket-grid-container'>
              {(() => {
                const roundMatches = matchesForSelectedRound;
                const matchesByDate: Record<string, typeof roundMatches> = {};

                roundMatches.forEach((match) => {
                  let dateKey: string;

                  if (
                    match.scheduledTime !== null &&
                    match.scheduledTime !== undefined &&
                    match.scheduledTime !== 'null' &&
                    match.scheduledTime !== ''
                  ) {
                    try {
                      const scheduledTimeStr = String(
                        match.scheduledTime,
                      ).trim();

                      if (
                        scheduledTimeStr === '' ||
                        scheduledTimeStr === 'null'
                      ) {
                        dateKey = 'Unscheduled';
                      } else {
                        const matchDate = new Date(scheduledTimeStr);
                        if (isNaN(matchDate.getTime())) {
                          dateKey = 'Unscheduled';
                        } else {
                          dateKey = matchDate.toDateString();
                        }
                      }
                    } catch (error) {
                      dateKey = 'Unscheduled';
                    }
                  } else {
                    dateKey = 'Unscheduled';
                  }

                  if (!matchesByDate[dateKey]) {
                    matchesByDate[dateKey] = [];
                  }
                  matchesByDate[dateKey].push(match);
                });

                const sortedDates = Object.keys(matchesByDate).sort((a, b) => {
                  if (a === 'Unscheduled') return 1;
                  if (b === 'Unscheduled') return -1;
                  return new Date(a).getTime() - new Date(b).getTime();
                });

                return (
                  <>
                    {sortedDates.map((dateKey) => {
                      const dateMatches = matchesByDate[dateKey];
                      const matchDate =
                        dateKey === 'Unscheduled' ? null : new Date(dateKey);

                      const matchesByCourt: Record<string, typeof dateMatches> =
                        {};

                      dateMatches.forEach((match) => {
                        const courtKey = match.court || 'Unassigned';
                        if (!matchesByCourt[courtKey]) {
                          matchesByCourt[courtKey] = [];
                        }
                        matchesByCourt[courtKey].push(match);
                      });

                      const sortedCourts = Object.keys(matchesByCourt).sort(
                        (a, b) => {
                          if (a === 'Unassigned') return 1;
                          if (b === 'Unassigned') return -1;
                          const aNum = parseInt(a.replace(/\D/g, '')) || 0;
                          const bNum = parseInt(b.replace(/\D/g, '')) || 0;
                          if (aNum !== bNum) return aNum - bNum;
                          return a.localeCompare(b);
                        },
                      );

                      return (
                        <div key={dateKey} className='date-section'>
                          <div className='date-header'>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Space>
                                {matchDate ? (
                                  <>
                                    <CalendarOutlined
                                      style={{
                                        fontSize: '18px',
                                        color: '#506ee4',
                                      }}
                                    />
                                    <Title
                                      level={4}
                                      style={{ margin: 0, color: 'white' }}
                                    >
                                      {matchDate.toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })}
                                    </Title>
                                    <Tag color='blue'>
                                      {dateMatches.length}{' '}
                                      {dateMatches.length === 1
                                        ? 'match'
                                        : 'matches'}
                                    </Tag>
                                  </>
                                ) : (
                                  <>
                                    <ScheduleOutlined
                                      style={{
                                        fontSize: '18px',
                                        color: '#999',
                                      }}
                                    />
                                    <Title
                                      level={4}
                                      style={{ margin: 0, color: '#999' }}
                                    >
                                      Unscheduled Matches
                                    </Title>
                                    <Tag color='default'>
                                      {dateMatches.length}{' '}
                                      {dateMatches.length === 1
                                        ? 'match'
                                        : 'matches'}
                                    </Tag>
                                  </>
                                )}
                              </Space>
                            </div>
                          </div>

                          <div className='court-columns-layout'>
                            {sortedCourts.map((court) => (
                              <div key={court} className='court-column'>
                                <div className='court-header'>
                                  <Space align='center'>
                                    <EnvironmentOutlined
                                      style={{ color: '#1890ff' }}
                                    />
                                    <Title
                                      level={5}
                                      style={{ margin: 0, color: 'white' }}
                                    >
                                      {court}
                                    </Title>
                                    <Badge
                                      count={matchesByCourt[court].length}
                                      style={{ backgroundColor: '#52c41a' }}
                                    />
                                  </Space>
                                </div>

                                <div className='court-matches'>
                                  {matchesByCourt[court]
                                    .sort((a, b) => {
                                      if (a.scheduledTime && b.scheduledTime) {
                                        return (
                                          new Date(a.scheduledTime).getTime() -
                                          new Date(b.scheduledTime).getTime()
                                        );
                                      }
                                      return a.matchNumber - b.matchNumber;
                                    })
                                    .map((match) => (
                                      <div
                                        key={match._id}
                                        className='court-match-card'
                                      >
                                        <div className='glass-match-card'>
                                          <div className='court-match-content'>
                                            <div className='court-match-header'>
                                              <Space
                                                direction='vertical'
                                                size={2}
                                                style={{ width: '100%' }}
                                              >
                                                <div
                                                  style={{
                                                    display: 'flex',
                                                    justifyContent:
                                                      'space-between',
                                                    alignItems: 'center',
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      gap: '8px',
                                                    }}
                                                  >
                                                    <Text
                                                      strong
                                                      style={{
                                                        fontSize: '12px',
                                                        color:
                                                          'rgba(255,255,255,0.8)',
                                                      }}
                                                    >
                                                      Match #{match.matchNumber}
                                                    </Text>
                                                    {match.sex && (
                                                      <span
                                                        className={`match-sex-badge match-sex-${match.sex.toLowerCase()}`}
                                                      >
                                                        {match.sex}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div
                                                    className={`match-status-badge match-status-${match.status}`}
                                                  >
                                                    {match.status ===
                                                    'in-progress'
                                                      ? 'LIVE'
                                                      : match.status ===
                                                          'completed'
                                                        ? 'FINAL'
                                                        : match.team1 &&
                                                            match.team2
                                                          ? 'READY'
                                                          : 'PENDING'}
                                                  </div>
                                                </div>
                                                {match.scheduledTime && (
                                                  <div
                                                    style={{
                                                      textAlign: 'center',
                                                    }}
                                                  >
                                                    <ClockCircleOutlined
                                                      style={{
                                                        fontSize: '14px',
                                                        marginRight: '4px',
                                                        color:
                                                          'rgba(255,255,255,0.6)',
                                                      }}
                                                    />
                                                    <Text
                                                      style={{
                                                        fontSize: '14px',
                                                        color:
                                                          'rgba(255,255,255,0.8)',
                                                      }}
                                                    >
                                                      {new Date(
                                                        match.scheduledTime,
                                                      ).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                      })}
                                                    </Text>
                                                  </div>
                                                )}
                                              </Space>
                                            </div>

                                            <div className='court-match-teams'>
                                              <div className='court-team-row'>
                                                <div className='court-team-info'>
                                                  <div
                                                    className='court-team-name'
                                                    title={
                                                      match.team1?.name || 'TBD'
                                                    }
                                                  >
                                                    {match.team1?.name || 'TBD'}
                                                  </div>
                                                  <div className='court-team-meta'>
                                                    {match.team1?.grade &&
                                                      `Grade ${match.team1.grade}`}
                                                  </div>
                                                </div>
                                                <div
                                                  className='court-team-score'
                                                  style={{ textAlign: 'right' }}
                                                >
                                                  <Text
                                                    strong
                                                    style={{
                                                      fontSize: '22px',
                                                      color: 'white',
                                                    }}
                                                  >
                                                    {match.team1Score}
                                                  </Text>
                                                </div>
                                              </div>

                                              <Divider
                                                style={{
                                                  margin: '6px 0',
                                                  fontSize: '12px',
                                                  color:
                                                    'rgba(255,255,255,0.4)',
                                                }}
                                              >
                                                VS
                                              </Divider>

                                              <div className='court-team-row'>
                                                <div className='court-team-info'>
                                                  <div
                                                    className='court-team-name'
                                                    title={
                                                      match.team2?.name || 'TBD'
                                                    }
                                                  >
                                                    {match.team2?.name || 'TBD'}
                                                  </div>
                                                  <div className='court-team-meta'>
                                                    {match.team2?.grade &&
                                                      `Grade ${match.team2.grade}`}
                                                  </div>
                                                </div>
                                                <div
                                                  className='court-team-score'
                                                  style={{ textAlign: 'right' }}
                                                >
                                                  <Text
                                                    strong
                                                    style={{
                                                      fontSize: '22px',
                                                      color: 'white',
                                                    }}
                                                  >
                                                    {match.team2Score}
                                                  </Text>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          {matchDate ? (
                            <div className='date-summary'>
                              <Row gutter={[16, 16]}>
                                <Col xs={24} sm={6}>
                                  <Statistic
                                    title={
                                      <span
                                        style={{
                                          color: 'rgba(255,255,255,0.6)',
                                        }}
                                      >
                                        Total Matches
                                      </span>
                                    }
                                    value={dateMatches.length}
                                    prefix={<TeamOutlined />}
                                    valueStyle={{ color: 'white' }}
                                  />
                                </Col>
                                <Col xs={24} sm={6}>
                                  <Statistic
                                    title={
                                      <span
                                        style={{
                                          color: 'rgba(255,255,255,0.6)',
                                        }}
                                      >
                                        Courts Used
                                      </span>
                                    }
                                    value={sortedCourts.length}
                                    prefix={<EnvironmentOutlined />}
                                    valueStyle={{ color: '#1890ff' }}
                                  />
                                </Col>
                                <Col xs={24} sm={6}>
                                  <Statistic
                                    title={
                                      <span
                                        style={{
                                          color: 'rgba(255,255,255,0.6)',
                                        }}
                                      >
                                        Completed
                                      </span>
                                    }
                                    value={
                                      dateMatches.filter(
                                        (m) => m.status === 'completed',
                                      ).length
                                    }
                                    prefix={<CheckCircleOutlined />}
                                    valueStyle={{ color: '#52c41a' }}
                                  />
                                </Col>
                                <Col xs={24} sm={6}>
                                  <Statistic
                                    title={
                                      <span
                                        style={{
                                          color: 'rgba(255,255,255,0.6)',
                                        }}
                                      >
                                        In Progress
                                      </span>
                                    }
                                    value={
                                      dateMatches.filter(
                                        (m) => m.status === 'in-progress',
                                      ).length
                                    }
                                    prefix={<PlayCircleOutlined />}
                                    valueStyle={{ color: '#f5222d' }}
                                  />
                                </Col>
                              </Row>
                            </div>
                          ) : (
                            <div className='date-summary'>
                              <Alert
                                message='Unscheduled Matches'
                                description='These matches are waiting to be scheduled. Times, dates, and courts will be assigned later.'
                                type='info'
                                showIcon
                                className='glass-alert'
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Title level={4} style={{ color: 'white' }}>
                    {dateFilter === 'all'
                      ? `No matches found for Round ${selectedRound}`
                      : `No matches for Round ${selectedRound} on ${selectedDate.format('MMMM D, YYYY')}`}
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {dateFilter === 'all'
                      ? 'Try selecting a different round.'
                      : hasRoundMatches
                        ? `Round ${selectedRound} matches exist on different dates.`
                        : `No Round ${selectedRound} matches in this tournament.`}
                  </Text>
                </div>
              }
            >
              <Space>
                {dateFilter === 'day' && hasRoundMatches && (
                  <Button
                    type='primary'
                    onClick={() => setDateFilter('all')}
                    className='glass-btn-primary'
                  >
                    <CalendarOutlined /> View All Round {selectedRound} Matches
                  </Button>
                )}
                {dateFilter === 'day' && (
                  <Button
                    icon={<CalendarOutlined />}
                    onClick={goToToday}
                    className='glass-btn-outline'
                  >
                    Go to Today
                  </Button>
                )}
                <Button
                  icon={<CalendarOutlined />}
                  onClick={() =>
                    setDateFilter(dateFilter === 'day' ? 'all' : 'day')
                  }
                  className='glass-btn-outline'
                >
                  {dateFilter === 'day' ? 'View All Dates' : 'View by Day'}
                </Button>
              </Space>
            </Empty>
          )}
        </div>
      ),
    },
    {
      key: 'teams',
      label: (
        <Space>
          <TeamOutlined />
          <span>Teams</span>
        </Space>
      ),
      children: (
        <div style={{ padding: '24px 0' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <div className='glass-filter-sidebar'>
                <Title level={5} style={{ color: 'white', marginBottom: 16 }}>
                  Team Filters
                </Title>
                <Space direction='vertical' style={{ width: '100%' }}>
                  <Select
                    placeholder='Filter by Level'
                    style={{ width: '100%' }}
                    allowClear
                    className='glass-select'
                  >
                    <Select.Option value='gold'>Gold</Select.Option>
                    <Select.Option value='silver'>Silver</Select.Option>
                  </Select>
                  <Select
                    placeholder='Filter by Grade'
                    style={{ width: '100%' }}
                    allowClear
                    className='glass-select'
                  >
                    {Array.from(new Set(teams.map((t) => t.grade))).map(
                      (grade) => (
                        <Select.Option key={grade} value={grade}>
                          Grade {grade}
                        </Select.Option>
                      ),
                    )}
                  </Select>
                  <Button
                    type='primary'
                    block
                    icon={<FilterOutlined />}
                    className='glass-btn-primary'
                  >
                    Apply Filters
                  </Button>
                </Space>
              </div>
            </Col>
            <Col xs={24} md={16}>
              {teams.length > 0 ? (
                <List
                  grid={{ gutter: 16, column: 2 }}
                  dataSource={teams}
                  renderItem={(team) => (
                    <List.Item>
                      <div className='glass-team-card'>
                        <Space align='center' style={{ width: '100%' }}>
                          <Avatar
                            size='large'
                            style={{
                              background:
                                team.levelOfCompetition === 'Gold'
                                  ? 'linear-gradient(135deg, #ffd700, #ffaa00)'
                                  : 'linear-gradient(135deg, #c0c0c0, #a0a0a0)',
                            }}
                          >
                            {team.name.charAt(0)}
                          </Avatar>
                          <div style={{ flex: 1 }}>
                            <Title
                              level={5}
                              style={{ margin: 0, color: 'white' }}
                            >
                              {team.name}
                            </Title>
                            <Space size={[4, 4]} wrap style={{ marginTop: 4 }}>
                              <Tag
                                color={
                                  team.levelOfCompetition === 'Gold'
                                    ? 'gold'
                                    : 'default'
                                }
                              >
                                {team.levelOfCompetition}
                              </Tag>
                              <Tag>Grade {team.grade}</Tag>
                              <Tag>{team.sex}</Tag>
                            </Space>
                          </div>
                          <Tooltip title='View Team Details'>
                            <Button
                              type='link'
                              icon={<InfoCircleOutlined />}
                              className='glass-link'
                            />
                          </Tooltip>
                        </Space>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty
                  description={
                    <div>
                      <Title level={4} style={{ color: 'white' }}>
                        No teams registered yet
                      </Title>
                      <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
                        Teams will appear once they register for the tournament.
                      </Text>
                    </div>
                  }
                />
              )}
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'standings',
      label: (
        <Space>
          <BarChartOutlined />
          <span>Standings</span>
        </Space>
      ),
      children: (
        <div style={{ padding: '24px 0' }}>
          {standings.length > 0 ? (
            <Table
              dataSource={sortedStandings}
              columns={standingsColumns}
              rowKey={(record) => record.team._id}
              pagination={{ pageSize: 10 }}
              size='middle'
              className='glass-table'
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Title level={4} style={{ color: 'white' }}>
                    No standings available
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Standings will appear once matches have been played.
                  </Text>
                </div>
              }
            />
          )}
        </div>
      ),
    },
    {
      key: 'schedule',
      label: (
        <Space>
          <ScheduleOutlined />
          <span>Schedule</span>
        </Space>
      ),
      children: (
        <div style={{ padding: '24px 0' }}>
          <div className='glass-filter-card' style={{ marginBottom: 24 }}>
            <Row gutter={[16, 16]} align='middle'>
              <Col xs={24} md={12}>
                <Space direction='vertical' style={{ width: '100%' }}>
                  <Text
                    strong
                    style={{
                      fontSize: 14,
                      marginBottom: 4,
                      color: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    Showing matches for:
                  </Text>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <Button
                      icon={<LeftOutlined />}
                      onClick={() => navigateDate('prev')}
                      size='large'
                      disabled={dateFilter === 'all'}
                      className='glass-btn-outline'
                    />
                    <div className='glass-date-display'>
                      <Text strong style={{ fontSize: 16, color: 'white' }}>
                        {dateFilter === 'all'
                          ? 'All Dates'
                          : selectedDate.format('dddd, MMMM D, YYYY')}
                      </Text>
                    </div>
                    <Button
                      icon={<RightOutlined />}
                      onClick={() => navigateDate('next')}
                      size='large'
                      disabled={dateFilter === 'all'}
                      className='glass-btn-outline'
                    />
                  </div>
                </Space>
              </Col>
              <Col xs={24} md={12}>
                <Row gutter={[8, 8]} justify='end'>
                  <Col>
                    <Radio.Group
                      value={dateFilter}
                      onChange={(e) => handleDateFilterChange(e.target.value)}
                      size='large'
                      className='glass-radio-group'
                    >
                      <Radio.Button value='day'>Day View</Radio.Button>
                      <Radio.Button value='all'>All Dates</Radio.Button>
                    </Radio.Group>
                  </Col>
                  <Col>
                    <Button
                      icon={<CalendarOutlined />}
                      onClick={goToToday}
                      size='large'
                      disabled={dateFilter === 'all'}
                      className='glass-btn-outline'
                    >
                      Today
                    </Button>
                  </Col>
                </Row>
              </Col>
            </Row>
          </div>

          {matchesForSelectedRound.length > 0 ? (
            <Timeline mode='alternate' className='glass-timeline'>
              {matchesForSelectedRound.map((match) => (
                <Timeline.Item
                  key={match._id}
                  color={
                    match.status === 'completed'
                      ? 'green'
                      : match.status === 'in-progress'
                        ? 'red'
                        : 'blue'
                  }
                  dot={
                    match.status === 'in-progress' ? (
                      <PlayCircleOutlined style={{ fontSize: '16px' }} />
                    ) : match.status === 'completed' ? (
                      <CheckCircleOutlined style={{ fontSize: '16px' }} />
                    ) : (
                      <ClockCircleOutlined style={{ fontSize: '16px' }} />
                    )
                  }
                >
                  <div className='glass-timeline-card'>
                    <Row gutter={[16, 8]}>
                      <Col span={24}>
                        <Space align='center'>
                          <Tag color='blue'>Round {match.round}</Tag>
                          <Text strong style={{ color: 'white' }}>
                            Match #{match.matchNumber}
                          </Text>
                          {match.court && (
                            <Tag color='green'>Court {match.court}</Tag>
                          )}
                          {match.duration && (
                            <Tag color='purple'>{match.duration} mins</Tag>
                          )}
                        </Space>
                      </Col>
                      <Col span={24}>
                        <Row gutter={16} align='middle'>
                          <Col span={10} style={{ textAlign: 'right' }}>
                            <Space direction='vertical' size={0}>
                              <Text
                                strong
                                style={{ fontSize: '16px', color: 'white' }}
                              >
                                {match.team1?.name || 'TBD'}
                              </Text>
                            </Space>
                          </Col>
                          <Col span={4} style={{ textAlign: 'center' }}>
                            <Title
                              level={3}
                              style={{ margin: 0, color: '#fbbf24' }}
                            >
                              {match.team1Score} - {match.team2Score}
                            </Title>
                          </Col>
                          <Col span={10} style={{ textAlign: 'left' }}>
                            <Space direction='vertical' size={0}>
                              <Text
                                strong
                                style={{ fontSize: '16px', color: 'white' }}
                              >
                                {match.team2?.name || 'TBD'}
                              </Text>
                            </Space>
                          </Col>
                        </Row>
                      </Col>
                      <Col span={24}>
                        <Divider style={{ margin: '8px 0' }} />
                        <Space wrap>
                          {match.scheduledTime && (
                            <Space>
                              <ClockCircleOutlined
                                style={{ color: 'rgba(255,255,255,0.6)' }}
                              />
                              <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
                                {new Date(match.scheduledTime).toLocaleString(
                                  [],
                                  {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  },
                                )}
                              </Text>
                            </Space>
                          )}
                          {match.duration !== undefined &&
                            match.duration !== null && (
                              <Space>
                                <ClockCircleOutlined
                                  style={{ color: 'rgba(255,255,255,0.6)' }}
                                />
                                <Text
                                  style={{ color: 'rgba(255,255,255,0.6)' }}
                                >
                                  Duration: {match.duration} minutes
                                </Text>
                              </Space>
                            )}
                        </Space>
                      </Col>
                    </Row>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Title level={4} style={{ color: 'white' }}>
                    {dateFilter === 'all'
                      ? `No matches found for Round ${selectedRound}`
                      : `No matches for Round ${selectedRound} on ${selectedDate.format('MMMM D, YYYY')}`}
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {dateFilter === 'all'
                      ? 'Try selecting a different round.'
                      : hasRoundMatches
                        ? `Round ${selectedRound} matches exist on different dates.`
                        : `No Round ${selectedRound} matches in this tournament.`}
                  </Text>
                </div>
              }
            >
              <Space>
                {dateFilter === 'day' && hasRoundMatches && (
                  <Button
                    type='primary'
                    onClick={() => setDateFilter('all')}
                    className='glass-btn-primary'
                  >
                    <CalendarOutlined /> View All Round {selectedRound} Matches
                  </Button>
                )}
                {dateFilter === 'day' && (
                  <Button
                    icon={<CalendarOutlined />}
                    onClick={goToToday}
                    className='glass-btn-outline'
                  >
                    Go to Today
                  </Button>
                )}
                <Button
                  icon={<CalendarOutlined />}
                  onClick={() =>
                    setDateFilter(dateFilter === 'day' ? 'all' : 'day')
                  }
                  className='glass-btn-outline'
                >
                  {dateFilter === 'day' ? 'View All Dates' : 'View by Day'}
                </Button>
              </Space>
            </Empty>
          )}
        </div>
      ),
    },
  ];

  // Loading state
  if (loading) {
    return (
      <div className='tournament-public-root'>
        <div className='tournament-bg' />
        <div className='tournament-orb tournament-orb-1' />
        <div className='tournament-orb tournament-orb-2' />
        <div className='tournament-orb tournament-orb-3' />
        <div className='tournament-loading'>
          <div className='glass-card-loading'>
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
              size='large'
            />
            <Title
              level={4}
              style={{ marginTop: 24, marginBottom: 8, color: 'white' }}
            >
              Loading Tournament
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
              Please wait while we fetch tournament details...
            </Text>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className='tournament-public-root'>
        <div className='tournament-bg' />
        <div className='tournament-orb tournament-orb-1' />
        <div className='tournament-orb tournament-orb-2' />
        <div className='tournament-orb tournament-orb-3' />
        <div className='tournament-loading'>
          <div className='glass-card-error'>
            <Alert
              message='Error Loading Tournament'
              description={error}
              type='error'
              showIcon
              className='glass-alert'
            />
            <Button
              type='primary'
              onClick={() => navigate('/tournaments')}
              className='glass-btn-primary'
              style={{ marginTop: 16 }}
            >
              Browse Tournaments
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No tournament state
  if (!tournament) {
    return (
      <div className='tournament-public-root'>
        <div className='tournament-bg' />
        <div className='tournament-orb tournament-orb-1' />
        <div className='tournament-orb tournament-orb-2' />
        <div className='tournament-orb tournament-orb-3' />
        <div className='tournament-loading'>
          <div className='glass-card-empty'>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Title level={4} style={{ color: 'white' }}>
                    Tournament not found
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
                    The tournament you're looking for doesn't exist or has been
                    removed.
                  </Text>
                </div>
              }
            />
            <Button
              type='primary'
              onClick={() => navigate('/tournaments')}
              className='glass-btn-primary'
              style={{ marginTop: 16 }}
            >
              Browse Tournaments
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const formatBadge = getFormatBadge(tournament.format);

  return (
    <div className='tournament-public-root'>
      <div className='tournament-bg' />
      <div className='tournament-orb tournament-orb-1' />
      <div className='tournament-orb tournament-orb-2' />
      <div className='tournament-orb tournament-orb-3' />

      <div className='tournament-public-wrap'>
        {/* Tournament Header */}
        <AntDesignTournamentHeader
          tournament={tournament}
          onShare={handleShare}
          onFollow={handleFollow}
          onDownload={downloadSchedule}
          onPrint={handlePrint}
          onExport={handleExport}
          onFullscreen={toggleFullscreen}
          onCopyLink={handleCopyLink}
        />

        {/* Stats Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {tournamentStats.map((stat, index) => (
            <Col xs={24} sm={12} md={6} key={index}>
              <div className='glass-stat-card'>
                <div
                  className='glass-stat-icon'
                  style={{
                    backgroundColor: stat.color + '20',
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </div>
                <div className='glass-stat-content'>
                  <div className='glass-stat-label'>{stat.title}</div>
                  <div className='glass-stat-value'>{stat.value}</div>
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {/* Main Content Tabs */}
        <div className='glass-card-tabs'>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            tabBarExtraContent={
              <Space>
                <Tooltip title='Export Data'>
                  <Button
                    icon={<ExportOutlined />}
                    onClick={handleExport}
                    className='glass-btn-outline'
                  >
                    Export
                  </Button>
                </Tooltip>
              </Space>
            }
            className='glass-tabs'
          />
        </div>

        {/* Follow Modal */}
        <Modal
          title='Follow Tournament'
          open={followModalVisible}
          onCancel={() => setFollowModalVisible(false)}
          onOk={handleConfirmFollow}
          okText='Follow Tournament'
          className='glass-modal'
          wrapClassName='glass-modal-wrap'
        >
          <div className='glass-modal-content'>
            <Alert
              message='Stay Updated'
              description='Get notified about match results, schedule changes, and important announcements.'
              type='info'
              showIcon
              className='glass-alert'
            />
            <Input
              placeholder='Enter your email address'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              size='large'
              className='glass-input'
            />
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              You can unsubscribe at any time. We'll only send
              tournament-related updates.
            </Text>
          </div>
        </Modal>

        {/* Export Modal */}
        <Modal
          title='Export Tournament Data'
          open={exportModalVisible}
          onCancel={() => setExportModalVisible(false)}
          className='glass-modal'
          footer={[
            <Button
              key='cancel'
              onClick={() => setExportModalVisible(false)}
              className='glass-btn-secondary'
            >
              Cancel
            </Button>,
            <Button
              key='json'
              type='primary'
              onClick={() => {
                if (!tournament) return;
                const data = {
                  tournament,
                  matches,
                  teams,
                  standings,
                  exportedAt: new Date().toISOString(),
                };
                const dataStr = JSON.stringify(data, null, 2);
                const dataUri =
                  'data:application/json;charset=utf-8,' +
                  encodeURIComponent(dataStr);
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute(
                  'download',
                  `tournament-${tournament.name.replace(/\s+/g, '-')}-export.json`,
                );
                linkElement.click();
                message.success('Data exported successfully!');
                setExportModalVisible(false);
              }}
              className='glass-btn-primary'
            >
              Export as JSON
            </Button>,
            <Button
              key='csv'
              type='primary'
              onClick={() => {
                message.info('CSV export coming soon!');
              }}
              className='glass-btn-primary'
            >
              Export as CSV
            </Button>,
          ]}
        >
          <div className='glass-modal-content'>
            <Alert
              message='Export Options'
              description='Choose the format and data you want to export from this tournament.'
              type='info'
              showIcon
              className='glass-alert'
            />
            <Radio.Group defaultValue='all' className='glass-radio-group'>
              <Space direction='vertical'>
                <Radio value='all'>All tournament data</Radio>
                <Radio value='bracket'>Bracket matches only</Radio>
                <Radio value='teams'>Team information only</Radio>
                <Radio value='standings'>Standings only</Radio>
              </Space>
            </Radio.Group>
          </div>
        </Modal>
      </div>

      <style>{`
        /* ── Root & Background ──────────────────────────────────── */
        .tournament-public-root {
          min-height: 100vh;
          background: #0a0a0a;
          position: relative;
          overflow-x: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        .tournament-bg {
          position: fixed; inset: 0;
          background:
            radial-gradient(circle at 15% 40%, rgba(80,110,228,.15) 0%, transparent 55%),
            radial-gradient(circle at 85% 70%, rgba(120,140,255,.1) 0%, transparent 55%);
          pointer-events: none; z-index: 0;
        }

        .tournament-orb {
          position: fixed; border-radius: 50%;
          filter: blur(90px); pointer-events: none;
          animation: orbFloat 22s ease-in-out infinite; z-index: 0;
        }
        .tournament-orb-1 { width:420px; height:420px; background:rgba(80,110,228,.15); top:-120px; left:-120px; animation-delay:0s; }
        .tournament-orb-2 { width:520px; height:520px; background:rgba(120,140,255,.1); bottom:-160px; right:-160px; animation-delay:6s; }
        .tournament-orb-3 { width:320px; height:320px; background:rgba(80,110,228,.1); top:45%; left:42%; animation-delay:12s; }

        @keyframes orbFloat {
          0%,100% { transform: translate(0,0) rotate(0deg); }
          33% { transform: translate(28px,-28px) rotate(120deg); }
          66% { transform: translate(-18px,18px) rotate(240deg); }
        }

        /* ── Wrapper ──────────────────────────────────────────── */
        .tournament-public-wrap {
          position: relative; z-index: 1;
          max-width: 1400px; margin: 0 auto;
          padding: 80px 24px 100px;
        }

        /* ── Loading & Error States ───────────────────────────── */
        .tournament-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .glass-card-loading,
        .glass-card-error,
        .glass-card-empty {
          background: rgba(15, 15, 15, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 32px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 48px;
          text-align: center;
          max-width: 500px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        /* ── Glass Stat Cards ──────────────────────────────────── */
        .glass-stat-card {
          background: rgba(15, 15, 15, 0.85);
          backdrop-filter: blur(16px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.3s ease;
        }

        .glass-stat-card:hover {
          transform: translateY(-4px);
          border-color: rgba(80, 110, 228, 0.3);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        }

        .glass-stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .glass-stat-content {
          flex: 1;
        }

        .glass-stat-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.5);
        }

        .glass-stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: white;
          line-height: 1.2;
        }

        /* ── Glass Tabs Card ───────────────────────────────────── */
        .glass-card-tabs {
          background: rgba(15, 15, 15, 0.85);
          backdrop-filter: blur(20px);
          border-radius: 32px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .glass-card-tabs:hover {
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
        }

        /* Tabs styling */
        .glass-tabs .ant-tabs-nav {
          background: rgba(0, 0, 0, 0.3);
          margin: 0;
          padding: 0 24px;
        }

        .glass-tabs .ant-tabs-tab {
          color: rgba(255, 255, 255, 0.6);
          padding: 16px 20px;
        }

        .glass-tabs .ant-tabs-tab-active {
          color: #506ee4;
        }

        .glass-tabs .ant-tabs-tab:hover {
          color: #506ee4;
        }

        .glass-tabs .ant-tabs-ink-bar {
          background: linear-gradient(90deg, #506ee4, #7a94ff);
          height: 3px;
          border-radius: 3px;
        }

        .glass-tabs .ant-tabs-content-holder {
          padding: 24px;
        }

        /* ── Glass Filter Card ──────────────────────────────────── */
        .glass-filter-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 20px;
        }

        .glass-filter-sidebar {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 20px;
        }

        .glass-date-display {
          flex: 1;
          text-align: center;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* ── Glass Table ───────────────────────────────────────── */
        .glass-table .ant-table {
          background: transparent;
          color: rgba(255, 255, 255, 0.85);
        }

        .glass-table .ant-table-thead > tr > th {
          background: rgba(80, 110, 228, 0.1);
          color: white;
          font-weight: 600;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .glass-table .ant-table-tbody > tr > td {
          background: transparent;
          color: rgba(255, 255, 255, 0.8);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .glass-table .ant-table-tbody > tr:hover > td {
          background: rgba(80, 110, 228, 0.05);
        }

        /* ── Glass Team Card ───────────────────────────────────── */
        .glass-team-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 16px;
          transition: all 0.3s ease;
        }

        .glass-team-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(80, 110, 228, 0.3);
          transform: translateY(-4px);
        }

        /* ── Glass Match Card ───────────────────────────────────── */
        .glass-match-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
          transition: all 0.3s ease;
        }

        .glass-match-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(80, 110, 228, 0.3);
        }

        /* ── Glass Timeline ─────────────────────────────────────── */
        .glass-timeline .ant-timeline-item-content {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 4px;
        }

        .glass-timeline .ant-timeline-item-tail {
          border-left-color: rgba(255, 255, 255, 0.1);
        }

        .glass-timeline-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 16px;
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

        .glass-btn-primary {
          background: linear-gradient(135deg, #506ee4, #3f5cd6);
          border: none;
          color: white;
        }

        .glass-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(80, 110, 228, 0.4);
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

        /* ── Glass Input ────────────────────────────────────────── */
        .glass-input {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          color: white;
          margin: 16px 0;
        }

        .glass-input:focus,
        .glass-input:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: #506ee4;
        }

        .glass-input input {
          background: transparent;
          color: white;
        }

        .glass-input input::placeholder {
          color: rgba(255, 255, 255, 0.4);
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

        .glass-datepicker .ant-picker-input input {
          color: white;
        }

        .glass-datepicker .ant-picker-suffix {
          color: rgba(255, 255, 255, 0.5);
        }

        /* ── Glass Radio Group ──────────────────────────────────── */
        .glass-radio-group .ant-radio-wrapper {
          color: rgba(255, 255, 255, 0.85);
        }

        .glass-radio-group .ant-radio-inner {
          background-color: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .glass-radio-group .ant-radio-checked .ant-radio-inner {
          background-color: #506ee4;
          border-color: #506ee4;
        }

        .glass-radio-group .ant-radio-button-wrapper {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.7);
        }

        .glass-radio-group .ant-radio-button-wrapper-checked {
          background: #506ee4;
          border-color: #506ee4;
          color: white;
        }

        /* ── Glass Alert ────────────────────────────────────────── */
        .glass-alert {
          background: rgba(80, 110, 228, 0.1);
          border: 1px solid rgba(80, 110, 228, 0.2);
          border-radius: 16px;
          margin-bottom: 16px;
        }

        .glass-alert .ant-alert-message,
        .glass-alert .ant-alert-description {
          color: rgba(255, 255, 255, 0.85);
        }

        /* ── Glass Modal ────────────────────────────────────────── */
        .glass-modal .ant-modal-content {
          background: rgba(10, 10, 10, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 32px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .glass-modal .ant-modal-header {
          background: transparent;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .glass-modal .ant-modal-title {
          color: white;
          font-weight: 700;
        }

        .glass-modal .ant-modal-close {
          color: rgba(255, 255, 255, 0.6);
        }

        .glass-modal .ant-modal-close:hover {
          color: white;
        }

        .glass-modal .ant-modal-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .glass-modal-content {
          padding: 8px 0;
        }

        /* ── Glass Pagination ───────────────────────────────────── */
        .glass-tabs .ant-pagination-item {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .glass-tabs .ant-pagination-item a {
          color: rgba(255, 255, 255, 0.7);
        }

        .glass-tabs .ant-pagination-item-active {
          background: #506ee4;
          border-color: #506ee4;
        }

        .glass-tabs .ant-pagination-item-active a {
          color: white;
        }

        .glass-tabs .ant-pagination-prev button,
        .glass-tabs .ant-pagination-next button {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.7);
        }

        /* ── Match Status Badges ──────────────────────────────────── */
        .match-status-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          color: #fff;
        }

        .match-status-completed {
          background-color: #52c41a;
        }

        .match-status-in-progress {
          background-color: #f5222d;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .match-status-ready {
          background-color: #1890ff;
        }

        .match-status-pending {
          background-color: #faad14;
        }

        .match-sex-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
        }

        .match-sex-male {
          background-color: #1890ff20;
          color: #1890ff;
          border: 1px solid #1890ff40;
        }

        .match-sex-female {
          background-color: #eb2f9620;
          color: #eb2f96;
          border: 1px solid #eb2f9640;
        }

        .match-sex-mixed {
          background-color: #722ed120;
          color: #722ed1;
          border: 1px solid #722ed140;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        /* ── Court Layout ───────────────────────────────────────── */
        .court-columns-layout {
          display: flex;
          gap: 24px;
          overflow-x: auto;
          padding: 8px 0;
        }

        .court-column {
          flex: 1;
          min-width: 320px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          padding: 16px;
        }

        .court-header {
          padding: 12px;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .court-matches {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .court-match-card {
          width: 100%;
        }

        .court-match-content {
          width: 100%;
        }

        .court-match-header {
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .court-match-teams {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .court-team-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .court-team-info {
          flex: 1;
        }

        .court-team-name {
          font-weight: 600;
          font-size: 14px;
          color: white;
        }

        .court-team-meta {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }

        .court-team-score {
          font-weight: 700;
          font-size: 18px;
          color: white;
        }

        .date-section {
          margin-bottom: 48px;
        }

        .date-header {
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 2px solid rgba(80, 110, 228, 0.3);
        }

        .date-summary {
          margin-top: 24px;
          margin-bottom: 48px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
        }

        /* ── Glass Link ─────────────────────────────────────────── */
        .glass-link {
          color: #506ee4;
        }

        .glass-link:hover {
          color: #7a94ff;
        }

        /* ── Responsive ───────────────────────────────────────── */
        @media (max-width: 768px) {
          .tournament-public-wrap {
            padding: 60px 16px 80px;
          }

          .glass-stat-card {
            padding: 12px 16px;
          }

          .glass-stat-value {
            font-size: 1.2rem;
          }

          .glass-tabs .ant-tabs-nav {
            padding: 0 12px;
          }

          .glass-tabs .ant-tabs-tab {
            padding: 12px 12px;
          }

          .glass-tabs .ant-tabs-content-holder {
            padding: 16px;
          }

          .court-columns-layout {
            flex-direction: column;
          }

          .court-column {
            min-width: auto;
          }
        }

        @media (max-width: 480px) {
          .glass-tabs .ant-tabs-tab {
            padding: 8px 8px;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .tournament-orb,
          .glass-stat-card,
          .glass-card-tabs,
          .glass-team-card,
          .glass-match-card {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </div>
  );
};

export default PublicTournamentPage;
