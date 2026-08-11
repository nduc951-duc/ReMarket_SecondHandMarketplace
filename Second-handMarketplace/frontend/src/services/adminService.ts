import type {
  AdminOverview,
  AdminProductListResult,
  AdminTransactionListResult,
  AdminUser,
  AdminUserListResult,
  Product,
  UserRole,
} from '@/types/domain';
import { apiRequest } from '@/services/apiClient';

interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

interface CreateAdminUserInput {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, {
    ...init,
    auth: true,
    fallbackMessage: 'Không thể gọi API quản trị.',
  });
}

function queryOf(filters: ListFilters) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

export const getAdminOverview = () => request<AdminOverview>('/api/admin/overview');
export const getAdminUsers = (filters: ListFilters = {}) =>
  request<AdminUserListResult>(`/api/admin/users?${queryOf(filters)}`);
export const getAdminProducts = (filters: ListFilters = {}) =>
  request<AdminProductListResult>(`/api/admin/products?${queryOf(filters)}`);
export const getAdminTransactions = (filters: ListFilters = {}) =>
  request<AdminTransactionListResult>(`/api/admin/transactions?${queryOf(filters)}`);

export function createAdminUser(input: CreateAdminUserInput): Promise<AdminUser> {
  return request<AdminUser>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAdminUserRole(userId: string, role: UserRole): Promise<AdminUser> {
  return request<AdminUser>(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export function updateAdminUserStatus(userId: string, status: string): Promise<AdminUser> {
  return request<AdminUser>(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function updateAdminProductStatus(productId: string, status: string): Promise<Product> {
  return request<Product>(`/api/admin/products/${productId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
