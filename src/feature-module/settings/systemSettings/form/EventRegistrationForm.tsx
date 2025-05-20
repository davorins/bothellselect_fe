import React from 'react';
import axios from 'axios';
import { FormField, PaymentFormField } from '../../../../types/form';

interface EventRegistrationFormProps {
  formFields: FormField[];
  onSubmit: (formData: Record<string, any>) => void;
  eventId?: string;
}

const processPayment = async (
  amount: number,
  currency: string,
  paymentToken: string
) => {
  try {
    // Replace this with your actual payment processing API call
    const { data } = await axios.post('/api/process-payment', {
      amount,
      currency,
      token: paymentToken,
    });

    return {
      success: true,
      paymentId: data.id,
      status: data.status,
    };
  } catch (error) {
    console.error('Payment processing error:', error);
    throw new Error('Payment processing failed');
  }
};

// API instance configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

const EventRegistrationForm: React.FC<EventRegistrationFormProps> = ({
  formFields,
  onSubmit,
  eventId,
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

    try {
      // Declare paymentResult at the start with a default value
      let paymentResult = {
        success: false,
        paymentId: null,
        status: null,
      };

      const paymentField = formFields.find(
        (f): f is PaymentFormField => f.type === 'payment'
      );

      // Process payment if payment field exists
      if (paymentField) {
        if (!formData.paymentToken) {
          throw new Error('Payment token is required');
        }

        paymentResult = await processPayment(
          paymentField.paymentConfig?.amount || 0,
          paymentField.paymentConfig?.currency || 'USD',
          formData.paymentToken
        );

        if (!paymentResult.success) {
          throw new Error('Payment processing failed');
        }
      }

      // Submit form data
      await api.post('/form-submissions', {
        eventId,
        formData,
        paymentStatus: paymentField ? 'paid' : 'free',
        paymentId: paymentResult.paymentId || null,
      });

      if (onSubmit) {
        onSubmit(formData);
      }

      alert('Registration submitted successfully!');
    } catch (err) {
      console.error('Form submission error:', err);
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred'
      );
    } finally {
      setIsSubmitting(false);
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

          {field.type === 'text' && (
            <input
              type='text'
              className='form-control'
              placeholder={field.placeholder}
              value={formData[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              required={field.required}
            />
          )}

          {field.type === 'email' && (
            <input
              type='email'
              className='form-control'
              placeholder={field.placeholder}
              value={formData[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              required={field.required}
            />
          )}

          {field.type === 'number' && (
            <input
              type='number'
              className='form-control'
              placeholder={field.placeholder}
              value={formData[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              required={field.required}
              min={field.validation?.min}
              max={field.validation?.max}
            />
          )}

          {field.type === 'select' && field.options && (
            <select
              className='form-select'
              value={formData[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              required={field.required}
            >
              <option value=''>Select an option</option>
              {field.options.map((option, index) => (
                <option key={index} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          {field.type === 'checkbox' && (
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
          )}

          {field.type === 'payment' && (
            <div className='border p-3 rounded bg-light'>
              <h6>Payment Information</h6>
              {field.paymentConfig && (
                <>
                  <p>
                    Amount: ${(field.paymentConfig.amount / 100).toFixed(2)}{' '}
                    {field.paymentConfig.currency || 'USD'}
                  </p>
                  <p>{field.paymentConfig.description}</p>
                </>
              )}

              {/* Payment form fields - replace with your actual payment processor integration */}
              <div className='form-group mb-3'>
                <label>Card Number</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='1234 5678 9012 3456'
                  onChange={(e) => handleChange('cardNumber', e.target.value)}
                  required
                />
              </div>

              <div className='form-group mb-3'>
                <label>Expiration Date</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='MM/YY'
                  onChange={(e) => handleChange('expDate', e.target.value)}
                  required
                />
              </div>

              <div className='form-group mb-3'>
                <label>CVV</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='123'
                  onChange={(e) => handleChange('cvv', e.target.value)}
                  required
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {error && <div className='alert alert-danger mb-3'>{error}</div>}

      <button type='submit' className='btn btn-primary' disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Registration'}
      </button>
    </form>
  );
};

export default EventRegistrationForm;
