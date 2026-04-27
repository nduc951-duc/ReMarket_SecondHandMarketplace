const DEFAULT_BACKEND_URL = 'http://localhost:4000';

async function getAccessToken() {
  const { supabase } = await import('../lib/supabaseClient');
  const { data } = await supabase.auth.getSession();

  if (!data?.session?.access_token) {
    throw new Error('Ban can dang nhap de su dung chat.');
  }

  return data.session.access_token;
}

function getBackendUrl() {
  return import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
}

export async function getConversations() {
  const token = await getAccessToken();

  const response = await fetch(`${getBackendUrl()}/api/chat/conversations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || 'Khong the lay danh sach chat.');
  }

  return result.data;
}

export async function getUnreadConversationCount() {
  const token = await getAccessToken();

  const response = await fetch(`${getBackendUrl()}/api/chat/conversations/unread-count`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || 'Khong the lay so tin nhan chua doc.');
  }

  return result.data?.unread || 0;
}

export async function getConversationMessages(conversationId, options = {}) {
  const token = await getAccessToken();

  const query = new URLSearchParams();
  if (options.page) query.set('page', String(options.page));
  if (options.limit) query.set('limit', String(options.limit));

  const response = await fetch(
    `${getBackendUrl()}/api/chat/conversations/${conversationId}/messages?${query.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || 'Khong the lay tin nhan.');
  }

  return result.data;
}

export async function sendMessage(payload) {
  const token = await getAccessToken();

  const response = await fetch(`${getBackendUrl()}/api/chat/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || 'Khong the gui tin nhan.');
  }

  return result.data;
}

export async function markConversationRead(conversationId) {
  const token = await getAccessToken();

  const response = await fetch(`${getBackendUrl()}/api/chat/conversations/${conversationId}/read`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || 'Khong the cap nhat trang thai da doc.');
  }

  return result.data;
}