import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../../feature-module/router/all_routes';
import { useAuth } from '../../../context/AuthContext';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import { useNotifications } from '../../../feature-module/hooks/useNotifications';

const NotificationDropdown = () => {
  const { parent } = useAuth();
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('dismissedNotifications');
    return stored ? JSON.parse(stored) : [];
  });

  const { notifications, setNotifications } = useNotifications();
  const isAdmin = parent?.role === 'admin';
  const routes = all_routes;

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);
        } else {
          console.error('Invalid notifications format:', data);
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };
    fetchNotifications();
  }, [setNotifications]);

  useEffect(() => {
    localStorage.setItem(
      'dismissedNotifications',
      JSON.stringify(dismissedIds)
    );
  }, [dismissedIds]);

  const toggleNotification = () => {
    setNotificationVisible(!notificationVisible);
  };

  const submitNotification = async () => {
    if (!newMessage.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: parent?.fullName || 'Admin',
          message: newMessage.trim(),
          avatar: '', // You can adjust avatar logic if necessary
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setNotifications((prev) => [created, ...prev]);
        setNewMessage('');
      } else {
        console.error('Failed to send notification');
      }
    } catch (err) {
      console.error('Error submitting notification:', err);
    }
    setIsSubmitting(false);
  };

  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((notif) => notif._id !== id));
      } else {
        console.error('Failed to delete notification');
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotifications([]);
        setDismissedIds([]);
        localStorage.removeItem('dismissedNotifications');
      } else {
        console.error('Failed to delete all notifications');
      }
    } catch (err) {
      console.error('Error deleting all notifications:', err);
    }
  };

  const dismissNotification = async (id: string) => {
    try {
      if (!parent) return;

      const res = await fetch(`/api/notifications/dismiss/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: parent._id }),
      });

      if (res.ok) {
        setDismissedIds((prev) => [...prev, id]);
      }
    } catch (err) {
      console.error('Error dismissing notification:', err);
    }
  };

  const visibleNotifications = notifications.filter(
    (notif) => !dismissedIds.includes(notif._id)
  );

  // Fallback avatar URL
  const getAvatarUrl = (avatar: string | undefined) => {
    return avatar?.trim()
      ? avatar
      : 'https://bothell-select.onrender.com/uploads/avatars/parents.png';
  };

  if (!parent) {
    return <div>Loading...</div>; // Ensure context is loaded before rendering
  }

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
        <div className='d-flex align-items-center justify-content-between border-bottom p-0 pb-3 mb-3'>
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
            <button
              className='btn btn-sm btn-success w-100'
              onClick={submitNotification}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        )}

        <div className='noti-content'>
          <div className='d-flex flex-column'>
            {visibleNotifications.length === 0 ? (
              <p>No notifications.</p>
            ) : (
              visibleNotifications.map((notif) => (
                <div key={notif._id} className='border-bottom mb-3 pb-3'>
                  <Link to={routes.activity}>
                    <div className='d-flex'>
                      <span className='avatar avatar-lg me-2 flex-shrink-0'>
                        <ImageWithBasePath
                          alt={notif.user}
                          src={getAvatarUrl(notif.avatar)}
                          className='img-fluid'
                        />
                      </span>
                      <div className='flex-grow-1'>
                        <p className='mb-1'>
                          <span className='text-dark fw-semibold'>
                            {notif.user}
                          </span>{' '}
                          {notif.message}
                        </p>
                        <span>
                          {new Date(notif.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {isAdmin ? (
                        <div className='flex-grow-1'>
                          <button
                            className='btn btn-sm btn-danger ms-2'
                            onClick={() => deleteNotification(notif._id)}
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <div className='flex-grow-1'>
                          <button
                            className='btn btn-sm btn-secondary ms-2'
                            onClick={() => dismissNotification(notif._id)}
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className='d-flex p-0'>
          <button
            type='button'
            className='btn btn-light w-100 me-2'
            onClick={() => setNotificationVisible(false)}
          >
            Cancel
          </button>

          {/* Conditionally render the "View All" button */}
          {visibleNotifications.length > 0 && (
            <Link to={routes.activity} className='btn btn-primary w-100 me-2'>
              View All
            </Link>
          )}

          {/* Conditionally render the "Delete All" button */}
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
