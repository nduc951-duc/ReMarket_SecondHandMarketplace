import type { Product, ProductFilters, ProductListResult } from '@/types/domain';
import { apiRequest } from '@/services/apiClient';

export interface ProductInput {
  title?: string;
  description?: string;
  price?: number;
  category?: string;
  condition?: string;
  images?: string[];
  location?: string;
  status?: string;
}

function buildQuery(params: ProductFilters) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });
  return query;
}

export async function getProducts(params: ProductFilters = {}): Promise<ProductListResult> {
  return apiRequest<ProductListResult>(`/api/products?${buildQuery(params)}`, {
    fallbackMessage: 'Không thể lấy danh sách sản phẩm.',
  });
}

export async function getProductById(
  productId: string,
  options: { skipView?: boolean } = {},
): Promise<Product> {
  const { supabase } = await import('@/lib/supabaseClient');
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (data?.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  const query = new URLSearchParams();
  if (options.skipView) query.set('skip_view', 'true');

  return apiRequest<Product>(`/api/products/${productId}?${query.toString()}`, {
    headers,
    fallbackMessage: 'Không thể lấy thông tin sản phẩm.',
  });
}

export async function createProduct(productData: ProductInput): Promise<Product> {
  return apiRequest<Product>('/api/products', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(productData),
    fallbackMessage: 'Không thể tạo sản phẩm.',
  });
}

export async function updateProduct(productId: string, updateData: ProductInput): Promise<Product> {
  return apiRequest<Product>(`/api/products/${productId}`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(updateData),
    fallbackMessage: 'Không thể cập nhật sản phẩm.',
  });
}

export async function deleteProduct(productId: string): Promise<{ success?: boolean }> {
  return apiRequest<{ success?: boolean }>(`/api/products/${productId}`, {
    method: 'DELETE',
    auth: true,
    fallbackMessage: 'Không thể ẩn sản phẩm.',
    unwrapData: false,
  });
}

export async function getMyProducts(params: ProductFilters = {}): Promise<ProductListResult> {
  return apiRequest<ProductListResult>(`/api/products/user/my?${buildQuery(params)}`, {
    auth: true,
    fallbackMessage: 'Không thể lấy sản phẩm của bạn.',
  });
}

export async function uploadImages(files: FileList | File[]): Promise<Array<{ url: string }>> {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('images', file));
  return apiRequest<Array<{ url: string }>>('/api/upload/images', {
    method: 'POST',
    auth: true,
    body: formData,
    fallbackMessage: 'Không thể tải hình ảnh.',
  });
}

export async function autocompleteProducts(
  query: string,
): Promise<Array<{ id: string; title: string }>> {
  return apiRequest<Array<{ id: string; title: string }>>(
    `/api/products/autocomplete?q=${encodeURIComponent(query)}`,
    { fallbackMessage: 'Không thể lấy gợi ý tìm kiếm.' },
  );
}
