import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import UserRegistrationModule from '../registration-modules/UserRegistrationModule';
import PlayerRegistrationModule from '../registration-modules/PlayerRegistrationModule';
import AccountCreationModule from '../registration-modules/AccountCreationModule';
import EmailVerificationStep from '../../auth/emailVerification/emailVerificationStep';
import StepIndicator from '../../../components/common/StepIndicator';
import {
  FormData,
  RegistrationFormConfig,
  SeasonEvent,
  Player,
  UserRegistrationData,
  Address,
  PlayerRegistrationProps,
} from '../../../types/registration-types';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import axios from 'axios';
import { all_routes } from '../../router/all_routes';

interface PlayerRegistrationFormProps {
  onSuccess?: (data?: any) => void;
  formConfig?: RegistrationFormConfig;
  seasonEvent?: SeasonEvent;
  isExistingUser?: boolean;
  existingPlayers?: Player[];
  savedUserData?: any;
  savedPlayers?: Player[];
  skipToPlayerStep?: boolean;
  onUserRegistrationComplete?: (userData: any) => void;
  onPlayerRegistrationComplete?: (players: Player[]) => void;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const PlayerRegistrationForm: React.FC<PlayerRegistrationFormProps> = ({
  onSuccess,
  formConfig,
  seasonEvent,
  isExistingUser = false,
  existingPlayers = [],
  savedUserData,
  savedPlayers = [],
  skipToPlayerStep = false,
  onUserRegistrationComplete,
  onPlayerRegistrationComplete,
}) => {
  const navigate = useNavigate();
  const routes = all_routes;

  const {
    isAuthenticated,
    isLoading: authLoading,
    isEmailVerified,
    user: currentUser,
    createTempAccount,
    checkAuth,
    players: userPlayers,
  } = useAuth();

  const defaultFormConfig: RegistrationFormConfig = useMemo(
    () => ({
      isActive: true,
      requiresPayment: false,
      requiresQualification: false,
      pricing: {
        basePrice: 0,
        packages: [],
      },
      ...formConfig,
    }),
    [formConfig]
  );

  const defaultSeasonEvent = useMemo(
    () =>
      seasonEvent || {
        season: formConfig?.season || 'Partizan Team',
        year: formConfig?.year || new Date().getFullYear(),
        eventId: formConfig?.eventId || 'partizan-2026',
      },
    [seasonEvent, formConfig]
  );

  type RegistrationStep =
    | 'account'
    | 'verifyEmail'
    | 'user'
    | 'player'
    | 'success';

  const [currentStep, setCurrentStep] = useState<RegistrationStep>('account');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [localSavedUserData, setLocalSavedUserData] =
    useState<UserRegistrationData | null>(savedUserData || null);
  const [localSavedPlayers, setLocalSavedPlayers] = useState<Player[]>(
    savedPlayers || []
  );
  const [hasCompletedUserRegistration, setHasCompletedUserRegistration] =
    useState(!!savedUserData || isAuthenticated);
  const [registrationCompleted, setRegistrationCompleted] = useState(false);
  const [registrationTimestamp, setRegistrationTimestamp] =
    useState<string>('');

  // Player state
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playerValidation, setPlayerValidation] = useState(false);
  const [paidPlayers] = useState<Player[]>([]); // Empty for basic player registration

  // Define all possible steps - ALWAYS SHOW ALL 4 STEPS
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
  ];

  // Initialize steps - ALWAYS show all 4 steps
  const [steps] = useState<any[]>(() =>
    allSteps.map((step, index) => ({
      ...step,
      number: index + 1,
    }))
  );

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  const [formData, setFormData] = useState<FormData>({
    eventData: {
      season: defaultSeasonEvent.season,
      year: defaultSeasonEvent.year,
      eventId: defaultSeasonEvent.eventId,
    },
    players: savedPlayers || [],
  });

  // Custom function to determine if a step is accessible for clicking
  const isStepAccessible = (
    stepId: string,
    stepIndex: number,
    currentStepIndex: number
  ): boolean => {
    // For new users going through the flow
    if (!isAuthenticated && !isExistingUser && !hasCompletedUserRegistration) {
      // Allow clicking on completed steps
      return stepIndex <= currentStepIndex;
    }

    // For authenticated users or those who completed user registration
    if (isAuthenticated || hasCompletedUserRegistration) {
      // Allow clicking on 'user' and 'player' steps only
      if (stepId === 'user' || stepId === 'player') {
        return stepIndex <= currentStepIndex;
      }
      // Don't allow clicking on 'account' or 'verifyEmail' for authenticated users
      return false;
    }

    // Default: allow clicking on completed steps
    return stepIndex <= currentStepIndex;
  };

  // ✅ Initialize current step
  useEffect(() => {
    if (authLoading || isLoadingUserData) return;

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
      currentStep === 'player' &&
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
        registrationYear: defaultSeasonEvent.year,
        season: defaultSeasonEvent.season,
        grade: '',
      };
      setPlayers([blankPlayer]);
    }
  }, [
    currentStep,
    players.length,
    userPlayers,
    defaultSeasonEvent.year,
    defaultSeasonEvent.season,
    isExistingUser,
    savedPlayers,
  ]);

  const updateFormData = (newData: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  // ✅ Handle step navigation - FIXED VERSION
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
    userData: UserRegistrationData
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
        // Add additional guardians to the registration data
        additionalGuardians:
          userData.additionalGuardians?.map((guardian) => ({
            fullName: guardian.fullName.trim(),
            email: guardian.email.toLowerCase().trim(),
            phone: guardian.phone.replace(/\D/g, ''),
            relationship: guardian.relationship.trim(),
            address: guardian.usePrimaryAddress
              ? normalizedAddress // Use primary address if checked
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
          }
        );
      } else {
        response = await axios.post(
          `${API_BASE_URL}/register`,
          registrationData
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

      // Also save the additional guardians from the response
      if (response.data.additionalGuardians) {
        savedData.additionalGuardians = response.data.additionalGuardians;
      }

      setLocalSavedUserData(savedData);
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
  const savePlayerData = async (playersToSave: Player[]): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      const parentId = localSavedUserData?._id || currentUser?._id;

      if (!token || !parentId) {
        throw new Error('Authentication required. Please log in again.');
      }

      const playersWithoutId = playersToSave.filter((p) => !p._id);
      if (playersWithoutId.length === 0) {
        console.log('All players already have IDs, skipping save');
        return true;
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
          registrationYear: player.registrationYear || defaultSeasonEvent.year,
          season: player.season || defaultSeasonEvent.season,
          parentId: parentId,
          grade: player.grade || '',
          isGradeOverridden: player.isGradeOverridden || false,
          skipSeasonRegistration: true,
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
            }
          );

          if (response.data.error?.includes('already exists')) {
            if (response.data.duplicatePlayerId) {
              savedPlayers.push({
                ...player,
                _id: response.data.duplicatePlayerId,
              });
            }
          } else {
            const savedPlayer = response.data.player || response.data;
            savedPlayers.push(savedPlayer);
          }
        } catch (error: any) {
          if (error.response?.data?.error?.includes('already exists')) {
            const duplicateId = error.response.data.duplicatePlayerId;
            if (duplicateId) {
              savedPlayers.push({
                ...player,
                _id: duplicateId,
              });
              continue;
            }
          }
          throw error;
        }
      }

      if (savedPlayers.length > 0) {
        const updatedPlayers = playersToSave.map((p) => {
          const savedPlayer = savedPlayers.find(
            (sp) =>
              sp.fullName === p.fullName &&
              sp.dob === p.dob &&
              sp.gender === p.gender
          );
          return savedPlayer || p;
        });

        setPlayers(updatedPlayers);
        setLocalSavedPlayers(updatedPlayers);
        updateFormData({ players: updatedPlayers });
      }

      return true;
    } catch (error: any) {
      let errorMessage = 'Failed to save player information';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setFormError(errorMessage);
      return false;
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

      if (onUserRegistrationComplete) {
        onUserRegistrationComplete(savedUser);
      }

      setCurrentStep('player');
    } catch (error: any) {
      setFormError(error.message || 'Failed to save user information');
    }
  };

  // ✅ Handle player change from module
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

  // ✅ Handle payment calculation
  const handlePaymentCalculation = (playerCount: number) => {
    // No payment for basic player registration
    console.log(`Player count for registration: ${playerCount}`);
  };

  // ✅ Handle player validation change
  const handlePlayerValidationChange = (isValid: boolean) => {
    setPlayerValidation(isValid);
  };

  // ✅ Player registration completion
  const handlePlayerComplete = async () => {
    setIsSubmitting(true);
    setFormError(null);

    // Validate we have players to save
    const hasPlayers = players.length > 0 || selectedPlayerIds.length > 0;
    if (!hasPlayers) {
      setFormError('Please add at least one player');
      setIsSubmitting(false);
      window.scrollTo(0, 0);
      return;
    }

    try {
      // Filter only new players (without _id) to save
      const playersToSave = players.filter((p) => !p._id);

      if (playersToSave.length > 0) {
        const playersSaved = await savePlayerData(playersToSave);
        if (!playersSaved) {
          setIsSubmitting(false);
          return;
        }
      }

      // Combine selected existing players and new players
      const allPlayers = [
        ...(userPlayers?.filter((p) => selectedPlayerIds.includes(p._id!)) ||
          []),
        ...players,
      ];

      setLocalSavedPlayers(allPlayers);

      if (onPlayerRegistrationComplete) {
        onPlayerRegistrationComplete(allPlayers);
      }

      // Set registration timestamp and show success message
      setRegistrationTimestamp(new Date().toLocaleString());
      setRegistrationCompleted(true);
      setCurrentStep('success');

      // Clear localStorage
      localStorage.removeItem('pendingRegistrationUser');
      localStorage.removeItem('pendingRegistrationPlayers');
    } catch (error: any) {
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
        setCurrentStep(hasCompletedUserRegistration ? 'player' : 'verifyEmail');
        break;
      case 'player':
        setCurrentStep('user');
        break;
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
    setRegistrationCompleted(false);
    setCurrentStep('player');
    // Reset players for new registration
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
  };

  // ✅ Create the props object for PlayerRegistrationModule
  const playerModuleProps: PlayerRegistrationProps = {
    players: players,
    onPlayersChange: handlePlayersChange,
    registrationYear: defaultSeasonEvent.year,
    season: defaultSeasonEvent.season,
    isExistingUser:
      isExistingUser || isAuthenticated || hasCompletedUserRegistration,
    existingPlayers: userPlayers || [],
    paidPlayers: paidPlayers,
    onValidationChange: handlePlayerValidationChange,
    showCheckboxes: isAuthenticated && userPlayers && userPlayers.length > 0,
    selectedPlayerIds,
    onPlayerSelection: handlePlayerSelection,
    onPaymentCalculation: handlePaymentCalculation,
    onComplete: handlePlayerComplete,
    onBack: handleBack,
    parentId: localSavedUserData?._id || currentUser?._id,
    authToken: localStorage.getItem('token') || undefined,
    maxPlayers: 10,
    allowMultiple: true,
    requiresPayment: false,
  };

  // ✅ Render player step using PlayerRegistrationModule
  const renderPlayerStep = () => {
    return (
      <div className='player-step-container'>
        <PlayerRegistrationModule {...playerModuleProps} />
      </div>
    );
  };

  // ✅ Render success message with receipt
  const renderSuccessMessage = () => {
    const registeredPlayers = [...(userPlayers || []), ...players];
    const playerNames = registeredPlayers
      .filter((p) => p.fullName?.trim())
      .map((p) => p.fullName);

    return (
      <div className='card border-0 shadow-sm'>
        <div className='card-header'>
          <h4 className='mb-0'>🎉 Player Registration Complete!</h4>
        </div>
        <div className='card-body'>
          <div className='text-center py-4'>
            <i className='ti ti-circle-check fs-1 text-success mb-3'></i>
            <h3>Players Successfully Added to Your Account!</h3>
            <p className='text-muted'>
              Your players have been registered and are ready for future season
              or training registrations.
            </p>
          </div>

          {/* Registration Receipt */}
          <div className='receipt-card mb-4'>
            <div className='card border'>
              <div className='card-header bg-light'>
                <h5 className='mb-0'>Registration Receipt</h5>
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
                      <strong>Registration Type:</strong>
                    </p>
                    <p>Player Account Setup</p>
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
                    <strong>Total Players in Account:</strong>
                  </p>
                  <ul className='list-group'>
                    {registeredPlayers.map((player, index) => (
                      <li
                        key={index}
                        className='list-group-item d-flex justify-content-between'
                      >
                        <div>
                          <strong>{player.fullName}</strong>
                          <span className='text-muted small'>
                            {player.grade} Grade • {player.gender} •{' '}
                            {player.schoolName || 'School not specified'}
                          </span>
                        </div>
                        <span className='badge bg-success'>Registered</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className='mb-3'>
                  <p className='mb-1'>
                    <strong>Next Steps:</strong>
                  </p>
                  <div className='alert alert-info'>
                    <ul className='mb-0'>
                      <li>
                        <i className='ti ti-calendar text-primary me-2'></i>
                        <strong>Register for seasons/training</strong> - Your
                        players are now ready to be registered for upcoming
                        events
                      </li>
                      <li className='mt-2'>
                        <i className='ti ti-user text-primary me-2'></i>
                        <strong>Add more players</strong> - You can add
                        additional players to your account at any time
                      </li>
                      <li className='mt-2'>
                        <i className='ti ti-bell-ringing text-primary me-2'></i>
                        <strong>Get notifications</strong> - We'll notify you
                        when new registration opportunities are available
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
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
      {/* Header */}
      <div className='form-header'>
        <h2 className='mt-3'>Player Registration</h2>
        <p>
          {currentStep === 'success'
            ? 'Your players have been successfully registered!'
            : 'Register players to your account for future season and training registrations.'}
        </p>
      </div>

      {/* Step Indicator - Only show for non-success steps */}
      {currentStep !== 'success' && steps.length > 0 && (
        <StepIndicator
          steps={steps}
          currentStep={currentStep}
          className='mb-5'
        />
      )}

      {/* Main Form Content */}
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

          {currentStep === 'player' && renderPlayerStep()}

          {currentStep === 'success' && renderSuccessMessage()}
        </div>
      </div>
    </div>
  );
};

export default PlayerRegistrationForm;
