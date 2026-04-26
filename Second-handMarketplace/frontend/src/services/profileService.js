import { supabase } from '../lib/supabaseClient';

const DEFAULT_BACKEND_URL = 'http://localhost:4000';

/**
 * Get the current Supabase access token.
 */
async function getAccessToken() {
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error('Bạn chưa đăng nhập.');
  }

  return data.session.access_token;
}

function getBackendUrl() {
  return import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
}

/**
 * Fetch current user's profile.
 */
export async function getProfile() {
  const token = await getAccessToken();

  const response = await fetch(`${getBackendUrl()}/api/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Không thể lấy thông tin hồ sơ.');
  }

  return result.data;
}

/**
 * Update user profile.
 * @param {{ full_name?: string, phone?: string, address?: string, bio?: string }} updates
 */
export async function updateProfile(updates) {
  const token = await getAccessToken();

  const response = await fetch(`${getBackendUrl()}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Không thể cập nhật hồ sơ.');
  }

  return result.data;
}

/**
 * Upload avatar image.
 * @param {File} file
 */
export async function uploadAvatar(file) {
  const token = await getAccessToken();
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await fetch(`${getBackendUrl()}/api/profile/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Không thể upload avatar.');
  }

  return result.data;
}

/**
 * Fetch transaction history.
 * @param {{ type?: string, page?: number, limit?: number, status?: string }} options
 */
export async function getTransactions(options = {}) {
  const token = await getAccessToken();

  const params = new URLSearchParams();
  if (options.type) params.set('type', options.type);
  if (options.page) params.set('page', String(options.page));
  if (options.limit) params.set('limit', String(options.limit));
  if (options.status) params.set('status', options.status);

  const response = await fetch(
    `${getBackendUrl()}/api/transactions?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Không thể lấy lịch sử giao dịch.');
  }

  return result.data;
}

/**
 * Fetch transaction stats.
 */
export async function getTransactionStats() {
  const token = await getAccessToken();

  const response = await fetch(`${getBackendUrl()}/api/transactions/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Không thể lấy thống kê giao dịch.');
  }

  return result.data;
}
