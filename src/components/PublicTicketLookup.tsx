// components/PublicTicketLookup.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import UserTickets from './UserTickets';
import ImageWithBasePath from '../core/common/imageWithBasePath';

const PublicTicketLookup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [showTickets, setShowTickets] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setShowTickets(true);
    }
  };

  const handleReset = () => {
    setShowTickets(false);
    setEmail('');
  };

  return (
    <div className='container-fuild'>
      <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
        <div className='row'>
          <div className='col-lg-6'>
            <div className='d-lg-flex align-items-center justify-content-center bg-light-300 d-lg-block d-none flex-wrap vh-100 overflowy-auto bg-01'>
              <div className='text-center p-5'>
                <ImageWithBasePath src='assets/img/faq.png' alt='Img' />
              </div>
            </div>
          </div>

          <div className='col-lg-6 col-md-12 col-sm-12'>
            <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
              <div className='find-tickets-page ticket-lookup-container'>
                <div className='text-center mb-4'>
                  <h1 className='text-center'>
                    <i className='ti ti-ticket me-2'></i>
                    Find Your Tickets
                  </h1>
                </div>

                <div className='card shadow-sm border-0'>
                  <div className='card-body p-4'>
                    {!showTickets ? (
                      <>
                        <div className='search-section mb-4'>
                          <p className='text-muted mb-4'>
                            Enter the email address you used when making your
                            purchase to view your ticket history.
                          </p>

                          <form onSubmit={handleSubmit}>
                            <div className='mb-4'>
                              <label
                                htmlFor='email'
                                className='form-label fw-semibold'
                              >
                                <i className='ti ti-mail me-2'></i>
                                Email Address
                              </label>
                              <div className='input-group'>
                                <span className='input-group-text bg-light'>
                                  <i className='ti ti-user'></i>
                                </span>
                                <input
                                  type='email'
                                  className='form-control'
                                  id='email'
                                  placeholder='your@email.com'
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  required
                                />
                              </div>
                              <div className='form-text text-muted mt-2'>
                                <i className='ti ti-info-circle me-1'></i>
                                We'll show all purchases made with this email
                                address.
                              </div>
                            </div>

                            <div className='d-grid gap-2 mb-4'>
                              <button
                                type='submit'
                                className='btn btn-primary btn-lg'
                              >
                                <i className='ti ti-search me-2'></i>
                                Find My Tickets
                              </button>
                            </div>
                          </form>
                        </div>

                        <div className='info-section mt-4 pt-4 border-top'>
                          <div className='alert alert-info border-0'>
                            <h6 className='alert-heading fw-semibold'>
                              <i className='ti ti-info-circle me-2'></i>
                              Important Information
                            </h6>
                            <ul className='mb-0 ps-3'>
                              <li className='mb-2'>
                                All purchases made with this email will be
                                displayed
                              </li>
                              <li className='mb-2'>
                                Need help?{' '}
                                <Link
                                  to='/contact-us'
                                  className='text-primary fw-medium'
                                >
                                  Contact our support team
                                </Link>
                              </li>
                              <li>
                                Consider{' '}
                                <Link
                                  to='/register'
                                  className='text-primary fw-medium'
                                >
                                  creating an account
                                </Link>{' '}
                                for easier access and enhanced security
                              </li>
                            </ul>
                          </div>
                        </div>

                        <div className='account-options mt-4'>
                          <div className='row'>
                            <div className='col-md-6 mb-3'>
                              <Link
                                to='/login'
                                className='btn btn-outline-primary w-100'
                              >
                                <i className='ti ti-login me-2'></i>
                                Already have an account? Log In
                              </Link>
                            </div>
                            <div className='col-md-6 mb-3'>
                              <Link
                                to='/register'
                                className='btn btn-outline-success w-100'
                              >
                                <i className='ti ti-user-plus me-2'></i>
                                Create New Account
                              </Link>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className='results-header d-flex justify-content-between align-items-center mb-4'>
                          <div>
                            <h5 className='mb-1'>
                              <i className='ti ti-ticket me-2'></i>
                              Your Tickets
                            </h5>
                            <p className='text-muted mb-0'>
                              Showing tickets for: <strong>{email}</strong>
                            </p>
                          </div>
                          <button
                            className='btn btn-outline-primary'
                            onClick={handleReset}
                          >
                            <i className='ti ti-search me-1'></i>
                            Search Again
                          </button>
                        </div>

                        <div className='tickets-section'>
                          <UserTickets email={email} isPublicMode={true} />
                        </div>

                        <div className='security-notice mt-4 pt-4 border-top'>
                          <div className='alert alert-warning border-0'>
                            <h6 className='alert-heading fw-semibold'>
                              <i className='ti ti-shield-lock me-2'></i>
                              Security Notice
                            </h6>
                            <p className='mb-2'>
                              This is a public lookup. Anyone with your email
                              can see your purchases.
                            </p>
                          </div>
                        </div>

                        <div className='action-buttons mt-4'>
                          <div className='row'>
                            <div className='col-md-6 mb-3'>
                              <Link
                                to='/login'
                                className='btn btn-outline-primary w-100'
                              >
                                <i className='ti ti-login me-2'></i>
                                Log In to Your Account
                              </Link>
                            </div>
                            <div className='col-md-6 mb-3'>
                              <Link
                                to='/find-tickets'
                                className='btn btn-outline-secondary w-100'
                                onClick={handleReset}
                              >
                                <i className='ti ti-search me-2'></i>
                                Lookup Different Email
                              </Link>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className='additional-info mt-4'>
                  <div className='row g-3'>
                    <div className='col-md-4'>
                      <div className='card border-0 bg-light h-100'>
                        <div className='card-body text-center p-3'>
                          <i className='ti ti-shield text-primary fs-2 mb-3'></i>
                          <h6 className='fw-semibold'>Secure Access</h6>
                          <p className='text-muted small mb-0'>
                            Your information is protected
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className='col-md-4'>
                      <div className='card border-0 bg-light h-100'>
                        <div className='card-body text-center p-3'>
                          <i className='ti ti-receipt text-primary fs-2 mb-3'></i>
                          <h6 className='fw-semibold'>Download Receipts</h6>
                          <p className='text-muted small mb-0'>
                            Access receipts anytime
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className='col-md-4'>
                      <div className='card border-0 bg-light h-100'>
                        <div className='card-body text-center p-3'>
                          <i className='ti ti-help text-primary fs-2 mb-3'></i>
                          <h6 className='fw-semibold'>Need Help?</h6>
                          <p className='text-muted small mb-0'>
                            <Link to='/contact-us' className='text-primary'>
                              Contact Support
                            </Link>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicTicketLookup;
