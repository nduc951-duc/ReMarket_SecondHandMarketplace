const DEFAULT_BACKEND_URL = 'http://localhost:4000';

async function getAccessToken() {
  const { supabase } = await import('../lib/supabaseClient');
  const { data } = await supabase.auth.getSession();

  if (!data?.session?.access_token) {
    throw new Error('Ban can dang nhap de truy cap trang admin.');
  }

  return data.session.access_token;
}

function getBackendUrl() {
  return import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
}

async function fetchAdmin(path, options = {}) {
  const token = await getAccessToken();
  const response = await fetch(`${getBackendUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Khong the goi API admin.');
  }

  return result.data;
}

export async function getAdminOverview() {
  return fetchAdmin('/api/admin/overview');
}

export async function getAdminUsers(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);

  return fetchAdmin(`/api/admin/users?${query.toString()}`);
}

export async function getAdminProducts(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);

  return fetchAdmin(`/api/admin/products?${query.toString()}`);
}

export async function updateAdminProductStatus(productId, status) {
  return fetchAdmin(`/api/admin/products/${productId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function createAdminUser(payload) {
  return fetchAdmin('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUserRole(userId, role) {
  return fetchAdmin(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function updateAdminUserStatus(userId, status) {
  return fetchAdmin(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function getAdminTransactions(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);

  return fetchAdmin(`/api/admin/transactions?${query.toString()}`);
}