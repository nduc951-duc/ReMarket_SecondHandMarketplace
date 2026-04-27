const DEFAULT_BACKEND_URL = 'http://localhost:4000';

async function getAccessToken() {
  const { supabase } = await import('../lib/supabaseClient');
  const { data } = await supabase.auth.getSession();

  if (!data?.session?.access_token) {
    throw new Error('Ban can dang nhap de su dung wishlist.');
  }

  return data.session.access_token;
}

function getBackendUrl() {
  return import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
}

export async function getWishlist(params = {}) {
  const token = await getAccessToken();
  const query = new URLSearchParams();

  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const response = await fetch(`${getBackendUrl()}/api/wishlist?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Khong the lay wishlist.');
  }

  return result.data;
}

export async function getWishlistStatus(productId) {
  const token = await getAccessToken();

  const response = await fetch(`${getBackendUrl()}/api/wishlist/status/${productId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Khong the lay trang thai wishlist.');
  }

  return Boolean(result.data?.wishlisted);
}

export async function toggleWishlist(productId) {
  const token = await getAccessToken();

  const response = await fetch(`${getBackendUrl()}/api/wishlist/toggle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ product_id: productId }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Khong the cap nhat wishlist.');
  }

  return result.data;
}