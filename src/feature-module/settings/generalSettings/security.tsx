import React, { useState } from 'react';
import { all_routes } from '../../router/all_routes';
import { Link, useNavigate } from 'react-router-dom';
import { OverlayTrigger, Tooltip, Alert } from 'react-bootstrap';
import axios from 'axios';

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

interface SaveStatus {
  show: boolean;
  variant: 'success' | 'danger';
  message: string;
}

interface MergeRequestData {
  email: string;
  status: 'pending' | 'accepted' | 'declined';
  requestedAt: string;
}

const SecuritySettings = () => {
  const routes = all_routes;
  const navigate = useNavigate();

  // Password change state
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

  // Merge account state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeEmail, setMergeEmail] = useState('');
  const [mergeStatus, setMergeStatus] = useState<SaveStatus>({
    show: false,
    variant: 'success',
    message: '',
  });
  const [isSendingMerge, setIsSendingMerge] = useState(false);
  const [pendingMergeRequests, setPendingMergeRequests] = useState<
    MergeRequestData[]
  >([]);

  // Delete profile state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<SaveStatus>({
    show: false,
    variant: 'danger',
    message: '',
  });

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

      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordChangeForm(false);
      setSuccessMessage('Password updated successfully!');

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Password change error:', err);
      setError(err.message || 'Error changing password');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Merge Account Functions
  const handleMergeRequest = async () => {
    if (!mergeEmail) {
      setMergeStatus({
        show: true,
        variant: 'danger',
        message: 'Please enter an email address',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mergeEmail)) {
      setMergeStatus({
        show: true,
        variant: 'danger',
        message: 'Please enter a valid email address',
      });
      return;
    }

    setIsSendingMerge(true);
    setMergeStatus({ show: false, variant: 'success', message: '' });

    try {
      const token = localStorage.getItem('token');
      const currentParentId = localStorage.getItem('parentId');

      if (!token || !currentParentId) {
        throw new Error('Authentication required');
      }

      // First, check if the email exists in the system
      const checkResponse = await axios.post(`${API_BASE_URL}/check-email`, {
        email: mergeEmail,
      });

      if (checkResponse.status === 200 && checkResponse.data.available) {
        setMergeStatus({
          show: true,
          variant: 'danger',
          message:
            'No account found with this email address. Please make sure the email is correct.',
        });
        return;
      }

      // Get the user ID for the email
      const userResponse = await axios.get(
        `${API_BASE_URL}/user/by-email/${encodeURIComponent(mergeEmail)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!userResponse.data || !userResponse.data._id) {
        setMergeStatus({
          show: true,
          variant: 'danger',
          message: 'Could not find user with this email',
        });
        return;
      }

      const existingParentId = userResponse.data._id;

      // Send merge request
      const response = await axios.post(
        `${API_BASE_URL}/parents/request-merge`,
        {
          existingParentId,
          newParentId: currentParentId,
          playerId: null, // For full account merge, not player-specific
          mergeFullAccount: true, // Flag to indicate full account merge
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        setMergeStatus({
          show: true,
          variant: 'success',
          message: `Merge request sent to ${mergeEmail}. They will receive an email to approve the merge.`,
        });

        // Add to pending requests
        setPendingMergeRequests([
          ...pendingMergeRequests,
          {
            email: mergeEmail,
            status: 'pending',
            requestedAt: new Date().toISOString(),
          },
        ]);

        // Clear the input and close modal after 2 seconds
        setTimeout(() => {
          setShowMergeModal(false);
          setMergeEmail('');
          setTimeout(() => {
            setMergeStatus({ show: false, variant: 'success', message: '' });
          }, 3000);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Merge request error:', error);
      setMergeStatus({
        show: true,
        variant: 'danger',
        message:
          error.response?.data?.error ||
          'Failed to send merge request. Please try again.',
      });
    } finally {
      setIsSendingMerge(false);
    }
  };

  // Function to open merge modal
  const openMergeModal = () => {
    setShowMergeModal(true);
    setMergeEmail('');
    setMergeStatus({ show: false, variant: 'success', message: '' });
  };

  // Function to close merge modal
  const closeMergeModal = () => {
    setShowMergeModal(false);
    setMergeEmail('');
    setMergeStatus({ show: false, variant: 'success', message: '' });
  };

  // Function to handle profile deletion
  const handleDeleteProfile = async () => {
    if (deleteConfirmationText !== 'DELETE') {
      setDeleteStatus({
        show: true,
        variant: 'danger',
        message: 'Please type DELETE to confirm',
      });
      return;
    }

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const parentId = localStorage.getItem('parentId');

      if (!token || !parentId) {
        throw new Error('Authentication required');
      }

      await axios.delete(`${API_BASE_URL}/parent/${parentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      localStorage.removeItem('token');
      localStorage.removeItem('parentId');
      localStorage.removeItem('userRole');
      localStorage.removeItem('parent');

      setDeleteStatus({
        show: true,
        variant: 'success',
        message:
          'Your account has been successfully deleted. Redirecting to home page...',
      });

      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      console.error('Error deleting profile:', error);
      setDeleteStatus({
        show: true,
        variant: 'danger',
        message:
          error.response?.data?.error ||
          'Failed to delete profile. Please try again.',
      });
      setShowDeleteConfirmation(false);
      setDeleteConfirmationText('');
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteConfirmation = () => {
    setShowDeleteConfirmation(true);
    setDeleteConfirmationText('');
    setDeleteStatus({ show: false, variant: 'danger', message: '' });
  };

  const closeDeleteConfirmation = () => {
    setShowDeleteConfirmation(false);
    setDeleteConfirmationText('');
    setDeleteStatus({ show: false, variant: 'danger', message: '' });
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
                  <Link to={routes.adminDashboard}>Dashboard</Link>
                </li>
                <li className='breadcrumb-item'>
                  <Link to={routes.profilesettings}>Settings</Link>
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
                onClick={() => window.location.reload()}
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

        {/* Pending Merge Requests */}
        {pendingMergeRequests.length > 0 && (
          <div className='mt-3'>
            <Alert variant='info' className='p-3'>
              <h6 className='mb-2'>Pending Merge Requests</h6>
              {pendingMergeRequests.map((req, idx) => (
                <div
                  key={idx}
                  className='d-flex justify-content-between align-items-center'
                >
                  <span>
                    <i className='ti ti-mail me-2'></i>
                    {req.email} - Requested{' '}
                    {new Date(req.requestedAt).toLocaleDateString()}
                  </span>
                  <span className='badge bg-warning'>Pending Approval</span>
                </div>
              ))}
              <p className='small text-muted mt-2 mb-0'>
                The account owner will receive an email to approve the merge.
              </p>
            </Alert>
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
              {/* Delete Profile option */}
              <button
                onClick={openDeleteConfirmation}
                className='d-block rounded p-2 text-start border-0 bg-transparent text-danger'
                style={{ cursor: 'pointer' }}
              >
                <i className='ti ti-trash me-2'></i>
                Delete Profile
              </button>
            </div>
          </div>

          <div className='col-xxl-10 col-xl-9'>
            <div className='border-start ps-3 flex-fill'>
              <div className='d-flex align-items-center justify-content-between flex-wrap border-bottom mb-3 pt-3'>
                <div className='mb-3'>
                  <h5>Security Settings!</h5>
                  <p>Manage passwords and account security</p>
                </div>
              </div>

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
                              e.target.value,
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
                              e.target.value,
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

              {/* Merge Account Info Section */}
              <div className='bg-white border rounded p-3'>
                <h6>Account Merge</h6>
                <p className='text-muted small'>
                  Merge this account with another parent account. Both accounts
                  will be combined, allowing both parents to manage players with
                  separate logins.
                </p>
                <button
                  onClick={openMergeModal}
                  className='btn btn-outline-primary btn-sm'
                >
                  <i className='ti ti-arrows-join me-2'></i>
                  Request Account Merge
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Merge Account Modal */}
      {showMergeModal && (
        <div
          className='modal show d-block'
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1050,
          }}
        >
          <div className='modal-dialog modal-dialog-centered'>
            <div className='modal-content'>
              <div className='modal-header'>
                <h5 className='modal-title text-primary'>
                  <i className='ti ti-arrows-join me-2'></i>
                  Request Account Merge
                </h5>
                <button
                  type='button'
                  className='btn-close'
                  onClick={closeMergeModal}
                  disabled={isSendingMerge}
                ></button>
              </div>
              <div className='modal-body'>
                <div className='alert alert-info'>
                  <strong>What happens when you merge accounts?</strong>
                  <ul className='mb-0 mt-2'>
                    <li>Both accounts will be combined into one</li>
                    <li>Both parents keep their own login credentials</li>
                    <li>All players will be accessible by both parents</li>
                    <li>The other parent must approve the merge request</li>
                  </ul>
                </div>

                <div className='mb-3'>
                  <label className='form-label'>Other Parent's Email</label>
                  <input
                    type='email'
                    className='form-control'
                    value={mergeEmail}
                    onChange={(e) => setMergeEmail(e.target.value)}
                    placeholder="Enter the other parent's email address"
                    disabled={isSendingMerge}
                  />
                  <div className='form-text'>
                    Enter the email address of the account you want to merge
                    with.
                  </div>
                </div>

                {mergeStatus.show && (
                  <Alert variant={mergeStatus.variant} className='p-2 mt-2'>
                    <i
                      className={`ti ${mergeStatus.variant === 'success' ? 'ti-check-circle' : 'ti-alert-circle'} me-2`}
                    ></i>
                    {mergeStatus.message}
                  </Alert>
                )}
              </div>
              <div className='modal-footer'>
                <button
                  type='button'
                  className='btn btn-secondary me-2'
                  onClick={closeMergeModal}
                  disabled={isSendingMerge}
                >
                  Cancel
                </button>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={handleMergeRequest}
                  disabled={isSendingMerge || !mergeEmail}
                >
                  {isSendingMerge ? (
                    <>
                      <span className='spinner-border spinner-border-sm me-2' />
                      Sending Request...
                    </>
                  ) : (
                    <>
                      <i className='ti ti-send me-2' />
                      Send Merge Request
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Profile Confirmation Modal */}
      {showDeleteConfirmation && (
        <div
          className='modal show d-block'
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1050,
          }}
        >
          <div className='modal-dialog modal-dialog-centered'>
            <div className='modal-content'>
              <div className='modal-header'>
                <h5 className='modal-title text-danger'>
                  <i className='ti ti-alert-triangle me-2'></i>
                  Delete Profile
                </h5>
                <button
                  type='button'
                  className='btn-close'
                  onClick={closeDeleteConfirmation}
                  disabled={isDeleting}
                ></button>
              </div>
              <div className='modal-body'>
                <div className='alert alert-danger'>
                  <strong>Warning:</strong> This action cannot be undone.
                </div>

                <p className='mb-3'>
                  Deleting your profile will permanently remove:
                </p>

                <ul className='mb-3'>
                  <li>Your personal information</li>
                  <li>All guardian information</li>
                  <li>All player profiles associated with your account</li>
                  <li>Registration history and payment records</li>
                </ul>

                <div className='bg-light p-3 rounded mb-3'>
                  <p className='mb-2'>
                    To confirm, please type <strong>DELETE</strong> in the box
                    below:
                  </p>
                  <input
                    type='text'
                    className='form-control'
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder='Type DELETE to confirm'
                    disabled={isDeleting}
                  />
                </div>

                {deleteStatus.show && (
                  <Alert variant={deleteStatus.variant} className='p-2 mt-2'>
                    <i
                      className={`ti ${deleteStatus.variant === 'success' ? 'ti-check-circle' : 'ti-alert-circle'} me-2`}
                    ></i>
                    {deleteStatus.message}
                  </Alert>
                )}
              </div>
              <div className='modal-footer'>
                <button
                  type='button'
                  className='btn btn-secondary me-2'
                  onClick={closeDeleteConfirmation}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type='button'
                  className='btn btn-danger'
                  onClick={handleDeleteProfile}
                  disabled={deleteConfirmationText !== 'DELETE' || isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span className='spinner-border spinner-border-sm me-2' />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <i className='ti ti-trash me-2' />
                      Permanently Delete Profile
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySettings;
