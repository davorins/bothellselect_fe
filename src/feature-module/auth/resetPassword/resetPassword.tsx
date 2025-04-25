import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import axios from 'axios';

type PasswordField = 'newPassword' | 'confirmPassword';

const ResetPassword = () => {
  const routes = all_routes;
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
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
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

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
        }
      );

      if (response.data.success) {
        navigate(routes.resetPasswordSuccess);
      } else {
        setError(response.data.message || 'Password reset failed');
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      setError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          'Failed to reset password. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='container-fluid'>
      <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
        <div className='row'>
          <div className='col-lg-6 d-none d-lg-flex align-items-center justify-content-center bg-light-300 vh-100'>
            <div>
              <ImageWithBasePath
                src='assets/img/authentication/authentication.png'
                alt='Authentication Illustration'
              />
            </div>
          </div>
          <div className='col-lg-6 col-md-12 col-sm-12'>
            <div className='row justify-content-center align-items-center vh-100 overflow-auto'>
              <div className='col-md-8 mx-auto p-4'>
                <form onSubmit={handleSubmit}>
                  <div className='mx-auto mb-5 text-center'>
                    <ImageWithBasePath
                      src='assets/img/logo.png'
                      className='img-fluid'
                      alt='Logo'
                    />
                  </div>
                  <div className='card'>
                    <div className='card-body p-4'>
                      <div className='mb-4'>
                        <h2 className='mb-2'>Reset Password</h2>
                        <p className='mb-0'>Enter your new password below</p>
                      </div>
                      <div className='mb-3'>
                        <label className='form-label'>New Password</label>
                        <div className='pass-group'>
                          <input
                            type={
                              passwordVisibility.newPassword
                                ? 'text'
                                : 'password'
                            }
                            className='pass-input form-control'
                            value={passwords.newPassword}
                            onChange={(e) =>
                              handlePasswordChange(
                                'newPassword',
                                e.target.value
                              )
                            }
                            required
                            minLength={8}
                          />
                          <span
                            className={`ti toggle-passwords ${
                              passwordVisibility.newPassword
                                ? 'ti-eye'
                                : 'ti-eye-off'
                            }`}
                            onClick={() =>
                              togglePasswordVisibility('newPassword')
                            }
                          ></span>
                        </div>
                      </div>
                      <div className='mb-3'>
                        <label className='form-label'>Confirm Password</label>
                        <div className='pass-group'>
                          <input
                            type={
                              passwordVisibility.confirmPassword
                                ? 'text'
                                : 'password'
                            }
                            className='pass-input form-control'
                            value={passwords.confirmPassword}
                            onChange={(e) =>
                              handlePasswordChange(
                                'confirmPassword',
                                e.target.value
                              )
                            }
                            required
                            minLength={8}
                          />
                          <span
                            className={`ti toggle-passwords ${
                              passwordVisibility.confirmPassword
                                ? 'ti-eye'
                                : 'ti-eye-off'
                            }`}
                            onClick={() =>
                              togglePasswordVisibility('confirmPassword')
                            }
                          ></span>
                        </div>
                      </div>
                      {error && (
                        <div className='alert alert-danger'>{error}</div>
                      )}
                      <div className='mb-3'>
                        <button
                          type='submit'
                          className='btn btn-primary w-100'
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Processing...' : 'Reset Password'}
                        </button>
                      </div>
                      <div className='text-center'>
                        <h6 className='fw-normal text-dark mb-0'>
                          Return to{' '}
                          <Link to={routes.login} className='hover-a'>
                            Login
                          </Link>
                        </h6>
                      </div>
                    </div>
                  </div>
                  <div className='mt-5 text-center'>
                    <p className='mb-0'>
                      © {currentYear} Your Company by{' '}
                      <a href='https://example.com'>Your Team</a>
                    </p>
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

export default ResetPassword;
