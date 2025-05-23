import React, { useState } from 'react';
import { all_routes } from '../../router/all_routes';
import { Link } from 'react-router-dom';
import { OverlayTrigger, Tooltip, Alert } from 'react-bootstrap';

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

const SecuritySettings = () => {
  const routes = all_routes;
  const [showPasswordChangeForm, setShowPasswordChangeForm] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validation
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwords.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!passwords.currentPassword || !passwords.newPassword) {
      setError('Current and new passwords are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const res = await fetch(`${API_BASE_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        const errorText = await res.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || 'Something went wrong.');
        } catch {
          throw new Error(errorText || 'Something went wrong.');
        }
      }

      // Reset form on success
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordChangeForm(false);
      setSuccessMessage('Password updated successfully!');
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

        {/* Alerts */}
        {(error || successMessage) && (
          <div className='mt-3'>
            {error && (
              <Alert variant='danger' className='p-2'>
                {error}
              </Alert>
            )}
            {successMessage && (
              <Alert variant='success' className='p-2'>
                {successMessage}
              </Alert>
            )}
          </div>
        )}

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

              {/* Password Section */}
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
                      <label className='form-label'>Current Password</label>
                      <div className='pass-group'>
                        <input
                          type={
                            passwordVisibility.currentPassword
                              ? 'text'
                              : 'password'
                          }
                          className='pass-input form-control'
                          value={passwords.currentPassword}
                          onChange={(e) =>
                            handlePasswordChange(
                              'currentPassword',
                              e.target.value
                            )
                          }
                          required
                        />
                        <span
                          className={`ti toggle-passwords ${
                            passwordVisibility.currentPassword
                              ? 'ti-eye'
                              : 'ti-eye-off'
                          }`}
                          onClick={() =>
                            togglePasswordVisibility('currentPassword')
                          }
                        ></span>
                      </div>
                    </div>

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
                          setSuccessMessage('');
                          setPasswords({
                            currentPassword: '',
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
