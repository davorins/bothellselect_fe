import React, { useState, useEffect } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Spinner,
  InputGroup,
} from 'react-bootstrap';
import { CreditCard, Eye, EyeOff, Shield } from 'lucide-react';

interface CloverPaymentFormProps {
  merchantId: string;
  onTokenReceived: (token: string, cardDetails: any) => void;
  amount: number;
  email: string;
  disabled?: boolean;
}

// Declare Clover type for TypeScript
declare global {
  interface Window {
    Clover: any;
  }
}

const CloverPaymentForm: React.FC<CloverPaymentFormProps> = ({
  merchantId,
  onTokenReceived,
  amount,
  email,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [cloverLoaded, setCloverLoaded] = useState(false);

  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    zipCode: '',
    cardholderName: '',
  });

  // Load Clover.js SDK
  useEffect(() => {
    const loadCloverSDK = () => {
      const script = document.createElement('script');
      script.src = 'https://checkout.sandbox.dev.clover.com/sdk.js';
      script.async = true;
      script.onload = () => {
        console.log('✅ Clover SDK loaded');
        setCloverLoaded(true);
      };
      script.onerror = () => {
        console.error('❌ Failed to load Clover SDK');
        setError('Failed to load payment system. Please refresh the page.');
      };
      document.head.appendChild(script);
    };

    if (!window.Clover) {
      loadCloverSDK();
    } else {
      setCloverLoaded(true);
    }
  }, []);

  const validateForm = () => {
    // Basic validation
    const cleanCardNumber = formData.cardNumber.replace(/\s/g, '');

    if (!cleanCardNumber || cleanCardNumber.length < 16) {
      setError('Please enter a valid 16-digit card number');
      return false;
    }

    if (!formData.expiryDate || !formData.expiryDate.includes('/')) {
      setError('Please enter expiry date in MM/YY format');
      return false;
    }

    // Validate expiry date
    const [month, year] = formData.expiryDate.split('/');
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;

    if (parseInt(month) < 1 || parseInt(month) > 12) {
      setError('Invalid month');
      return false;
    }

    if (
      parseInt(year) < currentYear ||
      (parseInt(year) === currentYear && parseInt(month) < currentMonth)
    ) {
      setError('Card has expired');
      return false;
    }

    if (!formData.cvv || formData.cvv.length < 3) {
      setError('Please enter a valid CVV');
      return false;
    }

    if (!formData.zipCode || formData.zipCode.length < 5) {
      setError('Please enter a valid ZIP code');
      return false;
    }

    return true;
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? '/' + v.substring(2, 4) : '');
    }
    return v;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Extract expiry month and year
      const [expMonth, expYear] = formData.expiryDate.split('/');

      // ALWAYS use mock token for now (bypass Clover SDK)
      const mockToken = `clover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log(
        '✅ Using mock Clover token:',
        mockToken.substring(0, 20) + '...',
      );

      // Format card details for backend
      const cardDetails = {
        last_4: formData.cardNumber.slice(-4),
        card_brand: getCardBrand(formData.cardNumber),
        exp_month: expMonth,
        exp_year: `20${expYear}`,
      };

      console.log('📤 Card details:', cardDetails);

      // Call parent with mock token
      onTokenReceived(mockToken, cardDetails);
    } catch (err: any) {
      console.error('❌ Payment error:', err);
      setError(err.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const getCardBrand = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'VISA';
    if (/^5[1-5]/.test(cleaned)) return 'MASTERCARD';
    if (/^3[47]/.test(cleaned)) return 'AMEX';
    if (/^6(?:011|5)/.test(cleaned)) return 'DISCOVER';
    return 'UNKNOWN';
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    let formattedValue = value;

    if (field === 'cardNumber') {
      formattedValue = formatCardNumber(value);
      if (formattedValue.length > 19) return;
    }

    if (field === 'expiryDate') {
      formattedValue = formatExpiryDate(value);
      if (formattedValue.length > 5) return;
    }

    if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '');
      if (formattedValue.length > 4) return;
    }

    if (field === 'zipCode') {
      formattedValue = value.replace(/\D/g, '');
      if (formattedValue.length > 10) return;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: formattedValue,
    }));
  };

  // Pre-fill with test data for sandbox
  const fillTestData = () => {
    setFormData({
      cardNumber: '4242 4242 4242 4242',
      expiryDate: '12/28',
      cvv: '123',
      zipCode: '94043',
      cardholderName: 'Test User',
    });
  };

  return (
    <Card className='border'>
      <Card.Body>
        {process.env.NODE_ENV === 'development' && (
          <Alert variant='info' className='mb-3'>
            <strong>Sandbox Mode:</strong> Use test card: 4242 4242 4242 4242
            <Button
              variant='outline-info'
              size='sm'
              className='ms-2'
              onClick={fillTestData}
            >
              Fill Test Data
            </Button>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {error && (
            <Alert variant='danger' className='mb-3'>
              <i className='ti ti-alert-triangle me-2'></i>
              {error}
            </Alert>
          )}

          <Form.Group className='mb-3'>
            <Form.Label>Cardholder Name</Form.Label>
            <Form.Control
              type='text'
              value={formData.cardholderName}
              onChange={(e) =>
                handleInputChange('cardholderName', e.target.value)
              }
              placeholder='John Doe'
              disabled={disabled || loading}
              required
            />
          </Form.Group>

          <Form.Group className='mb-3'>
            <Form.Label>Card Number</Form.Label>
            <InputGroup>
              <Form.Control
                type={showCardNumber ? 'text' : 'password'}
                value={formData.cardNumber}
                onChange={(e) =>
                  handleInputChange('cardNumber', e.target.value)
                }
                placeholder='1234 5678 9012 3456'
                disabled={disabled || loading}
                required
              />
              <Button
                variant='outline-secondary'
                onClick={() => setShowCardNumber(!showCardNumber)}
                disabled={disabled || loading}
              >
                {showCardNumber ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </InputGroup>
          </Form.Group>

          <div className='row mb-3'>
            <div className='col-md-6'>
              <Form.Group>
                <Form.Label>Expiry Date</Form.Label>
                <Form.Control
                  type='text'
                  value={formData.expiryDate}
                  onChange={(e) =>
                    handleInputChange('expiryDate', e.target.value)
                  }
                  placeholder='MM/YY'
                  disabled={disabled || loading}
                  required
                />
              </Form.Group>
            </div>
            <div className='col-md-6'>
              <Form.Group>
                <Form.Label>CVV</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={showCvv ? 'text' : 'password'}
                    value={formData.cvv}
                    onChange={(e) => handleInputChange('cvv', e.target.value)}
                    placeholder='123'
                    disabled={disabled || loading}
                    required
                  />
                  <Button
                    variant='outline-secondary'
                    onClick={() => setShowCvv(!showCvv)}
                    disabled={disabled || loading}
                  >
                    {showCvv ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </InputGroup>
              </Form.Group>
            </div>
          </div>

          <Form.Group className='mb-4'>
            <Form.Label>ZIP Code</Form.Label>
            <Form.Control
              type='text'
              value={formData.zipCode}
              onChange={(e) => handleInputChange('zipCode', e.target.value)}
              placeholder='12345'
              disabled={disabled || loading}
              required
            />
          </Form.Group>

          <Button
            type='submit'
            variant='primary'
            disabled={disabled || loading || !cloverLoaded}
            className='w-100 d-flex align-items-center justify-content-center gap-2'
          >
            {loading ? (
              <>
                <Spinner animation='border' size='sm' className='me-2' />
                Processing...
              </>
            ) : !cloverLoaded ? (
              <>
                <Spinner animation='border' size='sm' className='me-2' />
                Loading Payment System...
              </>
            ) : (
              <>
                <CreditCard size={16} />
                Pay ${amount.toFixed(2)} with Clover
              </>
            )}
          </Button>

          <div className='mt-3 text-center'>
            <small className='text-muted'>
              <Shield size={12} className='me-1' />
              Secured by Clover Payments
            </small>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default CloverPaymentForm;
