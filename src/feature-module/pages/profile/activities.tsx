import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../feature-module/hooks/useNotifications';
import axios from 'axios';

const NotificationActivities = () => {
  const { parent } = useAuth();
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>(
    {}
  );

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const DEFAULT_AVATAR =
    'https://bothell-select.onrender.com/uploads/avatars/parents.png';

  const {
    setNotifications,
    setDismissedIds,
    dismissNotification,
    visibleNotifications,
    markAsRead,
  } = useNotifications();

  const fetchAvatarUrlFromBackend = useCallback(async () => {
    const token = localStorage.getItem('token');
    const parentId = localStorage.getItem('parentId');
    if (!token || !parentId) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/parent/${parentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const avatarUrl = response.data.avatar;
      if (avatarUrl?.startsWith('http')) {
        setAvatarSrc(avatarUrl);
        localStorage.setItem('avatarUrl', avatarUrl);
      } else {
        setAvatarSrc(DEFAULT_AVATAR);
      }
    } catch (err) {
      console.error('Failed to fetch avatar:', err);
      setAvatarSrc(DEFAULT_AVATAR);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchAvatarUrlFromBackend();
  }, [fetchAvatarUrlFromBackend]);

  if (!parent) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div className='card'>
            <div className='card-body'>
              <p>Loading user information...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = parent.role === 'admin';

  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PATCH',
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotifications([]);
        setDismissedIds([]);
        localStorage.removeItem('dismissedNotifications');
      }
    } catch (err) {
      console.error('Failed to delete all:', err);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedStates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='card'>
          <div className='card-header pb-1 d-flex align-items-center justify-content-between flex-wrap'>
            <h4>Notifications</h4>
            <div>
              <button className='btn btn-light me-2' onClick={markAllAsRead}>
                <i className='ti ti-check me-2' />
                Mark all as read
              </button>
              {isAdmin && (
                <button className='btn btn-danger' onClick={handleDeleteAll}>
                  <i className='ti ti-trash me-2' />
                  Delete all
                </button>
              )}
            </div>
          </div>
          <div className='card-body pb-1'>
            <div className='d-block mb-3'>
              {visibleNotifications.length === 0 ? (
                <p>No notifications available.</p>
              ) : (
                visibleNotifications.map((notif) => {
                  const userName =
                    typeof notif.user === 'object'
                      ? notif.user.fullName
                      : 'System';
                  const isExpanded = expandedStates[notif._id] ?? false;

                  return (
                    <div
                      key={notif._id}
                      className={`d-flex align-items-start justify-content-between flex-nowrap shadow-sm noti-hover border p-3 pb-0 rounded mb-3 ${
                        notif.read ? 'bg-light' : ''
                      }`}
                    >
                      <input
                        type='checkbox'
                        onChange={() => markAsRead(notif._id, !notif.read)}
                        checked={notif.read}
                        className='ms-2 me-4 mt-1'
                        title={notif.read ? 'Mark as unread' : 'Mark as read'}
                      />
                      <div className='d-flex align-items-start flex-fill'>
                        <div className='avatar avatar-lg flex-shrink-0 me-2 mb-3'>
                          <img
                            src={avatarSrc || DEFAULT_AVATAR}
                            alt={parent.fullName || 'User avatar'}
                            className='img-fluid rounded-circle'
                          />
                        </div>
                        <div className='flex-grow-1 mb-3'>
                          <div className='d-flex justify-content-between align-items-start'>
                            <p className='mb-1'>
                              <span className='text-dark fw-semibold'>
                                {userName}
                              </span>{' '}
                              <button
                                className='btn btn-sm btn-light fw-medium d-inline-flex align-items-center ms-2'
                                onClick={() => toggleExpand(notif._id)}
                              >
                                {isExpanded ? 'Show Less' : 'Read More'}
                              </button>
                            </p>
                            <div className='noti-delete'>
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
                          <span className='text-muted small'>
                            {new Date(notif.createdAt).toLocaleString()}
                          </span>
                          <div className='notification-content mt-2'>
                            <p className='mb-2'>
                              {isExpanded
                                ? notif.message
                                : `${notif.message.substring(0, 100)}...`}
                            </p>
                            {isExpanded && notif.link && (
                              <a
                                href={notif.link}
                                className='notification-link'
                                target='_blank'
                                rel='noopener noreferrer'
                              >
                                View Details
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationActivities;
