import type { Profile } from '@/types/domain';
import { apiRequest } from '@/services/apiClient';

export interface ProfileUpdateInput {
  full_name: string;
  phone: string;
  address: string;
  bio: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, {
    ...init,
    auth: true,
    fallbackMessage: 'Không thể xử lý hồ sơ.',
  });
}

export function getProfile(): Promise<Profile> {
  return request<Profile>('/api/profile');
}

export function updateProfile(input: ProfileUpdateInput): Promise<Profile> {
  return request<Profile>('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function uploadAvatar(file: File): Promise<Profile> {
  const body = new FormData();
  body.append('avatar', file);
  return request<Profile>('/api/profile/avatar', { method: 'POST', body });
}
