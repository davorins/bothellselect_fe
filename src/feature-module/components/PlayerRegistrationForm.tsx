import React, {
  useState,
  useEffect,
  FormEvent,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import axios from 'axios';
import {
  CreditCard,
  PaymentForm as SquarePaymentForm,
  PaymentFormProps as SquarePaymentFormProps,
} from 'react-square-web-payments-sdk';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getNextSeason } from '../../utils/season';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Square configuration
const SQUARE_APP_ID =
  process.env.REACT_APP_SQUARE_APP_ID || 'sq0idp-jUCxKnO_i8i7vccQjVj_0g';
const SQUARE_LOCATION_ID =
  process.env.REACT_APP_SQUARE_LOCATION_ID || 'L26Q50FWRCQW5';

interface Player {
  _id?: string;
  fullName: string;
  gender: string;
  dob: string;
  schoolName: string;
  grade: string;
  healthConcerns?: string;
  aauNumber?: string;
  parentId?: string;
  season?: string;
  registrationYear?: number;
  registrationComplete?: boolean;
  paymentComplete?: boolean;
}

interface PlayerRegistrationFormProps {
  playerId?: string;
  showPayment?: boolean;
}

interface PaymentFormMethods {
  tokenize: () => Promise<{
    token: string;
    details?: {
      card: {
        last_4: string;
        card_brand: string;
        exp_month: string;
        exp_year: string;
      };
    };
  }>;
}

const PaymentForm = forwardRef<PaymentFormMethods, SquarePaymentFormProps>(
  (props, ref) => {
    const paymentFormRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      tokenize: async () => {
        if (!paymentFormRef.current) {
          throw new Error('Payment form not initialized');
        }
        const result = await paymentFormRef.current.tokenize();
        if (result.status === 'OK') {
          return {
            token: result.token,
            details: result.details,
          };
        }
        throw new Error(result.errors?.[0]?.message || 'Tokenization failed');
      },
    }));

    return (
      <SquarePaymentForm {...props} ref={paymentFormRef}>
        {props.children}
      </SquarePaymentForm>
    );
  }
);

PaymentForm.displayName = 'PaymentForm';

const PlayerRegistrationForm: React.FC<PlayerRegistrationFormProps> = ({
  playerId,
  showPayment = false,
}) => {
  const { parent, players, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [customerEmail, setCustomerEmail] = useState(parent?.email || '');
  const [player, setPlayer] = useState<Player>({
    fullName: '',
    gender: '',
    dob: '',
    schoolName: '',
    grade: '',
    healthConcerns: '',
    aauNumber: '',
    season: getNextSeason(),
    registrationYear: new Date().getFullYear(),
  });

  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [needsPayment, setNeedsPayment] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState('1');
  const [nextSeason] = useState(getNextSeason());
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCardTokenized = async (tokenResult: any) => {
    try {
      setPaymentError('');
      setIsProcessing(true);

      // Validate email
      if (!customerEmail || !/^\S+@\S+\.\S+$/.test(customerEmail)) {
        setPaymentError('Please enter a valid email for your receipt');
        return;
      }

      if (tokenResult.status !== 'OK' || !tokenResult.token) {
        throw new Error('Payment processing failed');
      }

      const parentId = localStorage.getItem('parentId');
      if (!parentId) {
        throw new Error('Please complete registration before payment');
      }

      const tokenCard = tokenResult.details?.card;

      const paymentData = {
        sourceId: tokenResult.token,
        amount: calculateTotalAmount(),
        playerIds: [player._id],
        parentId: parentId,
        buyerEmailAddress: customerEmail,
        cardDetails: {
          last_4: tokenCard?.last4 || '****',
          card_brand: tokenCard?.brand || 'UNKNOWN',
          exp_month: String(tokenCard?.expMonth || '00').padStart(2, '0'),
          exp_year: String(tokenCard?.expYear || '0000'),
        },
        locationId: SQUARE_LOCATION_ID,
        packageType: selectedPackage,
      };

      // Process payment
      const paymentResponse = await axios.post(
        `${API_BASE_URL}/payment/square-payment`,
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!paymentResponse.data.success) {
        throw new Error(paymentResponse.data.error || 'Payment failed');
      }

      // Update player payment status
      const updateResponse = await axios.post(
        `${API_BASE_URL}/payments/update-players`,
        {
          parentId: parentId,
          paymentId: paymentResponse.data.paymentId,
          playerIds: [player._id],
          amount: calculateTotalAmount(),
          paymentMethod: 'credit_card',
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!updateResponse.data.success) {
        throw new Error(
          updateResponse.data.error || 'Failed to update payment status'
        );
      }

      // Update local state to trigger step 3
      setPlayer((prev) => ({
        ...prev,
        paymentComplete: true,
        _id: prev._id || player._id,
      }));
      setNeedsPayment(false);
      setCurrentStep(3); // Explicitly set to step 3
    } catch (error) {
      console.error('Payment processing error:', error);
      setPaymentError(
        error instanceof Error ? error.message : 'Payment processing failed'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Check authentication status
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (parent?.email) {
      setCustomerEmail(parent.email);
    }
  }, [parent?.email]);

  // Check payment status when players load
  useEffect(() => {
    if (player?._id) {
      setCurrentStep(2);

      // Check both local state and player prop for payment status
      const paymentRequired = !player.paymentComplete;
      setNeedsPayment(paymentRequired);

      // If we have a player ID, consider them registered
      setIsRegistered(true);
    }
  }, [player]);

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!playerId) return;

      setIsLoading(true);
      try {
        // 1. Check local players first
        const localPlayer = players.find((p) => p._id === playerId);
        if (localPlayer) {
          setPlayer({
            ...localPlayer,
            paymentComplete: localPlayer.paymentComplete ?? false,
          });
          setNeedsPayment(!(localPlayer.paymentComplete ?? false));
          return;
        }

        // 2. Fall back to API call
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');

        const response = await axios.get<Player>(
          `${API_BASE_URL}/players/${playerId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const existingPlayer = response.data;
        if (existingPlayer) {
          setPlayer(existingPlayer); // Use the complete player object as-is
          setNeedsPayment(!existingPlayer.paymentComplete); // Sync needsPayment

          // Debug log to verify API response
          console.log('Fetched player data:', existingPlayer);
        }
      } catch (error) {
        console.error('Error fetching player:', error);
        setError('Failed to load player data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerId, players]);

  // Additional effect to log state changes for debugging
  useEffect(() => {
    console.log('Current player state:', {
      ...player,
      needsPayment,
    });
  }, [player, needsPayment]);

  useEffect(() => {
    // This handles both cases:
    // 1. New registration flow (player._id exists)
    // 2. Existing unpaid registration (showPayment prop)
    if (player?._id || showPayment) {
      setCurrentStep(2);

      // Payment is required if:
      // - Player exists and payment isn't complete OR
      // - showPayment prop is true
      const paymentRequired = showPayment || !player?.paymentComplete;
      setNeedsPayment(paymentRequired);

      setIsRegistered(true);
    }
  }, [player, showPayment]);

  const formatDate = (dateString: string): string => {
    if (!dateString || typeof dateString !== 'string') {
      return '';
    }

    // Handle both MM/DD/YYYY and YYYY-MM-DD formats
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length !== 3) return '';
      const [month, day, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return dateString; // Assume it's already in YYYY-MM-DD format
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (
      !player.fullName ||
      !player.gender ||
      !player.dob ||
      !player.schoolName ||
      !player.grade
    ) {
      setError('Please fill out all required fields for the player.');
      return;
    }

    const formattedPlayer = {
      ...player,
      dob: formatDate(player.dob),
      parentId: localStorage.getItem('parentId'),
      season: getNextSeason(),
      registrationYear: new Date().getFullYear(),
    };

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const response = await axios.post<Player>(
        `${API_BASE_URL}/players/register`,
        formattedPlayer,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // The registration will be automatically created by the post-save hook
      setPlayer(response.data);
      setCurrentStep(2);
      setNeedsPayment(!response.data.paymentComplete);
    } catch (error) {
      console.error('Error registering player:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'An error occurred. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setPlayer((prev) => ({ ...prev, [name]: value }));
  };

  if (!isAuthenticated) {
    return (
      <div className='content content-two'>
        <div className='alert alert-warning'>
          <h4>Session Expired</h4>
          <p>Please log in to access player registration.</p>
        </div>
      </div>
    );
  }

  const calculateTotalAmount = () => {
    const perPlayerAmount = selectedPackage === '1' ? 57500 : 78500;

    return perPlayerAmount * players.length;
  };

  if (player.paymentComplete) {
    return (
      <div className='content content-two'>
        <div className='card-header text-center'>
          <h3>Thank you for your payment!</h3>
          <p className='lead'>Payment successful for {player.fullName}</p>
          <div className='confirmation-details mt-4'>
            <p>
              <strong>Email for receipt:</strong> {customerEmail}
            </p>
            <p>
              <strong>Package:</strong>{' '}
              {selectedPackage === '1'
                ? '3 Times/Week'
                : selectedPackage === '2'
                ? '4 Times/Week'
                : '5 Times/Week'}
            </p>
            <p>
              <strong>Amount paid:</strong> $
              {(calculateTotalAmount() / 100).toFixed(2)}
            </p>
          </div>
          <button
            className='btn btn-primary mt-4'
            onClick={() => {
              window.location.reload();
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (
    (isRegistered || showPayment) &&
    needsPayment &&
    player.season === nextSeason
  ) {
    if (needsPayment) {
      return (
        <div className='content content-two'>
          <div className='payment-notice'>
            <div className='alert alert-success mb-4'>
              <h4>
                Registration Confirmed for {nextSeason}{' '}
                {player.registrationYear}!
              </h4>
              <p>
                Your kid is successfully registered for the {player.season}{' '}
                {player.registrationYear} season, but payment is required to
                complete the process.
              </p>
            </div>

            <div className='row card payment-card'>
              <div className='card-header bg-light'>
                <div className='d-flex align-items-center'>
                  <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                    <i className='ti ti-credit-card fs-16' />
                  </span>
                  <h4 className='text-dark'>Payment Required</h4>
                </div>
              </div>
              <div className='card-body'>
                {paymentError && (
                  <div className='alert alert-danger'>{paymentError}</div>
                )}
                <div className='row mb-3'>
                  <div className='col-12 mb-4'>
                    <h5>
                      Select Package ({players.length} player
                      {players.length !== 1 ? 's' : ''}):
                    </h5>
                    <p className='text-muted'>
                      Total: ${(calculateTotalAmount() / 100).toFixed(2)} (
                      {players.length} × $
                      {selectedPackage === '1' ? '575' : '785'})
                    </p>
                  </div>
                  <div className='col-md-4'>
                    <div className='form-check form-check-lg mb-3'>
                      <input
                        type='radio'
                        id='threeTimes'
                        name='package'
                        value='1'
                        className='form-check-input'
                        checked={selectedPackage === '1'}
                        onChange={(e) => setSelectedPackage(e.target.value)}
                      />
                      <label className='form-check-label' htmlFor='threeTimes'>
                        3 Times/Week - ${575 * players.length}.00
                      </label>
                    </div>
                  </div>
                  <div className='col-md-4'>
                    <div className='form-check form-check-lg mb-3'>
                      <input
                        type='radio'
                        id='fourTimes'
                        name='package'
                        value='2'
                        className='form-check-input'
                        checked={selectedPackage === '2'}
                        onChange={(e) => setSelectedPackage(e.target.value)}
                      />
                      <label className='form-check-label' htmlFor='fourTimes'>
                        4 Times/Week - ${785 * players.length}.00
                      </label>
                    </div>
                  </div>
                </div>
                {players?.length > 0 && (
                  <div className='registered-players mb-4'>
                    <h6 className='mb-2'>Registered Players:</h6>
                    <ul className='list-group'>
                      {players.map((p) => (
                        <li key={p._id} className='list-group-item'>
                          {p.fullName} - {p.grade}th Grade
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className='payment-options'>
                  <div className='card'>
                    <div className='card-body'>
                      <h5>Credit/Debit Card</h5>
                      <div className='mb-3'>
                        <label className='form-label'>Email for Receipt</label>
                        <input
                          type='email'
                          className='form-control'
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          required
                        />
                        {!customerEmail && (
                          <div className='text-danger small'>
                            Email is required for your receipt
                          </div>
                        )}
                      </div>
                      {!player.paymentComplete && !isProcessing && (
                        <PaymentForm
                          applicationId={SQUARE_APP_ID}
                          locationId={SQUARE_LOCATION_ID}
                          cardTokenizeResponseReceived={handleCardTokenized}
                          createPaymentRequest={() => ({
                            countryCode: 'US',
                            currencyCode: 'USD',
                            total: {
                              amount: (calculateTotalAmount() / 100).toString(),
                              label: 'Total',
                            },
                            buyerEmailAddress: customerEmail,
                          })}
                        >
                          <CreditCard />
                        </PaymentForm>
                      )}
                      {isProcessing && <LoadingSpinner />}
                    </div>
                  </div>
                </div>
                <div className='card'>
                  <div className='card-body'>
                    <h5>Other Payment Methods</h5>
                    <p className='text-muted'>
                      Contact us to arrange alternative payment:
                    </p>
                    <ul className='payment-contacts'>
                      <li>
                        <i className='ti ti-phone'></i> (425) 375-5235
                      </li>
                      <li>
                        <i className='ti ti-mail'></i>{' '}
                        basketballselect@proton.me
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className='payment-reminder mb-4'>
                <div className='alert alert-warning'>
                  <p>
                    <strong>Important:</strong> Your child's spot will be
                    reserved for 48 hours pending payment. Unpaid registrations
                    may be cancelled after this period.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className='content content-two'>
      {currentStep === 3 ? (
        <div className='card-header text-center'>
          <h3>Thank you for registering!</h3>
          <p className='lead'>
            Registration and payment successful for {player.fullName}
          </p>
          <div className='confirmation-details mt-4'>
            <p>
              <strong>Email for receipt:</strong> {customerEmail}
            </p>
            <p>
              <strong>Package:</strong>{' '}
              {selectedPackage === '1' ? '3 Times/Week' : '4 Times/Week'}
            </p>
            <p>
              <strong>Price per player:</strong> $
              {selectedPackage === '1' ? '575' : '785'}
            </p>
            <p>
              <strong>Number of players:</strong> {players?.length || 0}
            </p>
            <p>
              <strong>Total amount:</strong> $
              {(selectedPackage === '1' ? 575 : 785) * (players?.length || 0)}
            </p>
          </div>
          <button
            className='btn btn-primary mt-4'
            onClick={() => {
              window.location.href = '/dashboard';
            }}
          >
            Return to Dashboard
          </button>
          <p className='mt-3'>
            We can't wait to welcome your young athlete to an unforgettable
            summer of basketball, growth, and fun!
          </p>
        </div>
      ) : (
        <>
          {parent && (
            <div className='mb-3'>
              <h4 className='mb-2'>Welcome, {parent.fullName}!</h4>
              {players.length > 0 && (
                <p>
                  <b>Registered Players:</b>{' '}
                  {players.map((p) => p.fullName).join(', ')}
                </p>
              )}
            </div>
          )}

          {error && <div className='alert alert-danger'>{error}</div>}
          {players.length < 2 ? (
            <>
              {/* Progress Bar */}
              <div className='progress mb-4' style={{ height: '10px' }}>
                <div
                  className='progress-bar bg-success'
                  role='progressbar'
                  style={{ width: `${(currentStep / 2) * 100}%` }}
                  aria-valuenow={currentStep}
                  aria-valuemin={1}
                  aria-valuemax={2}
                ></div>
              </div>

              {/* Step Indicators */}
              <div className='d-flex justify-content-between mb-4'>
                <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
                  <span className='step-title'>Registration</span>
                </div>
                <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
                  <span className='step-title'>Payment</span>
                </div>
              </div>

              {currentStep === 1 && (
                <>
                  <p>
                    We're thrilled to have your child join us this season!
                    Seeing siblings grow, learn, and create unforgettable
                    memories together is one of the most rewarding parts of what
                    we do. That's why we're excited to invite you to register
                    your second child for the camp! Please fill out the
                    registration form below.
                  </p>
                  <form onSubmit={handleSubmit}>
                    <div className='card'>
                      <div className='card-header bg-light'>
                        <div className='d-flex align-items-center'>
                          <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                            <i className='ti ti-shirt-sport fs-16' />
                          </span>
                          <h4 className='text-dark'>New Player Registration</h4>
                        </div>
                      </div>
                      <div className='card-body pb-1'>
                        <div className='row'>
                          <div className='col-md-6'>
                            <div className='mb-3'>
                              <label className='form-label'>Full Name</label>
                              <input
                                type='text'
                                name='fullName'
                                className='form-control'
                                value={player.fullName}
                                onChange={handleChange}
                                required
                                placeholder="Enter player's full name"
                              />
                            </div>
                          </div>
                          <div className='col-md-6'>
                            <div className='mb-3'>
                              <label className='form-label'>Gender</label>
                              <select
                                name='gender'
                                className='form-control'
                                value={player.gender}
                                onChange={handleChange}
                                required
                              >
                                <option value=''>Select Gender</option>
                                <option value='Male'>Male</option>
                                <option value='Female'>Female</option>
                              </select>
                            </div>
                          </div>
                          <div className='col-md-6'>
                            <div className='mb-3'>
                              <label className='form-label'>
                                Date of Birth
                              </label>
                              <input
                                type='text'
                                name='dob'
                                className='form-control'
                                value={player.dob}
                                onChange={handleChange}
                                placeholder='MM/DD/YYYY'
                                required
                              />
                            </div>
                          </div>
                          <div className='col-md-6'>
                            <div className='mb-3'>
                              <label className='form-label'>School Name</label>
                              <input
                                type='text'
                                name='schoolName'
                                className='form-control'
                                value={player.schoolName}
                                onChange={handleChange}
                                required
                                placeholder='Enter school name'
                              />
                            </div>
                          </div>
                          <div className='col-md-6'>
                            <div className='mb-3'>
                              <label className='form-label'>Grade</label>
                              <select
                                name='grade'
                                className='form-control'
                                value={player.grade}
                                onChange={handleChange}
                                required
                              >
                                <option value=''>Select Grade</option>
                                {[...Array(12)].map((_, index) => (
                                  <option
                                    key={index + 1}
                                    value={`${index + 1}`}
                                  >
                                    {index + 1}
                                    {index === 0
                                      ? 'st'
                                      : index === 1
                                      ? 'nd'
                                      : index === 2
                                      ? 'rd'
                                      : 'th'}{' '}
                                    Grade
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className='col-md-6'>
                            <div className='mb-3'>
                              <label className='form-label'>
                                Health Concerns
                              </label>
                              <input
                                type='text'
                                name='healthConcerns'
                                className='form-control'
                                value={player.healthConcerns}
                                onChange={handleChange}
                                placeholder='None (if none)'
                              />
                            </div>
                          </div>
                          <div className='col-md-6'>
                            <div className='mb-3'>
                              <label className='form-label'>AAU Number</label>
                              <input
                                type='text'
                                name='aauNumber'
                                className='form-control'
                                value={player.aauNumber}
                                onChange={handleChange}
                                placeholder='Optional'
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className='text-end mt-3'>
                      <button
                        type='submit'
                        className='btn btn-primary w-100'
                        disabled={isLoading}
                      >
                        {isLoading ? 'Processing...' : 'Register New Player'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {currentStep === 2 && (
                <div className='payment-section mt-4'>
                  <div className='alert alert-success mb-4'>
                    <h4>Registration Complete!</h4>
                    <p className='mb-0'>
                      Please complete your payment below to finalize
                      registration.
                    </p>
                  </div>

                  <div className='card'>
                    <div className='card-header bg-light'>
                      <h5>Payment Information</h5>
                    </div>
                    <div className='card-body'>
                      <div className='mb-3'>
                        <label className='form-label'>Email for Receipt</label>
                        <input
                          type='email'
                          className='form-control'
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          required
                        />
                        {!customerEmail && (
                          <div className='text-danger small'>
                            Email is required for your receipt
                          </div>
                        )}
                      </div>
                      {isProcessing ? (
                        <LoadingSpinner />
                      ) : (
                        <PaymentForm
                          applicationId={SQUARE_APP_ID}
                          locationId={SQUARE_LOCATION_ID}
                          cardTokenizeResponseReceived={handleCardTokenized}
                          createPaymentRequest={() => ({
                            countryCode: 'US',
                            currencyCode: 'USD',
                            total: {
                              amount: (calculateTotalAmount() / 100).toString(),
                              label: 'Total',
                            },
                            buyerEmailAddress: customerEmail,
                          })}
                        >
                          <CreditCard />
                        </PaymentForm>
                      )}
                      {paymentError && (
                        <div className='alert alert-danger mt-3'>
                          {paymentError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <></>
          )}
        </>
      )}
    </div>
  );
};

export default PlayerRegistrationForm;
