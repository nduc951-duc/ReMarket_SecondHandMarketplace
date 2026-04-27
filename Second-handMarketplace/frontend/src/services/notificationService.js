const DEFAULT_BACKEND_URL = 'http://localhost:4000';

async function getAccessToken() {
  const { supabase } = await import('../lib/supabaseClient');
  const { data } = await supabase.auth.getSession();

  if (!data?.session?.access_token) {
    throw new Error('Ban can dang nhap de xem thong bao.');
  }

  return data.session.access_token;
}

function getBackendUrl() {
  return import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
}

export async function getNotifications(params = {}) {
  const token = await getAccessToken();
  const query = new URLSearchParams();

  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.unread) query.set('unread', 'true');

  const response = await fetch(`${getBackendUrl()}/api/notifications?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Khong the lay danh sach thong bao.');
  }

  return result.data;
}

export async function getUnreadNotificationCount() {
  const token = await getAccessToken();

  const response = await fetch(`${getBackendUrl()}/api/notifications/unread-count`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Khong the lay so thong bao chua doc.');
  }

  return result.data?.unread || 0;
}

export async function markNotificationRead(notificationId) {
  const token = await getAccessToken();

  const response = await fetch(`${getBackendUrl()}/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Khong the danh dau thong bao da doc.');
  }

  return result.data;
}

export async function markAllNotificationsRead() {
  const token = await getAccessToken();

  const response = await fetch(`${getBackendUrl()}/api/notifications/read-all`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Khong the danh dau tat ca thong bao da doc.');
  }

  return result.data;
}