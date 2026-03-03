import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  SeasonRegistration,
  TryoutSpecificConfig,
} from '../../../types/registration-types';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import axios from 'axios';

interface TryoutRegistrationFormProps {
  onSuccess?: (data?: any) => void;
  formConfig?: RegistrationFormConfig;
  tryoutConfig?: TryoutSpecificConfig;
  seasonEvent?: SeasonEvent;
  isExistingUser?: boolean;
  existingPlayers?: Player[];
  savedUserData?: any;
  savedPlayers?: Player[];
  skipToPlayerStep?: boolean;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Helper function to check if config is a tryout config
const isTryoutConfig = (config: any): config is TryoutSpecificConfig => {
  return config && typeof config === 'object' && 'tryoutName' in config;
};

const TryoutRegistrationForm: React.FC<TryoutRegistrationFormProps> = ({
  onSuccess,
  formConfig,
  tryoutConfig: propTryoutConfig,
  seasonEvent,
  isExistingUser = false,
  existingPlayers = [],
  savedUserData,
  savedPlayers = [],
  skipToPlayerStep = false,
}) => {
  const {
    isAuthenticated,
    isLoading: authLoading,
    user: currentUser,
    createTempAccount,
    checkAuth,
    players: userPlayers,
  } = useAuth();

  // State for loaded tryout config
  const [loadedTryoutConfig, setLoadedTryoutConfig] =
    useState<TryoutSpecificConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Player states
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [playerValidation, setPlayerValidation] = useState(false);
  const [playersForTryout, setPlayersForTryout] = useState<Player[]>([]);

  // Other states
  const [currentStep, setCurrentStep] = useState<
    'account' | 'verifyEmail' | 'user' | 'player' | 'payment' | 'success'
  >('account');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any>(null);
  const [hasCompletedUserRegistration, setHasCompletedUserRegistration] =
    useState(isAuthenticated || !!savedUserData);
  const [savedUserDataState, setSavedUserDataState] =
    useState<any>(savedUserData);
  const [registrationTimestamp, setRegistrationTimestamp] =
    useState<string>('');

  const defaultSeasonEvent = useMemo(() => {
    const currentYear = new Date().getFullYear();

    if (propTryoutConfig) {
      return {
        season: propTryoutConfig.tryoutName,
        year: propTryoutConfig.tryoutYear,
        eventId:
          propTryoutConfig.eventId || `tryout-${propTryoutConfig.tryoutYear}`,
      };
    }

    // Use seasonEvent if available
    if (seasonEvent) {
      return {
        season: seasonEvent.season,
        year: seasonEvent.year,
        eventId: seasonEvent.eventId,
      };
    }

    // Fallback
    return {
      season: 'Spring Tryout 2026',
      year: currentYear,
      eventId: `tryout-${currentYear}`,
    };
  }, [propTryoutConfig, seasonEvent]);

  // Load tryout configuration
  useEffect(() => {
    const loadTryoutConfig = async () => {
      if (propTryoutConfig) {
        setLoadedTryoutConfig(propTryoutConfig);
        return;
      }

      if (seasonEvent?.season && seasonEvent?.year) {
        setIsLoadingConfig(true);
        setConfigError(null);

        try {
          const response = await fetch(
            `${API_BASE_URL}/admin/tryout-configs/${encodeURIComponent(
              seasonEvent.season,
            )}/${seasonEvent.year}`,
          );

          if (response.ok) {
            const config = await response.json();
            setLoadedTryoutConfig(config);
          } else if (response.status === 404) {
            setLoadedTryoutConfig(null);
          } else {
            const errorData = await response.json();
            throw new Error(
              errorData.message || 'Failed to load tryout config',
            );
          }
        } catch (error) {
          console.error('Error loading tryout config:', error);
          setConfigError('Unable to load tryout configuration.');
          setLoadedTryoutConfig(null);
        } finally {
          setIsLoadingConfig(false);
        }
      }
    };

    loadTryoutConfig();
  }, [seasonEvent, propTryoutConfig]);

  // Default tryout config
  const effectiveTryoutConfig = useMemo(() => {
    if (loadedTryoutConfig) return loadedTryoutConfig;
    if (propTryoutConfig) return propTryoutConfig;

    return {
      tryoutName: defaultSeasonEvent.season,
      tryoutYear: defaultSeasonEvent.year,
      displayName: '',
      registrationDeadline: '',
      tryoutDates: [],
      locations: ['TBD'],
      divisions: [],
      ageGroups: [],
      requiresPayment: true,
      requiresRoster: false,
      requiresInsurance: true,
      paymentDeadline: '',
      refundPolicy: 'No refunds after tryout registration deadline',
      tryoutFee: 50,
      isActive: true,
    };
  }, [loadedTryoutConfig, propTryoutConfig, defaultSeasonEvent]);

  const defaultFormConfig: RegistrationFormConfig = useMemo(
    () => ({
      isActive: true,
      requiresPayment: effectiveTryoutConfig.requiresPayment,
      requiresQualification: false,
      pricing: {
        basePrice: effectiveTryoutConfig.tryoutFee || 50,
        packages: [],
      },
      ...formConfig,
    }),
    [formConfig, effectiveTryoutConfig],
  );

  // Define steps
  const [steps] = useState<any[]>(() => {
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
      { id: 'player', label: 'Player Info', number: 4, icon: 'ti ti-users' },
      { id: 'payment', label: 'Payment', number: 5, icon: 'ti ti-credit-card' },
    ];

    if (isAuthenticated) {
      return allSteps
        .filter((step) => step.id !== 'account' && step.id !== 'verifyEmail')
        .map((step, index) => ({ ...step, number: index + 1 }));
    }

    return allSteps;
  });

  // ✅ Initialize step
  useEffect(() => {
    if (authLoading || isLoadingConfig) return;

    if (skipToPlayerStep) {
      setCurrentStep('player');
    } else if (
      isExistingUser ||
      isAuthenticated ||
      hasCompletedUserRegistration
    ) {
      setCurrentStep('player');
    } else {
      setCurrentStep('account');
    }
  }, [
    authLoading,
    isLoadingConfig,
    isExistingUser,
    isAuthenticated,
    hasCompletedUserRegistration,
    skipToPlayerStep,
  ]);

  // ✅ Initialize formData with correct season
  const [formData, setFormData] = useState<FormData>({
    eventData: {
      season: defaultSeasonEvent.season,
      year: defaultSeasonEvent.year,
      eventId: defaultSeasonEvent.eventId,
    },
  });

  // Update formData when seasonEvent changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      eventData: {
        season: defaultSeasonEvent.season,
        year: defaultSeasonEvent.year,
        eventId: defaultSeasonEvent.eventId,
      },
    }));
  }, [defaultSeasonEvent]);

  // ✅ Initialize players with correct season
  useEffect(() => {
    if (savedPlayers && savedPlayers.length > 0) {
      setPlayers(savedPlayers);
    } else if (currentStep === 'player' && players.length === 0) {
      console.log('🔍 Player initialization check:', {
        userPlayersLength: userPlayers?.length,
        currentPlayersLength: players.length,
        currentStep,
      });

      // Check if user already has any players in their account
      const userHasExistingPlayers = userPlayers && userPlayers.length > 0;

      if (!userHasExistingPlayers) {
        // Only show blank form if user doesn't have any existing players
        const blankPlayer: Player = {
          fullName: '',
          gender: '',
          dob: '',
          schoolName: '',
          healthConcerns: '',
          aauNumber: '',
          registrationYear: defaultSeasonEvent.year,
          season: defaultSeasonEvent.season,
          grade: '',
        };
        setPlayers([blankPlayer]);
        console.log('🆕 Created blank player form for first-time registration');
      }
    }
  }, [
    currentStep,
    players.length,
    defaultSeasonEvent.year,
    defaultSeasonEvent.season,
    savedPlayers,
    userPlayers,
  ]);

  const updateFormData = (newData: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const getPaidPlayersForTryout = useCallback((): Player[] => {
    if (!userPlayers) return [];

    const tryoutSeason = defaultSeasonEvent.season;
    const tryoutYear = defaultSeasonEvent.year;
    const tryoutEventId = defaultSeasonEvent.eventId;

    console.log('🔍 Tryout: Checking paid players for:', {
      tryoutSeason,
      tryoutYear,
      tryoutEventId,
      totalPlayers: userPlayers.length,
    });

    return userPlayers.filter((player) => {
      const hasPaidForThisTryout = player.seasons?.some(
        (season: SeasonRegistration) => {
          // Check for exact season name match (case-sensitive)
          const exactSeasonMatch = season.season === tryoutSeason;
          const exactYearMatch = season.year === tryoutYear;
          const isPaid =
            season.paymentStatus === 'paid' || season.paymentComplete === true;

          const result = exactSeasonMatch && exactYearMatch && isPaid;

          if (result) {
            console.log(`✅ Player ${player.fullName} paid for this tryout:`, {
              seasonInDB: season.season,
              yearInDB: season.year,
              currentSeason: tryoutSeason,
              currentYear: tryoutYear,
              paymentStatus: season.paymentStatus,
            });
          }

          return result;
        },
      );

      return hasPaidForThisTryout;
    });
  }, [
    userPlayers,
    defaultSeasonEvent.season,
    defaultSeasonEvent.year,
    defaultSeasonEvent.eventId,
  ]);

  // ✅ Get unpaid players (those not already paid for this specific tryout)
  const getUnpaidPlayers = useCallback((): Player[] => {
    if (!userPlayers) return [];

    const paidPlayers = getPaidPlayersForTryout();
    const paidPlayerIds = new Set(paidPlayers.map((p) => p._id));

    // Return players who are NOT in the paid list
    const unpaidPlayers = userPlayers.filter(
      (player) => !paidPlayerIds.has(player._id),
    );

    console.log('🔍 Tryout Players Status:', {
      tryoutSeason: defaultSeasonEvent.season,
      tryoutYear: defaultSeasonEvent.year,
      totalUserPlayers: userPlayers.length,
      paidPlayersCount: paidPlayers.length,
      unpaidPlayersCount: unpaidPlayers.length,
      paidPlayers: paidPlayers.map((p) => ({
        id: p._id,
        name: p.fullName,
        seasons:
          p.seasons?.filter((s) => s.season === defaultSeasonEvent.season) ||
          [],
      })),
      unpaidPlayers: unpaidPlayers.map((p) => ({
        id: p._id,
        name: p.fullName,
      })),
    });

    return unpaidPlayers;
  }, [
    userPlayers,
    getPaidPlayersForTryout,
    defaultSeasonEvent.season,
    defaultSeasonEvent.year,
  ]);

  // ✅ Calculate player count for payment
  const getEffectivePlayerCount = useCallback((): number => {
    console.log('🔍 Tryout: Calculating effective player count:', {
      tryoutSeason: defaultSeasonEvent.season,
      tryoutYear: defaultSeasonEvent.year,
      selectedPlayerIdsCount: selectedPlayerIds.length,
      playersCount: players.length,
      playersForTryoutCount: playersForTryout.length,
    });

    // If playersForTryout is set, use it
    if (playersForTryout.length > 0) {
      console.log('✅ Using playersForTryout count:', playersForTryout.length);
      return playersForTryout.length;
    }

    // Count selected existing UNPAID players + new players
    const selectedUnpaidPlayers = selectedPlayerIds.filter((playerId) => {
      const player = userPlayers?.find((p) => p._id === playerId);
      if (!player) return false;

      // Check if player is already paid for THIS SPECIFIC tryout
      const isPaid = player.seasons?.some((season: SeasonRegistration) => {
        const exactSeasonMatch = season.season === defaultSeasonEvent.season;
        const exactYearMatch = season.year === defaultSeasonEvent.year;
        const isPaidStatus =
          season.paymentStatus === 'paid' || season.paymentComplete === true;

        return exactSeasonMatch && exactYearMatch && isPaidStatus;
      });

      return !isPaid;
    });

    const newPlayersCount = players.filter(
      (p) => !p._id && p.fullName?.trim(),
    ).length;
    const total = selectedUnpaidPlayers.length + newPlayersCount;

    console.log('🔍 Fallback calculation:', {
      selectedUnpaidPlayers: selectedUnpaidPlayers.length,
      newPlayersCount,
      total,
    });

    return total;
  }, [
    selectedPlayerIds,
    players,
    userPlayers,
    defaultSeasonEvent.season,
    defaultSeasonEvent.year,
    playersForTryout,
  ]);

  const calculatePaymentAmount = (): number => {
    const playerCount = getEffectivePlayerCount();
    return (effectiveTryoutConfig.tryoutFee || 50) * 100 * playerCount;
  };

  // Event handlers
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
      console.log('Creating account for tryout:', email);

      if (!createTempAccount) {
        throw new Error('createTempAccount function not available');
      }

      await createTempAccount(email, password);
      localStorage.setItem('pendingEmail', email);
      updateFormData({ tempAccount: { email, password } });
      setIsVerificationSent(true);
      setCurrentStep('verifyEmail');
    } catch (error: any) {
      console.error('Error creating account:', error);
      setFormError(error.message || 'Failed to create account');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerified = () => {
    setCurrentStep('user');
  };

  const handleUserComplete = async (userData: any) => {
    try {
      const userDataToSave = userData.user || userData;
      const savedUser = await saveUserData(userDataToSave);

      if (!savedUser) {
        throw new Error('Failed to save user data');
      }

      setSavedUserDataState(savedUser);
      updateFormData({ user: savedUser });
      setHasCompletedUserRegistration(true);
      setCurrentStep('player');
    } catch (error: any) {
      console.error('Error saving user data:', error);
      setFormError(error.message || 'Failed to save user information');
    }
  };

  // Save user data function
  const saveUserData = async (userData: any): Promise<any> => {
    try {
      const token = localStorage.getItem('token');
      const parentId = savedUserDataState?._id || currentUser?._id;

      // If authenticated, just return the current user data
      if (isAuthenticated && token && parentId) {
        return savedUserDataState || currentUser;
      }

      const password = userData.password || formData.tempAccount?.password;
      if (!password && !isAuthenticated) {
        throw new Error('Password is required for new user registration');
      }

      const normalizedAddress = {
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
          userData.additionalGuardians?.map((guardian: any) => ({
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

      const response = await axios.post(
        `${API_BASE_URL}/register`,
        registrationData,
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('parentId', response.data.parent._id);
        localStorage.setItem('parent', JSON.stringify(response.data.parent));

        if (checkAuth) {
          await checkAuth();
        }
      }

      const savedData =
        response.data.user || response.data.parent || response.data;
      if (response.data.parent?._id && !savedData._id) {
        savedData._id = response.data.parent._id;
      }
      return savedData;
    } catch (error: any) {
      console.error('Error saving user data:', error);
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  };

  const handlePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  const handlePlayersChange = (updatedPlayers: Player[]) => {
    console.log('Players changed:', updatedPlayers.length);
    setPlayers(updatedPlayers);
    updateFormData({ players: updatedPlayers });
  };

  const handlePlayerValidationChange = (isValid: boolean) => {
    setPlayerValidation(isValid);
  };

  const handlePlayerComplete = async () => {
    console.log('🎯 TRYOUT: handlePlayerComplete called');

    // Build final players array
    const finalPlayers: Player[] = [];

    // 1. Add selected existing players
    if (selectedPlayerIds.length > 0 && userPlayers) {
      console.log(
        '🔄 Adding selected existing players:',
        selectedPlayerIds.length,
      );
      selectedPlayerIds.forEach((playerId) => {
        const player = userPlayers.find((p) => p._id === playerId);
        if (player) {
          console.log('✅ Adding selected player:', player.fullName);
          finalPlayers.push({
            ...player,
            registrationYear: defaultSeasonEvent.year,
            season: defaultSeasonEvent.season, // ✅ Use correct tryout name
          });
        }
      });
    }

    // 2. Add new players (without IDs)
    const newPlayers = players.filter((p) => !p._id && p.fullName?.trim());
    console.log('🔄 Adding new players:', newPlayers.length);
    finalPlayers.push(...newPlayers);

    // 3. Add existing players in state that aren't selected
    const existingPlayersInState = players.filter(
      (p) => p._id && !selectedPlayerIds.includes(p._id!),
    );
    console.log(
      '🔄 Adding existing players in state:',
      existingPlayersInState.length,
    );
    finalPlayers.push(...existingPlayersInState);

    // Filter valid players
    const validPlayers = finalPlayers.filter((p) => p.fullName?.trim());

    console.log('🔍 Players before saving:', {
      tryoutSeason: defaultSeasonEvent.season,
      tryoutYear: defaultSeasonEvent.year,
      total: validPlayers.length,
      players: validPlayers.map((p) => ({
        id: p._id || 'NEW',
        name: p.fullName,
        season: p.season,
      })),
    });

    if (validPlayers.length === 0) {
      alert('Please select or add at least one player to continue.');
      return;
    }

    try {
      // Save new players to get their IDs before payment
      console.log('💾 Saving players before payment...');
      const savedPlayers = await savePlayerData(validPlayers, true);

      // Filter out any players that still don't have IDs
      const playersWithIds = savedPlayers.filter((p) => p._id);

      if (playersWithIds.length === 0) {
        throw new Error('No valid players with IDs found for registration.');
      }

      // SET PLAYERS FOR TRYOUT WITH PROPER IDs
      setPlayersForTryout(playersWithIds);

      // Also update other states for consistency
      setPlayers(playersWithIds);
      updateFormData({ players: playersWithIds });

      // Log what we're about to pass to PaymentModule
      console.log('🚀 Moving to payment step with:', {
        tryoutSeason: defaultSeasonEvent.season,
        tryoutYear: defaultSeasonEvent.year,
        playersForTryoutCount: playersWithIds.length,
        players: playersWithIds.map((p) => ({
          id: p._id,
          name: p.fullName,
          season: p.season,
        })),
      });

      if (effectiveTryoutConfig.requiresPayment) {
        setCurrentStep('payment');
      } else {
        handleComplete();
      }
    } catch (error: any) {
      console.error('❌ Error saving players:', error);
      setFormError(
        error.message || 'Failed to save player information. Please try again.',
      );
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'verifyEmail':
        setCurrentStep('account');
        break;
      case 'user':
        setCurrentStep('verifyEmail');
        break;
      case 'player':
        setCurrentStep('user');
        break;
      case 'payment':
        setCurrentStep('player');
        break;
    }
  };

  const savePlayerData = async (
    playersToSave: Player[],
    immediatePaymentFlow = false,
  ): Promise<Player[]> => {
    try {
      const token = localStorage.getItem('token');
      const parentId = savedUserDataState?._id || currentUser?._id;

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
          registrationYear: defaultSeasonEvent.year,
          season: defaultSeasonEvent.season, // ✅ Use correct tryout name
          parentId: parentId,
          grade: player.grade || '',
          isGradeOverridden: player.isGradeOverridden || false,
          immediatePaymentFlow: immediatePaymentFlow,
          skipSeasonRegistration: true,
          registrationType: 'tryout',
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

      // Combine saved players with existing players (those with IDs)
      const existingPlayers = playersToSave.filter((p) => p._id);
      const allPlayers = [...existingPlayers, ...savedPlayers];

      console.log('Final saved players for tryout:', {
        total: allPlayers.length,
        players: allPlayers.map((p) => ({
          id: p._id,
          name: p.fullName,
          season: p.season,
        })),
      });

      return allPlayers;
    } catch (error: any) {
      console.error('Error in savePlayerData:', error);
      throw error;
    }
  };

  const handlePaymentComplete = (successData: any) => {
    console.log('Tryout payment successful:', successData);
    setPaymentSuccessData(successData);
    setRegistrationTimestamp(new Date().toLocaleString());
    setCurrentStep('success');
  };

  const handleComplete = () => {
    onSuccess?.(formData);
  };

  // ✅ Render success message
  const renderSuccessMessage = () => {
    const paidPlayers = getPaidPlayersForTryout();
    const newlyRegisteredPlayers = playersForTryout.filter(
      (p) => !paidPlayers.some((paid) => paid._id === p._id),
    );

    return (
      <div className='card border-0 shadow-sm'>
        <div className='card-header'>
          <h4 className='mb-0'>🎉 Tryout Registration Complete!</h4>
        </div>
        <div className='card-body'>
          <div className='text-center py-4'>
            <i className='ti ti-circle-check fs-1 text-success mb-3'></i>
            <h3>Tryout Registration Successful!</h3>
            <p className='text-muted'>
              Your players have been registered for the{' '}
              {effectiveTryoutConfig.tryoutName}{' '}
              {effectiveTryoutConfig.tryoutYear} tryout.
            </p>
          </div>

          <div className='receipt-card mb-4'>
            <div className='card border'>
              <div className='card-header bg-light'>
                <h5 className='mb-0'>Tryout Registration Receipt</h5>
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
                      <strong>Tryout:</strong>
                    </p>
                    <p>
                      {effectiveTryoutConfig.tryoutName}{' '}
                      {effectiveTryoutConfig.tryoutYear}
                    </p>
                  </div>
                </div>

                <div className='row mb-3'>
                  <div className='col-md-6'>
                    <p className='mb-1'>
                      <strong>Tryout Fee per Player:</strong>
                    </p>
                    <p>${effectiveTryoutConfig.tryoutFee}</p>
                  </div>
                  <div className='col-md-6'>
                    <p className='mb-1'>
                      <strong>Amount Paid:</strong>
                    </p>
                    <p className='h5 text-success'>
                      ${(calculatePaymentAmount() / 100).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className='mb-3'>
                  <p className='mb-1'>
                    <strong>Parent/Guardian:</strong>
                  </p>
                  <p>
                    {savedUserDataState?.fullName ||
                      currentUser?.fullName ||
                      'Not specified'}
                  </p>
                </div>

                <div className='mb-3'>
                  <p className='mb-1'>
                    <strong>Players Registered for Tryout:</strong>
                  </p>

                  {newlyRegisteredPlayers.length > 0 && (
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
                        <strong>Tryout schedule:</strong>{' '}
                        {effectiveTryoutConfig.tryoutDates
                          .map((date) => new Date(date).toLocaleDateString())
                          .join(', ')}
                      </li>
                      <li className='mt-2'>
                        <i className='ti ti-map-pin text-primary me-2'></i>
                        <strong>Location:</strong>{' '}
                        {effectiveTryoutConfig.locations.join(', ')}
                      </li>
                      <li className='mt-2'>
                        <i className='ti ti-bell-ringing text-primary me-2'></i>
                        <strong>Get notifications</strong> - You'll receive
                        tryout updates
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='text-center'>
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

  // Render functions
  const renderTryoutInfo = () => {
    if (isLoadingConfig) {
      return (
        <div className='card mb-4'>
          <div className='card-body text-center'>
            <LoadingSpinner />
            <p className='mt-2'>Loading tryout information...</p>
          </div>
        </div>
      );
    }

    if (configError) {
      return (
        <div className='alert alert-warning mb-4'>
          <i className='ti ti-alert-triangle me-2'></i>
          {configError}
        </div>
      );
    }

    return (
      <div className='card mb-4'>
        <div className='card-header bg-light'>
          <div className='d-flex align-items-center'>
            <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
              <i className='ti ti-target-arrow fs-16' />
            </span>
            <h4 className='text-dark'>{effectiveTryoutConfig.tryoutName} </h4>
          </div>
        </div>
        <div className='card-body'>
          <div className='row'>
            <div className='col-md-6'>
              <p className='mb-2'>
                <strong>Tryout Fee:</strong> ${effectiveTryoutConfig.tryoutFee}{' '}
                per player
              </p>
              {effectiveTryoutConfig.registrationDeadline && (
                <p className='mb-2'>
                  <strong>Registration Deadline:</strong>{' '}
                  {new Date(
                    effectiveTryoutConfig.registrationDeadline,
                  ).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className='col-md-6'>
              {effectiveTryoutConfig.tryoutDates.length > 0 && (
                <p className='mb-2'>
                  <strong>Tryout Dates:</strong>{' '}
                  {effectiveTryoutConfig.tryoutDates
                    .map((d) => new Date(d).toLocaleDateString())
                    .join(', ')}
                </p>
              )}
              {effectiveTryoutConfig.locations.length > 0 && (
                <p className='mb-2'>
                  <strong>Locations:</strong>{' '}
                  {effectiveTryoutConfig.locations.join(', ')}
                </p>
              )}
            </div>
          </div>

          {effectiveTryoutConfig.requiresInsurance && (
            <div className='alert alert-info mt-3'>
              <i className='ti ti-shield me-2'></i>
              <strong>Insurance Required:</strong> Players must provide proof of
              insurance.
            </div>
          )}

          {effectiveTryoutConfig.refundPolicy && (
            <div className='alert alert-light mt-3'>
              <i className='ti ti-info-circle me-2'></i>
              <strong>Refund Policy:</strong>{' '}
              {effectiveTryoutConfig.refundPolicy}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Check if form should be shown
  const shouldShowForm = useMemo(() => {
    const formConfigActive = formConfig?.isActive ?? true;
    const tryoutConfigActive = effectiveTryoutConfig?.isActive ?? true;
    return formConfigActive && tryoutConfigActive;
  }, [formConfig, effectiveTryoutConfig]);

  if (!shouldShowForm) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <i className='ti ti-target-off fs-1 text-muted mb-3'></i>
          <h4>Tryout Registration Closed</h4>
          <p className='text-muted'>
            This tryout registration is not currently available.
          </p>
        </div>
      </div>
    );
  }

  if (currentStep === 'success') {
    return renderSuccessMessage();
  }

  if (authLoading) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <LoadingSpinner />
          <p className='mt-3'>Loading tryout registration form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='tryout-registration-form'>
      <div className='form-header'>
        <h2 className='mt-3'>Tryout Registration</h2>
        <p>
          {(currentStep as string) === 'success'
            ? 'Your players have been successfully registered for tryouts!'
            : `Register players for the ${effectiveTryoutConfig.tryoutName}.`}
        </p>
      </div>

      {renderTryoutInfo()}

      {formError && (
        <div className='alert alert-danger mb-4'>
          <i className='ti ti-alert-circle me-2'></i>
          {formError}
        </div>
      )}

      {(currentStep as string) !== 'success' && steps.length > 0 && (
        <StepIndicator
          steps={steps}
          currentStep={currentStep}
          className='mb-5'
        />
      )}

      <div className='step-content mt-4'>
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
              isExistingUser || isAuthenticated || hasCompletedUserRegistration
            }
            initialData={formData.user || savedUserDataState}
            onValidationChange={() => {}}
          />
        )}

        {currentStep === 'player' && (
          <PlayerRegistrationModule
            players={players}
            onPlayersChange={handlePlayersChange}
            registrationYear={defaultSeasonEvent.year}
            season={defaultSeasonEvent.season}
            isExistingUser={
              isExistingUser || isAuthenticated || hasCompletedUserRegistration
            }
            existingPlayers={getUnpaidPlayers()}
            paidPlayers={getPaidPlayersForTryout()}
            onValidationChange={handlePlayerValidationChange}
            showCheckboxes={
              isAuthenticated && userPlayers && userPlayers.length > 0
            }
            selectedPlayerIds={selectedPlayerIds}
            onPlayerSelection={handlePlayerSelection}
            onComplete={handlePlayerComplete}
            onBack={handleBack}
            maxPlayers={5}
            allowMultiple={true}
            requiresPayment={effectiveTryoutConfig.requiresPayment}
            parentId={savedUserDataState?._id || currentUser?._id}
            authToken={localStorage.getItem('token') || undefined}
            onPaymentCalculation={() => {}}
          />
        )}

        {currentStep === 'payment' && (
          <div>
            <PaymentModule
              amount={calculatePaymentAmount()}
              customerEmail={
                formData.user?.email ||
                savedUserDataState?.email ||
                formData.tempAccount?.email ||
                currentUser?.email ||
                ''
              }
              onPaymentSuccess={handlePaymentComplete}
              onPaymentError={(error) => setFormError(error)}
              description={`${effectiveTryoutConfig.tryoutName} ${effectiveTryoutConfig.tryoutYear} Tryout Registration - $${effectiveTryoutConfig.tryoutFee} per player`}
              isProcessing={isProcessing}
              onComplete={handlePaymentComplete}
              onBack={handleBack}
              formConfig={defaultFormConfig}
              playerCount={getEffectivePlayerCount()}
              players={playersForTryout}
              eventData={{
                season: defaultSeasonEvent.season,
                year: defaultSeasonEvent.year,
                eventId: defaultSeasonEvent.eventId,
              }}
              savedUserData={savedUserDataState}
              savedPlayers={playersForTryout}
              parentId={savedUserDataState?._id || currentUser?._id}
              user={savedUserDataState || currentUser}
              formData={{
                ...formData,
                players: playersForTryout,
                eventData: {
                  season: defaultSeasonEvent.season,
                  year: defaultSeasonEvent.year,
                  eventId: defaultSeasonEvent.eventId,
                },
              }}
              appId={'sq0idp-jUCxKnO_i8i7vccQjVj_0g'}
              locationId={'L26Q50FWRCQW5'}
              disabled={!playerValidation}
              registrationType='tryout'
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TryoutRegistrationForm;
