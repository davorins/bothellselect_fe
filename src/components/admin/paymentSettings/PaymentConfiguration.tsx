import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Tabs,
  Tab,
  Badge,
  Row,
  Col,
  Modal,
  InputGroup,
  FormControl,
  Accordion,
  ListGroup,
} from 'react-bootstrap';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import {
  PaymentConfiguration as PaymentConfigType,
  PaymentSystem,
  SquareConfig,
  CloverConfig,
  StripeConfig,
  PaymentSettings,
  ApiResponse,
  TestResult,
  PaymentSystemOption,
  Currency,
  Environment,
} from '../../../types/payment';
import {
  CreditCard,
  Building,
  Shield,
  CheckCircle,
  XCircle,
  TestTube,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  Plus,
  Settings,
  ExternalLink,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

interface PaymentConfigurationProps {}

// Helper function to safely get config values with defaults
const getSafeSquareConfig = (config?: SquareConfig) => ({
  accessToken: config?.accessToken || '',
  applicationId: config?.applicationId || '',
  environment: config?.environment || ('sandbox' as Environment),
  locationId: config?.locationId || '',
  webhookSignatureKey: config?.webhookSignatureKey || '',
});

const getSafeCloverConfig = (config?: CloverConfig) => ({
  merchantId: config?.merchantId || '',
  accessToken: config?.accessToken || '',
  environment: config?.environment || ('sandbox' as Environment),
  apiBaseUrl: config?.apiBaseUrl || 'https://sandbox.dev.clover.com/v3',
});

const getSafeStripeConfig = (config?: StripeConfig) => ({
  secretKey: config?.secretKey || '',
  publishableKey: config?.publishableKey || '',
  webhookSecret: config?.webhookSecret || '',
});

const getSafeSettings = (settings?: PaymentSettings) => ({
  currency: settings?.currency || ('USD' as Currency),
  taxRate: settings?.taxRate || 0,
  enableAutomaticRefunds: settings?.enableAutomaticRefunds ?? true,
  enablePartialRefunds: settings?.enablePartialRefunds ?? true,
  defaultPaymentDescription:
    settings?.defaultPaymentDescription || 'Payment for services',
  receiptEmailTemplate: settings?.receiptEmailTemplate || '',
});

const getSafeWebhookUrls = (webhookUrls?: any) => ({
  paymentSuccess: webhookUrls?.paymentSuccess || '',
  paymentFailed: webhookUrls?.paymentFailed || '',
  refundProcessed: webhookUrls?.refundProcessed || '',
});

// Define form data interface
interface FormData {
  paymentSystem: PaymentSystem;
  isActive: boolean;
  squareConfig: {
    accessToken: string;
    applicationId: string;
    environment: Environment;
    locationId: string;
    webhookSignatureKey: string;
  };
  cloverConfig: {
    merchantId: string;
    accessToken: string;
    environment: Environment;
    apiBaseUrl: string;
  };
  stripeConfig: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
  };
  settings: {
    currency: Currency;
    taxRate: number;
    enableAutomaticRefunds: boolean;
    enablePartialRefunds: boolean;
    defaultPaymentDescription: string;
    receiptEmailTemplate: string;
  };
  webhookUrls: {
    paymentSuccess: string;
    paymentFailed: string;
    refundProcessed: string;
  };
}

const PaymentConfiguration: React.FC<PaymentConfigurationProps> = ({}) => {
  const { getAuthToken, user } = useAuth();
  const [configurations, setConfigurations] = useState<PaymentConfigType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit'>('list');
  const [selectedSystem, setSelectedSystem] = useState<PaymentSystem | null>(
    null,
  );
  const [editingConfig, setEditingConfig] = useState<PaymentConfigType | null>(
    null,
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>(
    {},
  );
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);

  // Initialize form data with safe defaults
  const [formData, setFormData] = useState<FormData>({
    paymentSystem: '' as PaymentSystem,
    isActive: true,
    squareConfig: {
      accessToken: '',
      applicationId: '',
      environment: 'sandbox',
      locationId: '',
      webhookSignatureKey: '',
    },
    cloverConfig: {
      merchantId: '',
      accessToken: '',
      environment: 'sandbox',
      apiBaseUrl: 'https://sandbox.dev.clover.com/v3',
    },
    stripeConfig: {
      secretKey: '',
      publishableKey: '',
      webhookSecret: '',
    },
    settings: {
      currency: 'USD',
      taxRate: 0,
      enableAutomaticRefunds: true,
      enablePartialRefunds: true,
      defaultPaymentDescription: 'Payment for services',
      receiptEmailTemplate: '',
    },
    webhookUrls: {
      paymentSuccess: '',
      paymentFailed: '',
      refundProcessed: '',
    },
  });

  const paymentSystems: PaymentSystemOption[] = [
    {
      id: 'square',
      name: 'Square',
      description: 'Modern payment processing with hardware support',
      icon: 'CreditCard',
      supportedFeatures: [
        'In-person payments',
        'Online payments',
        'Hardware support',
        'Subscriptions',
      ],
      documentationUrl: 'https://developer.squareup.com/docs',
    },
    {
      id: 'clover',
      name: 'Clover',
      description: 'All-in-one POS system with payment processing',
      icon: 'Building',
      supportedFeatures: [
        'POS integration',
        'Inventory management',
        'Employee management',
        'Online ordering',
      ],
      documentationUrl: 'https://docs.clover.com/',
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Developer-friendly payment platform',
      icon: 'Shield',
      supportedFeatures: [
        'Global payments',
        'Subscription billing',
        'Marketplaces',
        'Advanced fraud protection',
      ],
      documentationUrl: 'https://stripe.com/docs',
    },
  ];

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const response = await axios.get<ApiResponse<PaymentConfigType[]>>(
        `${process.env.REACT_APP_API_BASE_URL}/payment-configuration`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success && response.data.data) {
        setConfigurations(response.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching configurations:', err);
      setError('Failed to load payment configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSystemSelect = (system: PaymentSystem) => {
    setSelectedSystem(system);
    setActiveTab('add');
    resetForm();
    setFormData((prev) => ({
      ...prev,
      paymentSystem: system,
    }));
  };

  const handleEditConfig = (config: PaymentConfigType) => {
    setEditingConfig(config);
    setSelectedSystem(config.paymentSystem);
    setActiveTab('edit');

    // Populate form with existing data using safe getters
    setFormData({
      paymentSystem: config.paymentSystem,
      isActive: config.isActive,
      squareConfig: getSafeSquareConfig(config.squareConfig),
      cloverConfig: getSafeCloverConfig(config.cloverConfig),
      stripeConfig: getSafeStripeConfig(config.stripeConfig),
      settings: getSafeSettings(config.settings),
      webhookUrls: getSafeWebhookUrls(config.webhookUrls),
    });
  };

  const resetForm = () => {
    setFormData({
      paymentSystem: '' as PaymentSystem,
      isActive: true,
      squareConfig: {
        accessToken: '',
        applicationId: '',
        environment: 'sandbox',
        locationId: '',
        webhookSignatureKey: '',
      },
      cloverConfig: {
        merchantId: '',
        accessToken: '',
        environment: 'sandbox',
        apiBaseUrl: 'https://sandbox.dev.clover.com/v3',
      },
      stripeConfig: {
        secretKey: '',
        publishableKey: '',
        webhookSecret: '',
      },
      settings: {
        currency: 'USD',
        taxRate: 0,
        enableAutomaticRefunds: true,
        enablePartialRefunds: true,
        defaultPaymentDescription: 'Payment for services',
        receiptEmailTemplate: '',
      },
      webhookUrls: {
        paymentSuccess: '',
        paymentFailed: '',
        refundProcessed: '',
      },
    });
    setEditingConfig(null);
  };

  const handleInputChange = (
    configType:
      | 'squareConfig'
      | 'cloverConfig'
      | 'stripeConfig'
      | 'settings'
      | 'webhookUrls',
    field: string,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [configType]: {
        ...prev[configType],
        [field]: value,
      },
    }));
  };

  const validateForm = (): boolean => {
    if (!selectedSystem) {
      setError('Please select a payment system');
      return false;
    }

    switch (selectedSystem) {
      case 'square':
        if (
          !formData.squareConfig.accessToken ||
          !formData.squareConfig.locationId
        ) {
          setError('Square requires Access Token and Location ID');
          return false;
        }
        break;
      case 'clover':
        if (
          !formData.cloverConfig.accessToken ||
          !formData.cloverConfig.merchantId
        ) {
          setError('Clover requires Access Token and Merchant ID');
          return false;
        }
        break;
      case 'stripe':
        if (!formData.stripeConfig.secretKey) {
          setError('Stripe requires Secret Key');
          return false;
        }
        break;
    }

    if (formData.settings.taxRate < 0 || formData.settings.taxRate > 100) {
      setError('Tax rate must be between 0 and 100');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) return;

    setSaving(true);

    try {
      const token = await getAuthToken();

      // Create config data based on selected system
      const configData: any = {
        paymentSystem: selectedSystem,
        isActive: formData.isActive,
        settings: formData.settings,
        webhookUrls: formData.webhookUrls,
      };

      // Add system-specific config
      switch (selectedSystem) {
        case 'square':
          configData.squareConfig = formData.squareConfig;
          break;
        case 'clover':
          configData.cloverConfig = formData.cloverConfig;
          break;
        case 'stripe':
          configData.stripeConfig = formData.stripeConfig;
          break;
      }

      let response;
      if (editingConfig) {
        response = await axios.put<ApiResponse<PaymentConfigType>>(
          `${process.env.REACT_APP_API_BASE_URL}/payment-configuration/${editingConfig._id}`,
          configData,
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } else {
        response = await axios.post<ApiResponse<PaymentConfigType>>(
          `${process.env.REACT_APP_API_BASE_URL}/payment-configuration`,
          configData,
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }

      if (response.data.success) {
        setSuccess(
          editingConfig
            ? 'Payment configuration updated successfully!'
            : 'Payment configuration created successfully!',
        );
        resetForm();
        setActiveTab('list');
        fetchConfigurations();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.data.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      console.error('Error saving configuration:', err);
      setError(
        err.response?.data?.error || 'Failed to save payment configuration',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTestConfiguration = async (configId: string) => {
    setTesting(configId);
    setError(null);
    setSuccess(null);

    try {
      const token = await getAuthToken();
      const response = await axios.post<ApiResponse<TestResult>>(
        `${process.env.REACT_APP_API_BASE_URL}/payment-configuration/${configId}/test`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success && response.data.data) {
        setTestResults((prev) => ({
          ...prev,
          [configId]: response.data.data!,
        }));
        setSuccess(`Configuration test passed: ${response.data.data.message}`);
      } else {
        setError(`Configuration test failed: ${response.data.error}`);
      }
    } catch (err: any) {
      console.error('Error testing configuration:', err);
      setError(
        err.response?.data?.error || 'Failed to test payment configuration',
      );
    } finally {
      setTesting(null);
    }
  };

  const handleDeleteClick = (configId: string) => {
    setConfigToDelete(configId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!configToDelete) return;

    try {
      const token = await getAuthToken();
      const response = await axios.delete<ApiResponse<void>>(
        `${process.env.REACT_APP_API_BASE_URL}/payment-configuration/${configToDelete}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        setSuccess('Payment configuration deleted successfully!');
        fetchConfigurations();
        // Remove test result if exists
        setTestResults((prev) => {
          const newResults = { ...prev };
          delete newResults[configToDelete];
          return newResults;
        });
      } else {
        setError(response.data.error || 'Failed to delete configuration');
      }
    } catch (err: any) {
      console.error('Error deleting configuration:', err);
      setError(
        err.response?.data?.error || 'Failed to delete payment configuration',
      );
    } finally {
      setShowDeleteModal(false);
      setConfigToDelete(null);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const toggleSecretVisibility = (field: string) => {
    setShowSecrets((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderSystemIcon = (system: PaymentSystem) => {
    switch (system) {
      case 'square':
        return <CreditCard size={20} className='text-primary' />;
      case 'clover':
        return <Building size={20} className='text-success' />;
      case 'stripe':
        return <Shield size={20} className='text-indigo' />;
      default:
        return <CreditCard size={20} />;
    }
  };

  const getEnvironmentBadge = (config: PaymentConfigType) => {
    let env: Environment | undefined;

    switch (config.paymentSystem) {
      case 'square':
        env = config.squareConfig?.environment;
        break;
      case 'clover':
        env = config.cloverConfig?.environment;
        break;
      case 'stripe':
        env = 'production'; // Stripe doesn't have environment in config
        break;
    }

    if (!env) return null;

    return (
      <Badge bg={env === 'production' ? 'danger' : 'warning'} className='ms-2'>
        {env}
      </Badge>
    );
  };

  const renderTestResults = (configId: string) => {
    const result = testResults[configId];
    if (!result) return null;

    return (
      <Accordion.Item eventKey={`test-${configId}`}>
        <Accordion.Header>
          <div className='d-flex align-items-center gap-2'>
            {result.success ? (
              <CheckCircle size={16} className='text-success' />
            ) : (
              <XCircle size={16} className='text-danger' />
            )}
            <span>Test Results</span>
          </div>
        </Accordion.Header>
        <Accordion.Body>
          {result.details && (
            <div className='small'>
              {result.details.locationsCount !== undefined && (
                <div className='mb-2'>
                  <strong>Locations:</strong> {result.details.locationsCount}
                  {result.details.configuredLocationExists && (
                    <Badge bg='success' className='ms-2'>
                      Location Found
                    </Badge>
                  )}
                </div>
              )}
              {result.details.merchantName && (
                <div className='mb-2'>
                  <strong>Merchant:</strong> {result.details.merchantName}
                </div>
              )}
              {result.details.currency && (
                <div className='mb-2'>
                  <strong>Currency:</strong> {result.details.currency}
                </div>
              )}
              {result.details.available !== undefined && (
                <div className='mb-2'>
                  <strong>Available Balance:</strong> $
                  {(result.details.available / 100).toFixed(2)}
                </div>
              )}
            </div>
          )}
        </Accordion.Body>
      </Accordion.Item>
    );
  };

  const renderConfigForm = () => {
    if (!selectedSystem) return null;

    const systemName =
      paymentSystems.find((s) => s.id === selectedSystem)?.name ||
      selectedSystem;
    const systemDocUrl = paymentSystems.find(
      (s) => s.id === selectedSystem,
    )?.documentationUrl;

    return (
      <div className='page-wrapper'>
        <div className='content content-two'>
          <Card className='mb-4'>
            <Card.Header className='d-flex justify-content-between align-items-center'>
              <h5 className='mb-0'>
                {editingConfig ? 'Edit' : 'Configure'} {systemName} Payment
                System
              </h5>
              {systemDocUrl && (
                <Button
                  variant='outline-info'
                  size='sm'
                  href={systemDocUrl}
                  target='_blank'
                  className='d-flex align-items-center gap-1'
                >
                  <ExternalLink size={14} />
                  Documentation
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                {/* System Selection */}
                <Form.Group className='mb-3'>
                  <Form.Label>Payment System</Form.Label>
                  <div className='d-flex gap-2 flex-wrap'>
                    {paymentSystems.map((system) => (
                      <Button
                        key={system.id}
                        variant={
                          selectedSystem === system.id
                            ? 'primary'
                            : 'outline-secondary'
                        }
                        onClick={() => handleSystemSelect(system.id)}
                        className='d-flex align-items-center gap-2'
                      >
                        {renderSystemIcon(system.id)}
                        {system.name}
                      </Button>
                    ))}
                  </div>
                </Form.Group>

                {/* Active Toggle */}
                <Form.Group className='mb-3'>
                  <Form.Check
                    type='switch'
                    id='isActive'
                    label='Active'
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                  />
                  <Form.Text className='text-muted'>
                    Only active configurations can be used for processing
                    payments
                  </Form.Text>
                </Form.Group>

                {/* System-specific configuration */}
                {selectedSystem === 'square' && (
                  <div className='border rounded p-3 mb-3'>
                    <div className='d-flex justify-content-between align-items-center mb-3'>
                      <h6>Square Configuration</h6>
                      <Badge
                        bg={
                          formData.squareConfig.environment === 'production'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {formData.squareConfig.environment}
                      </Badge>
                    </div>
                    <Row>
                      <Col md={6}>
                        <Form.Group className='mb-3'>
                          <Form.Label>Access Token</Form.Label>
                          <InputGroup>
                            <FormControl
                              type={
                                showSecrets.squareAccessToken
                                  ? 'text'
                                  : 'password'
                              }
                              value={formData.squareConfig.accessToken}
                              onChange={(e) =>
                                handleInputChange(
                                  'squareConfig',
                                  'accessToken',
                                  e.target.value,
                                )
                              }
                              placeholder='sq0atp-...'
                              required
                            />
                            <Button
                              variant='outline-secondary'
                              onClick={() =>
                                toggleSecretVisibility('squareAccessToken')
                              }
                            >
                              {showSecrets.squareAccessToken ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </Button>
                            <Button
                              variant='outline-secondary'
                              onClick={() =>
                                copyToClipboard(
                                  formData.squareConfig.accessToken,
                                  'squareAccessToken',
                                )
                              }
                              disabled={!formData.squareConfig.accessToken}
                            >
                              {copiedField === 'squareAccessToken' ? (
                                <Check size={16} />
                              ) : (
                                <Copy size={16} />
                              )}
                            </Button>
                          </InputGroup>
                          <Form.Text className='text-muted'>
                            Found in Square Developer Dashboard
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className='mb-3'>
                          <Form.Label>Location ID</Form.Label>
                          <InputGroup>
                            <FormControl
                              type='text'
                              value={formData.squareConfig.locationId}
                              onChange={(e) =>
                                handleInputChange(
                                  'squareConfig',
                                  'locationId',
                                  e.target.value,
                                )
                              }
                              placeholder='LY7Y1V8S...'
                              required
                            />
                            <Button
                              variant='outline-secondary'
                              onClick={() =>
                                copyToClipboard(
                                  formData.squareConfig.locationId,
                                  'squareLocationId',
                                )
                              }
                              disabled={!formData.squareConfig.locationId}
                            >
                              {copiedField === 'squareLocationId' ? (
                                <Check size={16} />
                              ) : (
                                <Copy size={16} />
                              )}
                            </Button>
                          </InputGroup>
                          <Form.Text className='text-muted'>
                            Your Square business location ID
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className='mb-3'>
                          <Form.Label>Application ID</Form.Label>
                          <FormControl
                            type='text'
                            value={formData.squareConfig.applicationId}
                            onChange={(e) =>
                              handleInputChange(
                                'squareConfig',
                                'applicationId',
                                e.target.value,
                              )
                            }
                            placeholder='sq0idp-...'
                          />
                          <Form.Text className='text-muted'>
                            Optional - for API version control
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className='mb-3'>
                          <Form.Label>Environment</Form.Label>
                          <Form.Select
                            value={formData.squareConfig.environment}
                            onChange={(e) =>
                              handleInputChange(
                                'squareConfig',
                                'environment',
                                e.target.value as Environment,
                              )
                            }
                          >
                            <option value='sandbox'>Sandbox (Testing)</option>
                            <option value='production'>
                              Production (Live)
                            </option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Form.Group className='mb-3'>
                      <Form.Label>Webhook Signature Key</Form.Label>
                      <InputGroup>
                        <FormControl
                          type={
                            showSecrets.squareWebhookKey ? 'text' : 'password'
                          }
                          value={formData.squareConfig.webhookSignatureKey}
                          onChange={(e) =>
                            handleInputChange(
                              'squareConfig',
                              'webhookSignatureKey',
                              e.target.value,
                            )
                          }
                          placeholder='Optional - for webhook verification'
                        />
                        <Button
                          variant='outline-secondary'
                          onClick={() =>
                            toggleSecretVisibility('squareWebhookKey')
                          }
                        >
                          {showSecrets.squareWebhookKey ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </Button>
                        <Button
                          variant='outline-secondary'
                          onClick={() =>
                            copyToClipboard(
                              formData.squareConfig.webhookSignatureKey,
                              'squareWebhookKey',
                            )
                          }
                          disabled={!formData.squareConfig.webhookSignatureKey}
                        >
                          {copiedField === 'squareWebhookKey' ? (
                            <Check size={16} />
                          ) : (
                            <Copy size={16} />
                          )}
                        </Button>
                      </InputGroup>
                    </Form.Group>
                  </div>
                )}

                {selectedSystem === 'clover' && (
                  <div className='border rounded p-3 mb-3'>
                    <div className='d-flex justify-content-between align-items-center mb-3'>
                      <h6>Clover Configuration</h6>
                      <Badge
                        bg={
                          formData.cloverConfig.environment === 'production'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {formData.cloverConfig.environment}
                      </Badge>
                    </div>
                    <Row>
                      <Col md={6}>
                        <Form.Group className='mb-3'>
                          <Form.Label>Access Token</Form.Label>
                          <InputGroup>
                            <FormControl
                              type={
                                showSecrets.cloverAccessToken
                                  ? 'text'
                                  : 'password'
                              }
                              value={formData.cloverConfig.accessToken}
                              onChange={(e) =>
                                handleInputChange(
                                  'cloverConfig',
                                  'accessToken',
                                  e.target.value,
                                )
                              }
                              placeholder='abc123...'
                              required
                            />
                            <Button
                              variant='outline-secondary'
                              onClick={() =>
                                toggleSecretVisibility('cloverAccessToken')
                              }
                            >
                              {showSecrets.cloverAccessToken ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </Button>
                            <Button
                              variant='outline-secondary'
                              onClick={() =>
                                copyToClipboard(
                                  formData.cloverConfig.accessToken,
                                  'cloverAccessToken',
                                )
                              }
                              disabled={!formData.cloverConfig.accessToken}
                            >
                              {copiedField === 'cloverAccessToken' ? (
                                <Check size={16} />
                              ) : (
                                <Copy size={16} />
                              )}
                            </Button>
                          </InputGroup>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className='mb-3'>
                          <Form.Label>Merchant ID</Form.Label>
                          <InputGroup>
                            <FormControl
                              type='text'
                              value={formData.cloverConfig.merchantId}
                              onChange={(e) =>
                                handleInputChange(
                                  'cloverConfig',
                                  'merchantId',
                                  e.target.value,
                                )
                              }
                              placeholder='ABCD1234...'
                              required
                            />
                            <Button
                              variant='outline-secondary'
                              onClick={() =>
                                copyToClipboard(
                                  formData.cloverConfig.merchantId,
                                  'cloverMerchantId',
                                )
                              }
                              disabled={!formData.cloverConfig.merchantId}
                            >
                              {copiedField === 'cloverMerchantId' ? (
                                <Check size={16} />
                              ) : (
                                <Copy size={16} />
                              )}
                            </Button>
                          </InputGroup>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className='mb-3'>
                          <Form.Label>Environment</Form.Label>
                          <Form.Select
                            value={formData.cloverConfig.environment}
                            onChange={(e) =>
                              handleInputChange(
                                'cloverConfig',
                                'environment',
                                e.target.value as Environment,
                              )
                            }
                          >
                            <option value='sandbox'>Sandbox (Testing)</option>
                            <option value='production'>
                              Production (Live)
                            </option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className='mb-3'>
                          <Form.Label>API Base URL</Form.Label>
                          <FormControl
                            type='text'
                            value={formData.cloverConfig.apiBaseUrl}
                            onChange={(e) =>
                              handleInputChange(
                                'cloverConfig',
                                'apiBaseUrl',
                                e.target.value,
                              )
                            }
                            placeholder='https://sandbox.dev.clover.com/v3'
                          />
                          <Form.Text className='text-muted'>
                            Default URL for Clover API
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>
                )}

                {selectedSystem === 'stripe' && (
                  <div className='border rounded p-3 mb-3'>
                    <div className='d-flex justify-content-between align-items-center mb-3'>
                      <h6>Stripe Configuration</h6>
                      <Badge bg='danger' className='ms-2'>
                        Production
                      </Badge>
                    </div>
                    <Form.Group className='mb-3'>
                      <Form.Label>Secret Key</Form.Label>
                      <InputGroup>
                        <FormControl
                          type={
                            showSecrets.stripeSecretKey ? 'text' : 'password'
                          }
                          value={formData.stripeConfig.secretKey}
                          onChange={(e) =>
                            handleInputChange(
                              'stripeConfig',
                              'secretKey',
                              e.target.value,
                            )
                          }
                          placeholder='sk_live_...'
                          required
                        />
                        <Button
                          variant='outline-secondary'
                          onClick={() =>
                            toggleSecretVisibility('stripeSecretKey')
                          }
                        >
                          {showSecrets.stripeSecretKey ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </Button>
                        <Button
                          variant='outline-secondary'
                          onClick={() =>
                            copyToClipboard(
                              formData.stripeConfig.secretKey,
                              'stripeSecretKey',
                            )
                          }
                          disabled={!formData.stripeConfig.secretKey}
                        >
                          {copiedField === 'stripeSecretKey' ? (
                            <Check size={16} />
                          ) : (
                            <Copy size={16} />
                          )}
                        </Button>
                      </InputGroup>
                    </Form.Group>
                    <Row>
                      <Col md={6}>
                        <Form.Group className='mb-3'>
                          <Form.Label>Publishable Key</Form.Label>
                          <FormControl
                            type='text'
                            value={formData.stripeConfig.publishableKey}
                            onChange={(e) =>
                              handleInputChange(
                                'stripeConfig',
                                'publishableKey',
                                e.target.value,
                              )
                            }
                            placeholder='pk_live_...'
                          />
                          <Form.Text className='text-muted'>
                            For client-side Stripe.js
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className='mb-3'>
                          <Form.Label>Webhook Secret</Form.Label>
                          <InputGroup>
                            <FormControl
                              type={
                                showSecrets.stripeWebhookSecret
                                  ? 'text'
                                  : 'password'
                              }
                              value={formData.stripeConfig.webhookSecret}
                              onChange={(e) =>
                                handleInputChange(
                                  'stripeConfig',
                                  'webhookSecret',
                                  e.target.value,
                                )
                              }
                              placeholder='whsec_...'
                            />
                            <Button
                              variant='outline-secondary'
                              onClick={() =>
                                toggleSecretVisibility('stripeWebhookSecret')
                              }
                            >
                              {showSecrets.stripeWebhookSecret ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </Button>
                          </InputGroup>
                          <Form.Text className='text-muted'>
                            For webhook verification
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>
                )}

                {/* General Settings */}
                <div className='border rounded p-3 mb-3'>
                  <h6>Payment Settings</h6>
                  <Row>
                    <Col md={6}>
                      <Form.Group className='mb-3'>
                        <Form.Label>Currency</Form.Label>
                        <Form.Select
                          value={formData.settings.currency}
                          onChange={(e) =>
                            handleInputChange(
                              'settings',
                              'currency',
                              e.target.value as Currency,
                            )
                          }
                        >
                          <option value='USD'>USD ($)</option>
                          <option value='CAD'>CAD (C$)</option>
                          <option value='EUR'>EUR (€)</option>
                          <option value='GBP'>GBP (£)</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className='mb-3'>
                        <Form.Label>Tax Rate (%)</Form.Label>
                        <FormControl
                          type='number'
                          min='0'
                          max='100'
                          step='0.01'
                          value={formData.settings.taxRate}
                          onChange={(e) =>
                            handleInputChange(
                              'settings',
                              'taxRate',
                              parseFloat(e.target.value),
                            )
                          }
                        />
                        <Form.Text className='text-muted'>
                          Set to 0 for no tax
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Form.Group className='mb-3'>
                        <Form.Check
                          type='switch'
                          id='enableAutomaticRefunds'
                          label='Enable Automatic Refunds'
                          checked={formData.settings.enableAutomaticRefunds}
                          onChange={(e) =>
                            handleInputChange(
                              'settings',
                              'enableAutomaticRefunds',
                              e.target.checked,
                            )
                          }
                        />
                        <Form.Text className='text-muted'>
                          Allow automatic refund processing
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className='mb-3'>
                        <Form.Check
                          type='switch'
                          id='enablePartialRefunds'
                          label='Enable Partial Refunds'
                          checked={formData.settings.enablePartialRefunds}
                          onChange={(e) =>
                            handleInputChange(
                              'settings',
                              'enablePartialRefunds',
                              e.target.checked,
                            )
                          }
                        />
                        <Form.Text className='text-muted'>
                          Allow refunding part of a payment
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className='mb-3'>
                    <Form.Label>Default Payment Description</Form.Label>
                    <FormControl
                      as='textarea'
                      rows={2}
                      value={formData.settings.defaultPaymentDescription}
                      onChange={(e) =>
                        handleInputChange(
                          'settings',
                          'defaultPaymentDescription',
                          e.target.value,
                        )
                      }
                      placeholder='Payment for services'
                    />
                    <Form.Text className='text-muted'>
                      Appears on receipts and statements
                    </Form.Text>
                  </Form.Group>
                  <Form.Group className='mb-3'>
                    <Form.Label>Receipt Email Template</Form.Label>
                    <FormControl
                      as='textarea'
                      rows={4}
                      value={formData.settings.receiptEmailTemplate}
                      onChange={(e) =>
                        handleInputChange(
                          'settings',
                          'receiptEmailTemplate',
                          e.target.value,
                        )
                      }
                      placeholder='Custom email template for receipts (HTML allowed)'
                    />
                    <Form.Text className='text-muted'>
                      Leave empty for default template
                    </Form.Text>
                  </Form.Group>
                </div>

                {/* Webhook URLs */}
                <div className='border rounded p-3 mb-3'>
                  <h6>Webhook URLs (Optional)</h6>
                  <Form.Group className='mb-3'>
                    <Form.Label>Payment Success URL</Form.Label>
                    <FormControl
                      type='url'
                      value={formData.webhookUrls.paymentSuccess}
                      onChange={(e) =>
                        handleInputChange(
                          'webhookUrls',
                          'paymentSuccess',
                          e.target.value,
                        )
                      }
                      placeholder='https://yourdomain.com/webhooks/payment-success'
                    />
                    <Form.Text className='text-muted'>
                      Called when payment succeeds
                    </Form.Text>
                  </Form.Group>
                  <Form.Group className='mb-3'>
                    <Form.Label>Payment Failed URL</Form.Label>
                    <FormControl
                      type='url'
                      value={formData.webhookUrls.paymentFailed}
                      onChange={(e) =>
                        handleInputChange(
                          'webhookUrls',
                          'paymentFailed',
                          e.target.value,
                        )
                      }
                      placeholder='https://yourdomain.com/webhooks/payment-failed'
                    />
                    <Form.Text className='text-muted'>
                      Called when payment fails
                    </Form.Text>
                  </Form.Group>
                  <Form.Group className='mb-3'>
                    <Form.Label>Refund Processed URL</Form.Label>
                    <FormControl
                      type='url'
                      value={formData.webhookUrls.refundProcessed}
                      onChange={(e) =>
                        handleInputChange(
                          'webhookUrls',
                          'refundProcessed',
                          e.target.value,
                        )
                      }
                      placeholder='https://yourdomain.com/webhooks/refund-processed'
                    />
                    <Form.Text className='text-muted'>
                      Called when refund is processed
                    </Form.Text>
                  </Form.Group>
                </div>

                <div className='d-flex gap-2'>
                  <Button type='submit' variant='primary' disabled={saving}>
                    {saving ? (
                      <>
                        <Spinner
                          animation='border'
                          size='sm'
                          className='me-2'
                        />
                        {editingConfig ? 'Updating...' : 'Creating...'}
                      </>
                    ) : editingConfig ? (
                      'Update Configuration'
                    ) : (
                      'Create Configuration'
                    )}
                  </Button>
                  <Button
                    variant='outline-secondary'
                    onClick={() => {
                      setActiveTab('list');
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </div>
      </div>
    );
  };

  const renderConfigurationsList = () => (
    <>
      <div className='page-wrapper'>
        <div className='content'>
          <div className='d-flex justify-content-between align-items-center mb-4'>
            <h5>Payment Configurations</h5>
            <Button
              variant='primary'
              onClick={() => {
                setActiveTab('add');
                setSelectedSystem(null);
              }}
              className='d-flex align-items-center gap-2'
            >
              <Plus size={16} />
              Add Payment System
            </Button>
          </div>

          {configurations.length === 0 ? (
            <Card>
              <Card.Body className='text-center py-5'>
                <Settings size={48} className='text-muted mb-3' />
                <h5>No Payment Configurations</h5>
                <p className='text-muted mb-4'>
                  You haven't configured any payment systems yet. Add one to
                  start accepting payments.
                </p>
                <Button
                  variant='primary'
                  onClick={() => setActiveTab('add')}
                  className='d-flex align-items-center gap-2 mx-auto'
                >
                  <Plus size={16} />
                  Add Your First Payment System
                </Button>
              </Card.Body>
            </Card>
          ) : (
            <Accordion
              activeKey={activeAccordion}
              onSelect={(key) => setActiveAccordion(key as string)}
            >
              {configurations.map((config) => (
                <Accordion.Item key={config._id} eventKey={config._id}>
                  <Accordion.Header>
                    <div className='d-flex align-items-center justify-content-between w-100 me-3'>
                      <div className='d-flex align-items-center gap-2'>
                        {renderSystemIcon(config.paymentSystem)}
                        <div>
                          <h6 className='mb-0'>
                            {config.paymentSystem.charAt(0).toUpperCase() +
                              config.paymentSystem.slice(1)}
                          </h6>
                          <small className='text-muted'>
                            {config.settings.currency} • Tax:{' '}
                            {config.settings.taxRate}%
                          </small>
                        </div>
                        {getEnvironmentBadge(config)}
                        <Badge bg={config.isActive ? 'success' : 'secondary'}>
                          {config.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className='d-flex gap-1'>
                        <Button
                          size='sm'
                          variant='outline-primary'
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditConfig(config);
                          }}
                          title='Edit'
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          size='sm'
                          variant='outline-warning'
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestConfiguration(config._id);
                          }}
                          disabled={testing === config._id}
                          title='Test Connection'
                        >
                          {testing === config._id ? (
                            <Spinner animation='border' size='sm' />
                          ) : (
                            <TestTube size={14} />
                          )}
                        </Button>
                        <Button
                          size='sm'
                          variant='outline-danger'
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(config._id);
                          }}
                          title='Delete'
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </Accordion.Header>
                  <Accordion.Body>
                    <Row>
                      <Col md={6}>
                        <ListGroup variant='flush'>
                          <ListGroup.Item className='d-flex justify-content-between'>
                            <span>Payment System</span>
                            <strong>{config.paymentSystem}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className='d-flex justify-content-between'>
                            <span>Currency</span>
                            <strong>{config.settings.currency}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className='d-flex justify-content-between'>
                            <span>Tax Rate</span>
                            <strong>{config.settings.taxRate}%</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className='d-flex justify-content-between'>
                            <span>Automatic Refunds</span>
                            {config.settings.enableAutomaticRefunds ? (
                              <CheckCircle size={16} className='text-success' />
                            ) : (
                              <XCircle size={16} className='text-danger' />
                            )}
                          </ListGroup.Item>
                        </ListGroup>
                      </Col>
                      <Col md={6}>
                        <ListGroup variant='flush'>
                          <ListGroup.Item className='d-flex justify-content-between'>
                            <span>Partial Refunds</span>
                            {config.settings.enablePartialRefunds ? (
                              <CheckCircle size={16} className='text-success' />
                            ) : (
                              <XCircle size={16} className='text-danger' />
                            )}
                          </ListGroup.Item>
                          <ListGroup.Item className='d-flex justify-content-between'>
                            <span>Created</span>
                            <strong>
                              {new Date(config.createdAt).toLocaleDateString()}
                            </strong>
                          </ListGroup.Item>
                          <ListGroup.Item className='d-flex justify-content-between'>
                            <span>Last Updated</span>
                            <strong>
                              {new Date(config.updatedAt).toLocaleDateString()}
                            </strong>
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <div className='d-flex justify-content-between'>
                              <span>Status</span>
                              <Badge
                                bg={config.isActive ? 'success' : 'secondary'}
                              >
                                {config.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </ListGroup.Item>
                        </ListGroup>
                      </Col>
                    </Row>

                    {/* Test Results Section */}
                    {testResults[config._id] && (
                      <div className='mt-3 pt-3 border-top'>
                        <h6 className='mb-2'>Connection Test Results</h6>
                        {renderTestResults(config._id)}
                      </div>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </>
  );

  if (loading) {
    return (
      <div className='d-flex justify-content-center align-items-center py-5'>
        <Spinner animation='border' variant='primary' />
        <span className='ms-2'>Loading payment configurations...</span>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <div className='content content-two'>
        <div>
          {error && (
            <Alert
              variant='danger'
              onClose={() => setError(null)}
              dismissible
              className='mb-3'
            >
              <div className='d-flex align-items-start'>
                <AlertCircle size={20} className='me-2 flex-shrink-0' />
                <div>{error}</div>
              </div>
            </Alert>
          )}

          {success && (
            <Alert
              variant='success'
              onClose={() => setSuccess(null)}
              dismissible
              className='mb-3'
            >
              <div className='d-flex align-items-start'>
                <CheckCircle size={20} className='me-2 flex-shrink-0' />
                <div>{success}</div>
              </div>
            </Alert>
          )}

          <Card className='mb-4'>
            <Card.Header>
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k as 'list' | 'add' | 'edit')}
                className='border-bottom-0'
              >
                <Tab eventKey='list' title='Configurations'>
                  {renderConfigurationsList()}
                </Tab>
                <Tab eventKey='add' title='Add System'>
                  {activeTab === 'add' && !selectedSystem && (
                    <div className='py-4'>
                      <h5 className='mb-4'>Select a Payment System</h5>
                      <Row>
                        {paymentSystems.map((system) => (
                          <Col key={system.id} lg={6} className='mb-3'>
                            <Card
                              className='h-100 cursor-pointer hover-shadow'
                              onClick={() => handleSystemSelect(system.id)}
                              style={{ cursor: 'pointer' }}
                            >
                              <Card.Body>
                                <div className='d-flex align-items-start mb-3'>
                                  <div className='me-3'>
                                    {renderSystemIcon(system.id)}
                                  </div>
                                  <div>
                                    <h6 className='mb-1'>{system.name}</h6>
                                    <p className='text-muted small mb-0'>
                                      {system.description}
                                    </p>
                                  </div>
                                </div>
                                <ul className='list-unstyled mb-0'>
                                  {system.supportedFeatures.map(
                                    (feature, idx) => (
                                      <li
                                        key={idx}
                                        className='d-flex align-items-center mb-1'
                                      >
                                        <CheckCircle
                                          size={14}
                                          className='text-success me-2'
                                        />
                                        <small>{feature}</small>
                                      </li>
                                    ),
                                  )}
                                </ul>
                                {system.documentationUrl && (
                                  <div className='mt-3'>
                                    <a
                                      href={system.documentationUrl}
                                      target='_blank'
                                      rel='noopener noreferrer'
                                      className='text-decoration-none small d-flex align-items-center gap-1'
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink size={12} />
                                      View Documentation
                                    </a>
                                  </div>
                                )}
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  )}
                  {activeTab === 'add' && selectedSystem && renderConfigForm()}
                </Tab>
                <Tab
                  eventKey='edit'
                  title='Edit System'
                  disabled={!editingConfig}
                >
                  {activeTab === 'edit' && editingConfig && renderConfigForm()}
                </Tab>
              </Tabs>
            </Card.Header>
          </Card>

          {/* Delete Confirmation Modal */}
          <Modal
            show={showDeleteModal}
            onHide={() => setShowDeleteModal(false)}
          >
            <Modal.Header closeButton>
              <Modal.Title>Confirm Deletion</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Alert variant='warning' className='mb-3'>
                <AlertCircle size={20} className='me-2' />
                This action cannot be undone. All payment history associated
                with this configuration will be preserved.
              </Alert>
              <p>Are you sure you want to delete this payment configuration?</p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant='secondary'
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button variant='danger' onClick={handleDeleteConfirm}>
                Delete Configuration
              </Button>
            </Modal.Footer>
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfiguration;
