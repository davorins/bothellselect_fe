// components/FormFieldPayment.tsx
import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  PaymentForm as SquarePaymentForm,
} from 'react-square-web-payments-sdk';
import axios from 'axios';

interface FormFieldPaymentProps {
  field: any;
  value: any;
  onChange: (value: any) => void;
  formData: any;
  submissionId?: string;
  disabled?: boolean;
}

const FormFieldPayment: React.FC<FormFieldPaymentProps> = ({
  field,
  value,
  onChange,
  formData,
  submissionId,
  disabled = false,
}) => {
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  // Get payment config
  const paymentConfig = field.paymentConfig || {};

  // Calculate total amount
  const getTotalAmount = () => {
    let total = 0;

    if (paymentConfig.fixedPrice) {
      // Fixed price payment
      total = paymentConfig.amount || 0;
    } else if (
      paymentConfig.pricingPackages &&
      paymentConfig.pricingPackages.length > 0
    ) {
      // Pricing packages
      const selectedPackage = paymentConfig.pricingPackages.find(
        (pkg: any) => pkg.defaultSelected || pkg.isEnabled,
      );
      if (selectedPackage) {
        total = selectedPackage.price * (selectedPackage.quantity || 1);
      }
    }

    return total;
  };

  const totalAmount = getTotalAmount();
  const amountInDollars = (totalAmount / 100).toFixed(2);

  // Handle payment tokenization
  const handleCardTokenized = async (tokenResult: any) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      if (tokenResult.status !== 'OK') {
        throw new Error(tokenResult.errors?.[0]?.message || 'Payment failed');
      }

      // Get card details
      const cardDetails = tokenResult.details?.card;
      const last4 = cardDetails?.last4 || '';
      const brand = cardDetails?.brand || '';
      const expMonth = String(cardDetails?.expMonth || '');
      const expYear = String(cardDetails?.expYear || '');

      // Prepare payment data
      const paymentData = {
        token: tokenResult.token,
        sourceId: tokenResult.token,
        amount: totalAmount,
        currency: paymentConfig.currency || 'USD',
        email: email || formData.email || 'customer@example.com',
        formId: formData._id,
        fieldId: field.id,
        submissionId: submissionId,
        description: paymentConfig.description || field.label,
        cardDetails: {
          last_4: last4,
          card_brand: brand,
          exp_month: expMonth,
          exp_year: expYear,
        },
        metadata: {
          formName: formData.name,
          fieldName: field.name,
          pricingPackage: paymentConfig.pricingPackages?.find(
            (pkg: any) => pkg.defaultSelected,
          ),
        },
      };

      console.log('Processing form payment:', paymentData);

      // Call your backend payment endpoint
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL || ''}/forms/process-payment`,
        paymentData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.success) {
        setPaymentSuccess(true);
        setPaymentId(response.data.paymentId);

        // Update form value with payment details
        onChange({
          paymentId: response.data.paymentId,
          squarePaymentId: response.data.squarePaymentId,
          amount: totalAmount,
          currency: paymentConfig.currency,
          status: 'completed',
          timestamp: new Date().toISOString(),
          cardLast4: last4,
          cardBrand: brand,
        });

        // Show success for a few seconds
        setTimeout(() => {
          setPaymentSuccess(false);
        }, 5000);
      } else {
        throw new Error(response.data.message || 'Payment processing failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentError(
        error.response?.data?.message ||
          error.message ||
          'Payment processing failed',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if sandbox mode
  const isSandboxMode = () => {
    const appId = paymentConfig.squareAppId || field.squareAppId;
    return appId?.includes('sandbox-') || appId?.includes('sq0idb');
  };

  // Get Square credentials
  const getSquareCredentials = () => {
    return {
      appId:
        paymentConfig.squareAppId ||
        field.squareAppId ||
        'sq0idp-jUCxKnO_i8i7vccQjVj_0g',
      locationId:
        paymentConfig.squareLocationId ||
        field.squareLocationId ||
        'L26Q50FWRCQW5',
    };
  };

  const { appId, locationId } = getSquareCredentials();

  // Render pricing packages if available
  const renderPricingPackages = () => {
    if (
      !paymentConfig.pricingPackages ||
      paymentConfig.pricingPackages.length === 0
    ) {
      return null;
    }

    return (
      <div className='mb-3'>
        <label className='form-label'>Select Package</label>
        <div className='list-group'>
          {paymentConfig.pricingPackages
            .filter((pkg: any) => pkg.isEnabled !== false)
            .map((pkg: any, index: number) => (
              <div
                key={index}
                className={`list-group-item list-group-item-action ${
                  pkg.defaultSelected ? 'active' : ''
                }`}
                onClick={() => {
                  // Handle package selection
                  console.log('Selected package:', pkg);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className='d-flex w-100 justify-content-between'>
                  <h6 className='mb-1'>{pkg.name}</h6>
                  <strong>${(pkg.price / 100).toFixed(2)}</strong>
                </div>
                {pkg.description && <p className='mb-1'>{pkg.description}</p>}
                {pkg.quantity > 1 && <small>Quantity: {pkg.quantity}</small>}
              </div>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className='form-payment-field'>
      <label className='form-label'>
        {field.label}
        {field.required && <span className='text-danger'> *</span>}
      </label>

      {field.helpText && <div className='form-text mb-3'>{field.helpText}</div>}

      {!paymentSuccess ? (
        <>
          {/* Payment Summary */}
          <div className='card mb-3'>
            <div className='card-body'>
              <h6 className='card-title'>Payment Summary</h6>
              <div className='d-flex justify-content-between align-items-center'>
                <div>
                  <p className='mb-1'>
                    <strong>Description:</strong>{' '}
                    {paymentConfig.description || field.label}
                  </p>
                  {paymentConfig.pricingPackages &&
                  paymentConfig.pricingPackages.length > 0 ? (
                    <p className='mb-0 text-muted'>
                      Select a package from options below
                    </p>
                  ) : (
                    <p className='mb-0 text-muted'>
                      Fixed amount: ${amountInDollars}
                    </p>
                  )}
                </div>
                <h5 className='mb-0'>${amountInDollars}</h5>
              </div>
            </div>
          </div>

          {/* Pricing Packages */}
          {renderPricingPackages()}

          {/* Email Input */}
          <div className='mb-3'>
            <label className='form-label'>Email for Receipt</label>
            <input
              type='email'
              className='form-control'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='your@email.com'
              required
              disabled={isProcessing || disabled}
            />
          </div>

          {/* Square Payment Form */}
          <div
            className={`payment-form-container ${
              isProcessing ? 'opacity-50' : ''
            }`}
          >
            {appId && locationId ? (
              <SquarePaymentForm
                applicationId={appId}
                locationId={locationId}
                cardTokenizeResponseReceived={handleCardTokenized}
                createPaymentRequest={() => ({
                  countryCode: 'US',
                  currencyCode: paymentConfig.currency || 'USD',
                  total: {
                    amount: amountInDollars,
                    label: 'Total',
                  },
                  buyerEmailAddress: email || 'customer@example.com',
                })}
              >
                <CreditCard />
              </SquarePaymentForm>
            ) : (
              <div className='alert alert-warning'>
                <i className='ti ti-alert-triangle me-2'></i>
                Square payment configuration is missing. Please contact the form
                administrator.
              </div>
            )}
          </div>

          {paymentError && (
            <div className='alert alert-danger mt-3'>
              <i className='ti ti-alert-triangle me-2'></i>
              {paymentError}
            </div>
          )}

          {/* Test Mode Notice */}
          {isSandboxMode() && (
            <div className='alert alert-info mt-3'>
              <i className='ti ti-info-circle me-2'></i>
              <strong>Test Mode:</strong> This is a demo payment form. Use test
              card: 4111 1111 1111 1111
            </div>
          )}
        </>
      ) : (
        <div className='alert alert-success'>
          <i className='ti ti-check-circle me-2'></i>
          <strong>Payment Successful!</strong>
          <div className='mt-2'>
            <p className='mb-1'>Payment ID: {paymentId}</p>
            <p className='mb-0'>Amount: ${amountInDollars}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormFieldPayment;
