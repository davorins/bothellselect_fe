import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Upload,
  Switch,
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Tag,
  message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  EyeOutlined,
  BarChartOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import { Advertisement, AdStats } from '../../../types/advertisement-types';
import dayjs from 'dayjs';
import './AdminAdManager.css';

const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const AdminAdManager: React.FC = () => {
  const { getAuthToken } = useAuth();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [stats, setStats] = useState<AdStats | null>(null);
  const [form] = Form.useForm();

  // File states
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState<string>('');
  const [mobilePreview, setMobilePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/ads/admin`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.ok) {
        const data = await response.json();
        setAds(data.ads || []);
      } else {
        message.error('Failed to load advertisements');
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
      message.error('Failed to load advertisements');
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  const fetchStats = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/ads/admin/stats`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchAds();
    fetchStats();
  }, [fetchAds, fetchStats]);

  const handleImageUpload = (file: File, type: 'desktop' | 'mobile') => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Please upload an image file');
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB');
      return false;
    }

    if (type === 'desktop') {
      setDesktopFile(file);
      setDesktopPreview(URL.createObjectURL(file));
    } else {
      setMobileFile(file);
      setMobilePreview(URL.createObjectURL(file));
    }

    return false;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setUploading(true);

      const formData = new FormData();

      // Add form fields
      Object.keys(values).forEach((key) => {
        if (key === 'dateRange' && values.dateRange) {
          if (values.dateRange[0]) {
            formData.append('startDate', values.dateRange[0].toISOString());
          }
          if (values.dateRange[1]) {
            formData.append('endDate', values.dateRange[1].toISOString());
          }
        } else if (key === 'targetRoles' || key === 'targetPages') {
          formData.append(key, JSON.stringify(values[key]));
        } else if (values[key] !== undefined && values[key] !== null) {
          formData.append(key, values[key]);
        }
      });

      // Add images (only if new files are selected)
      if (desktopFile) formData.append('desktopImage', desktopFile);
      if (mobileFile) formData.append('mobileImage', mobileFile);

      const token = await getAuthToken();
      const url = editingAd
        ? `${process.env.REACT_APP_API_BASE_URL}/ads/admin/${editingAd._id}`
        : `${process.env.REACT_APP_API_BASE_URL}/ads/admin`;

      const response = await fetch(url, {
        method: editingAd ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        message.success(
          editingAd ? 'Ad updated successfully' : 'Ad created successfully',
        );
        setModalVisible(false);
        resetForm();
        fetchAds();
        fetchStats();
      } else {
        const error = await response.json();
        message.error(error.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving ad:', error);
      message.error('Please check all fields');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (adId: string) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/ads/admin/${adId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.ok) {
        message.success('Ad deleted successfully');
        fetchAds();
        fetchStats();
      } else {
        message.error('Failed to delete ad');
      }
    } catch (error) {
      console.error('Error deleting ad:', error);
      message.error('Failed to delete ad');
    }
  };

  const resetForm = () => {
    form.resetFields();
    setEditingAd(null);
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopPreview('');
    setMobilePreview('');
  };

  const openEditModal = (ad: Advertisement) => {
    console.log('Editing ad:', ad); // Debug log

    setEditingAd(ad);

    // Set form values
    form.setFieldsValue({
      businessName: ad.businessName,
      title: ad.title,
      description: ad.description,
      clickUrl: ad.clickUrl,
      ctaText: ad.ctaText,
      contactEmail: ad.contactEmail,
      contactPhone: ad.contactPhone,
      website: ad.website,
      placement: ad.placement,
      displayOrder: ad.displayOrder,
      isActive: ad.isActive,
      targetRoles: ad.targetRoles || [],
      targetPages: ad.targetPages || ['all'],
      showOnceOnly: ad.showOnceOnly,
      cooldownDays: ad.cooldownDays,
      dateRange:
        ad.startDate && ad.endDate
          ? [dayjs(ad.startDate), dayjs(ad.endDate)]
          : null,
    });

    // Set image previews
    setDesktopPreview(ad.desktopImage?.url || '');
    setMobilePreview(ad.mobileImage?.url || '');

    setModalVisible(true);
  };

  const columns = [
    {
      title: 'Business',
      dataIndex: 'businessName',
      key: 'businessName',
      width: 200,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: 'Placement',
      dataIndex: 'placement',
      key: 'placement',
      width: 100,
      render: (v: string) => <Tag color='blue'>{v}</Tag>,
    },
    {
      title: 'Impressions',
      dataIndex: 'impressions',
      key: 'impressions',
      width: 120,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: 'Clicks',
      dataIndex: 'clicks',
      key: 'clicks',
      width: 100,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: 'CTR',
      key: 'ctr',
      width: 80,
      render: (_: any, record: Advertisement) => {
        const ctr =
          record.impressions > 0
            ? ((record.clicks / record.impressions) * 100).toFixed(2)
            : '0';
        return `${ctr}%`;
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: Advertisement) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
            title='Edit Ad'
          />
          <Popconfirm
            title='Delete this ad?'
            description='This action cannot be undone'
            onConfirm={() => handleDelete(record._id)}
            okText='Yes'
            cancelText='No'
          >
            <Button icon={<DeleteOutlined />} danger title='Delete Ad' />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className='page-wrapper'>
      <div className='admin-ad-manager'>
        {/* Statistics Cards */}
        <Row gutter={[16, 16]} className='mb-4'>
          <Col xs={24} sm={12} lg={6}>
            <Card className='stat-card'>
              <Statistic
                title='Total Impressions'
                value={stats?.totalImpressions || 0}
                prefix={<EyeOutlined />}
                valueStyle={{ color: '#3f87f5' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className='stat-card'>
              <Statistic
                title='Total Clicks'
                value={stats?.totalClicks || 0}
                prefix={<EyeOutlined />}
                valueStyle={{ color: '#10b981' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className='stat-card'>
              <Statistic
                title='Click-Through Rate'
                value={stats?.clickThroughRate || 0}
                suffix='%'
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#f59e0b' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className='stat-card'>
              <Statistic
                title='Active Campaigns'
                value={stats?.activeAds || 0}
                prefix={<PlusOutlined />}
                valueStyle={{ color: '#06b6d4' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Ads Table */}
        <Card
          title='Advertisement Management'
          extra={
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={() => {
                resetForm();
                setModalVisible(true);
              }}
            >
              Create Ad
            </Button>
          }
        >
          <Table
            columns={columns}
            dataSource={ads}
            rowKey='_id'
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1000 }}
          />
        </Card>

        {/* Create/Edit Modal */}
        <Modal
          title={editingAd ? 'Edit Advertisement' : 'Create Advertisement'}
          open={modalVisible}
          onCancel={() => {
            setModalVisible(false);
            resetForm();
          }}
          onOk={handleSubmit}
          confirmLoading={uploading}
          width={800}
          okText={editingAd ? 'Update' : 'Create'}
          cancelText='Cancel'
        >
          <Form form={form} layout='vertical'>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name='businessName'
                  label='Business Name'
                  rules={[
                    { required: true, message: 'Business name is required' },
                  ]}
                >
                  <Input placeholder='Enter business name' />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name='title' label='Ad Title'>
                  <Input placeholder='Enter ad title (optional, defaults to business name)' />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name='description' label='Description'>
              <TextArea rows={3} placeholder='Enter ad description' />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name='clickUrl' label='Click URL'>
                  <Input placeholder='https://...' />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name='ctaText' label='Button Text'>
                  <Input placeholder='Learn More' />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name='contactEmail' label='Contact Email'>
                  <Input type='email' placeholder='contact@business.com' />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name='contactPhone' label='Contact Phone'>
                  <Input placeholder='(555) 123-4567' />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name='website' label='Website'>
              <Input placeholder='https://business.com' />
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name='placement' label='Placement'>
                  <Select>
                    <Option value='sidebar'>Sidebar</Option>
                    <Option value='header'>Header</Option>
                    <Option value='footer'>Footer</Option>
                    <Option value='inline'>Inline</Option>
                    <Option value='popup'>Popup</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name='displayOrder' label='Display Order'>
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name='isActive'
                  label='Active'
                  valuePropName='checked'
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name='targetRoles' label='Target Roles'>
                  <Select mode='multiple' placeholder='Select roles'>
                    <Option value='admin'>Admin</Option>
                    <Option value='coach'>Coach</Option>
                    <Option value='parent'>Parent</Option>
                    <Option value='student'>Student</Option>
                    <Option value='guest'>Guest</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name='targetPages' label='Target Pages'>
                  <Select mode='tags' placeholder="Enter page slugs or 'all'">
                    <Option value='all'>All Pages</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name='dateRange' label='Date Range'>
                  <RangePicker style={{ width: '100%' }} showTime />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name='showOnceOnly'
                  label='Show Once'
                  valuePropName='checked'
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name='cooldownDays' label='Cooldown (days)'>
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label='Desktop Image'>
                  <Upload
                    beforeUpload={(file) => handleImageUpload(file, 'desktop')}
                    showUploadList={false}
                    accept='image/*'
                  >
                    <Button icon={<UploadOutlined />}>
                      Upload Desktop Image
                    </Button>
                  </Upload>
                  {desktopPreview && (
                    <div className='image-preview mt-2'>
                      <img
                        src={desktopPreview}
                        alt='Desktop preview'
                        style={{ maxWidth: '100%', maxHeight: '100px' }}
                      />
                    </div>
                  )}
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label='Mobile Image'>
                  <Upload
                    beforeUpload={(file) => handleImageUpload(file, 'mobile')}
                    showUploadList={false}
                    accept='image/*'
                  >
                    <Button icon={<UploadOutlined />}>
                      Upload Mobile Image
                    </Button>
                  </Upload>
                  {mobilePreview && (
                    <div className='image-preview mt-2'>
                      <img
                        src={mobilePreview}
                        alt='Mobile preview'
                        style={{ maxWidth: '100%', maxHeight: '100px' }}
                      />
                    </div>
                  )}
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default AdminAdManager;
