// feature-module/pages/tournament/TournamentBracket.tsx
import React, { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Tag,
  Space,
  Divider,
  Progress,
  Badge,
  Timeline,
  Empty,
  Tooltip,
  Modal,
  Statistic,
  Alert,
  Collapse,
} from 'antd';
import {
  TrophyOutlined,
  CrownOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  HistoryOutlined,
  FireOutlined,
  RocketOutlined,
  FullscreenOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ArrowsAltOutlined,
  StarOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface AntDesignTournamentBracketProps {
  matches: any[];
  tournamentFormat: string;
  viewMode: 'classic' | 'modern';
}

const AntDesignTournamentBracket: React.FC<AntDesignTournamentBracketProps> = ({
  matches,
  tournamentFormat,
  viewMode,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [matchModalVisible, setMatchModalVisible] = useState(false);

  const rounds = useMemo(() => {
    const roundsMap = new Map<number, any[]>();
    matches.forEach((match) => {
      if (!roundsMap.has(match.round)) {
        roundsMap.set(match.round, []);
      }
      roundsMap.get(match.round)!.push(match);
    });

    return Array.from(roundsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, roundMatches]) => ({
        round,
        matches: roundMatches.sort((a, b) => a.matchNumber - b.matchNumber),
      }));
  }, [matches]);

  const handleMatchClick = (match: any) => {
    setSelectedMatch(match);
    setMatchModalVisible(true);
  };

  const renderModernBracket = () => {
    if (!rounds.length) return null;

    return (
      <div style={{ overflowX: 'auto', padding: '24px 0' }}>
        <div style={{ display: 'flex', minWidth: rounds.length * 400 }}>
          {rounds.map(({ round, matches: roundMatches }, roundIndex) => (
            <div key={round} style={{ flex: 1, minWidth: 350 }}>
              {/* Round Header */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Card
                  size='small'
                  style={{
                    display: 'inline-block',
                    background:
                      roundIndex === rounds.length - 1
                        ? 'linear-gradient(135deg, #ffd700, #ffaa00)'
                        : 'linear-gradient(135deg, #1890ff, #52c41a)',
                    border: 'none',
                    color: 'white',
                  }}
                >
                  <Space direction='vertical' size={0}>
                    <Text strong style={{ color: 'white', fontSize: 16 }}>
                      {roundIndex === rounds.length - 1
                        ? 'CHAMPIONSHIP'
                        : `ROUND ${round}`}
                    </Text>
                    <Text
                      style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}
                    >
                      {roundMatches.length} Match
                      {roundMatches.length !== 1 ? 'es' : ''}
                    </Text>
                  </Space>
                </Card>
              </div>

              {/* Matches in this round */}
              <div style={{ position: 'relative', minHeight: 800 }}>
                {roundMatches.map((match, matchIndex) => {
                  const isCompleted = match.status === 'completed';
                  const isLive = match.status === 'in-progress';
                  const isFinal = roundIndex === rounds.length - 1;

                  return (
                    <div
                      key={match._id}
                      style={{
                        position: 'absolute',
                        top: `${matchIndex * 180 + 40}px`,
                        left: 0,
                        right: 0,
                      }}
                    >
                      {/* Connector lines */}
                      {roundIndex > 0 && (
                        <>
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: -40,
                              width: 40,
                              height: 2,
                              background: '#1890ff',
                              zIndex: 0,
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: matchIndex % 2 === 0 ? '50%' : '50%',
                              left: -40,
                              width: 2,
                              height: 90,
                              background: '#1890ff',
                              zIndex: 0,
                            }}
                          />
                        </>
                      )}

                      {/* Match Card */}
                      <Card
                        hoverable
                        onClick={() => handleMatchClick(match)}
                        style={{
                          position: 'relative',
                          zIndex: 1,
                          border: isLive
                            ? '2px solid #f5222d'
                            : isCompleted
                            ? '2px solid #52c41a'
                            : '1px solid #d9d9d9',
                          borderRadius: 8,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          background: isFinal
                            ? 'linear-gradient(135deg, #fff9e6, #fff1b8)'
                            : 'white',
                        }}
                        styles={{ body: { padding: 12 } }}
                      >
                        {/* Match header */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                            paddingBottom: 8,
                            borderBottom: '1px solid #f0f0f0',
                          }}
                        >
                          <Space>
                            <Tag color={isFinal ? 'gold' : 'blue'}>
                              {isFinal ? 'FINAL' : `Match ${match.matchNumber}`}
                            </Tag>
                            {isLive && (
                              <Badge status='processing' text='LIVE' />
                            )}
                          </Space>
                          {match.court && (
                            <Tag color='green'>
                              <EnvironmentOutlined /> Court {match.court}
                            </Tag>
                          )}
                        </div>

                        {/* Teams */}
                        <div style={{ marginBottom: 8 }}>
                          {/* Team 1 */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              marginBottom: 4,
                              background:
                                isCompleted && match.winner === match.team1?._id
                                  ? '#f6ffed'
                                  : '#fafafa',
                              borderRadius: 4,
                              border:
                                isCompleted && match.winner === match.team1?._id
                                  ? '1px solid #b7eb8f'
                                  : '1px solid transparent',
                            }}
                          >
                            <Space>
                              <Avatar
                                size='small'
                                style={{
                                  background:
                                    isCompleted &&
                                    match.winner === match.team1?._id
                                      ? '#52c41a'
                                      : '#1890ff',
                                  color: 'white',
                                  fontWeight: 'bold',
                                }}
                              >
                                {match.team1?.name?.charAt(0) || '?'}
                              </Avatar>
                              <div>
                                <Text strong style={{ fontSize: 14 }}>
                                  {match.team1?.name || 'TBD'}
                                </Text>
                                {match.team1 && (
                                  <div style={{ fontSize: 11, color: '#999' }}>
                                    {match.team1.grade} •{' '}
                                    {match.team1.levelOfCompetition}
                                  </div>
                                )}
                              </div>
                            </Space>
                            <Text strong style={{ fontSize: 16 }}>
                              {match.team1Score}
                            </Text>
                          </div>

                          {/* VS Divider */}
                          <div style={{ textAlign: 'center', margin: '4px 0' }}>
                            <Divider style={{ margin: '8px 0' }}>VS</Divider>
                          </div>

                          {/* Team 2 */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              background:
                                isCompleted && match.winner === match.team2?._id
                                  ? '#f6ffed'
                                  : '#fafafa',
                              borderRadius: 4,
                              border:
                                isCompleted && match.winner === match.team2?._id
                                  ? '1px solid #b7eb8f'
                                  : '1px solid transparent',
                            }}
                          >
                            <Space>
                              <Avatar
                                size='small'
                                style={{
                                  background:
                                    isCompleted &&
                                    match.winner === match.team2?._id
                                      ? '#52c41a'
                                      : '#722ed1',
                                  color: 'white',
                                  fontWeight: 'bold',
                                }}
                              >
                                {match.team2?.name?.charAt(0) || '?'}
                              </Avatar>
                              <div>
                                <Text strong style={{ fontSize: 14 }}>
                                  {match.team2?.name || 'TBD'}
                                </Text>
                                {match.team2 && (
                                  <div style={{ fontSize: 11, color: '#999' }}>
                                    {match.team2.grade} •{' '}
                                    {match.team2.levelOfCompetition}
                                  </div>
                                )}
                              </div>
                            </Space>
                            <Text strong style={{ fontSize: 16 }}>
                              {match.team2Score}
                            </Text>
                          </div>
                        </div>

                        {/* Match footer */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: 12,
                            color: '#999',
                          }}
                        >
                          {match.scheduledTime ? (
                            <Space>
                              <ClockCircleOutlined />
                              <Text>
                                {new Date(
                                  match.scheduledTime
                                ).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Text>
                            </Space>
                          ) : (
                            <Text type='secondary'>Time TBD</Text>
                          )}
                          <Tag
                            color={
                              isCompleted
                                ? 'success'
                                : isLive
                                ? 'error'
                                : 'default'
                            }
                          >
                            {isCompleted
                              ? 'COMPLETED'
                              : isLive
                              ? 'LIVE'
                              : 'SCHEDULED'}
                          </Tag>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderClassicBracket = () => {
    return (
      <div style={{ padding: '24px', background: 'white', borderRadius: 8 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <Space>
            <Button
              icon={<ZoomOutOutlined />}
              onClick={() => setZoomLevel((prev) => Math.max(0.5, prev - 0.1))}
            />
            <Progress
              percent={Math.round(zoomLevel * 100)}
              size='small'
              style={{ width: 100 }}
              showInfo={false}
            />
            <Button
              icon={<ZoomInOutlined />}
              onClick={() => setZoomLevel((prev) => Math.min(2, prev + 0.1))}
            />
            <Button
              icon={<ArrowsAltOutlined />}
              onClick={() => setZoomLevel(1)}
            >
              Reset
            </Button>
          </Space>
        </div>

        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
          }}
        >
          {rounds.length > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {rounds.map(({ round, matches: roundMatches }, roundIndex) => (
                <div key={round} style={{ margin: '0 16px' }}>
                  {/* Round Header */}
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <Title level={5} style={{ margin: 0 }}>
                      {roundIndex === rounds.length - 1
                        ? 'FINAL'
                        : `Round ${round}`}
                    </Title>
                    <Text type='secondary'>{roundMatches.length} matches</Text>
                  </div>

                  {/* Matches */}
                  <div style={{ minWidth: 250 }}>
                    {roundMatches.map((match) => (
                      <div
                        key={match._id}
                        style={{
                          marginBottom: 8,
                          padding: 12,
                          background: '#fafafa',
                          border: '1px solid #d9d9d9',
                          borderRadius: 4,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            color: '#666',
                            marginBottom: 4,
                          }}
                        >
                          Match #{match.matchNumber}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 'bold' }}>
                              {match.team1?.name || '______'}
                            </div>
                            <div style={{ fontSize: 11, color: '#999' }}>
                              {match.team1
                                ? `Grade ${match.team1.grade}`
                                : 'TBD'}
                            </div>
                          </div>
                          <div style={{ fontWeight: 'bold', fontSize: 16 }}>
                            {match.team1Score}
                          </div>
                        </div>
                        <Divider style={{ margin: '8px 0', fontSize: 12 }}>
                          vs
                        </Divider>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 'bold' }}>
                              {match.team2?.name || '______'}
                            </div>
                            <div style={{ fontSize: 11, color: '#999' }}>
                              {match.team2
                                ? `Grade ${match.team2.grade}`
                                : 'TBD'}
                            </div>
                          </div>
                          <div style={{ fontWeight: 'bold', fontSize: 16 }}>
                            {match.team2Score}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty description='No matches in this round' />
          )}
        </div>
      </div>
    );
  };

  const renderMatchDetailsModal = () => {
    if (!selectedMatch) return null;

    return (
      <Modal
        title={`Match ${selectedMatch.matchNumber} - Round ${selectedMatch.round}`}
        open={matchModalVisible}
        onCancel={() => setMatchModalVisible(false)}
        footer={[
          <Button key='close' onClick={() => setMatchModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={600}
      >
        <div style={{ padding: '16px 0' }}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Alert
                type={
                  selectedMatch.status === 'completed'
                    ? 'success'
                    : selectedMatch.status === 'in-progress'
                    ? 'error'
                    : 'info'
                }
                message={
                  selectedMatch.status === 'completed'
                    ? 'MATCH COMPLETED'
                    : selectedMatch.status === 'in-progress'
                    ? 'MATCH LIVE'
                    : 'MATCH SCHEDULED'
                }
                description={
                  selectedMatch.scheduledTime
                    ? `Scheduled for ${new Date(
                        selectedMatch.scheduledTime
                      ).toLocaleString()}`
                    : 'Time to be determined'
                }
              />
            </Col>

            <Col span={24}>
              <Card title='Teams' size='small'>
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Avatar
                        size={64}
                        style={{
                          background:
                            selectedMatch.winner === selectedMatch.team1?._id
                              ? '#52c41a'
                              : '#1890ff',
                          color: 'white',
                          fontSize: 24,
                          fontWeight: 'bold',
                          marginBottom: 8,
                        }}
                      >
                        {selectedMatch.team1?.name?.charAt(0) || '?'}
                      </Avatar>
                      <Title level={4}>
                        {selectedMatch.team1?.name || 'TBD'}
                      </Title>
                      {selectedMatch.team1 && (
                        <>
                          <Space>
                            <Tag>Grade {selectedMatch.team1.grade}</Tag>
                            <Tag
                              color={
                                selectedMatch.team1.levelOfCompetition ===
                                'Gold'
                                  ? 'gold'
                                  : 'default'
                              }
                            >
                              {selectedMatch.team1.levelOfCompetition}
                            </Tag>
                          </Space>
                        </>
                      )}
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Avatar
                        size={64}
                        style={{
                          background:
                            selectedMatch.winner === selectedMatch.team2?._id
                              ? '#52c41a'
                              : '#722ed1',
                          color: 'white',
                          fontSize: 24,
                          fontWeight: 'bold',
                          marginBottom: 8,
                        }}
                      >
                        {selectedMatch.team2?.name?.charAt(0) || '?'}
                      </Avatar>
                      <Title level={4}>
                        {selectedMatch.team2?.name || 'TBD'}
                      </Title>
                      {selectedMatch.team2 && (
                        <>
                          <Space>
                            <Tag>Grade {selectedMatch.team2.grade}</Tag>
                            <Tag
                              color={
                                selectedMatch.team2.levelOfCompetition ===
                                'Gold'
                                  ? 'gold'
                                  : 'default'
                              }
                            >
                              {selectedMatch.team2.levelOfCompetition}
                            </Tag>
                          </Space>
                        </>
                      )}
                    </div>
                  </Col>
                </Row>

                <Divider>Score</Divider>

                <div style={{ textAlign: 'center' }}>
                  <Row gutter={32} justify='center' align='middle'>
                    <Col>
                      <Statistic
                        title={selectedMatch.team1?.name || 'Team 1'}
                        value={selectedMatch.team1Score}
                        valueStyle={{ fontSize: 48, fontWeight: 'bold' }}
                      />
                    </Col>
                    <Col>
                      <Title level={1} style={{ margin: 0 }}>
                        -
                      </Title>
                    </Col>
                    <Col>
                      <Statistic
                        title={selectedMatch.team2?.name || 'Team 2'}
                        value={selectedMatch.team2Score}
                        valueStyle={{ fontSize: 48, fontWeight: 'bold' }}
                      />
                    </Col>
                  </Row>
                </div>

                {selectedMatch.winner && (
                  <Alert
                    type='success'
                    message='WINNER'
                    description={
                      <Space>
                        <CrownOutlined />
                        <Text strong>
                          {selectedMatch.winner === selectedMatch.team1?._id
                            ? selectedMatch.team1?.name
                            : selectedMatch.team2?.name}
                        </Text>
                      </Space>
                    }
                    style={{ marginTop: 16 }}
                  />
                )}
              </Card>
            </Col>

            <Col span={24}>
              <Collapse>
                <Panel header='Match Details' key='1'>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    {selectedMatch.court && (
                      <Space>
                        <EnvironmentOutlined />
                        <Text>Court: {selectedMatch.court}</Text>
                      </Space>
                    )}
                    {selectedMatch.scheduledTime && (
                      <Space>
                        <ClockCircleOutlined />
                        <Text>
                          Time:{' '}
                          {new Date(
                            selectedMatch.scheduledTime
                          ).toLocaleString()}
                        </Text>
                      </Space>
                    )}
                    <Space>
                      <HistoryOutlined />
                      <Text>Round: {selectedMatch.round}</Text>
                    </Space>
                    <Space>
                      <FireOutlined />
                      <Text>
                        Bracket Type: {selectedMatch.bracketType || 'winners'}
                      </Text>
                    </Space>
                  </Space>
                </Panel>
              </Collapse>
            </Col>
          </Row>
        </div>
      </Modal>
    );
  };

  if (matches.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: 48 }}>
        <Empty
          description={
            <div>
              <Title level={4}>Bracket Not Available</Title>
              <Text type='secondary'>
                The tournament bracket will be available once matches are
                scheduled.
              </Text>
            </div>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <div>
      {viewMode === 'modern' ? renderModernBracket() : renderClassicBracket()}
      {renderMatchDetailsModal()}
    </div>
  );
};

// Helper Avatar component
const Avatar = ({ size, style, children }: any) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style,
    }}
  >
    {children}
  </div>
);

export default AntDesignTournamentBracket;
