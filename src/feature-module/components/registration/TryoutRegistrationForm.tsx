import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import UserRegistrationModule from '../registration-modules/UserRegistrationModule';
import PaymentModule from '../registration-modules/PaymentModule';
import AccountCreationModule from '../registration-modules/AccountCreationModule';
import EmailVerificationStep from '../../auth/emailVerification/emailVerificationStep';
import DynamicPlayerRegistrationModule from '../registration-modules/DynamicPlayerRegistrationModule';
import StepIndicator from '../../../components/common/StepIndicator';
import { all_routes } from '../../router/all_routes';
import {
  FormData,
  RegistrationFormConfig,
  SeasonEvent,
  Player,
  SeasonRegistration,
  TryoutSpecificConfig,
  Address,
} from '../../../types/registration-types';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import axios from 'axios';
import { useMarketing } from '../../../context/MarketingContext';
import { formatDate, isoToMMDDYYYY } from '../../../utils/dateFormatter';

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

  const navigate = useNavigate();
  const routes = all_routes;

  // State for loaded tryout config
  const [loadedTryoutConfig, setLoadedTryoutConfig] =
    useState<TryoutSpecificConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Player states
  const [players, setPlayers] = useState<Player[]>(() => {
    if (savedPlayers && savedPlayers.length > 0) return savedPlayers;
    return [];
  });
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getMarketingAttribution } = useMarketing();

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

    if (seasonEvent) {
      return {
        season: seasonEvent.season,
        year: seasonEvent.year,
        eventId: seasonEvent.eventId,
      };
    }

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

  // Initialize step
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

  // Initialize players when stepping into player step
  useEffect(() => {
    if (currentStep !== 'player') return;
    if (savedPlayers && savedPlayers.length > 0) return;

    const hasNoPlayers = players.length === 0;
    const isNewUser =
      !isExistingUser && !(userPlayers && userPlayers.length > 0);

    if (hasNoPlayers && isNewUser) {
      setPlayers([
        {
          fullName: '',
          gender: '',
          dob: '',
          schoolName: '',
          healthConcerns: '',
          aauNumber: '',
          registrationYear: defaultSeasonEvent.year,
          season: defaultSeasonEvent.season,
          grade: '',
        },
      ]);
    }
  }, [
    currentStep,
    players.length,
    isExistingUser,
    userPlayers,
    savedPlayers,
    defaultSeasonEvent,
  ]);

  const updateFormData = (newData: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const getPaidPlayersForTryout = useCallback((): Player[] => {
    if (!userPlayers) return [];

    const tryoutSeason = defaultSeasonEvent.season;
    const tryoutYear = defaultSeasonEvent.year;

    return userPlayers.filter((player) => {
      const hasPaidForThisTryout = player.seasons?.some(
        (season: SeasonRegistration) => {
          const exactSeasonMatch = season.season === tryoutSeason;
          const exactYearMatch = season.year === tryoutYear;
          const isPaid =
            season.paymentStatus === 'paid' || season.paymentComplete === true;

          return exactSeasonMatch && exactYearMatch && isPaid;
        },
      );

      return hasPaidForThisTryout;
    });
  }, [userPlayers, defaultSeasonEvent]);

  // Calculate player count for payment
  const getEffectivePlayerCount = useCallback((): number => {
    if (playersForTryout.length > 0) {
      return playersForTryout.length;
    }

    const paidPlayers = getPaidPlayersForTryout();
    const paidPlayerIds = new Set(paidPlayers.map((p) => p._id));

    const selectedUnpaidCount = selectedPlayerIds.filter(
      (id) => !paidPlayerIds.has(id),
    ).length;
    const newPlayersCount = players.filter(
      (p) => !p._id && p.fullName?.trim(),
    ).length;

    return selectedUnpaidCount + newPlayersCount;
  }, [selectedPlayerIds, players, getPaidPlayersForTryout, playersForTryout]);

  const calculatePaymentAmount = (): number => {
    const playerCount = getEffectivePlayerCount();
    return (effectiveTryoutConfig.tryoutFee || 50) * 100 * playerCount;
  };

  // ─── Save User Data ────────────────────────────────────────────────────────
  const saveUserData = async (userData: any): Promise<any> => {
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

      const marketing = getMarketingAttribution();

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
        registrationType: 'tryout',
        marketing,
        eventId: defaultSeasonEvent.eventId,
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

      setSavedUserDataState(savedData);
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
      const parentId = savedUserDataState?._id || currentUser?._id;

      if (!token || !parentId) {
        throw new Error('Authentication required. Please log in again.');
      }

      const playersWithoutId = playersToSave.filter((p) => !p._id);
      if (playersWithoutId.length === 0) {
        return playersToSave;
      }

      const savedPlayersList: Player[] = [];

      for (const player of playersWithoutId) {
        const playerData = {
          fullName: player.fullName.trim(),
          gender: player.gender,
          dob: player.dob,
          schoolName: player.schoolName?.trim() || '',
          healthConcerns: player.healthConcerns || '',
          aauNumber: player.aauNumber || '',
          registrationYear: defaultSeasonEvent.year,
          season: defaultSeasonEvent.season,
          parentId: parentId,
          grade: player.grade || '',
          isGradeOverridden: player.isGradeOverridden || false,
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

          if (response.data.error?.includes('already exists')) {
            if (response.data.duplicatePlayerId) {
              savedPlayersList.push({
                ...player,
                _id: response.data.duplicatePlayerId,
              });
            }
          } else {
            savedPlayersList.push(response.data.player || response.data);
          }
        } catch (error: any) {
          if (error.response?.data?.error?.includes('already exists')) {
            const duplicateId = error.response.data.duplicatePlayerId;
            if (duplicateId) {
              savedPlayersList.push({ ...player, _id: duplicateId });
              continue;
            }
          }
          throw error;
        }
      }

      const existingPlayersList = playersToSave.filter((p) => p._id);
      const allPlayers = [...existingPlayersList, ...savedPlayersList];

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

  // ─── Event Handlers ────────────────────────────────────────────────────────
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
      setHasCompletedUserRegistration(true);

      setCurrentStep('player');
    } catch (error: any) {
      setFormError(error.message || 'Failed to save user information');
    }
  };

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

  // ── Player Completion - Saves players AND moves to payment ───────────
  const handlePlayerComplete = async (playersData: Player[]) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      // Add selected existing players that aren't already in the list
      const selectedExistingPlayers = (userPlayers || []).filter(
        (p) =>
          selectedPlayerIds.includes(p._id!) &&
          !playersData.some((existing) => existing._id === p._id),
      );

      const allPlayersToSave = [...playersData, ...selectedExistingPlayers];

      // Save players to database (parent responsibility)
      const savedPlayersResult = await savePlayerData(allPlayersToSave);

      // Refresh auth context to get updated players
      await checkAuth();

      // Filter out any players that still don't have IDs
      const playersWithIds = savedPlayersResult.filter((p) => p._id);

      if (playersWithIds.length === 0) {
        throw new Error('No valid players with IDs found for registration.');
      }

      setPlayersForTryout(playersWithIds);

      if (effectiveTryoutConfig.requiresPayment) {
        setCurrentStep('payment');
      } else {
        handleComplete();
      }
    } catch (error: any) {
      console.error('Error in handlePlayerComplete:', error);
      setFormError(error.message || 'Failed to save player information');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    const stepOrder = ['account', 'verifyEmail', 'user', 'player', 'payment'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1] as any);
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

  // ─── Render Success Message ────────────────────────────────────────────────
  const renderSuccessMessage = () => {
    // Get registered players - ensure we have a definite array
    let registeredPlayers: Player[] = [];

    if (playersForTryout.length > 0) {
      registeredPlayers = playersForTryout;
    } else if (userPlayers && userPlayers.length > 0) {
      registeredPlayers = userPlayers.filter((player: Player) =>
        player.seasons?.some(
          (season: SeasonRegistration) =>
            season.season === defaultSeasonEvent.season &&
            season.year === defaultSeasonEvent.year,
        ),
      );
    }

    // Remove duplicates based on _id
    const uniquePlayers: Player[] = [];
    const seenIds = new Set<string>();

    for (const player of registeredPlayers) {
      if (player._id && !seenIds.has(player._id)) {
        seenIds.add(player._id);
        uniquePlayers.push(player);
      } else if (
        !player._id &&
        !uniquePlayers.some(
          (p) => p.fullName === player.fullName && p.dob === player.dob,
        )
      ) {
        // For players without _id, use name + dob as unique identifier
        uniquePlayers.push(player);
      }
    }

    return (
      <div className='card border-0'>
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
                    <p className='text-dark mb-1'>
                      <strong className='text-dark'>Registration Date:</strong>
                    </p>
                    <p className='text-dark'>{registrationTimestamp}</p>
                  </div>
                  <div className='col-md-6'>
                    <p className='text-dark mb-1'>
                      <strong className='text-dark'>Tryout:</strong>
                    </p>
                    <p className='text-dark'>
                      {effectiveTryoutConfig.tryoutName}{' '}
                      {effectiveTryoutConfig.tryoutYear}
                    </p>
                  </div>
                </div>

                <div className='row mb-3'>
                  <div className='col-md-6'>
                    <p className='text-dark mb-1'>
                      <strong className='text-dark'>
                        Tryout Fee per Player:
                      </strong>
                    </p>
                    <p className='text-dark'>
                      ${effectiveTryoutConfig.tryoutFee}
                    </p>
                  </div>
                  <div className='col-md-6'>
                    <p className='text-dark mb-1'>
                      <strong className='text-dark'>Amount Paid:</strong>
                    </p>
                    <p className='h5 text-success'>
                      ${(calculatePaymentAmount() / 100).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className='mb-3'>
                  <p className='text-dark mb-1'>
                    <strong className='text-dark'>Parent/Guardian:</strong>
                  </p>
                  <p className='text-dark'>
                    {savedUserDataState?.fullName ||
                      currentUser?.fullName ||
                      'Not specified'}
                  </p>
                </div>

                <div className='mb-3'>
                  <p className='text-dark mb-1'>
                    <strong>Players Registered for Tryout:</strong>
                  </p>

                  {uniquePlayers.length > 0 ? (
                    <ul className='list-group'>
                      {uniquePlayers.map((player: Player, index: number) => (
                        <li
                          key={player._id || index}
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
                  ) : (
                    <p className='text-muted'>No players registered yet.</p>
                  )}
                </div>

                <div className='mb-3'>
                  <p className='text- mb-1'>
                    <strong className='text-dark'>Next Steps:</strong>
                  </p>
                  <div className='alert alert-info'>
                    <ul className='mb-0'>
                      <li>
                        <i className='ti ti-calendar text-dark me-2'></i>
                        <strong className='text-dark'>
                          Tryout schedule:
                        </strong>{' '}
                        {effectiveTryoutConfig.tryoutDates
                          .map((date: string) =>
                            new Date(date).toLocaleDateString(),
                          )
                          .join(', ') || 'To be announced'}
                      </li>
                      <li className='mt-2'>
                        <i className='ti ti-map-pin text-dark me-2'></i>
                        <strong className='text-dark'>Location:</strong>{' '}
                        {effectiveTryoutConfig.locations &&
                        effectiveTryoutConfig.locations.length > 0
                          ? effectiveTryoutConfig.locations.join(', ')
                          : 'To be announced'}
                      </li>
                      <li className='mt-2'>
                        <i className='ti ti-bell-ringing text-dark me-2'></i>
                        <strong className='text-dark'>
                          Get notifications
                        </strong>{' '}
                        - You'll receive tryout updates
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

  // Render tryout info card
  const renderTryoutInfo = () => {
    if (isLoadingConfig) {
      return (
        <div className='form-content'>
          <div className='card mb-4'>
            <div className='card-body text-center'>
              <LoadingSpinner />
              <p className='mt-2'>Loading tryout information...</p>
            </div>
          </div>
        </div>
      );
    }

    if (configError) {
      return (
        <div className='form-content'>
          <div className='alert alert-warning mb-4'>
            <i className='ti ti-alert-triangle me-2'></i>
            {configError}
          </div>
        </div>
      );
    }

    // ✅ Helper to format the registration deadline correctly
    const getFormattedDate = (date: any): string => {
      if (!date) return '';
      // If it's a string (ISO format from MongoDB), use isoToMMDDYYYY
      if (typeof date === 'string') {
        return isoToMMDDYYYY(date);
      }
      // If it's a Date object, use formatDate
      if (date instanceof Date) {
        return formatDate(date);
      }
      return '';
    };

    return (
      <div className='form-content'>
        <div className='card mb-4'>
          <div className='card-header bg-light'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-target-arrow fs-16' />
              </span>
              <h4 className='text-dark'>{effectiveTryoutConfig.tryoutName}</h4>
            </div>
          </div>
          <div className='card-body'>
            <div className='row'>
              <div className='col-md-6'>
                <p className='mb-2'>
                  <strong>Tryout Fee:</strong> $
                  <span className='text-dark'>
                    {effectiveTryoutConfig.tryoutFee} per player
                  </span>
                </p>
                {effectiveTryoutConfig.registrationDeadline && (
                  <p className='mb-2'>
                    <strong>Registration Deadline:</strong>{' '}
                    {/* ✅ Use the helper function instead of new Date() */}
                    {getFormattedDate(
                      effectiveTryoutConfig.registrationDeadline,
                    )}
                  </p>
                )}
              </div>
              <div className='col-md-6'>
                {effectiveTryoutConfig.tryoutDates &&
                  effectiveTryoutConfig.tryoutDates.length > 0 && (
                    <p className='mb-2'>
                      <strong>Tryout Dates:</strong>{' '}
                      {effectiveTryoutConfig.tryoutDates
                        .map((d: string) => isoToMMDDYYYY(d))
                        .join(', ')}
                    </p>
                  )}
                {effectiveTryoutConfig.locations &&
                  effectiveTryoutConfig.locations.length > 0 && (
                    <p className='mb-2'>
                      <strong>Locations:</strong>{' '}
                      {effectiveTryoutConfig.locations
                        .map((loc: any) =>
                          typeof loc === 'string' ? loc : loc.name,
                        )
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
              </div>
            </div>

            {effectiveTryoutConfig.requiresInsurance && (
              <div className='alert alert-info mt-3'>
                <i className='ti ti-shield me-2'></i>
                <strong>Insurance Required:</strong> Players must provide proof
                of insurance.
              </div>
            )}

            {effectiveTryoutConfig.refundPolicy && (
              <div className='alert alert-light mt-3'>
                <i className='ti ti-info-circle text-dark me-2'></i>
                <strong>Refund Policy:</strong>{' '}
                <span className='text-dark'>
                  {effectiveTryoutConfig.refundPolicy}
                </span>
              </div>
            )}
          </div>
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

  if (authLoading || isLoadingConfig) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <LoadingSpinner />
          <p className='mt-3'>Loading tryout registration form...</p>
        </div>
      </div>
    );
  }

  // Props for DynamicPlayerRegistrationModule
  const isUserExisting =
    isExistingUser || isAuthenticated || hasCompletedUserRegistration;
  const allExistingPlayers = userPlayers || [];
  const paidPlayersForTryout = getPaidPlayersForTryout();

  return (
    <div className='tryout-registration-form'>
      <div className='form-header'>
        <h2 className='mt-3'>Tryout Registration</h2>
        <p>{`Register players for the ${effectiveTryoutConfig.tryoutName}.`}</p>
      </div>

      {renderTryoutInfo()}

      {formError && (
        <div className='alert alert-danger mb-4'>
          <i className='ti ti-alert-circle me-2'></i>
          {formError}
        </div>
      )}

      {steps.length > 0 && (
        <StepIndicator
          steps={steps}
          currentStep={
            currentStep as
              | 'account'
              | 'verifyEmail'
              | 'user'
              | 'player'
              | 'payment'
          }
          className='mb-5'
        />
      )}
      <div className='form-content'>
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
              isExistingUser={isUserExisting}
              initialData={formData.user || savedUserDataState}
              onValidationChange={() => {}}
            />
          )}

          {currentStep === 'player' && (
            <DynamicPlayerRegistrationModule
              players={players}
              onPlayersChange={handlePlayersChange}
              registrationYear={defaultSeasonEvent.year}
              season={defaultSeasonEvent.season}
              isExistingUser={isUserExisting}
              existingPlayers={allExistingPlayers}
              paidPlayers={paidPlayersForTryout}
              onValidationChange={handlePlayerValidationChange}
              showCheckboxes={isAuthenticated && allExistingPlayers.length > 0}
              selectedPlayerIds={selectedPlayerIds}
              onPlayerSelection={handlePlayerSelection}
              parentId={savedUserDataState?._id || currentUser?._id}
              authToken={localStorage.getItem('token') || undefined}
              allowMultiple={true}
              requiresPayment={effectiveTryoutConfig.requiresPayment}
              onComplete={handlePlayerComplete}
              onBack={handleBack}
              maxPlayers={10}
            />
          )}

          {currentStep === 'payment' && (
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
              description={`${effectiveTryoutConfig.tryoutName} ${effectiveTryoutConfig.tryoutYear} Tryout Registration`}
              isProcessing={isProcessing}
              onComplete={handlePaymentComplete}
              onBack={handleBack}
              formConfig={defaultFormConfig}
              playerCount={getEffectivePlayerCount()}
              players={playersForTryout}
              formData={{
                ...formData,
                players: playersForTryout,
                eventData: {
                  season: defaultSeasonEvent.season,
                  year: defaultSeasonEvent.year,
                  eventId: defaultSeasonEvent.eventId,
                },
              }}
              eventData={{
                season: defaultSeasonEvent.season,
                year: defaultSeasonEvent.year,
                eventId: defaultSeasonEvent.eventId,
              }}
              savedUserData={savedUserDataState}
              savedPlayers={playersForTryout}
              appId={'sq0idp-jUCxKnO_i8i7vccQjVj_0g'}
              locationId={'L26Q50FWRCQW5'}
              disabled={!playerValidation && playersForTryout.length === 0}
              registrationType='tryout'
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TryoutRegistrationForm;
