import type { Category } from '@/types/domain';
import { apiRequest } from '@/services/apiClient';

export async function getCategories(): Promise<Category[]> {
  return apiRequest<Category[]>('/api/categories', {
    fallbackMessage: 'Không thể lấy danh mục.',
  });
}
