import React from 'react';
import axios from 'axios';
import { FormField, PaymentFormField } from '../../../../types/form';

interface EventRegistrationFormProps {
  formFields: FormField[];
  onSubmit: (formData: Record<string, any>) => Promise<void>;
  eventId?: string;
  formId?: string;
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

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

const processPayment = async (
  params: ProcessPaymentParams
): Promise<PaymentResult> => {
  try {
    const { data } = await api.post('/api/process-payment', params);
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
  }
};

const EventRegistrationForm: React.FC<EventRegistrationFormProps> = ({
  formFields,
  eventId,
  onSubmit,
  formId,
}) => {
  const [formData, setFormData] = React.useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const missingFields = formFields
      .filter((field) => field.required && !formData[field.id])
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

      if (paymentField?.paymentConfig) {
        if (!formData.paymentToken) {
          throw new Error('Payment token is required for this form');
        }

        paymentResult = await processPayment({
          amount: paymentField.paymentConfig.amount,
          currency: paymentField.paymentConfig.currency || 'USD',
          token: formData.paymentToken,
          description:
            paymentField.paymentConfig.description ||
            'Event registration payment',
          metadata: {
            eventId: eventId || 'unknown',
            formFieldId: paymentField.id,
          },
        });

        if (!paymentResult?.success) {
          throw new Error(paymentResult?.status || 'Payment processing failed');
        }
      }

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

      await api.post('/form-submissions', submissionData);
      await onSubmit(formData);
      alert('Registration submitted successfully!');
      setFormData({});
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
    return (
      <div className='border p-3 rounded bg-light'>
        <h6>Payment Information</h6>
        {field.paymentConfig && (
          <>
            <p className='mb-2'>
              <strong>Amount:</strong> ${field.paymentConfig.amount.toFixed(2)}{' '}
              {field.paymentConfig.currency || 'USD'}
            </p>
            {field.paymentConfig.description && (
              <p className='mb-3'>{field.paymentConfig.description}</p>
            )}
          </>
        )}

        <div className='form-group mb-3'>
          <label className='form-label'>Card Number</label>
          <input
            type='text'
            className='form-control'
            placeholder='1234 5678 9012 3456'
            value={formData.cardNumber || ''}
            onChange={(e) => handleChange('cardNumber', e.target.value)}
            required
          />
        </div>

        <div className='row'>
          <div className='col-md-6 form-group mb-3'>
            <label className='form-label'>Expiration Date</label>
            <input
              type='text'
              className='form-control'
              placeholder='MM/YY'
              value={formData.expDate || ''}
              onChange={(e) => handleChange('expDate', e.target.value)}
              required
            />
          </div>
          <div className='col-md-6 form-group mb-3'>
            <label className='form-label'>CVV</label>
            <input
              type='text'
              className='form-control'
              placeholder='123'
              value={formData.cvv || ''}
              onChange={(e) => handleChange('cvv', e.target.value)}
              required
            />
          </div>
        </div>

        <input
          type='hidden'
          value={formData.paymentToken || ''}
          onChange={(e) => handleChange('paymentToken', e.target.value)}
        />
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
            placeholder={field.placeholder}
            value={formData[field.id] || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            required={field.required}
            min={field.type === 'number' ? field.validation?.min : undefined}
            max={field.type === 'number' ? field.validation?.max : undefined}
          />
        );
      case 'select':
      case 'radio':
        return (
          <select
            className='form-select'
            value={formData[field.id] || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            required={field.required}
          >
            <option value=''>Select an option</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <div className='form-check'>
            <input
              className='form-check-input'
              type='checkbox'
              checked={!!formData[field.id]}
              onChange={(e) => handleChange(field.id, e.target.checked)}
              required={field.required}
            />
            <label className='form-check-label'>{field.label}</label>
          </div>
        );
      case 'payment':
        return renderPaymentFields(field);
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {formFields.map((field) => (
        <div key={field.id} className='mb-3'>
          <label className='form-label'>
            {field.label}
            {field.required && <span className='text-danger'>*</span>}
          </label>
          {renderField(field)}
        </div>
      ))}

      {error && (
        <div className='alert alert-danger mb-3'>
          <i className='ti ti-alert-circle me-2' />
          {error}
        </div>
      )}

      <button type='submit' className='btn btn-primary' disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span
              className='spinner-border spinner-border-sm me-2'
              role='status'
              aria-hidden='true'
            />
            Submitting...
          </>
        ) : (
          'Submit Registration'
        )}
      </button>
    </form>
  );
};

export default EventRegistrationForm;
