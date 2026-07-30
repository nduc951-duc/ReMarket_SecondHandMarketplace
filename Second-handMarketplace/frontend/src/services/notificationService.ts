import type { Notification, NotificationListResult } from '@/types/domain';

const DEFAULT_BACKEND_URL = 'http://localhost:4000';

interface NotificationFilters {
  page?: number;
  limit?: number;
  unread?: boolean;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { supabase } = await import('@/lib/supabaseClient');
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Bạn cần đăng nhập để xem thông báo.');

  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL}${path}`,
    {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    },
  );
  const result = (await response.json().catch(() => ({}))) as {
    data?: T;
    message?: string;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(result.error?.message || result.message || 'Không thể xử lý thông báo.');
  }
  return result.data as T;
}

export function getNotifications(
  params: NotificationFilters = {},
): Promise<NotificationListResult> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.unread) query.set('unread', 'true');
  return request<NotificationListResult>(`/api/notifications?${query.toString()}`);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const result = await request<{ unread?: number }>('/api/notifications/unread-count');
  return result?.unread || 0;
}

export function markNotificationRead(notificationId: string): Promise<Notification> {
  return request<Notification>(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead(): Promise<{ success?: boolean }> {
  return request<{ success?: boolean }>('/api/notifications/read-all', { method: 'PATCH' });
}
