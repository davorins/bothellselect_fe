// components/admin/Tournament/TournamentSelector.tsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Input,
  Select,
  Table,
  Tag,
  Space,
  Alert,
  Badge,
  Spin,
  Empty,
  Modal,
  message,
  Tooltip,
  Descriptions,
  Statistic,
  Divider,
  Switch,
} from 'antd';
import {
  SearchOutlined,
  SyncOutlined,
  TrophyOutlined,
  TeamOutlined,
  PlusOutlined,
  EyeOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  GoldOutlined,
  UserOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  DatabaseOutlined,
  DollarOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import axios, { AxiosResponse } from 'axios';
import dayjs from 'dayjs';
import {
  TournamentFromTeams,
  Team,
  ApiResponse,
  Tournament,
  isTournamentFromTeams,
  isDatabaseTournament,
} from '../../../types/tournament';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

interface TournamentSelectorProps {
  onTournamentSelect: (tournament: TournamentFromTeams) => void;
  onManageTournament?: (tournamentData: any) => void;
}

const TournamentSelector: React.FC<TournamentSelectorProps> = ({
  onTournamentSelect,
  onManageTournament,
}) => {
  const [tournaments, setTournaments] = useState<TournamentFromTeams[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<
    TournamentFromTeams[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedTournament, setSelectedTournament] =
    useState<TournamentFromTeams | null>(null);
  const [creatingTournament, setCreatingTournament] = useState<boolean>(false);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(
    null
  );
  const [showOnlyPaidTeams, setShowOnlyPaidTeams] = useState<boolean>(true);
  const [teamStatistics, setTeamStatistics] = useState<{
    total: number;
    paid: number;
    unpaid: number;
  }>({ total: 0, paid: 0, unpaid: 0 });

  const API_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  const getAuthHeader = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  // Helper function to check if team is eligible (has paid)
  const isTeamEligible = (
    team: Team,
    tournamentName?: string,
    tournamentYear?: number
  ): boolean => {
    console.log(`🔍 Checking eligibility for team: ${team.name}`);
    console.log('Team data:', {
      tournaments: team.tournaments,
      paymentComplete: team.paymentComplete,
      paymentStatus: team.paymentStatus,
      tournamentName,
      tournamentYear,
    });

    // First check if we have tournament context
    const tournamentContext = tournamentName && tournamentYear;

    // Method 1: Check tournaments array for specific tournament payment
    if (
      tournamentContext &&
      team.tournaments &&
      Array.isArray(team.tournaments)
    ) {
      const tournamentEntry = team.tournaments.find(
        (t) => t.tournament === tournamentName && t.year === tournamentYear
      );

      console.log('Tournament entry found:', tournamentEntry);

      if (tournamentEntry) {
        // Check paymentComplete flag in tournament entry
        if (tournamentEntry.paymentComplete === true) {
          console.log(
            '✅ Eligible: paymentComplete = true in tournament entry'
          );
          return true;
        }

        // Check paymentStatus in tournament entry
        if (
          tournamentEntry.paymentStatus === 'paid' ||
          tournamentEntry.paymentStatus === 'completed'
        ) {
          console.log(
            '✅ Eligible: paymentStatus = paid/completed in tournament entry'
          );
          return true;
        }

        // Check amountPaid (if > 0)
        if (tournamentEntry.amountPaid && tournamentEntry.amountPaid > 0) {
          console.log('✅ Eligible: amountPaid > 0 in tournament entry');
          return true;
        }
      }
    }

    // Method 2: Check root-level payment status (fallback)
    if (team.paymentComplete === true) {
      console.log('✅ Eligible: paymentComplete = true at root level');
      return true;
    }

    if (team.paymentStatus === 'paid' || team.paymentStatus === 'completed') {
      console.log('✅ Eligible: paymentStatus = paid/completed at root level');
      return true;
    }

    // Method 3: Check any tournament payment (if no specific tournament context)
    if (
      !tournamentContext &&
      team.tournaments &&
      Array.isArray(team.tournaments)
    ) {
      const hasPaidTournament = team.tournaments.some(
        (t) =>
          t.paymentComplete === true ||
          t.paymentStatus === 'paid' ||
          t.paymentStatus === 'completed' ||
          (t.amountPaid && t.amountPaid > 0)
      );
      if (hasPaidTournament) {
        console.log('✅ Eligible: found paid tournament in tournaments array');
        return true;
      }
    }

    console.log('❌ Not eligible: No payment found');
    return false;
  };

  // Filter teams based on payment status
  const filterTeamsByPayment = (
    teams: Team[],
    onlyPaid: boolean,
    tournamentName?: string,
    tournamentYear?: number
  ): Team[] => {
    if (!onlyPaid) return teams;

    return teams.filter((team: Team) =>
      isTeamEligible(team, tournamentName, tournamentYear)
    );
  };

  // Calculate team statistics
  const calculateTeamStatistics = (
    teams: Team[],
    tournamentName?: string,
    tournamentYear?: number
  ) => {
    const paid = teams.filter((team: Team) =>
      isTeamEligible(team, tournamentName, tournamentYear)
    ).length;
    const unpaid = teams.length - paid;
    setTeamStatistics({
      total: teams.length,
      paid,
      unpaid,
    });
  };

  // Helper function to normalize tournament data
  const normalizeTournamentData = (
    tournament: Tournament
  ): TournamentFromTeams => {
    if (isTournamentFromTeams(tournament)) {
      return tournament;
    }

    // Convert DatabaseTournament to TournamentFromTeams
    const teams =
      Array.isArray(tournament.registeredTeams) &&
      tournament.registeredTeams.length > 0 &&
      typeof tournament.registeredTeams[0] !== 'string'
        ? (tournament.registeredTeams as Team[])
        : [];

    return {
      _id: tournament._id,
      name: tournament.name,
      year: tournament.year,
      status: tournament.status || 'extracted',
      levelOfCompetition: tournament.levelOfCompetition,
      sex: tournament.sex,
      teams: teams,
      teamCount: teams.length,
      description: tournament.description,
      maxTeams: tournament.maxTeams,
      minTeams: tournament.minTeams,
      format: tournament.format,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      settings: tournament.settings,
    };
  };

  // Fetch tournaments from teams with payment filter
  const fetchTournamentsFromTeams = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching tournaments from teams endpoint...');
      const response: AxiosResponse<ApiResponse<TournamentFromTeams[]>> =
        await axios.get(`${API_URL}/tournaments/from-teams`, getAuthHeader());

      console.log('📊 Response received:', response.data);

      if (response.data.success && response.data.tournaments) {
        const tournamentsData = response.data.tournaments;
        console.log('🎯 Raw tournaments data:', tournamentsData);

        // Debug: Show first tournament details
        if (tournamentsData.length > 0) {
          const firstTournament = tournamentsData[0];
          console.log('🔍 First tournament details:', {
            name: firstTournament.name,
            year: firstTournament.year,
            teamsCount: firstTournament.teams?.length || 0,
            teams: firstTournament.teams?.slice(0, 2), // Show first 2 teams
          });

          // Debug payment checking for first team
          if (firstTournament.teams && firstTournament.teams.length > 0) {
            const firstTeam = firstTournament.teams[0];
            console.log('💳 First team payment check:', {
              teamName: firstTeam.name,
              tournaments: firstTeam.tournaments,
              paymentComplete: firstTeam.paymentComplete,
              paymentStatus: firstTeam.paymentStatus,
              isEligible: isTeamEligible(
                firstTeam,
                firstTournament.name,
                firstTournament.year
              ),
            });
          }
        }

        // Filter teams in each tournament based on payment status
        const tournamentsWithPaidTeams = tournamentsData
          .map((t: TournamentFromTeams) => {
            console.log(`📝 Processing: ${t.name} ${t.year}`);

            // Pass tournament name and year to isTeamEligible
            const eligibleTeams =
              t.teams?.filter((team: Team) => {
                const eligible = isTeamEligible(team, t.name, t.year);
                console.log(`   Team ${team.name}: eligible=${eligible}`);
                return eligible;
              }) || [];

            console.log(`   ${eligibleTeams.length} eligible teams found`);

            return {
              ...t,
              teams: eligibleTeams,
              teamCount: eligibleTeams.length,
              status: t.status || 'extracted',
            };
          })
          .filter((t: TournamentFromTeams) => {
            console.log(`✅ ${t.name}: ${t.teamCount} paid teams`);
            return t.teams.length > 0;
          });

        console.log('🎯 Final filtered tournaments:', tournamentsWithPaidTeams);

        setTournaments(tournamentsWithPaidTeams);
        setFilteredTournaments(tournamentsWithPaidTeams);
        message.success(
          `Found ${tournamentsWithPaidTeams.length} tournaments with paid teams`
        );
      } else {
        console.error('❌ No tournaments data:', response.data);
        message.error(response.data.message || 'Failed to fetch tournaments');
      }
    } catch (error: any) {
      console.error('❌ Error fetching tournaments:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      message.error(
        error.response?.data?.message || 'Failed to load tournaments'
      );
    } finally {
      setLoading(false);
    }
  };

  // Filter tournaments
  useEffect(() => {
    if (!searchText && !selectedYear) {
      setFilteredTournaments(tournaments);
      return;
    }

    const filtered = tournaments.filter((tournament) => {
      const matchesSearch = searchText
        ? tournament.name.toLowerCase().includes(searchText.toLowerCase())
        : true;
      const matchesYear = selectedYear
        ? tournament.year === selectedYear
        : true;
      return matchesSearch && matchesYear;
    });

    setFilteredTournaments(filtered);
  }, [searchText, selectedYear, tournaments]);

  // Get available years
  const getAvailableYears = () => {
    const years = new Set<number>();
    tournaments.forEach((t) => years.add(t.year));
    return Array.from(years).sort((a, b) => b - a);
  };

  // Load tournament details with payment filtering
  const loadTournamentDetails = async (tournament: TournamentFromTeams) => {
    setLoadingTeams(true);
    setSelectedTournament(null);

    try {
      console.log(
        `🔍 Loading details for: ${tournament.name} ${tournament.year}`
      );

      // First check if tournament exists in database
      const response: AxiosResponse<ApiResponse<Tournament>> = await axios.get(
        `${API_URL}/tournaments/by-name/${encodeURIComponent(
          tournament.name
        )}/${tournament.year}`,
        getAuthHeader()
      );

      if (response.data.success && response.data.tournament) {
        const tournamentData = response.data.tournament;

        // Normalize tournament data
        const normalizedTournament = normalizeTournamentData(tournamentData);

        // Filter teams based on payment status WITH tournament context
        const filteredTeams = filterTeamsByPayment(
          normalizedTournament.teams || [],
          showOnlyPaidTeams,
          normalizedTournament.name,
          normalizedTournament.year
        );

        const finalTournament = {
          ...normalizedTournament,
          teams: filteredTeams,
          teamCount: filteredTeams.length,
        };

        // Calculate statistics WITH tournament context
        const allTeams = normalizedTournament.teams || [];
        const paid = allTeams.filter((team) =>
          isTeamEligible(
            team,
            normalizedTournament.name,
            normalizedTournament.year
          )
        ).length;
        const unpaid = allTeams.length - paid;

        setTeamStatistics({
          total: allTeams.length,
          paid,
          unpaid,
        });

        // Set selected tournament
        setSelectedTournament(finalTournament);

        // Set active ID if it's in database
        if (response.data.source === 'database' && normalizedTournament._id) {
          setActiveTournamentId(normalizedTournament._id);
        } else {
          setActiveTournamentId(null);
        }

        message.info(
          `Tournament loaded from ${response.data.source || 'teams collection'}`
        );
      } else {
        message.error('Failed to load tournament details');
      }
    } catch (error: any) {
      console.error('Error loading tournament details:', error);
      message.error(
        error.response?.data?.message || 'Failed to load tournament'
      );
    } finally {
      setLoadingTeams(false);
    }
  };

  // Create tournament in database with only paid teams
  const createTournamentInDatabase = async () => {
    if (!selectedTournament) return;

    setCreatingTournament(true);
    try {
      const response: AxiosResponse<ApiResponse<TournamentFromTeams>> =
        await axios.post(
          `${API_URL}/tournaments/create-from-teams`,
          {
            name: selectedTournament.name,
            year: selectedTournament.year,
            onlyPaidTeams: true, // Add flag to only include paid teams
          },
          getAuthHeader()
        );

      if (response.data.success && response.data.tournament) {
        message.success(
          'Tournament created successfully with paid teams only!'
        );

        // Normalize the response
        const tournamentData = response.data.tournament;
        const normalizedTournament = normalizeTournamentData(tournamentData);

        // Update selected tournament with new data
        setSelectedTournament(normalizedTournament);

        // Set active ID
        if (normalizedTournament._id) {
          setActiveTournamentId(normalizedTournament._id);
        }

        // Refresh tournaments list
        fetchTournamentsFromTeams();
      } else {
        message.error(response.data.message || 'Failed to create tournament');
      }
    } catch (error: any) {
      console.error('Error creating tournament:', error);
      message.error(
        error.response?.data?.message || 'Failed to create tournament'
      );
    } finally {
      setCreatingTournament(false);
    }
  };

  // Toggle payment filter
  const togglePaymentFilter = (checked: boolean) => {
    setShowOnlyPaidTeams(checked);
    if (selectedTournament) {
      const filteredTeams =
        selectedTournament.teams?.filter(
          (team: Team) =>
            !checked ||
            isTeamEligible(
              team,
              selectedTournament.name,
              selectedTournament.year
            )
        ) || [];
      setSelectedTournament({
        ...selectedTournament,
        teams: filteredTeams,
        teamCount: filteredTeams.length,
      });
    }
  };

  // Handle tournament selection - only allow if enough paid teams
  const handleTournamentSelect = (tournament: TournamentFromTeams) => {
    const eligibleTeams =
      tournament.teams?.filter((team: Team) =>
        isTeamEligible(team, tournament.name, tournament.year)
      ) || [];

    if (eligibleTeams.length < 2) {
      Modal.error({
        title: 'Not Enough Eligible Teams',
        content: (
          <div>
            <p>
              This tournament needs at least 2 teams that have paid to proceed.
            </p>
            <p>
              <strong>Paid Teams:</strong> {eligibleTeams.length}
            </p>
            <Alert
              type='warning'
              message='Payment Required'
              description='Only teams with completed payment can participate in tournaments.'
              style={{ marginTop: '10px' }}
            />
          </div>
        ),
      });
      return;
    }

    if (activeTournamentId && selectedTournament) {
      // Tournament is already in database, use the selected tournament
      const dbTournament: TournamentFromTeams = {
        ...selectedTournament,
        _id: activeTournamentId,
        status: 'draft',
        teams: eligibleTeams, // Ensure only paid teams
      };
      onTournamentSelect(dbTournament);
    } else if (tournament._id) {
      // Tournament already has an ID
      const dbTournament: TournamentFromTeams = {
        ...tournament,
        status: 'draft',
        teams: eligibleTeams, // Ensure only paid teams
      };
      onTournamentSelect(dbTournament);
    } else {
      // Tournament is not in database yet
      Modal.confirm({
        title: 'Create Tournament',
        content: (
          <div>
            <p>
              This tournament exists in team registrations but hasn't been
              created in the system yet.
            </p>
            <p>Do you want to create it now with only paid teams?</p>
            <Alert
              type='info'
              message='Tournament Details'
              description={
                <div>
                  <p>
                    <strong>Name:</strong> {tournament.name}
                  </p>
                  <p>
                    <strong>Year:</strong> {tournament.year}
                  </p>
                  <p>
                    <strong>Total Teams:</strong> {teamStatistics.total}
                  </p>
                  <p>
                    <strong>Paid Teams:</strong>{' '}
                    <Tag color='green'>{teamStatistics.paid}</Tag>
                  </p>
                  <p>
                    <strong>Unpaid Teams:</strong>{' '}
                    <Tag color='red'>{teamStatistics.unpaid}</Tag>
                  </p>
                  <p>
                    <strong>Eligible Teams:</strong>{' '}
                    <Tag color={eligibleTeams.length >= 2 ? 'green' : 'red'}>
                      {eligibleTeams.length}
                    </Tag>
                  </p>
                  <p>
                    <strong>Level:</strong> {tournament.levelOfCompetition}
                  </p>
                  <p>
                    <strong>Gender:</strong> {tournament.sex}
                  </p>
                </div>
              }
              style={{ marginTop: '10px' }}
            />
          </div>
        ),
        okText: 'Yes, Create with Paid Teams',
        cancelText: 'Cancel',
        okButtonProps: {
          disabled: eligibleTeams.length < 2,
        },
        onOk: async () => {
          await createTournamentInDatabase();
          // After creation, select it
          if (selectedTournament && selectedTournament._id) {
            const dbTournament: TournamentFromTeams = {
              ...selectedTournament,
              status: 'draft',
              teams: eligibleTeams,
            };
            onTournamentSelect(dbTournament);
          }
        },
      });
    }
  };

  // Helper to analyze tournament level based on actual teams
  const analyzeTournamentLevel = (tournament: TournamentFromTeams | null) => {
    if (!tournament || !tournament.teams || tournament.teams.length === 0) {
      const display = formatLevelDisplay(
        tournament?.levelOfCompetition || 'Unknown'
      );
      return {
        display,
        color:
          display === 'Gold'
            ? 'gold'
            : display === 'Silver'
            ? 'blue'
            : 'purple',
      };
    }

    // Check what levels are present in teams
    const levels = new Set<string>();
    tournament.teams.forEach((team) => {
      if (team.levelOfCompetition) {
        const level = team.levelOfCompetition.toLowerCase();
        if (level.includes('gold')) levels.add('gold');
        if (level.includes('silver')) levels.add('silver');
      }
    });

    console.log('🔍 Tournament level analysis:', {
      name: tournament.name,
      tournamentLevel: tournament.levelOfCompetition,
      teamLevelsFound: Array.from(levels),
      teamCount: tournament.teams.length,
    });

    // Determine display text based on team levels
    let display: string;
    if (levels.has('gold') && levels.has('silver')) {
      display = 'Mixed (Gold & Silver)';
    } else if (levels.has('gold') && !levels.has('silver')) {
      display = 'Gold';
    } else if (!levels.has('gold') && levels.has('silver')) {
      display = 'Silver';
    } else {
      display = formatLevelDisplay(tournament.levelOfCompetition || 'Unknown');
    }

    // Determine color based on display text
    let color = 'purple'; // default for mixed
    if (display === 'Gold') {
      color = 'gold';
    } else if (display === 'Silver') {
      color = 'blue';
    }

    return { display, color };
  };

  const getTournamentLevelInfo = (
    level: string
  ): { display: string; color: string } => {
    const display = formatLevelDisplay(level);

    // Determine color based on the DISPLAY text, not the raw level
    let color = 'purple';
    if (display === 'Gold') {
      color = 'gold';
    } else if (display === 'Silver') {
      color = 'blue';
    } else if (display === 'Mixed (Gold & Silver)') {
      color = 'purple';
    }

    return { display, color };
  };

  const formatLevelDisplay = (level: string): string => {
    const levelLower = level.toLowerCase();

    switch (levelLower) {
      case 'gold':
        return 'Gold';
      case 'silver':
        return 'Silver';
      case 'all':
      case 'mixed':
      case 'mixed (gold & silver)':
      case 'gold & silver':
      case 'both':
        return 'Mixed (Gold & Silver)';
      default:
        // If it contains both gold and silver, show as mixed
        if (levelLower.includes('gold') && levelLower.includes('silver')) {
          return 'Mixed (Gold & Silver)';
        }
        // If it contains "all" or "mixed", show as mixed
        if (levelLower.includes('all') || levelLower.includes('mixed')) {
          return 'Mixed (Gold & Silver)';
        }
        return level; // Return original if no match
    }
  };

  // Team columns for the table
  const teamColumns = [
    {
      title: 'Team Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Team) => (
        <Space direction='horizontal' size={0}>
          <Text strong>{text}</Text>
          <Text type='secondary' style={{ fontSize: '12px' }}>
            Grade: {record.grade}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Gender',
      key: 'gender',
      render: (text: string, record: Team) => (
        <Space direction='horizontal' size={0}>
          <Text type='secondary' style={{ fontSize: '12px' }}>
            {record.sex}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Level',
      dataIndex: 'levelOfCompetition',
      key: 'level',
      render: (level: string) => {
        const displayLevel = formatLevelDisplay(level);
        const color =
          level === 'Gold' ? 'gold' : level === 'Silver' ? 'blue' : 'purple';
        return <Tag color={color}>{displayLevel}</Tag>;
      },
    },
    {
      title: 'Payment Status',
      key: 'payment',
      render: (text: string, record: Team) => {
        const isPaid = isTeamEligible(
          record,
          selectedTournament?.name,
          selectedTournament?.year
        );
        return (
          <Space>
            {isPaid ? (
              <Tag color='green' icon={<CheckOutlined />}>
                Paid
              </Tag>
            ) : (
              <Tag color='red' icon={<CloseOutlined />}>
                Unpaid
              </Tag>
            )}
          </Space>
        );
      },
    },
  ];

  // Initialize
  useEffect(() => {
    fetchTournamentsFromTeams();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2} style={{ marginBottom: '20px' }}>
        <TrophyOutlined /> Select Tournament from Teams
      </Title>

      <Alert
        type='info'
        message='Payment Requirement'
        description='Only teams with completed payment can participate in tournaments. Unpaid teams will be filtered out automatically.'
        style={{ marginBottom: '20px' }}
        icon={<DollarOutlined />}
      />

      {/* Search and Filters */}
      <Card style={{ marginBottom: '20px' }}>
        <Row gutter={[16, 16]} align='middle'>
          <Col xs={24} md={12}>
            <Search
              placeholder='Search tournaments by name...'
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              enterButton
              size='large'
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              placeholder='Filter by year'
              style={{ width: '100%' }}
              value={selectedYear}
              onChange={setSelectedYear}
              allowClear
              size='large'
            >
              {getAvailableYears().map((year) => (
                <Option key={year} value={year}>
                  {year}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={6} style={{ textAlign: 'right' }}>
            <Space>
              <Tooltip title='Show only paid teams'>
                <Switch
                  checkedChildren='Paid Only'
                  unCheckedChildren='All Teams'
                  checked={showOnlyPaidTeams}
                  onChange={togglePaymentFilter}
                />
              </Tooltip>
              <Button
                icon={<SyncOutlined />}
                onClick={fetchTournamentsFromTeams}
                loading={loading}
                size='large'
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Content */}
      <Row gutter={[24, 24]}>
        {/* Tournaments List */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <DatabaseOutlined />
                <span>Tournaments from Team Registrations</span>
                <Badge count={filteredTournaments.length} showZero />
              </Space>
            }
            loading={loading}
            extra={
              <Tooltip title='Only showing tournaments with at least one paid team'>
                <Tag color='green' icon={<DollarOutlined />}>
                  Paid Teams Only
                </Tag>
              </Tooltip>
            }
          >
            {filteredTournaments.length === 0 ? (
              <Empty
                description={
                  loading
                    ? 'Loading tournaments...'
                    : 'No tournaments with paid teams found'
                }
              />
            ) : (
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {filteredTournaments.map((tournament) => (
                  <Card
                    key={`${tournament.name}-${tournament.year}`}
                    size='small'
                    style={{
                      marginBottom: '10px',
                      cursor: 'pointer',
                      border:
                        selectedTournament?.name === tournament.name &&
                        selectedTournament?.year === tournament.year
                          ? '2px solid #1890ff'
                          : '1px solid #f0f0f0',
                      backgroundColor:
                        selectedTournament?.name === tournament.name &&
                        selectedTournament?.year === tournament.year
                          ? '#e6f7ff'
                          : 'white',
                    }}
                    onClick={() => loadTournamentDetails(tournament)}
                  >
                    <Row justify='space-between' align='middle'>
                      <Col>
                        <Space direction='vertical' size={0}>
                          <Text strong style={{ fontSize: '16px' }}>
                            {tournament.name}
                          </Text>
                          <Space>
                            <Tag color='blue'>{tournament.year}</Tag>
                            <Tag
                              color={
                                tournament.levelOfCompetition === 'Gold'
                                  ? 'gold'
                                  : tournament.levelOfCompetition === 'Silver'
                                  ? 'blue'
                                  : 'purple'
                              }
                            >
                              {formatLevelDisplay(
                                tournament.levelOfCompetition
                              )}
                            </Tag>
                            <Tag>{tournament.sex}</Tag>
                            <Tag
                              color={tournament.teamCount > 0 ? 'green' : 'red'}
                            >
                              <DollarOutlined /> {tournament.teamCount} paid
                            </Tag>
                          </Space>
                        </Space>
                      </Col>
                      <Col>
                        <Space>
                          <Badge
                            count={tournament.teamCount}
                            showZero
                            color={
                              tournament.teamCount > 0 ? 'green' : 'default'
                            }
                          />
                          <TeamOutlined />
                          <ArrowRightOutlined />
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* Tournament Details */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <TrophyOutlined />
                <span>Tournament Details</span>
                {selectedTournament && activeTournamentId && (
                  <Tag color='green' icon={<CheckCircleOutlined />}>
                    In System
                  </Tag>
                )}
              </Space>
            }
            loading={loadingTeams}
            extra={
              <Space>
                <Tooltip title='Toggle payment filter'>
                  <Switch
                    checkedChildren='Paid'
                    unCheckedChildren='All'
                    checked={showOnlyPaidTeams}
                    onChange={togglePaymentFilter}
                    size='small'
                  />
                </Tooltip>
                {teamStatistics.total > 0 && (
                  <Space>
                    <Tag color='green'>{teamStatistics.paid} paid</Tag>
                    <Tag color='red'>{teamStatistics.unpaid} unpaid</Tag>
                  </Space>
                )}
              </Space>
            }
          >
            {!selectedTournament ? (
              <Empty
                description='Select a tournament to view details'
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <>
                {/* Tournament Info */}
                <div style={{ marginBottom: '20px' }}>
                  <Title level={4} style={{ marginBottom: '10px' }}>
                    {selectedTournament.name} {selectedTournament.year}
                  </Title>

                  <Descriptions bordered size='small' column={1}>
                    <Descriptions.Item label='Status'>
                      <Tag color={activeTournamentId ? 'blue' : 'orange'}>
                        {activeTournamentId
                          ? 'Ready for Management'
                          : 'Not Created Yet'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label='Level'>
                      {(() => {
                        const levelInfo =
                          analyzeTournamentLevel(selectedTournament);
                        return (
                          <Tag color={levelInfo.color}>{levelInfo.display}</Tag>
                        );
                      })()}
                    </Descriptions.Item>
                    <Descriptions.Item label='Gender'>
                      <Tag>{selectedTournament.sex}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label='Teams'>
                      <Space>
                        <Text>{selectedTournament.teamCount} eligible</Text>
                        <Tag color='green'>{teamStatistics.paid} paid</Tag>
                        <Tag color='red'>{teamStatistics.unpaid} unpaid</Tag>
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label='Description'>
                      {selectedTournament.description ||
                        'No description available'}
                    </Descriptions.Item>
                  </Descriptions>
                </div>

                {/* Teams List */}
                <Divider>
                  <Space>
                    <TeamOutlined />
                    Eligible Teams ({selectedTournament.teams?.length || 0})
                    {showOnlyPaidTeams && (
                      <Tag color='green' icon={<DollarOutlined />}>
                        Paid Only
                      </Tag>
                    )}
                  </Space>
                </Divider>

                {selectedTournament.teams &&
                selectedTournament.teams.length > 0 ? (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <Table
                      dataSource={selectedTournament.teams}
                      columns={teamColumns}
                      rowKey='_id'
                      size='small'
                      pagination={false}
                    />
                  </div>
                ) : (
                  <Empty
                    description={
                      showOnlyPaidTeams
                        ? 'No paid teams found for this tournament'
                        : 'No teams found for this tournament'
                    }
                  />
                )}

                {/* Action Buttons */}
                <Divider />
                <Row justify='space-between'>
                  <Col>
                    {!activeTournamentId && (
                      <Button
                        type='primary'
                        icon={<PlusOutlined />}
                        onClick={createTournamentInDatabase}
                        loading={creatingTournament}
                        disabled={teamStatistics.paid < 2}
                        title={
                          teamStatistics.paid < 2
                            ? 'Need at least 2 paid teams'
                            : ''
                        }
                      >
                        Create Tournament with Paid Teams
                      </Button>
                    )}
                  </Col>
                  <Col>
                    <Space>
                      <Button
                        icon={<EyeOutlined />}
                        onClick={() => {
                          if (
                            selectedTournament.teams &&
                            selectedTournament.teams.length > 0
                          ) {
                            loadTournamentDetails(selectedTournament);
                          }
                        }}
                      >
                        View Details
                      </Button>
                      <Button
                        type='primary'
                        icon={<TrophyOutlined />}
                        onClick={() =>
                          handleTournamentSelect(selectedTournament)
                        }
                        disabled={
                          !selectedTournament ||
                          selectedTournament.teamCount < 2
                        }
                        title={
                          selectedTournament?.teamCount < 2
                            ? 'Need at least 2 eligible teams'
                            : ''
                        }
                      >
                        {activeTournamentId
                          ? 'Manage Tournament'
                          : 'Create & Manage'}
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TournamentSelector;
