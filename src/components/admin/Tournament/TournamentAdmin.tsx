// components/admin/Tournament/TournamentAdmin.tsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Tabs,
  Steps,
  Space,
  Alert,
  message,
  Spin,
  Modal,
  TabsProps,
} from 'antd';
import {
  TrophyOutlined,
  TeamOutlined,
  BarChartOutlined,
  CalendarOutlined,
  ArrowLeftOutlined,
  SettingOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import TournamentSelector from './TournamentSelector';
import BracketBuilder from './BracketBuilder';
import ScheduleBuilder from './ScheduleBuilder';
import axios from 'axios';
import {
  TournamentFromTeams,
  Team,
  ApiResponse,
} from '../../../types/tournament';

const { Title, Text } = Typography;
const { Step } = Steps;

const TournamentAdmin: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [selectedTournament, setSelectedTournament] =
    useState<TournamentFromTeams | null>(null);
  const [activeTab, setActiveTab] = useState<string>('bracket');
  const [loading, setLoading] = useState<boolean>(false);
  const [bracketSaved, setBracketSaved] = useState<boolean>(false);

  const API_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  const getAuthHeader = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  const steps = [
    { title: 'Select Tournament', icon: <TrophyOutlined /> },
    { title: 'Build Brackets', icon: <BarChartOutlined /> },
    { title: 'Schedule Matches', icon: <CalendarOutlined /> },
    { title: 'Manage Tournament', icon: <SettingOutlined /> },
  ];

  // Handle tournament selection
  const handleTournamentSelect = (tournament: TournamentFromTeams) => {
    // Check if tournament needs to be created in database
    if (!tournament._id) {
      Modal.confirm({
        title: 'Create Tournament',
        content: `Create tournament "${tournament.name} ${tournament.year}" in the system?`,
        okText: 'Create',
        cancelText: 'Cancel',
        onOk: async () => {
          await createTournamentFromTeams(tournament.name, tournament.year);
        },
      });
    } else {
      // Tournament already exists in database
      setSelectedTournament(tournament);
      setCurrentStep(1);
      setBracketSaved(false);
      message.success(
        `Loaded tournament: ${tournament.name} ${tournament.year}`
      );
    }
  };

  // Create tournament from teams
  const createTournamentFromTeams = async (name: string, year: number) => {
    setLoading(true);
    try {
      const response = await axios.post<ApiResponse>(
        `${API_URL}/tournaments/create-from-teams`,
        { name, year },
        getAuthHeader()
      );

      if (response.data.success && response.data.tournament) {
        const tournamentData: TournamentFromTeams = {
          ...(response.data.tournament as TournamentFromTeams),
          status: response.data.tournament.status || 'draft',
          teams: (response.data.tournament as TournamentFromTeams).teams || [],
          teamCount:
            (response.data.tournament as TournamentFromTeams).teamCount || 0,
        };
        setSelectedTournament(tournamentData);
        setCurrentStep(1);
        setBracketSaved(false);
        message.success('Tournament created successfully!');
      } else {
        message.error(response.data.message || 'Failed to create tournament');
      }
    } catch (error: any) {
      console.error('Error creating tournament:', error);
      message.error(
        error.response?.data?.message || 'Failed to create tournament'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle back to selection
  const handleBackToSelection = () => {
    setSelectedTournament(null);
    setCurrentStep(0);
    setActiveTab('bracket');
    setBracketSaved(false);
  };

  // Handle bracket save
  const handleBracketSave = () => {
    message.success('Bracket saved successfully!');
    setBracketSaved(true);
  };

  // Handle continue to next step
  const handleContinueToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle go to specific step
  const handleGoToStep = (step: number) => {
    // Allow navigation to any completed or current step
    if (step <= currentStep) {
      setCurrentStep(step);
    }
  };

  // Create Tabs items for the new API
  const getTabItems = (): TabsProps['items'] => {
    if (!selectedTournament) return [];

    return [
      {
        key: 'bracket',
        label: (
          <span>
            <BarChartOutlined /> Build Brackets
            {bracketSaved && (
              <CheckCircleOutlined
                style={{ color: '#52c41a', marginLeft: '8px' }}
              />
            )}
          </span>
        ),
        children: (
          <BracketBuilder
            tournamentId={selectedTournament._id}
            onBack={handleBackToSelection}
            onSave={handleBracketSave}
          />
        ),
      },
      {
        key: 'teams',
        label: (
          <span>
            <TeamOutlined /> Teams ({selectedTournament.teamCount})
          </span>
        ),
        children: (
          <Card title='Registered Teams'>
            <Row gutter={[16, 16]}>
              {selectedTournament.teams?.map((team: Team) => (
                <Col key={team._id} xs={24} sm={12} md={8} lg={6}>
                  <Card size='small'>
                    <Title level={5}>{team.name}</Title>
                    <Text type='secondary'>Grade: {team.grade}</Text>
                    <br />
                    <Text type='secondary'>
                      Level: {team.levelOfCompetition}
                    </Text>
                    <br />
                    <Text type='secondary'>Gender: {team.sex}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        ),
      },
    ];
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <TournamentSelector onTournamentSelect={handleTournamentSelect} />
        );
      case 1:
        return selectedTournament && selectedTournament._id ? (
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleBackToSelection}
                style={{ marginBottom: '20px' }}
              >
                Back to Tournament Selection
              </Button>

              <Card style={{ marginBottom: '20px' }}>
                <Title level={3}>
                  <TrophyOutlined /> {selectedTournament.name}{' '}
                  {selectedTournament.year}
                </Title>
                <Alert
                  message={`${steps[currentStep].title}`}
                  description='Build your tournament brackets. Drag teams into match slots and declare winners.'
                  type='info'
                  showIcon
                />
              </Card>
            </div>

            {/* Show tabs for Build Brackets step */}
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={getTabItems()}
              style={{ marginBottom: '20px' }}
            />

            {/* Navigation buttons */}
            <div
              style={{
                marginTop: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '20px',
                backgroundColor: '#fafafa',
                borderRadius: '8px',
              }}
            >
              <button
                type='button'
                className='btn btn-primary'
                onClick={() => setCurrentStep(0)}
              >
                <ArrowLeftOutlined /> Back to Selection
              </button>

              <div>
                {bracketSaved && (
                  <Button
                    type='primary'
                    icon={<CheckCircleOutlined />}
                    disabled
                    style={{ marginRight: '10px' }}
                  >
                    Bracket Saved
                  </Button>
                )}

                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={handleContinueToNextStep}
                >
                  Continue to {steps[currentStep + 1]?.title || 'Next Step'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size='large' />
            <p>Loading tournament data...</p>
          </div>
        );
      case 2:
        return selectedTournament && selectedTournament._id ? (
          <ScheduleBuilder
            tournamentId={selectedTournament._id}
            tournamentName={selectedTournament.name}
            tournamentYear={selectedTournament.year}
            onBack={() => setCurrentStep(1)}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size='large' />
            <p>Loading tournament data...</p>
          </div>
        );
      case 3:
        return selectedTournament && selectedTournament._id ? (
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => setCurrentStep(2)}
                style={{ marginBottom: '20px' }}
              >
                Back to Schedule Matches
              </Button>

              <Card style={{ marginBottom: '20px' }}>
                <Title level={3}>
                  <TrophyOutlined /> {selectedTournament.name}{' '}
                  {selectedTournament.year}
                </Title>
                <Alert
                  message={`${steps[currentStep].title}`}
                  description='Monitor tournament progress and manage settings.'
                  type='info'
                  showIcon
                />
              </Card>
            </div>

            {/* Manage Tournament Content */}
            <Card title='Manage Tournament'>
              <Alert
                message='Tournament Management'
                description='Advanced tournament management features coming soon.'
                type='info'
                showIcon
              />
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <SettingOutlined
                  style={{ fontSize: '48px', color: '#1890ff' }}
                />
                <Title level={4} style={{ marginTop: '20px' }}>
                  Tournament Management
                </Title>
                <Text type='secondary'>
                  Features coming soon: Live scoring, real-time updates, team
                  communications, and advanced analytics.
                </Text>
              </div>
            </Card>

            {/* Navigation buttons */}
            <div
              style={{
                marginTop: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '20px',
                backgroundColor: '#fafafa',
                borderRadius: '8px',
              }}
            >
              <button
                type='button'
                className='btn btn-primary'
                onClick={() => setCurrentStep(2)}
              >
                <ArrowLeftOutlined /> Back to Schedule
              </button>

              <button
                type='button'
                className='btn btn-primary'
                onClick={() => message.success('Tournament setup complete!')}
              >
                Complete Setup
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size='large' />
            <p>Loading tournament data...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div style={{ padding: '20px' }}>
          <Title level={2} style={{ marginBottom: '30px' }}>
            Tournament Management System
          </Title>

          {selectedTournament && (
            <Steps
              current={currentStep}
              style={{ marginBottom: '40px' }}
              onChange={handleGoToStep}
            >
              {steps.map((step, index) => (
                <Step
                  key={index}
                  title={step.title}
                  icon={step.icon}
                  disabled={index > currentStep}
                />
              ))}
            </Steps>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px' }}>
              <Spin size='large' />
              <p>Processing tournament...</p>
            </div>
          ) : (
            renderStepContent()
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentAdmin;
