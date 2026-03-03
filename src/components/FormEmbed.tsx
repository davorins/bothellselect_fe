import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  CreditCard,
  PaymentForm as SquarePaymentForm,
  PaymentFormProps,
} from 'react-square-web-payments-sdk';
import { Badge, Alert, Spinner, Row, Col, Button, Form } from 'react-bootstrap';
import {
  Award,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Map,
  RefreshCw,
  CheckCircle,
  DollarSign,
} from 'react-feather';

const SquarePaymentFormWithRef = React.forwardRef<any, PaymentFormProps>(
  (props, ref) => (
    <SquarePaymentForm {...props} ref={ref}>
      {props.children}
    </SquarePaymentForm>
  ),
);
SquarePaymentFormWithRef.displayName = 'SquarePaymentFormWithRef';

interface FormEmbedProps {
  formId: string;
  onPaymentComplete?: (paymentData: any) => void;
  onFormSubmit?: (submissionData: any) => void;
  wrapperClassName?: string;
}

interface Venue {
  venueName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  fullAddress: string;
  date: string;
  startTime: string;
  endTime: string;
  isPrimary: boolean;
  additionalInfo: string;
}

interface TournamentSettings {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isRefundable: boolean;
  refundPolicy: string;
  ticketCheckMethod: 'qr' | 'email' | 'manual' | 'name-list' | 'other';
  customCheckMethod: string;
  venues: Venue[];
  showScheduleTable: boolean;
}

interface PricingPackage {
  name: string;
  description?: string;
  price: number; // in cents
  currency: string;
  quantity: number;
  maxQuantity?: number;
  defaultSelected: boolean;
  isEnabled: boolean;
}

interface PaymentConfig {
  amount: number;
  description: string;
  currency: string;
  recurring: boolean;
  recurringInterval: 'monthly' | 'yearly' | 'weekly';
  pricingPackages: PricingPackage[];
  fixedPrice: boolean;
  squareAppId?: string;
  squareLocationId?: string;
  sandboxMode?: boolean;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  name: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  options?: Array<{ label: string; value: string; selected?: boolean }>;
  paymentConfig?: PaymentConfig;
}

interface FormData {
  _id?: string;
  name: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  fields: FormField[];
  settings: {
    submitText: string;
    successMessage: string;
    redirectUrl: string;
    paymentSettings?: {
      squareAppId?: string;
      squareLocationId?: string;
      sandboxMode?: boolean;
      currency?: string;
    };
  };
  isTournamentForm: boolean;
  tournamentSettings?: TournamentSettings;
}

const FormEmbed: React.FC<FormEmbedProps> = ({
  formId,
  onPaymentComplete,
  onFormSubmit,
  wrapperClassName = '',
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [userEmail, setUserEmail] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentFormKey, setPaymentFormKey] = useState(0);
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const [isPaymentTokenized, setIsPaymentTokenized] = useState(false);

  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
  const squareFormRef = useRef<any>(null);

  // Load form data
  useEffect(() => {
    const loadForm = async () => {
      try {
        setLoading(true);
        setError(null);
        setServerErrors([]);

        const response = await axios.get(
          `${API_BASE_URL}/forms/published/${formId}`,
        );

        if (response.data.success) {
          const data = response.data.data;
          setFormData(data);

          // Initialize form values
          const initialValues: Record<string, any> = {};
          data.fields?.forEach((field: FormField) => {
            if (field.type !== 'payment') {
              initialValues[field.id] = field.defaultValue || '';
              if (field.name && field.name !== field.id) {
                initialValues[field.name] = field.defaultValue || '';
              }
            }
          });
          setFormValues(initialValues);
        } else {
          setError(response.data.error || 'Failed to load form');
        }
      } catch (err: any) {
        console.error('Error loading form:', err);
        setError('Failed to load form. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (formId) {
      loadForm();
    }
  }, [formId]);

  // ========== TOURNAMENT INFO RENDERER ==========
  const renderTournamentInfo = () => {
    if (!formData?.isTournamentForm || !formData?.tournamentSettings) {
      return null;
    }

    const tournament = formData.tournamentSettings;
    const primaryVenue =
      tournament.venues.find((v) => v.isPrimary) || tournament.venues[0];

    // Format dates with timezone handling
    const formatDate = (dateString: string) => {
      if (!dateString) return '';

      try {
        // Check if it's already in the format we want
        if (typeof dateString === 'string') {
          // If it's in YYYY-MM-DD format, parse it without timezone issues
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [year, month, day] = dateString.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
          }

          // Try to parse as ISO string
          if (dateString.includes('T')) {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC', // Force UTC to avoid timezone shift
              });
            }
          }
        }

        // Last resort: try to parse as Date
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          // Add timezone offset to get correct date
          const timezoneOffset = date.getTimezoneOffset() * 60000;
          const correctedDate = new Date(date.getTime() + timezoneOffset);

          return correctedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }

        return dateString;
      } catch (e) {
        console.error('Error formatting date:', e, 'Input:', dateString);
        return dateString;
      }
    };

    // Format time
    const formatTime = (timeString: string) => {
      if (!timeString) return '';
      try {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const suffix = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes.padStart(2, '0')} ${suffix}`;
      } catch (e) {
        return timeString;
      }
    };

    // Sort venues by date
    const sortedVenues = [...tournament.venues]
      .filter((venue) => venue.date)
      .sort((a, b) => {
        try {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        } catch (e) {
          return 0;
        }
      });

    return (
      <div className='tournament-info mb-4 p-3 border rounded bg-light'>
        <h4 className='mb-4'>
          <Award size={20} className='me-2' />
          Tournament Information
        </h4>

        <Row>
          <Col md={7}>
            <div className='mb-2'>
              <strong>
                <CalendarIcon size={16} className='me-2' />
                Tournament Dates:
              </strong>
              <div className='mt-1'>
                {formatDate(tournament.startDate)} -{' '}
                {formatDate(tournament.endDate)}
              </div>
            </div>

            {tournament.startTime && tournament.endTime && (
              <div className='mb-2'>
                <strong>
                  <Clock size={16} className='me-2' />
                  Daily Schedule:
                </strong>
                <div className='mt-1'>
                  {formatTime(tournament.startTime)} -{' '}
                  {formatTime(tournament.endTime)}
                </div>
              </div>
            )}

            {/* Primary Venue Information */}
            {primaryVenue && primaryVenue.venueName && (
              <div className='mb-2'>
                <div>
                  <div>
                    <MapPin size={16} className='me-2' />{' '}
                    <strong>{primaryVenue.venueName}</strong>
                  </div>
                  <div>
                    {primaryVenue.fullAddress ||
                      `${primaryVenue.address}, ${primaryVenue.city}, ${primaryVenue.state} ${primaryVenue.zipCode}`}
                  </div>
                  {primaryVenue.additionalInfo && (
                    <div className='text-muted mt-1'>
                      {primaryVenue.additionalInfo}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Col>

          <Col md={5}>
            <div className='mb-2'>
              <strong>
                <CheckCircle size={16} className='me-2' />
                Ticket Check Method:
              </strong>
              <div className='mt-1'>
                {tournament.ticketCheckMethod === 'other'
                  ? tournament.customCheckMethod
                  : tournament.ticketCheckMethod.charAt(0).toUpperCase() +
                    tournament.ticketCheckMethod.slice(1).replace('-', ' ')}
              </div>
            </div>

            {/* Show refund policy ONLY if tickets are refundable AND a policy exists */}
            {tournament.isRefundable &&
              tournament.refundPolicy &&
              tournament.refundPolicy.trim() !== '' && (
                <div className='mb-2'>
                  <strong>
                    <RefreshCw size={16} className='me-2' />
                    Refund Policy:
                  </strong>
                  <div className='mt-1'>{tournament.refundPolicy}</div>
                </div>
              )}
            {/* When tickets are not refundable, don't show anything */}
          </Col>
        </Row>

        {/* Venues Schedule Table - only show if showScheduleTable is true and there are venues */}
        {tournament.showScheduleTable !== false && sortedVenues.length > 0 && (
          <div className='mt-3'>
            <h6>
              <Map size={16} className='me-2' />
              Venue Schedule:
            </h6>
            <div className='table-responsive mt-2'>
              <table className='table table-sm table-bordered'>
                <thead className='table-light'>
                  <tr>
                    <th>Date</th>
                    <th>Venue</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVenues.map((venue, index) => (
                    <tr key={index}>
                      <td>
                        {formatDate(venue.date)}
                        {venue.isPrimary && (
                          <Badge bg='primary' className='ms-2'>
                            Primary
                          </Badge>
                        )}
                      </td>
                      <td>{venue.venueName}</td>
                      <td>
                        {venue.startTime && venue.endTime
                          ? `${formatTime(venue.startTime)} - ${formatTime(
                              venue.endTime,
                            )}`
                          : 'All day'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    // Update both field.id and field.name in formValues
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    // Also update by field.name if it exists and is different
    const field = formData?.fields?.find((f: FormField) => f.id === fieldId);
    if (field && field.name && field.name !== fieldId) {
      setFormValues((prev) => ({
        ...prev,
        [field.name]: value,
      }));
    }

    // Clear field errors
    if (fieldErrors[fieldId]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }

    if (error || serverErrors.length > 0) {
      setError(null);
      setServerErrors([]);
    }

    if (field && field.type === 'email') {
      setUserEmail(value);
    }
  };

  const validateAllFields = (): boolean => {
    if (!formData) return false;

    const errors: Record<string, string> = {};
    let isValid = true;

    formData.fields.forEach((field: FormField) => {
      if (field.type === 'payment') return;

      if (field.required) {
        // Check both field.id and field.name for the value
        const fieldValue = formValues[field.id] || formValues[field.name] || '';

        if (!fieldValue || fieldValue.toString().trim() === '') {
          errors[field.id] = `${field.label} is required`;
          isValid = false;
        } else if (field.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(fieldValue.toString().trim())) {
            errors[field.id] = 'Please enter a valid email address';
            isValid = false;
          }
        }
      }
    });

    setFieldErrors(errors);
    return isValid;
  };

  const extractEmail = () => {
    if (!formData) return '';

    const emailField = formData.fields.find(
      (field: FormField) => field.type === 'email',
    );

    if (!emailField) return '';

    const emailValue =
      formValues[emailField.id] || formValues[emailField.name] || '';

    return emailValue.toString().trim();
  };

  // Step 1: Submit form data
  const submitFormData = async (): Promise<void> => {
    if (!formData) return;

    setError(null);
    setServerErrors([]);

    const isValid = validateAllFields();
    if (!isValid) {
      setError('Please fill in all required fields correctly.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build submission data - include ALL form values at root level
      const payload: Record<string, any> = {
        formId: formData._id,
        metadata: {
          submittedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer,
          source: 'react_embed',
          submittedStep: 'form_data',
        },
        status: 'pending_payment' as const,
      };

      // Add ALL form values to the payload (not nested under 'data')
      formData.fields.forEach((field: FormField) => {
        if (field.type === 'payment') return;

        // Get the value
        const fieldValue = formValues[field.id] || formValues[field.name] || '';

        // Add to payload using both field.id and field.name
        if (field.id) payload[field.id] = fieldValue;
        if (field.name && field.name !== field.id) {
          payload[field.name] = fieldValue;
        }

        // Also add with label-based keys for compatibility
        const labelKey = field.label.toLowerCase().replace(/\s+/g, '_');
        payload[labelKey] = fieldValue;
      });

      // Ensure email is at root level for all possible field names
      const emailField = formData.fields.find(
        (f: FormField) => f.type === 'email',
      );
      if (emailField) {
        const emailValue =
          formValues[emailField.id] || formValues[emailField.name] || '';
        payload['email'] = emailValue;
        payload['userEmail'] = emailValue;
        setUserEmail(emailValue);
      }

      // Ensure name is at root level for all possible field names
      const nameField = formData.fields.find(
        (f: FormField) =>
          f.type === 'text' && f.label.toLowerCase().includes('name'),
      );
      if (nameField) {
        const nameValue =
          formValues[nameField.id] || formValues[nameField.name] || '';
        payload['name'] = nameValue;
        payload['userName'] = nameValue;
      }

      console.log('Full payload being sent:', payload);

      const response = await axios.post(
        `${API_BASE_URL}/forms/${formData._id}/submit`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('Form submission response:', response.data);

      if (response.data.success) {
        const submissionId =
          response.data.data?.submissionId || response.data.data?._id;

        if (!submissionId) {
          throw new Error('No submission ID received from server');
        }

        setSubmissionId(submissionId);
        console.log('Submission ID set:', submissionId);

        const paymentFields = formData.fields.filter(
          (field: FormField) => field.type === 'payment',
        );

        if (paymentFields.length > 0) {
          setStep('payment');

          const paymentField = paymentFields[0];
          const pricingPackages = paymentField.paymentConfig?.pricingPackages;

          if (pricingPackages && pricingPackages.length > 0) {
            const defaultPackage =
              pricingPackages.find(
                (pkg: PricingPackage) => pkg.defaultSelected && pkg.isEnabled,
              ) || pricingPackages[0];

            if (defaultPackage) {
              setSelectedPackage(defaultPackage);
              setQuantity(defaultPackage.quantity || 1);
            }
          }

          setPaymentFormKey((prev) => prev + 1);
        } else {
          setSubmitSuccess(true);

          if (formData.settings?.redirectUrl) {
            setTimeout(() => {
              window.location.href = formData.settings.redirectUrl;
            }, 3000);
          }
        }

        if (onFormSubmit) {
          onFormSubmit(response.data.data);
        }
      } else {
        const errorMsg = response.data.message || 'Form submission failed';
        setError(errorMsg);
        if (response.data.errors) {
          setServerErrors(response.data.errors);
        }
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Form submission error:', err);

      if (err.response) {
        const response = err.response;
        console.error('Server error response:', response.data);

        const errorMsg =
          response.data.error ||
          (response.data.errors && response.data.errors.join(', ')) ||
          'Form submission failed';
        setError(errorMsg);

        if (response.data.errors) {
          setServerErrors(response.data.errors);
        }
      } else if (err.request) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err.message || 'Form submission failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPaymentField = () => {
    if (!formData) return null;
    return formData.fields.find((field: FormField) => field.type === 'payment');
  };

  const validatePaymentStep = (): boolean => {
    const paymentField = getPaymentField();

    if (!paymentField) {
      setPaymentError('No payment field found');
      return false;
    }

    const pricingPackages = paymentField.paymentConfig?.pricingPackages;
    if (!pricingPackages || pricingPackages.length === 0) {
      return true;
    }

    if (!selectedPackage) {
      setPaymentError('Please select a pricing package');
      return false;
    }

    if (quantity < 1) {
      setPaymentError('Quantity must be at least 1');
      return false;
    }

    if (selectedPackage.maxQuantity && quantity > selectedPackage.maxQuantity) {
      setPaymentError(
        `Maximum quantity for this package is ${selectedPackage.maxQuantity}`,
      );
      return false;
    }

    return true;
  };

  // Handler for Square payment tokenization
  const handleCardTokenized = async (tokenResult: any, verifiedBuyer?: any) => {
    console.log('Square payment token received, but not auto-processing');
    console.log('Token status:', tokenResult.status);

    if (tokenResult.status === 'OK') {
      console.log('Token available for manual processing');
      // Store token in state for later use
      setPaymentToken(tokenResult.token);
      setIsPaymentTokenized(true);
      setPaymentError(null);

      // Extract card details for payment processing
      const cardDetails = tokenResult.details?.card || {};
      console.log('Card tokenized:', {
        token: tokenResult.token,
        last4: cardDetails.last4,
        brand: cardDetails.brand,
      });

      // Auto-process payment when token is received
      setTimeout(() => {
        processPayment(tokenResult.token, cardDetails);
      }, 100);
    } else {
      setIsPaymentTokenized(false);
      setPaymentToken(null);
      const errorMsg =
        tokenResult.errors?.[0]?.message || 'Payment tokenization failed';
      setPaymentError(errorMsg);
      console.error('Tokenization failed:', tokenResult.errors);
    }

    return false;
  };

  // Process payment with Square
  const processPayment = async (token: string, cardDetailsParam?: any) => {
    console.log('=== Processing payment ===');
    console.log('submissionId:', submissionId);

    if (!token) {
      setPaymentError('Payment token is missing');
      return;
    }

    if (!submissionId) {
      setPaymentError('Submission information missing');
      return;
    }

    if (!validatePaymentStep()) {
      return;
    }

    setIsSubmitting(true);
    setPaymentError(null);

    try {
      const paymentField = getPaymentField();

      if (!paymentField) {
        throw new Error('Payment field not found');
      }

      let amount = 0;
      let packageName = '';

      if (selectedPackage) {
        amount = selectedPackage.price * quantity;
        packageName = selectedPackage.name;
      } else if (paymentField.paymentConfig?.fixedPrice) {
        amount = paymentField.paymentConfig.amount || 0;
      } else {
        throw new Error('No valid payment option selected');
      }

      if (amount <= 0) {
        throw new Error('Invalid payment amount');
      }

      console.log('Payment details:', {
        amount,
        amountInDollars: amount / 100,
        packageName,
        quantity,
        submissionId,
        email: userEmail,
      });

      // Prepare card details
      const finalCardDetails = cardDetailsParam || {
        last_4: '',
        card_brand: '',
        exp_month: '',
        exp_year: '',
      };

      console.log('Sending payment request to server...');

      const paymentResponse = await axios.post(
        `${API_BASE_URL}/forms/${formData!._id}/process-payment`,
        {
          token: token,
          email: userEmail,
          cardDetails: {
            last_4: finalCardDetails.last_4 || finalCardDetails.last4 || '',
            card_brand:
              finalCardDetails.card_brand || finalCardDetails.brand || '',
            exp_month:
              finalCardDetails.exp_month || finalCardDetails.expMonth || '',
            exp_year:
              finalCardDetails.exp_year || finalCardDetails.expYear || '',
          },
          submissionId: submissionId,
          selectedPackage: packageName,
          quantity: quantity,
          amount: amount, // Send the calculated amount
        },
      );

      console.log('Payment response:', paymentResponse.data);

      if (paymentResponse.data.success) {
        const paymentData = {
          paymentId: paymentResponse.data.paymentId,
          squarePaymentId: paymentResponse.data.squarePaymentId,
          amount: amount / 100,
          currency: paymentField.paymentConfig?.currency || 'USD',
          status: 'completed',
          receiptUrl: paymentResponse.data.receiptUrl,
          cardLast4: finalCardDetails.last_4 || finalCardDetails.last4 || '',
          cardBrand:
            finalCardDetails.card_brand || finalCardDetails.brand || '',
          timestamp: new Date().toISOString(),
          package: packageName,
          quantity: quantity,
        };

        setSubmitSuccess(true);

        if (onPaymentComplete) {
          onPaymentComplete(paymentData);
        }

        if (formData!.settings?.redirectUrl) {
          setTimeout(() => {
            window.location.href = formData!.settings.redirectUrl;
          }, 3000);
        }
      } else {
        throw new Error(
          paymentResponse.data.error || 'Payment processing failed',
        );
      }
    } catch (err: any) {
      console.error('Payment processing error:', err);
      setPaymentError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Payment processing failed',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render quantity selector for packages
  const renderPricingPackages = () => {
    const paymentField = getPaymentField();

    if (!paymentField || !paymentField.paymentConfig?.pricingPackages) {
      return null;
    }

    const packages = paymentField.paymentConfig.pricingPackages.filter(
      (pkg: PricingPackage) => pkg.isEnabled !== false,
    );

    const handleQuantityChange = (newQuantity: number) => {
      if (newQuantity < 1) newQuantity = 1;
      if (
        selectedPackage?.maxQuantity &&
        newQuantity > selectedPackage.maxQuantity
      ) {
        newQuantity = selectedPackage.maxQuantity;
      }
      setQuantity(newQuantity);
      setPaymentError(null);
    };

    const handlePackageSelect = (pkg: any) => {
      setSelectedPackage(pkg);
      // Reset quantity to package default or 1
      setQuantity(pkg.quantity || 1);
      setPaymentError(null);
    };

    return (
      <div>
        <h5 className='mb-2'>Select Payment Option</h5>
        <div className='row'>
          {packages.map((pkg: PricingPackage, index: number) => (
            <div key={index} className='col-md-4 mb-3'>
              <div
                className={`card ${
                  selectedPackage?.name === pkg.name ? 'border-primary' : ''
                }`}
                style={{ cursor: 'pointer' }}
                onClick={() => handlePackageSelect(pkg)}
              >
                <div className='card-body text-center'>
                  <h5 className='card-title'>{pkg.name}</h5>
                  {pkg.description && (
                    <span className='card-text text-muted'>
                      {pkg.description}
                    </span>
                  )}
                  <h3>${(pkg.price / 100).toFixed(2)}</h3>

                  {/* Quantity selector - always show, but highlight when selected */}
                  <div
                    className={`mt-3 ${
                      selectedPackage?.name === pkg.name ? '' : 'text-muted'
                    }`}
                  >
                    <label className='form-label'>Quantity</label>
                    <div className='d-flex align-items-center justify-content-center'>
                      <button
                        className='btn btn-outline-secondary btn-sm'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuantityChange(quantity - 1);
                        }}
                        disabled={
                          quantity <= 1 || selectedPackage?.name !== pkg.name
                        }
                        style={{ width: '30px', padding: '2px' }}
                      >
                        -
                      </button>

                      <div
                        className='mx-2 text-center'
                        style={{
                          width: '50px',
                          padding: '5px',
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          backgroundColor:
                            selectedPackage?.name === pkg.name
                              ? '#fff'
                              : '#e9ecef',
                        }}
                      >
                        {selectedPackage?.name === pkg.name
                          ? quantity
                          : pkg.quantity || 1}
                      </div>

                      <button
                        className='btn btn-outline-secondary btn-sm'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuantityChange(quantity + 1);
                        }}
                        disabled={
                          (pkg.maxQuantity && quantity >= pkg.maxQuantity) ||
                          selectedPackage?.name !== pkg.name
                        }
                        style={{ width: '30px', padding: '2px' }}
                      >
                        +
                      </button>
                    </div>
                    {pkg.maxQuantity && (
                      <small className='text-muted'>
                        Max: {pkg.maxQuantity}
                      </small>
                    )}

                    {/* Show total for selected package */}
                    {selectedPackage?.name === pkg.name && (
                      <div className='mt-2'>
                        <strong className='text-primary'>
                          Total: ${((pkg.price * quantity) / 100).toFixed(2)}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFieldInput = (field: FormField) => {
    const fieldId = field.id;
    const value = formValues[fieldId] || '';
    const error = fieldErrors[fieldId];
    const isInvalid = !!error;

    const commonProps = {
      className: `form-control ${isInvalid ? 'is-invalid' : ''}`,
      placeholder: field.placeholder || '',
      required: field.required,
      disabled: isSubmitting,
      value: value,
      onChange: (e: any) => handleFieldChange(fieldId, e.target.value),
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'tel':
      case 'url':
      case 'password':
        return (
          <>
            <input type={field.type} {...commonProps} />
            {error && <div className='invalid-feedback'>{error}</div>}
          </>
        );
      case 'textarea':
        return (
          <>
            <textarea
              {...commonProps}
              rows={4}
              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            />
            {error && <div className='invalid-feedback'>{error}</div>}
          </>
        );
      case 'select':
        return (
          <>
            <select
              className={`form-select ${isInvalid ? 'is-invalid' : ''}`}
              required={field.required}
              disabled={isSubmitting}
              value={value}
              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            >
              <option value=''>
                {field.placeholder || 'Select an option'}
              </option>
              {(field.options || []).map((option, index) => (
                <option key={index} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {error && <div className='invalid-feedback'>{error}</div>}
          </>
        );
      case 'radio':
        return (
          <>
            <div>
              {(field.options || []).map((option, index) => (
                <div className='form-check' key={index}>
                  <input
                    type='radio'
                    className={`form-check-input ${
                      isInvalid ? 'is-invalid' : ''
                    }`}
                    name={field.name}
                    value={option.value}
                    required={field.required}
                    disabled={isSubmitting}
                    checked={value === option.value}
                    onChange={() => handleFieldChange(fieldId, option.value)}
                  />
                  <label className='form-check-label'>{option.label}</label>
                </div>
              ))}
            </div>
            {error && <div className='invalid-feedback'>{error}</div>}
          </>
        );
      case 'checkbox':
        return (
          <>
            <div className='form-check'>
              <input
                type='checkbox'
                className={`form-check-input ${isInvalid ? 'is-invalid' : ''}`}
                required={field.required}
                disabled={isSubmitting}
                checked={!!value}
                onChange={(e) => handleFieldChange(fieldId, e.target.checked)}
              />
              <label className='form-check-label'>{field.label}</label>
            </div>
            {error && <div className='invalid-feedback'>{error}</div>}
          </>
        );
      case 'date':
        return (
          <>
            <input
              type='date'
              className={`form-control ${isInvalid ? 'is-invalid' : ''}`}
              placeholder={field.placeholder}
              required={field.required}
              disabled={isSubmitting}
              value={value}
              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            />
            {error && <div className='invalid-feedback'>{error}</div>}
          </>
        );
      default:
        return <input type='text' className='form-control' disabled />;
    }
  };

  const renderRegularField = (field: FormField) => {
    return (
      <div className='mb-3' key={field.id}>
        <label className='form-label'>
          {field.label}
          {field.required && <span className='text-danger ms-1'>*</span>}
        </label>
        {renderFieldInput(field)}
        {field.helpText && (
          <div className='form-text text-muted'>{field.helpText}</div>
        )}
      </div>
    );
  };

  const renderPaymentStep = () => {
    const paymentField = getPaymentField();

    if (!paymentField) return null;

    const amountInDollars = selectedPackage
      ? ((selectedPackage.price * quantity) / 100).toFixed(2)
      : ((paymentField.paymentConfig?.amount || 0) / 100).toFixed(2);

    const appId =
      paymentField.paymentConfig?.squareAppId ||
      formData!.settings?.paymentSettings?.squareAppId ||
      'sq0idp-jUCxKnO_i8i7vccQjVj_0g';
    const locationId =
      paymentField.paymentConfig?.squareLocationId ||
      formData!.settings?.paymentSettings?.squareLocationId ||
      'L26Q50FWRCQW5';

    return (
      <div className='payment-step'>
        {paymentError && (
          <div className='alert alert-danger mb-3'>
            <i className='ti ti-alert-triangle me-2'></i>
            {paymentError}
          </div>
        )}

        {renderPricingPackages()}

        <div className='card mb-4'>
          <div className='card-body'>
            <h6>Payment Summary</h6>
            <div className='d-flex justify-content-between mb-2'>
              <span>Item:</span>
              <span>{selectedPackage?.name || paymentField.label}</span>
            </div>
            {selectedPackage && (
              <>
                <div className='d-flex justify-content-between mb-2'>
                  <span>Unit Price:</span>
                  <span>${(selectedPackage.price / 100).toFixed(2)}</span>
                </div>
                <div className='d-flex justify-content-between mb-2'>
                  <span>Quantity:</span>
                  <span>{quantity}</span>
                </div>
              </>
            )}
            <div className='d-flex justify-content-between border-top pt-2'>
              <strong>Total Amount:</strong>
              <strong>
                ${amountInDollars}{' '}
                {paymentField.paymentConfig?.currency || 'USD'}
              </strong>
            </div>
          </div>
        </div>

        <div className='card mb-4'>
          <div className='card-body'>
            <h6 className='card-title'>Payment Details</h6>

            {/* Square Form */}
            <SquarePaymentFormWithRef
              key={paymentFormKey}
              ref={squareFormRef}
              applicationId={appId}
              locationId={locationId}
              cardTokenizeResponseReceived={handleCardTokenized}
              createPaymentRequest={() => ({
                countryCode: 'US',
                currencyCode: paymentField.paymentConfig?.currency || 'USD',
                total: {
                  amount: amountInDollars,
                  label: 'Total',
                },
              })}
            >
              <CreditCard />
            </SquarePaymentFormWithRef>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className='text-center py-4'>
        <div className='spinner-border text-primary' role='status'>
          <span className='visually-hidden'>Loading form...</span>
        </div>
        <p className='mt-2'>Loading form...</p>
      </div>
    );
  }

  // If form is archived or doesn't exist, return null (hide completely)
  if (!formData && !error) {
    return null;
  }

  // Only show error if we have an error AND form data exists
  if (error && formData) {
    return (
      <div className='alert alert-danger'>
        <p className='mb-0'>{error}</p>
      </div>
    );
  }

  if (!formData) {
    // Form is archived/disabled - hide completely
    return null;
  }

  if (submitSuccess && step === 'form') {
    return (
      <div className='alert alert-success'>
        <i className='ti ti-check-circle me-2'></i>
        <strong>Form Submitted Successfully!</strong>
        <p className='mt-2 mb-0'>
          {formData.settings?.successMessage ||
            'Thank you for your submission.'}
        </p>
        {formData.settings?.redirectUrl && (
          <p className='mt-2 mb-0'>
            Redirecting in 3 seconds...{' '}
            <a href={formData.settings.redirectUrl}>Click here</a> if you are
            not redirected.
          </p>
        )}
      </div>
    );
  }

  if (submitSuccess && step === 'payment') {
    // Get dynamic data from form
    const eventTitle = formData?.title || 'the event';
    const formDescription = formData?.description || '';
    const redirectUrl = formData?.settings?.redirectUrl;

    // Get success message from form settings or use dynamic default
    const successMessage =
      formData?.settings?.successMessage ||
      `Thank you for your purchase! Your ticket(s) for ${eventTitle} have been successfully processed.`;

    return (
      <div className='alert alert-success'>
        <i className='ti ti-info-circle me-2'></i>
        <strong>Thank you for your purchase!</strong>

        <p className='mt-2 mb-0'>
          Your ticket(s) for <strong>{eventTitle}</strong> have been
          successfully processed. We're excited to have you join us and
          appreciate your support.
        </p>

        <p className='mt-2 mb-0'>
          A confirmation email with your purchase details has been sent to{' '}
          <strong>{userEmail}</strong>. Please keep it for your records.
        </p>

        {(formDescription && formDescription.includes('tournament')) ||
        formDescription.includes('event') ||
        formDescription.includes('game') ? (
          <p className='mt-2 mb-0'>
            We look forward to seeing you at{' '}
            {eventTitle.includes('Tournament') ? 'the tournament' : 'the event'}
            !
          </p>
        ) : (
          <p className='mt-2 mb-0'>
            We look forward to seeing you at {eventTitle}!
          </p>
        )}

        {redirectUrl && (
          <p className='mt-2 mb-0'>
            Redirecting in 3 seconds...{' '}
            <a href={redirectUrl} className='text-decoration-none'>
              Click here
            </a>{' '}
            if you are not redirected.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`form-embed-wrapper ${wrapperClassName}`}>
      <div className='form-container'>
        <h3>{formData.title}</h3>
        {formData.description && (
          <p className='text-muted'>{formData.description}</p>
        )}

        {/* Add tournament info here */}
        {renderTournamentInfo()}

        {step === 'form' ? (
          <div>
            <h5 className='mb-2'>Provide Your Information</h5>

            {error && (
              <div className='alert alert-danger mb-3'>
                <i className='ti ti-alert-triangle me-2'></i>
                {error}
              </div>
            )}

            {serverErrors.length > 0 && (
              <div className='alert alert-warning mb-3'>
                <i className='ti ti-alert-triangle me-2'></i>
                <strong>Please fix the following errors:</strong>
                <ul className='mb-0 mt-2'>
                  {serverErrors.map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {formData.fields
              ?.filter((field: FormField) => field.type !== 'payment')
              .map((field: FormField) => renderRegularField(field))}

            <button
              type='button'
              className='btn btn-primary'
              onClick={submitFormData}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span
                    className='spinner-border spinner-border-sm me-2'
                    role='status'
                  ></span>
                  Processing...
                </>
              ) : (
                'Continue to Payment'
              )}
            </button>
          </div>
        ) : (
          renderPaymentStep()
        )}
      </div>
    </div>
  );
};

export default FormEmbed;
