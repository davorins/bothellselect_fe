import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';

interface EmailVerificationStepProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
  isVerificationSent?: boolean;
}

const EmailVerificationStep: React.FC<EmailVerificationStepProps> = ({
  email,
  onVerified,
  onBack,
  isVerificationSent = false,
}) => {
  const {
    checkVerificationStatus,
    resendVerificationEmail,
    verifyEmail,
    isEmailVerified,
    checkAuth,
  } = useAuth();

  const [status, setStatus] = useState<
    'sending' | 'sent' | 'verifying' | 'verified' | 'error'
  >(isVerificationSent ? 'sent' : 'sending');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [manualToken, setManualToken] = useState('');
  const [showHandAnimation, setShowHandAnimation] = useState(true);

  // 🔥 FIX: Get email from localStorage as primary source
  const [actualEmail, setActualEmail] = useState(() => {
    // First try localStorage, then fallback to prop
    const storedEmail = localStorage.getItem('pendingEmail');
    console.log('🔍 [EmailVerificationStep] Initial email:', {
      storedEmail,
      propEmail: email,
    });
    return storedEmail || email || '';
  });

  // ✅ MOVE THIS FUNCTION BEFORE ANY useEffect THAT USES IT
  const handleCheckVerification = useCallback(async () => {
    try {
      setStatus('verifying');
      setMessage('Checking verification status...');

      const isVerified = await checkVerificationStatus();

      if (isVerified) {
        setStatus('verified');
        setMessage('Email verified successfully!');
        localStorage.removeItem('pendingEmail');
        await checkAuth();
        setTimeout(() => {
          onVerified();
        }, 1500);
      } else {
        setStatus('sent');
        setMessage('Email not verified yet. Please check your inbox.');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage('Failed to check verification status');
    }
  }, [checkVerificationStatus, checkAuth, onVerified]);

  useEffect(() => {
    console.log('🔍 [EmailVerificationStep] Mounted with:', {
      actualEmail,
      isVerificationSent,
      pendingEmail: localStorage.getItem('pendingEmail'),
    });

    if (isVerificationSent) {
      setStatus('sent');
      setMessage(
        `Verification email sent! Check your spam folder if you don't see it.`,
      );
      setCountdown(120);
    }
  }, [isVerificationSent, actualEmail]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  useEffect(() => {
    // Auto-check verification status periodically
    if (status === 'sent' && !isEmailVerified) {
      const interval = setInterval(() => {
        handleCheckVerification();
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [status, isEmailVerified, handleCheckVerification]);

  // Stop hand animation when user starts typing or pastes token
  useEffect(() => {
    if (manualToken.length > 0 && showHandAnimation) {
      setShowHandAnimation(false);
    }

    // Re-enable animation if user clears the input
    if (manualToken.length === 0 && !showHandAnimation) {
      setShowHandAnimation(true);
    }
  }, [manualToken, showHandAnimation]);

  // 🔥 Resend function that uses actualEmail
  const handleResendVerification = useCallback(async () => {
    if (countdown > 0 || isResending) return;

    try {
      setIsResending(true);
      setMessage('Resending verification email...');

      const targetEmail = actualEmail || localStorage.getItem('pendingEmail');
      console.log(
        '📧 [EmailVerificationStep] Resending verification for email:',
        targetEmail,
      );

      if (!targetEmail) {
        throw new Error('No email address found for verification');
      }

      await resendVerificationEmail(targetEmail);

      setStatus('sent');
      setMessage('Verification email resent! Please check your inbox.');
      setCountdown(120);
    } catch (error: any) {
      console.error('❌ [EmailVerificationStep] Resend error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  }, [actualEmail, countdown, isResending, resendVerificationEmail]);

  // 🔥 Improved manual verification
  const handleManualVerification = useCallback(async () => {
    if (!manualToken.trim()) {
      setMessage('Please enter a verification token');
      return;
    }

    try {
      setStatus('verifying');
      setMessage('Verifying your email...');

      const success = await verifyEmail(manualToken.trim());

      if (success) {
        setStatus('verified');
        setMessage('Email verified successfully!');
        // Clean up localStorage
        localStorage.removeItem('pendingEmail');
        // Refresh auth data to get the latest state
        await checkAuth();
        setTimeout(() => {
          onVerified();
        }, 1500);
      } else {
        setStatus('error');
        setMessage('Invalid or expired verification token');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to verify email');
    }
  }, [manualToken, verifyEmail, checkAuth, onVerified]);

  // Get the display email (with fallbacks)
  const displayEmail =
    actualEmail ||
    localStorage.getItem('pendingEmail') ||
    email ||
    'your email';

  // Add CSS styles for animations
  const styles = `
    @keyframes flash {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    
    @keyframes pulse-border {
      0% { 
        box-shadow: 0 0 0 0 rgba(66, 153, 225, 0.7);
        border-color: #4299e1;
      }
      70% { 
        box-shadow: 0 0 0 6px rgba(66, 153, 225, 0);
        border-color: #4299e1;
      }
      100% { 
        box-shadow: 0 0 0 0 rgba(66, 153, 225, 0);
        border-color: #4299e1;
      }
    }
    
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    
    .flashing-hand {
      animation: flash 1.5s infinite, bounce 1.5s infinite;
      cursor: pointer;
    }
    
    .pulse-input {
      animation: pulse-border 2s infinite;
    }
  `;

  return (
    <div className='card'>
      <style>{styles}</style>

      <div className='card-header bg-light'>
        <div className='d-flex align-items-center'>
          <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
            <i className='ti ti-mail fs-16' />
          </span>
          <h4 className='text-dark'>Verify Your Email</h4>
        </div>
      </div>
      <div className='card-body'>
        <div className='row'>
          <div className='col-12'>
            <div className='text-center mb-4'>
              <div className='mb-3'>
                <i className='ti ti-mail-opened text-primary fs-1'></i>
              </div>
              <h4>Verify your email address</h4>
              <p className='text-muted'>
                We've sent a verification email to{' '}
                <strong>{displayEmail}</strong>
              </p>
              <p className='text-muted small'>
                Check your inbox for a verification token to complete your
                registration.
              </p>
            </div>

            {/* Status Messages */}
            {status === 'sending' && (
              <div className='alert alert-info text-center'>
                <div
                  className='spinner-border spinner-border-sm me-2'
                  role='status'
                ></div>
                {message || 'Sending verification email...'}
              </div>
            )}

            {status === 'sent' && (
              <div className='alert alert-warning text-center'>
                <i className='ti ti-check me-2'></i>
                {message}
              </div>
            )}

            {status === 'verifying' && (
              <div className='alert alert-info text-center'>
                <div
                  className='spinner-border spinner-border-sm me-2'
                  role='status'
                ></div>
                {message}
              </div>
            )}

            {status === 'verified' && (
              <div className='alert alert-success text-center'>
                <i className='ti ti-check me-2'></i>
                {message}
              </div>
            )}

            {status === 'error' && (
              <div className='alert alert-danger text-center'>
                <i className='ti ti-alert-triangle me-2'></i>
                {message}
              </div>
            )}

            {/* Manual Token Input */}
            <div className='mb-4'>
              <label className='form-label'>
                Enter verification token from your email:
              </label>
              <div className='input-group'>
                <input
                  type='text'
                  className={`form-control ${
                    showHandAnimation && manualToken.length === 0
                      ? 'pulse-input'
                      : ''
                  }`}
                  placeholder='Paste verification token from email'
                  value={manualToken}
                  onChange={(e) => {
                    setManualToken(e.target.value);
                    if (e.target.value.length > 0) {
                      setShowHandAnimation(false);
                    }
                  }}
                  onPaste={() => setShowHandAnimation(false)}
                  disabled={status === 'verifying'}
                  style={{
                    paddingLeft: showHandAnimation ? '3rem' : '1rem',
                  }}
                />
                {showHandAnimation && manualToken.length === 0 && (
                  <div className='position-absolute start-0 top-50 translate-middle-y ms-0'>
                    <span className='flashing-hand fs-16'>👉</span>
                  </div>
                )}
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={handleManualVerification}
                  disabled={!manualToken.trim() || status === 'verifying'}
                >
                  {status === 'verifying' ? (
                    <>
                      <span className='spinner-border spinner-border-sm me-2'></span>
                      Verifying...
                    </>
                  ) : (
                    'Verify Token'
                  )}
                </button>
              </div>
              {/* <small className='text-muted mt-2 d-block'>
                The verification token was sent to{' '}
                <strong>{displayEmail}</strong>. Check your spam folder if you
                don't see it.
              </small> */}
            </div>

            {/* Action Buttons */}
            <div className='d-grid gap-2'>
              <button
                type='button'
                className='btn btn-outline-secondary'
                onClick={handleResendVerification}
                disabled={isResending || countdown > 0 || !displayEmail}
              >
                {isResending ? (
                  <>
                    <span className='spinner-border spinner-border-sm me-2'></span>
                    Resending...
                  </>
                ) : countdown > 0 ? (
                  `Resend in ${countdown}s`
                ) : (
                  'Resend Verification Email'
                )}
              </button>
            </div>

            {/* Help Text */}
            <div className='mt-4 text-center'>
              <small className='text-muted'>
                Can't find the email? Check your spam folder or try resending.
                <br />
                The verification token will expire in 24 hours.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationStep;
