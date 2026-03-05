import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import { OverlayTrigger, Tooltip, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

// Define the type for preferences
interface CommunicationPreferences {
  emailNotifications: boolean;
  newsUpdates: boolean;
  offersPromotions: boolean;
  marketingEmails: boolean;
  transactionalEmails: boolean;
  broadcastEmails: boolean;
}

// Define the type for the response from the API
interface PreferencesResponse {
  success: boolean;
  data: {
    preferences: CommunicationPreferences;
  };
}

// Define the type for save status
interface SaveStatus {
  show: boolean;
  variant: 'success' | 'danger';
  message: string;
}

const Notificationssettings = () => {
  const routes = all_routes;
  const navigate = useNavigate();
  const { getAuthToken } = useAuth();

  // Notification preferences state
  const [preferences, setPreferences] = useState<CommunicationPreferences>({
    emailNotifications: true,
    newsUpdates: true,
    offersPromotions: true,
    marketingEmails: true,
    transactionalEmails: true,
    broadcastEmails: true,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const response = await axios.get<PreferencesResponse>(
        `${API_BASE_URL}/communication-preferences`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success && response.data.data.preferences) {
        setPreferences(response.data.data.preferences);
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
      setError('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = async (
    key: keyof CommunicationPreferences,
    value: boolean,
  ) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = await getAuthToken();
      const updatedPreferences = { ...preferences, [key]: value };

      const response = await axios.put<PreferencesResponse>(
        `${API_BASE_URL}/communication-preferences`,
        { preferences: updatedPreferences },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setPreferences(updatedPreferences);
        setSuccess('Notification settings updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError('Failed to update notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof CommunicationPreferences) => {
    handlePreferenceChange(key, !preferences[key]);
  };

  const getEmailDescription = (key: keyof CommunicationPreferences): string => {
    const descriptions: Record<keyof CommunicationPreferences, string> = {
      emailNotifications:
        'Receive email notifications for new direct messages, account activity, and important alerts.',
      newsUpdates:
        'Stay informed with the latest announcements, program updates, and news from Partizan.',
      offersPromotions:
        'Get notified about special deals, package pricing, discounts, and promotional offers.',
      marketingEmails:
        'Receive marketing communications about new programs, events, and opportunities.',
      transactionalEmails:
        'Receive transactional emails like payment receipts, registration confirmations, and important account updates.',
      broadcastEmails:
        'Receive broadcast emails sent to all users for general announcements.',
    };
    return descriptions[key];
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

      // Delete the parent account
      await axios.delete(`${API_BASE_URL}/parent/${parentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('parentId');
      localStorage.removeItem('userRole');

      // Show success message
      setDeleteStatus({
        show: true,
        variant: 'success',
        message:
          'Your account has been successfully deleted. Redirecting to home page...',
      });

      // Redirect to home page after 2 seconds
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

  // Function to open the delete confirmation modal
  const openDeleteConfirmation = () => {
    setShowDeleteConfirmation(true);
    setDeleteConfirmationText('');
    setDeleteStatus({ show: false, variant: 'danger', message: '' });
  };

  // Function to close the delete confirmation modal
  const closeDeleteConfirmation = () => {
    setShowDeleteConfirmation(false);
    setDeleteConfirmationText('');
    setDeleteStatus({ show: false, variant: 'danger', message: '' });
  };

  if (loading) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div
            className='d-flex justify-content-center align-items-center'
            style={{ minHeight: '400px' }}
          >
            <Spinner animation='border' variant='primary' />
            <span className='ms-2'>Loading notification settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className='page-wrapper'>
        <div className='content'>
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
              <div className='pe-1 mb-2'>
                <OverlayTrigger
                  placement='top'
                  overlay={<Tooltip id='tooltip-top'>Refresh</Tooltip>}
                >
                  <button
                    onClick={fetchPreferences}
                    className='btn btn-outline-light bg-white btn-icon me-1'
                    disabled={saving}
                  >
                    <i className='ti ti-refresh' />
                  </button>
                </OverlayTrigger>
              </div>
            </div>
          </div>

          {error && (
            <Alert
              variant='danger'
              onClose={() => setError(null)}
              dismissible
              className='mt-3'
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              variant='success'
              onClose={() => setSuccess(null)}
              dismissible
              className='mt-3'
            >
              {success}
            </Alert>
          )}

          <div className='row'>
            <div className='col-xxl-2 col-xl-3'>
              <div className='pt-3 d-flex flex-column list-group mb-4'>
                <Link
                  to={routes.profilesettings}
                  className='d-block rounded p-2'
                >
                  Profile Settings
                </Link>
                <Link
                  to={routes.securitysettings}
                  className='d-block rounded p-2'
                >
                  Security Settings
                </Link>
                <Link
                  to={routes.notificationssettings}
                  className='d-block rounded active p-2'
                >
                  Notifications
                </Link>
                {/* Add Delete Profile link */}
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
              <div className='flex-fill border-start ps-3'>
                <div className='d-flex align-items-center justify-content-between flex-wrap border-bottom mb-3 pt-3'>
                  <div className='mb-3'>
                    <h5>Email Communication Preferences</h5>
                    <p>
                      Control what types of emails you receive from Partizan.
                      You can update these preferences at any time.
                    </p>
                  </div>
                </div>

                <div className='d-block'>
                  <div className='card border-0 p-3 pb-0 mb-3 rounded'>
                    {/* Email Notifications */}
                    <div className='d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3'>
                      <div className='mb-3'>
                        <h6>Email Notifications</h6>
                        <p>{getEmailDescription('emailNotifications')}</p>
                      </div>
                      <div className='mb-3'>
                        <div className='form-check form-switch'>
                          <input
                            className='form-check-input'
                            type='checkbox'
                            checked={preferences.emailNotifications}
                            onChange={() => handleToggle('emailNotifications')}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>

                    {/* News and Updates */}
                    <div className='d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3'>
                      <div className='mb-3'>
                        <h6>News and Updates</h6>
                        <p>{getEmailDescription('newsUpdates')}</p>
                      </div>
                      <div className='mb-3'>
                        <div className='form-check form-switch'>
                          <input
                            className='form-check-input'
                            type='checkbox'
                            checked={preferences.newsUpdates}
                            onChange={() => handleToggle('newsUpdates')}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Offers & Promotions */}
                    <div className='d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3'>
                      <div className='mb-3'>
                        <h6>Offers &amp; Promotions</h6>
                        <p>{getEmailDescription('offersPromotions')}</p>
                      </div>
                      <div className='mb-3'>
                        <div className='form-check form-switch'>
                          <input
                            className='form-check-input'
                            type='checkbox'
                            checked={preferences.offersPromotions}
                            onChange={() => handleToggle('offersPromotions')}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Marketing Emails */}
                    <div className='d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3'>
                      <div className='mb-3'>
                        <h6>Marketing Communications</h6>
                        <p>{getEmailDescription('marketingEmails')}</p>
                      </div>
                      <div className='mb-3'>
                        <div className='form-check form-switch'>
                          <input
                            className='form-check-input'
                            type='checkbox'
                            checked={preferences.marketingEmails}
                            onChange={() => handleToggle('marketingEmails')}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Transactional Emails */}
                    <div className='d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3'>
                      <div className='mb-3'>
                        <h6>Transactional Emails</h6>
                        <p>{getEmailDescription('transactionalEmails')}</p>
                      </div>
                      <div className='mb-3'>
                        <div className='form-check form-switch'>
                          <input
                            className='form-check-input'
                            type='checkbox'
                            checked={preferences.transactionalEmails}
                            onChange={() => handleToggle('transactionalEmails')}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Broadcast Emails */}
                    <div className='d-flex justify-content-between align-items-center flex-wrap mb-0'>
                      <div className='mb-3'>
                        <h6>Broadcast Emails</h6>
                        <p>{getEmailDescription('broadcastEmails')}</p>
                      </div>
                      <div className='mb-3'>
                        <div className='form-check form-switch'>
                          <input
                            className='form-check-input'
                            type='checkbox'
                            checked={preferences.broadcastEmails}
                            onChange={() => handleToggle('broadcastEmails')}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className='alert alert-info mt-3'>
                    <div className='d-flex'>
                      <div className='me-3'>
                        <i className='ti ti-info-circle fs-4'></i>
                      </div>
                      <div>
                        <h6 className='alert-heading'>Important Information</h6>
                        <p className='mb-1'>
                          • Turning off certain email types may cause you to
                          miss important information
                        </p>
                        <p className='mb-1'>
                          • Transactional emails (like payment receipts) are
                          highly recommended to remain ON
                        </p>
                        <p className='mb-0'>
                          • Changes take effect immediately for future emails
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

export default Notificationssettings;
