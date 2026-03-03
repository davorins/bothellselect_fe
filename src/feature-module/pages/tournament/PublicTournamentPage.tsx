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

// Define sortable keys as a type
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
    'classic'
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

        // Fetch tournament data
        const tournamentRes = await axios.get(
          `${API_URL}/tournaments/${tournamentId}/public`
        );

        // Handle different API response formats
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

        // Store teams with their sex information
        const teamsWithSex = tournamentData.registeredTeams || [];
        setTeams(teamsWithSex);

        // Create a map of team IDs to team data (including sex)
        const teamMap = new Map();
        teamsWithSex.forEach((team) => {
          teamMap.set(team._id, team);
        });

        // Fetch matches - USE PUBLIC ENDPOINT
        try {
          const matchesRes = await axios.get(
            `${API_URL}/tournaments/${tournamentId}/matches/public`
          );
          let matchesData: Match[] = [];

          if (matchesRes.data.matches) {
            matchesData = matchesRes.data.matches;
          } else if (matchesRes.data.data) {
            matchesData = matchesRes.data.data;
          } else if (Array.isArray(matchesRes.data)) {
            matchesData = matchesRes.data;
          }

          // Enrich match data with team sex information
          const enrichedMatches = matchesData.map((match) => {
            const enrichedMatch = { ...match };

            // If team1 is an object with _id, enrich it with sex
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

            // If team2 is an object with _id, enrich it with sex
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

            // If team1 is just an ObjectId string, create a basic team object
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

            // If team2 is just an ObjectId string, create a basic team object
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

            // Add a match-level sex field based on team sexes
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

        // Fetch standings - USE PUBLIC ENDPOINT
        try {
          const standingsRes = await axios.get(
            `${API_URL}/tournaments/${tournamentId}/standings/public`
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
            'Failed to load tournament. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTournamentDetails();
  }, [tournamentId]);

  // Set selectedRound to the highest round when matches are loaded
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
      `schedule-${tournament.name.replace(/\s+/g, '-')}.json`
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

  // Date filter functions
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

  // Helper functions
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

  // Memoized values
  const tournamentStats = useMemo(() => {
    if (!tournament) return [];

    // Calculate average match duration from matches
    const matchDurations = matches
      .filter((m) => m.duration !== undefined && m.duration !== null)
      .map((m) => m.duration as number);

    const avgDuration =
      matchDurations.length > 0
        ? Math.round(
            matchDurations.reduce((sum: number, dur: number) => sum + dur, 0) /
              matchDurations.length
          )
        : 40; // Default to 40 minutes if no durations available

    // Tournament duration in days
    const durationDays =
      Math.ceil(
        (new Date(tournament.endDate).getTime() -
          new Date(tournament.startDate).getTime()) /
          (1000 * 3600 * 24)
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

  // Filter matches by selected date
  const filteredMatches = useMemo(() => {
    if (!matches || matches.length === 0) return [];

    if (dateFilter === 'all') {
      return matches;
    }

    // Filter for selected day
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
      // If viewing all dates, show all matches for the selected round
      return matches.filter((match) => match.round === selectedRound);
    } else {
      // If viewing specific date, filter by both date AND round
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

  // Keep selectedRound updated when filteredMatches changes
  useEffect(() => {
    if (
      availableRounds.length > 0 &&
      !availableRounds.includes(selectedRound)
    ) {
      // If current selectedRound is not in availableRounds, set to the first (highest) round
      setSelectedRound(availableRounds[0]);
    }
  }, [availableRounds, selectedRound]);

  // Group matches by date for the date filter display
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

  // Get dates with matches for the date picker
  const datesWithMatches = useMemo(() => {
    return Object.keys(matchesByDate)
      .filter((key) => key !== 'Unscheduled')
      .map((dateStr) => dayjs(dateStr));
  }, [matchesByDate]);

  // Check if selected date has matches
  const hasMatchesForSelectedDate = useMemo(() => {
    if (dateFilter === 'all') return true;

    const dateKey = selectedDate.format('YYYY-MM-DD');
    return matchesByDate[dateKey] && matchesByDate[dateKey].length > 0;
  }, [selectedDate, matchesByDate, dateFilter]);

  // Table columns
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

  // Tab items configuration (FIXED for Ant Design v5)
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
          {/* Date Filter Section */}
          <Card
            style={{
              marginBottom: 24,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #f6f8ff 0%, #f0f2ff 100%)',
            }}
          >
            <Row gutter={[16, 16]} align='middle'>
              <Col xs={24} md={12}>
                <Space direction='vertical' style={{ width: '100%' }}>
                  <Text strong style={{ fontSize: 14, marginBottom: 4 }}>
                    Showing matches for:
                  </Text>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <Button
                      icon={<LeftOutlined />}
                      onClick={() => navigateDate('prev')}
                      size='large'
                      style={{ minWidth: 40 }}
                      disabled={dateFilter === 'all'}
                    />
                    <div
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '8px 16px',
                        background: '#fafafa',
                        borderRadius: 6,
                        border: '1px solid #d9d9d9',
                      }}
                    >
                      <Text strong style={{ fontSize: 16 }}>
                        {dateFilter === 'all'
                          ? 'All Dates'
                          : selectedDate.format('dddd, MMMM D, YYYY')}
                      </Text>
                      {dateFilter === 'day' && (
                        <div>
                          <Text type='secondary' style={{ fontSize: 12 }}>
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
                      style={{ minWidth: 40 }}
                      disabled={dateFilter === 'all'}
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
                      style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
                    >
                      <Radio.Button value='day'>
                        <CalendarOutlined /> Day View
                      </Radio.Button>
                      <Radio.Button value='all'>All Dates</Radio.Button>
                    </Radio.Group>
                  </Col>
                  <Col>
                    <Button
                      icon={<CalendarOutlined />}
                      onClick={goToToday}
                      size='large'
                      disabled={dateFilter === 'all'}
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
                      disabledDate={(current) => {
                        // Only disable dates that don't have matches
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
          </Card>

          <div style={{ marginBottom: 24 }}>
            <Row gutter={[16, 16]} justify='space-between' align='middle'>
              <Col>
                <Space>
                  <Text strong>Round:</Text>
                  <Select
                    placeholder='Select Round'
                    value={selectedRound}
                    onChange={setSelectedRound}
                    style={{ width: 180 }}
                    size='middle'
                    disabled={matches.length === 0} // Changed from filteredMatches to matches
                  >
                    {availableRounds.map((round) => (
                      <Select.Option key={round} value={round}>
                        <Space>
                          <span>Round {round}</span>
                          {round === availableRounds[0] && (
                            <Tag
                              color='blue'
                              style={{
                                marginLeft: 4,
                                fontSize: 10,
                                padding: '0 4px',
                                lineHeight: '16px',
                              }}
                            >
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
                  >
                    Download Schedule
                  </Button>
                  <Button
                    icon={<FullscreenOutlined />}
                    onClick={toggleFullscreen}
                  >
                    Fullscreen
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>

          {matchesForSelectedRound.length > 0 ? ( // Changed from filteredMatches to matchesForSelectedRound
            <div className='bracket-grid-container'>
              {/* Get matches for selected round - use matchesForSelectedRound */}
              {(() => {
                const roundMatches = matchesForSelectedRound; // Changed from filteredMatches.filter

                // Group matches by date
                const matchesByDate: Record<string, typeof roundMatches> = {};

                roundMatches.forEach((match) => {
                  let dateKey: string;

                  // Check if scheduledTime exists and is a valid date string
                  if (
                    match.scheduledTime !== null &&
                    match.scheduledTime !== undefined &&
                    match.scheduledTime !== 'null' &&
                    match.scheduledTime !== ''
                  ) {
                    try {
                      // Convert to string and trim if it's a string
                      const scheduledTimeStr = String(
                        match.scheduledTime
                      ).trim();

                      if (
                        scheduledTimeStr === '' ||
                        scheduledTimeStr === 'null'
                      ) {
                        dateKey = 'Unscheduled';
                      } else {
                        const matchDate = new Date(scheduledTimeStr);

                        // Check if it's a valid date
                        if (isNaN(matchDate.getTime())) {
                          dateKey = 'Unscheduled';
                        } else {
                          dateKey = matchDate.toDateString();
                        }
                      }
                    } catch (error) {
                      console.log('Error parsing date:', error);
                      dateKey = 'Unscheduled';
                    }
                  } else {
                    // Use a special key for unscheduled matches
                    dateKey = 'Unscheduled';
                  }

                  if (!matchesByDate[dateKey]) {
                    matchesByDate[dateKey] = [];
                  }
                  matchesByDate[dateKey].push(match);
                });

                // Sort dates chronologically
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

                      // Group matches by court for this date
                      const matchesByCourt: Record<string, typeof dateMatches> =
                        {};

                      dateMatches.forEach((match) => {
                        const courtKey = match.court || 'Unassigned';
                        if (!matchesByCourt[courtKey]) {
                          matchesByCourt[courtKey] = [];
                        }
                        matchesByCourt[courtKey].push(match);
                      });

                      // Sort courts alphabetically or by number
                      const sortedCourts = Object.keys(matchesByCourt).sort(
                        (a, b) => {
                          if (a === 'Unassigned') return 1;
                          if (b === 'Unassigned') return -1;

                          // Extract numbers from court names for better sorting
                          const aNum = parseInt(a.replace(/\D/g, '')) || 0;
                          const bNum = parseInt(b.replace(/\D/g, '')) || 0;
                          if (aNum !== bNum) return aNum - bNum;
                          return a.localeCompare(b);
                        }
                      );

                      return (
                        <div key={dateKey} className='date-section'>
                          {/* Date Header */}
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
                                        color: '#594230',
                                      }}
                                    />
                                    <Title level={4} style={{ margin: 0 }}>
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

                            {/* Court Summary */}
                            {matchDate && sortedCourts.length > 1 && (
                              <div
                                style={{
                                  marginTop: '12px',
                                  marginBottom: '20px',
                                }}
                              >
                                <Space wrap>
                                  <Text type='secondary'>Courts:</Text>
                                  {sortedCourts.map((court) => (
                                    <Tag key={court} color='cyan'>
                                      {court} ({matchesByCourt[court].length})
                                    </Tag>
                                  ))}
                                </Space>
                              </div>
                            )}
                          </div>

                          {/* Court Columns Layout */}
                          <div className='court-columns-layout'>
                            {sortedCourts.map((court) => (
                              <div key={court} className='court-column'>
                                {/* Court Header */}
                                <div className='court-header ms-2'>
                                  <Space align='center'>
                                    <EnvironmentOutlined
                                      style={{ color: '#1890ff' }}
                                    />
                                    <Title level={5} style={{ margin: 0 }}>
                                      {court}
                                    </Title>
                                    <Badge
                                      count={matchesByCourt[court].length}
                                      style={{ backgroundColor: '#52c41a' }}
                                    />
                                  </Space>
                                </div>

                                {/* Matches for this Court */}
                                <div className='court-matches'>
                                  {matchesByCourt[court]
                                    .sort((a, b) => {
                                      // Sort by scheduled time if available, then by match number
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
                                        <Card
                                          size='small'
                                          style={{
                                            borderLeft: `4px solid ${
                                              match.status === 'completed'
                                                ? '#52c41a'
                                                : match.status === 'in-progress'
                                                ? '#f5222d'
                                                : match.team1 && match.team2
                                                ? '#1890ff'
                                                : '#d9d9d9'
                                            }`,
                                          }}
                                          className='mb-4'
                                        >
                                          <div className='court-match-content'>
                                            {/* Match Number and Status */}
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
                                                      }}
                                                    >
                                                      Match #{match.matchNumber}
                                                    </Text>
                                                    {match.sex && (
                                                      <span
                                                        style={{
                                                          display:
                                                            'inline-flex',
                                                          alignItems: 'center',
                                                          padding: '2px 8px',
                                                          borderRadius: '4px',
                                                          fontSize: '10px',
                                                          fontWeight: 'bold',
                                                          backgroundColor:
                                                            match.sex.toLowerCase() ===
                                                            'male'
                                                              ? '#1890ff20'
                                                              : match.sex.toLowerCase() ===
                                                                'female'
                                                              ? '#eb2f9620'
                                                              : '#722ed120',
                                                          color:
                                                            match.sex.toLowerCase() ===
                                                            'male'
                                                              ? '#1890ff'
                                                              : match.sex.toLowerCase() ===
                                                                'female'
                                                              ? '#eb2f96'
                                                              : '#722ed1',
                                                          border: `1px solid ${
                                                            match.sex.toLowerCase() ===
                                                            'male'
                                                              ? '#1890ff40'
                                                              : match.sex.toLowerCase() ===
                                                                'female'
                                                              ? '#eb2f9640'
                                                              : '#722ed140'
                                                          }`,
                                                        }}
                                                      >
                                                        {match.sex}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div
                                                    className={`court-match-status match-status-${match.status}`}
                                                    style={{
                                                      backgroundColor:
                                                        match.status ===
                                                        'completed'
                                                          ? '#52c41a'
                                                          : match.status ===
                                                            'in-progress'
                                                          ? '#f5222d'
                                                          : match.team1 &&
                                                            match.team2
                                                          ? '#1890ff'
                                                          : '#faad14',
                                                      color: '#fff',
                                                      padding: '2px 8px',
                                                      borderRadius: '4px',
                                                      fontSize: '10px',
                                                      fontWeight: 'bold',
                                                    }}
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
                                                        fontSize: '20px',
                                                        marginRight: '4px',
                                                      }}
                                                    />
                                                    <Text
                                                      type='secondary'
                                                      style={{
                                                        fontSize: '20px',
                                                      }}
                                                    >
                                                      {new Date(
                                                        match.scheduledTime
                                                      ).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                      })}
                                                    </Text>
                                                  </div>
                                                )}
                                              </Space>
                                            </div>

                                            {/* Teams and Score */}
                                            <div className='court-match-teams'>
                                              {/* Team 1 */}
                                              <div className='court-team-row'>
                                                <div className='court-team-info'>
                                                  <div
                                                    className='court-team-name'
                                                    title={
                                                      match.team1?.name || 'TBD'
                                                    }
                                                    style={{ fontSize: '22px' }}
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
                                                    style={{ fontSize: '24px' }}
                                                  >
                                                    {match.team1Score}
                                                  </Text>
                                                </div>
                                              </div>

                                              {/* VS Divider */}
                                              <Divider
                                                style={{
                                                  margin: '6px 0',
                                                  fontSize: '16px',
                                                  color: '#999',
                                                }}
                                              >
                                                VS
                                              </Divider>

                                              {/* Team 2 */}
                                              <div className='court-team-row'>
                                                <div className='court-team-info'>
                                                  <div
                                                    className='court-team-name'
                                                    title={
                                                      match.team2?.name || 'TBD'
                                                    }
                                                    style={{ fontSize: '22px' }}
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
                                                    style={{ fontSize: '24px' }}
                                                  >
                                                    {match.team2Score}
                                                  </Text>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </Card>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Date Summary */}
                          {matchDate ? (
                            <div
                              className='date-summary'
                              style={{
                                marginTop: '24px',
                                marginBottom: '48px',
                                padding: '16px',
                                background:
                                  'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                borderRadius: '8px',
                              }}
                            >
                              <Row gutter={[16, 16]}>
                                <Col xs={24} sm={6}>
                                  <Statistic
                                    title='Total Matches'
                                    value={dateMatches.length}
                                    prefix={<TeamOutlined />}
                                  />
                                </Col>
                                <Col xs={24} sm={6}>
                                  <Statistic
                                    title='Courts Used'
                                    value={sortedCourts.length}
                                    prefix={<EnvironmentOutlined />}
                                    valueStyle={{ color: '#1890ff' }}
                                  />
                                </Col>
                                <Col xs={24} sm={6}>
                                  <Statistic
                                    title='Completed'
                                    value={
                                      dateMatches.filter(
                                        (m) => m.status === 'completed'
                                      ).length
                                    }
                                    prefix={<CheckCircleOutlined />}
                                    valueStyle={{ color: '#52c41a' }}
                                  />
                                </Col>
                                <Col xs={24} sm={6}>
                                  <Statistic
                                    title='In Progress'
                                    value={
                                      dateMatches.filter(
                                        (m) => m.status === 'in-progress'
                                      ).length
                                    }
                                    prefix={<PlayCircleOutlined />}
                                    valueStyle={{ color: '#f5222d' }}
                                  />
                                </Col>
                              </Row>
                            </div>
                          ) : (
                            <div
                              className='date-summary'
                              style={{
                                marginTop: '24px',
                                marginBottom: '48px',
                                padding: '16px',
                                background:
                                  'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)',
                                borderRadius: '8px',
                              }}
                            >
                              <Row gutter={[16, 16]}>
                                <Col span={24}>
                                  <Alert
                                    message='Unscheduled Matches'
                                    description='These matches are waiting to be scheduled. Times, dates, and courts will be assigned later.'
                                    type='info'
                                    showIcon
                                  />
                                </Col>
                              </Row>
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
                  <Title level={4}>
                    {dateFilter === 'all'
                      ? `No matches found for Round ${selectedRound}`
                      : `No matches for Round ${selectedRound} on ${selectedDate.format(
                          'MMMM D, YYYY'
                        )}`}
                  </Title>
                  <Text type='secondary'>
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
                  <Button type='primary' onClick={() => setDateFilter('all')}>
                    <CalendarOutlined /> View All Round {selectedRound} Matches
                  </Button>
                )}
                {dateFilter === 'day' && (
                  <Button icon={<CalendarOutlined />} onClick={goToToday}>
                    Go to Today
                  </Button>
                )}
                <Button
                  icon={<CalendarOutlined />}
                  onClick={() =>
                    setDateFilter(dateFilter === 'day' ? 'all' : 'day')
                  }
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
              <Card title='Team Filters' size='small'>
                <Space direction='vertical' style={{ width: '100%' }}>
                  <Select
                    placeholder='Filter by Level'
                    style={{ width: '100%' }}
                    allowClear
                  >
                    <Select.Option value='gold'>Gold</Select.Option>
                    <Select.Option value='silver'>Silver</Select.Option>
                  </Select>
                  <Select
                    placeholder='Filter by Grade'
                    style={{ width: '100%' }}
                    allowClear
                  >
                    {Array.from(new Set(teams.map((t) => t.grade))).map(
                      (grade) => (
                        <Select.Option key={grade} value={grade}>
                          Grade {grade}
                        </Select.Option>
                      )
                    )}
                  </Select>
                  <Button type='primary' block icon={<FilterOutlined />}>
                    Apply Filters
                  </Button>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={16}>
              {teams.length > 0 ? (
                <List
                  grid={{ gutter: 16, column: 2 }}
                  dataSource={teams}
                  renderItem={(team) => (
                    <List.Item>
                      <Card
                        hoverable
                        style={{ borderRadius: 8 }}
                        styles={{ body: { padding: 16 } }}
                      >
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
                            <Title level={5} style={{ margin: 0 }}>
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
                            <Button type='link' icon={<InfoCircleOutlined />} />
                          </Tooltip>
                        </Space>
                      </Card>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty
                  description={
                    <div>
                      <Title level={4}>No teams registered yet</Title>
                      <Text type='secondary'>
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
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Title level={4}>No standings available</Title>
                  <Text type='secondary'>
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
          {/* Date Filter for Schedule Tab */}
          <Card
            style={{
              marginBottom: 24,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #f6f8ff 0%, #f0f2ff 100%)',
            }}
          >
            <Row gutter={[16, 16]} align='middle'>
              <Col xs={24} md={12}>
                <Space direction='vertical' style={{ width: '100%' }}>
                  <Text strong style={{ fontSize: 14, marginBottom: 4 }}>
                    Showing matches for:
                  </Text>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <Button
                      icon={<LeftOutlined />}
                      onClick={() => navigateDate('prev')}
                      size='large'
                      style={{ minWidth: 40 }}
                      disabled={dateFilter === 'all'}
                    />
                    <div
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '8px 16px',
                        background: '#fafafa',
                        borderRadius: 6,
                        border: '1px solid #d9d9d9',
                      }}
                    >
                      <Text strong style={{ fontSize: 16 }}>
                        {dateFilter === 'all'
                          ? 'All Dates'
                          : selectedDate.format('dddd, MMMM D, YYYY')}
                      </Text>
                    </div>
                    <Button
                      icon={<RightOutlined />}
                      onClick={() => navigateDate('next')}
                      size='large'
                      style={{ minWidth: 40 }}
                      disabled={dateFilter === 'all'}
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
                      style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
                    >
                      <Radio.Button value='day'>
                        <CalendarOutlined /> Day View
                      </Radio.Button>
                      <Radio.Button value='all'>All Dates</Radio.Button>
                    </Radio.Group>
                  </Col>
                  <Col>
                    <Button
                      icon={<CalendarOutlined />}
                      onClick={goToToday}
                      size='large'
                      disabled={dateFilter === 'all'}
                    >
                      Today
                    </Button>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card>

          {/* Schedule timeline - use matchesForSelectedRound instead of filteredMatches */}
          {matchesForSelectedRound.length > 0 ? ( // Changed from filteredMatches
            <Timeline mode='alternate'>
              {matchesForSelectedRound.map(
                (
                  match // Changed from filteredMatches
                ) => (
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
                    <Card
                      size='small'
                      style={{
                        width: '100%',
                        borderLeft: `4px solid ${
                          match.status === 'completed'
                            ? '#52c41a'
                            : match.status === 'in-progress'
                            ? '#f5222d'
                            : '#1890ff'
                        }`,
                      }}
                    >
                      <Row gutter={[16, 8]}>
                        <Col span={24}>
                          <Space align='center'>
                            <Tag color='blue'>Round {match.round}</Tag>
                            <Text strong>Match #{match.matchNumber}</Text>
                            {match.court && (
                              <Tag color='green'>Court {match.court}</Tag>
                            )}
                            {match.duration && (
                              <Tag color='purple'>{match.duration} mins</Tag>
                            )}
                          </Space>
                        </Col>
                        <Col span={24}>
                          {/* Mobile: Vertical layout (hidden on desktop) */}
                          <div className='mobile-match-display'>
                            <Row gutter={16} align='middle'>
                              <Col
                                span={24}
                                style={{
                                  textAlign: 'center',
                                  marginBottom: '12px',
                                }}
                              >
                                <Space direction='vertical' size={0}>
                                  <Text strong style={{ fontSize: '16px' }}>
                                    {match.team1?.name || 'TBD'}
                                  </Text>
                                  <Text
                                    type='secondary'
                                    style={{ fontSize: '12px' }}
                                  ></Text>
                                </Space>
                              </Col>
                              <Col
                                span={24}
                                style={{
                                  textAlign: 'center',
                                  marginBottom: '16px',
                                }}
                              >
                                <Space direction='vertical' size={0}>
                                  <Title level={3} style={{ margin: 0 }}>
                                    {match.team1Score} - {match.team2Score}
                                  </Title>
                                </Space>
                              </Col>
                              <Col span={24} style={{ textAlign: 'center' }}>
                                <Space direction='vertical' size={0}>
                                  <Text strong style={{ fontSize: '16px' }}>
                                    {match.team2?.name || 'TBD'}
                                  </Text>
                                  <Text
                                    type='secondary'
                                    style={{ fontSize: '12px' }}
                                  ></Text>
                                </Space>
                              </Col>
                            </Row>
                          </div>
                        </Col>
                        <Col span={24}>
                          <Divider style={{ margin: '8px 0' }} />
                          <Space wrap>
                            {match.scheduledTime && (
                              <Space>
                                <ClockCircleOutlined />
                                <Text type='secondary'>
                                  {new Date(match.scheduledTime).toLocaleString(
                                    [],
                                    {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    }
                                  )}
                                </Text>
                              </Space>
                            )}
                            {match.duration !== undefined &&
                              match.duration !== null && (
                                <Space>
                                  <ClockCircleOutlined />
                                  <Text type='secondary'>
                                    Duration: {match.duration} minutes
                                  </Text>
                                </Space>
                              )}
                          </Space>
                        </Col>
                      </Row>
                    </Card>
                  </Timeline.Item>
                )
              )}
            </Timeline>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Title level={4}>
                    {dateFilter === 'all'
                      ? `No matches found for Round ${selectedRound}`
                      : `No matches for Round ${selectedRound} on ${selectedDate.format(
                          'MMMM D, YYYY'
                        )}`}
                  </Title>
                  <Text type='secondary'>
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
                  <Button type='primary' onClick={() => setDateFilter('all')}>
                    <CalendarOutlined /> View All Round {selectedRound} Matches
                  </Button>
                )}
                {dateFilter === 'day' && (
                  <Button icon={<CalendarOutlined />} onClick={goToToday}>
                    Go to Today
                  </Button>
                )}
                <Button
                  icon={<CalendarOutlined />}
                  onClick={() =>
                    setDateFilter(dateFilter === 'day' ? 'all' : 'day')
                  }
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
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
            size='large'
          />
          <Title level={4} style={{ marginTop: 24, marginBottom: 8 }}>
            Loading Tournament
          </Title>
          <Text type='secondary'>
            Please wait while we fetch tournament details...
          </Text>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
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
        <Card style={{ textAlign: 'center', maxWidth: 500, borderRadius: 8 }}>
          <Alert
            message='Error Loading Tournament'
            description={error}
            type='error'
            showIcon
            style={{ marginBottom: 24 }}
          />
          <Button type='primary' onClick={() => navigate('/tournaments')}>
            Browse Tournaments
          </Button>
        </Card>
      </div>
    );
  }

  // No tournament state
  if (!tournament) {
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
        <Card style={{ textAlign: 'center', maxWidth: 500, borderRadius: 8 }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Title level={4}>Tournament not found</Title>
                <Text type='secondary'>
                  The tournament you're looking for doesn't exist or has been
                  removed.
                </Text>
              </div>
            }
          />
          <Button
            type='primary'
            onClick={() => navigate('/tournaments')}
            style={{ marginTop: 16 }}
          >
            Browse Tournaments
          </Button>
        </Card>
      </div>
    );
  }

  const formatBadge = getFormatBadge(tournament.format);

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
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
              <Card
                size='small'
                style={{
                  borderRadius: 8,
                  borderLeft: `4px solid ${stat.color}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <Space align='start'>
                  <Avatar
                    style={{
                      backgroundColor: stat.color + '20',
                      color: stat.color,
                    }}
                    icon={stat.icon}
                  />
                  <div>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {stat.title}
                    </Text>
                    <Title level={4} style={{ margin: '4px 0 0 0' }}>
                      {stat.value}
                    </Title>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Main Content Tabs */}
        <Card
          style={{
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            tabBarExtraContent={
              <Space>
                <Tooltip title='Export Data'>
                  <Button icon={<ExportOutlined />} onClick={handleExport}>
                    Export
                  </Button>
                </Tooltip>
              </Space>
            }
          />
        </Card>

        {/* Modals */}
        {/* Follow Modal */}
        <Modal
          title='Follow Tournament'
          open={followModalVisible}
          onCancel={() => setFollowModalVisible(false)}
          onOk={handleConfirmFollow}
          okText='Follow Tournament'
          okButtonProps={{ type: 'primary' }}
        >
          <Alert
            message='Stay Updated'
            description='Get notified about match results, schedule changes, and important announcements.'
            type='info'
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Input
            placeholder='Enter your email address'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            size='large'
            style={{ marginBottom: 8 }}
          />
          <Text type='secondary' style={{ fontSize: 12 }}>
            You can unsubscribe at any time. We'll only send tournament-related
            updates.
          </Text>
        </Modal>

        {/* Export Modal */}
        <Modal
          title='Export Tournament Data'
          open={exportModalVisible}
          onCancel={() => setExportModalVisible(false)}
          footer={[
            <Button key='cancel' onClick={() => setExportModalVisible(false)}>
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
                  `tournament-${tournament.name.replace(
                    /\s+/g,
                    '-'
                  )}-export.json`
                );
                linkElement.click();
                message.success('Data exported successfully!');
                setExportModalVisible(false);
              }}
            >
              Export as JSON
            </Button>,
            <Button
              key='csv'
              type='primary'
              onClick={() => {
                message.info('CSV export coming soon!');
              }}
            >
              Export as CSV
            </Button>,
          ]}
        >
          <Alert
            message='Export Options'
            description='Choose the format and data you want to export from this tournament.'
            type='info'
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Radio.Group defaultValue='all'>
            <Space direction='vertical'>
              <Radio value='all'>All tournament data</Radio>
              <Radio value='bracket'>Bracket matches only</Radio>
              <Radio value='teams'>Team information only</Radio>
              <Radio value='standings'>Standings only</Radio>
            </Space>
          </Radio.Group>
        </Modal>
      </div>
    </div>
  );
};

export default PublicTournamentPage;
