import {
  Bell,
  CheckCheck,
  Clock3,
  MessageSquare,
  PackageOpen,
  RefreshCw,
  Sparkles,
  Tag,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { MarketplaceLayout } from '@/components/layout/MarketplaceLayout';
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { supabase } from '@/lib/supabaseClient';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notificationService';
import { useAuthStore } from '@/store/authStore';
import type { Json, Notification } from '@/types/domain';
import { createRealtimeRefreshQueue } from '@/utils/realtime';

type NotificationKind = 'message' | 'price' | 'product' | 'system';

const filters = [
  ['all', 'Tất cả', Bell],
  ['message', 'Tin nhắn', MessageSquare],
  ['price', 'Giá sản phẩm', Tag],
  ['product', 'Sản phẩm', PackageOpen],
] as const;

const kindConfig = {
  message: {
    icon: MessageSquare,
    label: 'Tin nhắn',
    className: 'border-l-primary',
    iconClass: 'bg-primary/10 text-primary',
  },
  price: {
    icon: Tag,
    label: 'Thay đổi giá',
    className: 'border-l-warning',
    iconClass: 'bg-warning/10 text-warning',
  },
  product: {
    icon: PackageOpen,
    label: 'Sản phẩm',
    className: 'border-l-info',
    iconClass: 'bg-info/10 text-info',
  },
  system: {
    icon: Bell,
    label: 'Hệ thống',
    className: 'border-l-muted-foreground',
    iconClass: 'bg-muted text-muted-foreground',
  },
};

function metadataOf(notification: Notification) {
  return (notification.metadata || {}) as Record<string, Json | undefined>;
}

function kindOf(notification: Notification): NotificationKind {
  const type = `${notification.type || ''} ${notification.entity_type || ''}`.toLowerCase();
  if (type.includes('message') || type.includes('conversation') || notification.conversation_id) {
    return 'message';
  }
  if (type.includes('price')) return 'price';
  if (type.includes('product') || metadataOf(notification).product_id) return 'product';
  return 'system';
}

function targetOf(notification: Notification) {
  if (notification.conversation_id) return `/chat?conversation=${notification.conversation_id}`;
  if (notification.transaction_id || notification.entity_type === 'transaction')
    return '/transactions';
  if (notification.entity_type === 'conversation' && notification.entity_id) {
    return `/chat?conversation=${notification.entity_id}`;
  }
  const productId =
    notification.entity_type === 'product'
      ? notification.entity_id
      : metadataOf(notification).product_id;
  return typeof productId === 'string' ? `/products/${productId}` : '';
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff >= 0 && diff < 60_000) return 'Vừa xong';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function NotificationsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | NotificationKind>('all');
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getNotifications({ limit: 50 });
      setNotifications(result.notifications || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải thông báo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user || !supabase) return;
    const client = supabase;
    const queue = createRealtimeRefreshQueue(loadNotifications);
    const channel = client
      .channel(`notifications-ui-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => queue.schedule(),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => queue.schedule(),
      )
      .subscribe((status) => status === 'SUBSCRIBED' && queue.flush());
    return () => {
      queue.cancel();
      void client.removeChannel(channel);
    };
  }, [loadNotifications, user]);

  const enriched = useMemo(
    () => notifications.map((notification) => ({ notification, kind: kindOf(notification) })),
    [notifications],
  );
  const visible = useMemo(
    () => enriched.filter((item) => filter === 'all' || item.kind === filter),
    [enriched, filter],
  );
  const unread = notifications.filter((notification) => !notification.is_read).length;

  const openNotification = async (notification: Notification) => {
    try {
      if (!notification.is_read) {
        await markNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
        );
      }
      const target = targetOf(notification);
      if (target) navigate(target);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể cập nhật thông báo.');
    }
  };

  const markAll = async () => {
    try {
      setMarkingAll(true);
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể đánh dấu thông báo.');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <MarketplaceLayout className="space-y-6">
      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Trung tâm cập nhật</p>
          <h1 className="mt-2 text-3xl font-bold">Thông báo</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Tin nhắn, giao dịch và thay đổi liên quan đến sản phẩm được đồng bộ realtime tại đây.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={unread ? 'primary' : 'neutral'}>{unread} chưa đọc</Badge>
          <Button variant="outline" onClick={() => void loadNotifications()}>
            <RefreshCw className="size-4" />
            Làm mới
          </Button>
          <Button variant="outline" disabled={!unread || markingAll} onClick={() => void markAll()}>
            <CheckCheck className="size-4" />
            {markingAll ? 'Đang xử lý…' : 'Đọc tất cả'}
          </Button>
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2">
        {filters.map(([value, label, Icon]) => {
          const count =
            value === 'all'
              ? enriched.length
              : enriched.filter((item) => item.kind === value).length;
          return (
            <Button
              key={value}
              size="sm"
              className="shrink-0"
              variant={filter === value ? 'default' : 'ghost'}
              onClick={() => setFilter(value)}
            >
              <Icon className="size-4" />
              {label}
              <span className="rounded-full bg-background/40 px-1.5 text-xs">{count}</span>
            </Button>
          );
        })}
      </nav>

      {error && (
        <ErrorState
          title="Chưa thể tải thông báo"
          description={error}
          onRetry={loadNotifications}
        />
      )}

      {loading ? (
        <section className="space-y-3">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-32 rounded-2xl" />
          ))}
        </section>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={filter === 'all' ? Bell : Sparkles}
          title={
            notifications.length ? 'Không có thông báo trong mục này' : 'Bạn chưa có thông báo'
          }
          description="Các cập nhật mới sẽ tự xuất hiện ở đây mà không cần tải lại trang."
        />
      ) : (
        <section className="space-y-3">
          {visible.map(({ notification, kind }) => {
            const config = kindConfig[kind];
            const Icon = config.icon;
            const target = targetOf(notification);
            return (
              <article
                key={notification.id}
                className={`rounded-xl border border-l-4 border-border bg-card p-4 transition-colors hover:bg-muted/25 sm:p-5 ${config.className} ${
                  notification.is_read ? 'opacity-75' : ''
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <span
                      className={`grid size-12 shrink-0 place-items-center rounded-2xl ${config.iconClass}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="neutral">{config.label}</Badge>
                        {!notification.is_read && <Badge variant="primary">Chưa đọc</Badge>}
                      </div>
                      <h2 className="mt-2 font-semibold">
                        {notification.title || 'Thông báo mới'}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {notification.message || 'Bạn có một cập nhật mới trên ReMarket.'}
                      </p>
                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" />
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={notification.is_read ? 'outline' : 'default'}
                    disabled={notification.is_read && !target}
                    onClick={() => void openNotification(notification)}
                  >
                    {target ? 'Xem chi tiết' : notification.is_read ? 'Đã đọc' : 'Đánh dấu đã đọc'}
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </MarketplaceLayout>
  );
}

export default NotificationsPage;
