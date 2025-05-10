import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Notification } from '../../types/types';

export const useNotifications = () => {
  const { parent } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('dismissedNotifications');
    return stored ? JSON.parse(stored) : [];
  });

  // Fetch notifications only once on component mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        if (Array.isArray(data)) {
          // Convert createdAt to Date objects if necessary
          const formattedNotifications = data.map((notif) => ({
            ...notif,
            createdAt: new Date(notif.createdAt), // Ensure it's a Date object
          }));
          setNotifications(formattedNotifications);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();
  }, []); // Fetch notifications only once on component mount

  // Save dismissedIds to localStorage when it changes
  useEffect(() => {
    if (dismissedIds.length > 0) {
      localStorage.setItem(
        'dismissedNotifications',
        JSON.stringify(dismissedIds)
      );
    }
  }, [dismissedIds]);

  // Update the dismissNotification function
  const dismissNotification = async (notificationId: string) => {
    try {
      if (!parent) {
        console.error('Parent (user) information is missing');
        return;
      }

      // Add to local dismissed IDs
      setDismissedIds((prev) => [...prev, notificationId]);

      // Send to server to persist dismissal
      await fetch(`/api/notifications/dismiss/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentId: parent._id,
        }),
      });
    } catch (err) {
      console.error('Error dismissing notification:', err);
    }
  };

  const markAsRead = async (id: string, readState: boolean) => {
    try {
      const res = await fetch(`/api/notifications/read/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: readState }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif._id === id ? { ...notif, read: readState } : notif
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle read state:', err);
    }
  };

  const visibleNotifications = notifications.filter(
    (notif) => !dismissedIds.includes(notif._id)
  );

  return {
    notifications,
    setNotifications,
    dismissedIds,
    setDismissedIds,
    dismissNotification,
    visibleNotifications,
    markAsRead,
  };
};
