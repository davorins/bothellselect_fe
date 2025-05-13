import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../../feature-module/router/all_routes';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../feature-module/hooks/useNotifications';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const DEFAULT_AVATAR =
  'https://bothell-select.onrender.com/uploads/avatars/parents.png';

interface User {
  _id: string;
  fullName: string;
  email: string;
}

interface SeasonYear {
  season: string;
  year: number;
}

const UserMultiSelect = ({
  selectedUsers,
  onChange,
}: {
  selectedUsers: string[];
  onChange: (users: string[]) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const { getAuthToken } = useAuth();

  const fetchUsers = useCallback(async () => {
    if (!searchTerm.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(searchTerm)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      // Check for HTML response
      const text = await res.text();
      if (text.startsWith('<!doctype') || text.startsWith('<html')) {
        throw new Error('Server returned HTML instead of JSON');
      }

      // Parse only if valid JSON
      const data = JSON.parse(text);
      setUsers(data);
    } catch (err) {
      console.error('User search error:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, getAuthToken]);

  useEffect(() => {
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, fetchUsers]);

  const toggleUser = (userId: string) => {
    onChange(
      selectedUsers.includes(userId)
        ? selectedUsers.filter((id) => id !== userId)
        : [...selectedUsers, userId]
    );
  };

  return (
    <div className='user-multi-select'>
      <input
        type='text'
        className='form-control mb-2'
        placeholder='Search users...'
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div
        className='user-list border rounded p-2'
        style={{ maxHeight: '200px', overflowY: 'auto' }}
      >
        {loading ? (
          <div className='text-center py-2'>Loading...</div>
        ) : users.length === 0 ? (
          <div className='text-center py-2'>
            {searchTerm ? 'No users found' : 'Start typing to search users'}
          </div>
        ) : (
          users.map((user) => (
            <div key={user._id} className='form-check'>
              <input
                className='form-check-input'
                type='checkbox'
                id={`user-${user._id}`}
                checked={selectedUsers.includes(user._id)}
                onChange={() => toggleUser(user._id)}
              />
              <label className='form-check-label' htmlFor={`user-${user._id}`}>
                {user.fullName} ({user.email})
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const NotificationDropdown = ({ avatarSrc }: { avatarSrc: string }) => {
  const { parent, getAuthToken, isAuthenticated } = useAuth();
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'season' | 'individual'>(
    'all'
  );
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingDismissal, setProcessingDismissal] = useState<string | null>(
    null
  );
  const { notifications } = useNotifications();
  const routes = all_routes;
  const [seasons, setSeasons] = useState<SeasonYear[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<SeasonYear | null>(null);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const { addNotification } = useNotifications();

  const fetchSeasons = useCallback(async () => {
    try {
      setLoadingSeasons(true);
      const token = await getAuthToken();
      const response = await axios.get<
        Array<{ season: string; registrationYear: number }>
      >(`${API_BASE_URL}/players/seasons`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Process seasons the same way as SeasonDropdown
      const uniqueSeasons = Array.from(
        new Set(response.data.map((s) => `${s.season}-${s.registrationYear}`))
      )
        .map((seasonStr) => {
          const [season, year] = seasonStr.split('-');
          return { season, year: parseInt(year) };
        })
        .sort((a, b) => b.year - a.year || a.season.localeCompare(b.season));

      setSeasons(uniqueSeasons);
    } catch (error) {
      console.error('Failed to fetch seasons:', error);
    } finally {
      setLoadingSeasons(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    if (isAuthenticated && parent?.role === 'admin') {
      fetchSeasons();
    }
  }, [isAuthenticated, parent, fetchSeasons]);

  if (!isAuthenticated || !parent) return null;

  const isAdmin = parent.role === 'admin';

  const toggleNotification = () => {
    setNotificationVisible((prev) => !prev);
  };

  const handleDismiss = async (e: React.MouseEvent, notifId: string) => {
    e.preventDefault();
    setProcessingDismissal(notifId);

    try {
      const token = await getAuthToken();
      if (!token) return;

      if (isAdmin) {
        await axios.delete(`/api/notifications/${notifId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.patch(
          `/api/notifications/dismiss/${notifId}`,
          { userId: parent._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    } finally {
      setProcessingDismissal(null);
    }
  };

  const submitNotification = async () => {
    if (!newMessage.trim()) return;

    if (targetType === 'season' && !selectedSeason) {
      alert('Please select a valid season');
      return;
    }

    if (targetType === 'individual' && selectedUsers.length === 0) {
      alert('Please select at least one user for individual notifications');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const payload = {
        message: newMessage.trim(),
        targetType,
        ...(targetType === 'season' && {
          seasonName: selectedSeason?.season,
        }),
        ...(targetType === 'individual' && { parentIds: selectedUsers }),
      };

      const res = await axios.post('/api/notifications', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      addNotification(res.data);

      setNewMessage('');
      setSelectedSeason(null);
      setSelectedUsers([]);
      setTargetType('all');
    } catch (err) {
      console.error('Notification post error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      await axios.delete('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Bulk delete error:', err);
    }
  };

  const visibleNotifications = notifications.filter((notif) => {
    if (!parent?._id) return false;
    if (isAdmin) return !notif.dismissedBy?.includes(parent._id);
    if (!notif?.targetType) return true;
    if (notif.targetType === 'all') return true;
    if (notif.targetType === 'individual')
      return notif.parentIds?.includes(parent._id);
    return false;
  });

  return (
    <div
      className={`pe-1 ${notificationVisible ? 'notification-item-show' : ''}`}
      id='notification_item'
    >
      <Link
        onClick={toggleNotification}
        to='#'
        className='btn btn-outline-light bg-white btn-icon position-relative me-1'
        id='notification_popup'
      >
        <i className='ti ti-bell' />
        {visibleNotifications.length > 0 && (
          <span className='notification-status-dot' />
        )}
      </Link>

      <div className='dropdown-menu dropdown-menu-end notification-dropdown p-4'>
        <div className='d-flex justify-content-between align-items-center border-bottom pb-3 mb-3'>
          <h4 className='notification-title'>
            Notifications ({visibleNotifications.length})
          </h4>
        </div>

        {isAdmin && (
          <div className='mb-3'>
            <textarea
              className='form-control mb-2'
              rows={2}
              placeholder='Post a new notification...'
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <label className='form-label'>Send to:</label>
            <select
              className='form-select mb-2'
              value={targetType}
              onChange={(e) =>
                setTargetType(e.target.value as 'all' | 'season' | 'individual')
              }
            >
              <option value='all'>All Users</option>
              <option value='season'>Specific Season</option>
              <option value='individual'>Specific Users</option>
            </select>

            {targetType === 'season' && (
              <div className='mb-3'>
                <label className='form-label'>Select Season:</label>
                <select
                  className='form-control'
                  value={
                    selectedSeason
                      ? `${selectedSeason.season}-${selectedSeason.year}`
                      : ''
                  }
                  onChange={(e) => {
                    const [season, year] = e.target.value.split('-');
                    setSelectedSeason({ season, year: parseInt(year) });
                  }}
                  disabled={loadingSeasons}
                >
                  <option value=''>Select a season</option>
                  {seasons.map((seasonData) => (
                    <option
                      key={`${seasonData.season}-${seasonData.year}`}
                      value={`${seasonData.season}-${seasonData.year}`}
                    >
                      {seasonData.season} {seasonData.year}
                    </option>
                  ))}
                </select>
                {loadingSeasons && <small>Loading seasons...</small>}
              </div>
            )}

            {targetType === 'individual' && (
              <UserMultiSelect
                selectedUsers={selectedUsers}
                onChange={setSelectedUsers}
              />
            )}
            <div className='row mb-5 ms-0 me-0'>
              <button
                className='btn btn-primary mt-2'
                onClick={submitNotification}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        )}

        {visibleNotifications.length === 0 ? (
          <p>No notifications.</p>
        ) : (
          visibleNotifications.map((notif) => (
            <div key={notif._id} className='border-bottom mb-3 pb-3'>
              <Link to={routes.activity}>
                <div className='d-flex'>
                  <span className='avatar avatar-lg me-2 flex-shrink-0'>
                    <img
                      src={avatarSrc || DEFAULT_AVATAR}
                      alt={parent.fullName || 'User avatar'}
                      className='img-fluid rounded-circle'
                    />
                  </span>
                  <div className='flex-grow-1'>
                    <p className='mb-1'>
                      <span className='text-dark fw-semibold'>
                        {typeof notif.user === 'string'
                          ? 'System'
                          : notif.user.fullName}
                      </span>{' '}
                      {notif.message}
                    </p>
                    <span className='d-block'>
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                    {notif.targetType === 'season' && (
                      <small className='text-muted d-block'>
                        Sent to {notif.seasonName} season
                      </small>
                    )}
                  </div>
                  <div className='flex-grow-2'>
                    <button
                      className={`btn btn-sm ${
                        isAdmin ? 'btn-danger' : 'btn-secondary'
                      }`}
                      onClick={(e) => handleDismiss(e, notif._id)}
                      disabled={processingDismissal === notif._id}
                    >
                      {processingDismissal === notif._id ? (
                        <span className='spinner-border spinner-border-sm me-1' />
                      ) : isAdmin ? (
                        'Delete'
                      ) : (
                        'Dismiss'
                      )}
                    </button>
                  </div>
                </div>
              </Link>
            </div>
          ))
        )}

        <div className='d-flex p-0'>
          <button
            type='button'
            className='btn btn-light w-100 me-2'
            onClick={() => setNotificationVisible(false)}
          >
            Cancel
          </button>

          {visibleNotifications.length > 0 && (
            <Link to={routes.activity} className='btn btn-primary w-100 me-2'>
              View All
            </Link>
          )}

          {isAdmin && visibleNotifications.length > 0 && (
            <button
              className='btn btn-danger w-100'
              onClick={deleteAllNotifications}
            >
              Delete All
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationDropdown;
