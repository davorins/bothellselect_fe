import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Notification } from '../../types/types';

export const useNotifications = () => {
  const { parent, getAuthToken } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('dismissedNotifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const parentId = useMemo(() => parent?._id?.toString(), [parent]);

  // Fetch user notifications
  useEffect(() => {
    if (!parentId) return;

    const fetchUserNotifications = async () => {
      try {
        const token = await getAuthToken();
        let url = `/api/notifications/user/${parentId}`;

        // If the user is an admin, fetch all notifications (not just those for the specific parent)
        if (parent?.role === 'admin') {
          url = `/api/notifications`; // Fetch all notifications for admin
        }

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        if (res.ok) {
          const data = await res.json();
          console.log('Fetched Notifications:', data);
          setNotifications(data);
        } else {
          console.error('Failed to fetch notifications, status:', res.status);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchUserNotifications();
  }, [parentId, getAuthToken, parent?.role]);

  // Persist dismissed IDs
  useEffect(() => {
    localStorage.setItem(
      'dismissedNotifications',
      JSON.stringify(dismissedIds)
    );
  }, [dismissedIds]);

  const dismissNotification = async (notificationId: string) => {
    if (!parentId) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((notif) =>
        notif._id === notificationId
          ? {
              ...notif,
              dismissedBy: [...(notif.dismissedBy || []), parentId],
            }
          : notif
      )
    );

    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/notifications/dismiss/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: parentId }),
      });

      if (!res.ok) throw new Error('Dismiss failed');
    } catch (err) {
      console.error('Error dismissing notification:', err);

      // Rollback
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId
            ? {
                ...notif,
                dismissedBy: (notif.dismissedBy || []).filter(
                  (id) => id !== parentId
                ),
              }
            : notif
        )
      );
    }
  };

  const markAsRead = async (id: string, read: boolean) => {
    try {
      const res = await fetch(`/api/notifications/read/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read }),
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((notif) => (notif._id === id ? { ...notif, read } : notif))
        );
      }
    } catch (err) {
      console.error('Failed to update read status:', err);
    }
  };

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
  };

  const visibleNotifications = useMemo(() => {
    if (!parentId) return []; // Early return if no parentId

    return notifications.filter((notif) => {
      const isDismissed = notif.dismissedBy?.includes(parentId);

      // Skip dismissed notifications
      if (isDismissed) return false;

      // Admin should see all notifications
      if (parent?.role === 'admin') {
        return true;
      }

      // Logic for non-admin users
      if (notif.targetType === 'individual') {
        // If target type is 'individual', check if parentId is in parentIds
        const isParentInIds = notif.parentIds?.some(
          (id) => String(id) === String(parentId)
        );
        return isParentInIds ?? false;
      }

      // For other types of notifications (e.g., 'all' or 'season')
      if (notif.targetType === 'all') {
        return true; // Everyone should see 'all' notifications
      }

      return false;
    });
  }, [notifications, parentId, parent?.role]);

  return {
    notifications,
    setNotifications,
    dismissedIds,
    setDismissedIds,
    dismissNotification,
    visibleNotifications,
    markAsRead,
    addNotification,
  };
};
