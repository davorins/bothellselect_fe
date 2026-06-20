import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import { useAuth } from '../../../context/AuthContext';
import './Login.css';

type PasswordField = 'password';

const Login = () => {
  const routes = all_routes;
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
  });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  useEffect(() => {
    // Preload image and trigger entrance animation
    const img = new Image();
    img.src = 'assets/img/bg/bg_contact.png';
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

  const handleCreateAccount = () => {
    navigate(routes.register);
  };

  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    try {
      await login(email.trim(), password.trim());
    } catch (error: any) {
      console.error('Login error:', error);
      setError(
        error.response?.data?.error ||
          error.message ||
          'Login failed. Please try again.',
      );
    }
  };

  return (
    <div className='login-white-container'>
      {/* Background Image with dramatic entrance */}
      <div
        className={`login-background-image ${isImageLoaded ? 'loaded' : ''}`}
      >
        <div
          className='login-bg-parallax'
          style={{
            transform: `translate(${(mousePosition.x - 50) * -0.02}px, ${(mousePosition.y - 50) * -0.02}px)`,
          }}
        >
          <ImageWithBasePath
            src='assets/img/bg/bg_contact.png'
            alt='Background'
            className='login-bg-img'
          />
        </div>
        <div className='login-bg-overlay' />
        <div className='login-bg-gradient-overlay' />
      </div>

      {/* Floating particles */}
      <div className='login-particles'>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className='login-particle'
            style={{
              animationDelay: `${i * 0.5}s`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${3 + Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className='login-content-wrapper-white'>
        <div className='login-grid-white'>
          {/* Left side - Image Column */}
          <div className='login-image-col'>
            <div className='login-image-card'>
              {/* <div className='login-image-glass'>
                <div className='login-image-glow' />
              </div>
              <div className='login-image-badge'>
                <i className='ti ti-ball-basketball' />
                <span>
                  Join Bothell Select
                  <br />
                  Basketball Family
                </span>
              </div> */}
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className='login-form-col'>
            <div className='login-form-card-white'>
              <div className='login-header-white'>
                <div className='login-header-icon-white'>
                  <i className='ti ti-lock' />
                </div>
                <h1>Welcome Back</h1>
                <p>Please enter your details to sign in to your account</p>
              </div>

              {error && (
                <div className='login-alert-white'>
                  <i className='ti ti-alert-circle' />
                  <span>{error}</span>
                  <button
                    type='button'
                    className='login-alert-close'
                    onClick={() => setError('')}
                  >
                    <i className='ti ti-x' />
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className='login-form-white'>
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
                    placeholder='Enter your email'
                    required
                  />
                </div>

                <div className='form-group-white'>
                  <label className='form-label-white'>
                    <i className='ti ti-lock' />
                    Password
                  </label>
                  <div className='password-wrapper-white'>
                    <input
                      type={passwordVisibility.password ? 'text' : 'password'}
                      className='form-control-white'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder='Enter your password'
                      required
                    />
                    <button
                      type='button'
                      className='password-toggle-white'
                      onClick={() => togglePasswordVisibility('password')}
                    >
                      <i
                        className={`ti ${
                          passwordVisibility.password ? 'ti-eye' : 'ti-eye-off'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className='login-options-white'>
                  <label className='checkbox-white'>
                    <input type='checkbox' />
                    <span>Remember Me</span>
                  </label>
                  <Link
                    to={routes.forgotPassword}
                    className='forgot-link-white'
                  >
                    Forgot Password?
                  </Link>
                </div>

                <button type='submit' className='login-submit-btn-white'>
                  Sign In
                  <i className='ti ti-arrow-right' />
                </button>

                <div className='login-footer-white'>
                  <p>
                    Don't have an account?{' '}
                    <button
                      type='button'
                      className='signup-link-white'
                      onClick={handleCreateAccount}
                    >
                      Create Account
                    </button>
                  </p>
                </div>

                <div className='login-tickets-white'>
                  <p className='login-tickets-text'>
                    Looking for tickets you already purchased?
                  </p>
                  <Link to='/find-tickets' className='tickets-link-white'>
                    <i className='ti ti-ticket' />
                    Find My Tickets
                  </Link>
                </div>

                <div className='login-copyright-white'>
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

export default Login;
