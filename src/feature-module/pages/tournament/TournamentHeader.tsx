// feature-module/pages/tournament/TournamentHeader.tsx
import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Tag,
  Space,
  Divider,
  Statistic,
  Avatar,
  Progress,
  Badge,
  Tooltip,
  Modal,
  Input,
  Alert,
  message,
  Dropdown,
  Menu,
} from 'antd';
import {
  TrophyOutlined,
  CalendarOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  BellOutlined,
  StarOutlined,
  FireOutlined,
  RocketOutlined,
  CrownOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExportOutlined,
  PrinterOutlined,
  CopyOutlined,
  FullscreenOutlined,
  QrcodeOutlined,
  EyeOutlined,
  SettingOutlined,
  HeartOutlined,
  HeartFilled,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface TournamentHeaderProps {
  tournament: any;
  onShare?: () => void;
  onFollow?: () => void;
  onDownload?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  onFullscreen?: () => void;
  onCopyLink?: () => void;
}

const TournamentHeader: React.FC<TournamentHeaderProps> = ({
  tournament,
  onShare = () => {},
  onFollow = () => {},
  onDownload = () => {},
  onPrint = () => {},
  onExport = () => {},
  onFullscreen = () => {},
  onCopyLink = () => {},
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);

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
        return 'REGISTRATION OPEN';
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
          icon: <RocketOutlined />,
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

  const calculateDuration = () => {
    const start = new Date(tournament.startDate);
    const end = new Date(tournament.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleFollow = () => {
    if (!isFollowing) {
      setFollowModalVisible(true);
    } else {
      setIsFollowing(false);
      message.success('Unfollowed tournament');
    }
  };

  const handleConfirmFollow = () => {
    if (email) {
      setIsFollowing(true);
      setFollowModalVisible(false);
      setEmail('');
      message.success(
        `You're now following ${tournament.name}! Updates will be sent to ${email}`
      );
    } else {
      message.warning('Please enter your email address');
    }
  };

  const handleShareClick = () => {
    setShareModalVisible(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    message.success('Link copied to clipboard!');
    setShareModalVisible(false);
  };

  const handleSocialShare = (platform: string) => {
    const url = window.location.href;
    const text = `Check out ${tournament.name} tournament!`;

    switch (platform) {
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            text
          )}&url=${encodeURIComponent(url)}`,
          '_blank'
        );
        break;
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            url
          )}`,
          '_blank'
        );
        break;
      case 'linkedin':
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
            url
          )}`,
          '_blank'
        );
        break;
    }
    setShareModalVisible(false);
  };

  const formatBadge = getFormatTag(tournament.format);
  const levelBadge = getLevelTag(tournament.levelOfCompetition);
  const durationDays = calculateDuration();

  const tournamentStats = [
    {
      title: 'Teams',
      value: tournament.teamCount,
      icon: <TeamOutlined />,
      color: '#52c41a',
      precision: 0,
    },
    {
      title: 'Tournament Days',
      value: calculateDuration(),
      suffix: ' days',
      icon: <CalendarOutlined />,
      color: '#1890ff',
      precision: 0,
    },
    {
      title: 'Match Duration',
      value: 40,
      suffix: ' mins',
      icon: <ClockCircleOutlined />,
      color: '#fa8c16',
      precision: 0,
    },
    {
      title: 'Level',
      value: tournament.levelOfCompetition,
      icon: <CrownOutlined />,
      color: '#722ed1',
      isText: true,
    },
  ];

  const shareMenu = (
    <Menu>
      <Menu.Item key='copy' icon={<CopyOutlined />} onClick={handleCopyLink}>
        Copy Link
      </Menu.Item>
      <Menu.Item
        key='twitter'
        icon={<span>𝕏</span>}
        onClick={() => handleSocialShare('twitter')}
      >
        Share on Twitter
      </Menu.Item>
      <Menu.Item
        key='facebook'
        icon={<span>f</span>}
        onClick={() => handleSocialShare('facebook')}
      >
        Share on Facebook
      </Menu.Item>
      <Menu.Item
        key='linkedin'
        icon={<span>in</span>}
        onClick={() => handleSocialShare('linkedin')}
      >
        Share on LinkedIn
      </Menu.Item>
      <Menu.Item
        key='qr'
        icon={<QrcodeOutlined />}
        onClick={() => setQrModalVisible(true)}
      >
        Show QR Code
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <Card
        style={{
          marginTop: 54,
          marginBottom: 24,
          background:
            'linear-gradient(135deg, #594230 0%, #5096e4 50%, #6FCCD8 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          border: 'none',
          borderRadius: 12,
          boxShadow: '0 12px 48px rgba(102, 126, 234, 0.4)',
        }}
        styles={{ body: { padding: 32 } }}
      >
        {/* Animated background */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            background:
              'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />

        <Row gutter={[32, 32]}>
          {/* Left Column - Main Info */}
          <Col xs={24} lg={16}>
            <Space direction='vertical' size='large' style={{ width: '100%' }}>
              {/* Header with status and tags */}
              <Space wrap align='center'>
                <Badge
                  status={getStatusColor(tournament.status) as any}
                  text={
                    <Text strong style={{ color: 'white', fontSize: 12 }}>
                      {getStatusText(tournament.status)}
                    </Text>
                  }
                />
                <Tag
                  color={formatBadge.color}
                  icon={formatBadge.icon}
                  style={{ border: 'none', fontWeight: 500, borderRadius: 20 }}
                >
                  {formatBadge.text}
                </Tag>
                <Tag
                  color={levelBadge.color}
                  icon={levelBadge.icon}
                  style={{ border: 'none', fontWeight: 500, borderRadius: 20 }}
                >
                  {levelBadge.text}
                </Tag>
                <Tag
                  color='cyan'
                  style={{ border: 'none', fontWeight: 500, borderRadius: 20 }}
                >
                  {tournament.sex || 'Mixed'}
                </Tag>
                <Tag
                  color='gold'
                  style={{ border: 'none', fontWeight: 500, borderRadius: 20 }}
                >
                  {tournament.year}
                </Tag>
              </Space>

              {/* Tournament Title and Description */}
              <div>
                <Title
                  level={1}
                  style={{
                    color: 'white',
                    margin: 0,
                    fontSize: 42,
                    lineHeight: 1.2,
                  }}
                >
                  <TrophyOutlined style={{ marginRight: 16, fontSize: 36 }} />
                  {tournament.name}
                </Title>
                <Paragraph
                  style={{
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 18,
                    marginTop: 12,
                    marginBottom: 0,
                    lineHeight: 1.6,
                  }}
                  ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
                >
                  {tournament.description}
                </Paragraph>
              </div>

              {/* Key Details */}
              <Space size={[24, 16]} wrap>
                <Space align='center'>
                  <CalendarOutlined
                    style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18 }}
                  />
                  <div>
                    <Text
                      style={{ color: 'white', fontSize: 14, fontWeight: 500 }}
                    >
                      Tournament Dates
                    </Text>
                    <div
                      style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}
                    >
                      {new Date(tournament.startDate).toLocaleDateString()} -{' '}
                      {new Date(tournament.endDate).toLocaleDateString()}
                    </div>
                  </div>
                </Space>
                <Space align='center'>
                  <TeamOutlined
                    style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18 }}
                  />
                  <div>
                    <Text
                      style={{ color: 'white', fontSize: 14, fontWeight: 500 }}
                    >
                      Team Registration
                    </Text>
                    <div
                      style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}
                    >
                      {tournament.teamCount} teams
                    </div>
                  </div>
                </Space>
                {tournament.registrationDeadline && (
                  <Space align='center'>
                    <ClockCircleOutlined
                      style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18 }}
                    />
                    <div>
                      <Text
                        style={{
                          color: 'white',
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      >
                        Registration Deadline
                      </Text>
                      <div
                        style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}
                      >
                        {new Date(
                          tournament.registrationDeadline
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </Space>
                )}
              </Space>

              {/* Action Buttons */}
              <Space
                wrap
                style={{ marginTop: 8, background: 'rgba(255, 255, 255, .85)' }}
              >
                <Dropdown overlay={shareMenu} placement='bottomLeft'>
                  <Button
                    type='primary'
                    ghost
                    icon={<ShareAltOutlined />}
                    size='middle'
                    style={{ borderRadius: 20 }}
                  >
                    Share Tournament
                  </Button>
                </Dropdown>
                <Button
                  type={isFollowing ? 'default' : 'primary'}
                  ghost={!isFollowing}
                  icon={
                    isFollowing ? (
                      <HeartFilled style={{ color: '#ff4d4f' }} />
                    ) : (
                      <BellOutlined />
                    )
                  }
                  onClick={handleFollow}
                  size='middle'
                  style={{ borderRadius: 20 }}
                >
                  {isFollowing ? 'Following' : 'Follow Updates'}
                </Button>
                <Button
                  type='primary'
                  ghost
                  icon={<DownloadOutlined />}
                  onClick={onDownload}
                  size='middle'
                  style={{ borderRadius: 20 }}
                >
                  Download Schedule
                </Button>
                <Button
                  type='primary'
                  ghost
                  icon={<FullscreenOutlined />}
                  onClick={onFullscreen}
                  size='middle'
                  style={{ borderRadius: 20 }}
                >
                  Fullscreen
                </Button>
              </Space>
            </Space>
          </Col>

          {/* Right Column - Statistics */}
          <Col xs={24} lg={8}>
            <Card
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 16,
              }}
              styles={{ body: { padding: 24 } }}
            >
              <Space
                direction='vertical'
                size='middle'
                style={{ width: '100%' }}
              >
                {/* Stats Title */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Title level={4} style={{ color: 'white', margin: 0 }}>
                    <BarChartOutlined style={{ marginRight: 8 }} />
                    Tournament Stats
                  </Title>
                  <Tooltip title='View detailed statistics'>
                    <Button
                      type='text'
                      icon={<EyeOutlined />}
                      style={{ color: 'white' }}
                      size='small'
                    />
                  </Tooltip>
                </div>

                {/* Stats Grid */}
                <Row gutter={[16, 16]}>
                  {tournamentStats.map((stat, index) => (
                    <Col span={12} key={index}>
                      <Card
                        size='small'
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 12,
                          textAlign: 'center',
                        }}
                        styles={{ body: { padding: 16 } }}
                      >
                        <Avatar
                          size='default'
                          style={{
                            backgroundColor: stat.color + '30',
                            color: stat.color,
                            marginBottom: 8,
                            border: `2px solid ${stat.color}40`,
                          }}
                          icon={stat.icon}
                        />
                        {stat.isText ? (
                          <div>
                            <Text
                              style={{
                                color: 'rgba(255,255,255,0.85)',
                                fontSize: 11,
                                display: 'block',
                              }}
                            >
                              {stat.title}
                            </Text>
                            <Text
                              strong
                              style={{ color: 'white', fontSize: 16 }}
                            >
                              {stat.value}
                            </Text>
                          </div>
                        ) : (
                          <Statistic
                            title={
                              <Text
                                style={{
                                  color: 'rgba(255,255,255,0.85)',
                                  fontSize: 11,
                                }}
                              >
                                {stat.title}
                              </Text>
                            }
                            value={stat.value}
                            suffix={stat.suffix}
                            precision={stat.precision}
                            valueStyle={{
                              color: 'white',
                              fontSize: 20,
                              fontWeight: 'bold',
                            }}
                          />
                        )}
                      </Card>
                    </Col>
                  ))}
                </Row>

                <Divider
                  style={{
                    borderColor: 'rgba(255,255,255,0.15)',
                    margin: '8px 0',
                  }}
                />

                {/* Tournament Progress */}
                <div>
                  <Space
                    align='center'
                    style={{
                      marginBottom: 12,
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <Space>
                      <FireOutlined style={{ color: '#fa8c16' }} />
                      <Text style={{ color: 'white', fontWeight: 500 }}>
                        Tournament Progress
                      </Text>
                    </Space>
                    <Text
                      style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}
                    >
                      {tournament.status === 'completed'
                        ? '100%'
                        : tournament.status === 'ongoing'
                        ? '50%'
                        : '25%'}
                    </Text>
                  </Space>
                  <Progress
                    percent={
                      tournament.status === 'completed'
                        ? 100
                        : tournament.status === 'ongoing'
                        ? 50
                        : 25
                    }
                    strokeColor={{
                      '0%': '#52c41a',
                      '50%': '#fa8c16',
                      '100%': '#f5222d',
                    }}
                    size='small'
                    showInfo={false}
                    strokeWidth={6}
                  />
                </div>

                {/* Quick Actions */}
                <Space direction='vertical' size={8} style={{ width: '100%' }}>
                  <Button
                    type='primary'
                    block
                    icon={<PrinterOutlined />}
                    onClick={onPrint}
                    style={{ borderRadius: 8 }}
                  >
                    Print Bracket
                  </Button>
                  <Button
                    block
                    icon={<ExportOutlined />}
                    onClick={onExport}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      borderRadius: 8,
                    }}
                  >
                    Export Data
                  </Button>
                </Space>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Decorative Elements */}
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            opacity: 0.1,
            transform: 'scale(2)',
            pointerEvents: 'none',
          }}
        >
          <TrophyOutlined style={{ fontSize: 48, color: 'white' }} />
        </div>
      </Card>

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

      {/* Share Modal */}
      <Modal
        title='Share Tournament'
        open={shareModalVisible}
        onCancel={() => setShareModalVisible(false)}
        footer={null}
      >
        <Alert
          message='Share with others'
          description='Let others know about this tournament by sharing the link.'
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Space direction='vertical' style={{ width: '100%' }}>
          <Input.Group compact>
            <Input
              style={{ width: 'calc(100% - 80px)' }}
              defaultValue={window.location.href}
              readOnly
            />
            <Button type='primary' onClick={handleCopyLink}>
              Copy
            </Button>
          </Input.Group>
          <Text type='secondary' style={{ fontSize: 12 }}>
            Copy and paste the link to share with others
          </Text>
        </Space>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        title='Scan QR Code'
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={null}
        width={300}
      >
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div
            style={{
              width: 200,
              height: 200,
              margin: '0 auto 16px',
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
              QR Code Placeholder
            </Text>
          </div>
          <Text type='secondary'>
            Scan this QR code to view the tournament on your mobile device
          </Text>
        </div>
      </Modal>
    </>
  );
};

export default TournamentHeader;
