import React, { useState, useRef } from 'react';
import { CreditCard, PaymentForm } from 'react-square-web-payments-sdk';
import axios from 'axios';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import { FormField } from '../../../../types/form';

// Square config fallback for dev
const SQUARE_APP_ID =
  process.env.REACT_APP_SQUARE_APP_ID ||
  'sandbox-sq0idp-jUCxKnO_i8i7vccQjVj_0g';
const SQUARE_LOCATION_ID =
  process.env.REACT_APP_SQUARE_LOCATION_ID || 'L26Q50FWRCQW5';

interface SquarePaymentFormProps {
  field: FormField & {
    paymentConfig: {
      amount: number;
      description: string;
      currency: string;
    };
  };
  onPaymentSuccess: (token: string) => void;
  onPaymentError: (error: string) => void;
}

const SquarePaymentFormComponent: React.FC<SquarePaymentFormProps> = ({
  field,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const { paymentConfig, label } = field;
  const { amount, description, currency } = paymentConfig;

  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');
  const paymentFormRef = useRef<any>(null);

  const handleTokenization = async (result: any) => {
    setIsProcessing(true);
    try {
      if (result.status !== 'OK' || !result.token) {
        throw new Error(result.errors?.[0]?.message || 'Payment token missing');
      }

      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        throw new Error('Valid email required for receipt');
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/payment/process`,
        {
          sourceId: result.token,
          amount: amount,
          currency: currency,
          email: email,
          description: description,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Payment failed');
      }

      onPaymentSuccess(result.token);
    } catch (error) {
      onPaymentError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className='border p-3 rounded mb-3'>
      <h5>{label}</h5>
      <p>{description}</p>
      <p>
        Amount: ${(amount / 100).toFixed(2)} {currency}
      </p>

      <div className='mb-3'>
        <label className='form-label'>Email for Receipt</label>
        <input
          type='email'
          className='form-control'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {isProcessing ? (
        <LoadingSpinner />
      ) : (
        <PaymentForm
          applicationId={SQUARE_APP_ID}
          locationId={SQUARE_LOCATION_ID}
          cardTokenizeResponseReceived={handleTokenization}
          createPaymentRequest={() => ({
            countryCode: 'US',
            currencyCode: currency,
            total: {
              amount: (amount / 100).toFixed(2),
              label: 'Total',
            },
          })}
          ref={paymentFormRef}
        >
          <CreditCard />
        </PaymentForm>
      )}
    </div>
  );
};

export default SquarePaymentFormComponent;
