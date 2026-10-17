// NotificationsScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './NotificationsScreen.css';

export type NotificationType = 'confirmed' | 'cancelled' | 'reminder' | 'promotional';
export type NotificationFilter = 'all' | NotificationType;

export interface NotificationItem {
  id: string;
  _id?: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  createdAt?: string;
}

const RAW_API_URL = (import.meta as any).env?.VITE_API_URL || 'https://turf-backend-q8w4.onrender.com/api';
const API_BASE_URL = String(RAW_API_URL).trim().replace(/\/+$/, '');
const USER_STORAGE_KEY = '@user_data';
const NOTIFICATION_STATE_PREFIX = '@turfbook_notification_state_';

type NotificationLocalState = { readIds: string[]; deletedIds: string[] };

const buildApiUrl = (path: string): string => {
  if (!API_BASE_URL) throw new Error('API URL is not configured.');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const baseLower = API_BASE_URL.toLowerCase();
  const pathLower = cleanPath.toLowerCase();
  if (baseLower.endsWith('/api') && pathLower.startsWith('/api/')) return `${API_BASE_URL}${cleanPath.slice(4)}`;
  if (!baseLower.endsWith('/api') && pathLower.startsWith('/notifications')) return `${API_BASE_URL}/api${cleanPath}`;
  return `${API_BASE_URL}${cleanPath}`;
};

const getNotificationTimestamp = (createdAt?: string): string => {
  if (!createdAt) return 'Just now';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const normalizeNotificationType = (value: unknown): NotificationType => {
  switch (String(value ?? '').toLowerCase()) {
    case 'confirmed': return 'confirmed';
    case 'cancelled':
    case 'canceled': return 'cancelled';
    case 'reminder': return 'reminder';
    case 'promotional':
    case 'promotion':
    case 'offer': return 'promotional';
    default: return 'reminder';
  }
};

const FILTERS: { key: NotificationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'reminder', label: 'Reminders' },
  { key: 'promotional', label: 'Offers' },
  { key: 'cancelled', label: 'Cancelled' },
];

export interface NotificationsScreenProps { userId?: string; }

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ userId: propUserId }) => {
  const [resolvedUserId, setResolvedUserId] = useState(String(propUserId ?? '').trim());
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const resolveUserId = useCallback(async (): Promise<string> => {
    const directId = String(propUserId ?? '').trim();
    if (directId) { setResolvedUserId(directId); return directId; }
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (!stored) { setResolvedUserId(''); return ''; }
      const parsed = JSON.parse(stored);
      const id = String(parsed?._id ?? parsed?.id ?? parsed?.user?._id ?? parsed?.user?.id ?? '').trim();
      setResolvedUserId(id);
      return id;
    } catch (error) { console.error('[Notifications] Resolve user error:', error); setResolvedUserId(''); return ''; }
  }, [propUserId]);

  const getLocalStateKey = useCallback((userId: string) => `${NOTIFICATION_STATE_PREFIX}${userId}`, []);

  const loadLocalState = useCallback(async (userId: string): Promise<NotificationLocalState> => {
    try {
      const raw = localStorage.getItem(getLocalStateKey(userId));
      if (!raw) return { readIds: [], deletedIds: [] };
      const parsed = JSON.parse(raw);
      return {
        readIds: Array.isArray(parsed?.readIds) ? parsed.readIds.map(String) : [],
        deletedIds: Array.isArray(parsed?.deletedIds) ? parsed.deletedIds.map(String) : [],
      };
    } catch { return { readIds: [], deletedIds: [] }; }
  }, [getLocalStateKey]);

  const saveLocalState = useCallback(async (userId: string, state: NotificationLocalState) => {
    try {
      localStorage.setItem(
        getLocalStateKey(userId),
        JSON.stringify({
          readIds: [...new Set(state.readIds)],
          deletedIds: [...new Set(state.deletedIds)],
        }),
      );
    } catch (error) { console.error('[Notifications] Save local state error:', error); }
  }, [getLocalStateKey]);

  const fetchNotifications = useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    try {
      if (!silent) setLoading(true);
      setErrorMessage('');
      const currentUserId = await resolveUserId();
      if (!currentUserId) throw new Error('Logged-in user ID was not found. Please log in again.');

      const endpoint = `/api/notifications/${encodeURIComponent(currentUserId)}`;
      const requestUrl = buildApiUrl(endpoint);
      const response = await fetch(requestUrl, { method: 'GET', headers: { Accept: 'application/json' } });
      const rawText = await response.text();
      let data: any = {};
      if (rawText.trim()) { try { data = JSON.parse(rawText); } catch { data = { message: rawText }; } }

      if (!response.ok || data?.success === false) {
        const serverMessage = data?.message || data?.error || data?.details || `Failed to load notifications (HTTP ${response.status}).`;
        throw new Error(serverMessage);
      }

      const localState = await loadLocalState(currentUserId);
      const rawNotifications = Array.isArray(data?.notifications) ? data.notifications : Array.isArray(data?.data) ? data.data : [];

      const normalized: NotificationItem[] = rawNotifications
        .map((item: any, index: number) => {
          const id = String(item?._id ?? item?.id ?? item?.notificationId ?? `notification-${index}`);
          return {
            id,
            _id: item?._id ? String(item._id) : id,
            type: normalizeNotificationType(item?.type),
            title: String(item?.title ?? 'Notification'),
            message: String(item?.message ?? ''),
            timestamp: getNotificationTimestamp(item?.timestamp ?? item?.createdAt),
            createdAt: item?.createdAt ? String(item.createdAt) : undefined,
            read: Boolean(item?.read) || localState.readIds.includes(id),
          };
        })
        .filter((item: NotificationItem) => !localState.deletedIds.includes(item.id));

      normalized.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (!Number.isNaN(bTime) && !Number.isNaN(aTime)) return bTime - aTime;
        return 0;
      });

      setNotifications(normalized);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : 'Unable to load notifications right now.';
      console.error('[Notifications] Fetch error:', error);
      setErrorMessage(message);
      if (!silent) alert(message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [loadLocalState, resolveUserId]);

  useEffect(() => { void fetchNotifications(); }, [fetchNotifications]);

  // Refresh when tab becomes visible (replaces useFocusEffect)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void fetchNotifications({ silent: true }); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await fetchNotifications({ silent: true }); } finally { setRefreshing(false); }
  }, [fetchNotifications]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  const filteredNotifications = useMemo(
    () => (activeFilter === 'all' ? notifications : notifications.filter((item) => item.type === activeFilter)),
    [notifications, activeFilter],
  );

  const updateLocalReadState = useCallback(async (ids: string[], read: boolean) => {
    const currentUserId = resolvedUserId || (await resolveUserId());
    if (!currentUserId) return;
    const state = await loadLocalState(currentUserId);
    const nextReadIds = new Set(state.readIds);
    ids.forEach((id) => { if (read) nextReadIds.add(id); else nextReadIds.delete(id); });
    await saveLocalState(currentUserId, { readIds: [...nextReadIds], deletedIds: state.deletedIds });
  }, [loadLocalState, resolveUserId, resolvedUserId, saveLocalState]);

  const markAsRead = useCallback((id: string) => {
    const item = notifications.find((n) => n.id === id);
    if (!item || item.read) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    void updateLocalReadState([id], true);
  }, [notifications, updateLocalReadState]);

  const markAllAsRead = useCallback(() => {
    if (unreadCount === 0) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    void updateLocalReadState(unreadIds, true);
  }, [notifications, unreadCount, updateLocalReadState]);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    void (async () => {
      const currentUserId = resolvedUserId || (await resolveUserId());
      if (!currentUserId) return;
      const state = await loadLocalState(currentUserId);
      await saveLocalState(currentUserId, {
        readIds: state.readIds.filter((readId) => readId !== id),
        deletedIds: [...new Set([...state.deletedIds, id])],
      });
    })();
  }, [loadLocalState, resolveUserId, resolvedUserId, saveLocalState]);

  const clearAllNotifications = useCallback(() => {
    if (notifications.length === 0) return;
    if (!window.confirm('Are you sure you want to remove all notifications from this device?')) return;
    const ids = notifications.map((n) => n.id);
    setNotifications([]);
    void (async () => {
      const currentUserId = resolvedUserId || (await resolveUserId());
      if (!currentUserId) return;
      const state = await loadLocalState(currentUserId);
      await saveLocalState(currentUserId, {
        readIds: state.readIds.filter((id) => !ids.includes(id)),
        deletedIds: [...new Set([...state.deletedIds, ...ids])],
      });
    })();
  }, [loadLocalState, notifications, resolveUserId, resolvedUserId, saveLocalState]);

  const handleNotificationPress = useCallback((notification: NotificationItem) => {
    markAsRead(notification.id);
    switch (notification.type) {
      case 'confirmed': alert(`Booking Confirmed\n\n${notification.message}`); break;
      case 'reminder': alert(`Booking Reminder\n\n${notification.message}`); break;
      case 'cancelled': alert(`Booking Cancelled\n\n${notification.message}`); break;
      case 'promotional': alert(`Special Offer\n\n${notification.message}`); break;
      default: alert(`${notification.title}\n\n${notification.message}`);
    }
  }, [markAsRead]);

  const handleLongPress = useCallback((notification: NotificationItem) => {
    const nextRead = !notification.read;
    const action = window.confirm(
      `Notification options\n\n"${notification.title}"\n\nOK = ${nextRead ? 'Mark as Read' : 'Mark as Unread'}\nCancel = Delete`,
    );
    if (action) {
      setNotifications((prev) => prev.map((item) => (item.id === notification.id ? { ...item, read: nextRead } : item)));
      void updateLocalReadState([notification.id], nextRead);
    } else {
      if (window.confirm('Delete this notification?')) deleteNotification(notification.id);
    }
  }, [deleteNotification, updateLocalReadState]);

  const getIcon = (type: NotificationType): string => {
    switch (type) {
      case 'confirmed': return '✓';
      case 'cancelled': return '✕';
      case 'reminder': return '⏰';
      case 'promotional': return '🎁';
      default: return '🔔';
    }
  };

  const getIconColor = (type: NotificationType): string => {
    switch (type) {
      case 'confirmed': return '#6F9D28';
      case 'cancelled': return '#B91C1C';
      case 'reminder': return '#92400E';
      case 'promotional': return '#8B5CF6';
      default: return '#5E6677';
    }
  };

  const getIconBackground = (type: NotificationType) => {
    switch (type) {
      case 'confirmed': return { backgroundColor: '#F4FBE6', borderColor: '#D9DCE7' };
      case 'cancelled': return { backgroundColor: '#FEF2F2', borderColor: '#FECACA' };
      case 'reminder': return { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' };
      case 'promotional': return { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' };
      default: return { backgroundColor: '#fff', borderColor: '#E6E8EF' };
    }
  };

  const renderEmptyState = () => (
    <div className="nf-empty-container">
      <div className="nf-empty-icon-container">🔔</div>
      <h3 className="nf-empty-title">No notifications</h3>
      <p className="nf-empty-subtitle">
        {activeFilter === 'all' ? 'You have no notifications right now.' : 'You have no notifications in this category right now.'}
      </p>
      {errorMessage && (
        <button className="nf-retry-button" onClick={() => void fetchNotifications()}>TRY AGAIN</button>
      )}
    </div>
  );

  return (
    <div className="nf-safe">
      <div className="nf-container">
        <div className="nf-header-row">
          <div className="nf-header-left">
            <span className="nf-header-badge">🔔 ALERTS</span>
            <div className="nf-header-title-row">
              <h1 className="nf-header-title">Notifications</h1>
              {unreadCount > 0 && <span className="nf-unread-badge">{unreadCount}</span>}
            </div>
            <p className="nf-header-subtitle">Booking updates and offers</p>
          </div>
          <button
            className="nf-mark-read-button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            MARK ALL READ
          </button>
        </div>

        <div className="nf-filter-row">
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.key;
            const filterCount = filter.key === 'all' ? notifications.length : notifications.filter((n) => n.type === filter.key).length;
            return (
              <button
                key={filter.key}
                className={`nf-filter-chip ${isActive ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter.key)}
              >
                <span className="nf-filter-text">{filter.label}</span>
                {filterCount > 0 && (
                  <span className={`nf-filter-count ${isActive ? 'active' : ''}`}>{filterCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {errorMessage && notifications.length > 0 && (
          <div className="nf-error-banner">
            <span className="nf-error-banner-text">{errorMessage}</span>
            <button className="nf-error-retry" onClick={() => void fetchNotifications()}>RETRY</button>
          </div>
        )}

        {filteredNotifications.length > 0 && !loading && (
          <div className="nf-section-header">
            <div className="nf-section-title-row">
              <h2 className="nf-section-title">{activeFilter === 'all' ? 'Recent notifications' : 'Notifications'}</h2>
              <span className="nf-section-accent" />
            </div>
            <button className="nf-clear-text" onClick={clearAllNotifications}>CLEAR ALL</button>
          </div>
        )}

        {loading ? (
          <div className="nf-loading-container">
            <div className="nf-loading-icon-container">
              <span className="nf-spinner" />
            </div>
            <h3 className="nf-empty-title">Loading notifications...</h3>
            <p className="nf-empty-subtitle">Checking your latest booking updates.</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="nf-list-container">
            <button className="nf-refresh-inline" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? '↻ Refreshing...' : '↻ Refresh'}
            </button>
            {filteredNotifications.map((notification) => {
              const iconBg = getIconBackground(notification.type);
              const iconColor = getIconColor(notification.type);
              return (
                <button
                  key={notification.id}
                  className={`nf-notification-card ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationPress(notification)}
                  onContextMenu={(e) => { e.preventDefault(); handleLongPress(notification); }}
                >
                  {!notification.read && <span className="nf-unread-dot" />}
                  <div
                    className="nf-icon-container"
                    style={{ backgroundColor: iconBg.backgroundColor, borderColor: iconBg.borderColor }}
                  >
                    <span className="nf-icon-text" style={{ color: iconColor }}>{getIcon(notification.type)}</span>
                  </div>
                  <div className="nf-content-container">
                    <div className="nf-title-row">
                      <span className={`nf-notification-title ${!notification.read ? 'unread' : ''}`}>{notification.title}</span>
                      <span className="nf-timestamp">{notification.timestamp}</span>
                    </div>
                    <p className="nf-notification-message">{notification.message}</p>
                    {!notification.read && <span className="nf-new-badge">NEW</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export { NotificationsScreen };
export default NotificationsScreen;