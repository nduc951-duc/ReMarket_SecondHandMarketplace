import type { Category } from '@/types/domain';

const DEFAULT_BACKEND_URL = 'http://localhost:4000';

export async function getCategories(): Promise<Category[]> {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
  const response = await fetch(`${backendUrl}/api/categories`, {
    headers: { 'Content-Type': 'application/json' },
  });
  const result = (await response.json()) as { data?: Category[]; message?: string };

  if (!response.ok) {
    throw new Error(result.message || 'Không thể lấy danh mục.');
  }

  return result.data || [];
}
