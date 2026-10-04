import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { notificationApi } from '../services/api';
import { useAuth } from './AuthContext';
import type { AppNotification } from '../types';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
const POLL_MS = 15000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      setLoading(true);
      const res = await notificationApi.list(20);
      if (res.success && res.data) {
        setNotifications(res.data.items);
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      /* bell stays empty if the API is unavailable */
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
    if (!isAuthenticated) return;
    const timer = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, refresh]);

  const markRead = useCallback(async (id: string) => {
    const target = notifications.find((item) => item.id === id);
    setNotifications((prev) =>
      prev.map((item) => (item.id === id && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item))
    );
    if (target && !target.readAt) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    try {
      await notificationApi.markRead(id);
    } catch {
      refresh();
    }
  }, [notifications, refresh]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) =>
      prev.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() }))
    );
    setUnreadCount(0);
    try {
      await notificationApi.markAllRead();
    } catch {
      refresh();
    }
  }, [refresh]);

  const value = useMemo(
    () => ({ notifications, unreadCount, loading, refresh, markRead, markAllRead }),
    [notifications, unreadCount, loading, refresh, markRead, markAllRead]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
