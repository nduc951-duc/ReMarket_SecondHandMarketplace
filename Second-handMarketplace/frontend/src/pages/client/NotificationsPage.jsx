import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationService';
import { useAuthStore } from '../../store/authStore';

function formatDate(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveNotificationPath(notification) {
  if (notification.entity_type === 'conversation' && notification.entity_id) {
    return `/chat?conversation=${notification.entity_id}`;
  }

  if (notification.entity_type === 'transaction') {
    return '/transactions';
  }

  if (notification.entity_type === 'product' && notification.entity_id) {
    return `/products/${notification.entity_id}`;
  }

  return '';
}

function NotificationsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await getNotifications({ limit: 50 });
      setNotifications(data.notifications || []);
    } catch (loadError) {
      setError(loadError.message);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user || !supabase) {
      return () => {};
    }

    const channel = supabase
      .channel(`notifications-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications, user]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const handleMarkRead = async (notification) => {
    if (notification.is_read) {
      const targetPath = resolveNotificationPath(notification);
      if (targetPath) {
        navigate(targetPath);
      }
      return;
    }

    try {
      await markNotificationRead(notification.id);
      setNotifications((previous) => previous.map((item) => (
        item.id === notification.id
          ? { ...item, is_read: true }
          : item
      )));

      const targetPath = resolveNotificationPath(notification);
      if (targetPath) {
        navigate(targetPath);
      }
    } catch (markError) {
      setError(markError.message);
    }
  };

  const handleMarkAll = async () => {
    try {
      setIsMarkingAll(true);
      await markAllNotificationsRead();
      setNotifications((previous) => previous.map((item) => ({ ...item, is_read: true })));
    } catch (markError) {
      setError(markError.message);
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="page-container page-container-wide">
        <header className="notifications-header">
          <div>
            <Link to="/app" className="back-link">← Quay lai</Link>
            <h1>Thong bao</h1>
            <p>Cap nhat moi nhat ve chat, don hang va danh gia cua ban.</p>
          </div>
          <div className="notifications-actions">
            <span className="notifications-unread">{unreadCount} chua doc</span>
            <button
              type="button"
              className="btn-outline"
              onClick={handleMarkAll}
              disabled={isMarkingAll || unreadCount === 0}
            >
              {isMarkingAll ? 'Dang xu ly...' : 'Danh dau tat ca da doc'}
            </button>
          </div>
        </header>

        {error && <p className="form-feedback error">{error}</p>}

        {isLoading ? (
          <div className="page-loading">
            <div className="loading-spinner" />
            <p>Dang tai thong bao...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔔</span>
            <h3>Ban chua co thong bao</h3>
            <p>Khi co cap nhat moi, thong bao se hien thi tai day.</p>
          </div>
        ) : (
          <section className="notifications-list">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`notification-card ${notification.is_read ? 'read' : 'unread'}`}
              >
                <div className="notification-main">
                  <h3>{notification.title || 'Thong bao'}</h3>
                  <p>{notification.message || 'Ban co cap nhat moi.'}</p>
                  <small>{formatDate(notification.created_at)}</small>
                </div>
                <div className="notification-actions">
                  {!notification.is_read && <span className="notification-dot" />}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleMarkRead(notification)}
                  >
                    {resolveNotificationPath(notification)
                      ? 'Mo chi tiet'
                      : notification.is_read
                        ? 'Da doc'
                        : 'Danh dau da doc'}
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

export default NotificationsPage;