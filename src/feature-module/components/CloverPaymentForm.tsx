import React, { useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { CreditCard, Shield } from 'lucide-react';

interface CloverPaymentFormProps {
  merchantId: string;
  accessToken: string;
  onTokenReceived: (token: string, cardDetails: any) => void;
  amount: number;
  email: string;
  disabled?: boolean;
  environment?: 'sandbox' | 'production';
}

const CloverPaymentForm: React.FC<CloverPaymentFormProps> = ({
  merchantId,
  accessToken,
  onTokenReceived,
  amount,
  email,
  disabled = false,
  environment = 'sandbox',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardPostal, setCardPostal] = useState('');

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? '/' + v.substring(2, 4) : '');
    }
    return v;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!email) {
      setError('Email is required for receipt');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!cardNumber.replace(/\s/g, '').match(/^\d{13,19}$/)) {
      setError('Please enter a valid card number');
      return;
    }

    if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) {
      setError('Please enter a valid expiration date (MM/YY)');
      return;
    }

    if (!cardCvv.match(/^\d{3,4}$/)) {
      setError('Please enter a valid CVV');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/clover/create-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardNumber: cardNumber.replace(/\s/g, ''),
            cardExpiry,
            cardCvv,
            cardPostal,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment token');
      }

      // Extract card details
      const cardDetails = {
        last4: cardNumber.slice(-4),
        brand: getCardBrand(cardNumber),
        expMonth: cardExpiry.split('/')[0],
        expYear: '20' + cardExpiry.split('/')[1],
      };

      onTokenReceived(data.token, cardDetails);
    } catch (err: any) {
      console.error('❌ Payment error:', err);
      setError(err.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const getCardBrand = (number: string) => {
    const clean = number.replace(/\s/g, '');
    if (/^4/.test(clean)) return 'Visa';
    if (/^5[1-5]/.test(clean)) return 'Mastercard';
    if (/^3[47]/.test(clean)) return 'American Express';
    if (/^6(?:011|5)/.test(clean)) return 'Discover';
    return 'Unknown';
  };

  return (
    <Card className='border shadow-sm'>
      <Card.Body>
        {error && (
          <Alert variant='danger' className='mb-3'>
            <i className='ti ti-alert-triangle me-2'></i>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className='mb-3'>
            <Form.Label className='small fw-bold'>Card Number</Form.Label>
            <Form.Control
              type='text'
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder='4111 1111 1111 1111'
              maxLength={19}
              disabled={disabled || loading}
              required
            />
          </Form.Group>

          <div className='row mb-3'>
            <div className='col-md-4'>
              <Form.Group>
                <Form.Label className='small fw-bold'>Expiration</Form.Label>
                <Form.Control
                  type='text'
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                  placeholder='MM/YY'
                  maxLength={5}
                  disabled={disabled || loading}
                  required
                />
              </Form.Group>
            </div>
            <div className='col-md-4'>
              <Form.Group>
                <Form.Label className='small fw-bold'>CVV</Form.Label>
                <Form.Control
                  type='text'
                  value={cardCvv}
                  onChange={(e) =>
                    setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                  placeholder='123'
                  maxLength={4}
                  disabled={disabled || loading}
                  required
                />
              </Form.Group>
            </div>
            <div className='col-md-4'>
              <Form.Group>
                <Form.Label className='small fw-bold'>Postal Code</Form.Label>
                <Form.Control
                  type='text'
                  value={cardPostal}
                  onChange={(e) => setCardPostal(e.target.value)}
                  placeholder='12345'
                  maxLength={10}
                  disabled={disabled || loading}
                />
              </Form.Group>
            </div>
          </div>

          <Button
            type='submit'
            variant='primary'
            disabled={disabled || loading}
            className='w-100 py-2 d-flex align-items-center justify-content-center gap-2'
          >
            {loading ? (
              <>
                <Spinner animation='border' size='sm' />
                Processing...
              </>
            ) : (
              <>
                <CreditCard size={18} />
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

          {environment === 'sandbox' && (
            <div className='mt-2 text-center'>
              <span className='badge bg-warning text-dark'>
                Sandbox Mode - Test Card: 4111 1111 1111 1111
              </span>
            </div>
          )}
        </Form>
      </Card.Body>
    </Card>
  );
};

export default CloverPaymentForm;
