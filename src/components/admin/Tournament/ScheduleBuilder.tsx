// components/admin/Tournament/ScheduleBuilder.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Form,
  Input,
  DatePicker,
  TimePicker,
  Select,
  Table,
  Tag,
  Space,
  Alert,
  Modal,
  message,
  InputNumber,
  Calendar,
  Badge,
  Empty,
  Divider,
  Drawer,
  Timeline,
  Radio,
  Progress,
  Statistic,
  Tabs,
  Popconfirm,
  notification,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  SettingOutlined,
  SaveOutlined,
  SyncOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ScheduleOutlined,
  EnvironmentOutlined,
  DownloadOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

dayjs.extend(isBetween);
dayjs.extend(advancedFormat);
dayjs.extend(weekday);
dayjs.extend(localeData);

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface Team {
  _id: string;
  name: string;
  grade: string;
  sex: string;
  levelOfCompetition: 'Gold' | 'Silver';
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
  status: string;
  scheduledTime?: string | Date;
  court?: string;
  duration: number;
  referee?: any;
  [key: string]: any;
}

interface Tournament {
  _id: string;
  name: string;
  year: number;
  status: string;
  settings?: {
    matchDuration?: number;
    breakDuration?: number;
  };
  [key: string]: any;
}

interface TimeSlot {
  start: string;
  end: string;
  duration: number;
  available: boolean;
}

interface CourtSchedule {
  [court: string]: Match[];
}

interface ScheduleConflict {
  matchNumber: number;
  teams: string;
  time: string;
  court: string;
}

interface ScheduleBuilderProps {
  tournamentId: string;
  tournamentName?: string;
  tournamentYear?: number;
  onBack?: () => void;
}

// Sub-components for modals
interface ScheduleMatchModalProps {
  editingMatch: Match | null;
  onCancel: () => void;
  onSchedule: (
    matchId: string,
    scheduledTime: Dayjs,
    court: string
  ) => Promise<void>;
  tournament: Tournament | null;
  courts: string[];
}

interface ScheduleResetModalProps {
  visible: boolean;
  onCancel: () => void;
  onReset: (resetType: string) => Promise<void>;
  tournament: Tournament | null;
  loading: boolean;
}

const ScheduleResetModal: React.FC<ScheduleResetModalProps> = ({
  visible,
  onCancel,
  onReset,
  tournament,
  loading,
}) => {
  const [resetType, setResetType] = useState<string>('soft');
  const [confirmText, setConfirmText] = useState<string>('');

  const handleReset = async () => {
    if (confirmText === 'RESET') {
      await onReset(resetType);
      setConfirmText('');
    } else {
      message.error('Please type "RESET" to confirm');
    }
  };

  const getResetDescription = () => {
    switch (resetType) {
      case 'soft':
        return 'Clears all schedule information but keeps matches. Teams, scores, and match history are preserved.';
      case 'hard':
        return 'Deletes all matches and resets the tournament to draft state. All match data will be lost.';
      case 'partial':
        return 'Only clears schedule for future matches. Past and completed matches remain unchanged.';
      default:
        return '';
    }
  };

  return (
    <Modal
      title='Reset Tournament Schedule'
      open={visible}
      onCancel={onCancel}
      onOk={handleReset}
      okText='Reset Schedule'
      okButtonProps={{
        danger: true,
        disabled: confirmText !== 'RESET',
        loading,
      }}
      cancelText='Cancel'
      width={600}
    >
      <Alert
        type='warning'
        message='⚠️ Warning: This action cannot be undone!'
        description='Resetting the schedule will affect all scheduled matches. Please proceed with caution.'
        style={{ marginBottom: '20px' }}
      />

      <Form layout='vertical'>
        <Form.Item label='Reset Type'>
          <Radio.Group
            value={resetType}
            onChange={(e) => setResetType(e.target.value)}
          >
            <Radio value='soft'>
              Soft Reset (Keep matches, clear schedule)
            </Radio>
            <Radio value='hard'>Hard Reset (Delete all matches)</Radio>
            <Radio value='partial'>
              Partial Reset (Clear future matches only)
            </Radio>
          </Radio.Group>
        </Form.Item>

        <Alert
          type='info'
          message={`${
            resetType.charAt(0).toUpperCase() + resetType.slice(1)
          } Reset`}
          description={getResetDescription()}
          style={{ marginBottom: '20px' }}
        />

        <Form.Item
          label={
            <span>
              Type <strong>RESET</strong> to confirm
            </span>
          }
          required
        >
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder='Type RESET here'
            style={{ textTransform: 'uppercase' }}
          />
        </Form.Item>

        <div style={{ marginTop: '20px' }}>
          <Text type='secondary'>
            Tournament: <strong>{tournament?.name}</strong>
          </Text>
          <br />
          <Text type='secondary'>
            Status: <Tag color='blue'>{tournament?.status}</Tag>
          </Text>
        </div>
      </Form>
    </Modal>
  );
};

const ScheduleMatchModal: React.FC<ScheduleMatchModalProps> = ({
  editingMatch,
  onCancel,
  onSchedule,
  tournament,
  courts,
}) => {
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    if (!editingMatch) return;

    // Combine date and time
    const date = values.date;
    const time = values.scheduledTime;

    const scheduledDateTime = date
      .hour(time.hour())
      .minute(time.minute())
      .second(0);

    await onSchedule(editingMatch._id, scheduledDateTime, values.court);
  };

  if (!editingMatch) return null;

  return (
    <Modal
      title={`Schedule Match ${editingMatch.matchNumber}`}
      open={!!editingMatch}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText='Schedule Match'
      width={600}
    >
      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        initialValues={{
          teams: `${editingMatch.team1?.name || 'TBD'} vs ${
            editingMatch.team2?.name || 'TBD'
          }`,
          date: dayjs(),
          scheduledTime: dayjs().hour(10).minute(0),
          court: courts[0],
          duration: tournament?.settings?.matchDuration || 40,
        }}
      >
        <Form.Item label='Teams' name='teams'>
          <Input disabled />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label='Date'
              name='date'
              rules={[{ required: true, message: 'Please select date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label='Time'
              name='scheduledTime'
              rules={[{ required: true, message: 'Please select time' }]}
            >
              <TimePicker
                format='HH:mm'
                minuteStep={15}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label='Court'
              name='court'
              rules={[{ required: true, message: 'Please select court' }]}
            >
              <Select placeholder='Select court'>
                {courts.map((court) => (
                  <Option key={court} value={court}>
                    {court}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label='Duration (minutes)' name='duration'>
              <InputNumber min={10} max={120} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label='Referee' name='referee'>
          <Select placeholder='Select referee (optional)' allowClear>
            <Option value='ref1'>John Smith</Option>
            <Option value='ref2'>Jane Doe</Option>
            <Option value='ref3'>Mike Johnson</Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

interface GenerateScheduleModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
  tournament: Tournament | null;
  selectedCourts: string[];
  onCourtsChange: (courts: string[]) => void;
  generating: boolean;
}

const GenerateScheduleModal: React.FC<GenerateScheduleModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  tournament,
  selectedCourts,
  onCourtsChange,
  generating,
}) => {
  const [form] = Form.useForm();
  const courts = ['Court 1', 'Court 2', 'Court 3', 'Court 4'];

  const handleSubmit = async (values: any) => {
    await onSubmit(values);
  };

  return (
    <Modal
      title='Generate Tournament Schedule'
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText='Generate Schedule'
      confirmLoading={generating}
      width={800}
    >
      <Alert
        type='info'
        message='Automatic Schedule Generation'
        description='The system will automatically schedule all unscheduled matches based on your preferences.'
        style={{ marginBottom: '20px' }}
      />

      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        initialValues={{
          startDate: dayjs(),
          endDate: dayjs().add(2, 'days'),
          startTime: dayjs().hour(8).minute(0),
          endTime: dayjs().hour(20).minute(0),
          courts: selectedCourts,
          matchDuration: tournament?.settings?.matchDuration || 40,
          breakDuration: tournament?.settings?.breakDuration || 10,
          scheduleType: 'sequential',
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label='Start Date'
              name='startDate'
              rules={[{ required: true, message: 'Please select start date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label='End Date'
              name='endDate'
              rules={[{ required: true, message: 'Please select end date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label='Start Time (Daily)'
              name='startTime'
              rules={[{ required: true, message: 'Please select start time' }]}
            >
              <TimePicker format='HH:mm' style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label='End Time (Daily)'
              name='endTime'
              rules={[{ required: true, message: 'Please select end time' }]}
            >
              <TimePicker format='HH:mm' style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label='Courts' name='courts'>
          <Select
            mode='multiple'
            placeholder='Select courts'
            onChange={onCourtsChange}
          >
            {courts.map((court) => (
              <Option key={court} value={court}>
                {court}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label='Match Duration (minutes)' name='matchDuration'>
              <InputNumber min={10} max={120} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label='Break Between Matches (minutes)'
              name='breakDuration'
            >
              <InputNumber min={0} max={60} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label='Scheduling Strategy' name='scheduleType'>
          <Radio.Group>
            <Radio value='sequential'>Sequential (one match at a time)</Radio>
            <Radio value='parallel'>Parallel (maximize court usage)</Radio>
            <Radio value='balanced'>Balanced (even distribution)</Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
};

const ScheduleBuilder: React.FC<ScheduleBuilderProps> = ({
  tournamentId,
  tournamentName = 'Winter Classic Tournament',
  tournamentYear = 2025,
  onBack,
}) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [unscheduledMatches, setUnscheduledMatches] = useState<Match[]>([]);
  const [scheduledMatches, setScheduledMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [showScheduleForm, setShowScheduleForm] = useState<boolean>(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [courts] = useState<string[]>([
    'Court 1',
    'Court 2',
    'Court 3',
    'Court 4',
  ]);
  const [scheduleByCourt, setScheduleByCourt] = useState<CourtSchedule>({});
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [activeTab, setActiveTab] = useState<string>('calendar');
  const [selectedCourts, setSelectedCourts] = useState<string[]>([
    'Court 1',
    'Court 2',
    'Court 3',
    'Court 4',
  ]);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  const API_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  const getAuthHeader = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  const checkCanResetSchedule = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/tournaments/${tournamentId}/schedule/can-reset`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Error checking schedule reset:', error);
      return null;
    }
  };

  const resetSchedule = async (resetType: string) => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/tournaments/${tournamentId}/schedule/reset`,
        { resetType },
        getAuthHeader()
      );

      if (response.data.success) {
        message.success(response.data.message);
        setShowResetModal(false);
        fetchTournamentData();

        // Show success notification with details
        notification.success({
          message: 'Schedule Reset Complete',
          description: `${response.data.matchesAffected} matches affected. Tournament is ready for rescheduling.`,
          duration: 5,
        });
      }
    } catch (error: any) {
      console.error('Error resetting schedule:', error);
      message.error(
        error.response?.data?.message || 'Failed to reset schedule'
      );
    } finally {
      setLoading(false);
    }
  };

  const recreateBracket = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/tournaments/${tournamentId}/bracket/recreate`,
        {
          format: tournament?.format,
          seeding: 'random',
        },
        getAuthHeader()
      );

      if (response.data.success) {
        message.success('Bracket recreated successfully');
        fetchTournamentData();
      }
    } catch (error: any) {
      console.error('Error recreating bracket:', error);
      message.error(
        error.response?.data?.message || 'Failed to recreate bracket'
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch tournament data
  const fetchTournamentData = useCallback(async () => {
    setLoading(true);
    try {
      const tournamentResponse = await axios.get(
        `${API_URL}/tournaments/${tournamentId}`,
        getAuthHeader()
      );

      if (tournamentResponse.data.success) {
        const allMatches: Match[] = tournamentResponse.data.matches || [];
        const tournamentData = tournamentResponse.data.tournament;

        if (tournamentData) {
          setTournament(tournamentData);
        }

        // Filter based on scheduledTime
        const unscheduled = allMatches.filter((m: Match) => !m.scheduledTime);
        const scheduled = allMatches.filter((m: Match) => !!m.scheduledTime);

        setUnscheduledMatches(unscheduled);
        setScheduledMatches(scheduled);

        // Also fetch schedule for selected date
        fetchScheduleForDate(selectedDate.format('YYYY-MM-DD'));
      }
    } catch (error) {
      console.error('Error fetching tournament data:', error);
      message.error('Failed to fetch tournament data');
    } finally {
      setLoading(false);
    }
  }, [tournamentId, selectedDate]);

  // Fetch schedule for specific date
  const fetchScheduleForDate = async (date: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/tournaments/${tournamentId}/schedule/date/${date}`,
        getAuthHeader()
      );

      if (response.data.success) {
        setScheduleByCourt(response.data.scheduleByCourt || {});
      }
    } catch (error) {
      console.error('Error fetching schedule for date:', error);
    }
  };

  // Fetch available time slots
  const fetchAvailableTimeSlots = async (date: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/tournaments/${tournamentId}/schedule/available-slots`,
        {
          ...getAuthHeader(),
          params: {
            date: date,
            startTime: '08:00',
            endTime: '20:00',
          },
        }
      );
      if (response.data.success) {
        setAvailableTimeSlots(response.data.timeSlots || []);
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
    }
  };

  // Generate automatic schedule
  const generateAutomaticSchedule = async (values: any) => {
    setGenerating(true);
    try {
      const response = await axios.post(
        `${API_URL}/tournaments/${tournamentId}/schedule/generate`,
        {
          startDate: values.startDate.format('YYYY-MM-DD'),
          endDate: values.endDate.format('YYYY-MM-DD'),
          startTime: values.startTime.format('HH:mm'),
          endTime: values.endTime.format('HH:mm'),
          courts: selectedCourts,
          matchDuration: values.matchDuration || 40,
          breakDuration: values.breakDuration || 10,
          scheduleType: values.scheduleType || 'sequential',
        },
        getAuthHeader()
      );

      if (response.data.success) {
        message.success(
          `Successfully scheduled ${
            response.data.scheduledMatches?.length || 0
          } matches`
        );
        setShowScheduleForm(false);
        fetchTournamentData();
      } else {
        message.error(response.data.message || 'Failed to generate schedule');
      }
    } catch (error: any) {
      console.error('Error generating schedule:', error);
      message.error(
        error.response?.data?.message || 'Failed to generate schedule'
      );
    } finally {
      setGenerating(false);
    }
  };

  // Schedule individual match
  const scheduleMatch = async (
    matchId: string,
    scheduledTime: Dayjs,
    court: string
  ) => {
    try {
      const response = await axios.put(
        `${API_URL}/tournaments/schedule/match/${matchId}`,
        {
          scheduledTime: scheduledTime.toISOString(),
          court: court,
        },
        getAuthHeader()
      );

      if (response.data.success) {
        if (response.data.conflicts) {
          setConflicts(response.data.conflicts);
          notification.warning({
            message: 'Scheduling Conflict',
            description: 'Please review the conflicts before proceeding.',
          });
        } else {
          message.success('Match scheduled successfully');
          setEditingMatch(null);
          fetchTournamentData();
        }
      } else {
        message.error(response.data.message || 'Failed to schedule match');
      }
    } catch (error: any) {
      console.error('Error scheduling match:', error);
      message.error(
        error.response?.data?.message || 'Failed to schedule match'
      );
    }
  };

  // Update match schedule
  const updateMatchSchedule = async (matchId: string, updates: any) => {
    try {
      const response = await axios.put(
        `${API_URL}/tournaments/schedule/match/${matchId}`,
        updates,
        getAuthHeader()
      );

      if (response.data.success) {
        message.success('Schedule updated successfully');
        setEditingMatch(null);
        fetchTournamentData();
      } else {
        message.error(response.data.message || 'Failed to update schedule');
      }
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      message.error(
        error.response?.data?.message || 'Failed to update schedule'
      );
    }
  };

  // Remove schedule from match
  const removeSchedule = async (matchId: string) => {
    Modal.confirm({
      title: 'Remove Schedule',
      content: 'Are you sure you want to remove the schedule for this match?',
      okText: 'Yes, Remove',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await updateMatchSchedule(matchId, {
            scheduledTime: null,
            court: null,
          });
        } catch (error) {
          console.error('Error removing schedule:', error);
        }
      },
    });
  };

  // Export schedule
  const exportSchedule = (format: 'json' | 'csv' | 'pdf' = 'json') => {
    const data = {
      tournament: tournament,
      schedule: scheduleByCourt,
      date: selectedDate.format('YYYY-MM-DD'),
      generated: new Date().toISOString(),
    };

    if (format === 'json') {
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri =
        'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute(
        'download',
        `schedule-${tournamentName}-${selectedDate.format('YYYY-MM-DD')}.json`
      );
      linkElement.click();
    } else if (format === 'csv') {
      let csvContent = 'Match Number,Round,Teams,Time,Court,Status\n';
      scheduledMatches.forEach((match) => {
        csvContent += `"${match.matchNumber}",${match.round},"${
          match.team1?.name || 'TBD'
        } vs ${match.team2?.name || 'TBD'}","${
          match.scheduledTime
            ? dayjs(match.scheduledTime.toString()).format('YYYY-MM-DD HH:mm')
            : ''
        }","${match.court || 'Unassigned'}","${match.status}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `schedule-${tournamentName}-${selectedDate.format(
        'YYYY-MM-DD'
      )}.csv`;
      link.click();
    }

    message.success(`Schedule exported as ${format.toUpperCase()}`);
  };

  // Initialize
  useEffect(() => {
    if (tournamentId) {
      fetchTournamentData();
      fetchAvailableTimeSlots(selectedDate.format('YYYY-MM-DD'));
    }
  }, [tournamentId, selectedDate]);

  // Render match time slot
  const renderTimeSlot = (match: Match) => {
    if (!match.scheduledTime) return null;

    const startTime = dayjs(match.scheduledTime.toString());
    const endTime = startTime.add(match.duration || 40, 'minutes');

    return (
      <div style={{ fontSize: '12px', color: '#666' }}>
        <ClockCircleOutlined /> {startTime.format('h:mm A')} -{' '}
        {endTime.format('h:mm A')}
        <br />
        <EnvironmentOutlined /> {match.court || 'Unassigned'}
      </div>
    );
  };

  // Render unscheduled matches table
  const unscheduledColumns = [
    {
      title: 'Match',
      dataIndex: 'matchNumber',
      key: 'matchNumber',
      width: 80,
      render: (num: number, record: Match) => <Tag color='blue'>#{num}</Tag>,
    },
    {
      title: 'Round',
      dataIndex: 'round',
      key: 'round',
      width: 80,
    },
    {
      title: 'Teams',
      key: 'teams',
      render: (record: Match) => (
        <div>
          <div>{record.team1?.name || 'TBD'}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>vs</div>
          <div>{record.team2?.name || 'TBD'}</div>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (record: Match) => (
        <Space>
          <Button
            size='small'
            type='primary'
            icon={<ScheduleOutlined />}
            onClick={() => setEditingMatch(record)}
          >
            Schedule
          </Button>
          <Button
            size='small'
            icon={<EyeOutlined />}
            onClick={() => {
              Modal.info({
                title: `Match ${record.matchNumber} Details`,
                content: (
                  <div>
                    <p>
                      <strong>Round:</strong> {record.round}
                    </p>
                    <p>
                      <strong>Teams:</strong> {record.team1?.name || 'TBD'} vs{' '}
                      {record.team2?.name || 'TBD'}
                    </p>
                    <p>
                      <strong>Status:</strong> {record.status}
                    </p>
                  </div>
                ),
              });
            }}
          >
            View
          </Button>
        </Space>
      ),
    },
  ];

  // Render scheduled matches table
  const scheduledColumns = [
    {
      title: 'Time',
      key: 'time',
      width: 150,
      render: (record: Match) => renderTimeSlot(record),
    },
    {
      title: 'Match',
      dataIndex: 'matchNumber',
      key: 'matchNumber',
      width: 80,
      render: (num: number) => <Tag color='green'>#{num}</Tag>,
    },
    {
      title: 'Round',
      dataIndex: 'round',
      key: 'round',
      width: 80,
    },
    {
      title: 'Teams',
      key: 'teams',
      render: (record: Match) => (
        <div>
          <div>{record.team1?.name || 'TBD'}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>vs</div>
          <div>{record.team2?.name || 'TBD'}</div>
        </div>
      ),
    },
    {
      title: 'Court',
      dataIndex: 'court',
      key: 'court',
      width: 100,
      render: (court: string) => (
        <Tag color='purple' icon={<EnvironmentOutlined />}>
          {court || 'Unassigned'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'success' : 'processing'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (record: Match) => (
        <Space>
          <Button
            size='small'
            icon={<EditOutlined />}
            onClick={() => setEditingMatch(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title='Remove schedule?'
            onConfirm={() => removeSchedule(record._id)}
          >
            <Button size='small' danger icon={<DeleteOutlined />}>
              Remove
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Court schedule view
  const renderCourtSchedule = () => {
    return (
      <div id='schedule-print-view'>
        <Title level={4} style={{ marginBottom: '20px' }}>
          Schedule for {selectedDate.format('dddd, MMMM D, YYYY')}
        </Title>

        {Object.entries(scheduleByCourt).length === 0 ? (
          <Empty description='No matches scheduled for this date' />
        ) : (
          <Row gutter={[16, 16]}>
            {Object.entries(scheduleByCourt).map(([court, matches]) => (
              <Col xs={24} sm={12} md={8} lg={6} key={court}>
                <Card
                  title={
                    <Space>
                      <EnvironmentOutlined />
                      {court}
                      <Badge count={matches.length} />
                    </Space>
                  }
                  size='small'
                >
                  <Timeline>
                    {matches
                      .sort(
                        (a, b) =>
                          new Date(a.scheduledTime?.toString() || 0).getTime() -
                          new Date(b.scheduledTime?.toString() || 0).getTime()
                      )
                      .map((match) => (
                        <Timeline.Item
                          key={match._id}
                          color={
                            match.status === 'completed' ? 'green' : 'blue'
                          }
                        >
                          <div style={{ fontSize: '12px' }}>
                            <strong>
                              {dayjs(match.scheduledTime?.toString()).format(
                                'h:mm A'
                              )}
                            </strong>
                            <div>
                              Match {match.matchNumber} (R{match.round})
                            </div>
                            <div>
                              {match.team1?.name || 'TBD'} vs{' '}
                              {match.team2?.name || 'TBD'}
                            </div>
                            <Tag
                              color={
                                match.status === 'completed'
                                  ? 'success'
                                  : 'processing'
                              }
                            >
                              {match.status}
                            </Tag>
                          </div>
                        </Timeline.Item>
                      ))}
                  </Timeline>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <CalendarOutlined /> Schedule Matches
      </Title>
      <Text type='secondary'>
        Schedule match times and assign courts for {tournamentName}{' '}
        {tournamentYear}
      </Text>

      <Divider />

      {/* Header with stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card size='small'>
            <Statistic
              title='Unscheduled Matches'
              value={unscheduledMatches.length}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size='small'>
            <Statistic
              title='Scheduled Matches'
              value={scheduledMatches.length}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size='small'>
            <Statistic
              title='Total Courts'
              value={courts.length}
              prefix={<EnvironmentOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size='small'>
            <Statistic
              title='Completion'
              value={
                scheduledMatches.length > 0
                  ? Math.round(
                      (scheduledMatches.length /
                        (scheduledMatches.length + unscheduledMatches.length)) *
                        100
                    )
                  : 0
              }
              suffix='%'
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Action buttons */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} justify='space-between' align='middle'>
          <Col>
            <Space wrap>
              {/* Schedule Generation Buttons */}
              <Button
                type='primary'
                icon={<ScheduleOutlined />}
                onClick={() => setShowScheduleForm(true)}
                loading={generating}
              >
                Generate Schedule
              </Button>

              {/* Reset & Recreate Buttons */}
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={async () => {
                  try {
                    const response = await axios.get(
                      `${API_URL}/tournaments/${tournamentId}/schedule/can-reset`,
                      getAuthHeader()
                    );

                    if (
                      response.data.success &&
                      response.data.canReset?.softReset
                    ) {
                      setShowResetModal(true);
                    } else {
                      // Check specific restrictions
                      const tournamentStatus = tournament?.status;
                      const completedMatches =
                        response.data.statistics?.completedMatches || 0;

                      let errorMessage = 'Cannot reset schedule.';
                      if (tournamentStatus === 'completed') {
                        errorMessage += ' Tournament is already completed.';
                      } else if (completedMatches > 0) {
                        errorMessage += ` There are ${completedMatches} completed matches.`;
                      } else {
                        errorMessage += ' Please check tournament status.';
                      }

                      Modal.error({
                        title: 'Cannot Reset Schedule',
                        content: errorMessage,
                      });
                    }
                  } catch (error: any) {
                    console.error('Error checking schedule reset:', error);
                    message.error('Failed to check schedule reset status');
                  }
                }}
              >
                Reset Schedule
              </Button>

              <Button
                type='primary'
                icon={<SyncOutlined />}
                onClick={async () => {
                  Modal.confirm({
                    title: 'Recreate Tournament Bracket',
                    content: (
                      <div>
                        <p>
                          This will delete all existing matches and create a new
                          bracket.
                        </p>
                        <p>
                          <strong>Current Teams:</strong>{' '}
                          {tournament?.registeredTeams?.length || 0}
                        </p>
                        <p>
                          <strong>Format:</strong>{' '}
                          {tournament?.format || 'single-elimination'}
                        </p>
                        <Alert
                          type='warning'
                          message='Warning: All match history and scores will be lost!'
                          style={{ marginTop: '10px' }}
                        />
                      </div>
                    ),
                    okText: 'Recreate Bracket',
                    okType: 'primary',
                    cancelText: 'Cancel',
                    onOk: async () => {
                      try {
                        setLoading(true);
                        const response = await axios.post(
                          `${API_URL}/tournaments/${tournamentId}/bracket/recreate`,
                          {
                            format: tournament?.format,
                            seeding: 'random',
                          },
                          getAuthHeader()
                        );

                        if (response.data.success) {
                          message.success('Bracket recreated successfully!');
                          fetchTournamentData();

                          // Show success details
                          notification.success({
                            message: 'Bracket Recreation Complete',
                            description: (
                              <div>
                                <p>Created {response.data.matches} matches</p>
                                <p>Format: {response.data.format}</p>
                                <p>Teams: {response.data.teamCount}</p>
                              </div>
                            ),
                            duration: 5,
                          });
                        }
                      } catch (error: any) {
                        console.error('Error recreating bracket:', error);
                        message.error(
                          error.response?.data?.message ||
                            'Failed to recreate bracket'
                        );
                      } finally {
                        setLoading(false);
                      }
                    },
                  });
                }}
                loading={loading}
                style={{ marginLeft: '8px' }}
              >
                Recreate Bracket
              </Button>

              {/* Refresh Button */}
              <Button
                icon={<SyncOutlined />}
                onClick={fetchTournamentData}
                loading={loading}
              >
                Refresh
              </Button>

              {/* Back to Bracket Button (if needed) */}
              {onBack && (
                <Button icon={<ClockCircleOutlined />} onClick={onBack}>
                  Back to Bracket
                </Button>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => exportSchedule('json')}
              >
                Export
              </Button>
              <Button
                icon={<PrinterOutlined />}
                onClick={() => {
                  const printContent = document.getElementById(
                    'schedule-print-view'
                  );
                  if (printContent) {
                    const originalContent = document.body.innerHTML;
                    const printView = printContent.innerHTML;

                    document.body.innerHTML = printView;
                    window.print();
                    document.body.innerHTML = originalContent;
                    window.location.reload();
                  }
                }}
              >
                Print
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main content */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab='Calendar View' key='calendar'>
          <Card>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <DatePicker
                value={selectedDate}
                onChange={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    fetchScheduleForDate(date.format('YYYY-MM-DD'));
                  }
                }}
                format='MMMM D, YYYY'
                allowClear={false}
                style={{ width: '300px' }}
              />
            </div>
            {renderCourtSchedule()}
          </Card>
        </TabPane>

        <TabPane tab='Unscheduled Matches' key='unscheduled'>
          <Card
            title={
              <Space>
                <WarningOutlined />
                Matches Needing Schedule ({unscheduledMatches.length})
              </Space>
            }
          >
            <Table
              dataSource={unscheduledMatches}
              columns={unscheduledColumns}
              rowKey='_id'
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane tab='Scheduled Matches' key='scheduled'>
          <Card
            title={
              <Space>
                <CheckCircleOutlined />
                Scheduled Matches ({scheduledMatches.length})
              </Space>
            }
          >
            <Table
              dataSource={scheduledMatches}
              columns={scheduledColumns}
              rowKey='_id'
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane tab='Time Slots' key='slots'>
          <Card title='Available Time Slots'>
            {availableTimeSlots.length === 0 ? (
              <Empty description='No available time slots for selected date' />
            ) : (
              <Row gutter={[16, 16]}>
                {availableTimeSlots.map((slot, index) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={index}>
                    <Card size='small'>
                      <div style={{ textAlign: 'center' }}>
                        <Title level={5} style={{ margin: 0 }}>
                          {dayjs(slot.start).format('h:mm A')}
                        </Title>
                        <Text type='secondary'>to</Text>
                        <Title level={5} style={{ margin: 0 }}>
                          {dayjs(slot.end).format('h:mm A')}
                        </Title>
                        <Divider style={{ margin: '8px 0' }} />
                        <Tag color='success'>Available</Tag>
                        <div style={{ fontSize: '12px', marginTop: '8px' }}>
                          Duration: {slot.duration} minutes
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </TabPane>

        <TabPane tab='Schedule Management' key='management'>
          <Card title='Schedule Administration'>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Card
                  title='Reset Schedule'
                  size='small'
                  actions={[
                    <Button
                      key='reset'
                      danger
                      block
                      onClick={() => setShowResetModal(true)}
                      icon={<DeleteOutlined />}
                    >
                      Reset Schedule
                    </Button>,
                  ]}
                >
                  <Text type='secondary'>
                    Clear all scheduled times and courts. You can choose to keep
                    matches or delete everything.
                  </Text>
                  <Divider />
                  <Space direction='vertical' size='small'>
                    <Text>
                      <strong>Soft Reset:</strong> Keep matches, clear schedule
                    </Text>
                    <Text>
                      <strong>Hard Reset:</strong> Delete all matches
                    </Text>
                    <Text>
                      <strong>Partial Reset:</strong> Clear future matches only
                    </Text>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card
                  title='Recreate Bracket'
                  size='small'
                  actions={[
                    <Button
                      key='recreate'
                      type='primary'
                      block
                      onClick={recreateBracket}
                      loading={loading}
                      icon={<SyncOutlined />}
                    >
                      Recreate Bracket
                    </Button>,
                  ]}
                >
                  <Text type='secondary'>
                    Generate a new bracket with current registered teams. This
                    will replace all existing matches.
                  </Text>
                  <Divider />
                  <Space direction='vertical' size='small'>
                    <Text>
                      <strong>Format:</strong>{' '}
                      {tournament?.format || 'single-elimination'}
                    </Text>
                    <Text>
                      <strong>Teams:</strong>{' '}
                      {tournament?.registeredTeams?.length || 0} registered
                    </Text>
                    <Text>
                      <strong>Seeding:</strong> Random
                    </Text>
                  </Space>
                </Card>
              </Col>
            </Row>

            <Divider />

            <Alert
              type='info'
              message='Schedule Reset Statistics'
              description={
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title='Total Matches'
                      value={
                        scheduledMatches.length + unscheduledMatches.length
                      }
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title='Scheduled'
                      value={scheduledMatches.length}
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title='Unscheduled'
                      value={unscheduledMatches.length}
                      valueStyle={{ color: '#cf1322' }}
                    />
                  </Col>
                </Row>
              }
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* Modals */}
      <ScheduleMatchModal
        editingMatch={editingMatch}
        onCancel={() => setEditingMatch(null)}
        onSchedule={scheduleMatch}
        tournament={tournament}
        courts={courts}
      />

      <GenerateScheduleModal
        visible={showScheduleForm}
        onCancel={() => setShowScheduleForm(false)}
        onSubmit={generateAutomaticSchedule}
        tournament={tournament}
        selectedCourts={selectedCourts}
        onCourtsChange={setSelectedCourts}
        generating={generating}
      />

      <ScheduleResetModal
        visible={showResetModal}
        onCancel={() => setShowResetModal(false)}
        onReset={resetSchedule}
        tournament={tournament}
        loading={loading}
      />

      {/* Conflict resolution */}
      {conflicts.length > 0 && (
        <Drawer
          title='Scheduling Conflicts'
          open={conflicts.length > 0}
          onClose={() => setConflicts([])}
          width={600}
        >
          <Alert
            type='warning'
            message='The following conflicts were detected:'
            style={{ marginBottom: '20px' }}
          />
          <Table
            dataSource={conflicts}
            columns={[
              { title: 'Match', dataIndex: 'matchNumber', key: 'matchNumber' },
              { title: 'Teams', dataIndex: 'teams', key: 'teams' },
              { title: 'Time', dataIndex: 'time', key: 'time' },
              { title: 'Court', dataIndex: 'court', key: 'court' },
            ]}
            rowKey='matchNumber'
            pagination={false}
          />
          <div style={{ marginTop: '20px' }}>
            <Button
              type='primary'
              onClick={() => {
                notification.info({
                  message: 'Manual Resolution Required',
                  description:
                    'Please adjust schedules manually to resolve conflicts.',
                });
                setConflicts([]);
              }}
            >
              Acknowledge
            </Button>
          </div>
        </Drawer>
      )}
    </div>
  );
};

export default ScheduleBuilder;
