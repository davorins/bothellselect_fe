// Register.tsx - Improved with better receipt/review formatting

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

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [localSavedUserData, setLocalSavedUserData] = useState<any>(null);
  const [guardianInfo, setGuardianInfo] = useState<GuardianInfo | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

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
        season: 'Partizan Team',
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
        season: 'Partizan Team',
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
    season: 'Partizan Team',
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
        season: 'Partizan Team',
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
            <div className='card mb-4'>
              <div className='card-header bg-light'>
                <div className='d-flex align-items-center'>
                  <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                    <i className='ti ti-users fs-16' />
                  </span>
                  <h4 className='text-dark'>Add Players to Your Account</h4>
                </div>
              </div>
              <div className='card-body'>
                {successMessage && (
                  <div className='alert alert-success mb-4'>
                    <i className='ti ti-check-circle me-2'></i>
                    {successMessage}
                  </div>
                )}
                <div className='text-center py-4'>
                  <i className='ti ti-user-question fs-1 text-primary mb-3'></i>
                  <h3>Would you like to add players to your account?</h3>
                  <p className='text-muted'>
                    You can add them now or later from your dashboard.
                  </p>

                  <div className='row mt-4'>
                    <div className='col-md-6 mb-3'>
                      <div className='card h-100 border-success border-2'>
                        <div className='card-body text-center d-flex flex-column'>
                          <i className='ti ti-user-plus fs-1 text-success mb-3'></i>
                          <h4 className='text-success'>Add Players Now</h4>
                          <div className='mt-auto'>
                            <button
                              type='button'
                              className='btn btn-success w-100'
                              onClick={handleAddPlayers}
                            >
                              <i className='ti ti-plus me-2'></i>Add Players Now
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className='col-md-6 mb-3'>
                      <div className='card h-100 border-primary border-2'>
                        <div className='card-body text-center d-flex flex-column'>
                          <i className='ti ti-check fs-1 text-primary mb-3'></i>
                          <h4 className='text-primary'>
                            Complete Registration
                          </h4>
                          <div className='mt-auto'>
                            <button
                              type='button'
                              className='btn btn-outline-primary w-100'
                              onClick={handleGoToReview}
                              disabled={isSubmitting}
                            >
                              {isSubmitting
                                ? 'Processing...'
                                : 'Continue to Review'}
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
            <div className='card mb-4'>
              <div className='card-header bg-light'>
                <div className='d-flex align-items-center'>
                  <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                    <i className='ti ti-receipt fs-16' />
                  </span>
                  <h4 className='text-dark'>Registration Receipt & Review</h4>
                </div>
              </div>
              <div className='card-body'>
                {successMessage && (
                  <div className='alert alert-success mb-4'>
                    <i className='ti ti-check-circle me-2'></i>
                    {successMessage}
                  </div>
                )}

                {/* Account Information Section */}
                <div className='card mb-4 border'>
                  <div className='card-header bg-primary bg-opacity-10'>
                    <h5 className='mb-0'>
                      <i className='ti ti-user-circle me-2'></i>
                      Account Information
                    </h5>
                  </div>
                  <div className='card-body'>
                    <div className='row'>
                      <div className='col-md-6 mb-3'>
                        <label className='text-muted small fw-semibold mb-1'>
                          EMAIL ADDRESS
                        </label>
                        <p className='mb-0 fw-medium'>
                          {formData.tempAccount?.email ||
                            formData.email ||
                            'Not provided'}
                        </p>
                      </div>
                      <div className='col-md-6 mb-3'>
                        <label className='text-muted small fw-semibold mb-1'>
                          REGISTRATION DATE
                        </label>
                        <p className='mb-0 fw-medium'>
                          {registrationTimestamp || new Date().toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guardian/Parent Information Section */}
                {guardianInfo && (
                  <div className='card mb-4 border'>
                    <div className='card-header bg-primary bg-opacity-10'>
                      <h5 className='mb-0'>
                        <i className='ti ti-user-shield me-2'></i>
                        Guardian / Parent Information
                      </h5>
                    </div>
                    <div className='card-body'>
                      <div className='row'>
                        <div className='col-md-6 mb-3'>
                          <label className='text-muted small fw-semibold mb-1'>
                            FULL NAME
                          </label>
                          <p className='mb-0 fw-medium'>
                            {guardianInfo.fullName || 'Not provided'}
                          </p>
                        </div>
                        <div className='col-md-6 mb-3'>
                          <label className='text-muted small fw-semibold mb-1'>
                            PHONE NUMBER
                          </label>
                          <p className='mb-0 fw-medium'>
                            {formatPhone(guardianInfo.phone)}
                          </p>
                        </div>
                        <div className='col-md-6 mb-3'>
                          <label className='text-muted small fw-semibold mb-1'>
                            EMAIL ADDRESS
                          </label>
                          <p className='mb-0 fw-medium'>
                            {guardianInfo.email || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Players Information Section */}
                {players.length > 0 &&
                  players.some((p) => p.fullName?.trim()) && (
                    <div className='card mb-4 border'>
                      <div className='card-header bg-primary bg-opacity-10'>
                        <h5 className='mb-0'>
                          <i className='ti ti-users me-2'></i>
                          Players Information (
                          {players.filter((p) => p.fullName?.trim()).length})
                        </h5>
                      </div>
                      <div className='card-body'>
                        {players.map((player, index) => {
                          if (!player.fullName?.trim()) return null;
                          return (
                            <div
                              key={index}
                              className='border rounded p-3 mb-3'
                            >
                              <div className='row'>
                                <div className='col-md-6 mb-2'>
                                  <label className='text-muted small fw-semibold mb-1'>
                                    FULL NAME
                                  </label>
                                  <p className='mb-0 fw-medium'>
                                    {player.fullName}
                                  </p>
                                </div>
                                <div className='col-md-6 mb-2'>
                                  <label className='text-muted small fw-semibold mb-1'>
                                    GRADE
                                  </label>
                                  <p className='mb-0 fw-medium'>
                                    {player.grade || 'Not provided'}
                                  </p>
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
                  <div className='card mb-4 border'>
                    <div className='card-header bg-primary bg-opacity-10'>
                      <h5 className='mb-0'>
                        <i className='ti ti-users me-2'></i>
                        Players Information
                      </h5>
                    </div>
                    <div className='card-body text-center py-4'>
                      <i className='ti ti-user-off fs-1 text-muted mb-2'></i>
                      <p className='mb-0 text-muted'>
                        No players added yet. You can add players later from
                        your dashboard.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className='d-flex justify-content-between align-items-center mt-4 pt-3 border-top'>
                  <button
                    type='button'
                    className='btn btn-outline-secondary'
                    onClick={handleBack}
                  >
                    <i className='ti ti-arrow-left me-1'></i>
                    Back
                  </button>
                  <div>
                    <button
                      type='button'
                      className='btn btn-outline-primary me-2'
                      onClick={handleAddMorePlayers}
                    >
                      <i className='ti ti-plus me-1'></i>
                      Add More Players
                    </button>
                    <button
                      type='submit'
                      className='btn btn-success'
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className='spinner-border spinner-border-sm me-2'></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <i className='ti ti-check me-1'></i>
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
          <div className='card border-0 shadow-sm'>
            <div className='card-header bg-success text-white text-center py-4'>
              <i
                className='ti ti-circle-check fs-1 text-white mb-2'
                style={{ fontSize: '3rem' }}
              ></i>
              <h4 className='mb-0 text-white'>Registration Complete!</h4>
            </div>
            <div className='card-body text-center py-4'>
              <h2 className='text-success mb-3'>
                Welcome to Partizan Basketball!
              </h2>

              {successMessage && (
                <div className='alert alert-success mb-4'>
                  <i className='ti ti-check-circle me-2'></i>
                  {successMessage}
                </div>
              )}

              <div className='alert alert-info mb-4'>
                <i className='ti ti-mail-check fs-4 me-3'></i>
                <strong>Welcome email sent!</strong>
                <div className='mt-1'>
                  Please check{' '}
                  <strong>
                    {formData.tempAccount?.email || formData.email}
                  </strong>{' '}
                  for account details.
                </div>
              </div>

              {registeredPlayers.length > 0 && (
                <div className='card border mb-4'>
                  <div className='card-header bg-light'>
                    <h5 className='mb-0'>
                      <i className='ti ti-users me-2'></i>
                      Successfully Registered Players (
                      {registeredPlayers.length})
                    </h5>
                  </div>
                  <div className='card-body'>
                    <div className='row'>
                      {registeredPlayers.map((p, i) => (
                        <div key={i} className='col-md-6 mb-2'>
                          <div className='border rounded p-2 text-start'>
                            <strong>{p.fullName}</strong>
                            <span className='text-muted d-block small'>
                              {p.grade} Grade • {p.gender}
                              {p.dob &&
                                ` • DOB: ${new Date(p.dob).toLocaleDateString()}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className='d-flex justify-content-center gap-3'>
                {registeredPlayers.length === 0 && (
                  <button
                    type='button'
                    className='btn btn-outline-primary'
                    onClick={handleAddMorePlayers}
                  >
                    <i className='ti ti-plus me-2'></i>
                    Add Players Now
                  </button>
                )}
                <button
                  type='button'
                  className='btn btn-primary btn-lg'
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

  if (isProcessing) {
    return (
      <div className='container-fuild'>
        <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className='container-fuild'>
      <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
        <div className='row'>
          <div className='col-lg-6 d-none d-lg-flex align-items-center justify-content-center bg-light-300'>
            <ImageWithBasePath
              src='assets/img/authentication/authentication.png'
              alt='Img'
            />
          </div>

          <div className='col-lg-6 col-md-12 col-sm-12'>
            <div className='row justify-content-center align-items-center vh-100 overflow-auto'>
              <div className='col-md-10 mx-auto p-4'>
                <div className='mx-auto mb-4 text-center'>
                  <ImageWithBasePath
                    src='assets/img/logo.png'
                    className='img-fluid'
                    alt='Logo'
                  />
                </div>

                <div className='form-header text-center mb-4'>
                  <h2>Create Your Account</h2>
                  <p>
                    Register to join Partizan Basketball. Players can be added
                    now or later.
                  </p>
                </div>

                {currentStep !== 'success' && (
                  <StepIndicator
                    steps={steps}
                    currentStep={currentStep}
                    className='mb-4'
                  />
                )}

                {formError && (
                  <div className='alert alert-danger mb-4'>
                    <i className='ti ti-alert-circle me-2'></i>
                    {formError}
                  </div>
                )}

                <div className='step-content'>{renderStepContent()}</div>

                {currentStep !== 'success' &&
                  currentStep !== 'verifyEmail' &&
                  currentStep !== 'account' && (
                    <div className='text-center mt-4'>
                      Already have an account?{' '}
                      <Link to={routes.login}>Sign In</Link>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
