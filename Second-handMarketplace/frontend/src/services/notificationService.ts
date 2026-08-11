import type { Notification, NotificationListResult } from '@/types/domain';
import { apiRequest } from '@/services/apiClient';

interface NotificationFilters {
  page?: number;
  limit?: number;
  unread?: boolean;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, {
    ...init,
    auth: true,
    fallbackMessage: 'Không thể xử lý thông báo.',
  });
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
