import type { WishlistItem } from '@/types/domain';

const DEFAULT_BACKEND_URL = 'http://localhost:4000';

interface WishlistResult {
  items: WishlistItem[];
  pagination?: { page?: number; limit?: number; total?: number };
}

async function getAccessToken(): Promise<string> {
  const { supabase } = await import('@/lib/supabaseClient');
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data } = await supabase.auth.getSession();

  if (!data?.session?.access_token) {
    throw new Error('Bạn cần đăng nhập để sử dụng danh sách đã lưu.');
  }

  return data.session.access_token;
}

function getBackendUrl() {
  return import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
}

async function parseResult<T>(response: Response, fallbackMessage: string): Promise<T> {
  const result = (await response.json().catch(() => ({}))) as {
    data?: T;
    message?: string;
  };
  if (!response.ok) throw new Error(result.message || fallbackMessage);
  return result.data as T;
}

export async function getWishlist(
  params: { page?: number; limit?: number } = {},
): Promise<WishlistResult> {
  const token = await getAccessToken();
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const response = await fetch(`${getBackendUrl()}/api/wishlist?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResult<WishlistResult>(response, 'Không thể lấy danh sách đã lưu.');
}

export async function getWishlistStatus(productId: string): Promise<boolean> {
  const token = await getAccessToken();
  const response = await fetch(`${getBackendUrl()}/api/wishlist/status/${productId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseResult<{ wishlisted?: boolean }>(
    response,
    'Không thể lấy trạng thái đã lưu.',
  );
  return Boolean(data?.wishlisted);
}

export async function toggleWishlist(
  productId: string,
): Promise<{ wishlisted: boolean; product_id?: string }> {
  const token = await getAccessToken();
  const response = await fetch(`${getBackendUrl()}/api/wishlist/toggle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ product_id: productId }),
  });
  return parseResult(response, 'Không thể cập nhật danh sách đã lưu.');
}
