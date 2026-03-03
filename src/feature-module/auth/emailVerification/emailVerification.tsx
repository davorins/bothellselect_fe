import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import { useAuth } from '../../../context/AuthContext';

const EmailVerification = () => {
  const routes = all_routes;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    verifyEmail,
    isAuthenticated,
    parent,
    resendVerificationEmail,
    checkVerificationStatus,
  } = useAuth();

  const [status, setStatus] = useState<
    'verifying' | 'success' | 'error' | 'initial' | 'checking'
  >('initial');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    // If there's a token in the URL, automatically verify it
    if (token) {
      handleTokenVerification(token);
    } else if (isAuthenticated) {
      // If user is authenticated but no token, check current status
      checkCurrentVerificationStatus();
    }
  }, [token, isAuthenticated]);

  const checkCurrentVerificationStatus = async () => {
    try {
      setStatus('checking');
      const isVerified = await checkVerificationStatus();
      if (isVerified) {
        setStatus('success');
        setMessage('Your email is already verified!');
      } else {
        setStatus('initial');
        setMessage('Please verify your email to continue.');
      }
    } catch (error) {
      setStatus('initial');
    }
  };

  const handleTokenVerification = async (verificationToken: string) => {
    setStatus('verifying');
    setMessage('Verifying your email address...');

    try {
      const success = await verifyEmail(verificationToken);
      if (success) {
        setStatus('success');
        setMessage(
          'Email verified successfully! You can now continue with registration.'
        );

        // Automatically redirect to registration after 2 seconds
        setTimeout(() => {
          navigate(routes.register, {
            state: {
              emailVerified: true,
              email: email,
            },
          });
        }, 2000);
      } else {
        setStatus('error');
        setMessage(
          'Invalid or expired verification token. Please request a new verification email.'
        );
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to verify email. Please try again.');
    }
  };

  const handleResendVerification = async () => {
    if (!parent?.email && !email) {
      setMessage('Unable to resend verification. Please provide your email.');
      return;
    }

    setIsResending(true);
    setResendSuccess(false);

    try {
      await resendVerificationEmail();
      setResendSuccess(true);
      setMessage(
        'Verification email sent successfully! Please check your inbox.'
      );
    } catch (error: any) {
      setMessage(
        error.message ||
          'Failed to resend verification email. Please try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleCopyToken = async () => {
    if (token) {
      try {
        // Create a temporary input element for better compatibility
        const tempInput = document.createElement('input');
        tempInput.value = token;
        document.body.appendChild(tempInput);
        tempInput.select();
        tempInput.setSelectionRange(0, 99999); // For mobile devices

        // Use both modern and fallback methods
        let copySuccess = false;

        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(token);
          copySuccess = true;
        }
        // Fallback to execCommand
        else if (document.execCommand('copy')) {
          copySuccess = true;
        }

        // Remove temporary input
        document.body.removeChild(tempInput);

        if (copySuccess) {
          setCopySuccess('Token copied to clipboard!');
          setTimeout(() => setCopySuccess(''), 3000);
        } else {
          throw new Error('Copy not supported');
        }
      } catch (err) {
        console.error('Failed to copy token:', err);

        // Fallback: show token in alert for manual copy
        alert(`Copy this token manually:\n\n${token}`);
        setCopySuccess('Token displayed for manual copy');
        setTimeout(() => setCopySuccess(''), 3000);
      }
    }
  };

  const handleManualVerification = () => {
    if (token) {
      handleTokenVerification(token);
    }
  };

  const handleReturnToRegistration = () => {
    navigate(routes.register, {
      state: {
        emailVerified: true,
        email: email || parent?.email,
      },
    });
  };

  const handleGoToLogin = () => {
    navigate(routes.login);
  };

  const handleContinueRegistration = () => {
    navigate(routes.register, {
      state: {
        skipVerification: true,
        email: email || parent?.email,
      },
    });
  };

  const handleCompleteRegistration = () => {
    const tempToken = localStorage.getItem('tempToken');
    const pendingEmail = localStorage.getItem('pendingEmail');

    if (tempToken && pendingEmail) {
      navigate(routes.register, {
        state: {
          emailVerified: true,
          email: pendingEmail,
          tempToken: tempToken,
        },
      });
    } else {
      // Fallback for direct verification
      navigate(routes.register, {
        state: {
          emailVerified: true,
          email: email || parent?.email,
        },
      });
    }
  };

  // If user is not authenticated and there's no token, show login prompt
  if (!isAuthenticated && !token) {
    return (
      <div className='container-fuild'>
        <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
          <div className='row'>
            <div className='col-lg-6'>
              <div className='d-lg-flex align-items-center justify-content-center bg-light-300 d-lg-block d-none flex-wrap vh-100 overflowy-auto bg-01'>
                <div>
                  <ImageWithBasePath
                    src='assets/img/authentication/authentication-10.svg'
                    alt='Img'
                  />
                </div>
              </div>
            </div>
            <div className='col-lg-6 col-md-12 col-sm-12'>
              <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
                <div className='col-md-9 mx-auto p-4'>
                  <form>
                    <div>
                      <div className='mx-auto mb-5 text-center'>
                        <ImageWithBasePath
                          src='assets/img/logo.png'
                          className='img-fluid'
                          alt='Logo'
                        />
                      </div>
                      <div className='card'>
                        <div className='card-body p-4'>
                          <div className='mb-3'>
                            <h2 className='mb-2 text-center'>
                              Email Verification
                            </h2>
                            <p className='mb-0 text-center'>
                              Please use the verification link sent to your
                              email, or log in to access your account.
                            </p>
                          </div>
                          <div className='d-grid gap-2'>
                            <button
                              onClick={handleGoToLogin}
                              type='button'
                              className='btn btn-primary'
                            >
                              Go to Login
                            </button>
                            <button
                              onClick={handleContinueRegistration}
                              type='button'
                              className='btn btn-outline-primary'
                            >
                              Continue Registration
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className='mt-5 text-center'>
                        <p className='mb-0'>
                          © {new Date().getFullYear()} Partizan by{' '}
                          <a href='https://rainbootsmarketing.com/'>
                            Rainboots
                          </a>
                        </p>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='container-fuild'>
      <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
        <div className='row'>
          <div className='col-lg-6'>
            <div className='d-lg-flex align-items-center justify-content-center bg-light-300 d-lg-block d-none flex-wrap vh-100 overflowy-auto bg-01'>
              <div>
                <ImageWithBasePath
                  src='assets/img/authentication/authentication-10.svg'
                  alt='Img'
                />
              </div>
            </div>
          </div>
          <div className='col-lg-6 col-md-12 col-sm-12'>
            <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
              <div className='col-md-9 mx-auto p-4'>
                <form>
                  <div>
                    <div className='mx-auto mb-5 text-center'>
                      <ImageWithBasePath
                        src='assets/img/logo.png'
                        className='img-fluid'
                        alt='Logo'
                      />
                    </div>
                    <div className='card'>
                      <div className='card-body p-4'>
                        {/* Verification Status Display */}
                        {status === 'initial' && (
                          <div className='mb-3 text-center'>
                            <div className='text-primary mb-3'>
                              <i className='ti ti-mail-opened fs-1'></i>
                            </div>
                            <h2 className='mb-2'>Verify Your Email</h2>
                            <p className='mb-3'>
                              We've sent a verification link to{' '}
                              <strong>
                                {email || parent?.email || 'your email'}
                              </strong>
                              . Please click the link in the email to continue.
                            </p>

                            {/* Copyable Token Section */}
                            {token && (
                              <div className='mb-4'>
                                <div className='alert alert-info'>
                                  <p className='mb-2'>
                                    <strong>Manual Verification Token:</strong>
                                  </p>
                                  <div className='input-group'>
                                    <input
                                      type='text'
                                      className='form-control'
                                      value={token}
                                      readOnly
                                      id='verification-token'
                                      style={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem',
                                        backgroundColor: '#f8f9fa',
                                      }}
                                    />
                                    <button
                                      type='button'
                                      className='btn btn-outline-primary'
                                      onClick={handleCopyToken}
                                    >
                                      <i className='ti ti-copy me-1'></i>
                                      Copy
                                    </button>
                                  </div>
                                  {copySuccess && (
                                    <div className='alert alert-success mt-2 mb-0 py-2'>
                                      <i className='ti ti-check me-1'></i>
                                      {copySuccess}
                                    </div>
                                  )}
                                  <div className='mt-2'>
                                    <small className='text-muted'>
                                      You can copy this token and use it for
                                      manual verification
                                    </small>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className='alert alert-info'>
                              <i className='ti ti-info-circle me-2'></i>
                              You need to verify your email to access all
                              account features.
                            </div>
                          </div>
                        )}

                        {status === 'checking' && (
                          <div className='mb-3 text-center'>
                            <div
                              className='spinner-border text-primary mb-3'
                              role='status'
                            >
                              <span className='visually-hidden'>
                                Checking...
                              </span>
                            </div>
                            <h2 className='mb-2'>Checking Status</h2>
                            <p className='mb-0'>
                              Checking your verification status...
                            </p>
                          </div>
                        )}

                        {status === 'verifying' && (
                          <div className='mb-3 text-center'>
                            <div
                              className='spinner-border text-primary mb-3'
                              role='status'
                            >
                              <span className='visually-hidden'>
                                Verifying...
                              </span>
                            </div>
                            <h2 className='mb-2'>Verifying Email</h2>
                            <p className='mb-0'>{message}</p>
                          </div>
                        )}

                        {status === 'success' && (
                          <div className='mb-3 text-center'>
                            <div className='text-success mb-3'>
                              <i className='ti ti-check-circle fs-1'></i>
                            </div>
                            <h2 className='mb-2 text-success'>
                              Email Verified!
                            </h2>
                            <p className='mb-3'>{message}</p>

                            {/* Add Complete Registration button */}
                            <div className='d-grid gap-2 mt-4'>
                              <button
                                type='button'
                                onClick={handleCompleteRegistration}
                                className='btn btn-success'
                              >
                                <i className='ti ti-user-plus me-1'></i>
                                Complete Registration
                              </button>
                            </div>
                          </div>
                        )}

                        {status === 'error' && (
                          <div className='mb-3 text-center'>
                            <div className='text-danger mb-3'>
                              <i className='ti ti-alert-circle fs-1'></i>
                            </div>
                            <h2 className='mb-2 text-danger'>
                              Verification Failed
                            </h2>
                            <p className='mb-3'>{message}</p>

                            {/* Show token again on error for retry */}
                            {token && (
                              <div className='mb-3'>
                                <div className='alert alert-warning'>
                                  <p className='mb-2'>
                                    <strong>Your verification token:</strong>
                                  </p>
                                  <div className='input-group'>
                                    <input
                                      type='text'
                                      className='form-control'
                                      value={token}
                                      readOnly
                                      style={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem',
                                      }}
                                    />
                                    <button
                                      type='button'
                                      className='btn btn-outline-warning'
                                      onClick={handleCopyToken}
                                    >
                                      <i className='ti ti-copy me-1'></i>
                                      Copy
                                    </button>
                                  </div>
                                  {copySuccess && (
                                    <div className='alert alert-success mt-2 mb-0 py-2'>
                                      <i className='ti ti-check me-1'></i>
                                      {copySuccess}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className='d-grid gap-2'>
                          {(status === 'initial' || status === 'error') && (
                            <>
                              {/* Manual verification button when token is present */}
                              {token && (
                                <button
                                  type='button'
                                  onClick={handleManualVerification}
                                  className='btn btn-primary'
                                >
                                  <i className='ti ti-key me-1'></i>
                                  Verify with Token
                                </button>
                              )}

                              <button
                                type='button'
                                onClick={handleResendVerification}
                                className='btn btn-outline-primary'
                                disabled={isResending}
                              >
                                {isResending ? (
                                  <>
                                    <span className='spinner-border spinner-border-sm me-2'></span>
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <i className='ti ti-mail-forward me-1'></i>
                                    Resend Verification Email
                                  </>
                                )}
                              </button>

                              <button
                                type='button'
                                onClick={handleContinueRegistration}
                                className='btn btn-outline-secondary'
                              >
                                <i className='ti ti-arrow-right me-1'></i>
                                Continue Registration Anyway
                              </button>
                            </>
                          )}

                          {status === 'success' && (
                            <button
                              type='button'
                              onClick={handleReturnToRegistration}
                              className='btn btn-success'
                            >
                              <i className='ti ti-arrow-right me-1'></i>
                              Continue Registration
                            </button>
                          )}

                          {!isAuthenticated && (
                            <button
                              type='button'
                              onClick={handleGoToLogin}
                              className='btn btn-outline-secondary'
                            >
                              <i className='ti ti-login me-1'></i>
                              Go to Login
                            </button>
                          )}
                        </div>

                        {resendSuccess && (
                          <div className='alert alert-success mt-3'>
                            <i className='ti ti-check me-2'></i>
                            Verification email sent! Please check your inbox.
                          </div>
                        )}
                      </div>
                    </div>
                    <div className='mt-5 text-center'>
                      <p className='mb-0'>
                        © {new Date().getFullYear()} Partizan by{' '}
                        <a href='https://rainbootsmarketing.com/'>Rainboots</a>
                      </p>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
