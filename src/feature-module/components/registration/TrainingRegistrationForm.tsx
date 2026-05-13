import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import UserRegistrationModule from '../registration-modules/UserRegistrationModule';
import PaymentModule from '../registration-modules/PaymentModule';
import AccountCreationModule from '../registration-modules/AccountCreationModule';
import EmailVerificationStep from '../../auth/emailVerification/emailVerificationStep';
import DynamicPlayerRegistrationModule from '../registration-modules/DynamicPlayerRegistrationModule';
import StepIndicator from '../../../components/common/StepIndicator';
import {
  FormData,
  RegistrationFormConfig,
  SeasonEvent,
  Player,
  PricingPackage,
  UserRegistrationData,
  Address,
  SeasonRegistration,
} from '../../../types/registration-types';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import axios from 'axios';
import { all_routes } from '../../router/all_routes';

interface TrainingRegistrationFormProps {
  onSuccess?: (data?: any) => void;
  formConfig?: RegistrationFormConfig;
  seasonEvent?: SeasonEvent;
  isExistingUser?: boolean;
  existingPlayers?: Player[];
  savedUserData?: any;
  savedPlayers?: Player[];
  skipToPlayerStep?: boolean;
  description?: string;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

type RegistrationStep =
  | 'account'
  | 'verifyEmail'
  | 'user'
  | 'playerSelect'
  | 'payment'
  | 'success';

const TrainingRegistrationForm: React.FC<TrainingRegistrationFormProps> = ({
  onSuccess,
  formConfig,
  seasonEvent,
  isExistingUser = false,
  existingPlayers = [],
  savedUserData,
  savedPlayers = [],
  skipToPlayerStep = false,
}) => {
  const navigate = useNavigate();
  const routes = all_routes;
  const currentYear = new Date().getFullYear();

  const {
    isAuthenticated,
    isLoading: authLoading,
    user: currentUser,
    createTempAccount,
    checkAuth,
    players: userPlayers,
  } = useAuth();

  // ─── Derived Data ──────────────────────────────────────────────────────────
  const dynamicSeasonEvent = useMemo(() => {
    const defaults = {
      season: 'Basketball Training',
      year: currentYear,
      eventId: `training-${currentYear}`,
    };

    if (seasonEvent) {
      const isTrainingEvent =
        seasonEvent.eventId?.includes('-camp-') ||
        seasonEvent.eventId?.includes('-training-') ||
        seasonEvent.season?.toLowerCase().includes('camp') ||
        seasonEvent.season?.toLowerCase().includes('training') ||
        seasonEvent.season?.toLowerCase().includes('clinic');

      if (isTrainingEvent && seasonEvent.season && seasonEvent.year) {
        return {
          season: seasonEvent.season,
          year: seasonEvent.year,
          eventId: seasonEvent.eventId || `training-${seasonEvent.year}`,
        };
      }
    }

    if (formConfig) {
      const isTrainingEvent =
        formConfig.season?.toLowerCase().includes('camp') ||
        formConfig.season?.toLowerCase().includes('training') ||
        formConfig.season?.toLowerCase().includes('clinic');

      if (isTrainingEvent && formConfig.season && formConfig.year) {
        return {
          season: formConfig.season,
          year: formConfig.year,
          eventId: formConfig.eventId || `training-${formConfig.year}`,
        };
      }
    }

    if (seasonEvent?.season && seasonEvent?.year) {
      return {
        season: seasonEvent.season,
        year: seasonEvent.year,
        eventId: seasonEvent.eventId || `training-${seasonEvent.year}`,
      };
    }

    if (formConfig?.season && formConfig?.year) {
      return {
        season: formConfig.season,
        year: formConfig.year,
        eventId: formConfig.eventId || `training-${formConfig.year}`,
      };
    }

    return defaults;
  }, [formConfig, seasonEvent, currentYear]);

  const defaultFormConfig = useMemo(
    () => ({
      isActive: true,
      requiresPayment: true,
      requiresQualification: false,
      pricing: {
        basePrice: 75,
        packages: [
          {
            id: '1',
            name: 'Single Session',
            price: 75,
            description: 'One training session',
          },
          {
            id: '2',
            name: '4-Session Pack',
            price: 250,
            description: 'Save $50 with 4 sessions',
          },
          {
            id: '3',
            name: '8-Session Pack',
            price: 450,
            description: 'Save $150 with 8 sessions',
          },
        ],
      },
      season: dynamicSeasonEvent.season,
      year: dynamicSeasonEvent.year,
      ...formConfig,
    }),
    [formConfig, dynamicSeasonEvent],
  );

  // ─── State ──────────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('account');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PricingPackage | null>(
    defaultFormConfig.pricing.packages[0],
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [localSavedUserData, setLocalSavedUserData] =
    useState<UserRegistrationData | null>(savedUserData || null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any>(null);
  const [hasCompletedUserRegistration, setHasCompletedUserRegistration] =
    useState(isAuthenticated || !!savedUserData);
  const [registrationTimestamp, setRegistrationTimestamp] =
    useState<string>('');

  // Player selection state
  const [players, setPlayers] = useState<Player[]>(() => {
    if (savedPlayers && savedPlayers.length > 0) return savedPlayers;
    if (!isExistingUser && !savedUserData && !isAuthenticated) {
      return [
        {
          fullName: '',
          gender: '',
          dob: '',
          schoolName: '',
          healthConcerns: '',
          aauNumber: '',
          registrationYear: dynamicSeasonEvent.year,
          season: dynamicSeasonEvent.season,
          grade: '',
        },
      ];
    }
    return [];
  });

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playerValidation, setPlayerValidation] = useState(false);
  const [playersForTraining, setPlayersForTraining] = useState<Player[]>([]);

  // Define all possible steps
  const allSteps = [
    { id: 'account', label: 'Account', number: 1, icon: 'ti ti-user-plus' },
    {
      id: 'verifyEmail',
      label: 'Verify Email',
      number: 2,
      icon: 'ti ti-mail-check',
    },
    {
      id: 'user',
      label: 'Guardian Info',
      number: 3,
      icon: 'ti ti-user-shield',
    },
    {
      id: 'playerSelect',
      label: 'Player Info',
      number: 4,
      icon: 'ti ti-users',
    },
    { id: 'payment', label: 'Payment', number: 5, icon: 'ti ti-credit-card' },
  ];

  const [steps] = useState<any[]>(() =>
    allSteps.map((step, index) => ({ ...step, number: index + 1 })),
  );

  const [formData, setFormData] = useState<FormData>({
    eventData: {
      season: dynamicSeasonEvent.season,
      year: dynamicSeasonEvent.year,
      eventId: dynamicSeasonEvent.eventId,
    },
  });

  // ─── Helper Functions ──────────────────────────────────────────────────────
  const getPaidPlayersForTraining = useCallback((): Player[] => {
    if (!userPlayers) return [];

    return userPlayers.filter((player) =>
      player.seasons?.some((season: SeasonRegistration) => {
        const isTrainingSeason =
          season.season === 'Basketball Training' ||
          season.season.toLowerCase().includes('training') ||
          season.season.toLowerCase().includes('camp') ||
          season.season.toLowerCase().includes('clinic');

        if (!isTrainingSeason) return false;

        return (
          season.season === dynamicSeasonEvent.season &&
          season.year === dynamicSeasonEvent.year &&
          season.tryoutId === dynamicSeasonEvent.eventId &&
          (season.paymentStatus === 'paid' || season.paymentComplete === true)
        );
      }),
    );
  }, [userPlayers, dynamicSeasonEvent]);

  const getUnpaidPlayers = useCallback((): Player[] => {
    if (!userPlayers) return [];
    const paidPlayers = getPaidPlayersForTraining();
    const paidPlayerIds = new Set(paidPlayers.map((p) => p._id));
    return userPlayers.filter((player) => !paidPlayerIds.has(player._id));
  }, [userPlayers, getPaidPlayersForTraining]);

  const getEffectivePlayerCount = useCallback((): number => {
    const paidPlayers = getPaidPlayersForTraining();
    const paidPlayerIds = new Set(paidPlayers.map((p) => p._id));
    const selectedUnpaidCount = selectedPlayerIds.filter(
      (id) => !paidPlayerIds.has(id),
    ).length;
    const newPlayersCount = players.filter(
      (p) => !p._id && p.fullName?.trim(),
    ).length;
    return selectedUnpaidCount + newPlayersCount;
  }, [selectedPlayerIds, players, getPaidPlayersForTraining]);

  const calculatePaymentAmount = (): number => {
    const playerCount = getEffectivePlayerCount();
    const price = selectedPackage?.price || defaultFormConfig.pricing.basePrice;
    return price * 100 * playerCount;
  };

  // ─── Step Navigation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || isLoadingUserData) return;

    if (skipToPlayerStep) {
      setCurrentStep('playerSelect');
    } else if (
      isExistingUser ||
      isAuthenticated ||
      hasCompletedUserRegistration
    ) {
      setCurrentStep('playerSelect');
    } else {
      setCurrentStep('account');
    }
  }, [
    authLoading,
    isLoadingUserData,
    isAuthenticated,
    hasCompletedUserRegistration,
    skipToPlayerStep,
    isExistingUser,
  ]);

  useEffect(() => {
    if (
      currentStep === 'playerSelect' &&
      players.length === 0 &&
      (!userPlayers || userPlayers.length === 0) &&
      !isExistingUser
    ) {
      setPlayers([
        {
          fullName: '',
          gender: '',
          dob: '',
          schoolName: '',
          healthConcerns: '',
          aauNumber: '',
          registrationYear: dynamicSeasonEvent.year,
          season: dynamicSeasonEvent.season,
          grade: '',
        },
      ]);
    }
  }, [
    currentStep,
    players.length,
    userPlayers,
    dynamicSeasonEvent.year,
    dynamicSeasonEvent.season,
    isExistingUser,
  ]);

  const updateFormData = (newData: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  // ─── Account Creation Handlers ─────────────────────────────────────────────
  const handleAccountCreated = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    setIsProcessing(true);
    setFormError(null);

    try {
      localStorage.setItem('pendingEmail', email);
      await createTempAccount(email, password);
      updateFormData({ tempAccount: { email, password } });
      setIsVerificationSent(true);
      setCurrentStep('verifyEmail');
    } catch (error: any) {
      let errorMessage = 'Failed to create account';
      if (error.message?.includes('network') || error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error: Please check your connection.';
      } else if (error.message?.includes('already exists')) {
        errorMessage = 'Email already registered. Please sign in.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      setFormError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerified = () => setCurrentStep('user');

  // ─── Save User Data ────────────────────────────────────────────────────────
  const saveUserData = async (
    userData: UserRegistrationData,
  ): Promise<UserRegistrationData | null> => {
    try {
      const password = userData.password || formData.tempAccount?.password;
      if (!password && !isAuthenticated) {
        throw new Error('Password is required for new user registration');
      }

      const normalizedAddress: Address = {
        street: userData.address?.street?.trim() || '',
        street2: userData.address?.street2?.trim() || '',
        city: userData.address?.city?.trim() || '',
        state: (userData.address?.state?.trim() || '').toUpperCase(),
        zip: userData.address?.zip?.trim() || '',
      };

      const registrationData: any = {
        email: userData.email.toLowerCase().trim(),
        password: password?.trim(),
        fullName: userData.fullName.trim(),
        phone: userData.phone.replace(/\D/g, ''),
        address: normalizedAddress,
        relationship: userData.relationship.trim(),
        isCoach: userData.isCoach || false,
        aauNumber: userData.aauNumber?.trim() || '',
        agreeToTerms: userData.agreeToTerms,
        registerType: 'self',
        additionalGuardians:
          userData.additionalGuardians?.map((guardian) => ({
            fullName: guardian.fullName.trim(),
            email: guardian.email.toLowerCase().trim(),
            phone: guardian.phone.replace(/\D/g, ''),
            relationship: guardian.relationship.trim(),
            address: guardian.usePrimaryAddress
              ? normalizedAddress
              : {
                  street: guardian.address.street?.trim() || '',
                  street2: guardian.address.street2?.trim() || '',
                  city: guardian.address.city?.trim() || '',
                  state: (guardian.address.state?.trim() || '').toUpperCase(),
                  zip: guardian.address.zip?.trim() || '',
                },
            isCoach: guardian.isCoach || false,
            aauNumber: guardian.aauNumber?.trim() || '',
            usePrimaryAddress: guardian.usePrimaryAddress || false,
          })) || [],
      };

      let response;
      if (isAuthenticated) {
        const token = localStorage.getItem('token');
        response = await axios.patch(
          `${API_BASE_URL}/users/profile`,
          registrationData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        );
      } else {
        response = await axios.post(
          `${API_BASE_URL}/register`,
          registrationData,
        );
      }

      if (!isAuthenticated && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('parentId', response.data.parent._id);
        localStorage.setItem('parent', JSON.stringify(response.data.parent));
        await checkAuth();
      }

      const savedData =
        response.data.user || response.data.parent || response.data;
      if (response.data.additionalGuardians) {
        savedData.additionalGuardians = response.data.additionalGuardians;
      }

      setLocalSavedUserData(savedData);
      setHasCompletedUserRegistration(true);
      return savedData;
    } catch (error: any) {
      let errorMessage = 'Failed to save user information';
      if (error.response?.data?.error) errorMessage = error.response.data.error;
      else if (error.response?.data?.message)
        errorMessage = error.response.data.message;
      else if (error.message) errorMessage = error.message;
      setFormError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // ─── Save Player Data ──────────────────────────────────────────────────────
  const savePlayerData = async (playersToSave: Player[]): Promise<Player[]> => {
    try {
      const token = localStorage.getItem('token');
      const parentId = localSavedUserData?._id || currentUser?._id;

      if (!token || !parentId) {
        throw new Error('Authentication required. Please log in again.');
      }

      const playersWithoutId = playersToSave.filter((p) => !p._id);
      if (playersWithoutId.length === 0) {
        return playersToSave;
      }

      const savedPlayers: Player[] = [];

      for (const player of playersWithoutId) {
        const playerData = {
          fullName: player.fullName.trim(),
          gender: player.gender,
          dob: player.dob,
          schoolName: player.schoolName?.trim() || '',
          healthConcerns: player.healthConcerns || '',
          aauNumber: player.aauNumber || '',
          registrationYear: player.registrationYear || dynamicSeasonEvent.year,
          season: player.season || dynamicSeasonEvent.season,
          parentId: parentId,
          grade: player.grade || '',
          isGradeOverridden: player.isGradeOverridden || false,
          skipSeasonRegistration: false,
          registrationType: 'training',
        };

        try {
          const response = await axios.post(
            `${API_BASE_URL}/players/register`,
            playerData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            },
          );

          if (response.data.error?.includes('already exists')) {
            if (response.data.duplicatePlayerId) {
              savedPlayers.push({
                ...player,
                _id: response.data.duplicatePlayerId,
              });
            }
          } else {
            savedPlayers.push(response.data.player || response.data);
          }
        } catch (error: any) {
          if (error.response?.data?.error?.includes('already exists')) {
            const duplicateId = error.response.data.duplicatePlayerId;
            if (duplicateId) {
              savedPlayers.push({ ...player, _id: duplicateId });
              continue;
            }
          }
          throw error;
        }
      }

      const existingPlayers = playersToSave.filter((p) => p._id);
      const allPlayers = [...existingPlayers, ...savedPlayers];

      setPlayers(allPlayers);
      updateFormData({ players: allPlayers });

      return allPlayers;
    } catch (error: any) {
      console.error('Error in savePlayerData:', error);
      let errorMessage = 'Failed to save player information';
      if (error.response?.data?.error) errorMessage = error.response.data.error;
      else if (error.response?.data?.message)
        errorMessage = error.response.data.message;
      else if (error.message) errorMessage = error.message;
      setFormError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // ─── User Completion ───────────────────────────────────────────────────────
  const handleUserComplete = async (userData: any) => {
    try {
      const userDataToSave = userData.user || userData;
      const savedUser = await saveUserData(userDataToSave);
      if (!savedUser) throw new Error('Failed to save user data');
      setLocalSavedUserData(savedUser);
      setHasCompletedUserRegistration(true);
      setCurrentStep('playerSelect');
    } catch (error: any) {
      setFormError(error.message || 'Failed to save user information');
    }
  };

  // ─── Player Handlers ───────────────────────────────────────────────────────
  const handlePlayersChange = (updatedPlayers: Player[]) => {
    setPlayers(updatedPlayers);
    updateFormData({ players: updatedPlayers });
  };

  const handlePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId],
    );
  };

  const handlePlayerValidationChange = (isValid: boolean) => {
    setPlayerValidation(isValid);
  };

  // ─── Player Completion - This saves players AND moves to payment ───────────
  const handlePlayerComplete = async (playersData: Player[]) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      console.log('🔍 handlePlayerComplete START:', {
        playersDataLength: playersData.length,
        playersData: playersData.map((p) => ({
          id: p._id,
          name: p.fullName,
          hasId: !!p._id,
        })),
        selectedPlayerIds,
        userPlayersLength: userPlayers?.length || 0,
      });

      // Save players to database
      const savedPlayers = await savePlayerData(playersData);
      console.log(
        '🔍 savedPlayers after save:',
        savedPlayers.map((p) => ({ id: p._id, name: p.fullName })),
      );

      // Get paid players
      const paidPlayers = getPaidPlayersForTraining();
      const paidPlayerIds = new Set(paidPlayers.map((p) => p._id));
      console.log('🔍 paidPlayerIds:', Array.from(paidPlayerIds));

      // Get selected existing players
      const selectedUnpaidPlayers = (userPlayers || []).filter(
        (p) => selectedPlayerIds.includes(p._id!) && !paidPlayerIds.has(p._id!),
      );
      console.log(
        '🔍 selectedUnpaidPlayers:',
        selectedUnpaidPlayers.map((p) => ({ id: p._id, name: p.fullName })),
      );

      // Get newly created players
      const newPlayers = savedPlayers.filter(
        (p) => p._id && p.fullName?.trim(),
      );
      console.log(
        '🔍 newPlayers:',
        newPlayers.map((p) => ({ id: p._id, name: p.fullName })),
      );

      // Combine
      const allPlayersForPayment = [...selectedUnpaidPlayers, ...newPlayers];
      console.log(
        '🔍 allPlayersForPayment FINAL:',
        allPlayersForPayment.map((p) => ({ id: p._id, name: p.fullName })),
      );

      if (allPlayersForPayment.length === 0) {
        console.error('❌ No players for payment!');
        setFormError(
          'No players selected for training. Please add at least one player.',
        );
        return;
      }

      setPlayersForTraining(allPlayersForPayment);
      console.log(
        '🔍 playersForTraining state set to:',
        allPlayersForPayment.length,
      );

      setCurrentStep('payment');
    } catch (error: any) {
      console.error('❌ Error in handlePlayerComplete:', error);
      setFormError(error.message || 'Failed to save player information');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    const stepOrder: RegistrationStep[] = [
      'account',
      'verifyEmail',
      'user',
      'playerSelect',
      'payment',
    ];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handlePaymentComplete = (successData: any) => {
    setPaymentSuccessData(successData);
    setRegistrationTimestamp(new Date().toLocaleString());
    setCurrentStep('success');
  };

  const handleComplete = () => {
    if (onSuccess) {
      onSuccess(formData);
    }
    navigate(routes.profile);
  };

  const handleAddMorePlayers = () => {
    setCurrentStep('playerSelect');
  };

  // ─── Render Methods ────────────────────────────────────────────────────────
  const renderPackageSelection = () => {
    const playerCount = getEffectivePlayerCount();
    const packages = defaultFormConfig.pricing.packages;

    // Determine column classes based on number of packages
    const getColumnClasses = (packageCount: number) => {
      switch (packageCount) {
        case 1:
          return 'col-md-12';
        case 2:
          return 'col-md-6';
        case 3:
          return 'col-md-4';
        default:
          return 'col-md-6'; // For 4+ packages, use 2 columns per row
      }
    };

    // Split packages into rows for 4+ packages
    const renderPackageRows = () => {
      const columnClass = getColumnClasses(packages.length);

      // For 1-3 packages, render in a single row
      if (packages.length <= 3) {
        return (
          <div className='row'>
            {packages.map((pkg) => (
              <div key={pkg.id} className={`${columnClass} mb-3`}>
                {renderPackageCard(pkg)}
              </div>
            ))}
          </div>
        );
      }

      // For 4+ packages, split into rows of 2 columns each
      const rows = [];
      for (let i = 0; i < packages.length; i += 2) {
        const rowPackages = packages.slice(i, i + 2);
        rows.push(
          <div key={i} className='row mb-3'>
            {rowPackages.map((pkg) => (
              <div key={pkg.id} className='col-md-6'>
                {renderPackageCard(pkg)}
              </div>
            ))}
          </div>,
        );
      }
      return rows;
    };

    const renderPackageCard = (pkg: PricingPackage) => {
      const totalPrice = pkg.price * playerCount;
      return (
        <div
          className={`card border h-100 ${selectedPackage?.id === pkg.id ? 'border-primary' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setSelectedPackage(pkg)}
        >
          <div className='card-body text-center d-flex flex-column'>
            <div className='form-check mb-2'>
              <input
                className='form-check-input'
                type='radio'
                name='trainingPackage'
                checked={selectedPackage?.id === pkg.id}
                onChange={() => setSelectedPackage(pkg)}
              />
            </div>
            <h5 className='text-primary'>{pkg.name}</h5>
            <h4 className='my-2'>${pkg.price}</h4>
            {pkg.description && (
              <p className='text-muted small mb-0 mt-2'>{pkg.description}</p>
            )}
            {playerCount > 0 && (
              <div className='mt-auto pt-3'>
                <div className='text-muted small'>
                  <i className='ti ti-users me-1'></i>
                  For {playerCount} player
                  {playerCount !== 1 ? 's' : ''}:
                </div>
                <div className='fw-bold'>${totalPrice} total</div>
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className='card mb-4'>
        <div className='card-header bg-light'>
          <div className='d-flex align-items-center'>
            <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
              <i className='ti ti-package fs-16' />
            </span>
            <h4 className='text-dark'>Select Training Package</h4>
          </div>
        </div>
        <div className='card-body'>
          {renderPackageRows()}

          {!selectedPackage && (
            <div className='alert alert-warning mt-3'>
              <i className='ti ti-alert-triangle me-2'></i>Please select a
              training package to continue
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSuccessMessage = () => {
    const actualTotalAmount =
      (paymentSuccessData?.amount || calculatePaymentAmount()) / 100;

    return (
      <div className='card border-0 shadow-sm'>
        <div className='card-header'>
          <h4 className='mb-0'>🎉 Training Registration Complete!</h4>
        </div>
        <div className='card-body'>
          <div className='text-center py-4'>
            <i className='ti ti-circle-check fs-1 text-success mb-3'></i>
            <h3>Training Registration Successful!</h3>
            <p className='text-muted'>
              Your players have been registered for the{' '}
              {dynamicSeasonEvent.season} {dynamicSeasonEvent.year} training
              program.
            </p>
          </div>

          <div className='receipt-card mb-4'>
            <div className='card border'>
              <div className='card-header bg-light'>
                <h5 className='mb-0'>Training Registration Receipt</h5>
              </div>
              <div className='card-body'>
                <div className='row mb-3'>
                  <div className='col-md-6'>
                    <p>
                      <strong>Registration Date:</strong>
                    </p>
                    <p>{registrationTimestamp}</p>
                  </div>
                  <div className='col-md-6'>
                    <p>
                      <strong>Program:</strong>
                    </p>
                    <p>
                      {dynamicSeasonEvent.season} {dynamicSeasonEvent.year}
                    </p>
                  </div>
                </div>

                <div className='row mb-3'>
                  <div className='col-md-6'>
                    <p>
                      <strong>Package:</strong>
                    </p>
                    <p>{selectedPackage?.name || 'Training Package'}</p>
                  </div>
                  <div className='col-md-6'>
                    <p>
                      <strong>Amount Paid:</strong>
                    </p>
                    <p className='h5 text-success'>
                      ${actualTotalAmount.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className='mb-3'>
                  <p>
                    <strong>Parent/Guardian:</strong>
                  </p>
                  <p>
                    {localSavedUserData?.fullName ||
                      currentUser?.fullName ||
                      'Not specified'}
                  </p>
                </div>

                <div className='mb-3'>
                  <p>
                    <strong>Players Registered:</strong>
                  </p>
                  <ul className='list-group'>
                    {playersForTraining.map((player, index) => (
                      <li
                        key={index}
                        className='list-group-item d-flex justify-content-between'
                      >
                        <div>
                          <strong>{player.fullName}</strong>
                          <div className='text-muted small'>
                            {player.grade} Grade • {player.gender} •{' '}
                            {player.schoolName || 'School not specified'}
                          </div>
                        </div>
                        <span className='badge bg-success'>Registered</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className='mb-3'>
                  <p>
                    <strong>Next Steps:</strong>
                  </p>
                  <div className='alert alert-info'>
                    <ul className='mb-0'>
                      <li>
                        <i className='ti ti-calendar text-primary me-2'></i>
                        Training schedule will be emailed to you
                      </li>
                      <li className='mt-2'>
                        <i className='ti ti-user text-primary me-2'></i>Add more
                        players - You can still add additional players to your
                        account
                      </li>
                      <li className='mt-2'>
                        <i className='ti ti-bell-ringing text-primary me-2'></i>
                        Get notifications - You'll receive training updates
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='d-flex justify-content-between'>
            <button
              type='button'
              className='btn btn-outline-primary'
              onClick={handleAddMorePlayers}
            >
              <i className='ti ti-plus me-2'></i>Add More Players
            </button>
            <button
              type='button'
              className='btn btn-primary'
              onClick={handleComplete}
            >
              <i className='ti ti-home me-2'></i>Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Props for DynamicPlayerRegistrationModule
  const isUserExisting =
    isExistingUser || isAuthenticated || hasCompletedUserRegistration;
  const allExistingPlayers = userPlayers || [];
  const unpaidPlayersForTraining = getUnpaidPlayers();

  if (authLoading || isLoadingUserData) {
    return (
      <div className='form-content text-center p-5'>
        <LoadingSpinner />
        <p className='mt-3 text-muted'>Loading registration...</p>
      </div>
    );
  }

  return (
    <div>
      <div className='form-header'>
        <h2 className='mt-3'>Training Registration</h2>
        <p>
          {currentStep === 'success'
            ? 'Your players have been successfully registered for training!'
            : `Register for ${dynamicSeasonEvent.season} ${dynamicSeasonEvent.year}`}
        </p>
      </div>

      {currentStep !== 'success' && steps.length > 0 && (
        <StepIndicator
          steps={steps}
          currentStep={currentStep}
          className='mb-5'
        />
      )}

      <div className='form-content'>
        {formError && (
          <div className='alert alert-danger mb-4 border-0'>
            <i className='ti ti-alert-circle me-2'></i>
            {formError}
          </div>
        )}

        <div className='step-content'>
          {currentStep === 'account' && (
            <AccountCreationModule onComplete={handleAccountCreated} />
          )}

          {currentStep === 'verifyEmail' && (
            <EmailVerificationStep
              email={
                formData.tempAccount?.email ||
                localStorage.getItem('pendingEmail') ||
                ''
              }
              onVerified={handleVerified}
              onBack={() => setCurrentStep('account')}
              isVerificationSent={isVerificationSent}
            />
          )}

          {currentStep === 'user' && (
            <UserRegistrationModule
              onComplete={handleUserComplete}
              onBack={handleBack}
              formData={formData}
              updateFormData={updateFormData}
              isExistingUser={
                isExistingUser ||
                isAuthenticated ||
                hasCompletedUserRegistration
              }
              initialData={formData.user || localSavedUserData}
              onValidationChange={() => {}}
            />
          )}

          {currentStep === 'playerSelect' && (
            <DynamicPlayerRegistrationModule
              players={players}
              onPlayersChange={handlePlayersChange}
              registrationYear={dynamicSeasonEvent.year}
              season={dynamicSeasonEvent.season}
              isExistingUser={isUserExisting}
              existingPlayers={allExistingPlayers}
              paidPlayers={getPaidPlayersForTraining()}
              onValidationChange={handlePlayerValidationChange}
              showCheckboxes={isAuthenticated && allExistingPlayers.length > 0}
              selectedPlayerIds={selectedPlayerIds}
              onPlayerSelection={handlePlayerSelection}
              parentId={localSavedUserData?._id || currentUser?._id}
              authToken={localStorage.getItem('token') || undefined}
              allowMultiple={true}
              requiresPayment={true}
              onComplete={handlePlayerComplete}
              onBack={handleBack}
            />
          )}

          {currentStep === 'payment' && (
            <div>
              {renderPackageSelection()}
              <PaymentModule
                amount={calculatePaymentAmount()}
                customerEmail={
                  formData.user?.email ||
                  localSavedUserData?.email ||
                  formData.tempAccount?.email ||
                  currentUser?.email ||
                  ''
                }
                onPaymentSuccess={handlePaymentComplete}
                onPaymentError={(error) => setFormError(error)}
                description={`${dynamicSeasonEvent.season} - ${selectedPackage?.name || 'Training'}`}
                isProcessing={isProcessing}
                onComplete={handlePaymentComplete}
                onBack={handleBack}
                formConfig={defaultFormConfig}
                playerCount={getEffectivePlayerCount()}
                selectedPackage={selectedPackage}
                players={playersForTraining}
                eventData={formData.eventData}
                savedUserData={localSavedUserData}
                savedPlayers={playersForTraining}
                appId={'sq0idp-jUCxKnO_i8i7vccQjVj_0g'}
                locationId={'L26Q50FWRCQW5'}
                disabled={!selectedPackage || playersForTraining.length === 0}
                onPaymentComplete={(successData) =>
                  handlePaymentComplete({
                    ...successData,
                    amount: calculatePaymentAmount(),
                    totalAmount: calculatePaymentAmount() / 100,
                    playerCount: getEffectivePlayerCount(),
                    selectedPackage,
                  })
                }
                registrationType='training'
              />
            </div>
          )}

          {currentStep === 'success' && renderSuccessMessage()}
        </div>
      </div>
    </div>
  );
};

export default TrainingRegistrationForm;
