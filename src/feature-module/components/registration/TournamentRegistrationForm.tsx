import React, { useState, useEffect, useMemo, useCallback } from 'react';
import UserRegistrationModule from '../registration-modules/UserRegistrationModule';
import TournamentRegistrationModule from '../registration-modules/TournamentRegistrationModule';
import PaymentModule from '../registration-modules/PaymentModule';
import AccountCreationModule from '../registration-modules/AccountCreationModule';
import EmailVerificationStep from '../../auth/emailVerification/emailVerificationStep';
import {
  FormData,
  RegistrationFormConfig,
  SeasonEvent,
  Team,
  TournamentSpecificConfig,
} from '../../../types/registration-types';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

interface TournamentRegistrationFormProps {
  onSuccess?: (data?: any) => void;
  formConfig?: RegistrationFormConfig;
  tournamentConfig?: RegistrationFormConfig | TournamentSpecificConfig;
  seasonEvent?: SeasonEvent;
  isExistingUser?: boolean;
  savedUserData?: any;
  savedPlayers?: any[];
  skipToPlayerStep?: boolean;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const TournamentRegistrationForm: React.FC<TournamentRegistrationFormProps> = ({
  onSuccess,
  formConfig,
  tournamentConfig: propTournamentConfig,
  seasonEvent,
  isExistingUser = false,
}) => {
  const {
    isAuthenticated,
    isLoading: authLoading,
    isEmailVerified,
    parent: currentUser,
    createTempAccount,
    checkAuth,
  } = useAuth();

  // State for loaded tournament config
  const [loadedTournamentConfig, setLoadedTournamentConfig] =
    useState<TournamentSpecificConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [savedUserData, setSavedUserData] = useState<any>(null);
  const [hasCompletedUserRegistration, setHasCompletedUserRegistration] =
    useState(false);

  // Helper function to extract tournament data from config
  const extractTournamentConfig = useCallback(
    (
      config: RegistrationFormConfig | TournamentSpecificConfig | null
    ): TournamentSpecificConfig | null => {
      if (!config) return null;

      // If it's already a TournamentSpecificConfig, return it
      if ((config as TournamentSpecificConfig).tournamentName) {
        return config as TournamentSpecificConfig;
      }

      // If it's a RegistrationFormConfig with tournament fields, convert it
      const regConfig = config as RegistrationFormConfig;
      if (regConfig.tournamentName) {
        return {
          tournamentName: regConfig.tournamentName,
          tournamentYear:
            regConfig.tournamentYear ||
            regConfig.year ||
            new Date().getFullYear(),
          displayName: regConfig.displayName || regConfig.tournamentName,
          registrationDeadline: regConfig.registrationDeadline || '',
          tournamentDates: regConfig.tournamentDates || [],
          locations: regConfig.locations || [],
          divisions: regConfig.divisions || [],
          ageGroups: regConfig.ageGroups || [],
          requiresRoster: regConfig.requiresRoster || false,
          requiresInsurance: regConfig.requiresInsurance || false,
          paymentDeadline: regConfig.paymentDeadline || '',
          refundPolicy:
            regConfig.refundPolicy || 'No refunds after registration deadline',
          rulesDocumentUrl: regConfig.rulesDocumentUrl || '',
          scheduleDocumentUrl: regConfig.scheduleDocumentUrl || '',
          tournamentFee:
            regConfig.tournamentFee || regConfig.pricing?.basePrice || 425,
          isActive: regConfig.isActive || false,
          _id: regConfig._id,
          createdAt: regConfig.createdAt,
          updatedAt: regConfig.updatedAt,
          __v: regConfig.__v,
        };
      }

      return null;
    },
    []
  );

  // Load tournament configuration
  useEffect(() => {
    const loadTournamentConfig = async () => {
      // If config provided via props, use it
      if (propTournamentConfig) {
        const extractedConfig = extractTournamentConfig(propTournamentConfig);
        setLoadedTournamentConfig(extractedConfig);
        return;
      }

      // If seasonEvent provided, try to load config from backend
      if (seasonEvent?.season && seasonEvent?.year) {
        setIsLoadingConfig(true);
        setConfigError(null);

        try {
          console.log('🏀 Loading tournament config for:', {
            season: seasonEvent.season,
            year: seasonEvent.year,
          });

          const response = await fetch(
            `${API_BASE_URL}/admin/tournament-configs/${encodeURIComponent(
              seasonEvent.season
            )}/${seasonEvent.year}`
          );

          if (response.ok) {
            const config = await response.json();
            console.log('✅ Tournament config loaded:', config);
            const extractedConfig = extractTournamentConfig(config);
            setLoadedTournamentConfig(extractedConfig);
          } else if (response.status === 404) {
            console.log('⚠️ No tournament config found');
            setLoadedTournamentConfig(null);
          } else {
            const errorData = await response.json();
            throw new Error(
              errorData.message || 'Failed to load tournament config'
            );
          }
        } catch (error) {
          console.error('❌ Error loading tournament config:', error);
          setConfigError('Unable to load tournament configuration.');
          setLoadedTournamentConfig(null);
        } finally {
          setIsLoadingConfig(false);
        }
      }
    };

    loadTournamentConfig();
  }, [seasonEvent, propTournamentConfig, extractTournamentConfig]);

  const defaultSeasonEvent = useMemo(
    () =>
      seasonEvent || {
        season: 'Tournament',
        year: new Date().getFullYear(),
        eventId: `tournament-${new Date().getFullYear()}`,
      },
    [seasonEvent]
  );

  // Default tournament config (used if none loaded)
  const defaultTournamentConfig: TournamentSpecificConfig = useMemo(
    () => ({
      tournamentName: `${defaultSeasonEvent.season} Tournament ${defaultSeasonEvent.year}`,
      tournamentYear: defaultSeasonEvent.year,
      displayName: '',
      registrationDeadline: '',
      tournamentDates: [],
      locations: ['TBD'],
      divisions: ['Gold', 'Silver'],
      ageGroups: [],
      requiresRoster: true,
      requiresInsurance: true,
      paymentDeadline: '',
      refundPolicy: 'No refunds after registration deadline',
      rulesDocumentUrl: '',
      scheduleDocumentUrl: '',
      tournamentFee: 425,
      isActive: true,
      _id: `default-tournament-${defaultSeasonEvent.year}`,
    }),
    [defaultSeasonEvent]
  );

  // Merge loaded config with defaults
  const effectiveTournamentConfig = useMemo(() => {
    const config = loadedTournamentConfig || defaultTournamentConfig;
    // Ensure _id always exists
    if (!config._id) {
      config._id = `tournament-${config.tournamentName}-${config.tournamentYear}`;
    }
    return config;
  }, [loadedTournamentConfig, defaultTournamentConfig]);

  // Form config with tournament-specific pricing
  const defaultFormConfig: RegistrationFormConfig = useMemo(
    () => ({
      isActive: true,
      requiresPayment: true,
      requiresQualification: false,
      pricing: {
        basePrice: effectiveTournamentConfig.tournamentFee || 425,
        packages: [],
      },
      ...formConfig,
    }),
    [formConfig, effectiveTournamentConfig]
  );

  // Check if form should be shown based on isActive
  const shouldShowForm = useMemo(() => {
    const formConfigActive = formConfig?.isActive ?? true;
    const tournamentConfigActive = effectiveTournamentConfig?.isActive ?? true;

    return formConfigActive && tournamentConfigActive;
  }, [formConfig, effectiveTournamentConfig]);

  const [currentStep, setCurrentStep] = useState<
    'account' | 'verifyEmail' | 'user' | 'team' | 'payment'
  >('account');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any>(null);
  const [teamValidation, setTeamValidation] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    eventData: {
      season: defaultSeasonEvent.season,
      year: defaultSeasonEvent.year,
      eventId: defaultSeasonEvent.eventId,
    },
    teams: [],
  });

  // Step indicators
  const steps = useMemo(() => {
    const allSteps = [
      { id: 'account', name: 'Account', icon: 'ti ti-user-plus' },
      { id: 'verifyEmail', name: 'Verify Email', icon: 'ti ti-mail' },
      { id: 'user', name: 'Coach Info', icon: 'ti ti-user-shield' },
      { id: 'team', name: 'Team Info', icon: 'ti ti-trophy' },
      { id: 'payment', name: 'Payment', icon: 'ti ti-credit-card' },
    ];

    if (isAuthenticated || hasCompletedUserRegistration) {
      return allSteps.filter(
        (step) => step.id !== 'account' && step.id !== 'verifyEmail'
      );
    }
    return allSteps;
  }, [isAuthenticated, hasCompletedUserRegistration]);

  const currentStepIndex = useMemo(
    () => steps.findIndex((step) => step.id === currentStep),
    [steps, currentStep]
  );

  // Initialize step for authenticated users or existing registration
  useEffect(() => {
    if (authLoading || isLoadingConfig) return;

    // Check for saved user data in localStorage
    const savedUser = localStorage.getItem('tournamentCoachData');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setSavedUserData(parsedUser);
        setHasCompletedUserRegistration(true);
        updateFormData({ user: parsedUser });
      } catch (error) {
        console.error('Error parsing saved user data:', error);
      }
    }

    if (isExistingUser || isAuthenticated || hasCompletedUserRegistration) {
      setCurrentStep('team');
    } else {
      setCurrentStep('account');
    }
  }, [
    authLoading,
    isLoadingConfig,
    isExistingUser,
    isAuthenticated,
    hasCompletedUserRegistration,
  ]);

  const updateFormData = useCallback((newData: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  }, []);

  const calculatePaymentAmount = useCallback((): number => {
    // Tournament fee per team
    return defaultFormConfig.pricing.basePrice * 100; // Convert to cents
  }, [defaultFormConfig.pricing.basePrice]);

  // Function to save coach data to database
  const saveCoachData = useCallback(
    async (coachData: any): Promise<any> => {
      try {
        const password = coachData.password || formData.tempAccount?.password;

        if (!password && !isAuthenticated) {
          throw new Error('Password is required for new coach registration');
        }

        // Normalize address
        const normalizedAddress = {
          street: coachData.address?.street?.trim() || '',
          street2: coachData.address?.street2?.trim() || '',
          city: coachData.address?.city?.trim() || '',
          state: (coachData.address?.state?.trim() || '').toUpperCase(),
          zip: coachData.address?.zip?.trim() || '',
        };

        // FIX: Check if AAU number is provided for coaches
        const aauNumber = coachData.aauNumber?.trim();

        // FIX: For tournament registration, coaches might not have AAU numbers
        // So we should handle this case or provide a default
        const finalAauNumber = aauNumber || 'NOT_PROVIDED';

        // Prepare tournament coach registration data
        const registrationData: any = {
          email: coachData.email.toLowerCase().trim(),
          password: password?.trim(),
          fullName: coachData.fullName.trim(),
          phone: coachData.phone.replace(/\D/g, ''),
          address: normalizedAddress,
          relationship: coachData.relationship.trim(),
          isCoach: true, // Tournament registration is always for coaches
          aauNumber: finalAauNumber, // Use the fixed AAU number
          agreeToTerms: coachData.agreeToTerms || false,
          registerType: 'self',
          registrationType: 'tournament',
          tournamentName: effectiveTournamentConfig.tournamentName,
          tournamentYear: effectiveTournamentConfig.tournamentYear,
          additionalGuardians:
            coachData.additionalGuardians?.map((guardian: any) => ({
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
              aauNumber: guardian.aauNumber?.trim() || 'NOT_PROVIDED',
              usePrimaryAddress: guardian.usePrimaryAddress || false,
            })) || [],
          emergencyContact: coachData.emergencyContact || {},
        };

        // Use the register endpoint that creates/updates Parent documents
        const response = await fetch(`${API_BASE_URL}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(registrationData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || errorData.error || 'Coach registration failed'
          );
        }

        const result = await response.json();

        // Save token and user data to localStorage
        if (result.token) {
          localStorage.setItem('token', result.token);
          localStorage.setItem('parentId', result.parent._id);
          localStorage.setItem('parent', JSON.stringify(result.parent));

          // Save tournament-specific coach data
          const tournamentCoachData = {
            ...result.parent,
            tournamentName: effectiveTournamentConfig.tournamentName,
            tournamentYear: effectiveTournamentConfig.tournamentYear,
            isCoach: true,
          };
          localStorage.setItem(
            'tournamentCoachData',
            JSON.stringify(tournamentCoachData)
          );

          if (checkAuth) {
            await checkAuth();
          }
        }

        // Return the saved parent data
        const savedParent = result.parent || result;

        // Ensure _id exists
        if (!savedParent._id && result.parent?._id) {
          savedParent._id = result.parent._id;
        }

        return savedParent;
      } catch (error: any) {
        console.error('❌ Error saving tournament coach data:', error);
        throw error;
      }
    },
    [
      formData.tempAccount?.password,
      isAuthenticated,
      effectiveTournamentConfig,
      checkAuth,
    ]
  );

  const handleAccountCreated = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      try {
        setIsProcessing(true);
        setFormError(null);

        localStorage.setItem('pendingEmail', email);

        const result = await createTempAccount(email, password);

        updateFormData({
          tempAccount: { email, password },
        });

        setIsVerificationSent(true);
        setCurrentStep('verifyEmail');
        setFormError(null);
      } catch (error: any) {
        console.error('Account creation failed:', error);
        let message = 'Failed to create account';
        if (
          error.message?.includes('network') ||
          error.code === 'ERR_NETWORK'
        ) {
          message =
            'Network error: Cannot connect to server. Please check your connection.';
        } else if (error.message?.includes('already exists')) {
          message =
            'Email already registered. Please sign in or use a different email.';
        } else if (error.message) {
          message = error.message;
        }
        setFormError(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [createTempAccount, updateFormData]
  );

  const handleVerified = useCallback(() => {
    setCurrentStep('user');
  }, []);

  const handleUserComplete = useCallback(
    async (userData: any) => {
      try {
        setIsProcessing(true);
        setFormError(null);

        const userDataToSave = userData.user || userData;

        // Save coach data to database
        const savedCoach = await saveCoachData(userDataToSave);

        if (!savedCoach || !savedCoach._id) {
          throw new Error('Failed to save coach data - no parent ID returned');
        }

        // Update state
        setSavedUserData(savedCoach);
        updateFormData({
          user: savedCoach,
          userCompleted: true,
        });

        setHasCompletedUserRegistration(true);

        // Move to next step
        setCurrentStep('team');
      } catch (error: any) {
        console.error('❌ Error saving coach data:', error);
        setFormError(
          error.message || 'Failed to save coach information. Please try again.'
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [saveCoachData, updateFormData]
  );

  const handleNext = useCallback(
    async (stepData?: any) => {
      if (stepData) {
        updateFormData(stepData);
      }

      // Validate team before proceeding
      if (currentStep === 'team' && !teamValidation) {
        setFormError('Please complete all required team information');
        return;
      }

      switch (currentStep) {
        case 'account':
          setCurrentStep('verifyEmail');
          break;
        case 'verifyEmail':
          setCurrentStep('user');
          break;
        case 'user':
          // User data is saved in handleUserComplete, so we don't need to do anything here
          break;
        case 'team':
          if (defaultFormConfig.requiresPayment) {
            setCurrentStep('payment');
          } else {
            handleComplete();
          }
          break;
        case 'payment':
          handleComplete();
          break;
      }
    },
    [
      currentStep,
      teamValidation,
      defaultFormConfig.requiresPayment,
      updateFormData,
    ]
  );

  const handleBack = useCallback(() => {
    switch (currentStep) {
      case 'verifyEmail':
        setCurrentStep('account');
        break;
      case 'user':
        setCurrentStep('verifyEmail');
        break;
      case 'team':
        setCurrentStep('user');
        break;
      case 'payment':
        setCurrentStep('team');
        break;
    }
  }, [currentStep]);

  const handlePaymentComplete = useCallback((successData: any) => {
    setPaymentSuccessData(successData);

    // Clear tournament registration data
    localStorage.removeItem('tournamentCoachData');

    setTimeout(() => {
      handleComplete();
    }, 3000);
  }, []);

  const handleComplete = useCallback(() => {
    onSuccess?.(formData);
  }, [onSuccess, formData]);

  // Handle team validation change
  const handleTeamValidationChange = useCallback((isValid: boolean) => {
    setTeamValidation(isValid);
  }, []);

  // Render step indicators
  const renderStepIndicators = useCallback(
    () => (
      <div className='step-indicator mb-4'>
        <div className='d-flex justify-content-between align-items-center'>
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div
                className={`step ${currentStep === step.id ? 'active' : ''} ${
                  index < currentStepIndex ? 'completed' : ''
                }`}
              >
                <div className='step-icon'>
                  <i className={step.icon}></i>
                </div>
                <div className='step-label'>{step.name}</div>
              </div>
              {index < steps.length - 1 && (
                <div className='step-connector'></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    ),
    [steps, currentStep, currentStepIndex]
  );

  // Render thank you message with tournament details
  const renderThankYouMessage = useCallback(() => {
    const tournamentName = defaultSeasonEvent.season;
    const tournamentYear = defaultSeasonEvent.year;
    const config = effectiveTournamentConfig;

    return (
      <div className='card'>
        <div className='card-header'>
          <div className='d-flex align-items-center'>
            <i className='ti ti-trophy fs-24 me-2'></i>
            <h4 className='mb-0'>🎉 Tournament Registration Complete!</h4>
          </div>
        </div>
        <div className='card-body'>
          <div className='text-center py-4'>
            <i className='ti ti-circle-check fs-1 text-success mb-3'></i>
            <h3>Thank You for Registering Your Team!</h3>
            <p className='text-muted'>
              Your team has been registered successfully for the{' '}
              <strong>
                {tournamentName} {tournamentYear}
              </strong>{' '}
              tournament.
            </p>
          </div>

          {/* Registration Details */}
          <div className='registration-details p-4 rounded mb-4'>
            <h5 className='mb-3'>Registration Details</h5>
            <div className='row'>
              <div className='col-md-6'>
                <p>
                  <strong>Tournament:</strong> {tournamentName} {tournamentYear}
                </p>
                <p>
                  <strong>Tournament Fee:</strong> $
                  {defaultFormConfig.pricing.basePrice} per team
                </p>
                {config.tournamentDates.length > 0 && (
                  <p>
                    <strong>Tournament Dates:</strong>{' '}
                    {config.tournamentDates
                      .map((d) => new Date(d).toLocaleDateString())
                      .join(', ')}
                  </p>
                )}
              </div>
              <div className='col-md-6'>
                {formData.team && (
                  <>
                    <p>
                      <strong>Team Name:</strong> {formData.team.name}
                    </p>
                    <p>
                      <strong>Team Grade:</strong> {formData.team.grade} Grade
                    </p>
                    <p>
                      <strong>Division:</strong>{' '}
                      {formData.team.levelOfCompetition}
                    </p>
                    {savedUserData && (
                      <p>
                        <strong>Coach:</strong> {savedUserData.fullName}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {config.requiresRoster && (
              <div className='alert alert-warning mt-3'>
                <i className='ti ti-alert-triangle me-2'></i>
                <strong>Important:</strong> Please submit your team roster by{' '}
                {config.registrationDeadline
                  ? new Date(config.registrationDeadline).toLocaleDateString()
                  : 'the registration deadline'}
                .
              </div>
            )}

            {config.requiresInsurance && (
              <div className='alert alert-info mt-3'>
                <i className='ti ti-shield me-2'></i>
                <strong>Insurance:</strong> Please submit proof of insurance
                before the tournament starts.
              </div>
            )}
          </div>

          {/* Next Steps */}
          <div className='next-steps mt-4'>
            <h5 className='mb-3'>📋 Next Steps</h5>
            <div className='row'>
              <div className='col-md-6'>
                <div className='d-flex align-items-start mb-3'>
                  <i className='ti ti-mail text-primary me-2 mt-1'></i>
                  <div>
                    <strong>Confirmation Email</strong>
                    <p className='text-muted small mb-0'>
                      You'll receive a confirmation email with all details
                    </p>
                  </div>
                </div>
              </div>
              <div className='col-md-6'>
                <div className='d-flex align-items-start mb-3'>
                  <i className='ti ti-calendar text-primary me-2 mt-1'></i>
                  <div>
                    <strong>Check Schedule</strong>
                    <p className='text-muted small mb-0'>
                      Tournament schedule will be available soon
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='text-center mt-4'>
            <button onClick={handleComplete} className='btn btn-primary'>
              <i className='ti ti-home me-2'></i>
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }, [
    defaultSeasonEvent,
    effectiveTournamentConfig,
    defaultFormConfig.pricing.basePrice,
    formData.team,
    savedUserData,
    handleComplete,
  ]);

  // Check if form should be shown
  if (!shouldShowForm) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <i className='ti ti-trophy-off fs-1 text-muted mb-3'></i>
          <h4>Tournament Registration Closed</h4>
          <p className='text-muted'>
            This tournament registration is not currently available.
          </p>
        </div>
      </div>
    );
  }

  if (paymentSuccessData) {
    return renderThankYouMessage();
  }

  if (authLoading) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <LoadingSpinner />
          <p className='mt-3'>Loading registration form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='tournament-registration-form'>
      {renderStepIndicators()}

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
              isExistingUser || isAuthenticated || hasCompletedUserRegistration
            }
            initialData={formData.user || savedUserData}
            tournamentConfig={effectiveTournamentConfig}
            registrationType='tournament'
          />
        )}

        {currentStep === 'team' && (
          <TournamentRegistrationModule
            isExistingUser={
              isExistingUser || isAuthenticated || hasCompletedUserRegistration
            }
            onComplete={() => handleNext()}
            onBack={handleBack}
            formData={formData}
            updateFormData={updateFormData}
            eventData={formData.eventData}
            onValidationChange={handleTeamValidationChange}
            tournamentConfig={effectiveTournamentConfig}
            coachId={savedUserData?._id || currentUser?._id}
          />
        )}

        {currentStep === 'payment' && (
          <PaymentModule
            amount={calculatePaymentAmount()}
            customerEmail={
              formData.user?.email ||
              savedUserData?.email ||
              formData.tempAccount?.email ||
              currentUser?.email ||
              ''
            }
            onPaymentSuccess={(paymentResult) => {
              console.log('Tournament payment successful:', paymentResult);
              handlePaymentComplete(paymentResult);
            }}
            onPaymentError={(error) => setFormError(error)}
            description={`${defaultSeasonEvent.season} Team Registration`}
            isProcessing={isProcessing}
            onComplete={handlePaymentComplete}
            onBack={handleBack}
            formConfig={defaultFormConfig}
            team={formData.team}
            teams={formData.teams || []} // PASS THE TEAMS ARRAY
            eventData={formData.eventData}
            savedUserData={savedUserData}
            tournamentConfig={{
              // Required by TournamentSpecificConfig
              tournamentName: effectiveTournamentConfig.tournamentName,
              tournamentYear: effectiveTournamentConfig.tournamentYear,
              tournamentFee: effectiveTournamentConfig.tournamentFee,
              // Required for validation
              _id:
                effectiveTournamentConfig._id ||
                `tournament-${effectiveTournamentConfig.tournamentName
                  .replace(/\s+/g, '-')
                  .toLowerCase()}-${effectiveTournamentConfig.tournamentYear}`,

              // Other required fields from TournamentSpecificConfig
              displayName:
                effectiveTournamentConfig.displayName ||
                effectiveTournamentConfig.tournamentName,
              registrationDeadline:
                effectiveTournamentConfig.registrationDeadline || '',
              tournamentDates: effectiveTournamentConfig.tournamentDates || [],
              locations: effectiveTournamentConfig.locations || [],
              divisions: effectiveTournamentConfig.divisions || [
                'Gold',
                'Silver',
              ],
              ageGroups: effectiveTournamentConfig.ageGroups || [],
              requiresRoster: effectiveTournamentConfig.requiresRoster || false,
              requiresInsurance:
                effectiveTournamentConfig.requiresInsurance || false,
              paymentDeadline: effectiveTournamentConfig.paymentDeadline || '',
              refundPolicy:
                effectiveTournamentConfig.refundPolicy ||
                'No refunds after registration deadline',
              rulesDocumentUrl:
                effectiveTournamentConfig.rulesDocumentUrl || '',
              scheduleDocumentUrl:
                effectiveTournamentConfig.scheduleDocumentUrl || '',
              isActive:
                effectiveTournamentConfig.isActive !== undefined
                  ? effectiveTournamentConfig.isActive
                  : true,

              // Optional fields
              ...(effectiveTournamentConfig.tournamentId && {
                tournamentId: effectiveTournamentConfig.tournamentId,
              }),
              ...(effectiveTournamentConfig.createdAt && {
                createdAt: effectiveTournamentConfig.createdAt,
              }),
              ...(effectiveTournamentConfig.updatedAt && {
                updatedAt: effectiveTournamentConfig.updatedAt,
              }),
              ...(effectiveTournamentConfig.__v !== undefined && {
                __v: effectiveTournamentConfig.__v,
              }),
            }}
            registrationType='tournament'
            disabled={
              !teamValidation || !formData.teams || formData.teams.length === 0
            }
            formData={formData} // PASS THE ENTIRE FORM DATA
            parentId={savedUserData?._id || currentUser?._id}
          />
        )}
      </div>
    </div>
  );
};

export default TournamentRegistrationForm;
