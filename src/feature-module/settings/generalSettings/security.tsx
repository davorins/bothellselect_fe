import React, { useState } from 'react';
import { all_routes } from '../../router/all_routes';
import { Link } from 'react-router-dom';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

const SecuritySettings = () => {
  const routes = all_routes;
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordChangeForm, setShowPasswordChangeForm] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleGoogleAuthToggle = () => {
    setGoogleAuthEnabled((prev) => !prev);
    // TODO: Add API call to update Google authentication setting
  };

  const handleDeleteAccount = () => {
    // TODO: Add API call to delete account
    setShowDeleteModal(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
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
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newPassword: passwords.newPassword,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Something went wrong.');
      }

      // Reset form on success
      setPasswords({
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordChangeForm(false);
      alert('Password updated successfully!');
    } catch (err: any) {
      console.error('Password change error:', err);
      setError(err.message || 'Error changing password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='page-wrapper'>
      <div className='content'>
        {/* Top Bar */}
        <div className='d-md-flex d-block align-items-center justify-content-between border-bottom pb-3'>
          <div className='my-auto mb-2'>
            <h3 className='page-title mb-1'>General Settings</h3>
            <nav>
              <ol className='breadcrumb mb-0'>
                <li className='breadcrumb-item'>
                  <Link to='/'>Dashboard</Link>
                </li>
                <li className='breadcrumb-item'>
                  <span>Settings</span>
                </li>
                <li className='breadcrumb-item active' aria-current='page'>
                  General Settings
                </li>
              </ol>
            </nav>
          </div>
          <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
            <OverlayTrigger
              placement='top'
              overlay={<Tooltip id='tooltip-top'>Refresh</Tooltip>}
            >
              <Link
                to='#'
                className='btn btn-outline-light bg-white btn-icon me-1'
              >
                <i className='ti ti-refresh' />
              </Link>
            </OverlayTrigger>
          </div>
        </div>

        {/* Main Settings */}
        <div className='row'>
          <div className='col-xxl-2 col-xl-3'>
            <div className='pt-3 d-flex flex-column list-group mb-4'>
              <Link to={routes.profilesettings} className='d-block rounded p-2'>
                Profile Settings
              </Link>
              <Link
                to={routes.securitysettings}
                className='d-block rounded p-2 active'
              >
                Security Settings
              </Link>
              <Link
                to={routes.notificationssettings}
                className='d-block rounded p-2'
              >
                Notifications
              </Link>
            </div>
          </div>

          <div className='col-xxl-10 col-xl-9'>
            <div className='border-start ps-3 flex-fill'>
              <h5 className='pt-3 mb-3 border-bottom'>Security Settings</h5>

              {/* Password */}
              <div className='d-flex justify-content-between align-items-center flex-wrap bg-white border rounded p-3 mb-3'>
                <div className='mb-3'>
                  <h6>Password</h6>
                  <p>Set a unique password to protect the account</p>
                </div>
                <div className='mb-3'>
                  <button
                    onClick={() => setShowPasswordChangeForm(true)}
                    className='btn btn-outline-primary'
                  >
                    Change Password
                  </button>
                </div>
              </div>

              {showPasswordChangeForm && (
                <div className='bg-white border rounded p-3 mb-3'>
                  <form onSubmit={handlePasswordSubmit}>
                    <div className='mb-3'>
                      <label className='form-label'>New Password</label>
                      <div className='pass-group'>
                        <input
                          type={
                            passwordVisibility.newPassword ? 'text' : 'password'
                          }
                          className='pass-input form-control'
                          value={passwords.newPassword}
                          onChange={(e) =>
                            handlePasswordChange('newPassword', e.target.value)
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
                      <label className='form-label'>Confirm New Password</label>
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

                    {error && <div className='alert alert-danger'>{error}</div>}

                    <div className='d-flex mb-3'>
                      <button
                        type='submit'
                        className='btn btn-primary me-2'
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Updating...' : 'Update Password'}
                      </button>
                      <button
                        type='button'
                        className='btn btn-light'
                        onClick={() => {
                          setShowPasswordChangeForm(false);
                          setError('');
                          setPasswords({
                            newPassword: '',
                            confirmPassword: '',
                          });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Google Auth */}
              <div className='d-flex justify-content-between align-items-center flex-wrap bg-white border rounded p-3 mb-3'>
                <div className='mb-3'>
                  <h6>Google Authentication</h6>
                  <p>Connect to Google</p>
                </div>
                <div className='d-flex align-items-center mb-3'>
                  <span className='badge badge-soft-success me-3'>
                    <i className='ti ti-circle-filled fs-5 me-1' />
                    {googleAuthEnabled ? 'Connected' : 'Disconnected'}
                  </span>
                  <div className='form-check form-switch'>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      role='switch'
                      id='switch-sm2'
                      checked={googleAuthEnabled}
                      onChange={handleGoogleAuthToggle}
                    />
                  </div>
                </div>
              </div>

              {/* Other sections */}
              {[
                {
                  title: 'Phone Number Verification',
                  desc: 'The Phone Number associated with the account',
                  value: '+1 73649 72648',
                },
                {
                  title: 'Email Address',
                  desc: 'The email address associated with the account',
                  value: 'admin@example.com',
                },
                {
                  title: 'Account Activity',
                  desc: 'The activities of the account',
                  btnText: 'View',
                },
                {
                  title: 'Deactivate Account',
                  desc: 'This will shutdown your account. Your account will be reactive when you sign in again',
                  btnText: 'Deactivate',
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className='d-flex justify-content-between align-items-center flex-wrap bg-white border rounded p-3 mb-3'
                >
                  <div className='mb-3'>
                    <h6>{item.title}</h6>
                    <p>{item.desc}</p>
                  </div>
                  <div className='d-flex align-items-center flex-wrap'>
                    {item.value && <p className='mb-3 me-3'>{item.value}</p>}
                    <span className='badge badge-soft-success me-3 mb-3'>
                      <i className='ti ti-checks me-1' />
                      Verified
                    </span>
                    <Link to='#' className='btn btn-light mb-3'>
                      <i className='ti ti-edit me-2' />
                      Edit
                    </Link>
                  </div>
                </div>
              ))}

              {/* Delete Account */}
              <div className='d-flex justify-content-between align-items-center flex-wrap bg-white border rounded p-3 mb-3'>
                <div className='mb-3'>
                  <h6>Delete Account</h6>
                  <p>Your account will be permanently deleted</p>
                </div>
                <div className='mb-3'>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className='btn btn-outline-danger'
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div
          className='modal fade show'
          style={{ display: 'block' }}
          role='dialog'
        >
          <div className='modal-dialog modal-dialog-centered'>
            <div className='modal-content'>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleDeleteAccount();
                }}
              >
                <div className='modal-body text-center'>
                  <span className='delete-icon'>
                    <i className='ti ti-trash-x' />
                  </span>
                  <h4>Confirm Deletion</h4>
                  <p>
                    You want to delete all the marked items. This can't be
                    undone once deleted.
                  </p>
                  <div className='d-flex justify-content-center'>
                    <button
                      type='button'
                      className='btn btn-light me-3'
                      onClick={() => setShowDeleteModal(false)}
                    >
                      Cancel
                    </button>
                    <button type='submit' className='btn btn-danger'>
                      Yes, Delete
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySettings;
