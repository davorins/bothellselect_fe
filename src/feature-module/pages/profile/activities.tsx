import React from 'react';
import { Link } from 'react-router-dom';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../feature-module/hooks/useNotifications';

const NotificationActivities = () => {
  const { parent } = useAuth(); // Ensure parent data is available
  const {
    setNotifications,
    setDismissedIds,
    dismissNotification,
    visibleNotifications,
    markAsRead,
  } = useNotifications();

  const isAdmin = parent?.role === 'admin';

  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        // Remove the notification from the state
        setNotifications((prev) => prev.filter((n) => n._id !== id));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' });
      // Mark all notifications as read in the state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='card'>
          <div className='card-header pb-1'>
            <div className='d-flex align-items-center justify-content-between flex-wrap'>
              <h4>Notifications</h4>
              <div>
                <Link
                  to='#'
                  className='btn btn-light me-2'
                  onClick={markAllAsRead}
                >
                  <i className='ti ti-check me-2' />
                  Mark all as read
                </Link>
                {isAdmin && (
                  <Link
                    to='#'
                    className='btn btn-danger'
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/notifications', {
                          method: 'DELETE',
                        });
                        if (res.ok) {
                          // Clear all notifications and dismissed list
                          setNotifications([]);
                          setDismissedIds([]);
                          localStorage.removeItem('dismissedNotifications');
                        }
                      } catch (err) {
                        console.error('Failed to delete all:', err);
                      }
                    }}
                  >
                    <i className='ti ti-trash me-2' />
                    Delete all
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className='card-body pb-1'>
            <div className='d-block mb-3'>
              {visibleNotifications.length === 0 ? (
                <p>No notifications available.</p>
              ) : (
                visibleNotifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`d-flex align-items-center justify-content-between flex-wrap shadow-sm noti-hover border p-3 pb-0 rounded mb-3 ${
                      notif.read ? 'bg-light' : ''
                    }`}
                  >
                    <input
                      type='checkbox'
                      onChange={() => markAsRead(notif._id, !notif.read)}
                      checked={notif.read}
                      className='ms-2 me-4'
                      title={notif.read ? 'Mark as unread' : 'Mark as read'}
                    />
                    <div className='d-flex align-items-start flex-fill'>
                      <Link
                        to='#'
                        className='avatar avatar-lg flex-shrink-0 me-2 mb-3'
                      >
                        <ImageWithBasePath
                          alt={notif.user}
                          src={
                            notif.avatar && notif.avatar.startsWith('http')
                              ? notif.avatar
                              : notif.avatar?.trim()
                              ? `/uploads/avatars/${notif.avatar}`
                              : '/uploads/avatars/parents.png'
                          }
                          className='img-fluid'
                        />
                      </Link>
                      <div className='mb-3'>
                        <p className='mb-0 text-dark fw-medium'>
                          {notif.user} {notif.message}
                        </p>
                        <span>
                          {new Date(notif.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className='noti-delete mb-3'>
                      {isAdmin ? (
                        <button
                          className='btn btn-danger btn-sm text-white'
                          onClick={() => deleteNotification(notif._id)}
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          className='btn btn-secondary btn-sm text-white'
                          onClick={() => dismissNotification(notif._id)}
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationActivities;
