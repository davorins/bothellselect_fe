// components/Teams/TeamForm.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Alert,
  Space,
  Spin,
  Row,
  Col,
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { InternalTeamFormData } from '../../../types/teamTypes';
import { useAuth } from '../../../context/AuthContext';
import { all_routes } from '../../router/all_routes';

const { Option, OptGroup } = Select;
const { TextArea } = Input;

interface Metadata {
  years: number[];
  grades: string[];
  tryoutSeasons: string[];
}

interface Coach {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
}

interface Player {
  _id: string;
  fullName: string;
  gender: string;
  grade: string;
  schoolName: string;
  dob?: string;
  age?: number;
}

const TeamForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCoaches, setAvailableCoaches] = useState<Coach[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [metadata, setMetadata] = useState<Metadata>({
    years: [],
    grades: [],
    tryoutSeasons: [],
  });
  const [currentTeamData, setCurrentTeamData] = useState<any>(null);
  const { getAuthToken, fetchAllParents } = useAuth();

  const isEdit = Boolean(id);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchFormData();
  }, [id]);

  const fetchFormData = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();

      // Fetch metadata
      const metadataResponse = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/internal-teams/metadata`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (metadataResponse.ok) {
        const metadataData = await metadataResponse.json();
        setMetadata(metadataData);
      }

      // Fetch available coaches
      const coaches = await fetchAllParents('isCoach=true');
      setAvailableCoaches(coaches.filter((p) => p.isCoach === true));

      // If editing, fetch team data
      if (isEdit) {
        const teamResponse = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/internal-teams/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (teamResponse.ok) {
          const team = await teamResponse.json();
          setCurrentTeamData(team);
          form.setFieldsValue({
            name: team.name,
            year: team.year,
            grade: team.grade,
            gender: team.gender,
            coachIds: team.coachIds?.map((c: any) => c._id),
            playerIds: team.playerIds?.map((p: any) => p._id),
            tryoutSeason: team.tryoutSeason,
            tryoutYear: team.tryoutYear,
            notes: team.notes,
          });

          // Load all available players without grade filter
          loadAllAvailablePlayers(
            team.tryoutSeason,
            team.tryoutYear,
            team.gender,
          );
        } else {
          throw new Error('Failed to fetch team data');
        }
      } else {
        // Set default values for new team
        form.setFieldsValue({
          year: currentYear,
          tryoutYear: currentYear,
          gender: 'Male',
          tryoutSeason: metadata.tryoutSeasons?.[0] || '',
        });

        // Load all players for default values
        setTimeout(() => {
          handleTryoutChange();
        }, 100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: InternalTeamFormData) => {
    try {
      setSubmitting(true);
      setError(null);

      const token = await getAuthToken();
      const url = isEdit
        ? `${process.env.REACT_APP_API_BASE_URL}/internal-teams/${id}`
        : `${process.env.REACT_APP_API_BASE_URL}/internal-teams`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save team');
      }

      navigate(all_routes.teams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save team');
    } finally {
      setSubmitting(false);
    }
  };

  // Load ALL available players without grade filter
  const loadAllAvailablePlayers = async (
    tryoutSeason: string,
    tryoutYear: number,
    gender: string, // Add gender parameter
  ) => {
    try {
      setPlayersLoading(true);
      const token = await getAuthToken();

      // Include gender in query params to filter by gender
      const queryParams = new URLSearchParams({
        season: tryoutSeason,
        year: tryoutYear.toString(),
        ...(gender && { gender }), // Include gender filter if provided
        // grade is intentionally omitted to get all grades
      });

      console.log('Loading all players with params:', queryParams.toString());

      const playersResponse = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/internal-teams/available-players?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (playersResponse.ok) {
        const players = await playersResponse.json();
        console.log(
          `Loaded ${players.length} players from all grades with gender filter: ${gender}`,
        );

        // Sort players by grade (numerically) and then by name
        const sortedPlayers = players.sort((a: Player, b: Player) => {
          const gradeA = parseInt(a.grade) || 0;
          const gradeB = parseInt(b.grade) || 0;

          if (gradeA === gradeB) {
            return a.fullName.localeCompare(b.fullName);
          }
          return gradeA - gradeB;
        });

        // If editing, include current team players even if they don't match current filters
        if (isEdit && currentTeamData?.playerIds) {
          const currentPlayerIds = currentTeamData.playerIds.map(
            (p: any) => p._id,
          );
          const missingPlayers = currentTeamData.playerIds.filter(
            (p: any) => !sortedPlayers.some((ap: Player) => ap._id === p._id),
          );

          // Combine available players with current team players
          const allPlayers = [...sortedPlayers, ...missingPlayers];
          setAvailablePlayers(allPlayers);
        } else {
          setAvailablePlayers(sortedPlayers);
        }
      } else {
        console.error('Failed to load players:', playersResponse.status);
        // If editing and fetch fails, at least show current players
        if (isEdit && currentTeamData?.playerIds) {
          setAvailablePlayers(currentTeamData.playerIds);
        }
      }
    } catch (err) {
      console.error('Failed to load available players:', err);
      // If editing and fetch fails, at least show current players
      if (isEdit && currentTeamData?.playerIds) {
        setAvailablePlayers(currentTeamData.playerIds);
      }
    } finally {
      setPlayersLoading(false);
    }
  };

  // Handle tryout season/year changes
  const handleTryoutChange = () => {
    if (isEdit) return;

    const tryoutSeason = form.getFieldValue('tryoutSeason');
    const tryoutYear = form.getFieldValue('tryoutYear');
    const gender = form.getFieldValue('gender'); // Get current gender

    console.log('Tryout change:', { tryoutSeason, tryoutYear, gender });

    if (tryoutSeason && tryoutYear) {
      loadAllAvailablePlayers(tryoutSeason, tryoutYear, gender); // Pass gender
    }
  };

  // Handle gender changes
  const handleGenderChange = (gender: string) => {
    if (isEdit) return;
    form.setFieldsValue({ gender });
    handleTryoutChange();
  };

  // Group players by grade for organized display
  const getPlayersGroupedByGrade = () => {
    const groupedPlayers: { [key: string]: Player[] } = {};

    availablePlayers.forEach((player) => {
      const grade = player.grade || 'Unknown';
      if (!groupedPlayers[grade]) {
        groupedPlayers[grade] = [];
      }
      groupedPlayers[grade].push(player);
    });

    // Sort grades numerically
    return Object.keys(groupedPlayers)
      .sort((a, b) => {
        const gradeA = parseInt(a) || 0;
        const gradeB = parseInt(b) || 0;
        return gradeA - gradeB;
      })
      .map((grade) => ({
        grade,
        players: groupedPlayers[grade],
      }));
  };

  // Custom filter function for Select component
  const filterOption = (input: string, option?: any) => {
    if (!option) return false;

    const searchText = option.label || option.children;

    if (typeof searchText === 'string') {
      return searchText.toLowerCase().includes(input.toLowerCase());
    }

    return false;
  };

  if (loading) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div id='global-loader'>
            <div className='page-loader'></div>
          </div>
        </div>
      </div>
    );
  }

  // Get the suffix for grade display
  const getGradeSuffix = (grade: string) => {
    const gradeNum = parseInt(grade);
    if (isNaN(gradeNum)) return grade;

    let suffix = 'th';
    if (gradeNum === 1) suffix = 'st';
    else if (gradeNum === 2) suffix = 'nd';
    else if (gradeNum === 3) suffix = 'rd';

    return `${gradeNum}${suffix}`;
  };

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='card'>
          <div className='card-header'>
            <Space>
              <Link to={all_routes.teams}>
                <Button type='text' icon={<ArrowLeftOutlined />}>
                  Back to Teams
                </Button>
              </Link>
              <h4 className='mb-0'>
                {isEdit ? 'Edit Team' : 'Create New Team from Tryouts'}
              </h4>
            </Space>
          </div>

          <div className='card-body'>
            {error && (
              <Alert
                message='Error'
                description={error}
                type='error'
                showIcon
                closable
                onClose={() => setError(null)}
                className='mb-3'
              />
            )}

            <Form form={form} layout='vertical' onFinish={handleSubmit}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label='Team Name'
                    name='name'
                    rules={[
                      { required: true, message: 'Please enter team name' },
                    ]}
                    help="Enter the base team name (e.g., 'Partizan'). The year will be added automatically in displays."
                  >
                    <Input placeholder='Enter team name (e.g., Partizan)' />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    label='Team Year'
                    name='year'
                    rules={[{ required: true, message: 'Please select year' }]}
                    help='This year will be displayed with the team name'
                  >
                    <Select
                      placeholder='Select year'
                      disabled={isEdit} // Disable in edit mode
                    >
                      {(metadata.years || []).map((year: number) => (
                        <Option key={year} value={year}>
                          {year}
                        </Option>
                      ))}
                      {!metadata.years.includes(currentYear) && (
                        <Option value={currentYear}>{currentYear}</Option>
                      )}
                      <Option value={currentYear + 1}>{currentYear + 1}</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item
                    label='Team Grade'
                    name='grade'
                    rules={[{ required: true, message: 'Please select grade' }]}
                  >
                    <Select placeholder='Select grade' disabled={isEdit}>
                      <Option value='1'>1st</Option>
                      <Option value='2'>2nd</Option>
                      <Option value='3'>3rd</Option>
                      <Option value='4'>4th</Option>
                      <Option value='5'>5th</Option>
                      <Option value='6'>6th</Option>
                      <Option value='7'>7th</Option>
                      <Option value='8'>8th</Option>
                      <Option value='9'>9th</Option>
                      <Option value='10'>10th</Option>
                      <Option value='11'>11th</Option>
                      <Option value='12'>12th</Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={6}>
                  <Form.Item
                    label='Team Gender'
                    name='gender'
                    rules={[
                      { required: true, message: 'Please select gender' },
                    ]}
                  >
                    <Select
                      placeholder='Select gender'
                      onChange={handleGenderChange}
                      disabled={isEdit} // Disable in edit mode
                    >
                      <Option value='Male'>Male</Option>
                      <Option value='Female'>Female</Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={6}>
                  <Form.Item
                    label='Tryout Season'
                    name='tryoutSeason'
                    rules={[
                      {
                        required: true,
                        message: 'Please select tryout season',
                      },
                    ]}
                  >
                    <Select
                      placeholder='Select tryout season'
                      onChange={handleTryoutChange}
                      disabled={isEdit} // Disable in edit mode
                    >
                      {(metadata.tryoutSeasons || []).map((season: string) => (
                        <Option key={season} value={season}>
                          {season}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={6}>
                  <Form.Item
                    label='Tryout Year'
                    name='tryoutYear'
                    rules={[
                      { required: true, message: 'Please select tryout year' },
                    ]}
                  >
                    <Select
                      placeholder='Select tryout year'
                      onChange={handleTryoutChange}
                      disabled={isEdit} // Disable in edit mode
                    >
                      {(metadata.years || []).map((year: number) => (
                        <Option key={year} value={year}>
                          {year}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label='Coaches' name='coachIds'>
                    <Select
                      mode='multiple'
                      placeholder='Select coaches'
                      optionFilterProp='children'
                      filterOption={filterOption}
                      showSearch
                    >
                      {availableCoaches.map((coach) => (
                        <Option key={coach._id} value={coach._id}>
                          <Space>
                            <UserOutlined />
                            {coach.fullName} ({coach.email})
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    label='Players'
                    name='playerIds'
                    help={
                      isEdit
                        ? 'Manage players on this team'
                        : 'Select players from all grades who completed tryouts'
                    }
                  >
                    <Select
                      mode='multiple'
                      placeholder={
                        playersLoading
                          ? 'Loading players...'
                          : 'Search and select players from all grades'
                      }
                      showSearch
                      filterOption={filterOption}
                      optionFilterProp='label'
                      loading={playersLoading}
                      style={{ width: '100%' }}
                    >
                      {/* Group players by grade */}
                      {getPlayersGroupedByGrade().map(({ grade, players }) => (
                        <OptGroup
                          key={grade}
                          label={`${getGradeSuffix(grade)} Grade`}
                        >
                          {players.map((player) => (
                            <Select.Option
                              key={player._id}
                              value={player._id}
                              label={`${player.fullName} - ${player.schoolName} (Grade ${player.grade})`}
                            >
                              <Space>
                                <UserOutlined />
                                {player.fullName}
                              </Space>
                            </Select.Option>
                          ))}
                        </OptGroup>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label='Notes' name='notes'>
                <TextArea
                  placeholder='Add any notes about this team...'
                  rows={3}
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type='primary'
                    htmlType='submit'
                    icon={<SaveOutlined />}
                    loading={submitting}
                    size='large'
                    className='btn btn-primary d-flex align-items-center mb-2'
                  >
                    {isEdit ? 'Update Team' : 'Create Team'}
                  </Button>
                  <Link to={all_routes.teams}>
                    <Button
                      className='btn btn-secondary d-flex align-items-center mb-2'
                      size='large'
                    >
                      Cancel
                    </Button>
                  </Link>
                </Space>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamForm;
