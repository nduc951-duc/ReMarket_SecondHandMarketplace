const DEFAULT_BACKEND_URL = 'http://localhost:4000';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { supabase } = await import('@/lib/supabaseClient');
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Bạn cần đăng nhập để theo dõi người bán.');

  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL}${path}`,
    { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } },
  );
  const result = (await response.json().catch(() => ({}))) as {
    data?: T;
    message?: string;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(result.error?.message || result.message || 'Không thể cập nhật theo dõi.');
  }
  return result.data as T;
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
