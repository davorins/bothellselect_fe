// src/components/registration-modules/AccountCreationModule.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  onComplete: (data: { email: string; password: string }) => void;
  onValidationChange?: (isValid: boolean) => void;
}

const AccountCreationModule: React.FC<Props> = ({
  onComplete,
  onValidationChange,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [hasUserEngaged, setHasUserEngaged] = useState(false);

  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
    confirmPassword: false,
  });

  const validateEmail = (email: string): string => {
    if (!email.trim()) return 'Email is required';
    if (!/^\S+@\S+\.\S+$/.test(email))
      return 'Please enter a valid email address.';
    return '';
  };

  const validatePassword = (password: string): string => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const validateConfirmPassword = (
    confirmPassword: string,
    password: string,
  ): string => {
    if (!confirmPassword) return 'Please confirm your password';
    if (password !== confirmPassword) return 'Passwords do not match';
    return '';
  };

  const validateForm = () => {
    const err: Record<string, string> = {};
    err.email = validateEmail(email);
    err.password = validatePassword(password);
    err.confirm = validateConfirmPassword(confirmPassword, password);

    Object.keys(err).forEach((key) => {
      if (!err[key]) delete err[key];
    });

    setErrors(err);
    const formIsValid = Object.keys(err).length === 0;
    setIsValid(formIsValid);
    onValidationChange?.(formIsValid);

    return formIsValid;
  };

  useEffect(() => {
    if (hasUserEngaged) {
      validateForm();
    }
  }, [email, password, confirmPassword, hasUserEngaged]);

  const togglePasswordVisibility = (field: 'password' | 'confirmPassword') => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setEmail(value);
    if (!hasUserEngaged) setHasUserEngaged(true);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'password') {
      setPassword(value);
    } else {
      setConfirmPassword(value);
    }
    if (!hasUserEngaged) setHasUserEngaged(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🔐 [AccountCreationModule] Form submitted');

    if (!validateForm()) {
      console.log('❌ [AccountCreationModule] Form validation failed');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log(
        '✅ [AccountCreationModule] Form validated, calling onComplete',
      );

      onComplete({
        email: email.toLowerCase().trim(),
        password: password,
      });

      console.log('✅ [AccountCreationModule] onComplete called successfully');
    } catch (err: any) {
      console.error('❌ [AccountCreationModule] Error in handleSubmit:', err);
      setErrors({
        email: err.message || 'Account creation failed. Please try again.',
      });
      setIsValid(false);
      onValidationChange?.(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='card'>
      <div className='card-header bg-light'>
        <div className='d-flex align-items-center'>
          <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
            <i className='ti ti-user-shield fs-16' />
          </span>
          <h4 className='text-dark'>Account Information</h4>
        </div>
      </div>
      <div className='card-body'>
        <form onSubmit={handleSubmit}>
          <div className='row'>
            <div className='col-md-12'>
              <div className='mb-3'>
                <label className='form-label'>Email</label>
                <input
                  type='email'
                  name='email'
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  value={email}
                  onChange={handleEmailChange}
                  disabled={isSubmitting}
                  required
                  aria-label='Email'
                  placeholder='Enter your email address'
                />
                {errors.email && (
                  <div className='invalid-feedback d-block'>{errors.email}</div>
                )}
              </div>
            </div>

            <div className='col-md-6 mb-3'>
              <label className='form-label'>Password</label>
              <div className='pass-group'>
                <input
                  type={passwordVisibility.password ? 'text' : 'password'}
                  name='password'
                  className={`pass-input form-control ${errors.password ? 'is-invalid' : ''}`}
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={isSubmitting}
                  placeholder='Enter password'
                  minLength={6}
                  required
                />
                <span
                  className={`ti toggle-passwords ${passwordVisibility.password ? 'ti-eye' : 'ti-eye-off'}`}
                  onClick={() => togglePasswordVisibility('password')}
                />
              </div>
              {errors.password && (
                <div className='invalid-feedback'>{errors.password}</div>
              )}
            </div>

            <div className='col-md-6 mb-3'>
              <label className='form-label'>Confirm Password</label>
              <div className='pass-group'>
                <input
                  type={
                    passwordVisibility.confirmPassword ? 'text' : 'password'
                  }
                  name='confirmPassword'
                  className={`pass-input form-control ${errors.confirm ? 'is-invalid' : ''}`}
                  value={confirmPassword}
                  onChange={handlePasswordChange}
                  disabled={isSubmitting}
                  placeholder='Confirm your password'
                  required
                />
                <span
                  className={`ti toggle-passwords ${passwordVisibility.confirmPassword ? 'ti-eye' : 'ti-eye-off'}`}
                  onClick={() => togglePasswordVisibility('confirmPassword')}
                />
              </div>
              {errors.confirm && (
                <div className='invalid-feedback'>{errors.confirm}</div>
              )}
            </div>
          </div>

          <div className='d-flex justify-content-end mt-4'>
            <button
              type='submit'
              className='btn btn-primary'
              disabled={isSubmitting || !isValid}
            >
              {isSubmitting ? (
                <>
                  <span className='spinner-border spinner-border-sm me-2'></span>
                  Creating Account...
                </>
              ) : (
                'Create Account & Continue'
              )}
            </button>
          </div>
        </form>

        {/* ✅ Already have an account? Log in */}
        <div className='account-login-prompt'>
          Already have an account?{' '}
          <Link to='/login' className='account-login-link'>
            Log in
          </Link>
        </div>
      </div>

      {/* Scoped styles for the login prompt */}
      <style>{`
        .account-login-prompt {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          text-align: center;
          font-size: 0.9rem;
          color: rgba(0, 0, 0, 0.6);
          font-weight: 500;
        }

        .account-login-link {
          color: #506ee4;
          font-weight: 700;
          text-decoration: none;
          margin-left: 4px;
          transition: color 0.2s ease;
        }

        .account-login-link:hover {
          color: #3f5cd6;
          text-decoration: underline;
        }

        .account-login-link:focus-visible {
          outline: 2px solid #506ee4;
          outline-offset: 2px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default AccountCreationModule;
