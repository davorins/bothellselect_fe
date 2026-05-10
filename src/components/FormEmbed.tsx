import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  CreditCard,
  PaymentForm as SquarePaymentForm,
  PaymentFormProps,
} from 'react-square-web-payments-sdk';
import { Badge, Row, Col } from 'react-bootstrap';
import {
  Award,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Map,
  RefreshCw,
  CheckCircle,
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
  isActive?: boolean;
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
  price: number;
  currency: string;
  quantity: number;
  maxQuantity?: number;
  defaultSelected: boolean;
  isEnabled: boolean;
}

interface SelectedPackage extends PricingPackage {
  selectedQuantity: number;
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
  isActive = true,
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
  const [selectedPackages, setSelectedPackages] = useState<SelectedPackage[]>(
    [],
  );
  const [userEmail, setUserEmail] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentFormKey, setPaymentFormKey] = useState(0);
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const [isPaymentTokenized, setIsPaymentTokenized] = useState(false);

  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
  const squareFormRef = useRef<any>(null);

  useEffect(() => {
    const loadForm = async () => {
      if (!isActive) {
        setLoading(false);
        return;
      }

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

          const paymentField = data.fields.find(
            (field: FormField) => field.type === 'payment',
          );
          if (paymentField?.paymentConfig?.pricingPackages) {
            const defaultPackages: SelectedPackage[] =
              paymentField.paymentConfig.pricingPackages
                .filter(
                  (pkg: PricingPackage) => pkg.defaultSelected && pkg.isEnabled,
                )
                .map((pkg: PricingPackage) => ({
                  ...pkg,
                  selectedQuantity: pkg.quantity || 1,
                }));
            setSelectedPackages(defaultPackages);
          }
        } else {
          setError(response.data.error || 'Failed to load form');
        }
      } catch (err: any) {
        console.error('Error loading form:', err);
        if (isActive) {
          setError('Failed to load form. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (formId && isActive) {
      loadForm();
    } else if (!isActive) {
      setLoading(false);
      setFormData(null);
    }
  }, [formId, isActive]);

  const renderTournamentInfo = () => {
    if (!formData?.isTournamentForm || !formData?.tournamentSettings) {
      return null;
    }

    const tournament = formData.tournamentSettings;
    const primaryVenue =
      tournament.venues.find((v) => v.isPrimary) || tournament.venues[0];

    const formatDate = (dateString: string) => {
      if (!dateString) return '';
      try {
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
        if (dateString.includes('T')) {
          const date = new Date(dateString);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: 'UTC',
            });
          }
        }
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
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
        return dateString;
      }
    };

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
            {primaryVenue && primaryVenue.venueName && (
              <div className='mb-2'>
                <strong>
                  <MapPin size={16} className='me-2' /> {primaryVenue.venueName}
                </strong>
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
          </Col>
        </Row>
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
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    const field = formData?.fields?.find((f: FormField) => f.id === fieldId);
    if (field && field.name && field.name !== fieldId) {
      setFormValues((prev) => ({
        ...prev,
        [field.name]: value,
      }));
    }

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

      const fieldValue = formValues[field.id] || formValues[field.name] || '';

      if (field.required) {
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

  const calculateTotalAmount = (): number => {
    return selectedPackages.reduce((total, pkg) => {
      return total + pkg.price * pkg.selectedQuantity;
    }, 0);
  };

  const handlePackageToggle = (pkg: PricingPackage) => {
    const existingIndex = selectedPackages.findIndex(
      (p) => p.name === pkg.name,
    );

    if (existingIndex >= 0) {
      setSelectedPackages((prev) =>
        prev.filter((_, index) => index !== existingIndex),
      );
    } else {
      setSelectedPackages((prev) => [
        ...prev,
        {
          ...pkg,
          selectedQuantity: pkg.quantity || 1,
        },
      ]);
    }
    setPaymentError(null);
  };

  const handleQuantityChange = (packageName: string, newQuantity: number) => {
    if (newQuantity < 1) newQuantity = 1;

    const pkg = selectedPackages.find((p) => p.name === packageName);
    if (pkg && pkg.maxQuantity && newQuantity > pkg.maxQuantity) {
      newQuantity = pkg.maxQuantity;
    }

    setSelectedPackages((prev) =>
      prev.map((pkg) =>
        pkg.name === packageName
          ? { ...pkg, selectedQuantity: newQuantity }
          : pkg,
      ),
    );
    setPaymentError(null);
  };

  const submitFormData = async (): Promise<void> => {
    if (!formData) return;

    setError(null);
    setServerErrors([]);

    const isValid = validateAllFields();
    if (!isValid) {
      setError('Please fill in all required fields correctly.');
      setTimeout(() => {
        const firstError = document.querySelector('.is-invalid');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    if (selectedPackages.length === 0) {
      setError('Please select at least one ticket package.');
      return;
    }

    setIsSubmitting(true);

    try {
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

      formData.fields.forEach((field: FormField) => {
        if (field.type === 'payment') return;
        const fieldValue = formValues[field.id] || formValues[field.name] || '';
        if (field.id) payload[field.id] = fieldValue;
        if (field.name && field.name !== field.id) {
          payload[field.name] = fieldValue;
        }
        const labelKey = field.label.toLowerCase().replace(/\s+/g, '_');
        payload[labelKey] = fieldValue;
      });

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

      payload['selectedPackages'] = selectedPackages.map((pkg) => ({
        name: pkg.name,
        price: pkg.price,
        quantity: pkg.selectedQuantity,
        subtotal: pkg.price * pkg.selectedQuantity,
      }));
      payload['totalAmount'] = calculateTotalAmount();

      const response = await axios.post(
        `${API_BASE_URL}/forms/${formData._id}/submit`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.success) {
        const submissionId =
          response.data.data?.submissionId || response.data.data?._id;

        if (!submissionId) {
          throw new Error('No submission ID received from server');
        }

        setSubmissionId(submissionId);

        const paymentFields = formData.fields.filter(
          (field: FormField) => field.type === 'payment',
        );

        if (paymentFields.length > 0) {
          setStep('payment');
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
      }
    } catch (err: any) {
      console.error('Form submission error:', err);

      if (err.response) {
        const errorMsg =
          err.response.data.error ||
          (err.response.data.errors && err.response.data.errors.join(', ')) ||
          'Form submission failed';
        setError(errorMsg);
        if (err.response.data.errors) {
          setServerErrors(err.response.data.errors);
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
    if (selectedPackages.length === 0) {
      setPaymentError('Please select at least one ticket package');
      return false;
    }
    return true;
  };

  const handleCardTokenized = async (tokenResult: any, verifiedBuyer?: any) => {
    if (tokenResult.status === 'OK') {
      setPaymentToken(tokenResult.token);
      setIsPaymentTokenized(true);
      setPaymentError(null);

      const cardDetails = tokenResult.details?.card || {};

      setTimeout(() => {
        processPayment(tokenResult.token, cardDetails);
      }, 100);
    } else {
      setIsPaymentTokenized(false);
      setPaymentToken(null);
      const errorMsg =
        tokenResult.errors?.[0]?.message || 'Payment tokenization failed';
      setPaymentError(errorMsg);
    }

    return false;
  };

  const processPayment = async (token: string, cardDetailsParam?: any) => {
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

      const totalAmount = calculateTotalAmount();

      if (totalAmount <= 0) {
        throw new Error('Invalid payment amount');
      }

      const finalCardDetails = cardDetailsParam || {
        last_4: '',
        card_brand: '',
        exp_month: '',
        exp_year: '',
      };

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
          selectedPackages: selectedPackages.map((pkg) => ({
            name: pkg.name,
            price: pkg.price,
            quantity: pkg.selectedQuantity,
          })),
          amount: totalAmount,
        },
      );

      if (paymentResponse.data.success) {
        const paymentData = {
          paymentId: paymentResponse.data.paymentId,
          squarePaymentId: paymentResponse.data.squarePaymentId,
          amount: totalAmount / 100,
          currency: paymentField.paymentConfig?.currency || 'USD',
          status: 'completed',
          receiptUrl: paymentResponse.data.receiptUrl,
          cardLast4: finalCardDetails.last_4 || finalCardDetails.last4 || '',
          cardBrand:
            finalCardDetails.card_brand || finalCardDetails.brand || '',
          timestamp: new Date().toISOString(),
          packages: selectedPackages,
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

  const renderPricingPackages = () => {
    const paymentField = getPaymentField();

    if (!paymentField || !paymentField.paymentConfig?.pricingPackages) {
      return null;
    }

    const packages = paymentField.paymentConfig.pricingPackages.filter(
      (pkg: PricingPackage) => pkg.isEnabled !== false,
    );

    return (
      <>
        <h5 className='mb-3'>
          Select Ticket Packages (you can choose multiple)
        </h5>
        <div className='row'>
          {packages.map((pkg: PricingPackage, index: number) => {
            const isSelected = selectedPackages.some(
              (p) => p.name === pkg.name,
            );
            const selectedPackage = selectedPackages.find(
              (p) => p.name === pkg.name,
            );
            const currentQuantity =
              selectedPackage?.selectedQuantity || pkg.quantity || 1;

            return (
              <div key={index} className='col-md-6 mb-3'>
                <div
                  className={`card h-100 ${isSelected ? 'border-primary' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <div className='card-body'>
                    <div className='d-flex justify-content-between align-items-start'>
                      <div>
                        <h5 className='card-title'>{pkg.name}</h5>
                        {pkg.description && (
                          <p className='card-text text-muted small'>
                            {pkg.description}
                          </p>
                        )}
                      </div>
                      <input
                        type='checkbox'
                        className='form-check-input fs-5'
                        checked={isSelected}
                        onChange={() => handlePackageToggle(pkg)}
                        style={{
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                        }}
                      />
                    </div>

                    <h3 className='mt-2 mb-3'>
                      ${(pkg.price / 100).toFixed(2)}
                    </h3>

                    {isSelected && (
                      <div className='mt-3 pt-2 border-top'>
                        <label className='form-label small fw-bold'>
                          Quantity
                        </label>
                        <div className='d-flex align-items-center'>
                          <button
                            type='button'
                            className='btn btn-outline-secondary btn-sm'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuantityChange(
                                pkg.name,
                                currentQuantity - 1,
                              );
                            }}
                            disabled={currentQuantity <= 1}
                            style={{ width: '36px' }}
                          >
                            -
                          </button>
                          <span
                            className='mx-3 text-center fw-bold'
                            style={{ minWidth: '40px' }}
                          >
                            {currentQuantity}
                          </span>
                          <button
                            type='button'
                            className='btn btn-outline-secondary btn-sm'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuantityChange(
                                pkg.name,
                                currentQuantity + 1,
                              );
                            }}
                            disabled={
                              pkg.maxQuantity
                                ? currentQuantity >= pkg.maxQuantity
                                : false
                            }
                            style={{ width: '36px' }}
                          >
                            +
                          </button>
                          {pkg.maxQuantity && (
                            <span className='ms-2 small text-muted'>
                              Max: {pkg.maxQuantity}
                            </span>
                          )}
                        </div>
                        <div className='mt-2 text-primary fw-bold'>
                          Subtotal: $
                          {((pkg.price * currentQuantity) / 100).toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* {selectedPackages.length > 0 && (
          <div className='alert alert-info mt-3'>
            <strong>Order Summary:</strong>
            <ul className='mb-0 mt-2'>
              {selectedPackages.map((pkg) => (
                <li key={pkg.name}>
                  {pkg.name}: {pkg.selectedQuantity} × $
                  {(pkg.price / 100).toFixed(2)} = $
                  {((pkg.price * pkg.selectedQuantity) / 100).toFixed(2)}
                </li>
              ))}
            </ul>
            <hr className='my-2' />
            <strong>Total: ${(calculateTotalAmount() / 100).toFixed(2)}</strong>
          </div>
        )} */}
      </>
    );
  };

  const renderFieldInput = (field: FormField) => {
    const fieldId = field.id;
    const value = formValues[fieldId] || '';
    const error = fieldErrors[fieldId];
    const isInvalid = !!error;

    const commonProps = {
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
            <input
              type={field.type}
              className={`form-control ${isInvalid ? 'is-invalid' : ''}`}
              {...commonProps}
            />
            {error && <div className='invalid-feedback'>{error}</div>}
          </>
        );
      case 'textarea':
        return (
          <>
            <textarea
              className={`form-control ${isInvalid ? 'is-invalid' : ''}`}
              rows={4}
              {...commonProps}
            />
            {error && <div className='invalid-feedback'>{error}</div>}
          </>
        );
      case 'select':
        return (
          <>
            <select
              className={`form-select ${isInvalid ? 'is-invalid' : ''}`}
              {...commonProps}
            >
              <option value=''>
                {field.placeholder || 'Select an option'}
              </option>
              {(field.options || []).map((option, idx) => (
                <option key={idx} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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

    const totalAmount = calculateTotalAmount();
    const amountInDollars = (totalAmount / 100).toFixed(2);

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

        <div className='card mb-4 payment-summary-card'>
          <div className='card-body'>
            <h6>Payment Summary</h6>
            {selectedPackages.map((pkg) => (
              <div
                key={pkg.name}
                className='d-flex justify-content-between mb-2'
              >
                <span>
                  {pkg.name} x{pkg.selectedQuantity}:
                </span>
                <span>
                  ${((pkg.price * pkg.selectedQuantity) / 100).toFixed(2)}
                </span>
              </div>
            ))}
            <div className='d-flex justify-content-between border-top pt-2 mt-2'>
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
      <div className='reg-hub-embedded'>
        <div className='reg-form-card glass-card'>
          <div className='text-center py-4'>
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading form...</span>
            </div>
            <p className='mt-2'>Loading form...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!formData && !loading) return null;

  if (submitSuccess && step === 'form') {
    return (
      <div className='reg-hub-embedded'>
        <div className='reg-form-card glass-card'>
          <div className='alert alert-success'>
            <i className='ti ti-check-circle me-2'></i>
            <strong>Form Submitted Successfully!</strong>
            <p className='mt-2 mb-0'>
              {formData?.settings?.successMessage ||
                'Thank you for your submission.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (submitSuccess && step === 'payment') {
    const eventTitle = formData?.title || 'the event';
    return (
      <div className='reg-hub-embedded'>
        <div className='reg-form-card glass-card'>
          <div className='alert alert-success'>
            <i className='ti ti-info-circle me-2'></i>
            <strong>Thank you for your purchase!</strong>
            <p className='mt-2 mb-0'>
              Your ticket(s) for <strong>{eventTitle}</strong> have been
              successfully processed.
            </p>
            <p className='mt-2 mb-0'>
              A confirmation email has been sent to <strong>{userEmail}</strong>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='reg-hub-embedded'>
      <div className='reg-form-card glass-card'>
        <div className={`form-embed-wrapper ${wrapperClassName}`}>
          <div className='form-container'>
            <h3>{formData?.title || 'Form'}</h3>
            {formData?.description && (
              <p className='text-muted'>{formData.description}</p>
            )}

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

                {formData?.fields
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
                      <span className='spinner-border spinner-border-sm me-2'></span>
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
      </div>
    </div>
  );
};

export default FormEmbed;
