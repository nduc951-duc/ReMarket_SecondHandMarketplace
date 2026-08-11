import type { Review } from '@/types/domain';
import { apiRequest } from '@/services/apiClient';

interface ReviewInput {
  transaction_id: string;
  rating: number;
  comment?: string;
}

interface ReviewOptions {
  page?: number;
  limit?: number;
}

export async function createReview(payload: ReviewInput): Promise<Review> {
  return apiRequest<Review>('/api/reviews', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
    fallbackMessage: 'Không thể gửi đánh giá.',
  });
}

export async function getReviewsByUser(
  userId: string,
  options: ReviewOptions = {},
): Promise<{ reviews: Review[]; total?: number }> {
  const query = new URLSearchParams();
  if (options.page) query.set('page', String(options.page));
  if (options.limit) query.set('limit', String(options.limit));
  return apiRequest(`/api/reviews/user/${userId}?${query.toString()}`, {
    fallbackMessage: 'Không thể tải danh sách đánh giá.',
  });
}

export async function getReviewsByProduct(
  productId: string,
  options: ReviewOptions = {},
): Promise<{ reviews: Review[]; total?: number }> {
  const query = new URLSearchParams();
  if (options.page) query.set('page', String(options.page));
  if (options.limit) query.set('limit', String(options.limit));
  return apiRequest(`/api/reviews/product/${productId}?${query.toString()}`, {
    fallbackMessage: 'Không thể tải bình luận về sản phẩm.',
  });
}

export async function getMyReviewForTransaction(transactionId: string): Promise<Review | null> {
  return apiRequest<Review | null>(`/api/reviews/transaction/${transactionId}/me`, {
    auth: true,
    fallbackMessage: 'Không thể tải đánh giá của giao dịch.',
  });
}

export async function getMyReviews(options: ReviewOptions = {}): Promise<Review[]> {
  const query = new URLSearchParams();
  if (options.page) query.set('page', String(options.page));
  if (options.limit) query.set('limit', String(options.limit));
  return apiRequest<Review[]>(`/api/reviews/me?${query.toString()}`, {
    auth: true,
    fallbackMessage: 'Không thể tải đánh giá của bạn.',
  });
}
