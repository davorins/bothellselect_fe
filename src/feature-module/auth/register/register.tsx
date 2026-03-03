import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GuardianRegistrationModule from '../../components/registration-modules/GuardianRegistrationModule';
import TermsAndConditionsModule from '../../components/registration-modules/TermsAndConditionsModule';
import AccountCreationModule from '../../components/registration-modules/AccountCreationModule';
import EmailVerificationStep from '../../auth/emailVerification/emailVerificationStep';
import StepIndicator from '../../../components/common/StepIndicator';
import { Guardian, Address, Player } from '../../../types/registration-types';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { all_routes } from '../../router/all_routes';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';

// Import health conditions utilities
import Select from 'react-select';
import { commonHealthConditions } from '../../constants/healthConditions';
import SchoolAutocomplete from '../../../components/SchoolAutocomplete';
import NameInput from '../../../components/NameInput';
import { calculateGradeFromDOB } from '../../../utils/gradeUtils';

// Grade confirmation banner
import GradeConfirmationBanner from '../../components/registration-modules/GradeConfirmationBanner';

// Custom styles for react-select
const selectStyles = {
  control: (base: any) => ({
    ...base,
    minHeight: '38px',
    borderColor: '#d9d9d9',
    '&:hover': { borderColor: '#40a9ff' },
  }),
};

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  tempAccount?: {
    email: string;
    password: string;
  };
}

const Register = () => {
  const navigate = useNavigate();
  const routes = all_routes;
  const {
    createTempAccount,
    register,
    sendVerificationEmail,
    isEmailVerified,
    checkVerificationStatus,
    refreshAuthData,
  } = useAuth();

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const currentYear = new Date().getFullYear();

  type RegistrationStep =
    | 'account'
    | 'verifyEmail'
    | 'guardian'
    | 'players'
    | 'review'
    | 'success';

  const [currentStep, setCurrentStep] = useState<RegistrationStep>('account');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoadingUserData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationCompleted, setRegistrationCompleted] = useState(false);
  const [registrationTimestamp, setRegistrationTimestamp] =
    useState<string>('');
  const [showPlayerChoice, setShowPlayerChoice] = useState(false);

  // ── Grade confirmation state ──────────────────────────────────────────────────
  // Keyed by player index. True = parent has actively verified the auto-calculated grade.
  const [gradeConfirmed, setGradeConfirmed] = useState<Record<number, boolean>>(
    {},
  );

  // Enhanced health conditions state for players
  const [playerHealthConditions, setPlayerHealthConditions] = useState<
    Record<number, any[]>
  >({});
  const [playerCustomConditions, setPlayerCustomConditions] = useState<
    Record<number, string>
  >({});
  const [playerShowCustomInput, setPlayerShowCustomInput] = useState<
    Record<number, boolean>
  >({});

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const hasInitializedPlayers = useRef(false);

  // Form data states
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });

  const [guardianData, setGuardianData] = useState<Guardian>({
    fullName: '',
    relationship: '',
    phone: '',
    email: '',
    address: { street: '', street2: '', city: '', state: '', zip: '' },
    isCoach: false,
    aauNumber: '',
  });

  const [players, setPlayers] = useState<Player[]>([]);

  // Define all steps
  const steps = useMemo(
    () => [
      { id: 'account', label: 'Account', number: 1, icon: 'ti ti-user-plus' },
      {
        id: 'verifyEmail',
        label: 'Verify Email',
        number: 2,
        icon: 'ti ti-mail-check',
      },
      {
        id: 'guardian',
        label: 'Guardian Info',
        number: 3,
        icon: 'ti ti-user-shield',
      },
      { id: 'players', label: 'Player Info', number: 4, icon: 'ti ti-users' },
      { id: 'review', label: 'Review', number: 5, icon: 'ti ti-checklist' },
    ],
    [],
  );

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  // Helper function to create a new player
  const createNewPlayer = useCallback(
    (): Player => ({
      fullName: '',
      gender: '',
      dob: '',
      schoolName: '',
      healthConcerns: '',
      aauNumber: '',
      registrationYear: currentYear,
      season: 'Partizan Team',
      grade: '',
    }),
    [currentYear],
  );

  // Parse health concerns from existing players
  const parseHealthConcerns = (healthConcerns: string = '') => {
    const concerns = healthConcerns.split(',').map((c) => c.trim());
    const selected = concerns
      .filter((c) =>
        commonHealthConditions.some((condition) => condition.label === c),
      )
      .map((c) => {
        const found = commonHealthConditions.find(
          (condition) => condition.label === c,
        );
        return found || { value: 'custom', label: c };
      });

    const custom = concerns
      .filter(
        (c) =>
          !commonHealthConditions.some((condition) => condition.label === c),
      )
      .join(', ');

    return { selected, custom, hasCustom: !!custom };
  };

  // Handle health condition changes for a specific player index
  const handlePlayerConditionChange = (index: number, selected: any) => {
    setPlayerHealthConditions((prev) => ({ ...prev, [index]: selected || [] }));

    const hasCustom = selected?.some((item: any) => item.value === 'custom');
    setPlayerShowCustomInput((prev) => ({ ...prev, [index]: hasCustom }));

    updatePlayerHealthConcerns(
      index,
      selected || [],
      playerCustomConditions[index] || '',
    );
  };

  const handlePlayerCustomConditionChange = (index: number, value: string) => {
    setPlayerCustomConditions((prev) => ({ ...prev, [index]: value }));
    updatePlayerHealthConcerns(
      index,
      playerHealthConditions[index] || [],
      value,
    );
  };

  const updatePlayerHealthConcerns = (
    index: number,
    conditions: any[],
    custom: string,
  ) => {
    const selectedLabels = conditions
      .filter((c: any) => c.value !== 'custom')
      .map((c: any) => c.label);

    let healthConcerns = selectedLabels.join(', ');

    if (custom.trim() && playerShowCustomInput[index]) {
      healthConcerns = healthConcerns
        ? `${healthConcerns}, ${custom.trim()}`
        : custom.trim();
    }

    setPlayers((prevPlayers) => {
      const updated = [...prevPlayers];
      if (updated[index]) {
        updated[index] = { ...updated[index], healthConcerns };
      }
      return updated;
    });
  };

  // Handle player field change with grade calculation
  const handlePlayerChange = (
    index: number,
    field: keyof Player,
    value: string,
  ) => {
    // If DOB is changing, reset grade confirmation BEFORE updating players
    // (must be outside the setPlayers updater to avoid setState-inside-setState loops)
    if (field === 'dob') {
      setGradeConfirmed((prev) => ({ ...prev, [index]: false }));
    }

    setPlayers((prevPlayers) => {
      const updated = [...prevPlayers];
      const updatedPlayer = { ...updated[index], [field]: value };

      if (field === 'dob' && !updatedPlayer.isGradeOverridden) {
        const dob = value;
        if (dob && dob.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const calculatedGrade = calculateGradeFromDOB(dob, currentYear);
          console.log('📊 Grade calculation for player:', {
            name: updatedPlayer.fullName,
            dob,
            registrationYear: currentYear,
            calculatedGrade,
          });
          updatedPlayer.grade = calculatedGrade;
        }
      }

      updated[index] = updatedPlayer;
      return updated;
    });

    // Clear validation error for this field
    if (validationErrors[`player${index}${field}`]) {
      setValidationErrors((prev) => {
        const n = { ...prev };
        delete n[`player${index}${field}`];
        return n;
      });
    }
  };

  // Handle grade override (manual selection)
  const handleGradeOverride = (index: number) => {
    setPlayers((prevPlayers) => {
      const updated = [...prevPlayers];
      updated[index] = { ...updated[index], isGradeOverridden: true };
      return updated;
    });
    // Clear confirmation since the parent is now manually setting the grade
    setGradeConfirmed((prev) => ({ ...prev, [index]: false }));
  };

  // Validate all players — includes grade confirmation check
  const validateAllPlayers = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    players.forEach((player, index) => {
      if (!player.fullName?.trim()) {
        errors[`player${index}fullName`] = 'Full name is required';
        isValid = false;
      }
      if (!player.gender) {
        errors[`player${index}gender`] = 'Gender is required';
        isValid = false;
      }
      if (!player.dob) {
        errors[`player${index}dob`] = 'Date of birth is required';
        isValid = false;
      }
      if (!player.schoolName?.trim()) {
        errors[`player${index}schoolName`] = 'School name is required';
        isValid = false;
      }
      if (!player.grade) {
        errors[`player${index}grade`] = 'Grade is required';
        isValid = false;
      } else if (player.dob && !gradeConfirmed[index]) {
        // Grade exists but parent hasn't confirmed it yet
        errors[`player${index}grade`] = 'Please confirm the grade is correct';
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return isValid;
  }, [players, gradeConfirmed]);

  // Initialize health conditions when players are added
  useEffect(() => {
    players.forEach((player, index) => {
      if (!playerHealthConditions[index]) {
        const { selected, custom, hasCustom } = parseHealthConcerns(
          player.healthConcerns,
        );
        setPlayerHealthConditions((prev) => ({ ...prev, [index]: selected }));
        setPlayerCustomConditions((prev) => ({ ...prev, [index]: custom }));
        setPlayerShowCustomInput((prev) => ({ ...prev, [index]: hasCustom }));
      }
    });
  }, [players.length]);

  // Stable guardian change handler
  const handleGuardianChange = useCallback((updated: Guardian) => {
    setGuardianData(updated);
  }, []);

  // Handle step navigation
  const handleStepClick = useCallback(
    (stepId: string) => {
      const stepIndex = steps.findIndex((step) => step.id === stepId);
      const currentIndex = steps.findIndex((step) => step.id === currentStep);
      if (stepIndex <= currentIndex) {
        setCurrentStep(stepId as RegistrationStep);
      }
    },
    [steps, currentStep],
  );

  // Handle account creation
  const handleAccountCreated = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      setIsProcessing(true);
      setFormError(null);

      try {
        localStorage.setItem('pendingEmail', email);
        await createTempAccount(email, password);

        if (isMounted.current) {
          setFormData((prev) => ({
            ...prev,
            email,
            password,
            tempAccount: { email, password },
          }));
          setIsVerificationSent(true);
          setCurrentStep('verifyEmail');
        }
      } catch (error: any) {
        if (isMounted.current) {
          let errorMessage = 'Failed to create account';
          if (
            error.message?.includes('network') ||
            error.code === 'ERR_NETWORK'
          ) {
            errorMessage = 'Network error: Please check your connection.';
          } else if (error.message?.includes('already exists')) {
            errorMessage = 'Email already registered. Please sign in.';
          } else if (error.message) {
            errorMessage = error.message;
          }
          setFormError(errorMessage);
        }
      } finally {
        if (isMounted.current) {
          setIsProcessing(false);
        }
      }
    },
    [createTempAccount],
  );

  // Handle verification completion
  const handleVerified = useCallback(() => {
    setCurrentStep('guardian');
    setShowPlayerChoice(false);
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    switch (currentStep) {
      case 'verifyEmail':
        setCurrentStep('account');
        break;
      case 'guardian':
        setShowPlayerChoice(false);
        setCurrentStep('verifyEmail');
        break;
      case 'players':
        setCurrentStep('guardian');
        break;
      case 'review':
        setCurrentStep('players');
        break;
    }
  }, [currentStep]);

  // Handle guardian complete
  const handleGuardianComplete = useCallback(() => {
    if (!guardianData.fullName.trim()) {
      setFormError('Full name is required');
      return;
    }
    if (!guardianData.relationship.trim()) {
      setFormError('Relationship is required');
      return;
    }
    if (!guardianData.phone.trim()) {
      setFormError('Phone number is required');
      return;
    }
    const phoneDigits = guardianData.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setFormError('Please enter a valid 10-digit phone number');
      return;
    }
    setFormError(null);
    setShowPlayerChoice(true);
  }, [guardianData]);

  // Handle players change
  const handlePlayersChange = useCallback(
    (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    },
    [setPlayers],
  );

  // Handle skip players
  const handleSkipPlayers = useCallback(() => {
    setShowPlayerChoice(false);
    setCurrentStep('review');
  }, []);

  // Handle add players
  const handleAddPlayers = useCallback(() => {
    setShowPlayerChoice(false);
    setCurrentStep('players');
    setPlayers((prev) => (prev.length === 0 ? [createNewPlayer()] : prev));
  }, [createNewPlayer]);

  // Remove a player and clean up all associated state
  const removePlayer = (index: number) => {
    setPlayers((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });

    setPlayerHealthConditions((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });
    setPlayerCustomConditions((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });
    setPlayerShowCustomInput((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });
    setGradeConfirmed((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });

    setValidationErrors((prev) => {
      const n = { ...prev };
      Object.keys(n).forEach((key) => {
        if (key.startsWith(`player${index}`)) delete n[key];
      });
      return n;
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agreeToTerms) {
      setFormError('Please agree to the terms and conditions');
      window.scrollTo(0, 0);
      return;
    }

    if (players.length > 0 && !validateAllPlayers()) {
      setFormError('Please complete all required player information');
      window.scrollTo(0, 0);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const addressString = `${guardianData.address.street}${
        guardianData.address.street2 ? ', ' + guardianData.address.street2 : ''
      }, ${guardianData.address.city}, ${guardianData.address.state} ${
        guardianData.address.zip
      }`;

      console.log('🚀 Starting final registration process...');

      const registeredParent = await register(
        formData.email.trim(),
        formData.password.trim(),
        guardianData.fullName.trim(),
        guardianData.phone.replace(/\D/g, ''),
        addressString,
        guardianData.relationship.trim(),
        guardianData.isCoach,
        guardianData.aauNumber || '',
        formData.agreeToTerms,
      );

      console.log('✅ Parent registered successfully:', registeredParent._id);

      if (players.length > 0) {
        console.log(`🎯 Registering ${players.length} players...`);
        await registerPlayers(players, registeredParent._id);
        console.log('✅ All players registered successfully');
      } else {
        console.log('ℹ️ No players to register');
      }

      localStorage.removeItem('pendingEmail');
      await refreshAuthData();

      setRegistrationTimestamp(new Date().toLocaleString());
      setRegistrationCompleted(true);
      setCurrentStep('success');

      console.log('🎉 Registration completed successfully!');
    } catch (error: any) {
      console.error('❌ Registration Error:', error);

      let errorMessage = 'Registration failed. Please try again.';

      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.toLowerCase().includes('email')) {
          errorMessage =
            'The email address is already registered. Please use a different email or sign in.';
        }
      }

      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const registerPlayers = async (players: Player[], parentId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      for (const player of players) {
        if (
          !player.fullName ||
          !player.gender ||
          !player.dob ||
          !player.schoolName
        ) {
          throw new Error(
            `Missing required fields for player: ${player.fullName}`,
          );
        }

        const playerData = {
          fullName: player.fullName.trim(),
          gender: player.gender,
          dob: player.dob,
          schoolName: player.schoolName.trim(),
          healthConcerns: player.healthConcerns || '',
          aauNumber: player.aauNumber || '',
          registrationYear: currentYear,
          season: 'Partizan Team',
          parentId: parentId,
          grade: player.grade || '',
          isGradeOverridden: player.isGradeOverridden || false,
          skipSeasonRegistration: true,
        };

        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/players/register`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(playerData),
          },
        );

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(
            responseData.error ||
              `Failed to register player: ${player.fullName}`,
          );
        }

        console.log('✅ Player registered successfully:', player.fullName);
      }
    } catch (error) {
      console.error('❌ Error in registerPlayers:', error);
      throw error;
    }
  };

  const handleComplete = useCallback(() => {
    navigate(routes.adminDashboard);
  }, [navigate, routes.adminDashboard]);

  const handleAddMorePlayers = useCallback(() => {
    setCurrentStep('players');
  }, []);

  const handleAgreeToTermsChange = useCallback((agree: boolean) => {
    setFormData((prev) => ({ ...prev, agreeToTerms: agree }));
  }, []);

  // ── Derived: are all current players fully valid + grade confirmed? ───────────
  const allPlayersReadyToAdvance = players.every(
    (p, idx) =>
      p.fullName?.trim() &&
      p.gender &&
      p.dob &&
      p.schoolName?.trim() &&
      p.grade &&
      gradeConfirmed[idx],
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'account':
        return <AccountCreationModule onComplete={handleAccountCreated} />;

      case 'verifyEmail':
        return (
          <EmailVerificationStep
            email={formData.email || localStorage.getItem('pendingEmail') || ''}
            onVerified={handleVerified}
            onBack={handleBack}
            isVerificationSent={isVerificationSent}
          />
        );

      case 'guardian':
        // Player choice screen
        if (showPlayerChoice) {
          return (
            <div className='card mb-4'>
              <div className='card-header bg-light'>
                <div className='d-flex align-items-center'>
                  <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                    <i className='ti ti-users fs-16' />
                  </span>
                  <h4 className='text-dark'>Add Players Now?</h4>
                </div>
              </div>
              <div className='card-body'>
                <div className='text-center py-4'>
                  <div className='mb-4'>
                    <i className='ti ti-user-question fs-1 text-primary mb-3'></i>
                    <h3>Would you like to add players to your account?</h3>
                    <p className='text-muted'>
                      You can add players now or add them later from your
                      dashboard.
                    </p>
                  </div>

                  <div className='row'>
                    <div className='col-md-6 mb-3'>
                      <div className='card h-100 border-success border-2'>
                        <div className='card-body text-center d-flex flex-column'>
                          <div className='mb-3'>
                            <i className='ti ti-user-plus fs-1 text-success'></i>
                          </div>
                          <h4 className='text-success'>Add Players Now</h4>
                          <p className='text-muted small'>
                            Add player information now to save time for future
                            registrations
                          </p>
                          <div className='mt-auto'>
                            <button
                              type='button'
                              className='btn btn-success w-100'
                              onClick={handleAddPlayers}
                            >
                              <i className='ti ti-plus me-2'></i>
                              Add Players Now
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className='col-md-6 mb-3'>
                      <div className='card h-100 border-primary border-2'>
                        <div className='card-body text-center d-flex flex-column'>
                          <div className='mb-3'>
                            <i className='ti ti-clock fs-1 text-primary'></i>
                          </div>
                          <h4 className='text-primary'>Add Later</h4>
                          <p className='text-muted small'>
                            Skip for now and add players from your dashboard
                            later
                          </p>
                          <div className='d-flex justify-content-end'>
                            <button
                              type='button'
                              className='btn btn-outline-primary w-100'
                              onClick={handleSkipPlayers}
                            >
                              <i className='ti ti-arrow-right me-2'></i>
                              Continue to Review
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Guardian information screen
        return (
          <div className='card mb-4'>
            <div className='card-header bg-light'>
              <div className='d-flex align-items-center'>
                <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                  <i className='ti ti-user-shield fs-16' />
                </span>
                <h4 className='text-dark'>Guardian Information</h4>
              </div>
            </div>
            <div className='card-body'>
              <GuardianRegistrationModule
                guardian={guardianData}
                onGuardianChange={handleGuardianChange}
                isAdditional={false}
              />
              <div className='d-flex justify-content-end mt-4'>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={handleGuardianComplete}
                >
                  Continue
                  <i className='ti ti-arrow-right ms-2'></i>
                </button>
              </div>
            </div>
          </div>
        );

      case 'players':
        return (
          <div className='card mb-4'>
            <div className='card-header bg-light'>
              <div className='d-flex align-items-center'>
                <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                  <i className='ti ti-users fs-16' />
                </span>
                <h4 className='text-dark'>Player Registration (Optional)</h4>
              </div>
            </div>
            <div className='card-body'>
              <p className='text-muted mb-4'>
                You can register players now or add them later from your
                dashboard. Adding players now will pre-fill their information
                for future registrations.
              </p>

              {players.map((player, index) => (
                <div
                  key={index}
                  className='player-form-section mb-4 border-bottom pb-4'
                >
                  {players.length > 1 && (
                    <div className='d-flex justify-content-between align-items-center mb-3'>
                      <h6 className='text-primary'>Player {index + 1}</h6>
                      <button
                        type='button'
                        className='btn btn-sm btn-outline-danger'
                        onClick={() => removePlayer(index)}
                      >
                        Remove Player
                      </button>
                    </div>
                  )}

                  <div className='row'>
                    {/* Full Name */}
                    <div className='col-md-6'>
                      <NameInput
                        value={player.fullName}
                        onChange={(val) =>
                          handlePlayerChange(index, 'fullName', val)
                        }
                        error={validationErrors[`player${index}fullName`]}
                        required
                      />
                    </div>

                    {/* Gender */}
                    <div className='col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>Gender</label>
                        <select
                          className={`form-control ${
                            validationErrors[`player${index}gender`]
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={player.gender}
                          onChange={(e) =>
                            handlePlayerChange(index, 'gender', e.target.value)
                          }
                          required
                        >
                          <option value=''>Select Gender</option>
                          <option value='Male'>Male</option>
                          <option value='Female'>Female</option>
                        </select>
                        {validationErrors[`player${index}gender`] && (
                          <div className='invalid-feedback'>
                            {validationErrors[`player${index}gender`]}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div className='col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>Date of Birth</label>
                        <input
                          type='date'
                          className={`form-control ${
                            validationErrors[`player${index}dob`]
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={player.dob}
                          onChange={(e) =>
                            handlePlayerChange(index, 'dob', e.target.value)
                          }
                          required
                        />
                        {validationErrors[`player${index}dob`] && (
                          <div className='invalid-feedback'>
                            {validationErrors[`player${index}dob`]}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* School Name */}
                    <div className='col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>School Name</label>
                        <SchoolAutocomplete
                          value={player.schoolName}
                          onChange={(val) =>
                            handlePlayerChange(index, 'schoolName', val)
                          }
                        />
                        {validationErrors[`player${index}schoolName`] && (
                          <div className='invalid-feedback d-block'>
                            {validationErrors[`player${index}schoolName`]}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Grade — GradeConfirmationBanner ── */}
                    <div className='col-md-6'>
                      <GradeConfirmationBanner
                        playerIndex={index}
                        player={player}
                        gradeConfirmed={gradeConfirmed[index] ?? false}
                        onConfirm={() =>
                          setGradeConfirmed((prev) => ({
                            ...prev,
                            [index]: true,
                          }))
                        }
                        onAdjust={() => handleGradeOverride(index)}
                        onChange={(val) =>
                          handlePlayerChange(index, 'grade', val)
                        }
                        validationError={
                          validationErrors[`player${index}grade`]
                        }
                      />
                    </div>

                    {/* AAU Number */}
                    <div className='col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>AAU Number</label>
                        <input
                          type='text'
                          className='form-control'
                          value={player.aauNumber || ''}
                          onChange={(e) =>
                            handlePlayerChange(
                              index,
                              'aauNumber',
                              e.target.value,
                            )
                          }
                          placeholder='If applicable'
                        />
                      </div>
                    </div>
                  </div>

                  {/* Health Conditions */}
                  <div className='row mt-3'>
                    <div className='col-12'>
                      <div className='card bg-light'>
                        <div className='card-header bg-transparent py-2'>
                          <div className='d-flex align-items-center'>
                            <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                              <i className='ti ti-heartbeat fs-16' />
                            </span>
                            <h6 className='mb-0'>Medical History</h6>
                          </div>
                        </div>
                        <div className='card-body pb-2'>
                          <div className='mb-3'>
                            <label className='form-label'>
                              Health Conditions
                            </label>
                            <Select
                              isMulti
                              options={commonHealthConditions}
                              className='basic-multi-select'
                              classNamePrefix='select'
                              value={playerHealthConditions[index] || []}
                              onChange={(selected) =>
                                handlePlayerConditionChange(index, selected)
                              }
                              styles={selectStyles}
                              placeholder='Select health conditions...'
                            />
                            <small className='text-muted'>
                              Select all that apply
                            </small>
                          </div>

                          {playerShowCustomInput[index] && (
                            <div className='mb-3'>
                              <label className='form-label'>
                                Specify Other Condition(s)
                              </label>
                              <input
                                type='text'
                                className='form-control'
                                value={playerCustomConditions[index] || ''}
                                onChange={(e) =>
                                  handlePlayerCustomConditionChange(
                                    index,
                                    e.target.value,
                                  )
                                }
                                placeholder='Please describe any other health conditions...'
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add another player */}
              <div className='mt-3'>
                <button
                  type='button'
                  className='btn btn-outline-primary'
                  onClick={() => {
                    setPlayers([...players, createNewPlayer()]);
                  }}
                >
                  <i className='ti ti-plus me-2'></i>
                  Add Another Player
                </button>
              </div>

              {/* Validation summary */}
              {Object.keys(validationErrors).length > 0 && (
                <div className='alert alert-warning mt-3'>
                  <i className='ti ti-alert-triangle me-2'></i>
                  Please complete all required player information to continue.
                </div>
              )}

              <div className='d-flex justify-content-end mt-4'>
                <button
                  type='button'
                  className={`btn ${
                    players.length === 0 || allPlayersReadyToAdvance
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                  onClick={() => {
                    if (players.length === 0) {
                      setCurrentStep('review');
                    } else if (validateAllPlayers()) {
                      setCurrentStep('review');
                    } else {
                      setFormError(
                        'Please complete all required player information',
                      );
                      window.scrollTo(0, 0);
                    }
                  }}
                >
                  Continue to Review
                  <i className='ti ti-arrow-right ms-2'></i>
                </button>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <form onSubmit={handleSubmit}>
            <div className='card mb-4'>
              <div className='card-header bg-light'>
                <div className='d-flex align-items-center'>
                  <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                    <i className='ti ti-checklist fs-16' />
                  </span>
                  <h4 className='text-dark'>Review Information</h4>
                </div>
              </div>
              <div className='card-body'>
                <div className='row'>
                  <div className='col-md-6'>
                    <h5>Account Information</h5>
                    <p>
                      <strong>Email:</strong> {formData.email}
                    </p>
                  </div>
                  <div className='col-md-6'>
                    <h5>Guardian Information</h5>
                    <strong>Name:</strong> {guardianData.fullName}
                    <br />
                    <strong>Relationship:</strong> {guardianData.relationship}
                    <br />
                    <strong>Phone:</strong> {guardianData.phone}
                    <br />
                    <strong>Email:</strong> {guardianData.email}
                    <br />
                    <strong>Address:</strong> {guardianData.address.street}
                    {guardianData.address.street2
                      ? `, ${guardianData.address.street2}`
                      : ''}
                    , {guardianData.address.city}, {guardianData.address.state}{' '}
                    {guardianData.address.zip}
                    <br />
                    <br />
                    {guardianData.isCoach && (
                      <p>
                        <strong>AAU Number:</strong> {guardianData.aauNumber}
                      </p>
                    )}
                  </div>
                </div>

                {players.length > 0 && (
                  <div className='mt-4'>
                    <h5>Players ({players.length})</h5>
                    {players.map((player, index) => (
                      <div key={index} className='border rounded p-3 mb-2'>
                        <p className='mb-1'>
                          <strong>{player.fullName || 'Not provided'}</strong>
                        </p>
                        <p className='mb-1 text-muted'>
                          Grade: {player.grade || 'Not provided'}
                        </p>
                        <p className='mb-0 text-muted'>
                          DOB: {player.dob || 'Not provided'}
                        </p>
                        <p className='mb-0 text-muted'>
                          Gender: {player.gender || 'Not provided'}
                        </p>
                        <p className='mb-0 text-muted'>
                          School: {player.schoolName || 'Not provided'}
                        </p>
                        {player.healthConcerns && (
                          <p className='mb-0 text-muted'>
                            Health Concerns: {player.healthConcerns}
                          </p>
                        )}
                        {player.aauNumber && (
                          <p className='mb-0 text-muted'>
                            AAU Number: {player.aauNumber}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <TermsAndConditionsModule
                  agreeToTerms={formData.agreeToTerms}
                  onAgreeToTermsChange={handleAgreeToTermsChange}
                  validationError={formError || undefined}
                  waiverModalId='waiver'
                />

                <div className='d-flex justify-content-end mt-4'>
                  <button
                    type='submit'
                    className='btn btn-success'
                    disabled={isSubmitting || !formData.agreeToTerms}
                  >
                    {isSubmitting ? (
                      <>
                        <span className='spinner-border spinner-border-sm me-2'></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className='ti ti-check me-2'></i>
                        Complete Registration
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        );

      case 'success':
        return (
          <div className='card border-0 shadow-sm'>
            <div className='card-header'>
              <h4 className='mb-0'>🎉 Registration Complete!</h4>
            </div>
            <div className='card-body'>
              <div className='text-center py-4'>
                <i className='ti ti-circle-check fs-1 text-success mb-3'></i>
                <h3>Welcome to Partizan Basketball!</h3>

                <div className='alert alert-success mb-3'>
                  <div className='d-flex align-items-center'>
                    <i className='ti ti-mail-check fs-4 me-3'></i>
                    <div>
                      <h5 className='mb-1'>Welcome Email Sent!</h5>
                      <p className='mb-0'>
                        A welcome email has been sent to{' '}
                        <strong>{formData.email}</strong>
                      </p>
                      <small className='text-muted'>
                        Please check your inbox (and spam folder) for account
                        details.
                      </small>
                    </div>
                  </div>
                </div>

                <p className='text-muted'>
                  Your account has been created successfully.
                  {players.length > 0
                    ? ` ${players.length} player${
                        players.length > 1 ? 's have' : ' has'
                      } been added to your account.`
                    : ' You can add players later from your dashboard.'}
                </p>
              </div>

              <div className='receipt-card mb-4'>
                <div className='card border'>
                  <div className='card-header bg-light'>
                    <div className='d-flex justify-content-between align-items-center'>
                      <h5 className='mb-0'>Registration Details</h5>
                      <div className='badge bg-success'>
                        <i className='ti ti-mail me-1'></i>
                        Email Sent
                      </div>
                    </div>
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
                          <strong>Account Email:</strong>
                        </p>
                        <p>
                          {formData.email}
                          <span className='ms-2 badge bg-success'>
                            <i className='ti ti-check me-1'></i>
                            Verified
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className='mb-3'>
                      <p className='mb-1'>
                        <strong>Guardian:</strong>
                      </p>
                      <p>{guardianData.fullName}</p>
                    </div>

                    {players.length > 0 && (
                      <div className='mb-3'>
                        <p className='mb-1'>
                          <strong>Players Registered:</strong>
                        </p>
                        <ul className='list-group'>
                          {players.map((player, index) => (
                            <li
                              key={index}
                              className='list-group-item d-flex justify-content-between'
                            >
                              <div>
                                <strong>{player.fullName}</strong>
                                <span className='text-muted small d-block'>
                                  {player.grade} Grade • {player.gender} •{' '}
                                  {player.schoolName || 'School not specified'}
                                </span>
                                {player.healthConcerns && (
                                  <span className='text-muted small d-block'>
                                    Health: {player.healthConcerns}
                                  </span>
                                )}
                              </div>
                              <span className='badge bg-success'>Added</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className='mb-3'>
                      <p className='mb-1'>
                        <strong>Next Steps:</strong>
                      </p>
                      <div className='alert alert-info'>
                        <ul className='mb-0'>
                          <li>
                            <i className='ti ti-mail text-primary me-2'></i>
                            <strong>Check your email</strong> - You should
                            receive a welcome email shortly
                          </li>
                          <li className='mt-2'>
                            <i className='ti ti-calendar text-primary me-2'></i>
                            <strong>Explore your dashboard</strong> - Access all
                            features from your account dashboard
                          </li>
                          {players.length === 0 && (
                            <li className='mt-2'>
                              <i className='ti ti-user-plus text-primary me-2'></i>
                              <strong>Add players</strong> - You can add players
                              to your account at any time
                            </li>
                          )}
                          <li className='mt-2'>
                            <i className='ti ti-bell-ringing text-primary me-2'></i>
                            <strong>Get notified</strong> - We'll notify you
                            about upcoming registrations
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
                  {players.length === 0
                    ? 'Add Players Now'
                    : 'Add More Players'}
                </button>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={handleComplete}
                >
                  <i className='ti ti-home me-2'></i>
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isProcessing || isLoadingUserData) {
    return (
      <div className='container-fuild'>
        <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
          <div className='row justify-content-center align-items-center vh-100'>
            <LoadingSpinner />
            <p className='mt-3 text-muted'>Loading registration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='container-fuild'>
        <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
          <div className='row'>
            <div className='col-lg-6'>
              <div className='d-lg-flex align-items-center justify-content-center bg-light-300 d-lg-block d-none flex-wrap vh-100 overflowy-auto bg-01'>
                <div>
                  <ImageWithBasePath
                    src='assets/img/authentication/authentication.png'
                    alt='Img'
                  />
                </div>
              </div>
            </div>
            <div className='col-lg-6 col-md-12 col-sm-12'>
              <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
                <div className='col-md-10 mx-auto p-4'>
                  <div className='mx-auto mb-4 text-center'>
                    <ImageWithBasePath
                      src='assets/img/logo.png'
                      className='img-fluid'
                      alt='Logo'
                    />
                  </div>

                  <div className='form-header text-center mb-4'>
                    <h2 className='mt-3'>Create Your Account</h2>
                    <p>
                      {currentStep === 'success'
                        ? 'Welcome to Partizan Basketball!'
                        : 'Register to join Partizan Basketball. Players can be added now or later.'}
                    </p>
                  </div>

                  {currentStep !== 'success' && (
                    <StepIndicator
                      steps={steps}
                      currentStep={currentStep}
                      className='mb-4'
                    />
                  )}

                  <div className='form-content'>
                    {formError && (
                      <div className='alert alert-danger mb-4'>
                        <i className='ti ti-alert-circle me-2'></i>
                        {formError}
                        {formError.includes('already registered') && (
                          <div className='mt-2'>
                            <Link
                              to={routes.login}
                              className='btn btn-sm btn-outline-primary'
                            >
                              Sign In Instead
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                    <div className='step-content'>{renderStepContent()}</div>
                  </div>

                  {currentStep !== 'success' &&
                    currentStep !== 'verifyEmail' &&
                    currentStep !== 'account' && (
                      <div className='text-center mt-4'>
                        <h6 className='fw-normal text-dark mb-0'>
                          Already have an account?
                          <Link to={routes.login} className='hover-a'>
                            {' '}
                            Sign In
                          </Link>
                        </h6>
                      </div>
                    )}

                  <div className='mt-5 text-center'>
                    <p className='mb-0'>
                      © {currentYear} Partizan by{' '}
                      <a href='https://rainbootsmarketing.com/'>Rainboots</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;
