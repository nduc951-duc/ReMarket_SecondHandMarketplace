import type { Product, ProductFilters, ProductListResult } from '@/types/domain';

const DEFAULT_BACKEND_URL = 'http://localhost:4000';

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

interface ApiEnvelope<T> {
  data?: T;
  message?: string;
}

function getBackendUrl() {
  return import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
}

async function getAccessToken(requiredMessage: string): Promise<string> {
  const { supabase } = await import('@/lib/supabaseClient');
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data } = await supabase.auth.getSession();
  if (!data?.session?.access_token) throw new Error(requiredMessage);
  return data.session.access_token;
}

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const result = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok) throw new Error(result.message || fallbackMessage);
  return result.data as T;
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
  const response = await fetch(`${getBackendUrl()}/api/products?${buildQuery(params)}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  return parseResponse(response, 'Không thể lấy danh sách sản phẩm.');
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

  const response = await fetch(`${getBackendUrl()}/api/products/${productId}?${query.toString()}`, {
    headers,
  });
  return parseResponse(response, 'Không thể lấy thông tin sản phẩm.');
}

export async function createProduct(productData: ProductInput): Promise<Product> {
  const token = await getAccessToken('Bạn cần đăng nhập để tạo sản phẩm.');
  const response = await fetch(`${getBackendUrl()}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(productData),
  });
  return parseResponse(response, 'Không thể tạo sản phẩm.');
}

export async function updateProduct(productId: string, updateData: ProductInput): Promise<Product> {
  const token = await getAccessToken('Bạn cần đăng nhập để cập nhật sản phẩm.');
  const response = await fetch(`${getBackendUrl()}/api/products/${productId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(updateData),
  });
  return parseResponse(response, 'Không thể cập nhật sản phẩm.');
}

export async function deleteProduct(productId: string): Promise<{ success?: boolean }> {
  const token = await getAccessToken('Bạn cần đăng nhập để ẩn sản phẩm.');
  const response = await fetch(`${getBackendUrl()}/api/products/${productId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = (await response.json()) as { success?: boolean; message?: string };
  if (!response.ok) throw new Error(result.message || 'Không thể ẩn sản phẩm.');
  return result;
}

export async function getMyProducts(params: ProductFilters = {}): Promise<ProductListResult> {
  const token = await getAccessToken('Bạn cần đăng nhập để xem sản phẩm của mình.');
  const response = await fetch(`${getBackendUrl()}/api/products/user/my?${buildQuery(params)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse(response, 'Không thể lấy sản phẩm của bạn.');
}

export async function uploadImages(files: FileList | File[]): Promise<Array<{ url: string }>> {
  const token = await getAccessToken('Bạn cần đăng nhập để tải hình ảnh.');
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('images', file));
  const response = await fetch(`${getBackendUrl()}/api/upload/images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return parseResponse(response, 'Không thể tải hình ảnh.');
}

export async function autocompleteProducts(
  query: string,
): Promise<Array<{ id: string; title: string }>> {
  const response = await fetch(
    `${getBackendUrl()}/api/products/autocomplete?q=${encodeURIComponent(query)}`,
    { headers: { 'Content-Type': 'application/json' } },
  );
  return parseResponse(response, 'Không thể lấy gợi ý tìm kiếm.');
}
