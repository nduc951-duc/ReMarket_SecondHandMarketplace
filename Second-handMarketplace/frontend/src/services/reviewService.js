const DEFAULT_BACKEND_URL = 'http://localhost:4000';

async function getAccessToken() {
  const { supabase } = await import('../lib/supabaseClient');
  const { data } = await supabase.auth.getSession();

  if (!data?.session?.access_token) {
    throw new Error('Ban can dang nhap de su dung tinh nang danh gia.');
  }

  return data.session.access_token;
}

function getBackendUrl() {
  return import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
}

export async function createReview(payload) {
  const token = await getAccessToken();

  const response = await fetch(`${getBackendUrl()}/api/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || 'Khong the gui danh gia.');
  }

  return result.data;
}

export async function getReviewsByUser(userId, options = {}) {
  const query = new URLSearchParams();
  if (options.page) query.set('page', String(options.page));
  if (options.limit) query.set('limit', String(options.limit));

  const response = await fetch(`${getBackendUrl()}/api/reviews/user/${userId}?${query.toString()}`);
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || 'Khong the lay danh sach danh gia.');
  }

  return result.data;
}

export async function getMyReviewForTransaction(transactionId) {
  const token = await getAccessToken();

  const response = await fetch(`${getBackendUrl()}/api/reviews/transaction/${transactionId}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || 'Khong the lay danh gia cua giao dich.');
  }

  return result.data;
}

export async function getMyReviews(options = {}) {
  const token = await getAccessToken();
  const query = new URLSearchParams();
  if (options.page) query.set('page', String(options.page));
  if (options.limit) query.set('limit', String(options.limit));

  const response = await fetch(`${getBackendUrl()}/api/reviews/me?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || 'Khong the lay danh gia cua ban.');
  }

  return result.data;
}