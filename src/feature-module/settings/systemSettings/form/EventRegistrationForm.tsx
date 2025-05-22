import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FormField,
  PaymentFormField,
  SectionFormField,
} from '../../../../types/form';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';

interface EventRegistrationFormProps {
  formFields: FormField[];
  onSubmit: (formData: Record<string, any>) => Promise<void>;
  eventId?: string;
  formId?: string;
  userEmail?: string;
  userName?: string;
}

interface PaymentResult {
  success: boolean;
  paymentId: string | null;
  status: string | null;
  receiptUrl?: string;
}

interface ProcessPaymentParams {
  amount: number;
  currency: string;
  token: string;
  description: string;
  metadata: {
    eventId: string;
    formFieldId: string;
  };
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

const EventRegistrationForm: React.FC<EventRegistrationFormProps> = ({
  formFields,
  eventId,
  onSubmit,
  formId,
  userEmail = '',
  userName = '',
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const hasPaymentField = formFields.some((f) => f.type === 'payment');

  useEffect(() => {
    if (userEmail) setFormData((prev) => ({ ...prev, email: userEmail }));
    if (userName) setFormData((prev) => ({ ...prev, name: userName }));
  }, [userEmail, userName]);

  const handleChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const processPayment = async (
    params: ProcessPaymentParams
  ): Promise<PaymentResult> => {
    try {
      setPaymentProcessing(true);
      const { data } = await api.post('/payments/process', params);
      return {
        success: true,
        paymentId: data.id,
        status: data.status,
        receiptUrl: data.receiptUrl,
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      throw new Error(
        axios.isAxiosError(error)
          ? error.response?.data?.message || 'Payment processing failed'
          : 'Payment processing failed'
      );
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate required fields
    const missingFields = formFields
      .filter(
        (field) =>
          field.required && !formData[field.id] && field.type !== 'payment'
      )
      .map((field) => field.label || field.id);

    if (missingFields.length > 0) {
      setError(`Missing required fields: ${missingFields.join(', ')}`);
      setIsSubmitting(false);
      return;
    }

    try {
      const paymentField = formFields.find(
        (f): f is PaymentFormField => f.type === 'payment'
      );

      let paymentResult: PaymentResult | null = null;

      // Process payment if this form has a payment field
      if (paymentField?.paymentConfig) {
        if (!formData.paymentToken) {
          throw new Error('Payment processing incomplete');
        }

        paymentResult = await processPayment({
          amount: paymentField.paymentConfig.amount,
          currency: paymentField.paymentConfig.currency || 'USD',
          token: formData.paymentToken,
          description:
            paymentField.paymentConfig.description ||
            `Payment for event registration`,
          metadata: {
            eventId: eventId || 'unknown',
            formFieldId: paymentField.id,
          },
        });

        if (!paymentResult?.success) {
          throw new Error(paymentResult?.status || 'Payment processing failed');
        }
      }

      // Prepare submission data
      const submissionData = {
        eventId,
        formId,
        formData,
        payment:
          paymentField && paymentResult
            ? {
                id: paymentResult.paymentId,
                amount: paymentField.paymentConfig.amount,
                currency: paymentField.paymentConfig.currency || 'USD',
                status: paymentResult.status,
                receiptUrl: paymentResult.receiptUrl,
                processedAt: new Date().toISOString(),
              }
            : undefined,
      };

      // Submit the form data
      await api.post('/form-submissions', submissionData);
      await onSubmit(formData);

      // Reset form after successful submission
      setFormData({});
      setPaymentComplete(false);

      alert('Registration submitted successfully!');
    } catch (err) {
      console.error('Form submission error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An unknown error occurred during submission'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPaymentFields = (field: PaymentFormField) => {
    const SQUARE_APP_ID =
      process.env.REACT_APP_SQUARE_APP_ID ||
      'sandbox-sq0idb-I4PAJ1f1XKYqYSwLovq0xQ';
    const SQUARE_LOCATION_ID =
      process.env.REACT_APP_SQUARE_LOCATION_ID || 'LCW4GM814GWXK';

    const handleCardTokenized = async (tokenResult: any) => {
      try {
        if (tokenResult.status === 'OK') {
          setPaymentProcessing(true);

          // Get card details from the tokenization response
          const cardDetails = tokenResult.details?.card || {};

          const paymentResult = await api.post('/events/payments/process', {
            token: tokenResult.token,
            amount: field.paymentConfig?.amount,
            currency: field.paymentConfig?.currency || 'USD',
            eventId,
            formId,
            buyerEmail: formData.email || userEmail,
            buyerName: formData.name || userName,
            description:
              field.paymentConfig?.description || 'Event registration',
            cardDetails: {
              last_4: cardDetails.last4,
              card_brand: cardDetails.cardBrand,
              exp_month: cardDetails.expMonth,
              exp_year: cardDetails.expYear,
            },
          });

          if (paymentResult.data.success) {
            handleChange('paymentToken', tokenResult.token);
            setPaymentComplete(true);
            await handleSubmit();
          } else {
            throw new Error(
              paymentResult.data.error || 'Payment processing failed'
            );
          }
        } else {
          let errorMessage = 'Payment failed';
          if (tokenResult.errors) {
            errorMessage = tokenResult.errors
              .map((error: any) => error.detail)
              .join(', ');
          }
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error('Payment error:', error);
        setError(
          error instanceof Error ? error.message : 'Payment processing failed'
        );
        setPaymentComplete(false);
      } finally {
        setPaymentProcessing(false);
      }
    };

    return (
      <div className='border p-3 rounded bg-light mb-3'>
        <h5>Payment Information</h5>
        {field.paymentConfig && (
          <div className='mb-3'>
            <p>
              <strong>Amount:</strong> $
              {(field.paymentConfig.amount / 100).toFixed(2)}{' '}
              {field.paymentConfig.currency &&
                ` ${field.paymentConfig.currency}`}
            </p>
            {field.paymentConfig.description && (
              <p className='text-muted'>{field.paymentConfig.description}</p>
            )}
          </div>
        )}

        <div className='mb-3'>
          <label className='form-label'>Name on Card</label>
          <input
            type='text'
            className='form-control'
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
        </div>

        <div className='mb-3'>
          <label className='form-label'>Email for Receipt</label>
          <input
            type='email'
            className='form-control'
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            required
          />
        </div>

        {paymentProcessing ? (
          <LoadingSpinner />
        ) : !paymentComplete ? (
          <PaymentForm
            applicationId={SQUARE_APP_ID}
            locationId={SQUARE_LOCATION_ID}
            cardTokenizeResponseReceived={handleCardTokenized}
            createPaymentRequest={() => ({
              countryCode: 'US',
              currencyCode: field.paymentConfig?.currency || 'USD',
              total: {
                amount: field.paymentConfig?.amount.toString() || '0',
                label: 'Total',
              },
              buyerEmailAddress: formData.email || userEmail,
            })}
          >
            <CreditCard />
          </PaymentForm>
        ) : (
          <div className='alert alert-success'>
            <i className='ti ti-check me-2' />
            Payment processed successfully
          </div>
        )}
      </div>
    );
  };

  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <input
            type={field.type === 'number' ? 'number' : field.type}
            className='form-control'
            placeholder={field.placeholder || ''}
            value={formData[field.id] || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            required={field.required}
            min={field.type === 'number' ? field.validation?.min : undefined}
            max={field.type === 'number' ? field.validation?.max : undefined}
          />
        );

      case 'select':
        return (
          <select
            className='form-select'
            value={formData[field.id] || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            required={field.required}
          >
            <option value=''>Select an option</option>
            {(field.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className='form-radio-group'>
            {(field.options || []).map((option) => (
              <div key={option.value} className='form-check'>
                <input
                  className='form-check-input'
                  type='radio'
                  name={field.id}
                  id={`${field.id}-${option.value}`}
                  value={option.value}
                  checked={formData[field.id] === option.value}
                  onChange={() => handleChange(field.id, option.value)}
                  required={field.required}
                />
                <label
                  className='form-check-label'
                  htmlFor={`${field.id}-${option.value}`}
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className='form-check'>
            <input
              className='form-check-input'
              type='checkbox'
              id={field.id}
              checked={!!formData[field.id]}
              onChange={(e) => handleChange(field.id, e.target.checked)}
              required={field.required}
            />
            <label className='form-check-label' htmlFor={field.id}>
              {field.label}
            </label>
          </div>
        );

      case 'payment':
        return renderPaymentFields(field as PaymentFormField);

      case 'section':
        // Type-safe section field rendering
        const sectionField = field as SectionFormField;
        return (
          <div className='form-section mb-4'>
            <h5 className='border-bottom pb-2'>{sectionField.label}</h5>
            {'description' in sectionField && sectionField.description && (
              <p className='text-muted'>{sectionField.description}</p>
            )}
          </div>
        );

      default:
        console.warn(`Unsupported field type: ${(field as any).type}`);
        return null;
    }
  };

  return (
    <div className='event-registration-form'>
      <form onSubmit={handleSubmit}>
        {formFields.length === 0 ? (
          <div className='alert alert-info'>No form fields configured</div>
        ) : (
          formFields.map((field) => (
            <div
              key={field.id}
              className={`mb-3 ${field.type === 'section' ? 'mt-4' : ''}`}
            >
              {field.type !== 'checkbox' &&
                field.type !== 'radio' &&
                field.type !== 'section' && (
                  <label className='form-label'>
                    {/* {field.label} */}
                    {field.required && <span className='text-danger'>*</span>}
                  </label>
                )}
              {renderField(field)}
            </div>
          ))
        )}

        {error && (
          <div className='alert alert-danger mb-3'>
            <i className='ti ti-alert-circle me-2' />
            {error}
          </div>
        )}

        {!hasPaymentField && (
          <button
            type='submit'
            className='btn btn-primary'
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className='spinner-border spinner-border-sm me-2' />
                Submitting...
              </>
            ) : (
              'Submit Registration'
            )}
          </button>
        )}
      </form>
    </div>
  );
};

export default EventRegistrationForm;
