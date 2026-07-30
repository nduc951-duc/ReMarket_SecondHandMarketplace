import type { Review } from '@/types/domain';

const DEFAULT_BACKEND_URL = 'http://localhost:4000';

interface ReviewInput {
  transaction_id: string;
  rating: number;
  comment?: string;
}

interface ReviewOptions {
  page?: number;
  limit?: number;
}

async function getAccessToken() {
  const { supabase } = await import('@/lib/supabaseClient');
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Bạn cần đăng nhập để sử dụng tính năng đánh giá.');
  return token;
}

async function parse<T>(response: Response, fallback: string): Promise<T> {
  const result = (await response.json().catch(() => ({}))) as {
    data?: T;
    message?: string;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(result.error?.message || result.message || fallback);
  return result.data as T;
}

function backendUrl() {
  return import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
}

export async function createReview(payload: ReviewInput): Promise<Review> {
  const token = await getAccessToken();
  return parse(
    await fetch(`${backendUrl()}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
    'Không thể gửi đánh giá.',
  );
}

export async function getReviewsByUser(
  userId: string,
  options: ReviewOptions = {},
): Promise<{ reviews: Review[]; total?: number }> {
  const query = new URLSearchParams();
  if (options.page) query.set('page', String(options.page));
  if (options.limit) query.set('limit', String(options.limit));
  return parse(
    await fetch(`${backendUrl()}/api/reviews/user/${userId}?${query.toString()}`),
    'Không thể tải danh sách đánh giá.',
  );
}

export async function getMyReviewForTransaction(transactionId: string): Promise<Review | null> {
  const token = await getAccessToken();
  return parse(
    await fetch(`${backendUrl()}/api/reviews/transaction/${transactionId}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    'Không thể tải đánh giá của giao dịch.',
  );
}

export async function getMyReviews(options: ReviewOptions = {}): Promise<Review[]> {
  const token = await getAccessToken();
  const query = new URLSearchParams();
  if (options.page) query.set('page', String(options.page));
  if (options.limit) query.set('limit', String(options.limit));
  return parse(
    await fetch(`${backendUrl()}/api/reviews/me?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    'Không thể tải đánh giá của bạn.',
  );
}
