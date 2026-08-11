import { apiRequest } from '@/services/apiClient';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, {
    ...init,
    auth: true,
    fallbackMessage: 'Không thể cập nhật theo dõi.',
  });
}

export async function getSellerFollowStatus(sellerId: string) {
  const result = await request<{ following?: boolean }>(`/api/follows/sellers/${sellerId}/status`);
  return Boolean(result?.following);
}

export function toggleSellerFollow(sellerId: string) {
  return request<{ following: boolean }>(`/api/follows/sellers/${sellerId}/toggle`, {
    method: 'POST',
  });
}
