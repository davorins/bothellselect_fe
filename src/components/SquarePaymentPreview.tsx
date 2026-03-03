import React, { useState } from 'react';
import {
  CreditCard,
  PaymentForm as SquarePaymentForm,
} from 'react-square-web-payments-sdk';

interface SquarePaymentPreviewProps {
  amount: number; // in cents
  description?: string;
  label?: string;
  helpText?: string;
  squareAppId?: string;
  squareLocationId?: string;
  currency?: string;
  sandboxMode?: boolean;
}

const SquarePaymentPreview: React.FC<SquarePaymentPreviewProps> = ({
  amount,
  description = 'Payment for form submission',
  label = 'Payment',
  helpText,
  squareAppId = 'sq0idp-jUCxKnO_i8i7vccQjVj_0g',
  squareLocationId = 'L26Q50FWRCQW5',
  currency = 'USD',
  sandboxMode,
}) => {
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleCardTokenized = async (tokenResult: any) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      if (tokenResult.status !== 'OK') {
        throw new Error(tokenResult.errors?.[0]?.message || 'Payment failed');
      }

      // In preview mode, just simulate success
      console.log('Payment tokenized (preview mode):', {
        token: tokenResult.token,
        amount: amount / 100,
        currency,
        sandboxMode, // Log sandbox mode
      });

      setPaymentSuccess(true);

      // Show success for a few seconds then reset
      setTimeout(() => {
        setPaymentSuccess(false);
      }, 3000);
    } catch (error: any) {
      setPaymentError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const amountInDollars = (amount / 100).toFixed(2);

  return (
    <div className='card'>
      <div className='card-body'>
        <h5 className='card-title'>{label}</h5>
        {helpText && <p className='card-text'>{helpText}</p>}

        <div className='mb-3'>
          <p className='h5 mb-0'>
            <strong>Amount:</strong> ${amountInDollars} {currency}
          </p>
          {description && <p className='text-muted mb-3'>{description}</p>}
        </div>

        {/* In preview mode, we'll show a demo Square form */}
        {!paymentSuccess ? (
          <>
            <div className='mb-3'>
              <label className='form-label'>Email for Receipt</label>
              <input
                type='email'
                className='form-control'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='test@example.com'
                disabled={isProcessing}
              />
            </div>

            <div
              className={`payment-form-container ${
                isProcessing ? 'opacity-50' : ''
              }`}
            >
              {squareAppId && squareLocationId ? (
                <SquarePaymentForm
                  applicationId={squareAppId}
                  locationId={squareLocationId}
                  cardTokenizeResponseReceived={handleCardTokenized}
                  createPaymentRequest={() => ({
                    countryCode: 'US',
                    currencyCode: currency,
                    total: {
                      amount: amountInDollars,
                      label: 'Total',
                    },
                    buyerEmailAddress: email || 'test@example.com',
                  })}
                >
                  <CreditCard />
                </SquarePaymentForm>
              ) : (
                <div className='alert alert-warning'>
                  <i className='ti ti-alert-triangle me-2'></i>
                  Square payment configuration is missing. Please set up Square
                  App ID and Location ID in form settings.
                </div>
              )}
            </div>

            {paymentError && (
              <div className='alert alert-danger mt-3'>
                <i className='ti ti-alert-triangle me-2'></i>
                {paymentError}
              </div>
            )}

            <div className='mt-3 p-2 bg-light rounded small'>
              <i className='ti ti-info-circle me-2 text-info'></i>
              <strong>Preview Mode:</strong> This is a demo Square payment form.
              {sandboxMode && (
                <>
                  {' '}
                  <strong>Sandbox Mode:</strong> Using test credentials.
                </>
              )}
            </div>
          </>
        ) : (
          <div className='alert alert-success'>
            <i className='ti ti-check-circle me-2'></i>
            <strong>Payment Successful!</strong> This is a preview simulation.
            {sandboxMode && (
              <>
                {' '}
                <strong>(Sandbox Mode)</strong>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SquarePaymentPreview;
