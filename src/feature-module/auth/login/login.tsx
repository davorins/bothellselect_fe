import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import { useAuth } from '../../../context/AuthContext';

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
  const currentYear = new Date().getFullYear();

  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
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

      // This ensures that the error message displayed is coming from the backend or a fallback message.
      setError(
        error.response?.data?.error ||
          error.message ||
          'Login failed. Please try again.'
      );
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
                            <h2 className='mb-2'>Welcome</h2>
                            <p className='mb-0'>
                              Please enter your details to sign in
                            </p>
                          </div>
                          {error && (
                            <div
                              className='alert alert-danger alert-dismissible fade show'
                              role='alert'
                            >
                              <i className='fas fa-exclamation-circle me-2'></i>
                              {error}
                              <button
                                type='button'
                                className='btn-close'
                                onClick={() => setError('')}
                                aria-label='Close'
                              ></button>
                            </div>
                          )}

                          <div className='mb-3 '>
                            <label className='form-label'>Email Address</label>
                            <div className='input-icon mb-3 position-relative'>
                              <span className='input-icon-addon'>
                                <i
                                  className={`ti ti-mail ${
                                    error ? 'd-none' : ''
                                  }`}
                                />
                              </span>
                              <input
                                type='text'
                                className={`form-control ${
                                  error && 'is-invalid'
                                }`}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                              />
                            </div>
                            <label className='form-label'>Password</label>
                            <div className='pass-group'>
                              <input
                                type={
                                  passwordVisibility.password
                                    ? 'text'
                                    : 'password'
                                }
                                className={`pass-input form-control ${
                                  error && 'is-invalid'
                                }`}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                              />
                              <span
                                className={`ti toggle-passwords ${
                                  passwordVisibility.password
                                    ? 'ti-eye'
                                    : 'ti-eye-off'
                                } ${error ? 'd-none' : ''}`} // Hide the icon if error exists
                                onClick={() =>
                                  togglePasswordVisibility('password')
                                }
                              ></span>
                            </div>
                          </div>
                          <div className='form-wrap form-wrap-checkbox mb-3'>
                            <div className='d-flex align-items-center'>
                              <div className='form-check form-check-md mb-0'>
                                <input
                                  className='form-check-input mt-0'
                                  type='checkbox'
                                />
                              </div>
                              <p className='ms-1 mb-0 '>Remember Me</p>
                            </div>
                            <div className='text-end '>
                              <Link
                                to={routes.forgotPassword}
                                className='link-danger'
                              >
                                Forgot Password?
                              </Link>
                            </div>
                          </div>
                          <div className='mb-3'>
                            <button
                              type='submit'
                              className='btn btn-primary w-100'
                            >
                              Sign In
                            </button>
                          </div>
                          <div className='text-center'>
                            <h6 className='fw-normal text-dark mb-0'>
                              Don’t have an account?{' '}
                              <Link to={routes.register} className='hover-a '>
                                {' '}
                                Create Account
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

export default Login;
