import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import UserRegistrationModule from '../registration-modules/UserRegistrationModule';
import PaymentModule from '../registration-modules/PaymentModule';
import AccountCreationModule from '../registration-modules/AccountCreationModule';
import EmailVerificationStep from '../../auth/emailVerification/emailVerificationStep';
import PlayerRegistrationModule from '../registration-modules/PlayerRegistrationModule';
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
    isEmailVerified,
    user: currentUser,
    createTempAccount,
    checkAuth,
    players: userPlayers,
  } = useAuth();

  // ✅ Extract season and year from formConfig or use defaults
  const dynamicSeasonEvent = useMemo(() => {
    // Base defaults
    const defaults = {
      season: 'Basketball Training',
      year: currentYear,
      eventId: `training-${currentYear}`,
    };

    console.log('🔍 Building dynamicSeasonEvent from:', {
      seasonEvent,
      formConfig,
      hasSeasonEvent: !!seasonEvent,
      hasFormConfig: !!formConfig,
    });

    // Priority 1: Use seasonEvent if it's a training/camp event
    if (seasonEvent) {
      const isTrainingEvent =
        seasonEvent.eventId?.includes('-camp-') ||
        seasonEvent.eventId?.includes('-training-') ||
        seasonEvent.season?.toLowerCase().includes('camp') ||
        seasonEvent.season?.toLowerCase().includes('training') ||
        seasonEvent.season?.toLowerCase().includes('clinic');

      if (isTrainingEvent && seasonEvent.season && seasonEvent.year) {
        console.log(
          '✅ Using seasonEvent (training/camp):',
          seasonEvent.season,
        );
        return {
          season: seasonEvent.season,
          year: seasonEvent.year,
          eventId: seasonEvent.eventId || `training-${seasonEvent.year}`,
        };
      }
    }

    // Priority 2: Use formConfig if it's a training/camp event
    if (formConfig) {
      const isTrainingEvent =
        formConfig.season?.toLowerCase().includes('camp') ||
        formConfig.season?.toLowerCase().includes('training') ||
        formConfig.season?.toLowerCase().includes('clinic');

      if (isTrainingEvent && formConfig.season && formConfig.year) {
        console.log('✅ Using formConfig (training/camp):', formConfig.season);
        return {
          season: formConfig.season,
          year: formConfig.year,
          eventId: formConfig.eventId || `training-${formConfig.year}`,
        };
      }
    }

    // Priority 3: If seasonEvent exists (even if not training), use it
    if (seasonEvent?.season && seasonEvent?.year) {
      console.log(
        '⚠️ Using seasonEvent (not training-specific):',
        seasonEvent.season,
      );
      return {
        season: seasonEvent.season,
        year: seasonEvent.year,
        eventId: seasonEvent.eventId || `training-${seasonEvent.year}`,
      };
    }

    // Priority 4: If formConfig exists (even if not training), use it
    if (formConfig?.season && formConfig?.year) {
      console.log(
        '⚠️ Using formConfig (not training-specific):',
        formConfig.season,
      );
      return {
        season: formConfig.season,
        year: formConfig.year,
        eventId: formConfig.eventId || `training-${formConfig.year}`,
      };
    }

    // Fallback to defaults
    console.log('⚠️ Using defaults for dynamicSeasonEvent');
    return defaults;
  }, [formConfig, seasonEvent, currentYear]);

  const defaultFormConfig: RegistrationFormConfig = useMemo(
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
      // For training, always use training season name
      season: dynamicSeasonEvent.season,
      year: dynamicSeasonEvent.year,
      ...(formConfig
        ? {
            ...formConfig,
          }
        : {}),
    }),
    [formConfig],
  );

  type RegistrationStep =
    | 'account'
    | 'verifyEmail'
    | 'user'
    | 'playerSelect'
    | 'payment'
    | 'success';

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
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playerValidation, setPlayerValidation] = useState(false);

  // Store all players to be registered (existing + new)
  const [playersForTraining, setPlayersForTraining] = useState<Player[]>([]);

  // Define all possible steps - ALWAYS SHOW ALL 5 STEPS (including payment)
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
    {
      id: 'payment',
      label: 'Payment',
      number: 5,
      icon: 'ti ti-credit-card',
    },
  ];

  // Initialize steps - ALWAYS show all 5 steps
  const [steps] = useState<any[]>(() =>
    allSteps.map((step, index) => ({
      ...step,
      number: index + 1,
    })),
  );

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  const [formData, setFormData] = useState<FormData>({
    eventData: {
      season: dynamicSeasonEvent.season,
      year: dynamicSeasonEvent.year,
      eventId: dynamicSeasonEvent.eventId,
    },
  });

  // ✅ Calculate which players are already paid for THIS specific training
  const getPaidPlayersForTraining = useCallback((): Player[] => {
    if (!userPlayers) return [];

    const trainingSeason = dynamicSeasonEvent.season;
    const trainingYear = dynamicSeasonEvent.year;
    const trainingEventId = dynamicSeasonEvent.eventId;

    console.log('🔍 Checking paid players for training/camp:', {
      trainingSeason,
      trainingYear,
      trainingEventId,
      totalPlayers: userPlayers.length,
    });

    return userPlayers.filter((player) => {
      const hasPaidForThisTraining = player.seasons?.some(
        (season: SeasonRegistration) => {
          // Check if this is a training/camp program (not a tryout)
          // Training programs can be: "Basketball Training", "Winter Break Camp", etc.
          const isTrainingOrCampSeason =
            season.season === 'Basketball Training' ||
            season.season.toLowerCase().includes('training') ||
            season.season.toLowerCase().includes('camp') ||
            season.season.toLowerCase().includes('clinic');

          if (!isTrainingOrCampSeason) {
            // This is not a training/camp season (might be a tryout)
            return false;
          }

          // Check if it's the same specific training/camp event
          const exactSeasonMatch = season.season === trainingSeason;
          const exactYearMatch = season.year === trainingYear;
          // Use tryoutId to match specific event
          const isSameEvent = season.tryoutId === trainingEventId;

          const isPaid =
            season.paymentStatus === 'paid' || season.paymentComplete === true;

          const result =
            exactSeasonMatch && exactYearMatch && isSameEvent && isPaid;

          if (result) {
            console.log(
              `✅ Player ${player.fullName} paid for "${trainingSeason}":`,
              {
                seasonInDB: season.season,
                yearInDB: season.year,
                tryoutIdInDB: season.tryoutId,
                currentEventId: trainingEventId,
                paymentStatus: season.paymentStatus,
              },
            );
          }

          return result;
        },
      );

      return hasPaidForThisTraining;
    });
  }, [
    userPlayers,
    dynamicSeasonEvent.season,
    dynamicSeasonEvent.year,
    dynamicSeasonEvent.eventId,
  ]);

  // ✅ Get unpaid players (those not already paid for this training)
  const getUnpaidPlayers = useCallback((): Player[] => {
    if (!userPlayers) return [];

    const paidPlayers = getPaidPlayersForTraining();
    const paidPlayerIds = new Set(paidPlayers.map((p) => p._id));

    // Return players who are NOT in the paid list
    const unpaidPlayers = userPlayers.filter(
      (player) => !paidPlayerIds.has(player._id),
    );

    console.log('🔍 Training Players Status:', {
      trainingSeason: dynamicSeasonEvent.season,
      trainingYear: dynamicSeasonEvent.year,
      totalUserPlayers: userPlayers.length,
      paidPlayersCount: paidPlayers.length,
      unpaidPlayersCount: unpaidPlayers.length,
      paidPlayers: paidPlayers.map((p) => ({
        id: p._id,
        name: p.fullName,
        seasons:
          p.seasons?.filter((s) =>
            s.season.toLowerCase().includes('training'),
          ) || [],
      })),
      unpaidPlayers: unpaidPlayers.map((p) => ({
        id: p._id,
        name: p.fullName,
      })),
    });

    return unpaidPlayers;
  }, [userPlayers, getPaidPlayersForTraining]);

  const extractSeasonInfo = (season: SeasonRegistration) => {
    return {
      season: season.season,
      year: season.year,
      tryoutId: season.tryoutId || undefined,
      paymentStatus: season.paymentStatus || undefined,
      paymentComplete: season.paymentComplete || undefined,
    };
  };

  // Then use it in the debug log
  useEffect(() => {
    if (userPlayers && userPlayers.length > 0) {
      console.log('🎯 TRAINING REGISTRATION DEBUG:', {
        // Configuration
        trainingSeason: dynamicSeasonEvent.season,
        trainingYear: dynamicSeasonEvent.year,
        formConfig: formConfig,

        // Player data analysis
        totalPlayers: userPlayers.length,
        players: userPlayers.map((p) => ({
          id: p._id,
          name: p.fullName,
          seasons: p.seasons?.map(extractSeasonInfo) || [],
        })),
      });
    }
  }, [userPlayers, dynamicSeasonEvent, formConfig]);

  // Custom function to determine if a step is accessible for clicking
  const isStepAccessible = (
    stepId: string,
    stepIndex: number,
    currentStepIndex: number,
  ): boolean => {
    // For new users going through the flow
    if (!isAuthenticated && !isExistingUser && !hasCompletedUserRegistration) {
      // Allow clicking on completed steps
      return stepIndex <= currentStepIndex;
    }

    // For authenticated users or those who completed user registration
    if (isAuthenticated || hasCompletedUserRegistration) {
      // Allow clicking on 'user', 'playerSelect', and 'payment' steps
      if (
        stepId === 'user' ||
        stepId === 'playerSelect' ||
        stepId === 'payment'
      ) {
        return stepIndex <= currentStepIndex;
      }
      // Don't allow clicking on 'account' or 'verifyEmail' for authenticated users
      return false;
    }

    // Default: allow clicking on completed steps
    return stepIndex <= currentStepIndex;
  };

  // ✅ Initialize steps
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

  // ✅ Initialize players
  useEffect(() => {
    if (savedPlayers && savedPlayers.length > 0) {
      setPlayers(savedPlayers);
    } else if (
      currentStep === 'playerSelect' &&
      players.length === 0 &&
      (!userPlayers || userPlayers.length === 0) &&
      !isExistingUser
    ) {
      const blankPlayer: Player = {
        fullName: '',
        gender: '',
        dob: '',
        schoolName: '',
        healthConcerns: '',
        aauNumber: '',
        registrationYear: dynamicSeasonEvent.year,
        season: dynamicSeasonEvent.season,
        grade: '',
      };
      setPlayers([blankPlayer]);
    }
  }, [
    currentStep,
    players.length,
    userPlayers,
    dynamicSeasonEvent.year,
    dynamicSeasonEvent.season,
    isExistingUser,
    savedPlayers,
  ]);

  const updateFormData = (newData: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  // ✅ Handle step navigation
  const handleStepClick = (stepId: string) => {
    const stepIndex = steps.findIndex((step) => step.id === stepId);
    const currentIndex = steps.findIndex((step) => step.id === currentStep);

    // Check if step is accessible using our custom function
    const isAccessible = isStepAccessible(stepId, stepIndex, currentIndex);
    if (!isAccessible) {
      return; // Don't navigate to inaccessible steps
    }

    // Only allow navigation to previous steps (can't skip ahead)
    if (stepIndex <= currentIndex) {
      setCurrentStep(stepId as RegistrationStep);
    }
  };

  // ✅ Calculate effective player count for payment
  const getEffectivePlayerCount = useCallback((): number => {
    // Count selected existing UNPAID players + new players (without _id)
    const selectedUnpaidPlayers = selectedPlayerIds.filter((playerId) => {
      const player = userPlayers?.find((p) => p._id === playerId);
      if (!player) return false;

      // Check if player is already paid for this SPECIFIC training
      const isPaid = player.seasons?.some((season: SeasonRegistration) => {
        const isSameSeason = season.season === dynamicSeasonEvent.season;
        const isSameYear = season.year === dynamicSeasonEvent.year;
        const isPaidStatus =
          season.paymentStatus === 'paid' || season.paymentComplete === true;

        return isSameSeason && isSameYear && isPaidStatus;
      });

      return !isPaid; // Only count if NOT paid
    });

    const newPlayersCount = players.filter(
      (p) => !p._id && p.fullName?.trim(),
    ).length;

    const total = selectedUnpaidPlayers.length + newPlayersCount;

    console.log('🔍 Training Effective Player Count:', {
      trainingSeason: dynamicSeasonEvent.season,
      trainingYear: dynamicSeasonEvent.year,
      selectedUnpaidPlayers: selectedUnpaidPlayers.length,
      newPlayersCount,
      total,
      selectedPlayerIds,
    });

    return total;
  }, [
    selectedPlayerIds,
    players,
    userPlayers,
    dynamicSeasonEvent.season,
    dynamicSeasonEvent.year,
  ]);

  const calculatePaymentAmount = (): number => {
    const playerCount = getEffectivePlayerCount();
    // Use the pricing from the dynamic formConfig
    const basePrice = defaultFormConfig.pricing.basePrice;
    if (selectedPackage) {
      return selectedPackage.price * 100 * playerCount;
    }
    return basePrice * 100 * playerCount;
  };

  // ✅ Account creation handler
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
      updateFormData({
        tempAccount: { email, password },
      });
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

  const handleVerified = () => {
    setCurrentStep('user');
  };

  // ✅ Save user data function
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
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setFormError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // ✅ Save player data function
  const savePlayerData = async (
    playersToSave: Player[],
    immediatePaymentFlow = false,
  ): Promise<Player[]> => {
    try {
      const token = localStorage.getItem('token');
      const parentId = localSavedUserData?._id || currentUser?._id;

      if (!token || !parentId) {
        throw new Error('Authentication required. Please log in again.');
      }

      const playersWithoutId = playersToSave.filter((p) => !p._id);
      if (playersWithoutId.length === 0) {
        console.log('All players already have IDs, returning existing players');
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
          immediatePaymentFlow: immediatePaymentFlow,
          skipSeasonRegistration: true,
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

          // Check for duplicate player response
          if (response.data.error?.includes('already exists')) {
            console.log(
              'Duplicate player detected in response:',
              response.data,
            );

            if (response.data.existingPlayer) {
              const existingPlayer: Player = {
                ...player,
                _id:
                  response.data.existingPlayer.id ||
                  response.data.duplicatePlayerId,
                fullName: response.data.existingPlayer.fullName,
                seasons: response.data.existingPlayer.seasons || [],
              };
              savedPlayers.push(existingPlayer);
              console.log(
                'Added existing player from response:',
                existingPlayer,
              );
            } else if (response.data.duplicatePlayerId) {
              const existingPlayer: Player = {
                ...player,
                _id: response.data.duplicatePlayerId,
                seasons: [],
              };
              savedPlayers.push(existingPlayer);
              console.log('Added player with duplicate ID:', existingPlayer);
            }
          } else if (response.data.player) {
            savedPlayers.push(response.data.player);
            console.log('New player created:', response.data.player);
          } else if (response.data) {
            savedPlayers.push(response.data);
            console.log('Added player from fallback response:', response.data);
          }
        } catch (error: any) {
          console.log('Axios error occurred:', error);

          if (error.response?.data?.error?.includes('already exists')) {
            console.log(
              'Duplicate player in error response:',
              error.response.data,
            );

            const responseData = error.response.data;
            const existingPlayer: Player = {
              ...player,
              _id:
                responseData.duplicatePlayerId ||
                responseData.existingPlayer?.id,
              fullName:
                responseData.existingPlayer?.fullName || player.fullName,
              seasons: responseData.existingPlayer?.seasons || [],
            };

            if (existingPlayer._id) {
              savedPlayers.push(existingPlayer);
              console.log('Added existing player from error:', existingPlayer);
            } else {
              console.warn(
                'Duplicate error but no player ID found:',
                responseData,
              );
              savedPlayers.push(player);
            }
            continue;
          }

          throw error;
        }
      }

      const existingPlayers = playersToSave.filter((p) => p._id);
      const allPlayers = [...existingPlayers, ...savedPlayers];

      console.log('Final saved players:', {
        total: allPlayers.length,
        players: allPlayers.map((p) => ({ id: p._id, name: p.fullName })),
      });

      setPlayers(allPlayers);
      setPlayersForTraining(allPlayers);
      updateFormData({ players: allPlayers });

      if (!immediatePaymentFlow && savedPlayers.length > 0) {
        try {
          await axios.post(
            `${API_BASE_URL}/auth/send-training-registration-email`,
            {
              parentId: parentId,
              playerIds: savedPlayers.map((p) => p._id),
              season: dynamicSeasonEvent.season,
              year: dynamicSeasonEvent.year,
              packageInfo: selectedPackage,
              playersData: savedPlayers.map((p) => ({
                fullName: p.fullName,
                grade: p.grade,
                gender: p.gender,
              })),
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            },
          );
          console.log('Training registration pending email sent');
        } catch (emailError) {
          console.error(
            'Failed to send training registration email:',
            emailError,
          );
        }
      }

      return allPlayers;
    } catch (error: any) {
      console.error('Error in savePlayerData:', error);

      let errorMessage = 'Failed to save player information';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      if (errorMessage.includes('already exists')) {
        console.log('Duplicate player error - continuing anyway');
        const existingPlayers = playersToSave.filter((p) => p._id);
        const partialPlayers = [...existingPlayers];
        setPlayers(partialPlayers);
        setPlayersForTraining(partialPlayers);
        updateFormData({ players: partialPlayers });
        return partialPlayers;
      }

      setFormError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // ✅ User registration completion
  const handleUserComplete = async (userData: any) => {
    try {
      const userDataToSave = userData.user || userData;
      const savedUser = await saveUserData(userDataToSave);

      if (!savedUser) {
        throw new Error('Failed to save user data');
      }

      setLocalSavedUserData(savedUser);
      setHasCompletedUserRegistration(true);

      setCurrentStep('playerSelect');
    } catch (error: any) {
      setFormError(error.message || 'Failed to save user information');
    }
  };

  // ✅ Handle player change from PlayerRegistrationModule
  const handlePlayersChange = (updatedPlayers: Player[]) => {
    setPlayers(updatedPlayers);
    updateFormData({ players: updatedPlayers });
  };

  // ✅ Handle player selection
  const handlePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  // ✅ Handle player validation change
  const handlePlayerValidationChange = (isValid: boolean) => {
    setPlayerValidation(isValid);
  };

  // ✅ Player selection completion - go to payment with package selection
  const handlePlayerComplete = async () => {
    setIsSubmitting(true);
    setFormError(null);

    console.log('🎯 Training: Starting player complete process...', {
      trainingSeason: dynamicSeasonEvent.season,
      trainingYear: dynamicSeasonEvent.year,
      playersCount: players.length,
      selectedPlayerIds,
      userPlayersCount: userPlayers?.length || 0,
    });

    // Validate we have players to save
    const hasPlayers = players.length > 0 || selectedPlayerIds.length > 0;
    if (!hasPlayers) {
      setFormError('Please add at least one player');
      setIsSubmitting(false);
      window.scrollTo(0, 0);
      return;
    }

    try {
      const unpaidPlayers = getUnpaidPlayers();
      const paidPlayers = getPaidPlayersForTraining();

      console.log('🎯 Training: Players analysis:', {
        trainingSeason: dynamicSeasonEvent.season,
        trainingYear: dynamicSeasonEvent.year,
        totalUserPlayers: userPlayers?.length || 0,
        unpaidPlayersCount: unpaidPlayers.length,
        paidPlayersCount: paidPlayers.length,
        selectedPlayerIds,
        selectedUnpaidPlayers: selectedPlayerIds.filter((id) =>
          unpaidPlayers.some((p) => p._id === id),
        ).length,
        selectedPaidPlayers: selectedPlayerIds.filter((id) =>
          paidPlayers.some((p) => p._id === id),
        ).length,
        newPlayers: players.filter((p) => !p._id && p.fullName?.trim()).length,
      });

      const alreadyPaidSelectedPlayers = selectedPlayerIds.filter((id) =>
        paidPlayers.some((p) => p._id === id),
      );

      if (alreadyPaidSelectedPlayers.length > 0) {
        console.warn(
          '⚠️ Some selected players are already paid for training:',
          alreadyPaidSelectedPlayers,
        );
      }

      const playersToSave = players.filter((p) => !p._id);
      let allPlayers: Player[] = [...players];

      if (playersToSave.length > 0) {
        try {
          const savedPlayers = await savePlayerData(playersToSave);
          const existingPlayerIds = new Set(
            players.filter((p) => p._id).map((p) => p._id),
          );
          const newSavedPlayers = savedPlayers.filter(
            (p) => !existingPlayerIds.has(p._id),
          );
          allPlayers = [...players.filter((p) => p._id), ...newSavedPlayers];
        } catch (error: any) {
          if (error.message?.includes('already exists')) {
            console.log(
              'Duplicate player error - continuing with existing players',
            );
            allPlayers = players;
          } else {
            throw error;
          }
        }
      }

      const selectedExistingPlayers =
        userPlayers?.filter((p) => selectedPlayerIds.includes(p._id!)) || [];

      const existingPlayerIds = new Set(allPlayers.map((p) => p._id));
      const uniqueSelectedPlayers = selectedExistingPlayers.filter(
        (p) => !existingPlayerIds.has(p._id!),
      );

      const finalPlayers = [...allPlayers, ...uniqueSelectedPlayers];
      const validPlayers = finalPlayers.filter((p) => p.fullName?.trim());

      if (validPlayers.length === 0) {
        throw new Error('No valid players to register');
      }

      const playersForPayment = validPlayers.filter((player) => {
        if (!player.seasons || player.seasons.length === 0) {
          console.log(
            `✅ Player ${player.fullName} has no seasons - eligible for payment`,
          );
          return true;
        }

        // Check if player has paid for THIS EXACT training/camp season
        const hasPaidForThisExactTraining = player.seasons.some(
          (season: SeasonRegistration) => {
            // Check if this is a training/camp program
            const isTrainingOrCampSeason =
              season.season === 'Basketball Training' ||
              season.season.toLowerCase().includes('training') ||
              season.season.toLowerCase().includes('camp') ||
              season.season.toLowerCase().includes('clinic');

            if (!isTrainingOrCampSeason) {
              // Skip non-training seasons (like tryouts)
              return false;
            }

            const exactSeasonMatch =
              season.season === dynamicSeasonEvent.season;
            const exactYearMatch = season.year === dynamicSeasonEvent.year;
            const isPaid =
              season.paymentStatus === 'paid' ||
              season.paymentComplete === true;

            if (exactSeasonMatch && exactYearMatch) {
              console.log(`🔍 Player ${player.fullName} training/camp check:`, {
                seasonInDB: season.season,
                currentSeason: dynamicSeasonEvent.season,
                yearInDB: season.year,
                currentYear: dynamicSeasonEvent.year,
                tryoutIdInDB: season.tryoutId,
                currentEventId: dynamicSeasonEvent.eventId,
                isPaid,
                paymentStatus: season.paymentStatus,
                exactMatch: true,
              });
            }

            return exactSeasonMatch && exactYearMatch && isPaid;
          },
        );

        console.log(`📊 Player ${player.fullName} eligibility:`, {
          hasPaidForThisExactTraining,
          isEligible: !hasPaidForThisExactTraining,
          seasonsCount: player.seasons?.length || 0,
        });

        return !hasPaidForThisExactTraining;
      });

      console.log('🎯 Final players for training payment:', {
        trainingSeason: dynamicSeasonEvent.season,
        trainingYear: dynamicSeasonEvent.year,
        totalValidPlayers: validPlayers.length,
        playersForPayment: playersForPayment.length,
        players: playersForPayment.map((p) => ({
          id: p._id,
          name: p.fullName,
        })),
      });

      if (playersForPayment.length === 0) {
        throw new Error(
          `All selected players have already paid for ${dynamicSeasonEvent.season} ${dynamicSeasonEvent.year} training. Please select different players or add new players.`,
        );
      }

      setPlayersForTraining(playersForPayment);
      setCurrentStep('payment');
    } catch (error: any) {
      console.error('Error in handlePlayerComplete:', error);
      setFormError(error.message || 'Failed to save player information');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'verifyEmail':
        setCurrentStep('account');
        break;
      case 'user':
        setCurrentStep(
          hasCompletedUserRegistration ? 'playerSelect' : 'verifyEmail',
        );
        break;
      case 'playerSelect':
        setCurrentStep('user');
        break;
      case 'payment':
        setCurrentStep('playerSelect');
        break;
    }
  };

  const handlePaymentComplete = (successData: any) => {
    console.log('Payment complete with data:', successData);

    setPaymentSuccessData(successData);
    setRegistrationTimestamp(new Date().toLocaleString());
    setCurrentStep('success');

    console.log('Stored payment data:', {
      amount: successData.amount,
      totalAmount: successData.totalAmount,
      playerCount: successData.playerCount,
      players: successData.players,
    });

    if (successData.players && successData.players.length > 0) {
      const updatedPlayers = playersForTraining.map((player) => {
        const paidPlayer = successData.players.find(
          (p: any) => p._id === player._id,
        );
        if (paidPlayer) {
          return {
            ...player,
            paymentStatus: 'paid',
            paymentComplete: true,
            seasons: paidPlayer.seasons || player.seasons,
          };
        }
        return player;
      });
      setPlayersForTraining(updatedPlayers);
    }
  };

  const handleComplete = () => {
    if (onSuccess) {
      onSuccess(formData);
    } else {
      navigate(routes.adminDashboard);
    }
  };

  const handleAddMorePlayers = () => {
    setCurrentStep('playerSelect');
  };

  // Get paid and unpaid players for PlayerRegistrationModule
  const paidPlayersForTraining = getPaidPlayersForTraining();
  const unpaidPlayersForTraining = getUnpaidPlayers();

  // ✅ Create the props object for PlayerRegistrationModule
  const playerModuleProps = {
    players: players,
    onPlayersChange: handlePlayersChange,
    registrationYear: dynamicSeasonEvent.year,
    season: dynamicSeasonEvent.season,
    isExistingUser:
      isExistingUser || isAuthenticated || hasCompletedUserRegistration,
    existingPlayers: getUnpaidPlayers(),
    paidPlayers: getPaidPlayersForTraining(),
    onValidationChange: handlePlayerValidationChange,
    showCheckboxes: isAuthenticated && userPlayers && userPlayers.length > 0,
    selectedPlayerIds,
    onPlayerSelection: handlePlayerSelection,
    onPaymentCalculation: () => {},
    onComplete: handlePlayerComplete,
    onBack: handleBack,
    parentId: localSavedUserData?._id || currentUser?._id,
    authToken: localStorage.getItem('token') || undefined,
    allowMultiple: true,
    requiresPayment: true,
  };

  // ✅ Render player selection step using PlayerRegistrationModule
  const renderPlayerSelectionStep = () => {
    return (
      <div className='player-step-container'>
        <PlayerRegistrationModule {...playerModuleProps} />
      </div>
    );
  };

  // Render package selection as part of payment step
  const renderPackageSelection = () => {
    const paidPlayers = paidPlayersForTraining;
    const unpaidPlayers = unpaidPlayersForTraining;
    const selectedUnpaidPlayers = selectedPlayerIds.filter((id) =>
      unpaidPlayers.some((p) => p._id === id),
    );
    const newPlayersCount = players.filter(
      (p) => !p._id && p.fullName?.trim(),
    ).length;
    const totalSelectedCount = selectedUnpaidPlayers.length + newPlayersCount;

    const packages = defaultFormConfig.pricing.packages;
    const packageCount = packages.length;

    // Determine grid layout based on number of packages
    const getGridClass = () => {
      if (packageCount === 1) {
        // Single package - take full width
        return 'col-12';
      } else if (packageCount === 2) {
        // Two packages - 2 columns
        return 'col-md-6';
      } else if (packageCount === 3) {
        // Three packages - 3 columns
        return 'col-md-4';
      } else if (packageCount === 4) {
        // Four packages - 2 rows, 2 columns each
        return 'col-md-6';
      } else if (packageCount <= 6) {
        // 5-6 packages - 2 rows, 3 columns each
        return 'col-md-4';
      } else {
        // More than 6 packages - 3 columns
        return 'col-md-4';
      }
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
          <div className='alert alert-info mb-4'>
            <i className='ti ti-info-circle me-2'></i>
            <strong>Choose a Training Package</strong>
            <p className='mb-0 mt-2'>
              Please select a package. The price will be multiplied by the
              number of players.
            </p>
          </div>

          <div className='row'>
            {packages.map((pkg) => {
              const totalPrice = pkg.price * totalSelectedCount;
              const gridClass = getGridClass();

              return (
                <div key={pkg.id} className={`${gridClass} mb-3`}>
                  <div
                    className={`card border h-100 ${
                      selectedPackage?.id === pkg.id ? 'border-primary' : ''
                    }`}
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
                        <p className='text-muted small mb-0 mt-2'>
                          {pkg.description}
                        </p>
                      )}
                      {totalSelectedCount > 0 && (
                        <div className='mt-auto pt-3'>
                          <div className='text-muted small'>
                            <i className='ti ti-users me-1'></i>
                            For {totalSelectedCount} player
                            {totalSelectedCount !== 1 ? 's' : ''}:
                          </div>
                          <div className='fw-bold'>${totalPrice} total</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!selectedPackage && (
            <div className='alert alert-warning mt-3'>
              <i className='ti ti-alert-triangle me-2'></i>
              Please select a training package to continue
            </div>
          )}
        </div>
      </div>
    );
  };

  // ✅ Render success message with receipt
  const renderSuccessMessage = () => {
    const paidPlayers = paidPlayersForTraining;
    const newlyRegisteredPlayers = playersForTraining.filter(
      (p) => !paidPlayers.some((paid) => paid._id === p._id),
    );

    const actualPaymentAmount =
      paymentSuccessData?.amount || calculatePaymentAmount();
    const actualTotalAmount =
      paymentSuccessData?.totalAmount || actualPaymentAmount / 100;
    const actualSelectedPackage =
      selectedPackage ||
      defaultFormConfig.pricing.packages.find(
        (pkg) => pkg.price === actualTotalAmount / getEffectivePlayerCount(),
      );

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
                    <p className='mb-1'>
                      <strong>Registration Date:</strong>
                    </p>
                    <p>{registrationTimestamp}</p>
                  </div>
                  <div className='col-md-6'>
                    <p className='mb-1'>
                      <strong>Program:</strong>
                    </p>
                    <p>
                      {dynamicSeasonEvent.season} {dynamicSeasonEvent.year}
                    </p>
                  </div>
                </div>

                <div className='row mb-3'>
                  <div className='col-md-6'>
                    <p className='mb-1'>
                      <strong>Package:</strong>
                    </p>
                    <p>
                      {actualSelectedPackage?.name ||
                        selectedPackage?.name ||
                        'Training Package'}
                    </p>
                  </div>
                  <div className='col-md-6'>
                    <p className='mb-1'>
                      <strong>Amount Paid:</strong>
                    </p>
                    <p className='h5 text-success'>
                      ${actualTotalAmount.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className='mb-3'>
                  <p className='mb-1'>
                    <strong>Parent/Guardian:</strong>
                  </p>
                  <p>
                    {localSavedUserData?.fullName ||
                      currentUser?.fullName ||
                      'Not specified'}
                  </p>
                </div>

                <div className='mb-3'>
                  <p className='mb-1'>
                    <strong>Players Registered for Training:</strong>
                  </p>

                  {paidPlayers.length > 0 && (
                    <div className='mb-3'>
                      <p className='text-muted small mb-1'>
                        Already Registered (Previously Paid):
                      </p>
                      <ul className='list-group mb-3'>
                        {paidPlayers.map((player, index) => (
                          <li
                            key={`paid-${index}`}
                            className='list-group-item d-flex justify-content-between'
                          >
                            <div>
                              <strong>{player.fullName}</strong>
                              <div className='text-muted small'>
                                {player.grade} Grade • {player.gender} •{' '}
                                {player.schoolName || 'School not specified'}
                              </div>
                            </div>
                            <span className='badge bg-success'>
                              Already Paid
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {newlyRegisteredPlayers.length > 0 && (
                    <div>
                      <p className='text-muted small mb-1'>Newly Registered:</p>
                      <ul className='list-group'>
                        {newlyRegisteredPlayers.map((player, index) => (
                          <li
                            key={`new-${index}`}
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
                  )}
                </div>

                <div className='mb-3'>
                  <p className='mb-1'>
                    <strong>Next Steps:</strong>
                  </p>
                  <div className='alert alert-info'>
                    <ul className='mb-0'>
                      <li>
                        <i className='ti ti-calendar text-primary me-2'></i>
                        <strong>Training schedule</strong> will be emailed to
                        you
                      </li>
                      <li className='mt-2'>
                        <i className='ti ti-user text-primary me-2'></i>
                        <strong>Add more players</strong> - You can still add
                        additional players to your account
                      </li>
                      <li className='mt-2'>
                        <i className='ti ti-bell-ringing text-primary me-2'></i>
                        <strong>Get notifications</strong> - You'll receive
                        training updates
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
              <i className='ti ti-plus me-2'></i>
              Add More Players
            </button>
            <button
              type='button'
              className='btn btn-primary'
              onClick={handleComplete}
            >
              <i className='ti ti-home me-2'></i>
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Show loading state
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
        <h2 className='mt-3'>Registration</h2>
        <p>
          {currentStep === 'success'
            ? 'Your players have been successfully registered for training!'
            : ''}
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

          {currentStep === 'playerSelect' && renderPlayerSelectionStep()}

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
                onPaymentSuccess={(paymentResult) => {
                  console.log('Payment successful:', paymentResult);
                  handlePaymentComplete(paymentResult);
                }}
                onPaymentError={(error) => setFormError(error)}
                description={`${dynamicSeasonEvent.season} - ${
                  selectedPackage?.name || 'Training'
                }`}
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
                onPaymentComplete={(successData) => {
                  const completeSuccessData = {
                    ...successData,
                    amount: calculatePaymentAmount(),
                    totalAmount: calculatePaymentAmount() / 100,
                    playerCount: getEffectivePlayerCount(),
                    selectedPackage: selectedPackage,
                  };
                  handlePaymentComplete(completeSuccessData);
                }}
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
