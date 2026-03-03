// src/components/registration-modules/AccountCreationModule.tsx
import React, { useState, useEffect } from 'react';

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

  // Password visibility state
  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
    confirmPassword: false,
  });

  // Validation functions matching other modules
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
    password: string
  ): string => {
    if (!confirmPassword) return 'Please confirm your password';
    if (password !== confirmPassword) return 'Passwords do not match';
    return '';
  };

  // Main validation function
  const validateForm = () => {
    const err: Record<string, string> = {};

    err.email = validateEmail(email);
    err.password = validatePassword(password);
    err.confirm = validateConfirmPassword(confirmPassword, password);

    // Remove empty error fields
    Object.keys(err).forEach((key) => {
      if (!err[key]) delete err[key];
    });

    setErrors(err);
    const formIsValid = Object.keys(err).length === 0;
    setIsValid(formIsValid);
    onValidationChange?.(formIsValid);

    return formIsValid;
  };

  // Real-time validation only after user has engaged
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

    // Always validate on submit, regardless of engagement
    if (!validateForm()) {
      console.log('❌ [AccountCreationModule] Form validation failed');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log(
        '✅ [AccountCreationModule] Form validated, calling onComplete'
      );

      // JUST pass the data to the parent - let the wizard handle the API call
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

            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Password</label>
                <div className='pass-group'>
                  <input
                    type={passwordVisibility.password ? 'text' : 'password'}
                    name='password'
                    className={`pass-input form-control ${
                      errors.password ? 'is-invalid' : ''
                    }`}
                    value={password}
                    onChange={handlePasswordChange}
                    disabled={isSubmitting}
                    required
                    aria-label='Password'
                    minLength={6}
                    placeholder='Enter password'
                  />
                  <span
                    className={`ti toggle-passwords ${
                      passwordVisibility.password ? 'ti-eye' : 'ti-eye-off'
                    }`}
                    onClick={() => togglePasswordVisibility('password')}
                    style={{ cursor: 'pointer' }}
                  ></span>
                </div>
                {errors.password && (
                  <div className='invalid-feedback d-block'>
                    {errors.password}
                  </div>
                )}
              </div>
            </div>

            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Confirm Password</label>
                <div className='pass-group'>
                  <input
                    type={
                      passwordVisibility.confirmPassword ? 'text' : 'password'
                    }
                    name='confirmPassword'
                    className={`pass-input form-control ${
                      errors.confirm ? 'is-invalid' : ''
                    }`}
                    value={confirmPassword}
                    onChange={handlePasswordChange}
                    disabled={isSubmitting}
                    required
                    aria-label='Confirm Password'
                    placeholder='Confirm your password'
                  />
                  <span
                    className={`ti toggle-passwords ${
                      passwordVisibility.confirmPassword
                        ? 'ti-eye'
                        : 'ti-eye-off'
                    }`}
                    onClick={() => togglePasswordVisibility('confirmPassword')}
                    style={{ cursor: 'pointer' }}
                  ></span>
                </div>
                {errors.confirm && (
                  <div className='invalid-feedback d-block'>
                    {errors.confirm}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit button */}
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
      </div>
    </div>
  );
};

export default AccountCreationModule;
