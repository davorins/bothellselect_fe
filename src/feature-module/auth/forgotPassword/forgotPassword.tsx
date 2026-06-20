import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import axios from 'axios';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const routes = all_routes;
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    // Preload image and trigger entrance animation
    const img = new Image();
    img.src = 'assets/img/theme/player10_1.png';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/request-password-reset`,
        { email: email.trim() },
      );

      if (response.data.message) {
        setSuccess(true);
      } else {
        setError('Failed to send reset email');
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setError(
        error.response?.data?.error ||
          'Failed to send reset email. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='forgot-white-container'>
      {/* Background Image with dramatic entrance */}
      <div
        className={`forgot-background-image ${isImageLoaded ? 'loaded' : ''}`}
      >
        <div
          className='forgot-bg-parallax'
          style={{
            transform: `translate(${(mousePosition.x - 50) * -0.02}px, ${(mousePosition.y - 50) * -0.02}px)`,
          }}
        >
          <ImageWithBasePath
            src='assets/img/theme/player10_1.png'
            alt='Background'
            className='forgot-bg-img'
          />
        </div>
        <div className='forgot-bg-overlay' />
        <div className='forgot-bg-gradient-overlay' />
      </div>

      {/* Animated gradient orbs */}
      <div className='forgot-orb-white forgot-orb-white-1' />
      <div className='forgot-orb-white forgot-orb-white-2' />
      <div className='forgot-orb-white forgot-orb-white-3' />

      {/* Floating particles */}
      <div className='forgot-particles'>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className='forgot-particle'
            style={{
              animationDelay: `${i * 0.5}s`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${3 + Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className='forgot-content-wrapper-white'>
        <div className='forgot-grid-white'>
          {/* Left column - Image */}
          <div className='forgot-image-col'>
            <div className='forgot-image-card'>
              {/* <div className='forgot-image-glass'>
                <div className='forgot-image-glow' />
                <ImageWithBasePath
                  src='assets/img/authentication/authentication.png'
                  alt='Reset Password'
                  className='forgot-img'
                />
              </div>
              <div className='forgot-image-badge'>
                <i className='ti ti-key' />
                <span>
                  Reset Your Password
                  <br />
                  Get Back on Court
                </span>
              </div> */}
            </div>
          </div>

          {/* Right column - Forgot Password Form */}
          <div className='forgot-form-col'>
            <div className='forgot-form-card-white'>
              <div className='forgot-header-white'>
                <div className='forgot-header-icon-white'>
                  <i className='ti ti-lock-question' />
                </div>
                <h1>Forgot Password?</h1>
                <p>
                  Enter your email address and we'll send you instructions to
                  reset your password.
                </p>
              </div>

              {error && (
                <div className='forgot-alert-white forgot-alert-error'>
                  <i className='ti ti-alert-circle' />
                  <span>{error}</span>
                  <button
                    type='button'
                    className='forgot-alert-close'
                    onClick={() => setError('')}
                  >
                    <i className='ti ti-x' />
                  </button>
                </div>
              )}

              {success && (
                <div className='forgot-alert-white forgot-alert-success'>
                  <i className='ti ti-circle-check' />
                  <span>
                    Password reset link sent to your email! Please check your
                    inbox.
                  </span>
                  <button
                    type='button'
                    className='forgot-alert-close'
                    onClick={() => setSuccess(false)}
                  >
                    <i className='ti ti-x' />
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className='forgot-form-white'>
                <div className='form-group-white'>
                  <label className='form-label-white'>
                    <i className='ti ti-mail' />
                    Email Address
                  </label>
                  <input
                    type='email'
                    className='form-control-white'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder='Enter your email address'
                    required
                    disabled={success}
                  />
                </div>

                <button
                  type='submit'
                  className='forgot-submit-btn-white'
                  disabled={isSubmitting || success}
                >
                  {isSubmitting ? (
                    <>
                      <span className='spinner-white' />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <i className='ti ti-arrow-right' />
                    </>
                  )}
                </button>

                <div className='forgot-footer-white'>
                  <p>
                    Return to{' '}
                    <Link to={routes.login} className='login-link-white'>
                      Sign In
                    </Link>
                  </p>
                </div>

                <div className='forgot-copyright-white'>
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

export default ForgotPassword;
