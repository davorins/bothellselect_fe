import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import axios from 'axios';

const ForgotPassword = () => {
  const routes = all_routes;
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentYear = new Date().getFullYear();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/request-password-reset`,
        { email: email.trim() }
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
          'Failed to send reset email. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className='container-fuild'>
        <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
          <div className='row'>
            <div className='col-lg-6'>
              <div className='d-lg-flex align-items-center justify-content-center bg-light-300 d-lg-block d-none flex-wrap vh-100 overflowy-auto bg-01'>
                <div>
                  <ImageWithBasePath
                    src='assets/img/authentication/authentication.png'
                    alt='Img'
                  />
                </div>
              </div>
            </div>
            <div className='col-lg-6 col-md-12 col-sm-12'>
              <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap '>
                <div className='col-md-8 mx-auto p-4'>
                  <form onSubmit={handleSubmit}>
                    <div>
                      <div className=' mx-auto mb-5 text-center'>
                        <ImageWithBasePath
                          src='assets/img/logo.png'
                          className='img-fluid'
                          alt='Logo'
                        />
                      </div>
                      <div className='card'>
                        <div className='card-body p-4'>
                          <div className=' mb-4'>
                            <h2 className='mb-2'>Forgot Password?</h2>
                            <p className='mb-0'>
                              If you forgot your password, well, then we’ll
                              email you instructions to reset your password.
                            </p>
                          </div>
                          <div className='mb-3 '>
                            <label className='form-label'>Email Address</label>
                            <div className='input-icon mb-3 position-relative'>
                              <span className='input-icon-addon'>
                                <i className='ti ti-mail' />
                              </span>
                              <input
                                type='email'
                                className='form-control'
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          {error && (
                            <div className='alert alert-danger mb-3'>
                              {error}
                            </div>
                          )}
                          {success && (
                            <div className='alert alert-success mb-3'>
                              Password reset link sent to your email
                            </div>
                          )}
                          <div className='mb-3'>
                            <button
                              type='submit'
                              className='btn btn-primary w-100'
                              disabled={isSubmitting || success}
                            >
                              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                            </button>
                          </div>
                          <div className='text-center'>
                            <h6 className='fw-normal text-dark mb-0'>
                              Return to{' '}
                              <Link to={routes.login} className='hover-a '>
                                {' '}
                                Login
                              </Link>
                            </h6>
                          </div>
                        </div>
                      </div>
                      <div className='mt-5 text-center'>
                        <p className='mb-0 '>
                          © {currentYear} Bothell Select by{' '}
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
    </>
  );
};

export default ForgotPassword;
