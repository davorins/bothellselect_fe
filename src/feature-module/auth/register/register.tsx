// Register.tsx - Updated with White Theme

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { useNavigate, Link } from 'react-router-dom';
import UserRegistrationModule from '../../components/registration-modules/UserRegistrationModule';
import AccountCreationModule from '../../components/registration-modules/AccountCreationModule';
import EmailVerificationStep from '../../auth/emailVerification/emailVerificationStep';
import StepIndicator from '../../../components/common/StepIndicator';
import {
  Player,
  UserRegistrationData,
  Address,
} from '../../../types/registration-types';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { all_routes } from '../../router/all_routes';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import DynamicPlayerRegistrationModule from '../../components/registration-modules/DynamicPlayerRegistrationModule';
import { PlayerRegistrationProps } from '../../../types/registration-types';
import axios from 'axios';
import './Register.css';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  tempAccount?: { email: string; password: string };
}

interface GuardianInfo {
  fullName: string;
  relationship: string;
  phone: string;
  email: string;
  address: Address;
  isCoach: boolean;
  aauNumber: string;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Register = () => {
  const navigate = useNavigate();
  const routes = all_routes;
  const { createTempAccount, refreshAuthData, user: currentUser } = useAuth();

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationTimestamp, setRegistrationTimestamp] = useState('');
  const [showPlayerChoice, setShowPlayerChoice] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [localSavedUserData, setLocalSavedUserData] = useState<any>(null);
  const [guardianInfo, setGuardianInfo] = useState<GuardianInfo | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    // Preload image and trigger entrance animation
    const img = new Image();
    img.src = 'assets/img/bg/bg_registration.png';
    img.onload = () => {
      setIsImageLoaded(true);
    };

    const timer = setTimeout(() => {
      setIsImageLoaded(true);
    }, 500);

    // Mouse move effect for parallax
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const updateFormData = (newData: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

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

  useEffect(() => {
    setSuccessMessage(null);
  }, [currentStep]);

  // Format address for display
  const formatAddress = (address: Address): string => {
    if (!address) return 'Not provided';
    const parts = [
      address.street,
      address.street2,
      address.city,
      address.state,
      address.zip,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Not provided';
  };

  // ====================== ACCOUNT & VERIFICATION ======================
  const handleAccountCreated = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      setIsProcessing(true);
      setFormError(null);
      try {
        localStorage.setItem('pendingEmail', email);
        await createTempAccount(email, password);
        if (isMounted.current) {
          updateFormData({ tempAccount: { email, password } });
          setIsVerificationSent(true);
          setCurrentStep('verifyEmail');
          setSuccessMessage(
            '✅ Account created successfully! Please verify your email.',
          );
        }
      } catch (error: any) {
        const msg = error.message?.includes('already exists')
          ? 'Email already registered. Please sign in.'
          : 'Failed to create account';
        setFormError(msg);
      } finally {
        if (isMounted.current) setIsProcessing(false);
      }
    },
    [createTempAccount],
  );

  const handleVerified = useCallback(() => {
    setCurrentStep('guardian');
    setSuccessMessage('✅ Email verified successfully!');
  }, []);

  const handleBack = useCallback(() => {
    switch (currentStep) {
      case 'verifyEmail':
        setCurrentStep('account');
        break;
      case 'guardian':
        setCurrentStep('verifyEmail');
        break;
      case 'players':
        setShowPlayerChoice(true);
        setCurrentStep('guardian');
        break;
      case 'review':
        setCurrentStep('players');
        break;
    }
  }, [currentStep]);

  // ====================== GUARDIAN ======================
  const saveUserData = async (userData: UserRegistrationData): Promise<any> => {
    const password = userData.password || formData.tempAccount?.password;
    if (!password) throw new Error('Password is required');

    const normalizedAddress: Address = {
      street: userData.address?.street?.trim() || '',
      street2: userData.address?.street2?.trim() || '',
      city: userData.address?.city?.trim() || '',
      state: (userData.address?.state?.trim() || '').toUpperCase(),
      zip: userData.address?.zip?.trim() || '',
    };

    const registrationData = {
      email: userData.email.toLowerCase().trim(),
      password: password.trim(),
      fullName: userData.fullName.trim(),
      phone: userData.phone.replace(/\D/g, ''),
      address: normalizedAddress,
      relationship: userData.relationship.trim(),
      isCoach: userData.isCoach || false,
      aauNumber: userData.aauNumber?.trim() || '',
      agreeToTerms: userData.agreeToTerms,
      registerType: 'self',
    };

    const response = await axios.post(
      `${API_BASE_URL}/register`,
      registrationData,
    );
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('parentId', response.data.parent?._id);
    }

    const saved = response.data.user || response.data.parent || response.data;

    // Store guardian info for review
    setGuardianInfo({
      fullName: registrationData.fullName,
      relationship: registrationData.relationship,
      phone: registrationData.phone,
      email: registrationData.email,
      address: normalizedAddress,
      isCoach: registrationData.isCoach,
      aauNumber: registrationData.aauNumber,
    });

    setLocalSavedUserData(saved);
    return saved;
  };

  const handleGuardianComplete = async (userData: any) => {
    try {
      const savedUser = await saveUserData(userData.user || userData);
      setLocalSavedUserData(savedUser);
      setShowPlayerChoice(true);
      setSuccessMessage('✅ Guardian information saved successfully!');
    } catch (error: any) {
      setFormError(error.message || 'Failed to save guardian information');
    }
  };

  // ====================== PLAYERS ======================
  const handleAddPlayers = useCallback(() => {
    setShowPlayerChoice(false);
    setCurrentStep('players');
    setPlayers([
      {
        fullName: '',
        gender: '',
        dob: '',
        schoolName: '',
        healthConcerns: '',
        aauNumber: '',
        registrationYear: currentYear,
        season: 'Bothell Select Team',
        grade: '',
      },
    ]);
  }, [currentYear]);

  const savePlayerData = async (playersToSave: Player[]) => {
    const token = localStorage.getItem('token');
    const parentId = localSavedUserData?._id || currentUser?._id;
    if (!token || !parentId) throw new Error('Authentication required');

    for (const player of playersToSave.filter((p) => !p._id)) {
      const playerData = {
        fullName: player.fullName.trim(),
        gender: player.gender,
        dob: player.dob || null,
        schoolName: player.schoolName?.trim() || '',
        healthConcerns: player.healthConcerns || '',
        aauNumber: player.aauNumber || '',
        registrationYear: currentYear,
        season: 'Bothell Select Team',
        parentId,
        grade: player.grade,
        isGradeOverridden: player.isGradeOverridden || false,
        skipSeasonRegistration: true,
      };

      await axios.post(`${API_BASE_URL}/players/register`, playerData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    }
  };

  const handlePlayerComplete = async (playersData: Player[]) => {
    setIsSubmitting(true);
    try {
      if (playersData.length > 0) await savePlayerData(playersData);
      setPlayers(playersData);
      setCurrentStep('review');
      setSuccessMessage(
        `✅ ${playersData.length} player(s) information saved!`,
      );
    } catch (error: any) {
      setFormError(error.message || 'Failed to save players');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlayersChange = (updatedPlayers: Player[]) =>
    setPlayers(updatedPlayers);

  const playerModuleProps: PlayerRegistrationProps = {
    players,
    onPlayersChange: handlePlayersChange,
    registrationYear: currentYear,
    season: 'Bothell Select Team',
    isExistingUser: false,
    existingPlayers: [],
    paidPlayers: [],
    onValidationChange: () => {},
    showCheckboxes: false,
    selectedPlayerIds: [],
    onPlayerSelection: () => {},
    onPaymentCalculation: () => {},
    onComplete: handlePlayerComplete,
    onBack: handleBack,
    parentId: localSavedUserData?._id || currentUser?._id,
    authToken: localStorage.getItem('token') || undefined,
    maxPlayers: 10,
    allowMultiple: true,
    requiresPayment: false,
  };

  // ====================== REVIEW & FINAL SUBMIT ======================
  const handleGoToReview = async () => {
    setIsSubmitting(true);
    try {
      await refreshAuthData();
      setRegistrationTimestamp(new Date().toLocaleString());
      setCurrentStep('review');
      setSuccessMessage(
        '✅ Please review your information before completing registration.',
      );
    } catch (error: any) {
      setFormError(error.message || 'Failed to proceed to review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await refreshAuthData();
      setCurrentStep('success');
      setSuccessMessage('🎉 Registration completed successfully!');
    } catch (error: any) {
      setFormError(error.message || 'Failed to complete registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = () => navigate(routes.adminDashboard);

  const handleAddMorePlayers = () => {
    setCurrentStep('players');
    setPlayers([
      {
        fullName: '',
        gender: '',
        dob: '',
        schoolName: '',
        healthConcerns: '',
        aauNumber: '',
        registrationYear: currentYear,
        season: 'Bothell Select Team',
        grade: '',
      },
    ]);
  };

  // Format phone number for display
  const formatPhone = (phone: string) => {
    if (!phone) return 'Not provided';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // ====================== RENDER ======================
  const renderStepContent = () => {
    switch (currentStep) {
      case 'account':
        return <AccountCreationModule onComplete={handleAccountCreated} />;

      case 'verifyEmail':
        return (
          <EmailVerificationStep
            email={
              formData.tempAccount?.email ||
              localStorage.getItem('pendingEmail') ||
              ''
            }
            onVerified={handleVerified}
            onBack={handleBack}
            isVerificationSent={isVerificationSent}
          />
        );

      case 'guardian':
        if (showPlayerChoice) {
          return (
            <div className='register-card-white'>
              <div className='register-card-header'>
                <div className='register-card-icon'>
                  <i className='ti ti-users' />
                </div>
                <h4>Add Players to Your Account</h4>
              </div>
              <div className='register-card-body'>
                {successMessage && (
                  <div className='register-alert-success'>
                    <i className='ti ti-circle-check' />
                    <span>{successMessage}</span>
                    <button
                      className='register-alert-close'
                      onClick={() => setSuccessMessage(null)}
                    >
                      <i className='ti ti-x' />
                    </button>
                  </div>
                )}
                <div className='register-player-choice'>
                  <i className='ti ti-user-question' />
                  <h3>Would you like to add players to your account?</h3>
                  <p>You can add them now or later from your dashboard.</p>

                  <div className='register-choice-grid'>
                    <div className='register-choice-card add-players'>
                      <i className='ti ti-user-plus' />
                      <h4>Add Players Now</h4>
                      <button
                        type='button'
                        className='register-choice-btn success'
                        onClick={handleAddPlayers}
                      >
                        <i className='ti ti-plus' />
                        Add Players Now
                      </button>
                    </div>
                    <div className='register-choice-card complete'>
                      <i className='ti ti-check' />
                      <h4>Complete Registration</h4>
                      <button
                        type='button'
                        className='register-choice-btn outline'
                        onClick={handleGoToReview}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Processing...' : 'Continue to Review'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return (
          <UserRegistrationModule
            onComplete={handleGuardianComplete}
            onBack={handleBack}
            formData={formData}
            updateFormData={updateFormData}
            isExistingUser={false}
            initialData={null}
          />
        );

      case 'players':
        return <DynamicPlayerRegistrationModule {...playerModuleProps} />;

      case 'review':
        return (
          <form onSubmit={handleSubmit}>
            <div className='register-card-white'>
              <div className='register-card-header'>
                <div className='register-card-icon'>
                  <i className='ti ti-receipt' />
                </div>
                <h4>Registration Receipt & Review</h4>
              </div>
              <div className='register-card-body'>
                {successMessage && (
                  <div className='register-alert-success'>
                    <i className='ti ti-circle-check' />
                    <span>{successMessage}</span>
                    <button
                      className='register-alert-close'
                      onClick={() => setSuccessMessage(null)}
                    >
                      <i className='ti ti-x' />
                    </button>
                  </div>
                )}

                {/* Account Information Section */}
                <div className='register-info-section'>
                  <div className='register-info-header'>
                    <i className='ti ti-user-circle' />
                    <h5>Account Information</h5>
                  </div>
                  <div className='register-info-content'>
                    <div className='register-info-row'>
                      <div className='register-info-label'>EMAIL ADDRESS</div>
                      <div className='register-info-value'>
                        {formData.tempAccount?.email ||
                          formData.email ||
                          'Not provided'}
                      </div>
                    </div>
                    <div className='register-info-row'>
                      <div className='register-info-label'>
                        REGISTRATION DATE
                      </div>
                      <div className='register-info-value'>
                        {registrationTimestamp || new Date().toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guardian/Parent Information Section */}
                {guardianInfo && (
                  <div className='register-info-section'>
                    <div className='register-info-header'>
                      <i className='ti ti-user-shield' />
                      <h5>Guardian / Parent Information</h5>
                    </div>
                    <div className='register-info-content'>
                      <div className='register-info-row'>
                        <div className='register-info-label'>FULL NAME</div>
                        <div className='register-info-value'>
                          {guardianInfo.fullName || 'Not provided'}
                        </div>
                      </div>
                      <div className='register-info-row'>
                        <div className='register-info-label'>PHONE NUMBER</div>
                        <div className='register-info-value'>
                          {formatPhone(guardianInfo.phone)}
                        </div>
                      </div>
                      <div className='register-info-row'>
                        <div className='register-info-label'>EMAIL ADDRESS</div>
                        <div className='register-info-value'>
                          {guardianInfo.email || 'Not provided'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Players Information Section */}
                {players.length > 0 &&
                  players.some((p) => p.fullName?.trim()) && (
                    <div className='register-info-section'>
                      <div className='register-info-header'>
                        <i className='ti ti-users' />
                        <h5>
                          Players Information (
                          {players.filter((p) => p.fullName?.trim()).length})
                        </h5>
                      </div>
                      <div className='register-info-content'>
                        {players.map((player, index) => {
                          if (!player.fullName?.trim()) return null;
                          return (
                            <div key={index} className='register-player-item'>
                              <div className='register-info-row'>
                                <div className='register-info-label'>
                                  FULL NAME
                                </div>
                                <div className='register-info-value'>
                                  {player.fullName}
                                </div>
                              </div>
                              <div className='register-info-row'>
                                <div className='register-info-label'>GRADE</div>
                                <div className='register-info-value'>
                                  {player.grade || 'Not provided'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* No Players Message */}
                {(!players.length ||
                  !players.some((p) => p.fullName?.trim())) && (
                  <div className='register-info-section'>
                    <div className='register-info-header'>
                      <i className='ti ti-users' />
                      <h5>Players Information</h5>
                    </div>
                    <div className='register-info-content text-center py-4'>
                      <i className='ti ti-user-off' />
                      <p>
                        No players added yet. You can add players later from
                        your dashboard.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className='register-action-buttons'>
                  <button
                    type='button'
                    className='register-btn-secondary'
                    onClick={handleBack}
                  >
                    <i className='ti ti-arrow-left' />
                    Back
                  </button>
                  <div>
                    <button
                      type='button'
                      className='register-btn-outline'
                      onClick={handleAddMorePlayers}
                    >
                      <i className='ti ti-plus' />
                      Add More Players
                    </button>
                    <button
                      type='submit'
                      className='register-btn-primary'
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className='spinner-white'></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <i className='ti ti-check' />
                          Confirm & Complete Registration
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        );

      case 'success':
        const registeredPlayers = players.filter((p) => p.fullName?.trim());
        return (
          <div className='register-success-card'>
            <div className='register-success-header'>
              <i className='ti ti-circle-check' />
              <h4>Registration Complete!</h4>
            </div>
            <div className='register-success-body'>
              <h2>Welcome to Bothell Select Basketball!</h2>

              {successMessage && (
                <div className='register-alert-success'>
                  <i className='ti ti-circle-check' />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className='register-email-info'>
                <i className='ti ti-mail-check' />
                <div>
                  <strong>Welcome email sent!</strong>
                  <div>
                    Please check{' '}
                    <strong>
                      {formData.tempAccount?.email || formData.email}
                    </strong>{' '}
                    for account details.
                  </div>
                </div>
              </div>

              {registeredPlayers.length > 0 && (
                <div className='register-players-summary'>
                  <div className='register-players-header'>
                    <i className='ti ti-users' />
                    <h5>
                      Successfully Registered Players (
                      {registeredPlayers.length})
                    </h5>
                  </div>
                  <div className='register-players-list'>
                    {registeredPlayers.map((p, i) => (
                      <div key={i} className='register-player-summary'>
                        <strong>{p.fullName}</strong>
                        <span>
                          {p.grade} Grade • {p.gender}
                          {p.dob &&
                            ` • DOB: ${new Date(p.dob).toLocaleDateString()}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className='register-success-actions'>
                {registeredPlayers.length === 0 && (
                  <button
                    type='button'
                    className='register-btn-outline'
                    onClick={handleAddMorePlayers}
                  >
                    <i className='ti ti-plus' />
                    Add Players Now
                  </button>
                )}
                <button
                  type='button'
                  className='register-btn-primary'
                  onClick={handleComplete}
                >
                  <i className='ti ti-home' />
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

  if (isProcessing) {
    return (
      <div className='register-white-container'>
        <div className='register-loading'>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className='register-white-container'>
      {/* Background Image with dramatic entrance */}
      <div
        className={`register-background-image ${isImageLoaded ? 'loaded' : ''}`}
      >
        <div
          className='register-bg-parallax'
          style={{
            transform: `translate(${(mousePosition.x - 50) * -0.02}px, ${(mousePosition.y - 50) * -0.02}px)`,
          }}
        >
          <ImageWithBasePath
            src='assets/img/bg/bg_registration.png'
            alt='Background'
            className='register-bg-img'
          />
        </div>
        <div className='register-bg-overlay' />
        <div className='register-bg-gradient-overlay' />
      </div>

      {/* Floating particles */}
      <div className='register-particles'>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className='register-particle'
            style={{
              animationDelay: `${i * 0.5}s`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${3 + Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className='register-content-wrapper-white'>
        <div className='register-grid-white'>
          {/* Left column - Image */}
          <div className='register-image-col'>
            <div className='register-image-card'>
              {/* <div className='register-image-glass'>
                <div className='register-image-glow' />
                <ImageWithBasePath
                  src='assets/img/bg/bg_registration.png'
                  alt='Register'
                  className='register-img'
                />
              </div>
              <div className='register-image-badge'>
                <i className='ti ti-user-plus' />
                <span>
                  Join Bothell Select Family
                  <br />
                  Start Your Journey
                </span>
              </div> */}
            </div>
          </div>

          {/* Right column - Registration Form */}
          <div className='register-form-col'>
            <div className='register-form-card-white'>
              <div className='register-header-white'>
                <div className='register-header-icon-white'>
                  <i className='ti ti-ball-basketball' />
                </div>
                <h1>Create Your Account</h1>
                <p>
                  Register to join Bothell Select Basketball. Players can be
                  added now or later.
                </p>
              </div>

              {formError && (
                <div className='register-alert-error'>
                  <i className='ti ti-alert-circle' />
                  <span>{formError}</span>
                  <button
                    className='register-alert-close'
                    onClick={() => setFormError(null)}
                  >
                    <i className='ti ti-x' />
                  </button>
                </div>
              )}

              {currentStep !== 'success' && (
                <StepIndicator
                  steps={steps}
                  currentStep={currentStep}
                  className='register-step-indicator'
                />
              )}

              <div className='register-step-content'>{renderStepContent()}</div>

              {currentStep !== 'success' &&
                currentStep !== 'verifyEmail' &&
                currentStep !== 'account' && (
                  <div className='register-footer-link'>
                    Already have an account?{' '}
                    <Link to={routes.login}>Sign In</Link>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
