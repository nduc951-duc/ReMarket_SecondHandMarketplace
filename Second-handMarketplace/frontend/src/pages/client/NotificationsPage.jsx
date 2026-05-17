import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  CheckCheck,
  Clock3,
  Loader2,
  MessageSquare,
  PackageOpen,
  Sparkles,
  Store,
  Tag,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import { supabase } from '../../lib/supabaseClient';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationService';
import { useAuthStore } from '../../store/authStore';

const FILTERS = [
  { value: 'all', label: 'Tất cả', icon: Bell },
  { value: 'message', label: 'Tin nhắn', icon: MessageSquare },
  { value: 'price', label: 'Giá', icon: Tag },
  { value: 'unavailable', label: 'Ngưng bán', icon: PackageOpen },
  { value: 'new_product', label: 'Mới từ người theo dõi', icon: Sparkles },
];

const TYPE_STYLES = {
  message: {
    icon: MessageSquare,
    border: 'border-l-teal-400',
    iconBox: 'bg-teal-300/10 text-teal-200 ring-teal-300/20',
    unreadDot: 'bg-teal-300',
    badge: 'border-teal-300/20 bg-teal-300/10 text-teal-100',
  },
  price_down: {
    icon: ArrowDown,
    border: 'border-l-amber-400',
    iconBox: 'bg-amber-300/10 text-amber-200 ring-amber-300/20',
    unreadDot: 'bg-amber-300',
    badge: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
  },
  price_up: {
    icon: ArrowUp,
    border: 'border-l-rose-400',
    iconBox: 'bg-rose-300/10 text-rose-200 ring-rose-300/20',
    unreadDot: 'bg-rose-300',
    badge: 'border-rose-300/20 bg-rose-300/10 text-rose-100',
  },
  unavailable: {
    icon: PackageOpen,
    border: 'border-l-rose-500',
    iconBox: 'bg-rose-300/10 text-rose-200 ring-rose-300/20',
    unreadDot: 'bg-rose-300',
    badge: 'border-rose-300/20 bg-rose-300/10 text-rose-100',
  },
  new_product: {
    icon: Store,
    border: 'border-l-violet-400',
    iconBox: 'bg-violet-300/10 text-violet-200 ring-violet-300/20',
    unreadDot: 'bg-violet-300',
    badge: 'border-violet-300/20 bg-violet-300/10 text-violet-100',
  },
  system: {
    icon: Bell,
    border: 'border-l-slate-500',
    iconBox: 'bg-slate-300/10 text-slate-200 ring-slate-300/20',
    unreadDot: 'bg-cyan-300',
    badge: 'border-slate-300/20 bg-slate-300/10 text-slate-100',
  },
};

function formatDate(value) {
  if (!value) return '';

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs >= 0 && diffMs < minute) return 'Vừa xong';
  if (diffMs >= 0 && diffMs < hour) return `${Math.floor(diffMs / minute)} phút trước`;
  if (diffMs >= 0 && diffMs < day) return `${Math.floor(diffMs / hour)} giờ trước`;
  if (diffMs >= 0 && diffMs < day * 2) return 'Hôm qua';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '';

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getPercentChange(oldPrice, newPrice) {
  const oldValue = Number(oldPrice);
  const newValue = Number(newPrice);
  if (!oldValue || !newValue) return '';

  const percent = Math.round(((newValue - oldValue) / oldValue) * 100);
  if (!Number.isFinite(percent) || percent === 0) return '';

  return `${percent > 0 ? '+' : ''}${percent}%`;
}

function getSearchQuery(notification) {
  return (
    notification.metadata?.product_title
    || notification.metadata?.title
    || notification.title
    || ''
  ).trim();
}

function getNotificationKind(notification) {
  const type = String(notification.type || '').toLowerCase();
  const entityType = String(notification.entity_type || '').toLowerCase();
  const text = `${notification.title || ''} ${notification.message || ''}`.toLowerCase();

  if (type.includes('price') || text.includes('giá tăng') || text.includes('giá giảm')) {
    const oldPrice = Number(notification.metadata?.old_price);
    const newPrice = Number(notification.metadata?.new_price);
    if (oldPrice && newPrice) return newPrice > oldPrice ? 'price_up' : 'price_down';
    if (text.includes('tăng')) return 'price_up';
    return 'price_down';
  }

  if (
    type.includes('unavailable')
    || type.includes('removed')
    || type.includes('sold')
    || text.includes('ngưng bán')
    || text.includes('bị gỡ')
    || text.includes('hết hàng')
  ) {
    return 'unavailable';
  }

  if (
    type.includes('follow')
    || type.includes('new_product')
    || text.includes('vừa đăng')
    || text.includes('sản phẩm mới')
  ) {
    return 'new_product';
  }

  if (type.includes('chat') || entityType === 'conversation') {
    return 'message';
  }

  return 'system';
}

function getFilterValue(kind) {
  if (kind === 'price_down' || kind === 'price_up') return 'price';
  if (kind === 'message') return 'message';
  if (kind === 'unavailable') return 'unavailable';
  if (kind === 'new_product') return 'new_product';
  return 'all';
}

function resolveNotificationPath(notification) {
  const kind = getNotificationKind(notification);

  if (kind === 'unavailable') {
    const query = getSearchQuery(notification);
    return query ? `/search?q=${encodeURIComponent(query)}` : '/search';
  }

  if (notification.entity_type === 'conversation' && notification.entity_id) {
    return `/chat?conversation=${notification.entity_id}`;
  }

  if (notification.entity_type === 'transaction') {
    return '/transactions';
  }

  if (notification.entity_type === 'product' && notification.entity_id) {
    return `/products/${notification.entity_id}`;
  }

  if (notification.metadata?.product_id) {
    return `/products/${notification.metadata.product_id}`;
  }

  return '';
}

function getActionLabel(notification) {
  const kind = getNotificationKind(notification);
  if (kind === 'message') return 'Trả lời';
  if (kind === 'unavailable') return 'Tìm tương tự';
  if (kind === 'new_product') return 'Khám phá';
  if (kind === 'price_down' || kind === 'price_up') return 'Xem ngay';
  return resolveNotificationPath(notification) ? 'Xem' : notification.is_read ? 'Đã đọc' : 'Đánh dấu đã đọc';
}

function getNotificationCopy(notification) {
  const kind = getNotificationKind(notification);
  const metadata = notification.metadata || {};
  const oldPrice = metadata.old_price ?? metadata.previous_price;
  const newPrice = metadata.new_price ?? metadata.current_price;
  const oldPriceLabel = formatCurrency(oldPrice);
  const newPriceLabel = formatCurrency(newPrice);
  const percent = metadata.percent_change || getPercentChange(oldPrice, newPrice);

  if ((kind === 'price_down' || kind === 'price_up') && oldPriceLabel && newPriceLabel) {
    const verb = kind === 'price_up' ? 'tăng' : 'giảm';
    return `Giá ${verb} từ ${oldPriceLabel} → ${newPriceLabel}${percent ? ` (${percent})` : ''}`;
  }

  if (kind === 'new_product' && metadata.shop_name) {
    return `${metadata.shop_name}: ${notification.message || metadata.description || 'vừa đăng sản phẩm mới.'}`;
  }

  return notification.message || 'Bạn có cập nhật mới.';
}

function NotificationSkeleton() {
  return (
    <section className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <article key={index} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
          <div className="flex gap-4">
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-white/10" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-2/5 animate-pulse rounded-full bg-white/10" />
              <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/10" />
              <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function NotificationsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
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

  const enrichedNotifications = useMemo(
    () => notifications.map((notification) => ({
      ...notification,
      kind: getNotificationKind(notification),
    })),
    [notifications],
  );

  const unreadCount = enrichedNotifications.filter((item) => !item.is_read).length;

  const filterCounts = useMemo(() => FILTERS.reduce((counts, filter) => {
    counts[filter.value] = enrichedNotifications.filter((item) => {
      if (filter.value === 'all') return true;
      return getFilterValue(item.kind) === filter.value;
    }).length;
    return counts;
  }, {}), [enrichedNotifications]);

  const visibleNotifications = useMemo(() => {
    if (activeFilter === 'all') return enrichedNotifications;
    return enrichedNotifications.filter((notification) => getFilterValue(notification.kind) === activeFilter);
  }, [activeFilter, enrichedNotifications]);

  const handleMarkRead = async (notification) => {
    const targetPath = resolveNotificationPath(notification);

    if (notification.is_read) {
      if (targetPath) navigate(targetPath);
      return;
    }

    try {
      await markNotificationRead(notification.id);
      setNotifications((previous) => previous.map((item) => (
        item.id === notification.id ? { ...item, is_read: true } : item
      )));

      if (targetPath) navigate(targetPath);
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
    <main className="min-h-screen bg-transparent text-slate-200">
      <Navbar />
      <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-6">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/30 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Link to="/app" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-cyan-200">
              <ArrowLeft size={17} />
              Quay lại
            </Link>
            <h1 className="mt-3 text-3xl font-black text-white">Thông báo</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Cập nhật mới nhất về tin nhắn, thay đổi giá, sản phẩm yêu thích và shop bạn đang theo dõi.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100">
              {unreadCount} chưa đọc
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-slate-100 transition hover:border-cyan-300/40 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleMarkAll}
              disabled={isMarkingAll || unreadCount === 0}
            >
              {isMarkingAll ? <Loader2 size={17} className="animate-spin" /> : <CheckCheck size={17} />}
              {isMarkingAll ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
            </button>
          </div>
        </header>

        <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-black transition ${
                  isActive
                    ? 'border-cyan-300 bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/25'
                    : 'border-white/10 bg-slate-950/60 text-slate-300 hover:border-cyan-300/35 hover:text-cyan-100'
                }`}
              >
                <Icon size={16} />
                {filter.label}
                <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-slate-950/15' : 'bg-white/10 text-slate-200'}`}>
                  {filterCounts[filter.value] || 0}
                </span>
              </button>
            );
          })}
        </nav>

        {error && (
          <div className="mb-5 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-5 py-4 text-sm font-semibold text-rose-100">
            {error}
          </div>
        )}

        {isLoading ? (
          <NotificationSkeleton />
        ) : visibleNotifications.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-10 text-center shadow-xl shadow-slate-950/30">
            <Bell className="mx-auto text-slate-500" size={38} />
            <h3 className="mt-4 text-2xl font-black text-white">
              {notifications.length === 0 ? 'Bạn chưa có thông báo' : 'Không có thông báo trong mục này'}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              Khi có cập nhật mới, hệ thống sẽ tự đồng bộ realtime và hiển thị tại đây.
            </p>
          </div>
        ) : (
          <section className="space-y-3">
            {visibleNotifications.map((notification) => {
              const style = TYPE_STYLES[notification.kind] || TYPE_STYLES.system;
              const Icon = style.icon;
              const actionLabel = getActionLabel(notification);
              const hasTarget = Boolean(resolveNotificationPath(notification));

              return (
                <article
                  key={notification.id}
                  className={`relative rounded-2xl border border-l-4 border-white/10 ${style.border} bg-slate-950/70 p-4 shadow-lg shadow-slate-950/25 transition hover:-translate-y-0.5 hover:border-white/20 sm:p-5`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${style.iconBox}`}>
                        <Icon size={21} />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {(notification.kind === 'price_down' || notification.kind === 'price_up' || notification.kind === 'unavailable' || notification.kind === 'new_product') && (
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${style.badge}`}>
                              {notification.kind === 'price_down'
                                ? 'Giảm giá'
                                : notification.kind === 'price_up'
                                  ? 'Tăng giá'
                                  : notification.kind === 'unavailable'
                                    ? 'Ngưng bán'
                                    : 'Mới đăng'}
                            </span>
                          )}
                          {!notification.is_read && (
                            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs font-bold text-cyan-100">
                              Chưa đọc
                            </span>
                          )}
                        </div>
                        <h2 className="text-base font-black leading-6 text-white sm:text-lg">
                          {notification.title || 'Thông báo'}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-400">
                          {getNotificationCopy(notification)}
                        </p>
                        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                          <Clock3 size={14} />
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                      {!notification.is_read && <span className={`h-2.5 w-2.5 rounded-full ${style.unreadDot}`} />}
                      <button
                        type="button"
                        className="inline-flex min-w-28 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-black text-slate-100 transition hover:border-cyan-300/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => handleMarkRead(notification)}
                        disabled={notification.is_read && !hasTarget}
                      >
                        {actionLabel}
                        {hasTarget ? <ArrowRight size={16} /> : <CheckCheck size={16} />}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

export default NotificationsPage;
