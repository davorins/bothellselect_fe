import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import axios from 'axios';
import './ResetPassword.css';

type PasswordField = 'newPassword' | 'confirmPassword';

const ResetPassword = () => {
  const routes = all_routes;
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const [passwordVisibility, setPasswordVisibility] = useState({
    newPassword: false,
    confirmPassword: false,
  });
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    // Preload image and trigger entrance animation
    const img = new Image();
    img.src = 'assets/img/bg/bg_forgotPassword.png';
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

  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handlePasswordChange = (field: PasswordField, value: string) => {
    setPasswords((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwords.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/reset-password`,
        {
          token,
          newPassword: passwords.newPassword,
        },
      );

      if (response.data.success) {
        // Clear old auth data
        localStorage.removeItem('token');
        localStorage.removeItem('parentId');
        localStorage.removeItem('parent');

        // Redirect to login page with success state
        navigate(routes.login, {
          state: {
            fromResetPassword: true,
            email: response.data.email || '', // Use email from response if available
          },
        });
      } else {
        setError(response.data.message || 'Password reset failed');
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      setError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          'Failed to reset password. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='reset-white-container'>
      {/* Background Image with dramatic entrance */}
      <div
        className={`reset-background-image ${isImageLoaded ? 'loaded' : ''}`}
      >
        <div
          className='reset-bg-parallax'
          style={{
            transform: `translate(${(mousePosition.x - 50) * -0.02}px, ${(mousePosition.y - 50) * -0.02}px)`,
          }}
        >
          <ImageWithBasePath
            src='assets/img/bg/bg_resetPassword.png'
            alt='Background'
            className='reset-bg-img'
          />
        </div>
      </div>

      {/* Animated gradient orbs */}
      <div className='reset-orb-white reset-orb-white-1' />
      <div className='reset-orb-white reset-orb-white-2' />
      <div className='reset-orb-white reset-orb-white-3' />

      {/* Floating particles */}
      <div className='reset-particles'>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className='reset-particle'
            style={{
              animationDelay: `${i * 0.5}s`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${3 + Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className='reset-content-wrapper-white'>
        <div className='reset-grid-white'>
          {/* Left column - Image */}
          <div className='reset-image-col'>
            <div className='reset-image-card' />
          </div>

          {/* Right column - Reset Password Form */}
          <div className='reset-form-col'>
            <div className='reset-form-card-white'>
              <div className='reset-header-white'>
                <div className='reset-header-icon-white'>
                  <i className='ti ti-lock-question' />
                </div>
                <h1>Reset Password</h1>
                <p>Enter your new password below</p>
              </div>

              {error && (
                <div className='reset-alert-white reset-alert-error'>
                  <i className='ti ti-alert-circle' />
                  <span>{error}</span>
                  <button
                    type='button'
                    className='reset-alert-close'
                    onClick={() => setError('')}
                  >
                    <i className='ti ti-x' />
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className='reset-form-white'>
                <div className='form-group-reset'>
                  <label className='form-label-reset'>
                    <i className='ti ti-lock' />
                    New Password
                  </label>
                  <div className='password-input-wrapper-reset'>
                    <input
                      type={
                        passwordVisibility.newPassword ? 'text' : 'password'
                      }
                      className='form-control-reset'
                      value={passwords.newPassword}
                      onChange={(e) =>
                        handlePasswordChange('newPassword', e.target.value)
                      }
                      required
                      minLength={8}
                    />
                    <span
                      className={`ti password-toggle-reset ${
                        passwordVisibility.newPassword ? 'ti-eye' : 'ti-eye-off'
                      }`}
                      onClick={() => togglePasswordVisibility('newPassword')}
                    />
                  </div>
                </div>

                <div className='form-group-reset'>
                  <label className='form-label-reset'>
                    <i className='ti ti-lock' />
                    Confirm Password
                  </label>
                  <div className='password-input-wrapper-reset'>
                    <input
                      type={
                        passwordVisibility.confirmPassword ? 'text' : 'password'
                      }
                      className='form-control-reset'
                      value={passwords.confirmPassword}
                      onChange={(e) =>
                        handlePasswordChange('confirmPassword', e.target.value)
                      }
                      required
                      minLength={8}
                    />
                    <span
                      className={`ti password-toggle-reset ${
                        passwordVisibility.confirmPassword
                          ? 'ti-eye'
                          : 'ti-eye-off'
                      }`}
                      onClick={() =>
                        togglePasswordVisibility('confirmPassword')
                      }
                    />
                  </div>
                </div>

                <button
                  type='submit'
                  className='reset-submit-btn-white'
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className='spinner-reset' />
                      Processing...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <i className='ti ti-arrow-right' />
                    </>
                  )}
                </button>

                <div className='reset-footer-white'>
                  <p>
                    Return to{' '}
                    <Link to={routes.login} className='login-link-reset'>
                      Login
                    </Link>
                  </p>
                </div>

                <div className='reset-copyright-white'>
                  <p>© {currentYear} Bothell Select by Rainboots</p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
