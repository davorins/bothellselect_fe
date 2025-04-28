import React, {
  useState,
  ChangeEvent,
  FormEvent,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  PaymentForm as SquarePaymentForm,
  PaymentFormProps as SquarePaymentFormProps,
} from 'react-square-web-payments-sdk';
import {
  validateEmail,
  validateRequired,
  validateName,
  validateDateOfBirth,
  validateState,
  validateZipCode,
  validateGrade,
  validatePhoneNumber,
} from '../../utils/validation';
import { getNextSeason } from '../../utils/season';
import { useAuth } from '../../context/AuthContext';
import HomeModals from '../pages/homeModals';

// Square configuration
const appId = 'sq0idp-jUCxKnO_i8i7vccQjVj_0g';
const locationId = 'L26Q50FWRCQW5';

// TypeScript interfaces
interface Player {
  _id?: string;
  fullName: string;
  gender: string;
  dob: string;
  schoolName: string;
  healthConcerns: string;
  aauNumber: string;
  registrationYear: number;
  season: string;
  grade: string;
}

interface Address {
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
}

interface Guardian {
  fullName: string;
  relationship: string;
  phone: string;
  email: string;
  address: Address;
  isCoach: boolean;
  aauNumber: string;
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

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  relationship: string;
  phone: string;
  address: Address;
  isCoach: boolean;
  aauNumber: string;
  players: Player[];
  agreeToTerms: boolean;
  additionalGuardians: Guardian[];
  payment: {
    amount: number;
    amountInCents: number;
    playerCount: number;
    perPlayerAmount: number;
    selectedPackage: string;
    token?: string;
    breakdown: {
      basePrice: number;
      discount?: number;
      fees?: number;
      subtotal: number;
      tax?: number;
      total: number;
    };
  };
}

interface RegistrationFormProps {
  isExistingUser?: boolean;
  onSuccess?: () => void;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const parseAddress = (fullAddress: string): Address => {
  const patternWithUnit =
    /^(\d+\s[\w\s.]+?)\s*(?:,?\s*(apt|apartment|suite|ste|unit|building|bldg|floor|fl|room|rm|department|dept|lot|#)\.?\s*([\w\s-]+?)\s*)?,\s*([^,]+?)\s*,\s*([a-zA-Z]{2,})\s*(\d{5}(?:-\d{4})?)$/i;
  const matchWithUnit = fullAddress.match(patternWithUnit);

  if (matchWithUnit) {
    return {
      street: matchWithUnit[1].trim(),
      street2:
        matchWithUnit[2] && matchWithUnit[3]
          ? `${matchWithUnit[2].trim()} ${matchWithUnit[3].trim()}`.replace(
              /\s+/g,
              ' '
            )
          : '',
      city: matchWithUnit[4].trim(),
      state: normalizeState(matchWithUnit[5].trim()),
      zip: matchWithUnit[6].trim(),
    };
  }

  const fallbackPattern =
    /^([^,]+?)\s*,\s*([^,]+?)\s*,\s*([a-zA-Z]{2,})\s*(\d{5}(?:-\d{4})?)$/i;
  const fallbackMatch = fullAddress.match(fallbackPattern);

  if (fallbackMatch) {
    return {
      street: fallbackMatch[1].trim(),
      street2: '',
      city: fallbackMatch[2].trim(),
      state: normalizeState(fallbackMatch[3].trim()),
      zip: fallbackMatch[4].trim(),
    };
  }

  return {
    street: fullAddress,
    street2: '',
    city: '',
    state: '',
    zip: '',
  };
};

const normalizeState = (stateInput: string): string => {
  const stateMap: Record<string, string> = {
    alabama: 'AL',
    alaska: 'AK',
    arizona: 'AZ',
    arkansas: 'AR',
    california: 'CA',
    colorado: 'CO',
    connecticut: 'CT',
    delaware: 'DE',
    florida: 'FL',
    georgia: 'GA',
    hawaii: 'HI',
    idaho: 'ID',
    illinois: 'IL',
    indiana: 'IN',
    iowa: 'IA',
    kansas: 'KS',
    kentucky: 'KY',
    louisiana: 'LA',
    maine: 'ME',
    maryland: 'MD',
    massachusetts: 'MA',
    michigan: 'MI',
    minnesota: 'MN',
    mississippi: 'MS',
    missouri: 'MO',
    montana: 'MT',
    nebraska: 'NE',
    nevada: 'NV',
    'new hampshire': 'NH',
    'new jersey': 'NJ',
    'new mexico': 'NM',
    'new york': 'NY',
    'north carolina': 'NC',
    'north dakota': 'ND',
    ohio: 'OH',
    oklahoma: 'OK',
    oregon: 'OR',
    pennsylvania: 'PA',
    'rhode island': 'RI',
    'south carolina': 'SC',
    'south dakota': 'SD',
    tennessee: 'TN',
    texas: 'TX',
    utah: 'UT',
    vermont: 'VT',
    virginia: 'VA',
    washington: 'WA',
    'west virginia': 'WV',
    wisconsin: 'WI',
    wyoming: 'WY',
  };

  const normalizedInput = stateInput.toLowerCase().trim();
  if (/^[A-Z]{2}$/.test(stateInput)) return stateInput;
  if (/^[a-zA-Z]{2}$/.test(stateInput)) return stateInput.toUpperCase();
  return stateMap[normalizedInput] || stateInput;
};

const validateAddress = (address: Address): boolean => {
  return !!address.street && !!address.city && !!address.state && !!address.zip;
};

const formatPhoneNumber = (value: string): string => {
  const cleaned = ('' + value).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  return match
    ? !match[2]
      ? match[1]
      : `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`
    : value;
};

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

const RegistrationForm: React.FC<RegistrationFormProps> = ({
  isExistingUser = false,
}) => {
  const { parent: currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [additionalGuardian, setAdditionalGuardian] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessingRegistration, setIsProcessingRegistration] =
    useState(false);
  const [selectedPackage, setSelectedPackage] = useState('1');

  type PasswordField = 'password' | 'confirmPassword';

  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
    confirmPassword: false,
  });

  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  const [formData, setFormData] = useState<FormData>({
    email: currentUser?.email || '',
    password: '',
    confirmPassword: '',
    fullName: currentUser?.fullName || '',
    relationship: currentUser?.relationship || '',
    phone: currentUser?.phone || '',
    address:
      typeof currentUser?.address === 'string'
        ? parseAddress(currentUser.address)
        : currentUser?.address || {
            street: '',
            street2: '',
            city: '',
            state: '',
            zip: '',
          },
    isCoach: currentUser?.isCoach || false,
    aauNumber: currentUser?.aauNumber || '',
    players: [
      {
        fullName: '',
        gender: '',
        dob: '',
        schoolName: '',
        healthConcerns: '',
        aauNumber: '',
        registrationYear: new Date().getFullYear(),
        season: getNextSeason(),
        grade: '',
      },
    ],
    agreeToTerms: false,
    additionalGuardians: [],
    payment: {
      amount: 0,
      amountInCents: 0,
      playerCount: 1,
      perPlayerAmount: 100,
      selectedPackage: '1',
      breakdown: {
        basePrice: 0,
        subtotal: 0,
        total: 0,
      },
    },
  });

  useEffect(() => {
    if (isExistingUser && currentUser) {
      setFormData((prev) => ({
        ...prev,
        email: currentUser.email || '',
        fullName: currentUser.fullName || '',
        relationship: currentUser.relationship || '',
        phone: currentUser.phone || '',
        address:
          typeof currentUser.address === 'string'
            ? parseAddress(currentUser.address)
            : currentUser.address || {
                street: '',
                street2: '',
                city: '',
                state: '',
                zip: '',
              },
        isCoach: currentUser.isCoach || false,
        aauNumber: currentUser.aauNumber || '',
      }));
    }
  }, [isExistingUser, currentUser]);

  const calculateTotalAmount = () => {
    const basePrice =
      formData.payment.selectedPackage === '1'
        ? 550
        : formData.payment.selectedPackage === '2'
        ? 760
        : 970;

    return basePrice * formData.players.length;
  };

  const calculatePayments = (playerCount: number, packageType: string) => {
    const perPlayerAmount =
      packageType === '1' ? 550 : packageType === '2' ? 760 : 970;

    const basePrice = perPlayerAmount * playerCount;

    return {
      amount: basePrice,
      amountInCents: basePrice * 100,
      playerCount,
      perPlayerAmount,
      selectedPackage: packageType,
      breakdown: {
        basePrice,
        subtotal: basePrice,
        total: basePrice,
      },
    };
  };

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      payment: calculatePayments(
        prev.players.length,
        prev.payment.selectedPackage
      ),
    }));
  }, [formData.players.length, formData.payment.selectedPackage]);

  const [additionalGuardianData, setAdditionalGuardianData] =
    useState<Guardian>({
      fullName: '',
      relationship: '',
      phone: '',
      email: '',
      address: { street: '', street2: '', city: '', state: '', zip: '' },
      isCoach: false,
      aauNumber: '',
    });

  const addPlayer = () => {
    setFormData({
      ...formData,
      players: [
        ...formData.players,
        {
          fullName: '',
          gender: '',
          dob: '',
          schoolName: '',
          healthConcerns: '',
          aauNumber: '',
          registrationYear: new Date().getFullYear(),
          season: getNextSeason(),
          grade: '',
        },
      ],
    });
  };

  const removePlayer = (index: number) => {
    const updatedPlayers = [...formData.players];
    updatedPlayers.splice(index, 1);
    setFormData({ ...formData, players: updatedPlayers });
  };

  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'email' && !validateEmail(value)) {
      alert('Please enter a valid email address.');
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (name === 'email') {
      setFormData({ ...formData, [name]: value.toLowerCase() });
    } else if (name === 'phone') {
      setFormData({ ...formData, [name]: formatPhoneNumber(value) });
    } else if (name === 'address') {
      const parsed = parseAddress(value);
      setFormData({ ...formData, address: parsed });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  const handleAdditionalGuardianChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (name === 'email') {
      setAdditionalGuardianData({
        ...additionalGuardianData,
        [name]: value.toLowerCase(),
      });
    } else if (name === 'phone') {
      setAdditionalGuardianData({
        ...additionalGuardianData,
        [name]: formatPhoneNumber(value),
      });
    } else if (name === 'address') {
      const parsed = parseAddress(value);
      setAdditionalGuardianData({ ...additionalGuardianData, address: parsed });
    } else {
      setAdditionalGuardianData({
        ...additionalGuardianData,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  const handlePlayerChange = (
    index: number,
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const updatedPlayers = [...formData.players];
    updatedPlayers[index] = { ...updatedPlayers[index], [name]: value };
    setFormData({ ...formData, players: updatedPlayers });
  };

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const handleRegistrationSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessingRegistration(true);
    setPaymentError(null);

    // Clear previous errors
    setValidationErrors({});

    const errors: Record<string, string> = {};

    // Check email availability
    if (!isExistingUser) {
      try {
        const emailCheckResponse = await fetch(`${API_BASE_URL}/check-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: formData.email }),
        });

        if (!emailCheckResponse.ok) {
          const errorData = await emailCheckResponse.json();
          errors.email = errorData.message; // Set the error message from the server
        }
      } catch (error) {
        console.error('Email check error:', error);
        errors.email = 'Failed to check email availability';
      }
    }

    // Validate form fields...
    if (!isExistingUser) {
      if (!validateEmail(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }

      if (
        !validateRequired(formData.password) ||
        formData.password.length < 6
      ) {
        errors.password = 'Password must be at least 6 characters long';
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    if (!validateName(formData.fullName)) {
      errors.fullName = 'Please enter a valid full name (minimum 2 characters)';
    }

    if (!validateRequired(formData.relationship)) {
      errors.relationship = 'Relationship to player is required';
    }

    if (!validatePhoneNumber(formData.phone)) {
      errors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!validateRequired(formData.address.street)) {
      errors.address = 'Street address is required';
    }

    if (!validateRequired(formData.address.city)) {
      errors.address = 'City is required';
    }

    if (!validateState(formData.address.state)) {
      errors.addressState = 'Please enter a valid 2-letter state code';
    }

    if (!validateZipCode(formData.address.zip)) {
      errors.addressZip = 'Please enter a valid ZIP code';
    }

    formData.players.forEach((player, index) => {
      const playerPrefix = `player${index}`;

      if (!validateName(player.fullName)) {
        errors[`${playerPrefix}FullName`] = 'Please enter a valid full name';
      }

      if (!validateRequired(player.gender)) {
        errors[`${playerPrefix}Gender`] = 'Gender is required';
      }

      if (!validateDateOfBirth(player.dob)) {
        errors[`${playerPrefix}Dob`] = 'Please enter a valid date of birth';
      }

      if (!validateRequired(player.schoolName)) {
        errors[`${playerPrefix}School`] = 'School name is required';
      }

      if (!validateGrade(player.grade)) {
        errors[`${playerPrefix}Grade`] = 'Please select a valid grade (1-12)';
      }
    });

    if (!isExistingUser && !formData.agreeToTerms) {
      errors.agreeToTerms = 'You must agree to the terms and conditions';
    }

    // If there are errors, display them and stop submission
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsProcessingRegistration(false);
      return;
    }

    // Check password confirmation directly from formData
    if (!isExistingUser) {
      if (formData.password !== formData.confirmPassword) {
        setPaymentError('Passwords do not match');
        setIsProcessingRegistration(false);
        return;
      }
    }

    try {
      if (isExistingUser) {
        // Existing user flow
        const registeredPlayers: Player[] = [];
        for (const player of formData.players) {
          const response = await fetch(`${API_BASE_URL}/players/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              ...player,
              parentId: currentUser?._id,
              registrationYear: new Date().getFullYear(),
              season: getNextSeason(),
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Player registration failed');
          }

          const playerData = await response.json();
          registeredPlayers.push(playerData.player);
        }

        setFormData((prev) => ({
          ...prev,
          players: registeredPlayers,
        }));

        // Proceed to payment for existing user
        setCurrentStep(2);
      } else {
        // New user flow
        const response = await fetch(
          `${API_BASE_URL}/register/basketball-camp`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...formData,
              payment: null,
              parentInfo: {
                fullName: formData.fullName,
                password: formData.password,
                phone: formData.phone,
                address: formData.address,
                relationship: formData.relationship,
                isCoach: formData.isCoach,
                aauNumber: formData.aauNumber,
                agreeToTerms: formData.agreeToTerms,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Registration failed');
        }

        const registrationData = await response.json();

        // Store authentication tokens for new user
        if (registrationData.token && registrationData.parent?.id) {
          localStorage.setItem('token', registrationData.token);
          localStorage.setItem('parentId', registrationData.parent.id);
          localStorage.setItem('userEmail', formData.email);

          // Update formData with the registered players from response
          if (registrationData.players) {
            setFormData((prev) => ({
              ...prev,
              players: registrationData.players,
            }));
          }

          // Proceed to payment for new user
          setCurrentStep(2);
        } else {
          throw new Error('Parent registration data missing from response');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setPaymentError(
        error instanceof Error ? error.message : 'Registration failed'
      );
    } finally {
      setIsProcessingRegistration(false);
    }
  };

  const renderRegistrationStep = () => (
    <form onSubmit={handleRegistrationSubmit}>
      {!isExistingUser && (
        <>
          <div className='card'>
            <div className='card-header bg-light'>
              <div className='d-flex align-items-center'>
                <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                  <i className='ti ti-user-shield fs-16' />
                </span>
                <h4 className='text-dark'>Parent/Guardian Information</h4>
              </div>
            </div>
            <div className='card-body pb-1'>
              <div className='row'>
                <div className='col-md-12'>
                  <div className='mb-3'>
                    <label className='form-label'>Email</label>
                    <input
                      type='email'
                      name='email'
                      className={`form-control ${
                        validationErrors.email ? 'is-invalid' : ''
                      }`}
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                    {validationErrors.email && (
                      <div className='invalid-feedback'>
                        {validationErrors.email}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className='row'>
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>Password</label>
                    <div className='pass-group'>
                      <input
                        type={passwordVisibility.password ? 'text' : 'password'}
                        name='password'
                        className='form-control'
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength={6}
                      />
                      <span
                        className={`ti toggle-passwords ${
                          passwordVisibility.password ? 'ti-eye' : 'ti-eye-off'
                        }`}
                        onClick={() => togglePasswordVisibility('password')}
                      ></span>
                    </div>
                    {formData.password && formData.password.length < 6 && (
                      <div className='text-danger small'>
                        Password must be at least 6 characters
                      </div>
                    )}
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>Confirm Password</label>
                    <div className='pass-group'>
                      <input
                        type={
                          passwordVisibility.confirmPassword
                            ? 'text'
                            : 'password'
                        }
                        name='confirmPassword'
                        className='form-control'
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                      />
                      <span
                        className={`ti toggle-password ${
                          passwordVisibility.confirmPassword
                            ? 'ti-eye'
                            : 'ti-eye-off'
                        }`}
                        onClick={() =>
                          togglePasswordVisibility('confirmPassword')
                        }
                      />
                    </div>
                    {formData.confirmPassword &&
                      formData.password !== formData.confirmPassword && (
                        <div className='text-danger small'>
                          Passwords do not match
                        </div>
                      )}
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>Full Name</label>
                    <input
                      type='text'
                      name='fullName'
                      className='form-control'
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>Relationship to Player</label>
                    <input
                      type='text'
                      name='relationship'
                      className='form-control'
                      value={formData.relationship}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>Phone Number</label>
                    <input
                      type='text'
                      name='phone'
                      className='form-control'
                      value={formData.phone}
                      onChange={handleChange}
                      maxLength={14}
                      required
                    />
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>Address</label>
                    <input
                      type='text'
                      name='address'
                      className='form-control'
                      value={`${formData.address.street}${
                        formData.address.street2
                          ? ', ' + formData.address.street2
                          : ''
                      }${
                        formData.address.city
                          ? ', ' + formData.address.city
                          : ''
                      }${
                        formData.address.state
                          ? ', ' + formData.address.state
                          : ''
                      }${
                        formData.address.zip ? ' ' + formData.address.zip : ''
                      }`}
                      onChange={handleChange}
                      onBlur={(e) => {
                        const parsed = parseAddress(e.target.value);
                        setFormData({ ...formData, address: parsed });
                      }}
                      required
                    />
                    {formData.address.street && (
                      <div className='mt-2 small text-muted'>
                        {formData.address.city ? (
                          <>
                            <div className='text-success'>
                              ✓ Valid address format
                            </div>
                            <div>Street: {formData.address.street}</div>
                            {formData.address.street2 && (
                              <div>Unit: {formData.address.street2}</div>
                            )}
                            <div>City: {formData.address.city}</div>
                            <div>State: {formData.address.state}</div>
                            <div>ZIP: {formData.address.zip}</div>
                          </>
                        ) : (
                          <div className='text-warning'>
                            Couldn't parse full address. Please use format:
                            Street, City, State ZIP
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>
                      <input
                        type='checkbox'
                        name='isCoach'
                        checked={formData.isCoach}
                        onChange={handleChange}
                      />{' '}
                      Are you a coach?
                    </label>
                  </div>
                </div>
                {formData.isCoach && (
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>AAU Number</label>
                      <input
                        type='text'
                        name='aauNumber'
                        className='form-control'
                        value={formData.aauNumber}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                )}
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>
                      <input
                        type='checkbox'
                        checked={additionalGuardian}
                        onChange={(e) =>
                          setAdditionalGuardian(e.target.checked)
                        }
                      />{' '}
                      Add Additional Guardian
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {additionalGuardian && (
            <div className='card'>
              <div className='card-header bg-light'>
                <div className='d-flex align-items-center'>
                  <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                    <i className='ti ti-user-shield fs-16' />
                  </span>
                  <h4 className='text-dark'>Additional Guardian Information</h4>
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
                        value={additionalGuardianData.fullName}
                        onChange={handleAdditionalGuardianChange}
                        required
                      />
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>
                        Relationship to Player
                      </label>
                      <input
                        type='text'
                        name='relationship'
                        className='form-control'
                        value={additionalGuardianData.relationship}
                        onChange={handleAdditionalGuardianChange}
                        required
                      />
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>Phone Number</label>
                      <input
                        type='text'
                        name='phone'
                        className='form-control'
                        value={additionalGuardianData.phone}
                        onChange={handleAdditionalGuardianChange}
                        maxLength={14}
                        required
                      />
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>Email</label>
                      <input
                        type='email'
                        name='email'
                        className='form-control'
                        value={additionalGuardianData.email}
                        onChange={handleAdditionalGuardianChange}
                        onBlur={handleBlur}
                        required
                      />
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>
                        <input
                          type='checkbox'
                          checked={
                            JSON.stringify(additionalGuardianData.address) ===
                            JSON.stringify(formData.address)
                          }
                          onChange={(e) => {
                            const isSameAsParent = e.target.checked;
                            setAdditionalGuardianData({
                              ...additionalGuardianData,
                              address: isSameAsParent
                                ? { ...formData.address }
                                : {
                                    street: '',
                                    street2: '',
                                    city: '',
                                    state: '',
                                    zip: '',
                                  },
                            });
                          }}
                        />{' '}
                        Same as Parent Address
                      </label>
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>Address</label>
                      <input
                        type='text'
                        name='address'
                        className='form-control'
                        value={`${additionalGuardianData.address.street}${
                          additionalGuardianData.address.street2
                            ? ', ' + additionalGuardianData.address.street2
                            : ''
                        }${
                          additionalGuardianData.address.city
                            ? ', ' + additionalGuardianData.address.city
                            : ''
                        }${
                          additionalGuardianData.address.state
                            ? ', ' + additionalGuardianData.address.state
                            : ''
                        }${
                          additionalGuardianData.address.zip
                            ? ' ' + additionalGuardianData.address.zip
                            : ''
                        }`}
                        onChange={handleAdditionalGuardianChange}
                        onBlur={(e) => {
                          const parsed = parseAddress(e.target.value);
                          setAdditionalGuardianData({
                            ...additionalGuardianData,
                            address: parsed,
                          });
                        }}
                        disabled={
                          JSON.stringify(additionalGuardianData.address) ===
                          JSON.stringify(formData.address)
                        }
                        required
                      />
                      {additionalGuardianData.address.street &&
                        JSON.stringify(additionalGuardianData.address) !==
                          JSON.stringify(formData.address) && (
                          <div className='mt-2 small'>
                            {validateAddress(additionalGuardianData.address) ? (
                              <>
                                <div className='text-success'>
                                  ✓ Valid address format
                                </div>
                                <div>
                                  Street:{' '}
                                  {additionalGuardianData.address.street}
                                </div>
                                {additionalGuardianData.address.street2 && (
                                  <div>
                                    Unit:{' '}
                                    {additionalGuardianData.address.street2}
                                  </div>
                                )}
                                <div>
                                  City:{' '}
                                  {additionalGuardianData.address.city || (
                                    <span className='text-danger'>Missing</span>
                                  )}
                                </div>
                                <div>
                                  State:{' '}
                                  {additionalGuardianData.address.state || (
                                    <span className='text-danger'>Missing</span>
                                  )}
                                </div>
                                <div>
                                  ZIP:{' '}
                                  {additionalGuardianData.address.zip || (
                                    <span className='text-danger'>Missing</span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className='text-danger'>
                                ⚠ Incomplete address. Please use format: Street,
                                City, State ZIP
                                <div className='mt-1'>
                                  Example: 123 Main St, Seattle, WA 98101
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>
                        <input
                          type='checkbox'
                          name='isCoach'
                          checked={additionalGuardianData.isCoach}
                          onChange={handleAdditionalGuardianChange}
                        />{' '}
                        Is this guardian a coach?
                      </label>
                    </div>
                  </div>
                  {additionalGuardianData.isCoach && (
                    <div className='col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>
                          AAU Number (if coach)
                        </label>
                        <input
                          type='text'
                          name='aauNumber'
                          className='form-control'
                          value={additionalGuardianData.aauNumber}
                          onChange={handleAdditionalGuardianChange}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className='card'>
        <div className='card-header bg-light'>
          <div className='d-flex align-items-center'>
            <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
              <i className='ti ti-shirt-sport fs-16' />
            </span>
            <h4 className='text-dark'>Player Information</h4>
          </div>
        </div>
        <div className='card-body pb-1 mb-4'>
          {formData.players.map((player, index) => (
            <div key={index} className='row mb-4'>
              <div className='col-md-6'>
                <div className='mb-3'>
                  <label className='form-label'>Full Name</label>
                  <input
                    type='text'
                    name='fullName'
                    className='form-control'
                    value={player.fullName}
                    onChange={(e) => handlePlayerChange(index, e)}
                    required
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
                    onChange={(e) => handlePlayerChange(index, e)}
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
                  <label className='form-label'>Date of Birth</label>
                  <input
                    type='text'
                    name='dob'
                    className='form-control'
                    value={player.dob}
                    onChange={(e) => handlePlayerChange(index, e)}
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
                    onChange={(e) => handlePlayerChange(index, e)}
                    required
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
                    onChange={(e) => handlePlayerChange(index, e)}
                    required
                  >
                    <option value=''>Select Grade</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={`${i + 1}`}>
                        {i + 1}
                        {i === 0
                          ? 'st'
                          : i === 1
                          ? 'nd'
                          : i === 2
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
                  <label className='form-label'>Health Concerns</label>
                  <input
                    type='text'
                    name='healthConcerns'
                    className='form-control'
                    value={player.healthConcerns}
                    onChange={(e) => handlePlayerChange(index, e)}
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
                    onChange={(e) => handlePlayerChange(index, e)}
                  />
                </div>
              </div>
              {formData.players.length > 1 && (
                <div className='col-md-12'>
                  <button
                    type='button'
                    className='btn btn-danger'
                    onClick={() => removePlayer(index)}
                  >
                    Remove Player
                  </button>
                </div>
              )}
            </div>
          ))}
          <button
            type='button'
            className='btn btn-secondary'
            onClick={addPlayer}
          >
            Register Additional Player
          </button>
        </div>
      </div>

      {!isExistingUser && (
        <div className='card'>
          <div className='card-header bg-light'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-file-text fs-16' />
              </span>
              <h4 className='text-dark'>Terms and Conditions</h4>
            </div>
          </div>
          <div className='card-body pb-1'>
            <div className='row'>
              <div className='col-md-12'>
                <div className='mb-3'>
                  <label className='form-label'>
                    <input
                      type='checkbox'
                      name='agreeToTerms'
                      checked={formData.agreeToTerms}
                      onChange={handleChange}
                      required
                    />{' '}
                    By checking this box, you agree to the terms and conditions
                    outlined in the{' '}
                    <Link
                      to='#'
                      data-bs-toggle='modal'
                      data-bs-target='#waiver'
                    >
                      Waiver
                    </Link>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {paymentError && (
        <div className='alert alert-danger mb-3'>
          <h5>Please fix the following errors:</h5>
          <ul className='mb-0'>
            {paymentError.split('\n').map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className='card'>
        <div className='row d-flex align-items-center'>
          <button
            type='submit'
            className='btn btn-primary'
            disabled={isProcessingRegistration}
          >
            {isProcessingRegistration
              ? 'Registering...'
              : isExistingUser
              ? 'Register Players'
              : 'Complete Registration'}
          </button>
        </div>
      </div>
    </form>
  );

  const renderPaymentStep = () => {
    const handleCardTokenized = async (tokenResult: any) => {
      try {
        setPaymentError(null);

        // Validate payment token
        if (tokenResult.status !== 'OK' || !tokenResult.token) {
          throw new Error('Payment processing failed');
        }

        // Get parent ID (from current user or registration)
        const parentId = localStorage.getItem('parentId') || currentUser?._id;
        if (!parentId) {
          throw new Error('Please complete registration before payment');
        }

        // Calculate amount
        const amountPerPlayer =
          selectedPackage === '1'
            ? 55000
            : selectedPackage === '2'
            ? 76000
            : 97000;

        const totalAmount = amountPerPlayer * formData.players.length;

        // Prepare payment data
        const paymentData = {
          sourceId: tokenResult.token,
          amount: totalAmount,
          parentId: parentId,
          playerCount: formData.players.length,
          cardDetails: tokenResult.details?.card || {
            last_4: '****',
            card_brand: 'UNKNOWN',
            exp_month: '00',
            exp_year: '00',
          },
          locationId: locationId,
        };

        // Step 1: Process payment through Square
        const paymentResponse = await fetch(
          `${API_BASE_URL}/payment/square-payment`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(paymentData),
          }
        );

        if (!paymentResponse.ok) {
          const errorData = await paymentResponse.json();
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

        setIsSubmitted(true);
      } catch (error) {
        console.error('Payment processing error:', error);
        setPaymentError(
          error instanceof Error ? error.message : 'Payment processing failed'
        );
      }
    };

    return (
      <>
        <div className='alert alert-success mb-4'>
          <h4>Registration Complete!</h4>
          <p className='mb-0'>
            Please complete your payment below to finalize registration.
          </p>
        </div>

        <div className='card'>
          <div className='card-header bg-light'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-credit-card fs-16' />
              </span>
              <h4 className='text-dark'>Payment Information</h4>
            </div>
          </div>
          <div className='card-body'>
            {paymentError && (
              <div className='alert alert-danger mb-3'>
                <h5>Payment Error:</h5>
                <p className='mb-0'>{paymentError}</p>
              </div>
            )}

            <div className='row mb-4'>
              <div className='col-12 mb-4'>
                <h5>
                  Select Package ({formData.players.length} player
                  {formData.players.length !== 1 ? 's' : ''}):
                </h5>
                <p className='text-muted'>
                  Total: ${calculateTotalAmount()} ({formData.players.length} ×
                  $
                  {selectedPackage === '1'
                    ? '550'
                    : selectedPackage === '2'
                    ? '760'
                    : '970'}
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
                    3 Times/Week - ${550 * formData.players.length}.00
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
                    4 Times/Week - ${760 * formData.players.length}.00
                  </label>
                </div>
              </div>
              <div className='col-md-4'>
                <div className='form-check form-check-lg mb-3'>
                  <input
                    type='radio'
                    id='fourTimes'
                    name='package'
                    value='3'
                    className='form-check-input'
                    checked={selectedPackage === '3'}
                    onChange={(e) => setSelectedPackage(e.target.value)}
                  />
                  <label className='form-check-label' htmlFor='fourTimes'>
                    5 Times/Week - ${970 * formData.players.length}.00
                  </label>
                </div>
              </div>
            </div>

            <div className='payment-form-container'>
              <PaymentForm
                applicationId={appId}
                locationId={locationId}
                cardTokenizeResponseReceived={handleCardTokenized}
                createPaymentRequest={() => ({
                  countryCode: 'US',
                  currencyCode: 'USD',
                  total: {
                    amount: String(
                      selectedPackage === '1'
                        ? '550.00'
                        : selectedPackage === '2'
                        ? '760.00'
                        : '970.00'
                    ),

                    label: 'Total',
                  },
                })}
              >
                <CreditCard />
              </PaymentForm>
              <HomeModals />
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className='content content-two'>
      {isSubmitted ? (
        <div className='card-header text-center'>
          <h3>Thank you for registering!</h3>
          <p className='lead'>
            Registration successful for {formData.players?.length || 0} player
            {formData.players?.length !== 1 ? 's' : ''}
          </p>
          <div className='confirmation-details mt-4'>
            <p>
              <strong>Package:</strong>{' '}
              {selectedPackage === '1'
                ? '3 Times/Week'
                : selectedPackage === '2'
                ? '4 Times/Week'
                : '5 Times/Week'}
            </p>
            <p>
              <strong>Price per player:</strong> $
              {selectedPackage === '1'
                ? '550'
                : selectedPackage === '2'
                ? '760'
                : '970'}
            </p>
            <p>
              <strong>Number of players:</strong>{' '}
              {formData.players?.length || 0}
            </p>
            <p>
              <strong>Total amount:</strong> $
              {(selectedPackage === '1'
                ? 550
                : selectedPackage === '2'
                ? 760
                : 970) * (formData.players?.length || 0)}
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
      ) : (
        <>
          <h3 className='mb-3'>🏀 Ready to Ball This Summer?</h3>
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

          {currentStep === 1 && renderRegistrationStep()}
          {currentStep === 2 && renderPaymentStep()}
        </>
      )}
    </div>
  );
};

export default RegistrationForm;
