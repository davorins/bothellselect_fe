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

// Set API base URL - use environment variable if available, otherwise default to local development
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Square configuration
const SQUARE_APP_ID = 'sq0idp-jUCxKnO_i8i7vccQjVj_0g';
const SQUARE_LOCATION_ID = 'L26Q50FWRCQW5';

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
  const handleCardTokenized = async (tokenResult: any) => {
    try {
      setPaymentError('');

      if (tokenResult.status !== 'OK' || !tokenResult.token) {
        throw new Error('Payment processing failed');
      }

      const parentId = localStorage.getItem('parentId');
      if (!parentId) {
        throw new Error('Please complete registration before payment');
      }

      const paymentData = {
        sourceId: tokenResult.token,
        amount: 10000, // $100 in cents
        playerId: playerId,
        parentId: parentId,
        buyerEmailAddress: customerEmail,
        cardDetails: tokenResult.details?.card || {
          last_4: '****',
          card_brand: 'UNKNOWN',
          exp_month: '00',
          exp_year: '00',
        },
        locationId: SQUARE_LOCATION_ID,
      };

      // Step 1: Process payment through Square
      const response = await fetch(`${API_BASE_URL}/payment/square-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment failed');
      }

      // Step 2: Update player and parent payment status
      const updateResponse = await fetch(
        `${API_BASE_URL}/payments/update-players`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ parentId }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error('Failed to update player payment status');
      }

      setPlayer((prev) => ({ ...prev, paymentComplete: true }));
      setNeedsPayment(false);
      setCurrentStep(3);
    } catch (error) {
      console.error('Payment processing error:', error);
      setPaymentError(
        error instanceof Error ? error.message : 'Payment processing failed'
      );
    }
  };

  // Check authentication status
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

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

  const handlePayment = async (tokenResult: any) => {
    setPaymentError('');

    try {
      if (tokenResult.status !== 'OK') {
        throw new Error('Payment processing failed');
      }

      const paymentData = {
        sourceId: tokenResult.token,
        amount: 10000, // $100 in cents
        playerId: playerId,
        parentId: localStorage.getItem('parentId'),
        cardDetails: tokenResult.details?.card || {
          last_4: '****',
          card_brand: 'UNKNOWN',
          exp_month: '00',
          exp_year: '00',
        },
        locationId: SQUARE_LOCATION_ID,
      };

      const response = await axios.post(
        `${API_BASE_URL}/payment/square-payment`,
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        setPlayer((prev) => ({ ...prev, paymentComplete: true }));
        setNeedsPayment(false);
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setPaymentError(
        error instanceof Error ? error.message : 'Payment processing failed'
      );
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
    const perPlayerAmount =
      selectedPackage === '1' ? 550 : selectedPackage === '2' ? 760 : 970;

    return perPlayerAmount * players.length; // Calculate based on number of players
  };

  const getPackagePrice = (pkg: string): number => {
    switch (pkg) {
      case '1':
        return 550;
      case '2':
        return 760;
      case '3':
        return 970;
      default:
        return 0;
    }
  };

  const totalAmount = (
    getPackagePrice(selectedPackage) * players.length
  ).toFixed(2);

  if (isRegistered) {
    if (needsPayment) {
      return (
        <div className='content content-two'>
          <div className='payment-notice'>
            <div className='alert alert-success mb-4'>
              <h4>Registration Confirmed!</h4>
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
                      Total: ${calculateTotalAmount()} ({players.length} × $
                      {selectedPackage === '1'
                        ? '550'
                        : selectedPackage === '2'
                        ? '760'
                        : '970'}
                      )
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
                        3 Times/Week - ${550 * players.length}.00
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
                        4 Times/Week - ${760 * players.length}.00
                      </label>
                    </div>
                  </div>
                  <div className='col-md-4'>
                    <div className='form-check form-check-lg mb-3'>
                      <input
                        type='radio'
                        id='fiveTimes'
                        name='package'
                        value='3'
                        className='form-check-input'
                        checked={selectedPackage === '3'}
                        onChange={(e) => setSelectedPackage(e.target.value)}
                      />
                      <label className='form-check-label' htmlFor='fiveTimes'>
                        5 Times/Week - ${970 * players.length}.00
                      </label>
                    </div>
                  </div>
                </div>
                <div className='registered-players mb-4'>
                  <h6>Registered Player:</h6>
                  <ul className='list-group'>
                    <li className='list-group-item'>
                      {player.fullName} - {player.grade}th Grade
                    </li>
                  </ul>
                </div>
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
                      </div>
                      <PaymentForm
                        applicationId={SQUARE_APP_ID}
                        locationId={SQUARE_LOCATION_ID}
                        cardTokenizeResponseReceived={handlePayment}
                        createPaymentRequest={() => ({
                          countryCode: 'US',
                          currencyCode: 'USD',
                          total: {
                            amount: totalAmount,
                            label: 'Total',
                          },
                          buyerEmailAddress: customerEmail,
                        })}
                      >
                        <CreditCard />
                      </PaymentForm>
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
        <div className='text-center'>
          <h3>Thank you for registering!</h3>
          <p>
            We can’t wait to welcome your young athlete to an unforgettable
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
              {/* Progress Bar - Added Here */}
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

              {/* Step Indicators - Added Here */}
              <div className='d-flex justify-content-between mb-4'>
                <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
                  <span className='step-number'>1</span>
                  <span className='step-title'>Registration</span>
                </div>
                <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
                  <span className='step-number'>2</span>
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
                      <PaymentForm
                        applicationId={SQUARE_APP_ID}
                        locationId={SQUARE_LOCATION_ID}
                        cardTokenizeResponseReceived={handleCardTokenized}
                        createPaymentRequest={() => ({
                          countryCode: 'US',
                          currencyCode: 'USD',
                          total: {
                            amount: '100.00',
                            label: 'Total',
                          },
                        })}
                      >
                        <CreditCard />
                      </PaymentForm>
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
