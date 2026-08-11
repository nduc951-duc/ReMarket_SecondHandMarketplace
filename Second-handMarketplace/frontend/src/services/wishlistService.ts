import type { WishlistItem } from '@/types/domain';
import { apiRequest } from '@/services/apiClient';

interface WishlistResult {
  items: WishlistItem[];
  pagination?: { page?: number; limit?: number; total?: number };
}

export async function getWishlist(
  params: { page?: number; limit?: number } = {},
): Promise<WishlistResult> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  return apiRequest<WishlistResult>(`/api/wishlist?${query.toString()}`, {
    auth: true,
    fallbackMessage: 'Không thể lấy danh sách đã lưu.',
  });
}

export async function getWishlistStatus(productId: string): Promise<boolean> {
  const data = await apiRequest<{ wishlisted?: boolean }>(`/api/wishlist/status/${productId}`, {
    auth: true,
    fallbackMessage: 'Không thể lấy trạng thái đã lưu.',
  });
  return Boolean(data?.wishlisted);
}

export async function toggleWishlist(
  productId: string,
): Promise<{ wishlisted: boolean; product_id?: string }> {
  return apiRequest('/api/wishlist/toggle', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ product_id: productId }),
    fallbackMessage: 'Không thể cập nhật danh sách đã lưu.',
  });
}
