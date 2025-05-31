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
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { isoToMMDDYYYY, formatDateInput } from '../../utils/dateFormatter';

// Square configuration
const appId = 'sq0idp-jUCxKnO_i8i7vccQjVj_0g';
const locationId = 'L26Q50FWRCQW5';

interface SeasonRegistration {
  season: string;
  year: number;
  registrationDate?: Date;
  paymentComplete?: boolean;
  paymentStatus?: string;
  packageType?: string;
  amountPaid?: number;
}

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
  paymentComplete?: boolean;
  seasons?: SeasonRegistration[];
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
  existingPlayers?: Player[];
  skipToPayment?: boolean;
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
            details: {
              card: {
                last_4: result.details?.card?.last4,
                card_brand: result.details?.card?.brand,
                exp_month: result.details?.card?.expMonth,
                exp_year: result.details?.card?.expYear,
              },
            },
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [existingPlayers, setExistingPlayers] = useState<Player[]>([]);
  const [isExistingRegistration, setIsExistingRegistration] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const [customerEmail, setCustomerEmail] = useState(
    currentUser?.email || formData.email || ''
  );

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

  const calculateTotalAmount = (packageType: string = selectedPackage) => {
    const basePrice =
      packageType === '1' ? 625 : packageType === '2' ? 835 : 1045;

    return basePrice * formData.players.length;
  };

  const calculatePayments = (playerCount: number, packageType: string) => {
    const perPlayerAmount =
      packageType === '1' ? 625 : packageType === '2' ? 835 : 1045;

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
    if (currentUser?.email) {
      setCustomerEmail(currentUser.email);
    } else if (formData?.email) {
      setCustomerEmail(formData.email);
    }
  }, [currentUser?.email, formData?.email]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      payment: calculatePayments(
        prev.players.length,
        prev.payment.selectedPackage
      ),
    }));
  }, [formData.players.length, formData.payment.selectedPackage]);

  useEffect(() => {
    const fetchExistingPlayers = async () => {
      if (currentUser?._id) {
        try {
          setIsLoading(true);
          const response = await fetch(
            `${API_BASE_URL}/players/by-parent/${currentUser._id}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            }
          );

          if (response.ok) {
            const players: Player[] = await response.json();
            setExistingPlayers(players);

            const currentYear = new Date().getFullYear();
            const nextSeason = getNextSeason();

            // Check if any players are already registered for this season
            const registeredPlayers = players.filter((p) =>
              p.seasons?.some(
                (s) => s.season === nextSeason && s.year === currentYear
              )
            );

            if (registeredPlayers.length > 0) {
              setIsExistingRegistration(true);
              // Skip straight to payment step with existing players
              setFormData((prev) => ({
                ...prev,
                players: registeredPlayers.map((p) => ({
                  _id: p._id,
                  fullName: p.fullName,
                  gender: p.gender,
                  dob: p.dob,
                  schoolName: p.schoolName,
                  grade: p.grade,
                  healthConcerns: p.healthConcerns || '',
                  aauNumber: p.aauNumber || '',
                  registrationYear: currentYear,
                  season: nextSeason,
                  seasons: p.seasons,
                })),
              }));
              setCurrentStep(2); // Jump to payment step
            } else if (players.length > 0) {
              // Players exist but not registered for this season
              setFormData((prev) => ({
                ...prev,
                players: players.map((p) => ({
                  _id: p._id,
                  fullName: p.fullName,
                  gender: p.gender,
                  dob: p.dob,
                  schoolName: p.schoolName,
                  grade: p.grade,
                  healthConcerns: p.healthConcerns || '',
                  aauNumber: p.aauNumber || '',
                  registrationYear: currentYear,
                  season: nextSeason,
                  seasons: p.seasons,
                })),
              }));
            }
          }
        } catch (error) {
          console.error('Error fetching existing players:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    if (isExistingUser) {
      fetchExistingPlayers();
    } else {
      setIsLoading(false);
    }
  }, [currentUser?._id, isExistingUser]);

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
    setValidationErrors({});

    try {
      // Validate form fields
      const errors: Record<string, string> = {};

      // Check email availability (only for new users)
      if (!isExistingUser) {
        try {
          const emailCheckResponse = await fetch(
            `${API_BASE_URL}/check-email`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: formData.email }),
            }
          );

          if (!emailCheckResponse.ok) {
            const errorData = await emailCheckResponse.json();
            errors.email = errorData.message;
          }
        } catch (error) {
          console.error('Email check error:', error);
          errors.email = 'Failed to check email availability';
        }
      }

      // Validate form fields
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
        errors.fullName =
          'Please enter a valid full name (minimum 2 characters)';
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

      // Validate players
      formData.players.forEach((player, index) => {
        const playerPrefix = `player${index}`;

        // Only validate player info for new players
        if (!player._id) {
          if (!validateName(player.fullName)) {
            errors[`${playerPrefix}FullName`] =
              'Please enter a valid full name';
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
            errors[`${playerPrefix}Grade`] =
              'Please select a valid grade (1-12)';
          }
        }
      });

      // Validate additional guardian if exists
      if (additionalGuardian) {
        if (!validateName(additionalGuardianData.fullName)) {
          errors.additionalGuardianFullName =
            'Please enter a valid full name for additional guardian';
        }

        if (!validateRequired(additionalGuardianData.relationship)) {
          errors.additionalGuardianRelationship =
            'Relationship to player is required for additional guardian';
        }

        if (!validatePhoneNumber(additionalGuardianData.phone)) {
          errors.additionalGuardianPhone =
            'Please enter a valid phone number for additional guardian';
        }

        if (!validateEmail(additionalGuardianData.email)) {
          errors.additionalGuardianEmail =
            'Please enter a valid email for additional guardian';
        }

        if (
          JSON.stringify(additionalGuardianData.address) !==
          JSON.stringify(formData.address)
        ) {
          if (!validateRequired(additionalGuardianData.address.street)) {
            errors.additionalGuardianAddress =
              'Street address is required for additional guardian';
          }

          if (!validateRequired(additionalGuardianData.address.city)) {
            errors.additionalGuardianAddress =
              'City is required for additional guardian';
          }

          if (!validateState(additionalGuardianData.address.state)) {
            errors.additionalGuardianAddressState =
              'Please enter a valid 2-letter state code for additional guardian';
          }

          if (!validateZipCode(additionalGuardianData.address.zip)) {
            errors.additionalGuardianAddressZip =
              'Please enter a valid ZIP code for additional guardian';
          }
        }
      }

      if (!isExistingUser && !formData.agreeToTerms) {
        errors.agreeToTerms = 'You must agree to the terms and conditions';
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setIsProcessingRegistration(false);
        return;
      }

      const currentYear = new Date().getFullYear();
      const nextSeason = getNextSeason();

      if (isExistingUser) {
        // Existing user flow - check if players are already registered for this season
        const alreadyRegistered = existingPlayers.some((p) =>
          p.seasons?.some(
            (s) => s.season === nextSeason && s.year === currentYear
          )
        );

        if (alreadyRegistered) {
          throw new Error(
            'One or more players are already registered for this season'
          );
        }

        // For existing players, just update their seasons
        const registeredPlayers: Player[] = [];
        for (const player of formData.players) {
          // If player has _id, it's an existing player - just update seasons
          if (player._id) {
            const response = await fetch(
              `${API_BASE_URL}/players/${player._id}/season`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                  season: nextSeason,
                  year: currentYear,
                  paymentStatus: 'pending',
                }),
              }
            );

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(
                errorData.message || 'Failed to update player season'
              );
            }

            const updatedPlayer = await response.json();
            registeredPlayers.push(updatedPlayer);
          } else {
            // New player added to existing account - full registration
            const response = await fetch(`${API_BASE_URL}/players/register`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify({
                ...player,
                parentId: currentUser?._id,
                seasons: [
                  {
                    season: nextSeason,
                    year: currentYear,
                    paymentStatus: 'pending',
                  },
                ],
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(
                errorData.message || 'Player registration failed'
              );
            }

            const newPlayer = await response.json();
            registeredPlayers.push(newPlayer);
          }
        }

        setFormData((prev) => ({
          ...prev,
          players: registeredPlayers.map((p) => ({
            _id: p._id,
            fullName: p.fullName,
            gender: p.gender,
            dob: p.dob,
            schoolName: p.schoolName,
            grade: p.grade,
            healthConcerns: p.healthConcerns || '',
            aauNumber: p.aauNumber || '',
            registrationYear: currentYear,
            season: nextSeason,
          })),
        }));

        // Proceed to payment
        setCurrentStep(2);
      } else {
        // New user flow - full registration
        const registrationData = {
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          relationship: formData.relationship,
          phone: formData.phone,
          address: formData.address,
          isCoach: formData.isCoach,
          aauNumber: formData.aauNumber,
          players: formData.players.map((player) => ({
            ...player,
            seasons: [
              {
                season: nextSeason,
                year: currentYear,
                paymentStatus: 'pending',
              },
            ],
          })),
          agreeToTerms: formData.agreeToTerms,
          additionalGuardians: additionalGuardian
            ? [
                {
                  fullName: additionalGuardianData.fullName,
                  relationship: additionalGuardianData.relationship,
                  phone: additionalGuardianData.phone,
                  email: additionalGuardianData.email,
                  address: additionalGuardianData.address,
                  isCoach: additionalGuardianData.isCoach,
                  aauNumber: additionalGuardianData.isCoach
                    ? additionalGuardianData.aauNumber
                    : '',
                },
              ]
            : [],
        };

        const response = await fetch(
          `${API_BASE_URL}/register/basketball-camp`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Registration failed');
        }

        const responseData = await response.json();

        // Store authentication tokens for new user
        if (responseData.token && responseData.parent?.id) {
          localStorage.setItem('token', responseData.token);
          localStorage.setItem('parentId', responseData.parent.id);
          localStorage.setItem('userEmail', formData.email);

          // Update formData with the registered players from response
          if (responseData.players) {
            setFormData((prev) => ({
              ...prev,
              players: responseData.players,
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

  const renderRegistrationStep = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }

    if (isExistingRegistration) {
      return (
        <div className='alert alert-info'>
          <h4>Welcome back!</h4>
          <p>
            Your players are already registered for the {getNextSeason()}{' '}
            {new Date().getFullYear()} season. You can proceed to payment.
          </p>
          <button className='btn btn-primary' onClick={() => setCurrentStep(2)}>
            Proceed to Payment
          </button>
        </div>
      );
    }
    return (
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
                          type={
                            passwordVisibility.password ? 'text' : 'password'
                          }
                          name='password'
                          className='form-control'
                          value={formData.password}
                          onChange={handleChange}
                          required
                          minLength={6}
                        />
                        <span
                          className={`ti toggle-passwords ${
                            passwordVisibility.password
                              ? 'ti-eye'
                              : 'ti-eye-off'
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
                      <label className='form-label'>
                        Relationship to Player
                      </label>
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
                              Street, City, State ZIP (123 1st St., Bothell, WA
                              98021)
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
                    <h4 className='text-dark'>
                      Additional Guardian Information
                    </h4>
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
                              {validateAddress(
                                additionalGuardianData.address
                              ) ? (
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
                                      <span className='text-danger'>
                                        Missing
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    State:{' '}
                                    {additionalGuardianData.address.state || (
                                      <span className='text-danger'>
                                        Missing
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    ZIP:{' '}
                                    {additionalGuardianData.address.zip || (
                                      <span className='text-danger'>
                                        Missing
                                      </span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className='text-danger'>
                                  ⚠ Incomplete address. Please use format:
                                  Street, City, State ZIP
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
                      value={isoToMMDDYYYY(player.dob)}
                      onChange={(e) => {
                        // Format the input as the user types
                        const formattedValue = formatDateInput(e.target.value);
                        handlePlayerChange(index, {
                          ...e,
                          target: {
                            ...e.target,
                            value: formattedValue,
                          },
                        });
                      }}
                      onBlur={(e) => {
                        // When field loses focus, validate and ensure proper format
                        if (validateDateOfBirth(e.target.value)) {
                          // Convert MM/DD/YYYY to ISO string for storage
                          const [month, day, year] = e.target.value
                            .split('/')
                            .map(Number);
                          // Create date in local time, then convert to ISO string
                          const date = new Date(year, month - 1, day);
                          handlePlayerChange(index, {
                            ...e,
                            target: {
                              ...e.target,
                              value: date.toISOString(),
                            },
                          });
                        }
                      }}
                      placeholder='MM/DD/YYYY'
                      required
                    />
                    {player.dob &&
                      !validateDateOfBirth(isoToMMDDYYYY(player.dob)) && (
                        <div className='text-danger small'>
                          Please enter a valid date of birth in MM/DD/YYYY
                          format
                        </div>
                      )}
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
                      By checking this box, you agree to the terms and
                      conditions outlined in the{' '}
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
  };

  const renderPaymentStep = () => {
    const handleCardTokenized = async (tokenResult: any) => {
      try {
        setPaymentError(null);
        setIsProcessing(true);

        // Validate email
        if (!customerEmail || !validateEmail(customerEmail)) {
          throw new Error('Please enter a valid email for your receipt');
        }

        // Validate payment token
        if (tokenResult.status !== 'OK' || !tokenResult.token) {
          throw new Error('Payment processing failed');
        }

        const parentId = localStorage.getItem('parentId') || currentUser?._id;
        if (!parentId) {
          throw new Error('Please complete registration before payment');
        }

        const currentYear = new Date().getFullYear();
        const nextSeason = getNextSeason();

        // Get player IDs from form data
        const playerIds = formData.players
          .map((p) => p._id)
          .filter((id) => id !== undefined && id !== null && id !== '');

        if (playerIds.length === 0) {
          throw new Error(
            'No registered players found - please complete registration first'
          );
        }

        // Calculate amount based on selected package
        const amountPerPlayer =
          selectedPackage === '1'
            ? 62500
            : selectedPackage === '2'
            ? 83500
            : 104500; // amounts in cents
        const totalAmount = amountPerPlayer * playerIds.length;

        const tokenCard = tokenResult.details?.card;

        // Prepare payment data with season information
        const paymentData = {
          sourceId: tokenResult.token,
          amount: totalAmount,
          parentId: parentId,
          playerIds: playerIds,
          playerCount: playerIds.length,
          buyerEmailAddress: customerEmail,
          cardDetails: {
            last_4: tokenCard?.last4 || '****',
            card_brand: tokenCard?.brand || 'UNKNOWN',
            exp_month: String(tokenCard?.expMonth || '00').padStart(2, '0'),
            exp_year: String(tokenCard?.expYear || '0000'),
          },
          locationId: locationId,
          packageType: selectedPackage,
          season: nextSeason,
          year: currentYear,
        };

        // Process payment
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

        const paymentResult = await paymentResponse.json();

        // Update season registration with payment details
        const updateResponse = await fetch(
          `${API_BASE_URL}/players/update-seasons`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              playerIds: playerIds,
              season: nextSeason,
              year: currentYear,
              paymentId: paymentResult.paymentId,
              paymentStatus: 'paid',
              packageType: selectedPackage,
              amountPaid: totalAmount / 100, // Convert back to dollars
              paymentMethod: 'credit_card',
              cardLast4: tokenCard?.last4,
              cardBrand: tokenCard?.brand,
            }),
          }
        );

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(
            errorData.error || 'Failed to update season registration'
          );
        }

        // Update local state with payment confirmation
        setFormData((prev) => ({
          ...prev,
          players: prev.players.map((player) => ({
            ...player,
            seasons: player.seasons
              ? [
                  ...player.seasons,
                  {
                    season: nextSeason,
                    year: currentYear,
                    paymentComplete: true,
                    paymentStatus: 'paid',
                    packageType: selectedPackage,
                    amountPaid: totalAmount / 100,
                    registrationDate: new Date(),
                  },
                ]
              : [
                  {
                    season: nextSeason,
                    year: currentYear,
                    paymentComplete: true,
                    paymentStatus: 'paid',
                    packageType: selectedPackage,
                    amountPaid: totalAmount / 100,
                    registrationDate: new Date(),
                  },
                ],
          })),
          paymentComplete: true,
        }));

        setIsSubmitted(true);
        setCurrentStep(3);
      } catch (error) {
        console.error('Payment processing error:', error);
        setPaymentError(
          error instanceof Error ? error.message : 'Payment processing failed'
        );
      } finally {
        setIsProcessing(false);
      }
    };

    return isProcessing ? (
      <LoadingSpinner />
    ) : (
      <>
        <div className='alert alert-success mb-4'>
          <h4>
            {isExistingRegistration
              ? 'Complete Your Payment'
              : 'Registration Complete!'}
          </h4>
          <p className='mb-0'>
            Please complete your payment below to finalize registration for the{' '}
            {getNextSeason()} {new Date().getFullYear()} season.
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
                  Total: ${calculateTotalAmount(selectedPackage)} (
                  {formData.players.length} × $
                  {selectedPackage === '1'
                    ? '625'
                    : selectedPackage === '2'
                    ? '835'
                    : '1045'}
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
                    3 Times/Week - ${625 * formData.players.length}.00
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
                    4 Times/Week - ${835 * formData.players.length}.00
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
                    5 Times/Week - ${1045 * formData.players.length}.00
                  </label>
                </div>
              </div>
            </div>

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

            <div className='payment-form-container'>
              {!isSubmitted ? (
                <PaymentForm
                  applicationId={appId}
                  locationId={locationId}
                  cardTokenizeResponseReceived={handleCardTokenized}
                  createPaymentRequest={() => ({
                    countryCode: 'US',
                    currencyCode: 'USD',
                    total: {
                      amount: String(calculateTotalAmount() / 100), // Convert to dollars for display
                      label: 'Total',
                    },
                    buyerEmailAddress: customerEmail,
                  })}
                >
                  <CreditCard />
                </PaymentForm>
              ) : null}
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
              <strong>Price per player:</strong> $
              {selectedPackage === '1'
                ? '625'
                : selectedPackage === '2'
                ? '835'
                : '1045'}
            </p>
            <p>
              <strong>Number of players:</strong>{' '}
              {formData.players?.length || 0}
            </p>
            <p>
              <strong>Total amount:</strong> $
              {(selectedPackage === '1'
                ? 625
                : selectedPackage === '2'
                ? 835
                : 1045) * (formData.players?.length || 0)}
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
