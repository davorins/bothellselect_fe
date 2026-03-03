import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Select,
  Space,
  Divider,
  Alert,
  Modal,
  Form,
  InputNumber,
  Tag,
  Dropdown,
  MenuProps,
  message,
  Tooltip,
  Badge,
  Spin,
  Empty,
  Popconfirm,
  Switch,
  Collapse,
  Input,
  Radio,
  TimePicker,
  Table,
  Tabs,
  List,
  Avatar,
  Steps,
  Descriptions,
  DatePicker,
  Checkbox,
  Statistic,
  FormInstance,
} from 'antd';
import {
  DragOutlined,
  TrophyOutlined,
  TeamOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  SaveOutlined,
  ReloadOutlined,
  SettingOutlined,
  UserOutlined,
  ArrowRightOutlined,
  ExportOutlined,
  CopyOutlined,
  UndoOutlined,
  FullscreenOutlined,
  CheckCircleOutlined,
  CrownOutlined,
  PlayCircleOutlined,
  ArrowLeftOutlined,
  WarningOutlined,
  CheckOutlined,
  CalendarOutlined,
  TrophyFilled,
  FireOutlined,
  RocketOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  EditOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import axios from 'axios';
import './BracketBuilder.css';
import dayjs from 'dayjs';
import { debounce } from 'lodash';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { TextArea } = Input;

// ========== INTERFACES ==========
interface Team {
  _id: string;
  name: string;
  grade: string;
  sex: string;
  levelOfCompetition: 'Gold' | 'Silver';
  registrationYear: number;
  tournament: string;
  coachIds?: string[];
  paymentComplete: boolean;
  paymentStatus: string;
  tournaments: any[];
  isActive: boolean;
  [key: string]: any;
}

interface Match {
  _id: string;
  round: number;
  matchNumber: number;
  team1?: Team | null;
  team2?: Team | null;
  team1Score: number;
  team2Score: number;
  winner?: Team | null;
  loser?: Team | null;
  status:
    | 'scheduled'
    | 'in-progress'
    | 'completed'
    | 'cancelled'
    | 'walkover'
    | 'bye';
  scheduledTime?: string;
  court?: string;
  nextMatch?: string;
  bracketType?: 'winners' | 'losers' | 'final';
  walkoverReason?: string;
  actualEndTime?: string;
  [key: string]: any;
}

interface Tournament {
  _id: string;
  name: string;
  year: number;
  status: string;
  registeredTeams: Team[];
  format: string;
  maxTeams: number;
  minTeams: number;
  [key: string]: any;
}

interface TimeSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

interface Court {
  id: string;
  name: string;
  available: boolean;
}

interface ScheduledMatch extends Match {
  timeSlot?: string;
  court?: string;
  scheduledTime?: string;
  day?: string;
  group?: string;
  pool?: string;
  sequence?: number;
  isScheduled: boolean;
}

interface ScheduleConfig {
  date: string;
  startTime: string;
  endTime: string;
  timeSlotDuration: number;
  breakDuration: number;
  courts: Court[];
  maxMatchesPerTeam: number;
}

interface TeamSchedule {
  teamId: string;
  teamName: string;
  matches: {
    timeSlot: string;
    court: string;
    opponent: string;
    matchId: string;
  }[];
}

interface RoundSummary {
  round: number;
  totalMatches: number;
  scheduledMatches: number;
  inProgressMatches: number;
  completedMatches: number;
  walkoverMatches: number;
  byeMatches: number;
  cancelledMatches: number;
  matchesWithWinners: number;
  matchesWithoutWinners: number;
  isRoundComplete: boolean;
  canAdvance: boolean;
  tournamentStatus: string;
  nextRound: number;
  nextRoundExists: boolean;
  winningTeams: Array<{
    id: string;
    name: string;
    matchId: string;
    matchNumber: number;
  }>;
  incompleteMatches: Array<{
    matchId: string;
    matchNumber: number;
    teams: string;
    status: string;
  }>;
  isFinalRound?: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  tournament?: Tournament;
  teams?: Team[];
  matches?: Match[];
  [key: string]: any;
}

interface BracketBuilderProps {
  tournamentId?: string;
  onBack?: () => void;
  onSave?: () => void;
  enableMultiMatchMode?: boolean;
}

interface MatchCreationConfig {
  numMatches: number;
  timeSlot?: string;
  court?: string;
  group?: string;
}

// ========== SCHEDULE BUILDER COMPONENT ==========
interface ScheduleBuilderProps {
  tournamentId: string;
  round: number;
  teams: Team[];
  existingMatches?: Match[];
  onSave: (scheduledMatches: ScheduledMatch[]) => void;
  onCancel: () => void;
}

const ScheduleBuilder: React.FC<ScheduleBuilderProps> = ({
  tournamentId,
  round,
  teams,
  existingMatches = [],
  onSave,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
    date: dayjs().format('YYYY-MM-DD'),
    startTime: '09:00',
    endTime: '21:00',
    timeSlotDuration: 60,
    breakDuration: 0,
    courts: [
      { id: 'court1', name: 'Court 1', available: true },
      { id: 'court2', name: 'Court 2', available: true },
      { id: 'court3', name: 'Court 3', available: true },
    ],
    maxMatchesPerTeam: 4,
  });

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [scheduledMatches, setScheduledMatches] = useState<ScheduledMatch[]>(
    []
  );
  const [teamSchedules, setTeamSchedules] = useState<TeamSchedule[]>([]);
  const [activeTab, setActiveTab] = useState('config');
  const [matchType, setMatchType] = useState<'roundRobin' | 'manual'>(
    'roundRobin'
  );
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const generateTimeSlots = useCallback(() => {
    const slots: TimeSlot[] = [];
    let currentTime = dayjs(
      `${scheduleConfig.date} ${scheduleConfig.startTime}`
    );
    const endTime = dayjs(`${scheduleConfig.date} ${scheduleConfig.endTime}`);

    let slotNumber = 1;
    while (currentTime.isBefore(endTime)) {
      const slotEnd = currentTime.add(
        scheduleConfig.timeSlotDuration,
        'minute'
      );

      if (slotEnd.isAfter(endTime)) break;

      slots.push({
        id: `slot-${slotNumber}`,
        label: currentTime.format('h:mm A'),
        startTime: currentTime.format('HH:mm'),
        endTime: slotEnd.format('HH:mm'),
        available: true,
      });

      currentTime = slotEnd.add(scheduleConfig.breakDuration, 'minute');
      slotNumber++;
    }

    setTimeSlots(slots);
    return slots;
  }, [scheduleConfig]);

  const teamGroups = useMemo(() => {
    const groups: Record<string, Team[]> = {};
    teams.forEach((team) => {
      const key = `${team.grade} ${team.sex}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(team);
    });
    return groups;
  }, [teams]);

  const generateRoundRobinMatches = (
    groupTeams: Team[],
    groupName: string
  ): ScheduledMatch[] => {
    const matches: ScheduledMatch[] = [];
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        matches.push({
          _id: `temp-${groupName}-${i}-${j}-${Date.now()}`,
          round: round,
          matchNumber: matches.length + 1,
          team1: groupTeams[i],
          team2: groupTeams[j],
          team1Score: 0,
          team2Score: 0,
          status: 'scheduled',
          isScheduled: false,
          group: groupName,
          pool: groupName,
        });
      }
    }
    return matches;
  };

  const autoScheduleMatches = () => {
    const allMatches: ScheduledMatch[] = [];
    Object.entries(teamGroups).forEach(([groupName, groupTeams]) => {
      const groupMatches = generateRoundRobinMatches(groupTeams, groupName);
      allMatches.push(...groupMatches);
    });

    const matchesToSchedule =
      existingMatches.length > 0
        ? existingMatches.map((match) => ({
            ...match,
            isScheduled: false,
            group: match.group || 'default',
          }))
        : allMatches;

    const scheduled: ScheduledMatch[] = [];
    const teamMatchCount: Record<string, number> = {};
    const timeSlotAssignments: Record<string, Set<string>> = {};

    timeSlots.forEach((slot) => {
      timeSlotAssignments[slot.id] = new Set();
    });

    const sortedMatches = [...matchesToSchedule].sort((a, b) => {
      const groupA = a.group || '';
      const groupB = b.group || '';
      return groupA.localeCompare(groupB);
    });

    let currentTimeSlotIndex = 0;
    let currentCourtIndex = 0;

    sortedMatches.forEach((match, index) => {
      const team1Id = match.team1?._id;
      const team2Id = match.team2?._id;

      let timeSlotFound = false;
      let attempts = 0;

      while (!timeSlotFound && attempts < timeSlots.length * 2) {
        const timeSlot = timeSlots[currentTimeSlotIndex % timeSlots.length];
        const team1Busy =
          team1Id && timeSlotAssignments[timeSlot.id].has(team1Id);
        const team2Busy =
          team2Id && timeSlotAssignments[timeSlot.id].has(team2Id);

        if (!team1Busy && !team2Busy) {
          const availableCourts = scheduleConfig.courts.filter(
            (c) => c.available
          );
          if (availableCourts.length > 0) {
            const court =
              availableCourts[currentCourtIndex % availableCourts.length];
            const scheduledMatch: ScheduledMatch = {
              ...match,
              _id: match._id || `scheduled-${Date.now()}-${index}`,
              timeSlot: timeSlot.label,
              court: court.name,
              scheduledTime: `${scheduleConfig.date}T${timeSlot.startTime}:00`,
              isScheduled: true,
              sequence: scheduled.length + 1,
              status: 'scheduled',
            };

            scheduled.push(scheduledMatch);
            if (team1Id) {
              timeSlotAssignments[timeSlot.id].add(team1Id);
              teamMatchCount[team1Id] = (teamMatchCount[team1Id] || 0) + 1;
            }
            if (team2Id) {
              timeSlotAssignments[timeSlot.id].add(team2Id);
              teamMatchCount[team2Id] = (teamMatchCount[team2Id] || 0) + 1;
            }

            timeSlotFound = true;
            currentCourtIndex++;
            if (currentCourtIndex % availableCourts.length === 0) {
              currentTimeSlotIndex++;
            }
          }
        }

        if (!timeSlotFound) {
          currentTimeSlotIndex++;
          attempts++;
        }
      }

      if (!timeSlotFound) {
        currentTimeSlotIndex++;
      }
    });

    setScheduledMatches(scheduled);
    generateTeamSchedules(scheduled);
  };

  const generateTeamSchedules = (matches: ScheduledMatch[]) => {
    const schedules: TeamSchedule[] = [];
    const teamMap: Record<string, TeamSchedule> = {};

    matches.forEach((match) => {
      if (match.team1) {
        if (!teamMap[match.team1._id]) {
          teamMap[match.team1._id] = {
            teamId: match.team1._id,
            teamName: match.team1.name,
            matches: [],
          };
        }
        teamMap[match.team1._id].matches.push({
          timeSlot: match.timeSlot || 'TBD',
          court: match.court || 'TBD',
          opponent: match.team2?.name || 'TBD',
          matchId: match._id,
        });
      }

      if (match.team2) {
        if (!teamMap[match.team2._id]) {
          teamMap[match.team2._id] = {
            teamId: match.team2._id,
            teamName: match.team2.name,
            matches: [],
          };
        }
        teamMap[match.team2._id].matches.push({
          timeSlot: match.timeSlot || 'TBD',
          court: match.court || 'TBD',
          opponent: match.team1?.name || 'TBD',
          matchId: match._id,
        });
      }
    });

    setTeamSchedules(Object.values(teamMap));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (
      source.droppableId === 'available-matches' &&
      destination.droppableId.startsWith('slot-')
    ) {
      const [_, slotId, courtId] = destination.droppableId.split('-');
      const matchIndex = parseInt(draggableId.replace('match-', ''));
      const match = scheduledMatches[matchIndex];

      if (match) {
        const timeSlot = timeSlots.find((ts) => ts.id === slotId);
        const court = scheduleConfig.courts.find((c) => c.id === courtId);

        if (timeSlot && court) {
          const updatedMatches = [...scheduledMatches];
          updatedMatches[matchIndex] = {
            ...match,
            timeSlot: timeSlot.label,
            court: court.name,
            scheduledTime: `${scheduleConfig.date}T${timeSlot.startTime}:00`,
            isScheduled: true,
          };
          setScheduledMatches(updatedMatches);
          generateTeamSchedules(updatedMatches);
        }
      }
    }
  };

  const saveSchedule = async () => {
    setLoading(true);
    try {
      const matchesToSave = scheduledMatches.filter((m) => m.isScheduled);
      const response = await axios.post(
        `${API_URL}/tournaments/${tournamentId}/schedule/bulk`,
        {
          matches: matchesToSave.map((match) => ({
            round: match.round,
            matchNumber: match.matchNumber,
            team1: match.team1?._id,
            team2: match.team2?._id,
            timeSlot: match.timeSlot,
            court: match.court,
            scheduledTime: match.scheduledTime,
            status: 'scheduled',
            group: match.group,
            pool: match.pool,
          })),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        message.success(`Schedule saved: ${matchesToSave.length} matches`);
        onSave(matchesToSave);
      } else {
        message.error(response.data.message || 'Failed to save schedule');
      }
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      message.error(error.response?.data?.message || 'Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateTimeSlots();
    if (existingMatches.length > 0) {
      const scheduled = existingMatches.map((match) => ({
        ...match,
        isScheduled: !!match.scheduledTime,
      }));
      setScheduledMatches(scheduled as ScheduledMatch[]);
      generateTeamSchedules(scheduled as ScheduledMatch[]);
    } else {
      autoScheduleMatches();
    }
  }, [generateTimeSlots]);

  const API_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Modal
        title={`Schedule Builder - Round ${round}`}
        open={true}
        onCancel={onCancel}
        width={1400}
        footer={[
          <Button key='cancel' onClick={onCancel}>
            Cancel
          </Button>,
          <Button key='auto' onClick={autoScheduleMatches}>
            Auto Schedule
          </Button>,
          <Button
            key='save'
            type='primary'
            onClick={saveSchedule}
            loading={loading}
          >
            Save Schedule
          </Button>,
        ]}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab='Configuration' key='config'>
            <Card title='Schedule Settings'>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Form.Item label='Date'>
                    <DatePicker
                      value={dayjs(scheduleConfig.date)}
                      onChange={(date) =>
                        setScheduleConfig((prev) => ({
                          ...prev,
                          date: date ? date.format('YYYY-MM-DD') : prev.date,
                        }))
                      }
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='Start Time'>
                    <TimePicker
                      value={dayjs(scheduleConfig.startTime, 'HH:mm')}
                      onChange={(time) =>
                        setScheduleConfig((prev) => ({
                          ...prev,
                          startTime: time
                            ? time.format('HH:mm')
                            : prev.startTime,
                        }))
                      }
                      format='HH:mm'
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='End Time'>
                    <TimePicker
                      value={dayjs(scheduleConfig.endTime, 'HH:mm')}
                      onChange={(time) =>
                        setScheduleConfig((prev) => ({
                          ...prev,
                          endTime: time ? time.format('HH:mm') : prev.endTime,
                        }))
                      }
                      format='HH:mm'
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='Time Slot Duration (minutes)'>
                    <InputNumber
                      value={scheduleConfig.timeSlotDuration}
                      onChange={(value) =>
                        setScheduleConfig((prev) => ({
                          ...prev,
                          timeSlotDuration: value || 60,
                        }))
                      }
                      min={30}
                      max={120}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='Break Duration (minutes)'>
                    <InputNumber
                      value={scheduleConfig.breakDuration}
                      onChange={(value) =>
                        setScheduleConfig((prev) => ({
                          ...prev,
                          breakDuration: value || 0,
                        }))
                      }
                      min={0}
                      max={30}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='Max Matches per Team'>
                    <InputNumber
                      value={scheduleConfig.maxMatchesPerTeam}
                      onChange={(value) =>
                        setScheduleConfig((prev) => ({
                          ...prev,
                          maxMatchesPerTeam: value || 4,
                        }))
                      }
                      min={1}
                      max={6} // Increased max to 6
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Divider>Courts</Divider>
                  <Row gutter={[8, 8]}>
                    {scheduleConfig.courts.map((court, index) => (
                      <Col span={8} key={court.id}>
                        <Card size='small'>
                          <Space>
                            <Input
                              value={court.name}
                              onChange={(e) => {
                                const newCourts = [...scheduleConfig.courts];
                                newCourts[index].name = e.target.value;
                                setScheduleConfig((prev) => ({
                                  ...prev,
                                  courts: newCourts,
                                }));
                              }}
                              placeholder='Court name'
                            />
                            <Switch
                              checked={court.available}
                              onChange={(checked) => {
                                const newCourts = [...scheduleConfig.courts];
                                newCourts[index].available = checked;
                                setScheduleConfig((prev) => ({
                                  ...prev,
                                  courts: newCourts,
                                }));
                              }}
                            />
                            <Button
                              type='text'
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => {
                                const newCourts = scheduleConfig.courts.filter(
                                  (_, i) => i !== index
                                );
                                setScheduleConfig((prev) => ({
                                  ...prev,
                                  courts: newCourts,
                                }));
                              }}
                            />
                          </Space>
                        </Card>
                      </Col>
                    ))}
                    <Col span={8}>
                      <Button
                        type='dashed'
                        block
                        icon={<PlusOutlined />}
                        onClick={() => {
                          const newCourts = [
                            ...scheduleConfig.courts,
                            {
                              id: `court-${Date.now()}`,
                              name: `Court ${scheduleConfig.courts.length + 1}`,
                              available: true,
                            },
                          ];
                          setScheduleConfig((prev) => ({
                            ...prev,
                            courts: newCourts,
                          }));
                        }}
                      >
                        Add Court
                      </Button>
                    </Col>
                  </Row>
                </Col>
                <Col span={24}>
                  <Button type='primary' onClick={generateTimeSlots} block>
                    Generate Time Slots
                  </Button>
                </Col>
              </Row>
            </Card>
          </TabPane>
          <TabPane tab='Schedule Grid' key='grid'>
            <Card title={`Schedule for ${scheduleConfig.date}`}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          padding: '8px',
                          border: '1px solid #f0f0f0',
                          backgroundColor: '#fafafa',
                        }}
                      >
                        Time
                      </th>
                      {scheduleConfig.courts.map((court) => (
                        <th
                          key={court.id}
                          style={{
                            padding: '8px',
                            border: '1px solid #f0f0f0',
                            backgroundColor: '#fafafa',
                          }}
                        >
                          {court.name}
                          {!court.available && (
                            <Tag color='red' style={{ marginLeft: '4px' }}>
                              Unavailable
                            </Tag>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((timeSlot) => (
                      <tr key={timeSlot.id}>
                        <td
                          style={{
                            padding: '8px',
                            border: '1px solid #f0f0f0',
                            backgroundColor: '#fafafa',
                          }}
                        >
                          <Text strong>{timeSlot.label}</Text>
                          <br />
                          <Text type='secondary' style={{ fontSize: '12px' }}>
                            {timeSlot.startTime} - {timeSlot.endTime}
                          </Text>
                        </td>
                        {scheduleConfig.courts.map((court) => {
                          const match = scheduledMatches.find(
                            (m) =>
                              m.timeSlot === timeSlot.label &&
                              m.court === court.name
                          );
                          return (
                            <td
                              key={`${timeSlot.id}-${court.id}`}
                              style={{
                                padding: '8px',
                                border: '1px solid #f0f0f0',
                                minWidth: '250px',
                                backgroundColor: match ? '#f6ffed' : '#fff',
                              }}
                            >
                              <Droppable
                                droppableId={`slot-${timeSlot.id}-${court.id}`}
                                isDropDisabled={!court.available}
                              >
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    style={{
                                      minHeight: '120px',
                                      border: court.available
                                        ? '2px dashed #d9d9d9'
                                        : '2px solid #ffccc7',
                                      borderRadius: '4px',
                                      padding: '8px',
                                      backgroundColor: court.available
                                        ? '#fff'
                                        : '#fff2f0',
                                    }}
                                  >
                                    {match ? (
                                      <Card size='small'>
                                        <div>
                                          <Text strong>
                                            Match {match.matchNumber}
                                          </Text>
                                          {match.group && (
                                            <Tag
                                              color='blue'
                                              style={{ marginLeft: '4px' }}
                                            >
                                              {match.group}
                                            </Tag>
                                          )}
                                        </div>
                                        <Divider style={{ margin: '8px 0' }} />
                                        <div>
                                          <Text strong>
                                            {match.team1?.name}
                                          </Text>
                                          <br />
                                          <Text type='secondary'>vs</Text>
                                          <br />
                                          <Text strong>
                                            {match.team2?.name}
                                          </Text>
                                        </div>
                                        <div style={{ marginTop: '8px' }}>
                                          <Button
                                            size='small'
                                            type='text'
                                            icon={<DeleteOutlined />}
                                            onClick={() => {
                                              const updatedMatches =
                                                scheduledMatches.map((m) =>
                                                  m._id === match._id
                                                    ? {
                                                        ...m,
                                                        timeSlot: undefined,
                                                        court: undefined,
                                                        isScheduled: false,
                                                      }
                                                    : m
                                                );
                                              setScheduledMatches(
                                                updatedMatches
                                              );
                                              generateTeamSchedules(
                                                updatedMatches
                                              );
                                            }}
                                          >
                                            Remove
                                          </Button>
                                        </div>
                                      </Card>
                                    ) : (
                                      <div
                                        style={{
                                          textAlign: 'center',
                                          padding: '16px 0',
                                        }}
                                      >
                                        {court.available ? (
                                          <>
                                            <DragOutlined
                                              style={{
                                                color: '#999',
                                                fontSize: '24px',
                                              }}
                                            />
                                            <Text
                                              type='secondary'
                                              style={{
                                                display: 'block',
                                                marginTop: '8px',
                                              }}
                                            >
                                              Drag match here
                                            </Text>
                                          </>
                                        ) : (
                                          <Text type='secondary'>
                                            Court unavailable
                                          </Text>
                                        )}
                                      </div>
                                    )}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabPane>
          <TabPane tab='Available Matches' key='matches'>
            <Card title='Matches to Schedule'>
              <Droppable droppableId='available-matches'>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(300px, 1fr))',
                      gap: '16px',
                      padding: '8px',
                      minHeight: '400px',
                      border: '1px dashed #d9d9d9',
                      borderRadius: '4px',
                    }}
                  >
                    {scheduledMatches
                      .filter((m) => !m.isScheduled)
                      .map((match, index) => (
                        <Draggable
                          key={match._id}
                          draggableId={`match-${index}`}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                cursor: 'move',
                              }}
                            >
                              <Card size='small'>
                                <div>
                                  <Text strong>Match {match.matchNumber}</Text>
                                  {match.group && (
                                    <Tag
                                      color='blue'
                                      style={{ marginLeft: '4px' }}
                                    >
                                      {match.group}
                                    </Tag>
                                  )}
                                </div>
                                <Divider style={{ margin: '8px 0' }} />
                                <div>
                                  <Text strong>{match.team1?.name}</Text>
                                  <Tag
                                    color={
                                      match.team1?.levelOfCompetition === 'Gold'
                                        ? 'gold'
                                        : 'default'
                                    }
                                    style={{ marginLeft: '4px' }}
                                  >
                                    {match.team1?.levelOfCompetition}
                                  </Tag>
                                  <br />
                                  <Text type='secondary'>vs</Text>
                                  <br />
                                  <Text strong>{match.team2?.name}</Text>
                                  <Tag
                                    color={
                                      match.team2?.levelOfCompetition === 'Gold'
                                        ? 'gold'
                                        : 'default'
                                    }
                                    style={{ marginLeft: '4px' }}
                                  >
                                    {match.team2?.levelOfCompetition}
                                  </Tag>
                                </div>
                                <div style={{ marginTop: '8px' }}>
                                  <Text
                                    type='secondary'
                                    style={{ fontSize: '12px' }}
                                  >
                                    Drag to schedule
                                  </Text>
                                </div>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <Divider />
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Button
                    type='dashed'
                    block
                    icon={<PlusOutlined />}
                    onClick={() => {
                      const newMatch: ScheduledMatch = {
                        _id: `new-match-${Date.now()}`,
                        round: round,
                        matchNumber: scheduledMatches.length + 1,
                        team1: undefined,
                        team2: undefined,
                        team1Score: 0,
                        team2Score: 0,
                        status: 'scheduled',
                        isScheduled: false,
                      };
                      setScheduledMatches([...scheduledMatches, newMatch]);
                    }}
                  >
                    Add New Match
                  </Button>
                </Col>
                <Col span={12}>
                  <Select
                    value={selectedGroup}
                    onChange={setSelectedGroup}
                    style={{ width: '100%' }}
                    placeholder='Filter by group'
                  >
                    <Option value='all'>All Groups</Option>
                    {Object.keys(teamGroups).map((group) => (
                      <Option key={group} value={group}>
                        {group}
                      </Option>
                    ))}
                  </Select>
                </Col>
              </Row>
            </Card>
          </TabPane>
          <TabPane tab='Team Schedules' key='teams'>
            <Card title='Team Match Schedules'>
              <Table
                dataSource={teamSchedules}
                columns={[
                  {
                    title: 'Team',
                    dataIndex: 'teamName',
                    key: 'teamName',
                    render: (text, record) => (
                      <Space>
                        <Text strong>{text}</Text>
                        <Tag color='blue'>
                          {teams.find((t) => t._id === record.teamId)?.grade}{' '}
                          {teams.find((t) => t._id === record.teamId)?.sex}
                        </Tag>
                      </Space>
                    ),
                  },
                  {
                    title: 'Matches Scheduled',
                    dataIndex: 'matches',
                    key: 'matches',
                    render: (matches) => (
                      <Badge count={matches.length} showZero />
                    ),
                  },
                  {
                    title: 'Schedule',
                    key: 'schedule',
                    render: (_, record) => (
                      <List
                        size='small'
                        dataSource={record.matches}
                        renderItem={(item) => (
                          <List.Item>
                            <Space>
                              <Tag color='blue'>{item.timeSlot}</Tag>
                              <Tag color='green'>{item.court}</Tag>
                              <Text>vs {item.opponent}</Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    ),
                  },
                ]}
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </TabPane>
        </Tabs>
      </Modal>
    </DragDropContext>
  );
};

// ========== WINNER DECLARATION MODAL ==========
interface WinnerDeclarationModalProps {
  match: Match;
  visible: boolean;
  onCancel: () => void;
  onDeclareWinner: (
    matchId: string,
    winnerId: string,
    scores: { team1Score: number; team2Score: number },
    isWalkover: boolean
  ) => Promise<void>;
}

const WinnerDeclarationModal: React.FC<WinnerDeclarationModalProps> = ({
  match,
  visible,
  onCancel,
  onDeclareWinner,
}) => {
  const [team1Score, setTeam1Score] = useState<number>(0);
  const [team2Score, setTeam2Score] = useState<number>(0);
  const [isWalkover, setIsWalkover] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const hasBothTeams = match.team1 && match.team2;

  const getWinnerId = () => {
    if (!hasBothTeams) return null;

    if (isWalkover) {
      if (team1Score === 1 && team2Score === 0) return match.team1!._id;
      if (team1Score === 0 && team2Score === 1) return match.team2!._id;
      return null;
    }

    if (team1Score > team2Score) return match.team1!._id;
    if (team2Score > team1Score) return match.team2!._id;
    return null;
  };

  const handleSubmit = async () => {
    if (!hasBothTeams) {
      message.warning('Both teams must be assigned');
      return;
    }

    const winnerId = getWinnerId();
    if (!winnerId) {
      if (team1Score === team2Score) {
        message.warning(
          'Scores cannot be equal. Please adjust scores or mark as walkover.'
        );
      } else {
        message.warning('Please enter valid scores');
      }
      return;
    }

    setLoading(true);
    try {
      await onDeclareWinner(
        match._id,
        winnerId,
        {
          team1Score: isWalkover
            ? winnerId === match.team1!._id
              ? 1
              : 0
            : team1Score,
          team2Score: isWalkover
            ? winnerId === match.team2!._id
              ? 1
              : 0
            : team2Score,
        },
        isWalkover
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setTeam1Score(0);
      setTeam2Score(0);
      setIsWalkover(false);
    }
  }, [visible]);

  if (!hasBothTeams) {
    return (
      <Modal
        title={`Declare Winner - Match ${match.matchNumber}`}
        open={visible}
        onCancel={onCancel}
        footer={[
          <Button key='cancel' onClick={onCancel}>
            Cancel
          </Button>,
        ]}
      >
        <Alert
          type='warning'
          message='Cannot Declare Winner'
          description='Both teams must be assigned to this match before declaring a winner.'
        />
      </Modal>
    );
  }

  const winnerId = getWinnerId();
  const isTeam1Winning = winnerId === match.team1!._id;
  const isTeam2Winning = winnerId === match.team2!._id;

  return (
    <Modal
      title={`Declare Winner - Match ${match.matchNumber}`}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key='cancel' onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key='submit'
          type='primary'
          onClick={handleSubmit}
          loading={loading}
          disabled={!winnerId}
        >
          {isWalkover ? 'Declare Walkover' : 'Declare Winner'}
        </Button>,
      ]}
      width={600}
    >
      <div style={{ padding: '20px' }}>
        <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
          <Col span={10}>
            <Card
              size='small'
              style={{
                border: isTeam1Winning
                  ? '2px solid #52c41a'
                  : '1px solid #d9d9d9',
                backgroundColor: isTeam1Winning ? '#f6ffed' : 'white',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <Title level={5}>{match.team1!.name}</Title>
                <Tag
                  color={
                    match.team1!.levelOfCompetition === 'Gold'
                      ? 'gold'
                      : 'default'
                  }
                >
                  {match.team1!.levelOfCompetition}
                </Tag>
                <div style={{ marginTop: '10px' }}>
                  <InputNumber
                    min={0}
                    max={100}
                    value={team1Score}
                    onChange={(value) => value !== null && setTeam1Score(value)}
                    placeholder='Score'
                    style={{ width: '100%' }}
                    disabled={isWalkover}
                  />
                </div>
                {isTeam1Winning && !isWalkover && (
                  <Tag color='success' style={{ marginTop: '8px' }}>
                    WINNING
                  </Tag>
                )}
              </div>
            </Card>
          </Col>
          <Col span={4} style={{ textAlign: 'center', paddingTop: '40px' }}>
            <Title level={2}>VS</Title>
          </Col>
          <Col span={10}>
            <Card
              size='small'
              style={{
                border: isTeam2Winning
                  ? '2px solid #52c41a'
                  : '1px solid #d9d9d9',
                backgroundColor: isTeam2Winning ? '#f6ffed' : 'white',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <Title level={5}>{match.team2!.name}</Title>
                <Tag
                  color={
                    match.team2!.levelOfCompetition === 'Gold'
                      ? 'gold'
                      : 'default'
                  }
                >
                  {match.team2!.levelOfCompetition}
                </Tag>
                <div style={{ marginTop: '10px' }}>
                  <InputNumber
                    min={0}
                    max={100}
                    value={team2Score}
                    onChange={(value) => value !== null && setTeam2Score(value)}
                    placeholder='Score'
                    style={{ width: '100%' }}
                    disabled={isWalkover}
                  />
                </div>
                {isTeam2Winning && !isWalkover && (
                  <Tag color='success' style={{ marginTop: '8px' }}>
                    WINNING
                  </Tag>
                )}
              </div>
            </Card>
          </Col>
        </Row>

        <div style={{ marginBottom: '20px' }}>
          <Switch
            checked={isWalkover}
            onChange={setIsWalkover}
            checkedChildren='Walkover'
            unCheckedChildren='Normal Match'
          />
          <Text type='secondary' style={{ marginLeft: '10px' }}>
            {isWalkover
              ? 'Mark as walkover (winner gets 1-0 score automatically)'
              : 'Normal match - higher score wins'}
          </Text>
        </div>

        {isWalkover && (
          <div style={{ marginBottom: '20px' }}>
            <Alert
              type='info'
              message='Select which team gets the walkover win:'
              style={{ marginBottom: '10px' }}
            />
            <Radio.Group
              value={winnerId || undefined}
              onChange={(e) => {
                const selectedWinnerId = e.target.value;
                if (selectedWinnerId === match.team1!._id) {
                  setTeam1Score(1);
                  setTeam2Score(0);
                } else {
                  setTeam1Score(0);
                  setTeam2Score(1);
                }
              }}
            >
              <Radio value={match.team1!._id}>
                {match.team1!.name} wins by walkover (1-0)
              </Radio>
              <Radio value={match.team2!._id} style={{ marginTop: '8px' }}>
                {match.team2!.name} wins by walkover (1-0)
              </Radio>
            </Radio.Group>
          </div>
        )}

        {winnerId && !isWalkover && (
          <Alert
            type='success'
            message={`${
              match.team1!._id === winnerId
                ? match.team1!.name
                : match.team2!.name
            } will be declared the winner`}
            description={`Score: ${team1Score} - ${team2Score}`}
            style={{ marginBottom: '10px' }}
          />
        )}
      </div>
    </Modal>
  );
};

// ========== MATCH CREATION MODAL ==========
interface MatchCreationModalProps {
  visible: boolean;
  onCancel: () => void;
  onCreate: (config: MatchCreationConfig) => Promise<void>;
  availableTeams: number;
  loading?: boolean;
}

const MatchCreationModal: React.FC<MatchCreationModalProps> = ({
  visible,
  onCancel,
  onCreate,
  availableTeams,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [quickTimeSlots] = useState<string[]>([
    '9am',
    '10am',
    '11am',
    '12pm',
    '1pm',
    '2pm',
    '3pm',
    '4pm',
    '5pm',
    '6pm',
    '7pm',
    '8pm',
    '9pm',
  ]);
  const [courts] = useState<string[]>([
    'Main Court #1',
    'Main Court #2',
    'Auxiliary Court',
  ]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onCreate(values);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <Modal
      title='Create Matches'
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
    >
      <Form form={form} layout='vertical' initialValues={{ numMatches: 1 }}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Alert
              type='info'
              message='Initial Setup Only'
              description='You can create as many matches as needed for the first round. Once teams are assigned and matches start, adding new matches will be restricted.'
              style={{ marginBottom: 16 }}
            />
          </Col>

          <Col span={12}>
            <Form.Item
              name='numMatches'
              label='Number of Matches'
              rules={[
                { required: true, message: 'Please enter number of matches' },
                {
                  type: 'number',
                  min: 1,
                  max: 100,
                  message: 'Must be between 1 and 100',
                },
              ]}
            >
              <InputNumber
                min={1}
                max={100}
                style={{ width: '100%' }}
                placeholder='e.g., 12'
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item name='timeSlot' label='Time Slot'>
              <Select placeholder='Select time slot' allowClear>
                {quickTimeSlots.map((slot) => (
                  <Option key={slot} value={slot}>
                    {slot}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item name='court' label='Court'>
              <Select placeholder='Select court' allowClear>
                {courts.map((court) => (
                  <Option key={court} value={court}>
                    {court}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item name='group' label='Group/Pool'>
              <Select placeholder='Select group'>
                <Option value='main'>Main</Option>
                <Option value='auxiliary'>Auxiliary</Option>
                <Option value='gold'>Gold Division</Option>
                <Option value='silver'>Silver Division</Option>
                <Option value='boys'>Boys</Option>
                <Option value='girls'>Girls</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col span={24}>
            <Alert
              type={availableTeams >= 2 ? 'success' : 'warning'}
              message='Available Teams Check'
              description={
                availableTeams >= 2
                  ? `You have ${availableTeams} teams available. Each match requires 2 teams.`
                  : `You have ${availableTeams} team(s) available. Need at least 2 teams to create matches.`
              }
            />
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

// ========== MAIN COMPONENT ==========
const EnhancedBracketBuilder: React.FC<BracketBuilderProps> = ({
  tournamentId,
  onBack,
  onSave,
  enableMultiMatchMode = false,
}) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(
    tournamentId || null
  );
  const [selectedTournamentData, setSelectedTournamentData] =
    useState<Tournament | null>(null);
  const [registeredTeams, setRegisteredTeams] = useState<Team[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [matchesByRound, setMatchesByRound] = useState<
    Record<number, ScheduledMatch[]>
  >({});
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showScheduleBuilder, setShowScheduleBuilder] =
    useState<boolean>(false);
  const [declaringWinner, setDeclaringWinner] = useState<string | null>(null);
  const [roundSummary, setRoundSummary] = useState<RoundSummary | null>(null);
  const [activeTab, setActiveTab] = useState<string>('bracket');
  const [advancingRound, setAdvancingRound] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [dragKey, setDragKey] = useState<number>(0);
  const [tournamentMode, setTournamentMode] = useState<
    'singleElimination' | 'multiMatch'
  >(enableMultiMatchMode ? 'multiMatch' : 'singleElimination');
  const [showMatchCreation, setShowMatchCreation] = useState<boolean>(false);
  const [maxMatchesPerTeam, setMaxMatchesPerTeam] = useState<number>(4);

  const API_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  // Helper functions
  const checkRoundCompletion = (matches: ScheduledMatch[]): boolean => {
    if (!matches || matches.length === 0) return false;
    return matches.every((match) => {
      if (match.status === 'completed' || match.status === 'walkover') {
        return !!match.winner && match.winner._id;
      }
      if (match.status === 'bye') {
        return !!(match.team1 || match.team2);
      }
      if (match.status === 'cancelled') {
        return true;
      }
      return false;
    });
  };

  const countWinningTeams = (matches: ScheduledMatch[]): number => {
    const winners = new Set<string>();
    matches.forEach((match) => {
      if (match.status === 'completed' || match.status === 'walkover') {
        if (match.winner && match.winner._id) {
          winners.add(match.winner._id);
        }
      } else if (match.status === 'bye') {
        if (match.team1 && match.team1._id) {
          winners.add(match.team1._id);
        } else if (match.team2 && match.team2._id) {
          winners.add(match.team2._id);
        }
      }
    });
    return winners.size;
  };

  const getAuthHeader = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  // Fetch tournaments
  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const response = await axios.get<ApiResponse<Tournament[]>>(
        `${API_URL}/tournaments`,
        getAuthHeader()
      );
      if (response.data.success) {
        const tournamentsData: Tournament[] =
          response.data.data || response.data.tournaments || [];
        setTournaments(tournamentsData);
        if (selectedTournament) {
          const tournament = tournamentsData.find(
            (t: Tournament) => t._id === selectedTournament
          );
          if (tournament) {
            setSelectedTournamentData(tournament);
          }
        }
      } else {
        message.error(response.data.message || 'Failed to fetch tournaments');
      }
    } catch (error: any) {
      console.error('Error fetching tournaments:', error);
      message.error(
        error.response?.data?.message || 'Failed to fetch tournaments'
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch registered teams
  const fetchRegisteredTeams = async () => {
    if (!selectedTournament) return;

    try {
      const response = await axios.get<ApiResponse>(
        `${API_URL}/tournaments/${selectedTournament}/registered-teams`,
        getAuthHeader()
      );

      if (response.data.success) {
        const teams = response.data.teams || response.data.data || [];
        const transformedTeams = teams.map(
          (team: any): Team => ({
            _id: team._id,
            name: team.name || 'Unknown Team',
            grade: team.grade || '',
            sex: team.sex || '',
            levelOfCompetition:
              team.levelOfCompetition === 'Gold' ? 'Gold' : 'Silver',
            tournament: team.tournament || '',
            coachIds: team.coachIds || [],
            isActive: team.isActive !== false,
            tournaments: team.tournaments || [],
            registrationYear: team.registrationYear || new Date().getFullYear(),
            paymentComplete: team.paymentComplete || false,
            paymentStatus: team.paymentStatus || 'pending',
          })
        );

        setRegisteredTeams(transformedTeams);

        // Initialize available teams based on tournament mode
        if (currentRound === 1) {
          if (tournamentMode === 'singleElimination') {
            // In single elimination round 1, all teams are available
            setAvailableTeams(transformedTeams);
          } else {
            // In multi-match mode, all teams are available but will be managed differently
            setAvailableTeams(transformedTeams);
          }
        } else {
          // For rounds > 1, available teams should be winners from previous round
          updateAvailableTeamsForRound(
            currentRound,
            matchesByRound[currentRound] || []
          );
        }
      }
    } catch (error: any) {
      console.error('Error fetching registered teams:', error);
      message.error(
        error.response?.data?.message || 'Failed to fetch registered teams'
      );
    }
  };

  // Fetch matches for a round
  const fetchMatchesForRound = async (round: number) => {
    if (!selectedTournament) return;

    try {
      const response = await axios.get<ApiResponse<Match[]>>(
        `${API_URL}/tournaments/${selectedTournament}/bracket/round/${round}`,
        getAuthHeader()
      );

      if (response.data.success) {
        const matches = response.data.data || response.data.matches || [];
        const scheduledMatches: ScheduledMatch[] = matches.map((match) => ({
          ...match,
          isScheduled: !!match.scheduledTime || !!match.timeSlot,
          timeSlot: match.timeSlot || '',
          court: match.court || '',
          group: match.group || '',
          pool: match.pool || '',
          sequence: match.sequence || 0,
        }));

        setMatchesByRound((prev) => ({
          ...prev,
          [round]: scheduledMatches,
        }));

        updateAvailableTeamsForRound(round, scheduledMatches);
      } else {
        setMatchesByRound((prev) => ({
          ...prev,
          [round]: [],
        }));
      }
    } catch (error: any) {
      console.error(`Error fetching matches for round ${round}:`, error);
      setMatchesByRound((prev) => ({
        ...prev,
        [round]: [],
      }));
    }
  };

  // Update available teams based on tournament mode
  const updateAvailableTeamsForRound = useCallback(
    (round: number, matches: ScheduledMatch[]) => {
      // Create a set of assigned team IDs
      const assignedTeamIds = new Set<string>();
      matches.forEach((match) => {
        if (match.team1) assignedTeamIds.add(match.team1._id);
        if (match.team2) assignedTeamIds.add(match.team2._id);
      });

      if (tournamentMode === 'singleElimination') {
        // SINGLE ELIMINATION LOGIC
        if (round === 1) {
          // Round 1: All registered teams not assigned
          const available = registeredTeams.filter(
            (team) => !assignedTeamIds.has(team._id)
          );
          setAvailableTeams(available);
        } else {
          // Round > 1: Only winners from previous round
          const previousRound = round - 1;
          const previousMatches = matchesByRound[previousRound] || [];

          const winningTeamIds = new Set<string>();
          previousMatches.forEach((match) => {
            if (match.status === 'completed' || match.status === 'walkover') {
              if (match.winner) winningTeamIds.add(match.winner._id);
            } else if (match.status === 'bye') {
              if (match.team1) winningTeamIds.add(match.team1._id);
              else if (match.team2) winningTeamIds.add(match.team2._id);
            }
          });

          const available = registeredTeams.filter(
            (team) =>
              winningTeamIds.has(team._id) && !assignedTeamIds.has(team._id)
          );
          setAvailableTeams(available);
        }
      } else {
        // MULTI-MATCH LOGIC
        const teamAssignmentCounts: Record<string, number> = {};
        matches.forEach((match) => {
          if (match.team1) {
            teamAssignmentCounts[match.team1._id] =
              (teamAssignmentCounts[match.team1._id] || 0) + 1;
          }
          if (match.team2) {
            teamAssignmentCounts[match.team2._id] =
              (teamAssignmentCounts[match.team2._id] || 0) + 1;
          }
        });

        // Teams are available if they have less than maxMatchesPerTeam matches in this round
        // IMPORTANT: Include ALL registered teams, even if they have matches
        const availableForMoreMatches = registeredTeams.filter((team) => {
          const assignmentCount = teamAssignmentCounts[team._id] || 0;
          // In multi-match mode, teams can appear in multiple matches
          // So we show them even if they already have matches, as long as they're under the limit
          return assignmentCount < maxMatchesPerTeam;
        });

        setAvailableTeams(availableForMoreMatches);
      }
    },
    [registeredTeams, matchesByRound, tournamentMode, maxMatchesPerTeam]
  );

  const refreshAllData = useCallback(
    async (roundToRefresh?: number) => {
      if (!selectedTournament) return;

      // Prevent multiple simultaneous refreshes
      if (loading) return;

      try {
        setLoading(true);

        // Fetch matches first, then update available teams
        await fetchMatchesForRound(roundToRefresh || currentRound);

        // Update available teams after fetching matches
        updateAvailableTeamsForRound(
          roundToRefresh || currentRound,
          matchesByRound[roundToRefresh || currentRound] || []
        );
      } catch (error) {
        console.error('Error refreshing data:', error);
      } finally {
        setLoading(false);
      }
    },
    [
      selectedTournament,
      currentRound,
      loading,
      updateAvailableTeamsForRound,
      matchesByRound,
    ]
  );

  // Initial fetch
  useEffect(() => {
    fetchTournaments();
  }, []);

  const debouncedRefresh = useCallback(
    debounce(async (roundToRefresh?: number) => {
      await refreshAllData(roundToRefresh);
    }, 300),
    [refreshAllData]
  );

  // Fetch data when tournament or round changes
  useEffect(() => {
    if (selectedTournament) {
      fetchRegisteredTeams();
      debouncedRefresh();
    }

    // Cleanup
    return () => {
      debouncedRefresh.cancel();
    };
  }, [selectedTournament, currentRound]);

  // Handle drag and drop
  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { source, destination, draggableId } = result;

      if (!destination) return;

      if (
        source.droppableId === 'availableTeams' &&
        destination.droppableId.startsWith('match-')
      ) {
        const [_, matchId, position] = destination.droppableId.split('-');

        try {
          const team = availableTeams.find((t) => t._id === draggableId);
          if (!team) {
            message.error('Team not found');
            return;
          }

          // SINGLE ELIMINATION VALIDATION
          if (tournamentMode === 'singleElimination') {
            const currentMatches = matchesByRound[currentRound] || [];

            // Check if team is already in a match this round
            const isTeamAlreadyAssigned = currentMatches.some((match) => {
              if (match._id === matchId) return false; // Skip the match we're assigning to
              return (
                (match.team1 && match.team1._id === draggableId) ||
                (match.team2 && match.team2._id === draggableId)
              );
            });

            if (isTeamAlreadyAssigned) {
              message.error(
                `Team ${team.name} is already assigned to a match in this round`
              );
              return;
            }

            // For round 2+, check if team is a winner from previous round
            if (currentRound > 1) {
              const previousRound = currentRound - 1;
              const previousMatches = matchesByRound[previousRound] || [];

              const isWinner = previousMatches.some((match) => {
                if (
                  match.status === 'completed' ||
                  match.status === 'walkover'
                ) {
                  return match.winner && match.winner._id === draggableId;
                } else if (match.status === 'bye') {
                  return (
                    (match.team1 && match.team1._id === draggableId) ||
                    (match.team2 && match.team2._id === draggableId)
                  );
                }
                return false;
              });

              if (!isWinner) {
                message.error(
                  `Team ${team.name} did not win in round ${previousRound}. Only winning teams can advance.`
                );
                return;
              }
            }
          }

          // MULTI-MATCH VALIDATION
          if (tournamentMode === 'multiMatch') {
            const currentMatches = matchesByRound[currentRound] || [];

            // Count how many times this team is already assigned in current round
            const teamMatchCount = currentMatches.reduce((count, match) => {
              if (match.team1 && match.team1._id === draggableId) count++;
              if (match.team2 && match.team2._id === draggableId) count++;
              return count;
            }, 0);

            // If team already has maxMatchesPerTeam matches, don't allow more
            if (teamMatchCount >= maxMatchesPerTeam) {
              message.error(
                `Team ${team.name} already has ${teamMatchCount} matches assigned (max: ${maxMatchesPerTeam})`
              );
              return;
            }
          }

          // Update match via API
          await axios.patch(
            `${API_URL}/tournaments/match/${matchId}/teams`,
            {
              [position]: draggableId,
              position: position,
            },
            getAuthHeader()
          );

          // Update local state
          setMatchesByRound((prev) => {
            const currentMatches = prev[currentRound] || [];
            const updatedMatches = currentMatches.map((match) => {
              if (match._id === matchId) {
                const updatedMatch = {
                  ...match,
                  [position]: team,
                };

                const otherPosition = position === 'team1' ? 'team2' : 'team1';
                const otherTeam = match[otherPosition];

                if (team && otherTeam) {
                  updatedMatch.status = 'scheduled';
                } else if (team || otherTeam) {
                  updatedMatch.status = 'bye';
                } else {
                  updatedMatch.status = 'scheduled';
                }

                return updatedMatch;
              }
              return match;
            });
            return { ...prev, [currentRound]: updatedMatches };
          });

          message.success(`Team ${team.name} assigned to match`);

          // IMPORTANT: Refresh the data to update available teams
          await refreshAllData(currentRound);
          setDragKey((prev) => prev + 1);
        } catch (error: any) {
          console.error('Error assigning team:', error);
          message.error(
            error.response?.data?.message || 'Failed to assign team to match'
          );
        }
      }
    },
    [
      currentRound,
      availableTeams,
      matchesByRound,
      selectedTournament,
      refreshAllData,
      tournamentMode,
      maxMatchesPerTeam,
    ]
  );

  // Create initial matches
  const createInitialMatches = async (config: MatchCreationConfig) => {
    if (!selectedTournament || !selectedTournamentData) {
      console.error('No tournament selected');
      return;
    }

    setIsGenerating(true);
    try {
      const existingMatches = matchesByRound[currentRound] || [];
      const nextMatchNumber =
        existingMatches.length > 0
          ? Math.max(...existingMatches.map((m) => m.matchNumber)) + 1
          : 1;

      const matches = Array.from({ length: config.numMatches }, (_, index) => ({
        matchNumber: nextMatchNumber + index,
        team1: null,
        team2: null,
        bracketType: 'winners' as const,
        status: 'scheduled' as const,
        timeSlot: config.timeSlot,
        court: config.court,
        group: config.group,
      }));

      const response = await axios.post(
        `${API_URL}/tournaments/${selectedTournament}/bracket/round/${currentRound}`,
        {
          matches,
          roundNumber: currentRound,
        },
        getAuthHeader()
      );

      if (response.data.success) {
        await fetchMatchesForRound(currentRound);
        message.success(
          `Created ${config.numMatches} matches for round ${currentRound}`
        );
        setShowMatchCreation(false);
      } else {
        message.error(response.data.message || 'Failed to create matches');
      }
    } catch (error: any) {
      console.error('Error creating matches:', error);
      message.error(
        error.response?.data?.message || 'Failed to create matches'
      );
    } finally {
      setIsGenerating(false);
      await refreshAllData();
    }
  };

  // Add individual match
  const addSingleMatch = async (
    timeSlot?: string,
    court?: string,
    group?: string
  ) => {
    if (!selectedTournament) return;

    try {
      const existingMatches = matchesByRound[currentRound] || [];
      const nextMatchNumber =
        existingMatches.length > 0
          ? Math.max(...existingMatches.map((m) => m.matchNumber)) + 1
          : 1;

      const response = await axios.post(
        `${API_URL}/tournaments/${selectedTournament}/bracket/round/${currentRound}/single`,
        {
          matchNumber: nextMatchNumber,
          timeSlot,
          court,
          group,
          bracketType: 'winners',
          status: 'scheduled',
        },
        getAuthHeader()
      );

      if (response.data.success) {
        await fetchMatchesForRound(currentRound);
        message.success('Match added successfully');
      }
    } catch (error: any) {
      console.error('Error adding match:', error);
      message.error(error.response?.data?.message || 'Failed to add match');
    }
  };

  // Clear current round
  const clearCurrentRound = async () => {
    if (!selectedTournament) return;

    Modal.confirm({
      title: 'Clear Round Matches',
      content: 'Are you sure you want to clear all matches for this round?',
      okText: 'Yes, Clear Round',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const response = await axios.delete(
            `${API_URL}/tournaments/${selectedTournament}/bracket/round/${currentRound}`,
            getAuthHeader()
          );
          if (response.data.success) {
            setMatchesByRound((prev) => ({ ...prev, [currentRound]: [] }));
            setRoundSummary(null);
            message.success('Round cleared successfully');
            await refreshAllData();
          }
        } catch (error: any) {
          message.error(
            error.response?.data?.message || 'Failed to clear round'
          );
        }
      },
    });
  };

  // Open schedule builder
  const openScheduleBuilder = () => {
    if (availableTeams.length === 0) {
      message.warning('No teams available to create schedule');
      return;
    }
    setShowScheduleBuilder(true);
  };

  // Handle schedule saved
  const handleScheduleSaved = (scheduledMatches: ScheduledMatch[]) => {
    setMatchesByRound((prev) => ({
      ...prev,
      [currentRound]: scheduledMatches,
    }));

    // Update available teams
    updateAvailableTeamsForRound(currentRound, scheduledMatches);
    setShowScheduleBuilder(false);
    message.success('Schedule saved successfully');
  };

  // Render match card
  const renderMatchCard = (match: ScheduledMatch) => {
    const isCompleted =
      match.status === 'completed' || match.status === 'walkover';
    const hasBothTeams = match.team1 && match.team2;
    const isBye = match.status === 'bye';

    return (
      <div
        key={match._id}
        className='match-container'
        style={{ marginBottom: '16px' }}
      >
        <Card
          size='small'
          className={`match-card ${isCompleted ? 'completed' : ''} ${
            isBye ? 'bye' : ''
          }`}
          title={
            <div className='match-header'>
              <Space>
                <Text strong style={{ fontSize: '14px' }}>
                  Match {match.matchNumber}
                </Text>
                {match.timeSlot && (
                  <Tag color='blue' icon={<ClockCircleOutlined />}>
                    {match.timeSlot}
                  </Tag>
                )}
                {match.court && <Tag color='green'>{match.court}</Tag>}
              </Space>
            </div>
          }
          extra={
            <Space>
              {match.group && <Tag color='purple'>{match.group}</Tag>}
              {isCompleted ? (
                <>
                  <Tag color='success'>Winner: {match.winner?.name}</Tag>
                  <Tooltip title='Reset result'>
                    <Button
                      type='text'
                      size='small'
                      danger
                      icon={<UndoOutlined />}
                      onClick={() => resetMatch(match._id)}
                    />
                  </Tooltip>
                </>
              ) : isBye ? (
                <Tag color='orange'>Bye - No Match</Tag>
              ) : (
                <Tooltip
                  title={
                    hasBothTeams ? 'Declare winner' : 'Assign both teams first'
                  }
                >
                  <Button
                    type='primary'
                    size='small'
                    icon={<CrownOutlined />}
                    onClick={() => openDeclareWinnerModal(match)}
                    disabled={!hasBothTeams}
                  >
                    Declare Winner
                  </Button>
                </Tooltip>
              )}
            </Space>
          }
        >
          {/* Schedule info */}
          {match.timeSlot && (
            <div
              style={{
                padding: '8px',
                backgroundColor: '#f0f8ff',
                borderRadius: '4px',
                marginBottom: '8px',
              }}
            >
              <Row gutter={8}>
                <Col span={12}>
                  <Text strong>Time:</Text> {match.timeSlot}
                </Col>
                <Col span={12}>
                  <Text strong>Court:</Text> {match.court || 'TBD'}
                </Col>
              </Row>
            </div>
          )}

          {/* Team slots - Desktop layout (side by side) */}
          <div className='match-teams-container'>
            {/* Mobile: Stacked layout */}
            <div className='match-teams-mobile'>
              {/* Team 1 Slot */}
              <Droppable
                key={`${match._id}-team1-${dragKey}`}
                droppableId={`match-${match._id}-team1`}
                type='team'
              >
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      minHeight: '60px',
                      border: match.team1
                        ? '1px solid #d9d9d9'
                        : '2px dashed #d9d9d9',
                      borderRadius: '4px',
                      padding: '8px',
                      marginBottom: '8px',
                      backgroundColor: match.team1 ? '#fafafa' : '#fff',
                    }}
                  >
                    {match.team1 ? (
                      <div className='team-slot'>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <Text strong>{match.team1.name}</Text>
                            <div style={{ marginTop: '4px' }}>
                              <Tag
                                color={
                                  match.team1.levelOfCompetition === 'Gold'
                                    ? 'gold'
                                    : 'default'
                                }
                              >
                                {match.team1.levelOfCompetition}
                              </Tag>
                              <Text
                                type='secondary'
                                style={{ fontSize: '12px', marginLeft: '8px' }}
                              >
                                {match.team1.grade} • {match.team1.sex}
                              </Text>
                            </div>
                          </div>
                          {!isCompleted && (
                            <Tooltip title='Remove team'>
                              <Button
                                type='text'
                                size='small'
                                danger
                                onClick={() =>
                                  removeTeamFromMatch(match._id, 'team1')
                                }
                              >
                                ×
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <DragOutlined
                          style={{ color: '#999', marginRight: '8px' }}
                        />
                        <Text type='secondary'>Drag team here</Text>
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              <Divider style={{ margin: '8px 0', fontSize: '12px' }}>
                <ArrowRightOutlined rotate={90} /> VS
              </Divider>

              {/* Team 2 Slot */}
              <Droppable
                key={`${match._id}-team2-${dragKey}`}
                droppableId={`match-${match._id}-team2`}
                type='team'
              >
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      minHeight: '60px',
                      border: match.team2
                        ? '1px solid #d9d9d9'
                        : '2px dashed #d9d9d9',
                      borderRadius: '4px',
                      padding: '8px',
                      backgroundColor: match.team2 ? '#fafafa' : '#fff',
                    }}
                  >
                    {match.team2 ? (
                      <div className='team-slot'>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <Text strong>{match.team2.name}</Text>
                            <div style={{ marginTop: '4px' }}>
                              <Tag
                                color={
                                  match.team2.levelOfCompetition === 'Gold'
                                    ? 'gold'
                                    : 'default'
                                }
                              >
                                {match.team2.levelOfCompetition}
                              </Tag>
                              <Text
                                type='secondary'
                                style={{ fontSize: '12px', marginLeft: '8px' }}
                              >
                                {match.team2.grade} • {match.team2.sex}
                              </Text>
                            </div>
                          </div>
                          {!isCompleted && (
                            <Tooltip title='Remove team'>
                              <Button
                                type='text'
                                size='small'
                                danger
                                onClick={() =>
                                  removeTeamFromMatch(match._id, 'team2')
                                }
                              >
                                ×
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <DragOutlined
                          style={{ color: '#999', marginRight: '8px' }}
                        />
                        <Text type='secondary'>Drag team here</Text>
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Desktop: Side by side layout */}
            <div className='match-teams-desktop'>
              <Row gutter={16} align='middle'>
                <Col xs={24} md={10}>
                  <Droppable
                    key={`${match._id}-team1-desktop-${dragKey}`}
                    droppableId={`match-${match._id}-team1`}
                    type='team'
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          minHeight: '80px',
                          border: match.team1
                            ? '1px solid #d9d9d9'
                            : '2px dashed #d9d9d9',
                          borderRadius: '4px',
                          padding: '12px',
                          backgroundColor: match.team1 ? '#fafafa' : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {match.team1 ? (
                          <div className='team-slot' style={{ width: '100%' }}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <Text strong style={{ fontSize: '14px' }}>
                                  {match.team1.name}
                                </Text>
                                <div style={{ marginTop: '4px' }}>
                                  <Tag
                                    color={
                                      match.team1.levelOfCompetition === 'Gold'
                                        ? 'gold'
                                        : 'default'
                                    }
                                  >
                                    {match.team1.levelOfCompetition}
                                  </Tag>
                                  <Text
                                    type='secondary'
                                    style={{
                                      fontSize: '12px',
                                      marginLeft: '8px',
                                    }}
                                  >
                                    {match.team1.grade} • {match.team1.sex}
                                  </Text>
                                </div>
                              </div>
                              {!isCompleted && (
                                <Tooltip title='Remove team'>
                                  <Button
                                    type='text'
                                    size='small'
                                    danger
                                    onClick={() =>
                                      removeTeamFromMatch(match._id, 'team1')
                                    }
                                  >
                                    ×
                                  </Button>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              textAlign: 'center',
                              width: '100%',
                              padding: '16px 0',
                            }}
                          >
                            <DragOutlined
                              style={{ color: '#999', marginRight: '8px' }}
                            />
                            <Text type='secondary'>Drag team here</Text>
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </Col>

                <Col xs={24} md={4}>
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '16px 0',
                    }}
                  >
                    <Divider
                      type='vertical'
                      style={{
                        height: '40px',
                        margin: '0 8px',
                        display: 'inline-block',
                      }}
                    />
                    <Text
                      strong
                      style={{
                        fontSize: '16px',
                        color: '#666',
                        margin: '0 8px',
                      }}
                    >
                      VS
                    </Text>
                    <Divider
                      type='vertical'
                      style={{
                        height: '40px',
                        margin: '0 8px',
                        display: 'inline-block',
                      }}
                    />
                  </div>
                </Col>

                <Col xs={24} md={10}>
                  <Droppable
                    key={`${match._id}-team2-desktop-${dragKey}`}
                    droppableId={`match-${match._id}-team2`}
                    type='team'
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          minHeight: '80px',
                          border: match.team2
                            ? '1px solid #d9d9d9'
                            : '2px dashed #d9d9d9',
                          borderRadius: '4px',
                          padding: '12px',
                          backgroundColor: match.team2 ? '#fafafa' : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {match.team2 ? (
                          <div className='team-slot' style={{ width: '100%' }}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <Text strong style={{ fontSize: '14px' }}>
                                  {match.team2.name}
                                </Text>
                                <div style={{ marginTop: '4px' }}>
                                  <Tag
                                    color={
                                      match.team2.levelOfCompetition === 'Gold'
                                        ? 'gold'
                                        : 'default'
                                    }
                                  >
                                    {match.team2.levelOfCompetition}
                                  </Tag>
                                  <Text
                                    type='secondary'
                                    style={{
                                      fontSize: '12px',
                                      marginLeft: '8px',
                                    }}
                                  >
                                    {match.team2.grade} • {match.team2.sex}
                                  </Text>
                                </div>
                              </div>
                              {!isCompleted && (
                                <Tooltip title='Remove team'>
                                  <Button
                                    type='text'
                                    size='small'
                                    danger
                                    onClick={() =>
                                      removeTeamFromMatch(match._id, 'team2')
                                    }
                                  >
                                    ×
                                  </Button>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              textAlign: 'center',
                              width: '100%',
                              padding: '16px 0',
                            }}
                          >
                            <DragOutlined
                              style={{ color: '#999', marginRight: '8px' }}
                            />
                            <Text type='secondary'>Drag team here</Text>
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </Col>
              </Row>
            </div>
          </div>

          {/* Score display for completed matches */}
          {isCompleted && (
            <div
              style={{
                textAlign: 'center',
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#f6ffed',
              }}
            >
              <Row gutter={8} justify='center' align='middle'>
                <Col>
                  <Text strong style={{ fontSize: '18px' }}>
                    {match.team1Score}
                  </Text>
                </Col>
                <Col>
                  <Text type='secondary' style={{ fontSize: '16px' }}>
                    -
                  </Text>
                </Col>
                <Col>
                  <Text strong style={{ fontSize: '18px' }}>
                    {match.team2Score}
                  </Text>
                </Col>
              </Row>
              {match.status === 'walkover' && (
                <Tag color='orange' style={{ marginTop: '5px' }}>
                  Walkover
                </Tag>
              )}
            </div>
          )}
        </Card>
      </div>
    );
  };

  // Remove team from match
  const removeTeamFromMatch = async (
    matchId: string,
    position: 'team1' | 'team2'
  ) => {
    try {
      const currentMatches = matchesByRound[currentRound] || [];
      const match = currentMatches.find((m) => m._id === matchId);
      if (!match) return;

      const teamToRemove = match[position];
      if (!teamToRemove) return;

      await axios.patch(
        `${API_URL}/tournaments/match/${matchId}/teams`,
        { [position]: null, position: position },
        getAuthHeader()
      );

      setMatchesByRound((prev) => {
        const updatedMatches = (prev[currentRound] || []).map((m) => {
          if (m._id === matchId) {
            const updatedMatch = {
              ...m,
              [position]: null,
            };

            const otherPosition = position === 'team1' ? 'team2' : 'team1';
            const otherTeam = m[otherPosition];

            if (otherTeam) {
              updatedMatch.status = 'bye';
            } else {
              updatedMatch.status = 'scheduled';
            }

            return updatedMatch;
          }
          return m;
        });
        return { ...prev, [currentRound]: updatedMatches };
      });

      // Add team back to available teams
      setAvailableTeams((prev) => [...prev, teamToRemove]);
      message.success('Team removed from match');

      await refreshAllData();
      setDragKey((prev) => prev + 1);
    } catch (error: any) {
      console.error('Error removing team from match:', error);
      message.error(error.response?.data?.message || 'Failed to remove team');
    }
  };

  // Reset match
  const resetMatch = async (matchId: string) => {
    try {
      const response = await axios.post(
        `${API_URL}/tournaments/match/${matchId}/reset`,
        {},
        getAuthHeader()
      );

      if (response.data.success) {
        message.success('Match reset successfully');
        await refreshAllData();
      } else {
        message.error(response.data.message || 'Failed to reset match');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to reset match');
    }
  };

  // Open declare winner modal
  const openDeclareWinnerModal = (match: ScheduledMatch) => {
    if (!match.team1 || !match.team2) {
      message.warning('Both teams must be assigned before declaring a winner');
      return;
    }
    setDeclaringWinner(match._id);
  };

  // Declare match winner
  const declareMatchWinner = async (
    matchId: string,
    winnerId: string,
    scores: { team1Score: number; team2Score: number },
    isWalkover: boolean = false
  ) => {
    if (!selectedTournament) return;

    try {
      const match = matchesByRound[currentRound]?.find(
        (m) => m._id === matchId
      );
      if (!match || !match.team1 || !match.team2) return;

      const winner = match.team1._id === winnerId ? match.team1 : match.team2;
      const loser = match.team1._id === winnerId ? match.team2 : match.team1;

      const response = await axios.put(
        `${API_URL}/tournaments/match/${matchId}`,
        {
          team1Score: scores.team1Score,
          team2Score: scores.team2Score,
          winner: winner._id,
          status: isWalkover ? 'walkover' : 'completed',
          notes: isWalkover
            ? 'Walkover declared'
            : 'Winner declared via bracket builder',
          walkoverReason: isWalkover ? 'Declared by admin' : undefined,
        },
        getAuthHeader()
      );

      if (response.data.success) {
        setMatchesByRound((prev) => ({
          ...prev,
          [currentRound]: prev[currentRound].map((m) =>
            m._id === matchId
              ? {
                  ...m,
                  winner: winner,
                  loser: loser,
                  team1Score: scores.team1Score,
                  team2Score: scores.team2Score,
                  status: isWalkover ? 'walkover' : 'completed',
                  walkoverReason: isWalkover ? 'Declared by admin' : undefined,
                }
              : m
          ),
        }));

        setDeclaringWinner(null);
        message.success(`Winner declared: ${winner.name}`);
        await refreshAllData();
        setDragKey((prev) => prev + 1);
      } else {
        message.error(response.data.message || 'Failed to save match result');
      }
    } catch (error: any) {
      console.error('Error declaring winner:', error);
      message.error(
        error.response?.data?.message || 'Failed to save match result'
      );
    }
  };

  // Advance to next round
  const advanceToNextRound = async () => {
    if (!selectedTournament) {
      message.error('No tournament selected');
      return;
    }

    const currentMatches = matchesByRound[currentRound] || [];

    if (currentMatches.length === 0) {
      message.error('No matches in current round');
      return;
    }

    const isRoundComplete = checkRoundCompletion(currentMatches);
    const winningTeamsCount = countWinningTeams(currentMatches);

    if (!isRoundComplete) {
      message.error(
        'Round is not complete. All matches must have winners or be byes.'
      );
      return;
    }

    if (winningTeamsCount < 2) {
      message.error(
        `Need at least 2 winning teams to advance. Currently have ${winningTeamsCount}`
      );
      return;
    }

    setAdvancingRound(true);
    try {
      const response = await axios.post(
        `${API_URL}/tournaments/${selectedTournament}/advance-round`,
        {
          round: currentRound,
          autoAssignTeams: false,
        },
        getAuthHeader()
      );

      if (response.data.success) {
        const nextRound = response.data.nextRound || currentRound + 1;
        setCurrentRound(nextRound);
        await refreshAllData(nextRound);
        setDragKey((prev) => prev + 1);
        message.success(
          `✅ Advanced to Round ${nextRound}! You can now manually create matches.`
        );
      } else if (response.data.message?.includes('already exists')) {
        const nextRound = currentRound + 1;
        setCurrentRound(nextRound);
        await refreshAllData(nextRound);
        message.info(`Round ${nextRound} already exists. Switching to it.`);
      } else {
        message.error(
          response.data.message || 'Failed to advance to next round'
        );
      }
    } catch (error: any) {
      console.error('Error advancing round:', error);
      message.error(
        error.response?.data?.message ||
          error.message ||
          'Failed to advance to next round'
      );
    } finally {
      setAdvancingRound(false);
    }
  };

  // Save bracket
  const saveBracket = async () => {
    if (!selectedTournament || !selectedTournamentData) return;

    try {
      if (selectedTournamentData?.status === 'draft') {
        await axios.put(
          `${API_URL}/tournaments/${selectedTournament}`,
          { status: 'open' },
          getAuthHeader()
        );

        setSelectedTournamentData((prev) =>
          prev ? { ...prev, status: 'open' } : null
        );

        message.success('Tournament opened successfully');
      } else {
        message.info('Tournament is already open');
      }

      if (onSave) onSave();
    } catch (error: any) {
      console.error('Error saving bracket:', error);
      message.error(error.response?.data?.message || 'Failed to save bracket');
    }
  };

  // Generate auto bracket
  const generateAutoBracket = async () => {
    if (!selectedTournament || !selectedTournamentData) return;

    Modal.confirm({
      title: 'Generate Automatic Bracket',
      content:
        'This will create a single elimination bracket with all registered teams. Continue?',
      onOk: async () => {
        try {
          const response = await axios.post(
            `${API_URL}/tournaments/${selectedTournament}/generate-brackets`,
            { format: 'single-elimination' },
            getAuthHeader()
          );

          if (response.data.success) {
            setCurrentRound(1);
            await refreshAllData(1);
            message.success('Bracket generated successfully');
          }
        } catch (error: any) {
          message.error(
            error.response?.data?.message || 'Failed to generate bracket'
          );
        }
      },
    });
  };

  // Find match for winner declaration modal
  const declaringMatch = declaringWinner
    ? matchesByRound[currentRound]?.find((m) => m._id === declaringWinner)
    : null;

  // Group teams by grade/sex
  const teamGroups = useMemo(() => {
    const groups: Record<string, Team[]> = {};
    registeredTeams.forEach((team) => {
      const key = `${team.grade} ${team.sex}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(team);
    });
    return groups;
  }, [registeredTeams]);

  // Settings menu
  const settingsMenu: MenuProps['items'] = [
    {
      key: 'autoGenerate',
      label: 'Generate Automatic Bracket',
      icon: <PlusOutlined />,
      onClick: generateAutoBracket,
    },
    {
      key: 'export',
      label: 'Export Bracket Data',
      icon: <ExportOutlined />,
      onClick: () => {
        const data = {
          tournament: selectedTournamentData,
          rounds: matchesByRound,
          teams: registeredTeams,
        };
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri =
          'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `bracket-${
          selectedTournamentData?.name
        }-${new Date().toISOString().split('T')[0]}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      },
    },
  ];

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className='enhanced-bracket-builder' style={{ padding: '24px' }}>
        <Title level={2}>
          <TrophyOutlined /> Tournament Bracket Manager
        </Title>
        <Text type='secondary'>
          {tournamentMode === 'multiMatch'
            ? 'Create multi-match schedules with time slots and courts'
            : 'Drag teams into match slots. Each match requires TWO teams.'}
        </Text>

        <Divider />

        {/* Tournament Selection and Mode */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={[16, 16]} align='middle'>
            <Col xs={24} md={12}>
              <Space>
                <Select
                  placeholder='Select Tournament'
                  value={selectedTournament}
                  onChange={(value) => setSelectedTournament(value)}
                  style={{ width: '300px' }}
                  loading={loading}
                  showSearch
                  optionFilterProp='children'
                >
                  {tournaments.map((tournament) => (
                    <Option key={tournament._id} value={tournament._id}>
                      {tournament.name} ({tournament.year})
                    </Option>
                  ))}
                </Select>

                <Radio.Group
                  value={tournamentMode}
                  onChange={(e) => {
                    setTournamentMode(e.target.value);
                    // Reset available teams when mode changes
                    if (currentRound === 1) {
                      setAvailableTeams(registeredTeams);
                    }
                  }}
                  buttonStyle='solid'
                >
                  <Radio.Button value='singleElimination'>
                    Single Elimination
                  </Radio.Button>
                  <Radio.Button value='multiMatch'>
                    Multi-Match Schedule
                  </Radio.Button>
                </Radio.Group>
              </Space>
            </Col>
            <Col xs={24} md={12} style={{ textAlign: 'right' }}>
              <Space>
                {selectedTournament && (
                  <>
                    <Button
                      type='primary'
                      icon={<ReloadOutlined />}
                      onClick={async () => {
                        await refreshAllData();
                        message.success('Data refreshed');
                      }}
                      loading={loading}
                    >
                      Refresh
                    </Button>
                    <Dropdown menu={{ items: settingsMenu }}>
                      <Button icon={<SettingOutlined />}>Actions</Button>
                    </Dropdown>
                    {tournamentMode === 'multiMatch' && (
                      <Button
                        type='primary'
                        icon={<CalendarOutlined />}
                        onClick={openScheduleBuilder}
                        disabled={availableTeams.length === 0}
                      >
                        Create Schedule
                      </Button>
                    )}
                    <Button
                      type='primary'
                      icon={<SaveOutlined />}
                      onClick={saveBracket}
                    >
                      Save Bracket
                    </Button>
                  </>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        {selectedTournament ? (
          <Row gutter={[24, 24]}>
            {/* Available Teams Panel */}
            <Col xs={24} md={tournamentMode === 'multiMatch' ? 8 : 6}>
              <Card
                title={
                  <Space>
                    <TeamOutlined />
                    <span>
                      Available Teams
                      {currentRound > 1 &&
                        tournamentMode === 'singleElimination' && (
                          <span className='round-indicator'>
                            Round {currentRound - 1} Winners
                          </span>
                        )}
                    </span>
                    <Badge count={availableTeams.length} showZero />
                  </Space>
                }
                extra={
                  <Space>
                    <Tooltip title='Refresh available teams'>
                      <Button
                        type='text'
                        size='small'
                        icon={<ReloadOutlined />}
                        onClick={() => {
                          updateAvailableTeamsForRound(
                            currentRound,
                            matchesByRound[currentRound] || []
                          );
                          message.info('Available teams refreshed');
                        }}
                      />
                    </Tooltip>
                    <Tooltip title='Reset available teams'>
                      <Button
                        type='text'
                        size='small'
                        icon={<UndoOutlined />}
                        onClick={() => {
                          if (tournamentMode === 'singleElimination') {
                            if (currentRound === 1) {
                              const currentMatches =
                                matchesByRound[currentRound] || [];
                              const teamsInMatches = new Set<string>();
                              currentMatches.forEach((match) => {
                                if (match.team1)
                                  teamsInMatches.add(match.team1._id);
                                if (match.team2)
                                  teamsInMatches.add(match.team2._id);
                              });
                              const filteredAvailableTeams =
                                registeredTeams.filter(
                                  (team) => !teamsInMatches.has(team._id)
                                );
                              setAvailableTeams(filteredAvailableTeams);
                            } else {
                              updateAvailableTeamsForRound(
                                currentRound,
                                matchesByRound[currentRound] || []
                              );
                            }
                          } else {
                            // For multi-match: reset to show all registered teams
                            setAvailableTeams(registeredTeams);
                          }
                        }}
                      />
                    </Tooltip>
                  </Space>
                }
                style={{
                  position: 'sticky', // Makes it stick when scrolling
                  top: '20px', // Distance from top when sticky
                  height: 'calc(100vh - 100px)', // Adjust based on your header height
                  display: 'flex',
                  flexDirection: 'column',
                }}
                bodyStyle={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Collapsible Groups Section */}
                {tournamentMode === 'multiMatch' && (
                  <div style={{ marginBottom: '16px' }}>
                    <Collapse
                      size='small'
                      defaultActiveKey={Object.keys(teamGroups).slice(0, 2)}
                      items={Object.entries(teamGroups).map(
                        ([groupName, groupTeams]) => ({
                          key: groupName,
                          label: `${groupName} (${groupTeams.length} teams)`,
                          children: (
                            <List
                              size='small'
                              dataSource={groupTeams}
                              renderItem={(team) => (
                                <List.Item>
                                  <Space>
                                    <Avatar
                                      size='small'
                                      style={{
                                        backgroundColor:
                                          team.levelOfCompetition === 'Gold'
                                            ? '#faad14'
                                            : '#d9d9d9',
                                      }}
                                    >
                                      {team.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Text>{team.name}</Text>
                                    <Tag
                                      color={
                                        team.levelOfCompetition === 'Gold'
                                          ? 'gold'
                                          : 'default'
                                      }
                                      style={{ marginLeft: 'auto' }}
                                    >
                                      {team.levelOfCompetition}
                                    </Tag>
                                  </Space>
                                </List.Item>
                              )}
                            />
                          ),
                        })
                      )}
                    />
                  </div>
                )}

                <Droppable
                  key={`availableTeams-${dragKey}`}
                  droppableId='availableTeams'
                  type='team'
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        flex: 1,
                        minHeight: '200px',
                        overflowY: 'auto',
                        border: snapshot.isDraggingOver
                          ? '2px dashed #1890ff'
                          : '1px solid #f0f0f0',
                        borderRadius: '4px',
                        padding: '8px',
                        background: snapshot.isDraggingOver
                          ? '#f0f8ff'
                          : '#fafafa',
                      }}
                    >
                      {availableTeams.length === 0 ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '200px',
                            color: '#bfbfbf',
                            textAlign: 'center',
                          }}
                        >
                          <TeamOutlined
                            style={{
                              fontSize: '48px',
                              opacity: 0.3,
                              marginBottom: '16px',
                            }}
                          />
                          <Text type='secondary'>
                            {currentRound === 1 ||
                            tournamentMode === 'multiMatch'
                              ? 'All teams are assigned to matches'
                              : 'All winning teams are assigned to matches'}
                          </Text>
                        </div>
                      ) : (
                        availableTeams.map((team, index) => (
                          <Draggable
                            key={team._id}
                            draggableId={team._id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '12px 16px',
                                  marginBottom: '8px',
                                  background: snapshot.isDragging
                                    ? '#e6f7ff'
                                    : 'white',
                                  border: snapshot.isDragging
                                    ? '1px solid #91d5ff'
                                    : '1px solid #f0f0f0',
                                  borderRadius: '6px',
                                  cursor: 'move',
                                  transition: 'all 0.2s ease',
                                  boxShadow: snapshot.isDragging
                                    ? '0 4px 12px rgba(24, 144, 255, 0.15)'
                                    : '0 1px 2px rgba(0, 0, 0, 0.03)',
                                  ...provided.draggableProps.style,
                                }}
                              >
                                <Avatar
                                  size='small'
                                  style={{
                                    marginRight: '12px',
                                    backgroundColor:
                                      team.levelOfCompetition === 'Gold'
                                        ? '#faad14'
                                        : '#d9d9d9',
                                  }}
                                >
                                  {team.name.charAt(0).toUpperCase()}
                                </Avatar>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontWeight: '500',
                                      color: '#262626',
                                      marginBottom: '2px',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    {team.name}
                                    {currentRound > 1 &&
                                      tournamentMode ===
                                        'singleElimination' && (
                                        <span className='winner-badge'>
                                          <CrownOutlined
                                            style={{ fontSize: '10px' }}
                                          />{' '}
                                          Winner
                                        </span>
                                      )}
                                  </div>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      fontSize: '12px',
                                      color: '#8c8c8c',
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: '500',
                                        color:
                                          team.levelOfCompetition === 'Gold'
                                            ? '#faad14'
                                            : '#d9d9d9',
                                      }}
                                    >
                                      {team.levelOfCompetition}
                                    </span>
                                    <span>{team.grade}</span>
                                    <span>•</span>
                                    <span>{team.sex}</span>
                                  </div>
                                </div>

                                <DragOutlined
                                  style={{
                                    color: '#bfbfbf',
                                    flexShrink: 0,
                                    padding: '4px',
                                    transition: 'color 0.2s',
                                  }}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                <Divider style={{ margin: '16px 0' }} />

                {/* Debug info - remove in production */}
                {process.env.NODE_ENV === 'development' &&
                  tournamentMode === 'multiMatch' && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#999',
                        marginTop: '8px',
                      }}
                    >
                      <Text type='secondary'>
                        Debug: {availableTeams.length} available out of{' '}
                        {registeredTeams.length} registered (max{' '}
                        {maxMatchesPerTeam} matches per team)
                      </Text>
                    </div>
                  )}

                {/* Create Matches Button */}
                {currentRound === 1 ? (
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Button
                      type={
                        tournamentMode === 'multiMatch' ? 'primary' : 'dashed'
                      }
                      block
                      icon={<PlusOutlined />}
                      onClick={() => setShowMatchCreation(true)}
                      loading={isGenerating}
                      disabled={availableTeams.length === 0}
                    >
                      {tournamentMode === 'multiMatch'
                        ? 'Create Matches (Flexible)'
                        : `Create Matches (${availableTeams.length} teams available)`}
                    </Button>

                    {tournamentMode === 'multiMatch' && (
                      <Space
                        wrap
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        <Button
                          size='small'
                          onClick={() =>
                            addSingleMatch('9am', 'Main Court #1', 'main')
                          }
                        >
                          + 9am Match
                        </Button>
                        <Button
                          size='small'
                          onClick={() =>
                            addSingleMatch('10am', 'Main Court #2', 'main')
                          }
                        >
                          + 10am Match
                        </Button>
                        <Button
                          size='small'
                          onClick={() =>
                            addSingleMatch(
                              '11am',
                              'Auxiliary Court',
                              'auxiliary'
                            )
                          }
                        >
                          + 11am Match
                        </Button>
                      </Space>
                    )}
                  </Space>
                ) : tournamentMode === 'singleElimination' ? (
                  <Button
                    type='dashed'
                    block
                    icon={<PlusOutlined />}
                    onClick={() => {
                      const numMatches = Math.ceil(availableTeams.length / 2);
                      if (numMatches > 0) {
                        createInitialMatches({ numMatches });
                      }
                    }}
                    loading={isGenerating}
                    disabled={availableTeams.length < 2}
                  >
                    Create Winners Bracket ({availableTeams.length} winners
                    available)
                  </Button>
                ) : null}

                <Button
                  danger
                  block
                  icon={<DeleteOutlined />}
                  onClick={clearCurrentRound}
                  disabled={!matchesByRound[currentRound]?.length}
                  style={{ marginTop: '8px' }}
                >
                  Clear Round {currentRound}
                </Button>
              </Card>
            </Col>

            {/* Bracket/Schedule Area */}
            <Col xs={24} md={tournamentMode === 'multiMatch' ? 16 : 18}>
              <Card
                title={
                  tournamentMode === 'multiMatch'
                    ? `Round ${currentRound} Schedule`
                    : `Round ${currentRound} Bracket`
                }
                extra={
                  <Space>
                    <Button
                      onClick={() => {
                        const prevRound = Math.max(1, currentRound - 1);
                        setCurrentRound(prevRound);
                      }}
                      disabled={currentRound === 1}
                    >
                      Previous Round
                    </Button>
                    <Button
                      onClick={() => {
                        const nextRound = currentRound + 1;
                        setCurrentRound(nextRound);
                      }}
                      disabled={!matchesByRound[currentRound + 1]?.length}
                    >
                      Next Round
                    </Button>

                    {tournamentMode === 'singleElimination' && (
                      <Button
                        type='primary'
                        icon={<RocketOutlined />}
                        onClick={advanceToNextRound}
                        loading={advancingRound}
                        disabled={
                          !checkRoundCompletion(
                            matchesByRound[currentRound] || []
                          ) ||
                          countWinningTeams(
                            matchesByRound[currentRound] || []
                          ) < 2
                        }
                        style={{ marginLeft: '8px' }}
                      >
                        Advance to Round {currentRound + 1}
                      </Button>
                    )}
                  </Space>
                }
              >
                {/* Schedule Stats */}
                {tournamentMode === 'multiMatch' && (
                  <Card size='small' style={{ marginBottom: '16px' }}>
                    <Row gutter={[16, 16]}>
                      <Col span={6}>
                        <Statistic
                          title='Total Matches'
                          value={matchesByRound[currentRound]?.length || 0}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title='Scheduled'
                          value={
                            matchesByRound[currentRound]?.filter(
                              (m) => m.timeSlot
                            ).length || 0
                          }
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title='Completed'
                          value={
                            matchesByRound[currentRound]?.filter(
                              (m) => m.status === 'completed'
                            ).length || 0
                          }
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title='Time Slots'
                          value={
                            new Set(
                              matchesByRound[currentRound]
                                ?.map((m) => m.timeSlot)
                                .filter(Boolean)
                            ).size
                          }
                        />
                      </Col>
                    </Row>
                  </Card>
                )}

                {/* Matches Grid */}
                {matchesByRound[currentRound]?.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        tournamentMode === 'multiMatch'
                          ? 'repeat(auto-fill, minmax(400px, 1fr))'
                          : 'repeat(auto-fill, minmax(350px, 1fr))',
                      gap: '16px',
                    }}
                  >
                    {matchesByRound[currentRound].map((match) =>
                      renderMatchCard(match)
                    )}
                  </div>
                ) : (
                  <Empty
                    description={
                      tournamentMode === 'multiMatch'
                        ? 'No schedule created for this round'
                        : 'No matches created for this round'
                    }
                  >
                    {currentRound === 1 ? (
                      tournamentMode === 'multiMatch' ? (
                        <Button
                          type='primary'
                          icon={<CalendarOutlined />}
                          onClick={() => setShowMatchCreation(true)}
                          disabled={availableTeams.length === 0}
                        >
                          Create Schedule
                        </Button>
                      ) : (
                        <Button
                          type='primary'
                          icon={<PlusOutlined />}
                          onClick={() => setShowMatchCreation(true)}
                          loading={isGenerating}
                          disabled={availableTeams.length === 0}
                        >
                          Create {Math.ceil(availableTeams.length / 2) || 1}{' '}
                          Matches
                        </Button>
                      )
                    ) : (
                      <Text type='secondary'>
                        {tournamentMode === 'singleElimination'
                          ? 'Complete previous round to create matches for this round'
                          : 'No matches scheduled for this round'}
                      </Text>
                    )}
                  </Empty>
                )}
              </Card>
            </Col>
          </Row>
        ) : (
          <Card>
            <Empty description='Select a tournament to begin building your bracket' />
          </Card>
        )}

        {/* Modals */}
        {declaringMatch && (
          <WinnerDeclarationModal
            match={declaringMatch}
            visible={!!declaringWinner}
            onCancel={() => setDeclaringWinner(null)}
            onDeclareWinner={declareMatchWinner}
          />
        )}

        {showScheduleBuilder && selectedTournament && (
          <ScheduleBuilder
            tournamentId={selectedTournament}
            round={currentRound}
            teams={availableTeams}
            existingMatches={matchesByRound[currentRound]}
            onSave={handleScheduleSaved}
            onCancel={() => setShowScheduleBuilder(false)}
          />
        )}

        <MatchCreationModal
          visible={showMatchCreation}
          onCancel={() => setShowMatchCreation(false)}
          onCreate={createInitialMatches}
          availableTeams={availableTeams.length}
          loading={isGenerating}
        />
      </div>
    </DragDropContext>
  );
};

export default EnhancedBracketBuilder;
